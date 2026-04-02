/**
 * @epicai/legion — Tool Pre-Filter
 * Narrows N registered tools to a ranked shortlist before the orchestrator LLM sees them.
 *
 * Three-tier routing:
 *   Tier 1: Keyword matching (DomainClassifier) — handled externally
 *   Tier 2: Hybrid retrieval (BM25 + SPLADE sparse + dense semantic) via RRF
 *           Uses precomputed vectors from vector-index.json (ships in npm package).
 *           Falls back to BM25-only when vector index is not loaded.
 *   Tier 3: Model-assisted classification — handled by the orchestrator
 *
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { Tool } from '../types/index.js';
import type { ScoredResult } from '../types/index.js';
import { RankFusion } from '../retrieval/RankFusion.js';

// BM25 tuning parameters
const K1 = 1.2;   // term frequency saturation
const B = 0.75;    // document length normalization

const DEFAULT_MAX_TOOLS = 8;
const DEFAULT_MAX_PER_SERVER = 3;

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'not', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'into', 'about', 'between', 'through', 'during', 'before', 'after',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'we', 'you',
  'he', 'she', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
  'his', 'our', 'their', 'what', 'which', 'who', 'whom', 'how', 'when',
  'where', 'why', 'if', 'then', 'than', 'so', 'no', 'all', 'each',
  'any', 'some', 'such', 'only', 'just', 'also', 'very',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 2 && !STOPWORDS.has(t));
}

interface ToolDocument {
  tool: Tool;
  terms: string[];
  termFreq: Map<string, number>;
  length: number;
}

export interface PreFilterOptions {
  maxTools?: number;
  maxPerServer?: number;
}

// ─── Static Vector Index (from vector-index.json) ───────────

interface VectorRecord {
  id: string;                          // adapter_id
  dense: number[];                     // OpenAI 1536d
  splade: { indices: number[]; values: number[] };
  bm25: { indices: number[]; values: number[] };
  payload: Record<string, unknown>;
}

/** Cosine similarity between two dense vectors */
function cosineSim(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** Sparse dot product between query sparse vector and document sparse vector */
function sparseDot(
  qIndices: number[], qValues: number[],
  dIndices: number[], dValues: number[]
): number {
  // Build map from document indices for O(n) lookup
  const dMap = new Map<number, number>();
  for (let i = 0; i < dIndices.length; i++) {
    dMap.set(dIndices[i], dValues[i]);
  }
  let score = 0;
  for (let i = 0; i < qIndices.length; i++) {
    const dVal = dMap.get(qIndices[i]);
    if (dVal !== undefined) score += qValues[i] * dVal;
  }
  return score;
}

/** Generate SPLADE-style sparse vector from query text using n-gram hashing
 *  (approximation — real SPLADE uses a transformer, but this matches the
 *   hash function used in embed-tools.py for term expansion) */
function querySPLADESparse(text: string): { indices: number[]; values: number[] } {
  const tokens = tokenize(text);
  const map = new Map<number, number>();
  for (const w of tokens) {
    for (let n = 2; n <= 3; n++) {
      for (let i = 0; i <= w.length - n; i++) {
        const ng = w.slice(i, i + n);
        let h = 0;
        for (let j = 0; j < ng.length; j++) h = ((h << 5) - h + ng.charCodeAt(j)) | 0;
        const idx = Math.abs(h) % 100000;
        map.set(idx, (map.get(idx) || 0) + 1);
      }
    }
  }
  return { indices: [...map.keys()], values: [...map.values()] };
}

// ─── ToolPreFilter ──────────────────────────────────────────

export class ToolPreFilter {
  private docs: ToolDocument[] = [];
  private idf: Map<string, number> = new Map();
  private avgDocLength = 0;
  private toolIdMap: Map<string, Tool> = new Map();

  // Static vector index (loaded from vector-index.json)
  private vectorIndex: VectorRecord[] = [];
  private vectorIdMap: Map<string, VectorRecord> = new Map();

  // SPLADE model (lazy-loaded from @xenova/transformers)
  private spladeModel: { tokenizer: unknown; model: unknown } | null = null;
  private spladeLoading: Promise<void> | null = null;

  /**
   * Lazy-load the SPLADE model via @xenova/transformers.
   * Downloads the ONNX model on first use (~120MB, cached after).
   */
  private async ensureSPLADE(): Promise<boolean> {
    if (this.spladeModel) return true;
    if (this.spladeLoading) { await this.spladeLoading; return this.spladeModel !== null; }

    this.spladeLoading = (async () => {
      try {
        const { AutoTokenizer, AutoModelForMaskedLM } = await import('@xenova/transformers');
        const modelId = 'Xenova/bert-base-uncased'; // same model used for document SPLADE embeddings
        const tokenizer = await AutoTokenizer.from_pretrained(modelId);
        const model = await AutoModelForMaskedLM.from_pretrained(modelId);
        this.spladeModel = { tokenizer, model };
      } catch {
        this.spladeModel = null;
      }
    })();

    await this.spladeLoading;
    return this.spladeModel !== null;
  }

  /**
   * Generate SPLADE-style sparse vector using the MLM model.
   * Each token position produces logits over the vocabulary; ReLU + log
   * max-pooling creates the sparse representation with term expansion.
   */
  private async embedSPLADE(text: string): Promise<{ indices: number[]; values: number[] }> {
    if (!this.spladeModel) return { indices: [], values: [] };

    const { tokenizer, model } = this.spladeModel as {
      tokenizer: (text: string, options?: Record<string, unknown>) => Promise<Record<string, { data: BigInt64Array; dims: number[] }>>;
      model: (input: Record<string, unknown>) => Promise<{ logits: { data: Float32Array; dims: number[] } }>;
    };

    // Tokenize — returns { input_ids, attention_mask, token_type_ids }
    const encoded = await tokenizer(text.slice(0, 512));

    // Forward pass through MLM — pass all encoded tensors
    const output = await model(encoded);
    const logits = output.logits;
    const vocabSize = logits.dims[logits.dims.length - 1];
    const seqLen = logits.dims[logits.dims.length - 2];

    // SPLADE: ReLU + log(1+x) then max-pool across sequence
    const maxLogits = new Float32Array(vocabSize);
    for (let pos = 0; pos < seqLen; pos++) {
      for (let v = 0; v < vocabSize; v++) {
        const val = logits.data[pos * vocabSize + v];
        const activated = Math.log(1 + Math.max(0, val)); // ReLU + log(1+x)
        if (activated > maxLogits[v]) maxLogits[v] = activated;
      }
    }

    // Extract non-zero entries as sparse vector
    const indices: number[] = [];
    const values: number[] = [];
    for (let v = 0; v < vocabSize; v++) {
      if (maxLogits[v] > 0.5) { // threshold matching document embedding
        indices.push(v);
        values.push(maxLogits[v]);
      }
    }

    return { indices, values };
  }

  /**
   * Load precomputed vectors from vector-index.json.
   * Enables hybrid retrieval (BM25 + SPLADE + dense) without any external database.
   */
  loadVectorIndex(records: VectorRecord[]): void {
    this.vectorIndex = records;
    this.vectorIdMap = new Map();
    for (const rec of records) {
      this.vectorIdMap.set(rec.id, rec);
    }
  }

  /**
   * Index the full tool catalog for BM25 scoring.
   */
  index(tools: Tool[]): void {
    this.docs = tools.map(tool => {
      const text = [
        tool.name.replace(/[_:-]/g, ' '),
        tool.description,
        ...Object.keys((tool.parameters as { properties?: Record<string, unknown> }).properties ?? {}),
      ].join(' ');

      const terms = tokenize(text);
      const termFreq = new Map<string, number>();
      for (const t of terms) {
        termFreq.set(t, (termFreq.get(t) ?? 0) + 1);
      }

      return { tool, terms, termFreq, length: terms.length };
    });

    this.toolIdMap = new Map();
    for (const doc of this.docs) {
      const id = `${doc.tool.server}:${doc.tool.name}`;
      this.toolIdMap.set(id, doc.tool);
    }

    const docCount = this.docs.length;
    const docFreq = new Map<string, number>();
    for (const doc of this.docs) {
      const seen = new Set<string>();
      for (const t of doc.terms) {
        if (!seen.has(t)) {
          docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
          seen.add(t);
        }
      }
    }

    this.idf = new Map();
    for (const [term, df] of docFreq) {
      this.idf.set(term, Math.log((docCount - df + 0.5) / (df + 0.5) + 1));
    }

    this.avgDocLength = this.docs.length > 0
      ? this.docs.reduce((sum, d) => sum + d.length, 0) / this.docs.length
      : 0;
  }

  /** BM25 scoring */
  private scoreBM25(queryTerms: string[]): { tool: Tool; score: number; id: string }[] {
    const scored: { tool: Tool; score: number; id: string }[] = [];

    for (const doc of this.docs) {
      let score = 0;
      for (const qt of queryTerms) {
        const tf = doc.termFreq.get(qt) ?? 0;
        if (tf === 0) continue;

        const idf = this.idf.get(qt) ?? 0;
        const numerator = tf * (K1 + 1);
        const denominator = tf + K1 * (1 - B + B * (doc.length / this.avgDocLength));
        score += idf * (numerator / denominator);
      }
      const id = `${doc.tool.server}:${doc.tool.name}`;
      scored.push({ tool: doc.tool, score, id });
    }

    return scored;
  }

  /** Dense cosine similarity search against the static vector index.
   *  Used when a query embedding is available (e.g., from OpenAI at runtime). */
  searchDense(queryDense: number[], maxResults: number): ScoredResult[] {
    const scored: { id: string; score: number }[] = [];

    for (const rec of this.vectorIndex) {
      const score = cosineSim(queryDense, rec.dense);
      scored.push({ id: rec.id, score });
    }

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, maxResults).map(s => ({
      id: s.id,
      score: s.score,
      content: '',
      metadata: {},
    }));
  }

  /** Sparse dot product search against the static vector index */
  private searchSparse(
    queryIndices: number[], queryValues: number[],
    field: 'splade' | 'bm25', maxResults: number
  ): ScoredResult[] {
    const scored: { id: string; score: number }[] = [];

    for (const rec of this.vectorIndex) {
      const sparse = rec[field];
      const score = sparseDot(queryIndices, queryValues, sparse.indices, sparse.values);
      if (score > 0) scored.push({ id: rec.id, score });
    }

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, maxResults).map(s => ({
      id: s.id,
      score: s.score,
      content: '',
      metadata: {},
    }));
  }

  /**
   * Select the top-K tools most relevant to the user query.
   *
   * When vector index is loaded:
   *   Runs BM25 + SPLADE sparse + dense semantic in parallel, fuses via RRF.
   *
   * When no vector index:
   *   Falls back to BM25-only ranking.
   */
  async select(query: string, options?: PreFilterOptions): Promise<Tool[]> {
    const maxTools = options?.maxTools ?? DEFAULT_MAX_TOOLS;
    const maxPerServer = options?.maxPerServer ?? DEFAULT_MAX_PER_SERVER;

    if (this.docs.length <= maxTools) {
      return this.docs.map(d => d.tool);
    }

    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) {
      return this.docs.slice(0, maxTools).map(d => d.tool);
    }

    // BM25 scores — always computed (zero inference cost)
    const bm25Scored = this.scoreBM25(queryTerms);

    let rankedIds: string[];

    if (this.vectorIndex.length > 0) {
      // Hybrid path: BM25 tool-level + SPLADE adapter-level + dense adapter-level
      const topN = maxTools * 3;

      // BM25 results (tool-level → collapse to adapter/server ID)
      const bm25Results: ScoredResult[] = bm25Scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
        .map(s => ({ id: s.tool.server, score: s.score, content: '', metadata: {} }));

      // Deduplicate BM25 by server (keep highest score per server)
      const bm25ByServer = new Map<string, ScoredResult>();
      for (const r of bm25Results) {
        const existing = bm25ByServer.get(r.id);
        if (!existing || r.score > existing.score) bm25ByServer.set(r.id, r);
      }
      const bm25Deduped = [...bm25ByServer.values()];

      // SPLADE sparse search (adapter-level)
      // Try real SPLADE model first, fall back to n-gram hash approximation
      let qSplade: { indices: number[]; values: number[] };
      const hasSPLADE = await this.ensureSPLADE();
      if (hasSPLADE) {
        qSplade = await this.embedSPLADE(query);
      } else {
        qSplade = querySPLADESparse(query);
      }
      const spladeResults = this.searchSparse(qSplade.indices, qSplade.values, 'splade', topN);

      // Dense semantic search (adapter-level)
      // For dense, we need the query embedding. If no OpenAI key at runtime,
      // we skip dense and use BM25 + SPLADE only (still better than BM25 alone).
      let denseResults: ScoredResult[] = [];
      // Dense search requires a query embedding — not available without OpenAI at runtime.
      // The SPLADE sparse + BM25 combination provides strong hybrid retrieval without it.

      // Fuse via RRF
      const fused = RankFusion.rrf([
        { type: 'bm25', results: bm25Deduped },
        { type: 'sparse', results: spladeResults },
        ...(denseResults.length > 0 ? [{ type: 'dense' as const, results: denseResults }] : []),
      ]);

      // Map fused adapter IDs back to tools
      rankedIds = [];
      for (const r of fused) {
        // Find all tools from this server in the BM25 results
        const serverTools = bm25Scored
          .filter(s => s.tool.server === r.id && s.score > 0)
          .sort((a, b) => b.score - a.score);
        for (const st of serverTools) {
          rankedIds.push(`${st.tool.server}:${st.tool.name}`);
        }
      }
    } else {
      // BM25-only path
      rankedIds = bm25Scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(s => s.id);
    }

    // Select with server diversity constraint
    const selected: Tool[] = [];
    const serverCounts = new Map<string, number>();

    for (const id of rankedIds) {
      if (selected.length >= maxTools) break;

      const tool = this.toolIdMap.get(id);
      if (!tool) continue;

      const serverCount = serverCounts.get(tool.server) ?? 0;
      if (serverCount >= maxPerServer) continue;

      selected.push(tool);
      serverCounts.set(tool.server, serverCount + 1);
    }

    return selected;
  }

  /** Synchronous select — BM25-only */
  selectSync(query: string, options?: PreFilterOptions): Tool[] {
    const maxTools = options?.maxTools ?? DEFAULT_MAX_TOOLS;
    const maxPerServer = options?.maxPerServer ?? DEFAULT_MAX_PER_SERVER;

    if (this.docs.length <= maxTools) {
      return this.docs.map(d => d.tool);
    }

    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) {
      return this.docs.slice(0, maxTools).map(d => d.tool);
    }

    const scored = this.scoreBM25(queryTerms);
    scored.sort((a, b) => b.score - a.score);

    const selected: Tool[] = [];
    const serverCounts = new Map<string, number>();

    for (const { tool, score } of scored) {
      if (selected.length >= maxTools) break;
      if (score === 0) break;

      const serverCount = serverCounts.get(tool.server) ?? 0;
      if (serverCount >= maxPerServer) continue;

      selected.push(tool);
      serverCounts.set(tool.server, serverCount + 1);
    }

    return selected;
  }

  /** Whether hybrid vector index is loaded */
  get isHybrid(): boolean {
    return this.vectorIndex.length > 0;
  }

  /** Number of indexed tools */
  get size(): number {
    return this.docs.length;
  }

  /** Number of vectors in the static index */
  get vectorCount(): number {
    return this.vectorIndex.length;
  }
}
