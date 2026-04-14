/**
 * @epicai/legion — Register Legion Tools
 * Registers the three MCP tools on a McpServer instance.
 * Pure function — no I/O, no transport binding.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { LegionState } from './LegionState.js';
import { handleQuery, handleCall, handleList } from './toolHandlers.js';

export function registerLegionTools(
  server: McpServer,
  state: LegionState,
  getTenantId: () => string,
): void {
  // legion_query — natural language search over configured or full-catalog adapters
  server.tool(
    'legion_query',
    {
      query: z.string().describe(
        'Natural language query. Searches your configured adapters by default. Use discover:true to search the full catalog of 4,135 adapters.',
      ),
      detail: z.enum(['full', 'summary']).optional().describe(
        'full (default): top 20 with tool lists. summary: one-line adapter summaries — use this when the first call missed.',
      ),
      discover: z.boolean().optional().describe(
        'Set to true to search ALL available adapters, not just your configured ones.',
      ),
    },
    async (args) => {
      // getTenantId is process-configured (never from tool args — security invariant)
      void getTenantId();
      const result = await handleQuery(args, state);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    },
  );

  // legion_call — execute a tool on a specific adapter
  server.tool(
    'legion_call',
    {
      adapter: z.string().describe('Adapter ID (e.g., "github", "crowdstrike", "salesforce")'),
      tool: z.string().describe('Tool name to call on the adapter'),
      args: z.record(z.unknown()).optional().describe('Arguments to pass to the tool'),
    },
    async (toolArgs) => {
      void getTenantId();
      const result = await handleCall(toolArgs, state);
      return {
        content: [{ type: 'text' as const, text: result.content }],
        isError: result.isError,
      };
    },
  );

  // legion_list — browse available adapters by category or keyword
  server.tool(
    'legion_list',
    {
      category: z.string().optional().describe(
        'Filter by category name (e.g., "cybersecurity", "healthcare", "devops", "finance").',
      ),
      search: z.string().optional().describe('Search by keyword across adapter names and descriptions'),
    },
    async (args) => {
      void getTenantId();
      const result = await handleList(args, state);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    },
  );
}
