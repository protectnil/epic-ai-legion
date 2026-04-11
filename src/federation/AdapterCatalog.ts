/**
 * @epicai/legion — Adapter Catalog
 * Static registry of all known adapters. Loaded from npm bundle
 * or signed registry. Powers Tier 1 domain classification.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { createLogger } from '../logger.js';

const log = createLogger('federation.catalog');

// =============================================================================
// Types
// =============================================================================

export type AdapterCategory =
  | 'cybersecurity' | 'cloud' | 'devops' | 'data' | 'collaboration'
  | 'crm' | 'commerce' | 'observability' | 'communication' | 'ai-ml'
  | 'identity' | 'compliance' | 'finance' | 'social' | 'misc';

export interface AdapterCatalogEntry {
  /**
   * Short kebab-case slug used as the federation server name and as
   * the `entry.id` in mcp-registry.json. When both `id` and `name` are
   * present the catalog indexes by both so revocation lookups work
   * whether the caller has the slug (federation/runtime side) or the
   * package name (classifier/retrieval side). Optional because older
   * catalog bundles did not include it; production bundles generated
   * from the Fabrique catalog always do.
   */
  id?: string;
  /**
   * Canonical name, typically the npm package identifier
   * (e.g. `@stripe/mcp-server`). Primary key for `byName` lookups
   * and the historical revocation index.
   */
  name: string;
  displayName: string;
  version: string;
  category: AdapterCategory;
  keywords: string[];
  toolNames: string[];
  description: string;
  author: 'protectnil' | 'vendor' | 'community';
  cosignBundle?: string;
  revoked?: boolean;
  revokedAt?: string;
  revokedReason?: string;
}

export interface CatalogSourceConfig {
  source: 'bundle' | 'registry';
  registryUrl?: string;
  verifySignature?: boolean;
  publicKeyPem?: string;
  refreshIntervalMs?: number;
  revocationListUrl?: string;
}

export interface RevocationEntry {
  adapterName: string;
  affectedVersions: string[];
  reason: string;
  revokedAt: string;
}

// =============================================================================
// Catalog
// =============================================================================

export class AdapterCatalog {
  private entries_: AdapterCatalogEntry[] = [];
  private categoryIndex = new Map<AdapterCategory, AdapterCatalogEntry[]>();
  private keywordIndex = new Map<string, Set<string>>();
  private nameIndex = new Map<string, AdapterCatalogEntry>();
  private revocationSet = new Set<string>();
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private readonly config: CatalogSourceConfig;

