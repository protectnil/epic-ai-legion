/**
 * @epicai/legion — Adapter Catalog
 * Static registry of all known adapters. Loaded from npm bundle
 * or signed registry. Powers Tier 1 domain classification.
 *
 * 1.3.0: Signature verification is ON BY DEFAULT on both the bundled
 * and remote load paths. See `CatalogSourceConfig.verifySignature`
 * and the class docs below for the enforcement model and the opt-out.
 *
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve as pathResolve } from 'node:path';
import { verify as cryptoVerify } from 'node:crypto';
import { createLogger } from '../logger.js';
import {
  LEGION_CATALOG_PUBLIC_KEY_PEM,
  LEGION_CATALOG_PUBLIC_KEY_ID,
} from '../keys/legion-catalog-public.js';

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
  /**
   * Verify the Ed25519 signature on the catalog. **Defaults to `true`
   * as of Legion 1.3.0.** Setting this to `false` opts out of the
   * signature check on both the bundled and remote load paths, and
   * emits a loud startup warning every boot. Opting out is an
   * explicit acknowledgment that the adapter catalog is being loaded
   * without cryptographic verification.
   *
   * BREAKING CHANGE from 1.2.0 → 1.3.0: in prior versions the default
   * was `false` (verification off) and consumers had to explicitly
   * opt in. The default is now on. Consumers running against a custom
   * catalog that isn't signed must either sign the catalog (see
   * `scripts/sign-catalog.mjs`) or set `verifySignature: false`.
   */
  verifySignature?: boolean;
  /**
   * PEM-encoded Ed25519 public key used to verify the catalog
   * signature. When omitted, Legion falls back to the bundled default
   * key in `keys/legion-catalog-public.ts`. Consumers running against
   * a custom signed catalog must supply their own key here.
   */
  publicKeyPem?: string;
  /**
   * Polling interval for the signed-catalog refresh loop, in
   * milliseconds. Only applies when `source === 'registry'` and
   * `registryUrl` is set. Default 1 hour (3_600_000). The refresh
   * loop is started explicitly via `startRefresh()` and cancelled via
   * `stopRefresh()`; it is not started automatically by `load()`.
   */
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
  private refreshInFlight = false;
  private readonly config: CatalogSourceConfig;
  private readonly verifyEnabled: boolean;
  private readonly publicKeyPem: string;

  constructor(config: CatalogSourceConfig) {
    this.config = config;
    // 1.3.0 default: verification ON unless the caller explicitly
    // opts out with verifySignature: false.
    this.verifyEnabled = config.verifySignature !== false;
    this.publicKeyPem = config.publicKeyPem ?? LEGION_CATALOG_PUBLIC_KEY_PEM;

    if (!this.verifyEnabled) {
      // Every startup when verification is disabled emits a loud
      // warning so operators cannot forget the catalog is unverified.
      log.warn(
        'adapter-catalog.signature_verification_disabled ' +
          '— catalog signature verification is OPT-OUT in 1.3.0+. ' +
          'This Legion instance is loading an UNVERIFIED adapter catalog. ' +
          'Set verifySignature: true (the default) or remove the explicit ' +
          'opt-out to enable signature enforcement. This warning fires on ' +
          'every startup by design.',
      );
    }
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
      // Resolve the bundle path from this module's location. We use
      // readFileSync (synchronous, raw bytes) rather than dynamic
      // JSON import because the signature verifier must see the EXACT
      // bytes on disk — `import` reparses and may normalize, which
      // would break the detached signature.
      const thisFile = fileURLToPath(import.meta.url);
      const pkgRoot = pathResolve(dirname(thisFile), '..', '..');
      const catalogPath = pathResolve(pkgRoot, 'adapter-catalog.json');
      const sigPath = `${catalogPath}.sig`;

      if (!existsSync(catalogPath)) {
        log.warn(
          'adapter-catalog.json not found — catalog will be empty until adapters implement static catalog()',
          { catalogPath },
        );
        return [];
      }

      const catalogBytes = readFileSync(catalogPath);

      // 1.3.0: bundled catalog signature enforcement.
      if (this.verifyEnabled) {
        if (!existsSync(sigPath)) {
          throw new Error(
            'adapter-catalog.json.sig not found alongside adapter-catalog.json. ' +
              'Legion 1.3.0+ requires a signed bundled catalog by default. ' +
              'Either reinstall @epicai/legion (which ships a signed .sig), ' +
              're-sign your custom catalog with scripts/sign-catalog.mjs, ' +
              'or explicitly set verifySignature: false in CatalogSourceConfig ' +
              'to opt out (not recommended — see SECURITY.md).',
          );
        }
        const sigB64 = readFileSync(sigPath, 'utf-8').trim();
        const valid = this.verifyEd25519Bytes(catalogBytes, sigB64, this.publicKeyPem);
        if (!valid) {
          throw new Error(
            'adapter-catalog.json signature verification failed. ' +
              'The bundled catalog bytes do not match the detached signature. ' +
              `Key ID: ${LEGION_CATALOG_PUBLIC_KEY_ID}. ` +
              'This indicates either catalog tampering or a key mismatch — ' +
              'do not proceed without investigating. See SECURITY.md.',
          );
        }
        log.info('adapter-catalog.signature_verified', {
          source: 'bundle',
          keyId: LEGION_CATALOG_PUBLIC_KEY_ID,
          bytes: catalogBytes.length,
        });
      }

      const parsed = JSON.parse(catalogBytes.toString('utf-8')) as AdapterCatalogEntry[];
      return parsed;
    } catch (err) {
      log.error('loadFromBundle failed', { error: String(err) });
      throw err;
    }
  }

  private async loadFromRegistry(): Promise<AdapterCatalogEntry[]> {
    const url = this.config.registryUrl!;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Registry returned ${response.status}`);
      }

      // Read the RAW bytes, not `response.text()` round-tripped through
      // UTF-8 string decoding. Text decoding can normalize BOMs, strip
      // invalid sequences, or rewrite line endings on some platforms,
      // which would diverge from whatever the registry actually signed.
      // The signature contract is byte-for-byte over the network-wire
      // bytes; any normalization invalidates it. `arrayBuffer()` gives
      // us the exact bytes the server sent.
      const bodyArrayBuffer = await response.arrayBuffer();
      const bodyBytes = Buffer.from(bodyArrayBuffer);

      // 1.3.0: verification is ON BY DEFAULT. Callers that need to
      // load from an unsigned registry endpoint must explicitly set
      // verifySignature: false in CatalogSourceConfig.
      if (this.verifyEnabled) {
        const signature = response.headers.get('catalog-signature');
        if (!signature) {
          throw new Error(
            `Registry at ${url} did not return a "catalog-signature" header. ` +
              'Legion 1.3.0+ requires signed registry responses by default. ' +
              'Either configure your registry to sign responses and serve the ' +
              'base64 Ed25519 signature in the catalog-signature header, or ' +
              'explicitly set verifySignature: false in CatalogSourceConfig ' +
              'to opt out (not recommended).',
          );
        }
        const valid = this.verifyEd25519Bytes(bodyBytes, signature, this.publicKeyPem);
        if (!valid) {
          throw new Error(
            `Registry catalog signature verification failed for ${url}. ` +
              `Key ID: ${LEGION_CATALOG_PUBLIC_KEY_ID}. ` +
              'The response bytes do not verify against the catalog-signature header.',
          );
        }
        log.info('adapter-catalog.signature_verified', {
          source: 'registry',
          url,
          keyId: LEGION_CATALOG_PUBLIC_KEY_ID,
          bytes: bodyBytes.length,
        });
      }

      // Decode AFTER verification so verification always runs against
      // the raw bytes regardless of what JSON.parse would otherwise do.
      const entries = JSON.parse(bodyBytes.toString('utf-8')) as AdapterCatalogEntry[];
      return entries;
    } catch (err) {
      log.error('failed to load catalog from registry', { url, error: String(err) });
      throw err;
    }
  }

  /**
   * Verify a base64 Ed25519 signature against a byte buffer using the
   * `crypto.verify(null, ...)` direct form. This is the correct Node.js
   * idiom for raw Ed25519 — the older `createVerify('ed25519')` form
   * has produced interop bugs because `createVerify` is designed for
   * hash-based signature algorithms. The signer script
   * (`scripts/sign-catalog.mjs`) uses the matching `sign(null, ...)`
   * form, so signer and verifier stay bit-compatible.
   */
  private verifyEd25519Bytes(
    data: Buffer,
    signatureB64: string,
    publicKeyPem: string,
  ): boolean {
    try {
      const sig = Buffer.from(signatureB64, 'base64');
      return cryptoVerify(null, data, publicKeyPem, sig);
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

  /**
   * Start the signed-catalog refresh loop.
   *
   * Requires `source: 'registry'` and a `registryUrl`. Polls on a
   * configurable interval (default 1 hour). Every refresh calls
   * `loadFromRegistry()` which in 1.3.0+ enforces the catalog-signature
   * header check against the bundled (or caller-supplied) public key.
   *
   * Semantics:
   *   - In-flight guard: if a refresh tick fires while the previous
   *     tick is still running (slow network, slow verify), the new
   *     tick is skipped rather than overlapping. This prevents two
   *     concurrent `setEntries()` rebuilds from racing.
   *   - Failure preserves state: when the fetch or signature check
   *     fails, the existing entries stay in place. A refresh failure
   *     NEVER leaves the catalog empty or partially populated.
   *   - `unref()`'d: the refresh timer does not keep the Node event
   *     loop alive. Shutting down the agent without calling
   *     `stopRefresh()` is safe.
   *
   * No-op when source !== 'registry'. Idempotent — calling
   * `startRefresh()` twice in a row is the same as calling it once.
   */
  startRefresh(): void {
    if (this.config.source !== 'registry' || !this.config.registryUrl) return;
    if (this.refreshTimer) return; // idempotent

    const intervalMs = this.config.refreshIntervalMs ?? 3_600_000;
    this.refreshTimer = setInterval(() => {
      if (this.refreshInFlight) {
        log.warn('adapter-catalog.refresh.skipped_overlapping');
        return;
      }
      this.refreshInFlight = true;
      this.loadFromRegistry()
        .then((entries) => {
          this.buildIndex(entries);
          log.info('adapter-catalog.refresh.success', {
            entries: entries.length,
            keyId: this.verifyEnabled ? LEGION_CATALOG_PUBLIC_KEY_ID : 'disabled',
          });
        })
        .catch((err) => {
          log.error('adapter-catalog.refresh.failed', {
            error: String(err),
            note: 'retaining current catalog — previous entries remain in effect',
          });
        })
        .finally(() => {
          this.refreshInFlight = false;
        });
    }, intervalMs);

    if (this.refreshTimer && typeof this.refreshTimer === 'object' && 'unref' in this.refreshTimer) {
      this.refreshTimer.unref();
    }

    log.info('adapter-catalog.refresh.started', {
      intervalMs,
      url: this.config.registryUrl,
      verify: this.verifyEnabled,
    });
  }

  stopRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      log.info('adapter-catalog.refresh.stopped');
    }
  }
}
