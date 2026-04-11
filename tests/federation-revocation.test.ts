/**
 * @epicai/legion — Runtime Revocation Enforcement Tests (L1, 1.2.0)
 *
 * Verifies that AdapterCatalog.isRevoked() is honored by both
 * RegistryLoader (load-time gate) and FederationManager (connect + call
 * gates) when callers opt in by passing a loaded AdapterCatalog. Also
 * pins backward compatibility: when no catalog is passed, revocation
 * enforcement is disabled and the pre-1.2.0 behavior is preserved.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AdapterCatalog, type AdapterCatalogEntry } from '../src/federation/AdapterCatalog.js';
import { RegistryLoader } from '../src/federation/RegistryLoader.js';
import { FederationManager } from '../src/federation/FederationManager.js';
import type { ServerConnection, Tool, ToolResult } from '../src/types/index.js';

// ── Test helpers ─────────────────────────────────────────────────────────

/**
 * Minimal fake MCPAdapter — satisfies the shape FederationManager.connect
 * expects and records whether callTool was invoked. Used to prove that a
 * revoked adapter was never called into.
 */
function makeFakeAdapter(name: string) {
  const state = { callToolInvocations: 0, connected: false, disconnected: false };
  const tool: Tool = {
    name: `tool_${name}`,
    description: `fake tool for ${name}`,
    parameters: { type: 'object', properties: {} },
    server: name,
    tier: 'orchestrated',
  };
  const adapter = {
    async connect() { state.connected = true; },
    async disconnect() { state.disconnected = true; },
    async listTools() { return [tool]; },
    async callTool(_name: string, _args: Record<string, unknown>): Promise<ToolResult> {
      state.callToolInvocations++;
      return {
        content: [{ type: 'text', text: 'fake-ok' }],
        isError: false,
        server: name,
        tool: tool.name,
        durationMs: 1,
      };
    },
    async health() {
      return { server: name, status: 'healthy' as const, toolCount: 1 };
    },
  };
  return { adapter, state, tool };
}

function makeServerConnection(name: string): ServerConnection {
  return {
    name,
    transport: 'stdio',
    command: 'echo',
    args: ['fake'],
  } as ServerConnection;
}

function makeCatalogWithEntries(entries: AdapterCatalogEntry[]): AdapterCatalog {
  // Use the public `setEntries()` method added in 1.2.0 specifically
  // so tests and programmatic consumers can populate the catalog
  // without touching the bundle-file resolution path. The real
  // production code path (`load()`) calls the same private
  // `buildIndex` internally.
  const catalog = new AdapterCatalog({ source: 'bundle' });
  catalog.setEntries(entries);
  return catalog;
}

// ── AdapterCatalog.getRevocationDetails ─────────────────────────────────

describe('AdapterCatalog.getRevocationDetails', () => {
  it('returns undefined for non-revoked entries', async () => {
    const catalog = makeCatalogWithEntries([
      {
        name: 'stripe',
        displayName: 'Stripe',
        version: '1.0.0',
        category: 'finance',
        keywords: ['payments'],
        toolNames: [],
        description: '',
        author: 'vendor',
      },
    ]);
    expect(catalog.isRevoked('stripe')).toBe(false);
    expect(catalog.getRevocationDetails('stripe')).toBeUndefined();
  });

  it('returns full details for revoked entries', async () => {
    const catalog = makeCatalogWithEntries([
      {
        name: 'chainlink',
        displayName: 'Chainlink',
        version: '1.0.0',
        category: 'finance',
        keywords: ['defi'],
        toolNames: [],
        description: '',
        author: 'vendor',
        revoked: true,
        revokedAt: '2026-04-11T12:00:00Z',
        revokedReason: 'vendor_identity_mismatch',
      },
    ]);
    expect(catalog.isRevoked('chainlink')).toBe(true);
    const details = catalog.getRevocationDetails('chainlink');
    expect(details).toBeDefined();
    expect(details?.revoked).toBe(true);
    expect(details?.revokedAt).toBe('2026-04-11T12:00:00Z');
    expect(details?.reason).toBe('vendor_identity_mismatch');
  });

  it('resolves revocation by EITHER id slug OR name package identifier', () => {
    // Production catalog entries carry BOTH an `id` slug (e.g.
    // "0pi-mcp-server") and a `name` package identifier (e.g.
    // "@0pi/mcp-server"). The federation layer uses the slug (via
    // ServerConnection.name); the classifier uses the package name.
    // Both paths must resolve to the same revocation state.
    const catalog = makeCatalogWithEntries([
      {
        id: '0pi-mcp-server',
        name: '@0pi/mcp-server',
        displayName: '0pi MCP Server',
        version: '1.0.0',
        category: 'misc',
        keywords: ['storage'],
        toolNames: [],
        description: '',
        author: 'community',
        revoked: true,
        revokedReason: 'test_both_keys',
      },
    ]);
    // By slug (federation side)
    expect(catalog.isRevoked('0pi-mcp-server')).toBe(true);
    expect(catalog.getRevocationDetails('0pi-mcp-server')?.reason).toBe('test_both_keys');
    // By name (classifier side)
    expect(catalog.isRevoked('@0pi/mcp-server')).toBe(true);
    expect(catalog.getRevocationDetails('@0pi/mcp-server')?.reason).toBe('test_both_keys');
    // Both paths return the same entry details
    const viaSlug = catalog.getRevocationDetails('0pi-mcp-server');
    const viaName = catalog.getRevocationDetails('@0pi/mcp-server');
    expect(viaSlug).toEqual(viaName);
  });
});

