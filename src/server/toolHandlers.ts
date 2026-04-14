/**
 * @epicai/legion — Tool Handler Logic
 * Core handler implementations for legion_query, legion_call, legion_list.
 * Used by both registerLegionTools (MCP path) and bindRest (REST path).
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LegionState } from './LegionState.js';

// =============================================================================
// Package root
// =============================================================================

function getPackageRoot(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return join(thisFile, '..', '..', '..');
}

// =============================================================================
// legion_query
// =============================================================================

export interface QueryArgs {
  query: string;
  detail?: 'full' | 'summary';
  discover?: boolean;
}

export async function handleQuery(args: QueryArgs, state: LegionState): Promise<unknown> {
  const query = args.query;
  const detail = args.detail ?? 'full';
  const discover = args.discover ?? false;
  const activeFilter = discover ? state.fullCatalogFilter : state.toolPreFilter;
  const getTenantId = (): string => process.env.LEGION_TENANT_ID ?? 'local';
  const configuredAdapters = state.getConfiguredAdapters(getTenantId());

  // Ring 2: summary mode
  if (detail === 'summary') {
    const selected200 = await activeFilter.select(query, { maxTools: 220, maxPerServer: 10 });
    const servers200 = [...new Set(selected200.map(t => t.server))];
    const ring2Servers = servers200.slice(20);
    const summaries = ring2Servers.map(serverId => {
      const a = state.adapterById.get(serverId);
      if (!a) return null;
      return {
        id: a.id,
        name: a.name,
        category: a.category ?? 'other',
        description: (a.description ?? '').slice(0, 80),
        configured: state.configuredAdapterIds.has(a.id),
      };
    }).filter(Boolean);

    return {
      status: 'summary',
      query,
      mode: discover ? 'discover' : 'configured',
      totalShown: summaries.length,
      adapters: summaries,
      message: discover
        ? `Showing ${summaries.length} adapters from the full catalog. Use legion_call to add and connect one.`
        : `Showing ${summaries.length} additional configured adapters ranked by relevance.`,
    };
  }

  // Ring 1: full mode — BM25 + query expansion, top 20 detailed
  const selected = await activeFilter.select(query, { maxTools: 20, maxPerServer: 5 });
  const selectedServers = [...new Set(selected.map(t => t.server))];

  // Build category hints
  const catCounts = new Map<string, number>();
  for (const a of state.allAdapters) {
    const cat = a.category ?? 'other';
    catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
  }
  const topCategories = [...catCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([cat, count]) => ({ category: cat, adapterCount: count }));

  if (selectedServers.length === 0) {
    const hint = discover
      ? 'No adapters matched in the full catalog. Try a different query or use legion_list to browse.'
      : `None of your ${configuredAdapters.length} configured adapters matched. Try legion_query with discover:true to search all ${state.allAdapters.length} available adapters.`;
    return {
      status: 'no_match',
      message: `No adapters matched query: "${query}"`,
      hint,
      configuredCount: configuredAdapters.length,
      totalAvailable: state.allAdapters.length,
      categories: topCategories,
    };
  }

  const matches = selectedServers.map(serverId => {
    const adapter = state.adapterById.get(serverId);
    if (!adapter) return null;
    return {
      id: adapter.id,
      name: adapter.name,
      type: adapter.type,
      category: adapter.category,
      tools: adapter.rest?.toolNames ?? adapter.mcp?.toolNames ?? [],
      toolCount: adapter.rest?.toolCount ?? 0,
      configured: state.configuredAdapterIds.has(adapter.id),
      transport: adapter.mcp?.transport ?? (adapter.rest ? 'rest' : 'unknown'),
    };
  }).filter(Boolean);

  return {
    status: 'matched',
    query,
    mode: discover ? 'discover' : 'configured',
    matchedAdapters: matches,
    totalMatched: matches.length,
    configuredCount: configuredAdapters.length,
    categories: topCategories,
    message: discover
      ? `Found ${matches.length} adapters in the full catalog. Adapters marked configured:true are ready to use.`
      : matches.length < 3
        ? `Only ${matches.length} of your ${configuredAdapters.length} configured adapters matched. Try legion_query with discover:true to search all ${state.allAdapters.length} available adapters.`
        : `Found ${matches.length} matching adapters from your ${configuredAdapters.length} configured adapters.`,
  };
}

// =============================================================================
// legion_call
// =============================================================================

export interface CallArgs {
  adapter: string;
  tool: string;
  args?: Record<string, unknown>;
}

export interface CallResult {
  content: string;
  isError: boolean;
}

export async function handleCall(callArgs: CallArgs, state: LegionState): Promise<CallResult> {
  const adapterId = callArgs.adapter;
  const toolName = callArgs.tool;
  const toolCallArgs = callArgs.args ?? {};

  const adapter = state.adapterById.get(adapterId);
  if (!adapter) {
    return {
      content: JSON.stringify({ error: `Adapter "${adapterId}" not found` }),
      isError: true,
    };
  }

  // REST adapter execution
  if (adapter.rest?.module && adapter.rest?.className) {
    try {
      const packageRoot = getPackageRoot();
      const modulePath = join(packageRoot, adapter.rest.module);
      const mod = await import(modulePath) as Record<string, unknown>;
      const AdapterClass = (mod[adapter.rest.className] ?? mod['default']) as new (cfg: Record<string, string>) => { callTool(name: string, args: Record<string, unknown>): Promise<{ content: unknown; isError?: boolean }> };

      const adapterConfig: Record<string, string> = {};
      if (adapter.rest.envKey && state.credentials[adapter.rest.envKey]) {
        adapterConfig['apiKey'] = state.credentials[adapter.rest.envKey];
      }
      if (adapter.rest.baseUrl) {
        adapterConfig['baseUrl'] = adapter.rest.baseUrl;
      }

      const instance = new AdapterClass(adapterConfig);
      const result = await instance.callTool(toolName, toolCallArgs);
      return {
        content: typeof result.content === 'string' ? result.content : JSON.stringify(result.content),
        isError: result.isError ?? false,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: JSON.stringify({ error: msg, adapter: adapterId, tool: toolName }), isError: true };
    }
  }

  // MCP stdio adapter
  if (adapter.mcp?.transport === 'stdio' && adapter.mcp?.command) {
    try {
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
      const transport = new StdioClientTransport({
        command: adapter.mcp.command,
        args: adapter.mcp.args ?? [],
      });
      const client = new Client({ name: 'legion', version: '2.0' }, { capabilities: {} });
      await client.connect(transport);
      try {
        const result = await client.callTool({ name: toolName, arguments: toolCallArgs as Record<string, string> });
        const text = (result.content as Array<{ type: string; text?: string }>)
          .filter(c => c.type === 'text')
          .map(c => c.text ?? '')
          .join('\n');
        return { content: text, isError: (result.isError as boolean | undefined) ?? false };
      } finally {
        await client.close();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: JSON.stringify({ error: msg, adapter: adapterId, tool: toolName }), isError: true };
    }
  }

  // MCP streamable-HTTP adapter
  if (adapter.mcp?.transport === 'streamable-http' && adapter.mcp?.url) {
    try {
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
      const transport = new StreamableHTTPClientTransport(new URL(adapter.mcp.url));
      const client = new Client({ name: 'legion', version: '2.0' }, { capabilities: {} });
      await client.connect(transport);
      try {
        const result = await client.callTool({ name: toolName, arguments: toolCallArgs as Record<string, string> });
        const text = (result.content as Array<{ type: string; text?: string }>)
          .filter(c => c.type === 'text')
          .map(c => c.text ?? '')
          .join('\n');
        return { content: text, isError: (result.isError as boolean | undefined) ?? false };
      } finally {
        await client.close();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: JSON.stringify({ error: msg, adapter: adapterId, tool: toolName }), isError: true };
    }
  }

  return {
    content: JSON.stringify({ error: `No executable transport for adapter "${adapterId}"` }),
    isError: true,
  };
}

// =============================================================================
// legion_list
// =============================================================================

export interface ListArgs {
  category?: string;
  search?: string;
}

export async function handleList(args: ListArgs, state: LegionState): Promise<unknown> {
  let results = state.allAdapters;

  if (args.category) {
    results = results.filter(a => a.category === args.category);
  }
  if (args.search) {
    const term = args.search.toLowerCase();
    results = results.filter(a =>
      a.id.includes(term) ||
      a.name.toLowerCase().includes(term) ||
      (a.description ?? '').toLowerCase().includes(term),
    );
  }

  const categories = [...new Set(state.allAdapters.map(a => a.category).filter(Boolean))];

  return {
    total: results.length,
    categories,
    adapters: results.slice(0, 50).map(a => ({
      id: a.id,
      name: a.name,
      category: a.category,
      type: a.type,
      toolCount: a.rest?.toolCount ?? 0,
    })),
    truncated: results.length > 50,
  };
}
