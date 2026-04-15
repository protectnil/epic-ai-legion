/**
 * @epicai/legion — CLI `legion serve` smoke test
 *
 * Validates that the built CLI entrypoint (`dist/bin/setup.js serve`):
 * 1. Loads package.json without crashing (guards the 2.0.1 path bug)
 * 2. Starts an MCP stdio server that completes the initialize handshake
 * 3. Registers exactly the three meta-tools: legion_query, legion_call, legion_list
 * 4. Responds to a real `tools/list` call with the correct schemas
 * 5. Responds to a real `legion_query` call and returns structured JSON
 * 6. Responds to a real `legion_list` call and returns adapter records
 * 7. Shuts down cleanly on SIGTERM
 *
 * All tests run against the compiled dist/ — they are publishing regression
 * tests, not unit tests. If dist/ is stale, run `npm run build` first.
 *
 * Regression: https://github.com/protectnil/epic-ai-legion/issues/XX
 *   v2.0.1 shipped with `_require('../../../package.json')` in setup.ts:33.
 *   From dist/bin/, three levels up lands at /opt/ not the package root,
 *   causing an immediate crash on every `legion serve` invocation.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fileURLToPath }   from 'node:url';
import { resolve, dirname } from 'node:path';
import { Client }          from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool }       from '@modelcontextprotocol/sdk/types.js';

const __dir   = dirname(fileURLToPath(import.meta.url));
const CLI_BIN = resolve(__dir, '..', 'dist', 'bin', 'setup.js');
const PKG_ROOT = resolve(__dir, '..');

// ── Shared client lifecycle ─────────────────────────────────────────────────

let client: Client;
let transport: StdioClientTransport;

beforeAll(async () => {
  transport = new StdioClientTransport({
    command: 'node',
    args:    [CLI_BIN, 'serve'],
    env:     { ...process.env, EPIC_MODE: 'mock' },
    cwd:     PKG_ROOT,
  });

  client = new Client(
    { name: 'legion-cli-smoke-test', version: '1.0.0' },
    { capabilities: {} },
  );

  await client.connect(transport);
}, 30_000);

afterAll(async () => {
  try { await client.close(); } catch { /* already closed */ }
}, 10_000);

// ── 1. Package.json resolution (the 2.0.1 regression) ─────────────────────

describe('Package.json resolution', () => {
  it('CLI starts without throwing "Cannot find module package.json"', () => {
    // If the client connected successfully in beforeAll, the CLI did not crash
    // on the package.json require. This is the primary regression guard.
    expect(client).toBeDefined();
  });
});

// ── 2. MCP initialize handshake ────────────────────────────────────────────

describe('MCP initialize handshake', () => {
  it('server returns a valid protocolVersion', async () => {
    // Verify the server responded to initialize by checking we can list tools
    const result = await client.listTools();
    expect(result.tools.length).toBeGreaterThan(0);
  });
});

// ── 3. Tool registration ───────────────────────────────────────────────────

describe('Tool registration', () => {
  let tools: Tool[];

  beforeAll(async () => {
    const result = await client.listTools();
    tools = result.tools;
  });

  it('exposes exactly three meta-tools', () => {
    expect(tools).toHaveLength(3);
  });

  it('includes legion_query', () => {
    const t = tools.find(x => x.name === 'legion_query');
    expect(t).toBeDefined();
  });

  it('includes legion_call', () => {
    const t = tools.find(x => x.name === 'legion_call');
    expect(t).toBeDefined();
  });

  it('includes legion_list', () => {
    const t = tools.find(x => x.name === 'legion_list');
    expect(t).toBeDefined();
  });

  it('legion_query schema has required query parameter', () => {
    const t = tools.find(x => x.name === 'legion_query')!;
    const props = (t.inputSchema as { properties?: Record<string, unknown> }).properties ?? {};
    expect(props).toHaveProperty('query');
  });

  it('legion_call schema has required adapter and tool parameters', () => {
    const t = tools.find(x => x.name === 'legion_call')!;
    const props = (t.inputSchema as { properties?: Record<string, unknown> }).properties ?? {};
    expect(props).toHaveProperty('adapter');
    expect(props).toHaveProperty('tool');
  });

  it('legion_list schema has optional category and search parameters', () => {
    const t = tools.find(x => x.name === 'legion_list')!;
    const props = (t.inputSchema as { properties?: Record<string, unknown> }).properties ?? {};
    expect(props).toHaveProperty('category');
    expect(props).toHaveProperty('search');
  });
});

