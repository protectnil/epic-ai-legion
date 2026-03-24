/**
 * JumpCloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — hoium/jumpcloud_mcp is a community project, not vendor-maintained.

import { ToolDefinition, ToolResult } from './types.js';

// JumpCloud exposes two versioned REST APIs:
//   v1: https://console.jumpcloud.com/api  — systemusers, systems, search
//   v2: https://console.jumpcloud.com/api/v2 — groups, associations, graph traversal
// Auth: x-api-key header (administrator API key from the JumpCloud Admin Portal).
// Ref: https://docs.jumpcloud.com/api/2.0/index.html

interface JumpCloudConfig {
  apiKey: string;
  baseUrlV1?: string;
  baseUrlV2?: string;
}

export class JumpCloudMCPServer {
  private readonly apiKey: string;
  private readonly baseUrlV1: string;
  private readonly baseUrlV2: string;

  constructor(config: JumpCloudConfig) {
    this.apiKey = config.apiKey;
    this.baseUrlV1 = config.baseUrlV1 || 'https://console.jumpcloud.com/api';
    this.baseUrlV2 = config.baseUrlV2 || 'https://console.jumpcloud.com/api/v2';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List JumpCloud system users (v1 /systemusers). Supports pagination via limit and skip.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            search: {
              type: 'string',
              description: 'Free-text search term to filter users by username, email, or display name',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return (e.g. "username,email,id")',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get a single JumpCloud system user by ID (v1 /systemusers/{id})',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'JumpCloud user ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_systems',
        description: 'List JumpCloud managed systems/devices (v1 /systems). Supports pagination via limit and skip.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return (e.g. "hostname,os,active")',
            },
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. "active:eq:true")',
            },
          },
        },
      },
      {
        name: 'get_system',
        description: 'Get a single JumpCloud system/device by ID (v1 /systems/{id})',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'JumpCloud system ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_user_groups',
        description: 'List all user groups in the JumpCloud directory (v2 /usergroups)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of groups to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. "name:eq:Engineering")',
            },
          },
        },
      },
      {
        name: 'list_system_groups',
        description: 'List all system/device groups in the JumpCloud directory (v2 /systemgroups)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of groups to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. "name:eq:Servers")',
            },
          },
        },
      },
      {
        name: 'get_user_group_members',
        description: 'Get the members of a JumpCloud user group (v2 /usergroups/{group_id}/members)',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'JumpCloud user group ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of members to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_system_group_members',
        description: 'Get the members of a JumpCloud system group (v2 /systemgroups/{group_id}/members)',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'JumpCloud system group ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of members to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'search_users',
        description: 'Search JumpCloud users by field values using POST /search/systemusers (v1)',
        inputSchema: {
          type: 'object',
          properties: {
            searchTerm: {
              type: 'object',
              description: 'Object with searchField and searchValue properties (e.g. {"searchField":"email","searchValue":"alice@example.com"})',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return',
            },
          },
          required: ['searchTerm'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_users': {
          const limit = (args.limit as number) || 100;
          const skip = (args.skip as number) || 0;
          let url = `${this.baseUrlV1}/systemusers?limit=${limit}&skip=${skip}`;
          if (args.search) url += `&search=${encodeURIComponent(args.search as string)}`;
          if (args.fields) url += `&fields=${encodeURIComponent(args.fields as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list users: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JumpCloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_user': {
          const id = args.id as string;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrlV1}/systemusers/${encodeURIComponent(id)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get user: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JumpCloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_systems': {
          const limit = (args.limit as number) || 100;
          const skip = (args.skip as number) || 0;
          let url = `${this.baseUrlV1}/systems?limit=${limit}&skip=${skip}`;
          if (args.fields) url += `&fields=${encodeURIComponent(args.fields as string)}`;
          if (args.filter) url += `&filter=${encodeURIComponent(args.filter as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list systems: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JumpCloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_system': {
          const id = args.id as string;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrlV1}/systems/${encodeURIComponent(id)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get system: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JumpCloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_user_groups': {
          const limit = (args.limit as number) || 100;
          const skip = (args.skip as number) || 0;
          let url = `${this.baseUrlV2}/usergroups?limit=${limit}&skip=${skip}`;
          if (args.filter) url += `&filter=${encodeURIComponent(args.filter as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list user groups: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JumpCloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_system_groups': {
          const limit = (args.limit as number) || 100;
          const skip = (args.skip as number) || 0;
          let url = `${this.baseUrlV2}/systemgroups?limit=${limit}&skip=${skip}`;
          if (args.filter) url += `&filter=${encodeURIComponent(args.filter as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list system groups: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JumpCloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_user_group_members': {
          const groupId = args.group_id as string;
          if (!groupId) {
            return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
          }
          const limit = (args.limit as number) || 100;
          const skip = (args.skip as number) || 0;
          const url = `${this.baseUrlV2}/usergroups/${encodeURIComponent(groupId)}/members?limit=${limit}&skip=${skip}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get user group members: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JumpCloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_system_group_members': {
          const groupId = args.group_id as string;
          if (!groupId) {
            return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
          }
          const limit = (args.limit as number) || 100;
          const skip = (args.skip as number) || 0;
          const url = `${this.baseUrlV2}/systemgroups/${encodeURIComponent(groupId)}/members?limit=${limit}&skip=${skip}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get system group members: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JumpCloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_users': {
          const searchTerm = args.searchTerm as Record<string, unknown>;
          if (!searchTerm) {
            return { content: [{ type: 'text', text: 'searchTerm is required' }], isError: true };
          }
          const limit = (args.limit as number) || 100;
          const skip = (args.skip as number) || 0;
          let url = `${this.baseUrlV1}/search/systemusers?limit=${limit}&skip=${skip}`;
          if (args.fields) url += `&fields=${encodeURIComponent(args.fields as string)}`;

          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ searchTerm }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to search users: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JumpCloud returned non-JSON response (HTTP ${response.status})`); }
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