  constructor(config: CatalogSourceConfig) {
    this.config = config;
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  async load(): Promise<void> {
    let raw: AdapterCatalogEntry[];

    if (this.config.source === 'registry' && this.config.registryUrl) {
      raw = await this.loadFromRegistry();
    } else {
      raw = await this.loadFromBundle();
    }

    this.buildIndex(raw);
    log.info('catalog loaded', { entries: raw.length, categories: this.categoryIndex.size });
  }

  private async loadFromBundle(): Promise<AdapterCatalogEntry[]> {
    try {
      // Dynamic import of the JSON catalog from package root
      const catalogPath = new URL('../../adapter-catalog.json', import.meta.url);
      const module = await import(catalogPath.href, { with: { type: 'json' } });
      return (module.default ?? module) as AdapterCatalogEntry[];
    } catch (err) {
      log.warn('adapter-catalog.json not found — catalog will be empty until adapters implement static catalog()', { error: String(err) });
      return [];
    }
  }

  private async loadFromRegistry(): Promise<AdapterCatalogEntry[]> {
    const url = this.config.registryUrl!;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Registry returned ${response.status}`);
      }

      const body = await response.text();

      // Verify signature if configured
      if (this.config.verifySignature && this.config.publicKeyPem) {
        const signature = response.headers.get('catalog-signature');
        if (!signature) {
          throw new Error('Registry response missing catalog-signature header');
        }
        const valid = await this.verifyEd25519(body, signature, this.config.publicKeyPem);
        if (!valid) {
          throw new Error('Catalog signature verification failed');
        }
        log.info('catalog signature verified');
      }

      const entries = JSON.parse(body) as AdapterCatalogEntry[];
      return entries;
    } catch (err) {
      log.error('failed to load catalog from registry', { url, error: String(err) });
      throw err;
    }
  }

  private async verifyEd25519(data: string, signatureB64: string, publicKeyPem: string): Promise<boolean> {
    try {
      const { createVerify } = await import('node:crypto');
      const verifier = createVerify('ed25519');
      verifier.update(data);
      return verifier.verify(publicKeyPem, Buffer.from(signatureB64, 'base64'));
    } catch (err) {
      log.error('Ed25519 verification error', { error: String(err) });
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Indexing
  // ---------------------------------------------------------------------------

  /**
   * Replace the full catalog atomically. Rebuilds every index
   * (category, keyword, name, revocation) from the new entries list.
   * Public so consumers that build the catalog programmatically — or
   * refresh it from a signed source after construction — can reuse the
   * same indexing code path as `load()`. Tests also use this to avoid
   * coupling to the bundle-file resolution path.
   */
  setEntries(entries: AdapterCatalogEntry[]): void {
    this.buildIndex(entries);
  }

  private buildIndex(entries: AdapterCatalogEntry[]): void {
    // Clear all indexes — atomic replace
    this.entries_ = entries;
    this.categoryIndex.clear();
    this.keywordIndex.clear();
    this.nameIndex.clear();
    this.revocationSet.clear();

    for (const entry of entries) {
      // Name index — keyed by the canonical `name` (typically the npm
      // package identifier) AND, when present, by the short `id` slug
      // so federation-layer lookups (which only know the slug) find
      // the same entry as the classifier/retrieval layers.
      this.nameIndex.set(entry.name, entry);
      if (entry.id && entry.id !== entry.name) {
        this.nameIndex.set(entry.id, entry);
      }

      // Category index
      if (!this.categoryIndex.has(entry.category)) {
        this.categoryIndex.set(entry.category, []);
      }
      this.categoryIndex.get(entry.category)!.push(entry);

      // Keyword index: token → set of adapter names
      for (const keyword of entry.keywords) {
        const lower = keyword.toLowerCase();
        if (!this.keywordIndex.has(lower)) {
          this.keywordIndex.set(lower, new Set());
        }
        this.keywordIndex.get(lower)!.add(entry.name);
      }

      // Tool name index: treat tool names as keywords too
      for (const toolName of entry.toolNames) {
        const lower = toolName.toLowerCase();
        if (!this.keywordIndex.has(lower)) {
          this.keywordIndex.set(lower, new Set());
        }
        this.keywordIndex.get(lower)!.add(entry.name);
      }

      // Revocation tracking — index BOTH the `name` (package) and the
      // `id` (slug) in the same set so `isRevoked()` matches regardless
      // of which identifier the caller has. Federation-layer callers
      // pass the slug (`entry.id` via ServerConnection.name); classifier
      // callers pass the package name. Both must resolve to the same
      // revocation state.
      if (entry.revoked) {
        this.revocationSet.add(entry.name);
        if (entry.id) {
          this.revocationSet.add(entry.id);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Queries (O(1) lookups via indexes)
  // ---------------------------------------------------------------------------

  entries(): AdapterCatalogEntry[] {
    return this.entries_;
  }

  byCategory(category: AdapterCategory): AdapterCatalogEntry[] {
    return this.categoryIndex.get(category) ?? [];
  }

  byKeywords(tokens: string[]): AdapterCatalogEntry[] {
    const matchedNames = new Set<string>();
    for (const token of tokens) {
      const lower = token.toLowerCase();
      const names = this.keywordIndex.get(lower);
      if (names) {
        for (const name of names) {
          matchedNames.add(name);
        }
      }
    }

    const results: AdapterCatalogEntry[] = [];
    for (const name of matchedNames) {
      const entry = this.nameIndex.get(name);
      if (entry && !this.revocationSet.has(name)) {
        results.push(entry);
      }
    }
    return results;
  }

  byName(name: string): AdapterCatalogEntry | undefined {
    return this.nameIndex.get(name);
  }

  /**
   * Check whether a catalog entry is revoked. Accepts either the
   * kebab-case `id` slug (federation-layer identifier, matching
   * `ServerConnection.name`) or the `name` package identifier
   * (classifier-layer identifier, matching `byName` lookups).
   * `buildIndex` populates `revocationSet` with both keys for every
   * revoked entry, so either form resolves correctly.
   */
  isRevoked(nameOrId: string): boolean {
    return this.revocationSet.has(nameOrId);
  }

  /**
   * Return the full revocation detail for a catalog entry, or undefined
   * if the entry is not revoked. Accepts either the `id` slug
   * (federation-layer identifier) or the `name` package identifier
   * (classifier-layer identifier) because `buildIndex()` registers
   * both in `nameIndex` and `revocationSet`. The `reason` and
   * `revokedAt` fields come straight from the catalog entry's
   * `revokedReason` and `revokedAt` columns so consumers
   * (FederationManager, loggers, operator tooling) can surface a
   * specific rejection message.
   */
  getRevocationDetails(nameOrId: string): { revoked: true; revokedAt?: string; reason?: string } | undefined {
    if (!this.revocationSet.has(nameOrId)) return undefined;
    const entry = this.nameIndex.get(nameOrId);
    return {
      revoked: true,
      revokedAt: entry?.revokedAt,
      reason: entry?.revokedReason,
    };
  }

  get size(): number {
    return this.entries_.length;
  }

  // ---------------------------------------------------------------------------
  // Refresh (signed registry)
  // ---------------------------------------------------------------------------

  startRefresh(): void {
    if (this.config.source !== 'registry' || !this.config.registryUrl) return;

    const intervalMs = this.config.refreshIntervalMs ?? 3_600_000;
    this.refreshTimer = setInterval(async () => {
      try {
        const entries = await this.loadFromRegistry();
        this.buildIndex(entries);
        log.info('catalog refreshed', { entries: entries.length });
      } catch (err) {
        log.error('catalog refresh failed — retaining current catalog', { error: String(err) });
      }
    }, intervalMs);

    if (this.refreshTimer && typeof this.refreshTimer === 'object' && 'unref' in this.refreshTimer) {
      this.refreshTimer.unref();
    }
  }

  stopRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
