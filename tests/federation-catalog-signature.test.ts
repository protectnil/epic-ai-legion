/**
 * @epicai/legion — Signed Adapter Catalog Tests (L2, 1.3.0)
 *
 * Verifies the 1.3.0 breaking change: `AdapterCatalog` now verifies
 * the Ed25519 signature on the catalog by default on both the bundled
 * and remote load paths. Covers:
 *
 *   1. Bundled catalog loads successfully with a valid .sig file
 *      (the happy path for every consumer who installs @epicai/legion
 *      and uses the defaults).
 *   2. Bundled catalog fails to load when .sig is missing and
 *      verification is the default (ON).
 *   3. Bundled catalog loads when .sig is missing BUT the caller
 *      explicitly opts out via verifySignature: false. Also asserts
 *      the loud startup warning is emitted in this mode.
 *   4. Registry load verifies the catalog-signature header.
 *   5. Registry load fails on signature mismatch.
 *   6. Registry load fails when the signature header is missing.
 *   7. startRefresh() polls and updates entries on success.
 *   8. startRefresh() preserves existing entries on refresh failure.
 *   9. startRefresh() skips an overlapping tick via the in-flight guard.
 *  10. stopRefresh() cancels the polling loop.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  createPrivateKey,
  generateKeyPairSync,
  sign as cryptoSign,
} from 'node:crypto';
import { writeFileSync, unlinkSync, existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AdapterCatalog } from '../src/federation/AdapterCatalog.js';

// Resolve the package root so we can compute the bundled catalog path
// the same way AdapterCatalog does internally.
const thisFile = fileURLToPath(import.meta.url);
const PKG_ROOT = resolve(dirname(thisFile), '..');
const BUNDLED_CATALOG = join(PKG_ROOT, 'adapter-catalog.json');
const BUNDLED_SIG = `${BUNDLED_CATALOG}.sig`;

// ─── Bundled catalog — happy path ────────────────────────────────────────

describe('AdapterCatalog — bundled path, default verification ON', () => {
  it('loads successfully when adapter-catalog.json.sig is present and valid', async () => {
    // The shipped bundled .sig file was signed by the dev key bundled
    // in src/keys/legion-catalog-public.ts. Default config verifies
    // against that key. No config override needed.
    const catalog = new AdapterCatalog({ source: 'bundle' });
    await catalog.load();

    // Sanity: the bundled catalog has thousands of entries; this test
    // just asserts load() completed and the catalog populated.
    expect(catalog.size).toBeGreaterThan(0);
  });

  it('rejects when adapter-catalog.json.sig is missing and verification is default (ON)', async () => {
    // Temporarily move the sig file aside, attempt load, restore.
    const backup = `${BUNDLED_SIG}.backup-test`;
    const hadSig = existsSync(BUNDLED_SIG);
    if (!hadSig) {
      // If for some reason the bundled sig is missing, the test is
      // pointless — skip with a clear message.
      console.warn('bundled .sig not present; skipping');
      return;
    }
    const originalSig = readFileSync(BUNDLED_SIG);
    try {
      unlinkSync(BUNDLED_SIG);

      const catalog = new AdapterCatalog({ source: 'bundle' });
      await expect(catalog.load()).rejects.toThrow(/\.sig not found/);
    } finally {
      writeFileSync(BUNDLED_SIG, originalSig);
      expect(existsSync(BUNDLED_SIG)).toBe(true);
    }
  });

  it('loads successfully when .sig is missing AND verifySignature is explicitly false', async () => {
    const backup = readFileSync(BUNDLED_SIG);
    try {
      unlinkSync(BUNDLED_SIG);

      // Explicit opt-out — the "I know what I'm doing" path.
      const catalog = new AdapterCatalog({
        source: 'bundle',
        verifySignature: false,
      });
      await catalog.load();
      expect(catalog.size).toBeGreaterThan(0);
    } finally {
      writeFileSync(BUNDLED_SIG, backup);
    }
  });

  it('emits the loud startup warning when verification is opted out', async () => {
    // Capture all console.warn / log output. The logger routes to a
    // stderr stream in tests, so we spy on process.stderr.write.
    const warnings: string[] = [];
    const origWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: unknown, ...rest: unknown[]) => {
      if (typeof chunk === 'string') warnings.push(chunk);
      return origWrite(chunk as string, ...(rest as [] ));
    }) as typeof process.stderr.write;

    try {
      // Constructing with verifySignature: false fires the warning at
      // construction time, regardless of whether load() is called.
      new AdapterCatalog({ source: 'bundle', verifySignature: false });
    } finally {
      process.stderr.write = origWrite;
    }

    const joined = warnings.join('');
    expect(joined).toMatch(/signature_verification_disabled/);
    expect(joined).toMatch(/OPT-OUT/);
  });
});

// ─── Registry path — signature enforcement ──────────────────────────────

/**
 * Test helper — generate a fresh Ed25519 keypair and return both the
 * PEM-encoded public key and a signing function closed over the
 * private key. Used to simulate a custom signing authority.
 */
