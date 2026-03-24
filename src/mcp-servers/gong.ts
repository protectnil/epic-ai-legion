/**
 * Gong MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — multiple community repos exist (cedricziel/gong-mcp, JustinBeckwith/gongio-mcp) but none are officially maintained by Gong.

import { ToolDefinition, ToolResult } from './types.js';

interface GongConfig {
  accessKey: string;
  accessKeySecret: string;
  /**
   * Base URL for the Gong API. For OAuth-authenticated orgs, Gong returns
   * a per-customer api_base_url_for_customer — supply that value here.
   * Defaults to the global v2 base: https://api.gong.io/v2
   */
  baseUrl?: string;
}

export class GongMCPServer {
  private readonly basicToken: string;
  private readonly baseUrl: string;

  constructor(config: GongConfig) {
    this.basicToken = Buffer.from(`${config.accessKey}:${config.accessKeySecret}`).toString('base64');
    this.baseUrl = config.baseUrl || 'https://api.gong.io/v2';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_calls',
        description: 'Retrieve calls from the Gong account within an optional date range. Returns call metadata including title, duration, participants, and scheduled/started times.',
        inputSchema: {
          type: 'object',
          properties: {
            fromDateTime: {
              type: 'string',
              description: 'ISO-8601 start of date range (e.g. 2024-01-01T00:00:00Z). If omitted, defaults to the last 90 days per Gong policy.',
            },
            toDateTime: {
              type: 'string',
              description: 'ISO-8601 end of date range (e.g. 2024-12-31T23:59:59Z).',
            },
            workspaceId: {
              type: 'string',
              description: 'Optional Gong workspace ID to scope results.',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor returned in a previous response.',
            },
          },
        },
      },
      {
        name: 'get_call_transcript',
        description: 'Retrieve the full transcript for one or more Gong calls by call ID.',
        inputSchema: {
          type: 'object',
          properties: {
            callIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of Gong call IDs to retrieve transcripts for.',
            },
            fromDateTime: {
              type: 'string',
              description: 'ISO-8601 start of date range — required if callIds is omitted.',
            },
            toDateTime: {
              type: 'string',
              description: 'ISO-8601 end of date range — required if callIds is omitted.',
            },
          },
          required: ['callIds'],
        },
      },
      {
        name: 'list_users',
        description: 'List all users in the Gong workspace with their profile details and active/inactive status.',
        inputSchema: {
          type: 'object',
          properties: {
            includeAvatars: {
              type: 'boolean',
              description: 'Whether to include avatar URLs in the response (default: false).',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor returned in a previous response.',
            },
          },
        },
      },
      {
        name: 'get_call_stats',
        description: 'Retrieve AI-generated content and analytics for calls, including topics, action items, talk ratio, and key moments.',
        inputSchema: {
          type: 'object',
          properties: {
            callIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of Gong call IDs to retrieve AI content for.',
            },
          },
          required: ['callIds'],
        },
      },
      {
        name: 'search_calls',
        description: 'Search calls using date ranges and participant criteria, returning extended metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            fromDateTime: {
              type: 'string',
              description: 'ISO-8601 start of date range.',
            },
            toDateTime: {
              type: 'string',
              description: 'ISO-8601 end of date range.',
            },
            primaryUserIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter calls by primary (host) user IDs.',
            },
            participantUserIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter calls that include these participant user IDs.',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor returned in a previous response.',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Basic ${this.basicToken}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_calls': {
          let url = `${this.baseUrl}/calls`;
          const params: string[] = [];
          if (args.fromDateTime) params.push(`fromDateTime=${encodeURIComponent(args.fromDateTime as string)}`);
          if (args.toDateTime) params.push(`toDateTime=${encodeURIComponent(args.toDateTime as string)}`);
          if (args.workspaceId) params.push(`workspaceId=${encodeURIComponent(args.workspaceId as string)}`);
          if (args.cursor) params.push(`cursor=${encodeURIComponent(args.cursor as string)}`);
          if (params.length) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list calls: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gong returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_call_transcript': {
          const callIds = args.callIds as string[];

          if (!callIds || callIds.length === 0) {
            return {
              content: [{ type: 'text', text: 'callIds is required and must be a non-empty array' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { filter: { callIds } };
          const filter = body.filter as Record<string, unknown>;
          if (args.fromDateTime) filter.fromDateTime = args.fromDateTime;
          if (args.toDateTime) filter.toDateTime = args.toDateTime;

          const response = await fetch(`${this.baseUrl}/calls/transcript`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get transcript: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gong returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_users': {
          let url = `${this.baseUrl}/users`;
          const params: string[] = [];
          if (typeof args.includeAvatars === 'boolean') params.push(`includeAvatars=${args.includeAvatars}`);
          if (args.cursor) params.push(`cursor=${encodeURIComponent(args.cursor as string)}`);
          if (params.length) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list users: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gong returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_call_stats': {
          const callIds = args.callIds as string[];

          if (!callIds || callIds.length === 0) {
            return {
              content: [{ type: 'text', text: 'callIds is required and must be a non-empty array' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/calls/ai-content`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ filter: { callIds } }),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get call AI content: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gong returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_calls': {
          const body: Record<string, unknown> = { filter: {} };
          const filter = body.filter as Record<string, unknown>;
          if (args.fromDateTime) filter.fromDateTime = args.fromDateTime;
          if (args.toDateTime) filter.toDateTime = args.toDateTime;
          if (args.primaryUserIds) filter.primaryUserIds = args.primaryUserIds;
          if (args.participantUserIds) filter.participantUserIds = args.participantUserIds;

          let url = `${this.baseUrl}/calls/extensive`;
          if (args.cursor) url += `?cursor=${encodeURIComponent(args.cursor as string)}`;

          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search calls: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gong returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
}