// ── RegistryLoader revocation gate ──────────────────────────────────────

describe('RegistryLoader — revocation gate', () => {
  let registryPath: string;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'legion-reg-'));
    registryPath = join(tmpDir, 'mcp-registry.json');
    const entries = [
      {
        id: 'safe-adapter',
        name: 'safe-adapter',
        description: 'A safe one',
        category: 'misc',
        keywords: ['safe'],
        type: 'mcp',
        mcp: {
          transport: 'stdio',
          command: 'echo',
          args: ['safe'],
        },
      },
      {
        id: 'revoked-adapter',
        name: 'revoked-adapter',
        description: 'A revoked one',
        category: 'misc',
        keywords: ['bad'],
        type: 'mcp',
        mcp: {
          transport: 'stdio',
          command: 'echo',
          args: ['bad'],
        },
      },
    ];
    writeFileSync(registryPath, JSON.stringify(entries), 'utf-8');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('skips revoked adapters when a catalog is provided (id === name)', async () => {
    const catalog = makeCatalogWithEntries([
      {
        name: 'safe-adapter',
        displayName: 'Safe',
        version: '1.0.0',
        category: 'misc',
        keywords: [],
        toolNames: [],
        description: '',
        author: 'community',
      },
      {
        name: 'revoked-adapter',
        displayName: 'Revoked',
        version: '1.0.0',
        category: 'misc',
        keywords: [],
        toolNames: [],
        description: '',
        author: 'community',
        revoked: true,
        revokedReason: 'test_revocation',
      },
    ]);

    const loader = new RegistryLoader({ registryPath, catalog });
    const result = loader.load();
    const loadedIds = result.loaded.map((l) => l.connection.name);
    expect(loadedIds).toContain('safe-adapter');
    expect(loadedIds).not.toContain('revoked-adapter');
    const skipReason = result.skipped.find((s) => s.id === 'revoked-adapter')?.reason;
    expect(skipReason).toMatch(/revoked in catalog/);
    expect(skipReason).toMatch(/test_revocation/);
  });

  it('skips revoked adapters when catalog revocation is keyed by id slug only (production shape)', async () => {
    // Production catalog entries have DISTINCT `id` and `name` values:
    // `id` is the slug (e.g. "revoked-adapter") and `name` is the
    // package identifier (e.g. "@scope/revoked-pkg"). The registry's
    // `entry.id` that RegistryLoader checks is the slug. The fix for
    // Codex finding #1 was to index the revocation set by BOTH keys
    // so this lookup resolves correctly. Regression test for that
    // exact mismatch.
    const catalog = makeCatalogWithEntries([
      {
        id: 'revoked-adapter',
        name: '@scope/revoked-pkg',
        displayName: 'Revoked',
        version: '1.0.0',
        category: 'misc',
        keywords: [],
        toolNames: [],
        description: '',
        author: 'community',
        revoked: true,
        revokedReason: 'prod_shape_regression',
      },
    ]);

    const loader = new RegistryLoader({ registryPath, catalog });
    const result = loader.load();
    const loadedIds = result.loaded.map((l) => l.connection.name);
    expect(loadedIds).toContain('safe-adapter');
    expect(loadedIds).not.toContain('revoked-adapter');
    const skipReason = result.skipped.find((s) => s.id === 'revoked-adapter')?.reason;
    expect(skipReason).toMatch(/revoked in catalog/);
    expect(skipReason).toMatch(/prod_shape_regression/);
  });

  it('does NOT skip revoked adapters when no catalog is provided (backward compat)', () => {
    const loader = new RegistryLoader({ registryPath });
    const result = loader.load();
    const loadedIds = result.loaded.map((l) => l.connection.name);
    // Pre-1.1.0 behavior: both load normally. Any skip in this mode must
    // come from the existing credential gate, NOT from revocation.
    expect(loadedIds).toContain('safe-adapter');
    expect(loadedIds).toContain('revoked-adapter');
  });
});