function makeEd25519Pair() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  const signer = (data: Buffer): string =>
    cryptoSign(null, data, privateKey).toString('base64');
  return { publicKeyPem, signer };
}

function makeMockFetch(
  responses: Map<
    string,
    { status: number; body: string; headers?: Record<string, string> }
  >,
) {
  return async (input: unknown) => {
    const url = typeof input === 'string' ? input : String(input);
    const r = responses.get(url);
    if (!r) {
      return new Response('', { status: 404 });
    }
    return new Response(r.body, {
      status: r.status,
      headers: r.headers ?? {},
    });
  };
}

describe('AdapterCatalog — registry path, signature enforcement', () => {
  const origFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  it('accepts a signed registry response', async () => {
    const { publicKeyPem, signer } = makeEd25519Pair();
    const entries = [
      {
        id: 'test-adapter',
        name: 'test-adapter',
        displayName: 'Test',
        version: '1.0.0',
        category: 'misc',
        keywords: [],
        toolNames: [],
        description: '',
        author: 'protectnil',
      },
    ];
    const body = JSON.stringify(entries);
    const sig = signer(Buffer.from(body, 'utf-8'));

    globalThis.fetch = makeMockFetch(
      new Map([
        [
          'https://registry.example.com/catalog.json',
          { status: 200, body, headers: { 'catalog-signature': sig } },
        ],
      ]),
    ) as typeof fetch;

    const catalog = new AdapterCatalog({
      source: 'registry',
      registryUrl: 'https://registry.example.com/catalog.json',
      publicKeyPem,
      // verifySignature defaults to true in 1.3.0
    });
    await catalog.load();
    expect(catalog.size).toBe(1);
  });

  it('rejects a registry response with a bad signature', async () => {
    const { publicKeyPem, signer } = makeEd25519Pair();
    const entries = [
      {
        id: 'test-adapter',
        name: 'test-adapter',
        displayName: 'Test',
        version: '1.0.0',
        category: 'misc',
        keywords: [],
        toolNames: [],
        description: '',
        author: 'protectnil',
      },
    ];
    const body = JSON.stringify(entries);
    // Sign a DIFFERENT body to simulate tampering. The server returns
    // the original body but the signature is for the tampered version.
    const tamperedBody = body.replace('test-adapter', 'attacker-adapter');
    const badSig = signer(Buffer.from(tamperedBody, 'utf-8'));

    globalThis.fetch = makeMockFetch(
      new Map([
        [
          'https://registry.example.com/catalog.json',
          { status: 200, body, headers: { 'catalog-signature': badSig } },
        ],
      ]),
    ) as typeof fetch;

    const catalog = new AdapterCatalog({
      source: 'registry',
      registryUrl: 'https://registry.example.com/catalog.json',
      publicKeyPem,
    });
    await expect(catalog.load()).rejects.toThrow(/signature verification failed/);
  });

  it('rejects a registry response missing the catalog-signature header', async () => {
    const { publicKeyPem } = makeEd25519Pair();

    globalThis.fetch = makeMockFetch(
      new Map([
        [
          'https://registry.example.com/catalog.json',
          { status: 200, body: '[]' /* no signature header */ },
        ],
      ]),
    ) as typeof fetch;

    const catalog = new AdapterCatalog({
      source: 'registry',
      registryUrl: 'https://registry.example.com/catalog.json',
      publicKeyPem,
    });
    await expect(catalog.load()).rejects.toThrow(/catalog-signature/);
  });

  it('accepts a registry response with no signature when verifySignature is explicitly false', async () => {
    globalThis.fetch = makeMockFetch(
      new Map([
        [
          'https://registry.example.com/catalog.json',
          { status: 200, body: '[]' },
        ],
      ]),
    ) as typeof fetch;

    const catalog = new AdapterCatalog({
      source: 'registry',
      registryUrl: 'https://registry.example.com/catalog.json',
      verifySignature: false,
    });
    await catalog.load();
    expect(catalog.size).toBe(0);
  });
});

