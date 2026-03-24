/**
 * Cisco Duo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no Cisco Duo MCP server exists on GitHub as of March 2026.

import { ToolDefinition, ToolResult } from './types.js';
import { createHmac } from 'node:crypto';

// Auth: Duo Admin API uses HMAC-SHA1 with HTTP Basic Auth.
// Canonical request = DATE\nMETHOD\nHOST\nPATH\nSORTED_PARAMS
// HMAC-SHA1(canonical, secretKey) → hex string used as Basic Auth password.
// Integration key is the Basic Auth username.
// The Date header must match the date used in the canonical request exactly.
// Base URL: https://{apiHost}  where apiHost is your Duo API hostname (e.g. api-xxxxxxxx.duosecurity.com)
// NOTE: Legacy v1 endpoints reach end-of-life March 31, 2026. This adapter targets v2 log endpoints.

interface CiscoDuoConfig {
  apiHost: string;       // e.g. api-xxxxxxxx.duosecurity.com  (no https://, no trailing slash)
  integrationKey: string; // ikey
  secretKey: string;      // skey
}

export class CiscoDuoMCPServer {
  private readonly apiHost: string;
  private readonly integrationKey: string;
  private readonly secretKey: string;

  constructor(config: CiscoDuoConfig) {
    this.apiHost = config.apiHost.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    this.integrationKey = config.integrationKey;
    this.secretKey = config.secretKey;
  }

  private sign(method: string, path: string, params: Record<string, string>, date: string): string {
    // Sort parameters lexicographically by key and encode them
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&');

    const canon = [date, method.toUpperCase(), this.apiHost, path, sortedParams].join('\n');
    const sig = createHmac('sha1', this.secretKey).update(canon).digest('hex');

    // Basic Auth: integrationKey:hmac_hex
    return 'Basic ' + Buffer.from(`${this.integrationKey}:${sig}`).toString('base64');
  }

  private async duoRequest(
    method: string,
    path: string,
    params: Record<string, string> = {}
  ): Promise<Response> {
    const date = new Date().toUTCString();
    const auth = this.sign(method, path, params, date);

    const headers: Record<string, string> = {
      Authorization: auth,
      Date: date,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const baseUrl = `https://${this.apiHost}${path}`;
    let url = baseUrl;
    let body: string | undefined;

    if (method === 'GET' || method === 'DELETE') {
      if (Object.keys(params).length > 0) {
        url += '?' + new URLSearchParams(params).toString();
      }
    } else {
      body = new URLSearchParams(params).toString();
    }

    return fetch(url, { method, headers, body });
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List all Duo users in the account with optional username search.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Filter by exact username',
            },
            limit: {
              type: 'number',
              description: 'Maximum results per page (max 300, default 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default 0)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get details for a specific Duo user by user ID.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Duo user ID (e.g. DUXXXXXXXXXXXXXXXXXX)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new Duo user.',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username for the new Duo user' },
            realname: { type: 'string', description: 'Full display name' },
            email: { type: 'string', description: 'Email address' },
            status: {
              type: 'string',
              description: 'User status: active | bypass | disabled (default: active)',
            },
            notes: { type: 'string', description: 'Notes about the user' },
          },
          required: ['username'],
        },
      },
      {
        name: 'update_user',
        description: 'Update attributes on an existing Duo user.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Duo user ID' },
            username: { type: 'string', description: 'New username' },
            realname: { type: 'string', description: 'New display name' },
            email: { type: 'string', description: 'New email address' },
            status: {
              type: 'string',
              description: 'New status: active | bypass | disabled',
            },
            notes: { type: 'string', description: 'Updated notes' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_groups',
        description: 'List all Duo groups.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum results per page (max 300, default 100)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      {
        name: 'get_authentication_logs',
        description: 'Retrieve Duo authentication log events (v2). Returns events from the last 180 days with up to a 2-minute delay.',
        inputSchema: {
          type: 'object',
          properties: {
            mintime: {
              type: 'number',
              description: 'Unix millisecond timestamp: return events at or after this time',
            },
            maxtime: {
              type: 'number',
              description: 'Unix millisecond timestamp: return events before this time',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of log entries to return (max 1000, default 100)',
            },
            next_offset: {
              type: 'array',
              description: 'Pagination cursor from a previous response (array of two strings)',
              items: { type: 'string' },
            },
          },
        },
      },
      {
        name: 'get_admin_logs',
        description: 'Retrieve Duo administrator activity log events.',
        inputSchema: {
          type: 'object',
          properties: {
            mintime: {
              type: 'number',
              description: 'Unix timestamp (seconds): return events at or after this time',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of log entries to return (default 100)',
            },
          },
        },
      },
      {
        name: 'bypass_user',
        description: 'Generate bypass codes for a Duo user, allowing them to authenticate without a second factor.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Duo user ID' },
            count: {
              type: 'number',
              description: 'Number of bypass codes to generate (max 10, default 1)',
            },
            valid_secs: {
              type: 'number',
              description: 'How long (in seconds) the bypass codes are valid (0 = no expiry)',
            },
          },
          required: ['user_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_users': {
          const params: Record<string, string> = {};
          if (args.username) params.username = args.username as string;
          if (args.limit) params.limit = String(args.limit);
          if (args.offset) params.offset = String(args.offset);

          const response = await this.duoRequest('GET', '/admin/v1/users', params);
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list users: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Duo returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_user': {
          const userId = args.user_id as string;
          if (!userId) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };

          const response = await this.duoRequest('GET', `/admin/v1/users/${encodeURIComponent(userId)}`);
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get user: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Duo returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_user': {
          const username = args.username as string;
          if (!username) return { content: [{ type: 'text', text: 'username is required' }], isError: true };

          const params: Record<string, string> = { username };
          if (args.realname) params.realname = args.realname as string;
          if (args.email) params.email = args.email as string;
          if (args.status) params.status = args.status as string;
          if (args.notes) params.notes = args.notes as string;

          const response = await this.duoRequest('POST', '/admin/v1/users', params);
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create user: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Duo returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_user': {
          const userId = args.user_id as string;
          if (!userId) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };

          const params: Record<string, string> = {};
          if (args.username) params.username = args.username as string;
          if (args.realname) params.realname = args.realname as string;
          if (args.email) params.email = args.email as string;
          if (args.status) params.status = args.status as string;
          if (args.notes) params.notes = args.notes as string;

          const response = await this.duoRequest('POST', `/admin/v1/users/${encodeURIComponent(userId)}`, params);
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update user: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Duo returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_groups': {
          const params: Record<string, string> = {};
          if (args.limit) params.limit = String(args.limit);
          if (args.offset) params.offset = String(args.offset);

          const response = await this.duoRequest('GET', '/admin/v1/groups', params);
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list groups: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Duo returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_authentication_logs': {
          const params: Record<string, string> = {};
          if (typeof args.mintime === 'number') params.mintime = String(args.mintime);
          if (typeof args.maxtime === 'number') params.maxtime = String(args.maxtime);
          if (typeof args.limit === 'number') params.limit = String(args.limit);
          if (Array.isArray(args.next_offset) && args.next_offset.length === 2) {
            params['next_offset[0]'] = String(args.next_offset[0]);
            params['next_offset[1]'] = String(args.next_offset[1]);
          }

          const response = await this.duoRequest('GET', '/admin/v2/logs/authentication', params);
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get authentication logs: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Duo returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_admin_logs': {
          const params: Record<string, string> = {};
          if (typeof args.mintime === 'number') params.mintime = String(args.mintime);
          if (typeof args.limit === 'number') params.limit = String(args.limit);

          const response = await this.duoRequest('GET', '/admin/v1/logs/administrator', params);
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get admin logs: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Duo returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'bypass_user': {
          const userId = args.user_id as string;
          if (!userId) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };

          const params: Record<string, string> = {};
          if (typeof args.count === 'number') params.count = String(args.count);
          if (typeof args.valid_secs === 'number') params.valid_secs = String(args.valid_secs);

          const response = await this.duoRequest('POST', `/admin/v1/users/${encodeURIComponent(userId)}/bypass_codes`, params);
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to generate bypass codes: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Duo returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
}
