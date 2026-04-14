/**
 * @epicai/legion — HTTP Transport Smoke Test
 * Verifies that bindHttp starts, accepts MCP connections, responds to legion_list,
 * and shuts down cleanly.
 */

import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ToolPreFilter } from '../src/federation/ToolPreFilter.js';
import { registerLegionTools } from '../src/server/registerLegionTools.js';
import { bindHttp } from '../src/server/transports/http.js';
import type { LegionState } from '../src/server/LegionState.js';

function makeMinimalState(): LegionState {
  const filter = new ToolPreFilter();
  filter.index([]);
  return {
    allAdapters: [],
    adapterById: new Map(),
    toolPreFilter: filter,
    fullCatalogFilter: filter,
    loadedAt: new Date().toISOString(),
    getConfiguredAdapters: () => [],
    configuredAdapterIds: new Set(),
    credentials: {},
    packageRoot: '/tmp',
  };
}

describe('HTTP Transport', { timeout: 15_000 }, () => {
  it('binds, accepts legion_list, and closes cleanly', async () => {
    const state = makeMinimalState();
    const getTenantId = () => 'test';

    const server = new McpServer({ name: 'legion-test', version: '2.0.0' });
    registerLegionTools(server, state, getTenantId);

    // Port 0 → OS picks a random available port
    const handle = await bindHttp(server, 0);

    expect(handle.port).toBeGreaterThan(0);

    const transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${handle.port}/mcp`),
    );
    const client = new Client({ name: 'test-client', version: '1.0' }, { capabilities: {} });
    await client.connect(transport);

    try {
      const result = await client.callTool({ name: 'legion_list', arguments: {} });
      const content = result.content as Array<{ type: string; text?: string }>;
      expect(content.length).toBeGreaterThan(0);
      expect(content[0].type).toBe('text');
      const parsed = JSON.parse(content[0].text ?? '{}') as { total: number };
      expect(typeof parsed.total).toBe('number');
    } finally {
      await client.close();
      await handle.close();
    }
  });
});