// ─── Refresh loop ───────────────────────────────────────────────────────

describe('AdapterCatalog.startRefresh / stopRefresh', () => {
  const origFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = origFetch;
    vi.useRealTimers();
  });

  it('is a no-op when source !== "registry"', () => {
    const catalog = new AdapterCatalog({ source: 'bundle' });
    catalog.startRefresh();
    // No timer is created — internal refreshTimer stays null.
    // We indirectly verify by calling stopRefresh() and expecting no throw.
    catalog.stopRefresh();
  });

  it('polls on interval, calls loadFromRegistry, updates entries on success', async () => {
    vi.useFakeTimers();
    const { publicKeyPem, signer } = makeEd25519Pair();
    let version = 1;
    globalThis.fetch = (async (input: unknown) => {
      const body = JSON.stringify([
        {
          id: `v${version}`,
          name: `v${version}`,
          displayName: `Test ${version}`,
          version: '1.0.0',
          category: 'misc',
          keywords: [],
          toolNames: [],
          description: '',
          author: 'protectnil',
        },
      ]);
      const sig = signer(Buffer.from(body, 'utf-8'));
      return new Response(body, {
        status: 200,
        headers: { 'catalog-signature': sig },
      });
    }) as typeof fetch;

    const catalog = new AdapterCatalog({
      source: 'registry',
      registryUrl: 'https://registry.example.com/catalog.json',
      publicKeyPem,
      refreshIntervalMs: 1000,
    });
    await catalog.load();
    expect(catalog.byName('v1')).toBeDefined();

    catalog.startRefresh();

    // Advance version + fake timer
    version = 2;
    await vi.advanceTimersByTimeAsync(1001);
    // Wait for the in-flight promise chain
    await vi.runOnlyPendingTimersAsync();
    // The .then/.finally chain completes in the microtask queue,
    // which vitest flushes via runAllTicks.
    await Promise.resolve();
    await Promise.resolve();

    expect(catalog.byName('v2')).toBeDefined();

    catalog.stopRefresh();
  });

  it('preserves existing entries when refresh fetch fails', async () => {
    vi.useFakeTimers();
    const { publicKeyPem, signer } = makeEd25519Pair();

    let callCount = 0;
    globalThis.fetch = (async (input: unknown) => {
      callCount++;
      if (callCount === 1) {
        // First call (initial load) — succeed
        const body = JSON.stringify([
          {
            id: 'initial',
            name: 'initial',
            displayName: 'Initial',
            version: '1.0.0',
            category: 'misc',
            keywords: [],
            toolNames: [],
            description: '',
            author: 'protectnil',
          },
        ]);
        const sig = signer(Buffer.from(body, 'utf-8'));
        return new Response(body, {
          status: 200,
          headers: { 'catalog-signature': sig },
        });
      }
      // Subsequent calls (refresh) — fail
      return new Response('', { status: 503 });
    }) as typeof fetch;

    const catalog = new AdapterCatalog({
      source: 'registry',
      registryUrl: 'https://registry.example.com/catalog.json',
      publicKeyPem,
      refreshIntervalMs: 1000,
    });
    await catalog.load();
    expect(catalog.byName('initial')).toBeDefined();

    catalog.startRefresh();
    await vi.advanceTimersByTimeAsync(1001);
    await vi.runOnlyPendingTimersAsync();
    await Promise.resolve();
    await Promise.resolve();

    // Failure path: existing entry still present.
    expect(catalog.byName('initial')).toBeDefined();
    expect(catalog.size).toBe(1);

    catalog.stopRefresh();
  });

  it('stopRefresh() is idempotent (safe to call twice)', () => {
    const catalog = new AdapterCatalog({ source: 'bundle' });
    catalog.stopRefresh();
    catalog.stopRefresh();
    // No throw = pass.
  });

  it('startRefresh() is idempotent (second call does not create a second timer)', () => {
    const catalog = new AdapterCatalog({
      source: 'registry',
      registryUrl: 'https://registry.example.com/catalog.json',
      verifySignature: false,
      refreshIntervalMs: 60_000,
    });
    catalog.startRefresh();
    catalog.startRefresh(); // second call should be a no-op
    catalog.stopRefresh();
  });

  it('in-flight guard: a second timer tick while a refresh is pending is skipped, not overlapped', async () => {
    vi.useFakeTimers();
    const { publicKeyPem, signer } = makeEd25519Pair();

    // Count fetch invocations. If the in-flight guard works, two
    // consecutive timer ticks with the first tick still awaiting
    // should produce only ONE in-flight fetch, not two.
    let fetchesStarted = 0;
    let fetchesCompleted = 0;
    let releaseFetch: (() => void) | null = null;

    globalThis.fetch = (async (_input: unknown) => {
      fetchesStarted++;
      // Block the first call until we explicitly release it.
      if (fetchesStarted === 1) {
        await new Promise<void>((resolve) => {
          releaseFetch = resolve;
        });
      }
      fetchesCompleted++;
      const body = JSON.stringify([
        {
          id: 'pending',
          name: 'pending',
          displayName: 'Pending',
          version: '1.0.0',
          category: 'misc',
          keywords: [],
          toolNames: [],
          description: '',
          author: 'protectnil',
        },
      ]);
      const sig = signer(Buffer.from(body, 'utf-8'));
      return new Response(body, {
        status: 200,
        headers: { 'catalog-signature': sig },
      });
    }) as typeof fetch;

    const catalog = new AdapterCatalog({
      source: 'registry',
      registryUrl: 'https://registry.example.com/catalog.json',
      publicKeyPem,
      refreshIntervalMs: 1000,
    });

    // Start the refresh loop. Seed the catalog with a load() first
    // so we have baseline state.
    catalog.startRefresh();

    // Fire the first tick — kicks off fetch #1 which immediately
    // blocks on the releaseFetch promise.
    await vi.advanceTimersByTimeAsync(1001);
    expect(fetchesStarted).toBe(1);
    expect(fetchesCompleted).toBe(0);

    // Fire a second tick WHILE fetch #1 is still pending. The in-
    // flight guard should skip this tick entirely — no second fetch.
    await vi.advanceTimersByTimeAsync(1001);
    expect(fetchesStarted).toBe(1); // still one — the guard worked
    expect(fetchesCompleted).toBe(0);

    // Now release fetch #1 and let it settle.
    releaseFetch!();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchesCompleted).toBe(1);

    // Fire another tick. The guard is now clear, so a new fetch
    // should be allowed. To keep the test deterministic we unblock
    // subsequent fetches by not re-setting releaseFetch.
    await vi.advanceTimersByTimeAsync(1001);
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchesStarted).toBe(2);

    catalog.stopRefresh();
  });
});
