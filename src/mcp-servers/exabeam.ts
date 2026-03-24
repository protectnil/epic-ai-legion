/**
 * Exabeam MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/hagoodarzi/Exabeam-MCP — community-authored, not official Exabeam. Not actively maintained. Build this adapter as the canonical implementation using the verified Exabeam developer API.

import { ToolDefinition, ToolResult } from './types.js';

// Auth: OAuth 2.0 Client Credentials. POST /auth/v1/token with client_id + client_secret + grant_type=client_credentials.
// Base URL is region-specific — the user MUST supply their regional base URL.
// US West example: https://api.us-west.exabeam.cloud
// Other regions: https://api.eu-west.exabeam.cloud, https://api.ap-southeast.exabeam.cloud, etc.

interface ExabeamConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

export class ExabeamMCPServer {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken: string = '';
  private tokenExpiry: number = 0;

  constructor(config: ExabeamConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch(`${this.baseUrl}/auth/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`Exabeam auth failed (HTTP ${response.status}): ${await response.text()}`);
    }

    const data = await response.json() as { access_token: string; expires_in?: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + ((data.expires_in || 3600) - 60) * 1000;
    return this.accessToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_events',
        description: 'Search security events in the Exabeam data lake using a query string',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string (Exabeam search syntax)',
            },
            start_time: {
              type: 'string',
              description: 'Start of search window in ISO 8601 format (e.g. 2024-01-01T00:00:00.000Z)',
            },
            end_time: {
              type: 'string',
              description: 'End of search window in ISO 8601 format',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_user_sessions',
        description: 'Retrieve behavioral analytics sessions for a specific user within a time range',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'The username to retrieve sessions for',
            },
            start_time: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format',
            },
            end_time: {
              type: 'string',
              description: 'End of time range in ISO 8601 format',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of sessions to return (default: 20)',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'get_user_risk_score',
        description: 'Retrieve the current risk score and risk history for a user',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'The username to retrieve risk information for',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'list_notable_users',
        description: 'List users with elevated risk scores (notable users) in Exabeam',
        inputSchema: {
          type: 'object',
          properties: {
            unit: {
              type: 'string',
              description: 'Time unit for lookback: d (days), w (weeks) — default: d',
            },
            num: {
              type: 'number',
              description: 'Number of time units to look back (default: 7)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of notable users to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_asset_info',
        description: 'Retrieve asset details and risk information for a hostname or IP address',
        inputSchema: {
          type: 'object',
          properties: {
            hostname: {
              type: 'string',
              description: 'The hostname to look up (mutually exclusive with ip_address)',
            },
            ip_address: {
              type: 'string',
              description: 'The IP address to look up (mutually exclusive with hostname)',
            },
          },
        },
      },
      {
        name: 'list_watchlisted_users',
        description: 'List users currently on an Exabeam watchlist',
        inputSchema: {
          type: 'object',
          properties: {
            watchlist_name: {
              type: 'string',
              description: 'Name of the watchlist to retrieve (optional — returns all if omitted)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_rules',
        description: 'List Exabeam behavioral analytics rules',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Optional filter string to narrow results by rule name',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of rules to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const token = await this.getAccessToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'search_events': {
          const query = args.query as string;
          if (!query) {
            return { content: [{ type: 'text', text: 'query is required' }], isError: true };
          }

          const body: Record<string, unknown> = { query };
          if (args.start_time) body.startTime = args.start_time;
          if (args.end_time) body.endTime = args.end_time;
          if (args.limit) body.limit = args.limit;
          if (args.offset !== undefined) body.offset = args.offset;

          const response = await fetch(`${this.baseUrl}/search/v2/events`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Event search failed (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Exabeam returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_user_sessions': {
          const username = args.username as string;
          if (!username) {
            return { content: [{ type: 'text', text: 'username is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.start_time) params.set('startTime', args.start_time as string);
          if (args.end_time) params.set('endTime', args.end_time as string);
          if (args.limit) params.set('limit', String(args.limit));

          const response = await fetch(
            `${this.baseUrl}/uba/api/user/${encodeURIComponent(username)}/sequences?${params.toString()}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to get user sessions (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Exabeam returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_user_risk_score': {
          const username = args.username as string;
          if (!username) {
            return { content: [{ type: 'text', text: 'username is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/uba/api/user/${encodeURIComponent(username)}/riskScoreHistory`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to get user risk score (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Exabeam returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_notable_users': {
          const params = new URLSearchParams();
          if (args.unit) params.set('unit', args.unit as string);
          if (args.num) params.set('num', String(args.num));
          if (args.limit) params.set('numberOfResults', String(args.limit));
          if (args.offset !== undefined) params.set('offset', String(args.offset));

          const response = await fetch(`${this.baseUrl}/uba/api/users/notable?${params.toString()}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to list notable users (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Exabeam returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_asset_info': {
          const hostname = args.hostname as string;
          const ipAddress = args.ip_address as string;

          if (!hostname && !ipAddress) {
            return { content: [{ type: 'text', text: 'hostname or ip_address is required' }], isError: true };
          }

          const identifier = hostname || ipAddress;
          const response = await fetch(
            `${this.baseUrl}/uba/api/asset/${encodeURIComponent(identifier)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to get asset info (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Exabeam returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_watchlisted_users': {
          const params = new URLSearchParams();
          if (args.watchlist_name) params.set('watchlistName', args.watchlist_name as string);
          if (args.limit) params.set('limit', String(args.limit));
          if (args.offset !== undefined) params.set('offset', String(args.offset));

          const response = await fetch(`${this.baseUrl}/uba/api/watchlist/users?${params.toString()}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to list watchlisted users (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Exabeam returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_rules': {
          const params = new URLSearchParams();
          if (args.filter) params.set('filter', args.filter as string);
          if (args.limit) params.set('limit', String(args.limit));
          if (args.offset !== undefined) params.set('offset', String(args.offset));

          const response = await fetch(`${this.baseUrl}/uba/api/rules?${params.toString()}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to get rules (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Exabeam returned non-JSON response (HTTP ${response.status})`); }
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