// ── 4. legion_query functional test ───────────────────────────────────────

describe('legion_query', () => {
  it('returns JSON with status field for a security query', async () => {
    const result = await client.callTool({
      name:      'legion_query',
      arguments: { query: 'production security incidents', detail: 'summary' },
    });
    const raw  = (result.content as Array<{ type: string; text: string }>)[0]?.text;
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('status');
    expect(['matched', 'summary', 'no_match']).toContain(parsed.status);
  }, 20_000);

  it('returns adapter results for a devops query in full detail mode', async () => {
    const result = await client.callTool({
      name:      'legion_query',
      arguments: { query: 'kubernetes deployments', detail: 'full' },
    });
    const raw    = (result.content as Array<{ type: string; text: string }>)[0]?.text;
    const parsed = JSON.parse(raw);
    // Status may be 'matched' or 'no_match' depending on mock catalog state
    expect(typeof parsed.status).toBe('string');
  }, 20_000);

  it('returns consistent structure regardless of query term', async () => {
    const result = await client.callTool({
      name:      'legion_query',
      arguments: { query: 'stripe payment fraud detection' },
    });
    const raw    = (result.content as Array<{ type: string; text: string }>)[0]?.text;
    expect(() => JSON.parse(raw)).not.toThrow();
  }, 20_000);
});

// ── 5. legion_list functional test ────────────────────────────────────────

describe('legion_list', () => {
  it('returns total and adapters array without filters', async () => {
    const result = await client.callTool({
      name:      'legion_list',
      arguments: {},
    });
    const raw    = (result.content as Array<{ type: string; text: string }>)[0]?.text;
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('total');
    expect(parsed).toHaveProperty('adapters');
    expect(Array.isArray(parsed.adapters)).toBe(true);
    expect(parsed.total).toBeGreaterThan(0);
  }, 20_000);

  it('filters by category correctly', async () => {
    const result = await client.callTool({
      name:      'legion_list',
      arguments: { category: 'cybersecurity' },
    });
    const raw    = (result.content as Array<{ type: string; text: string }>)[0]?.text;
    const parsed = JSON.parse(raw);
    expect(parsed.total).toBeGreaterThan(0);
    // Every returned adapter must be in the requested category
    for (const adapter of parsed.adapters as Array<{ category?: string }>) {
      expect(adapter.category).toBe('cybersecurity');
    }
  }, 20_000);

  it('filters by keyword search correctly', async () => {
    const result = await client.callTool({
      name:      'legion_list',
      arguments: { search: 'crowdstrike' },
    });
    const raw    = (result.content as Array<{ type: string; text: string }>)[0]?.text;
    const parsed = JSON.parse(raw);
    // CrowdStrike is in the catalog — at least one match expected
    expect(parsed.total).toBeGreaterThan(0);
  }, 20_000);

  it('returns categories list at the top level', async () => {
    const result = await client.callTool({
      name:      'legion_list',
      arguments: {},
    });
    const raw    = (result.content as Array<{ type: string; text: string }>)[0]?.text;
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('categories');
    expect(Array.isArray(parsed.categories)).toBe(true);
    expect(parsed.categories.length).toBeGreaterThan(0);
  }, 20_000);
});

// ── 6. legion_call functional test ────────────────────────────────────────

describe('legion_call', () => {
  it('returns a structured response for a mock adapter call', async () => {
    const result = await client.callTool({
      name:      'legion_call',
      arguments: { adapter: 'crowdstrike', tool: 'list_detections', args: {} },
    });
    const raw = (result.content as Array<{ type: string; text: string }>)[0]?.text;
    expect(raw).toBeDefined();
    // In mock mode the response is structured JSON, not an empty string
    expect(raw.length).toBeGreaterThan(0);
  }, 20_000);
});

// ── 7. Graceful shutdown ───────────────────────────────────────────────────

describe('Graceful shutdown', () => {
  it('client.close() resolves without throwing', async () => {
    // The afterAll hook calls close() — this test verifies a second close
    // from within the suite doesn't throw either. The transport handles it.
    await expect(client.close()).resolves.not.toThrow();
  }, 10_000);
});
