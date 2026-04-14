/**
 * @epicai/legion — REST Transport Smoke Test
 * Verifies that bindRest starts, responds to /v1/tools/list, /v1/health,
 * /v1/catalog/stats, and shuts down cleanly.
 */

import { describe, it, expect } from 'vitest';
import { ToolPreFilter } from '../src/federation/ToolPreFilter.js';
import { bindRest } from '../src/server/transports/rest.js';
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

describe('REST Transport', { timeout: 15_000 }, () => {
  it('binds, responds to tool endpoints, and closes cleanly', async () => {
    const state = makeMinimalState();
    const getTenantId = () => 'test';

    // Port 0 → OS picks a random available port
    const handle = await bindRest(state, 0, getTenantId);
    const base = `http://127.0.0.1:${handle.port}`;

    expect(handle.port).toBeGreaterThan(0);

    try {
      // /v1/health
      const healthRes = await fetch(`${base}/v1/health`);
      expect(healthRes.status).toBe(200);
      const health = await healthRes.json() as { status: string; transport: string };
      expect(health.status).toBe('ok');
      expect(health.transport).toBe('rest');

      // /v1/catalog/stats
      const statsRes = await fetch(`${base}/v1/catalog/stats`);
      expect(statsRes.status).toBe(200);
      const stats = await statsRes.json() as { totalAdapters: number; configuredAdapters: number };
      expect(typeof stats.totalAdapters).toBe('number');
      expect(typeof stats.configuredAdapters).toBe('number');

      // POST /v1/tools/list
      const listRes = await fetch(`${base}/v1/tools/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(listRes.status).toBe(200);
      const list = await listRes.json() as { total: number };
      expect(typeof list.total).toBe('number');

      // POST /v1/tools/query
      const queryRes = await fetch(`${base}/v1/tools/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' }),
      });
      expect(queryRes.status).toBe(200);

      // POST /v1/tools/query — missing query field → 400
      const badRes = await fetch(`${base}/v1/tools/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(badRes.status).toBe(400);
    } finally {
      await handle.close();
    }
  });
});