// ── FederationManager revocation gate ───────────────────────────────────

describe('FederationManager — revocation gate', () => {
  it('skips revoked adapters at connect time when catalog is provided', async () => {
    const catalog = makeCatalogWithEntries([
      {
        name: 'revoked-server',
        displayName: 'Revoked',
        version: '1.0.0',
        category: 'misc',
        keywords: [],
        toolNames: [],
        description: '',
        author: 'community',
        revoked: true,
        revokedReason: 'test',
      },
    ]);

    const manager = new FederationManager(
      { servers: [], retryPolicy: { maxRetries: 0, backoffMs: 0 } },
      { catalog },
    );

    const { adapter, state } = makeFakeAdapter('revoked-server');
    await manager.connect('revoked-server', makeServerConnection('revoked-server'), adapter as never);

    expect(state.connected).toBe(false);
    expect(manager.serverCount).toBe(0);
    expect(manager.toolCount).toBe(0);
  });

  it('connects non-revoked adapters normally when catalog is provided', async () => {
    const catalog = makeCatalogWithEntries([
      {
        name: 'good-server',
        displayName: 'Good',
        version: '1.0.0',
        category: 'misc',
        keywords: [],
        toolNames: [],
        description: '',
        author: 'community',
      },
    ]);

    const manager = new FederationManager(
      { servers: [], retryPolicy: { maxRetries: 0, backoffMs: 0 } },
      { catalog },
    );

    const { adapter, state } = makeFakeAdapter('good-server');
    await manager.connect('good-server', makeServerConnection('good-server'), adapter as never);

    expect(state.connected).toBe(true);
    expect(manager.serverCount).toBe(1);
    expect(manager.toolCount).toBe(1);
  });

  it('returns isError ToolResult (does NOT throw) when callTool targets a revoked adapter', async () => {
    // Seed the catalog with a non-revoked entry so connect succeeds,
    // then mutate the catalog to mark it revoked via a rebuild, then
    // call the tool. callTool must return an error ToolResult with
    // the revocation reason in the content text.
    const initialEntry: AdapterCatalogEntry = {
      name: 'mutable-server',
      displayName: 'Mutable',
      version: '1.0.0',
      category: 'misc',
      keywords: [],
      toolNames: [],
      description: '',
      author: 'community',
    };
    const catalog = makeCatalogWithEntries([initialEntry]);

    const manager = new FederationManager(
      { servers: [], retryPolicy: { maxRetries: 0, backoffMs: 0 } },
      { catalog },
    );

    const { adapter, state } = makeFakeAdapter('mutable-server');
    await manager.connect('mutable-server', makeServerConnection('mutable-server'), adapter as never);
    expect(state.connected).toBe(true);

    // Simulate a catalog refresh that marks the entry revoked
    interface InternalCatalog {
      entries_: AdapterCatalogEntry[];
      revocationSet: Set<string>;
      nameIndex: Map<string, AdapterCatalogEntry>;
    }
    const internal = catalog as unknown as InternalCatalog;
    const mutated: AdapterCatalogEntry = {
      ...initialEntry,
      revoked: true,
      revokedAt: '2026-04-11T12:00:00Z',
      revokedReason: 'contradiction_detected',
    };
    internal.entries_ = [mutated];
    internal.nameIndex.set(mutated.name, mutated);
    internal.revocationSet.add(mutated.name);

    // The tool is registered under the prefixed name "mutable-server:tool_mutable-server"
    const toolName = manager.listTools()[0]?.name;
    expect(toolName).toBeDefined();

    const result = await manager.callTool(toolName!, {});

    expect(result.isError).toBe(true);
    expect(state.callToolInvocations).toBe(0);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]?.text).toMatch(/revoked/);
    expect(content[0]?.text).toMatch(/contradiction_detected/);
  });

  it('calls non-revoked tools normally when catalog is provided', async () => {
    const catalog = makeCatalogWithEntries([
      {
        name: 'clean-server',
        displayName: 'Clean',
        version: '1.0.0',
        category: 'misc',
        keywords: [],
        toolNames: [],
        description: '',
        author: 'community',
      },
    ]);

    const manager = new FederationManager(
      { servers: [], retryPolicy: { maxRetries: 0, backoffMs: 0 } },
      { catalog },
    );

    const { adapter, state } = makeFakeAdapter('clean-server');
    await manager.connect('clean-server', makeServerConnection('clean-server'), adapter as never);

    const toolName = manager.listTools()[0]?.name;
    const result = await manager.callTool(toolName!, {});

    expect(result.isError).toBe(false);
    expect(state.callToolInvocations).toBe(1);
  });

  it('throws on unknown tool (existing behavior is preserved)', async () => {
    const manager = new FederationManager({ servers: [] });
    await expect(
      manager.callTool('nonexistent', {}),
    ).rejects.toThrow(/not found/);
  });

  it('in-flight call completes when catalog flips to revoked AFTER dispatch (documented TOCTOU boundary)', async () => {
    // 1.2.0 scope limitation: the revocation gate prevents NEW dispatch
    // to a revoked adapter, but a call that is already awaiting on
    // `adapter.callTool` when the catalog flips completes normally.
    // This test pins that semantic so future refactors don't silently
    // regress it in either direction. Cooperative in-flight cancellation
    // is a 1.3.0 (L3) concern — when L3 lands, this test should be
    // updated to assert cancellation, not completion.
    const initialEntry: AdapterCatalogEntry = {
      name: 'inflight-server',
      displayName: 'Inflight',
      version: '1.0.0',
      category: 'misc',
      keywords: [],
      toolNames: [],
      description: '',
      author: 'community',
    };
    const catalog = makeCatalogWithEntries([initialEntry]);

    const manager = new FederationManager({ servers: [] }, { catalog });

    // Build a fake adapter whose callTool awaits on a Promise we
    // control, so the test can mutate the catalog between dispatch
    // and completion.
    let resolveInflight: ((r: ToolResult) => void) | null = null;
    const inflightCompleted = new Promise<ToolResult>((r) => {
      resolveInflight = r;
    });
    const fakeTool: Tool = {
      name: 'tool_inflight-server',
      description: 'slow',
      parameters: { type: 'object', properties: {} },
      server: 'inflight-server',
      tier: 'orchestrated',
    };
    const state = { callToolInvocations: 0 };
    const slowAdapter = {
      async connect() {},
      async disconnect() {},
      async listTools() { return [fakeTool]; },
      async callTool(_name: string, _args: Record<string, unknown>): Promise<ToolResult> {
        state.callToolInvocations++;
        return inflightCompleted;
      },
      async health() {
        return { server: 'inflight-server', status: 'healthy' as const, toolCount: 1 };
      },
    };

    await manager.connect(
      'inflight-server',
      makeServerConnection('inflight-server'),
      slowAdapter as never,
    );

    // Start a tool call — this await will suspend on inflightCompleted
    const toolName = manager.listTools()[0]?.name;
    const callPromise = manager.callTool(toolName!, {});

    // Mutate the catalog: flip the entry to revoked while the call is
    // in flight. The gate check has already passed at this point.
    interface InternalCatalog {
      entries_: AdapterCatalogEntry[];
      revocationSet: Set<string>;
      nameIndex: Map<string, AdapterCatalogEntry>;
    }
    const internal = catalog as unknown as InternalCatalog;
    const mutated: AdapterCatalogEntry = {
      ...initialEntry,
      revoked: true,
      revokedReason: 'mid_flight',
    };
    internal.entries_ = [mutated];
    internal.nameIndex.set(mutated.name, mutated);
    internal.revocationSet.add(mutated.name);

    // Now resolve the in-flight call. In 1.1.0 semantics the call
    // completes normally because the dispatch already happened.
    resolveInflight!({
      content: [{ type: 'text', text: 'inflight-ok' }],
      isError: false,
      server: 'inflight-server',
      tool: fakeTool.name,
      durationMs: 5,
    });

    const result = await callPromise;
    expect(result.isError).toBe(false);
    expect(state.callToolInvocations).toBe(1);

    // A NEW call, however, is blocked — confirming the gate works
    // for dispatches that start AFTER the revocation.
    const secondResult = await manager.callTool(toolName!, {});
    expect(secondResult.isError).toBe(true);
    const secondContent = secondResult.content as Array<{ type: string; text: string }>;
    expect(secondContent[0]?.text).toMatch(/mid_flight/);
    // The in-flight counter should still be 1 — the second call was
    // refused before the fake adapter's callTool ever ran.
    expect(state.callToolInvocations).toBe(1);
  });

  it('enforces revocation without a catalog does NOT run the gate (backward compat)', async () => {
    // No catalog passed — pre-1.2.0 behavior: a catalog entry marked
    // revoked has no effect. This test pins backward compatibility.
    const manager = new FederationManager({ servers: [] });

    const { adapter, state } = makeFakeAdapter('uncheckd-server');
    await manager.connect('uncheckd-server', makeServerConnection('uncheckd-server'), adapter as never);
    expect(state.connected).toBe(true);

    const toolName = manager.listTools()[0]?.name;
    const result = await manager.callTool(toolName!, {});
    expect(result.isError).toBe(false);
    expect(state.callToolInvocations).toBe(1);
  });
});
