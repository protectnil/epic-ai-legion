/**
 * Cohere MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — cohere-ai/north-mcp-python-sdk provides an SDK for building MCP servers using Cohere's North platform (authentication layer only, not a Cohere API MCP server). cohere-ai/mcp-atlassian is an Atlassian connector, not a Cohere API adapter. No official Cohere MCP server covering Command, Embed, or Rerank exists.

import { ToolDefinition, ToolResult } from './types.js';

interface CohereConfig {
  apiKey: string;
  baseUrl?: string;
}

export class CohereMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CohereConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.cohere.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'chat',
        description: 'Generate a text response using a Cohere Command model. Supports multi-turn conversation, RAG with documents, and tool use.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Cohere model ID (e.g. command-r-plus-08-2024, command-r-08-2024, command-a-03-2025)',
            },
            messages: {
              type: 'array',
              description: 'Array of message objects with role (user|assistant|system|tool) and content fields.',
              items: { type: 'object' },
            },
            documents: {
              type: 'array',
              description: 'Optional array of document objects for RAG grounding. Each document has id and text (or data) fields.',
              items: { type: 'object' },
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature 0–1 (default: 0.3)',
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum number of tokens to generate',
            },
            p: {
              type: 'number',
              description: 'Top-p nucleus sampling value (0–0.99)',
            },
            k: {
              type: 'number',
              description: 'Top-k sampling value (0–500)',
            },
            stop_sequences: {
              type: 'array',
              description: 'Array of strings that will stop generation when produced.',
              items: { type: 'string' },
            },
          },
          required: ['model', 'messages'],
        },
      },
      {
        name: 'embed',
        description: 'Generate embeddings for a list of texts or images using a Cohere Embed model.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Embed model ID (e.g. embed-v4.0, embed-english-v3.0, embed-multilingual-v3.0)',
            },
            texts: {
              type: 'array',
              description: 'Array of strings to embed (required unless images is provided)',
              items: { type: 'string' },
            },
            input_type: {
              type: 'string',
              description: 'Prepend type for retrieval: search_document, search_query, classification, or clustering',
            },
            embedding_types: {
              type: 'array',
              description: 'Embedding format types to return: float, int8, uint8, binary, ubinary (default: [float])',
              items: { type: 'string' },
            },
            truncate: {
              type: 'string',
              description: 'Truncation strategy: NONE, START, or END (default: END)',
            },
          },
          required: ['model', 'texts'],
        },
      },
      {
        name: 'rerank',
        description: 'Rerank a list of documents by relevance to a query using a Cohere Rerank model.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Rerank model ID (e.g. rerank-v3.5, rerank-english-v3.0, rerank-multilingual-v3.0)',
            },
            query: {
              type: 'string',
              description: 'The search query to rank documents against',
            },
            documents: {
              type: 'array',
              description: 'Array of documents to rank. Each item is a string or an object with a text field.',
              items: {},
            },
            top_n: {
              type: 'number',
              description: 'Number of top results to return (default: returns all)',
            },
            return_documents: {
              type: 'boolean',
              description: 'Whether to include document text in the response (default: false)',
            },
            max_chunks_per_doc: {
              type: 'number',
              description: 'Maximum number of chunks to produce from a single document',
            },
          },
          required: ['model', 'query', 'documents'],
        },
      },
      {
        name: 'classify',
        description: 'Classify texts into categories using a Cohere model with few-shot examples.',
        inputSchema: {
          type: 'object',
          properties: {
            inputs: {
              type: 'array',
              description: 'Array of strings to classify',
              items: { type: 'string' },
            },
            examples: {
              type: 'array',
              description: 'Array of labeled examples, each with text and label fields',
              items: { type: 'object' },
            },
            model: {
              type: 'string',
              description: 'Model to use for classification (optional; uses Cohere default if omitted)',
            },
          },
          required: ['inputs', 'examples'],
        },
      },
      {
        name: 'list_models',
        description: 'List Cohere models available to the API key, with optional endpoint filtering.',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint: {
              type: 'string',
              description: 'Filter to models compatible with a specific endpoint: chat, embed, rerank, classify, summarize, generate',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of models to return per page (default: 20, max: 1000)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'tokenize',
        description: 'Tokenize text using a specified Cohere model and return token IDs and strings.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to tokenize',
            },
            model: {
              type: 'string',
              description: 'Model to use for tokenization (e.g. command-r-plus-08-2024)',
            },
          },
          required: ['text', 'model'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'chat': {
          const model = args.model as string;
          const messages = args.messages as unknown[];

          if (!model || !messages) {
            return { content: [{ type: 'text', text: 'model and messages are required' }], isError: true };
          }

          const body: Record<string, unknown> = { model, messages };
          if (args.documents) body.documents = args.documents;
          if (typeof args.temperature === 'number') body.temperature = args.temperature;
          if (args.max_tokens) body.max_tokens = args.max_tokens;
          if (typeof args.p === 'number') body.p = args.p;
          if (typeof args.k === 'number') body.k = args.k;
          if (args.stop_sequences) body.stop_sequences = args.stop_sequences;

          const response = await fetch(`${this.baseUrl}/v2/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to chat: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cohere returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'embed': {
          const model = args.model as string;
          const texts = args.texts as string[];

          if (!model || !texts) {
            return { content: [{ type: 'text', text: 'model and texts are required' }], isError: true };
          }

          const body: Record<string, unknown> = { model, texts };
          if (args.input_type) body.input_type = args.input_type;
          if (args.embedding_types) body.embedding_types = args.embedding_types;
          if (args.truncate) body.truncate = args.truncate;

          const response = await fetch(`${this.baseUrl}/v2/embed`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to embed: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cohere returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'rerank': {
          const model = args.model as string;
          const query = args.query as string;
          const documents = args.documents as unknown[];

          if (!model || !query || !documents) {
            return { content: [{ type: 'text', text: 'model, query, and documents are required' }], isError: true };
          }

          const body: Record<string, unknown> = { model, query, documents };
          if (args.top_n) body.top_n = args.top_n;
          if (typeof args.return_documents === 'boolean') body.return_documents = args.return_documents;
          if (args.max_chunks_per_doc) body.max_chunks_per_doc = args.max_chunks_per_doc;

          const response = await fetch(`${this.baseUrl}/v2/rerank`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to rerank: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cohere returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'classify': {
          const inputs = args.inputs as string[];
          const examples = args.examples as unknown[];

          if (!inputs || !examples) {
            return { content: [{ type: 'text', text: 'inputs and examples are required' }], isError: true };
          }

          const body: Record<string, unknown> = { inputs, examples };
          if (args.model) body.model = args.model;

          // classify remains on v1 — v2/classify is not yet available (confirmed from Cohere changelog).
          const response = await fetch(`${this.baseUrl}/v1/classify`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to classify: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cohere returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_models': {
          let url = `${this.baseUrl}/v1/models`;
          const params: string[] = [];
          if (args.endpoint) params.push(`endpoint=${encodeURIComponent(args.endpoint as string)}`);
          if (args.page_size) params.push(`page_size=${args.page_size}`);
          if (args.page_token) params.push(`page_token=${encodeURIComponent(args.page_token as string)}`);
          if (params.length > 0) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to list models: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cohere returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'tokenize': {
          const text = args.text as string;
          const model = args.model as string;

          if (!text || !model) {
            return { content: [{ type: 'text', text: 'text and model are required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/v1/tokenize`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ text, model }),
          });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to tokenize: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cohere returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
}
