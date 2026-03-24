/**
 * Looker MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no official Google/Looker MCP server exists. Community servers (e.g. datadaddy89/looker-mcp, kokevidaurre/looker-admin-mcp) are unofficial and unmaintained.

import { ToolDefinition, ToolResult } from './types.js';

interface LookerConfig {
  /**
   * Looker API client ID (from the Looker Admin console API key).
   */
  clientId: string;
  /**
   * Looker API client secret (from the Looker Admin console API key).
   */
  clientSecret: string;
  /**
   * Base URL of the Looker instance including port.
   * Example: https://mycompany.looker.com:19999
   * For Looker (Google Cloud core): https://mycompany.cloud.looker.com
   */
  baseUrl: string;
}

export class LookerMCPServer {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: LookerConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    // Normalize: strip trailing slash
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  /**
   * Authenticate via POST /api/4.0/login using client_id and client_secret
   * as application/x-www-form-urlencoded body params.
   * Returns a Bearer token valid for the session.
   * Looker API 4.0 is GA as of Looker 22.4; API 3.1 was removed in Looker 23.18.
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt - 30000) {
      return this.accessToken;
    }

    const response = await fetch(`${this.baseUrl}/api/4.0/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Looker authentication failed: HTTP ${response.status} ${response.statusText}`);
    }

    let tokenData: { access_token: string; expires_in: number };
    try {
      tokenData = await response.json() as { access_token: string; expires_in: number };
    } catch {
      throw new Error(`Looker returned non-JSON response during login (HTTP ${response.status})`);
    }

    this.accessToken = tokenData.access_token;
    this.tokenExpiresAt = now + tokenData.expires_in * 1000;
    return this.accessToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_looks',
        description: 'List Looks (saved queries) in the Looker instance',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of Looks to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Number of Looks to skip for pagination (default: 0)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in the response',
            },
          },
        },
      },
      {
        name: 'get_look',
        description: 'Get a specific Look by ID',
        inputSchema: {
          type: 'object',
          properties: {
            look_id: {
              type: 'number',
              description: 'The numeric ID of the Look to retrieve',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in the response',
            },
          },
          required: ['look_id'],
        },
      },
      {
        name: 'run_look',
        description: 'Run a Look and return results in the specified format',
        inputSchema: {
          type: 'object',
          properties: {
            look_id: {
              type: 'number',
              description: 'The numeric ID of the Look to run',
            },
            result_format: {
              type: 'string',
              description: 'Output format: "json" (default), "csv", "json_detail", "txt", "html", "md"',
            },
            limit: {
              type: 'number',
              description: 'Row limit (max 5000)',
            },
          },
          required: ['look_id'],
        },
      },
      {
        name: 'run_inline_query',
        description: 'Run an inline query against a Looker Explore and return results',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'The LookML model name',
            },
            view: {
              type: 'string',
              description: 'The Explore (view) name within the model',
            },
            fields: {
              type: 'array',
              description: 'Array of field names to include (e.g. ["orders.id", "orders.count"])',
            },
            filters: {
              type: 'object',
              description: 'Key-value filter object (e.g. {"orders.status": "complete"})',
            },
            limit: {
              type: 'string',
              description: 'Row limit as a string (default: "500")',
            },
            result_format: {
              type: 'string',
              description: 'Output format: "json" (default), "json_detail", "csv"',
            },
          },
          required: ['model', 'view', 'fields'],
        },
      },
      {
        name: 'list_dashboards',
        description: 'List all dashboards in the Looker instance',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of dashboards to return (default: 20)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in the response',
            },
          },
        },
      },
      {
        name: 'get_dashboard',
        description: 'Get a specific dashboard by ID',
        inputSchema: {
          type: 'object',
          properties: {
            dashboard_id: {
              type: 'string',
              description: 'The dashboard ID (numeric or slug)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in the response',
            },
          },
          required: ['dashboard_id'],
        },
      },
      {
        name: 'search_dashboards',
        description: 'Search dashboards by title or other criteria',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Filter by dashboard title (case-insensitive, partial match)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 20)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include',
            },
          },
        },
      },
      {
        name: 'list_explores',
        description: 'List all Explores available in a LookML model',
        inputSchema: {
          type: 'object',
          properties: {
            model_name: {
              type: 'string',
              description: 'The LookML model name to list Explores for',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in the response',
            },
          },
          required: ['model_name'],
        },
      },
      {
        name: 'get_current_user',
        description: 'Get the profile of the currently authenticated Looker user',
        inputSchema: {
          type: 'object',
          properties: {},
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
        case 'list_looks': {
          const limit = (args.limit as number) || 20;
          const offset = (args.offset as number) || 0;
          let url = `${this.baseUrl}/api/4.0/looks?limit=${limit}&offset=${offset}`;
          if (args.fields) url += `&fields=${encodeURIComponent(args.fields as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list looks: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Looker returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_look': {
          const lookId = args.look_id as number;

          if (!lookId) {
            return {
              content: [{ type: 'text', text: 'look_id is required' }],
              isError: true,
            };
          }

          let url = `${this.baseUrl}/api/4.0/looks/${lookId}`;
          if (args.fields) url += `?fields=${encodeURIComponent(args.fields as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get look: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Looker returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'run_look': {
          const lookId = args.look_id as number;

          if (!lookId) {
            return {
              content: [{ type: 'text', text: 'look_id is required' }],
              isError: true,
            };
          }

          const resultFormat = (args.result_format as string) || 'json';
          let url = `${this.baseUrl}/api/4.0/looks/${lookId}/run/${encodeURIComponent(resultFormat)}`;
          if (args.limit) url += `?limit=${args.limit as number}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to run look: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Looker returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'run_inline_query': {
          const model = args.model as string;
          const view = args.view as string;
          const fields = args.fields as string[];

          if (!model || !view || !fields) {
            return {
              content: [{ type: 'text', text: 'model, view, and fields are required' }],
              isError: true,
            };
          }

          const resultFormat = (args.result_format as string) || 'json';
          const body: Record<string, unknown> = {
            model,
            view,
            fields,
            limit: (args.limit as string) || '500',
          };
          if (args.filters) body.filters = args.filters;

          const response = await fetch(
            `${this.baseUrl}/api/4.0/queries/run/${encodeURIComponent(resultFormat)}`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to run inline query: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Looker returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_dashboards': {
          const limit = (args.limit as number) || 20;
          let url = `${this.baseUrl}/api/4.0/dashboards?limit=${limit}`;
          if (args.fields) url += `&fields=${encodeURIComponent(args.fields as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list dashboards: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Looker returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_dashboard': {
          const dashboardId = args.dashboard_id as string;

          if (!dashboardId) {
            return {
              content: [{ type: 'text', text: 'dashboard_id is required' }],
              isError: true,
            };
          }

          let url = `${this.baseUrl}/api/4.0/dashboards/${encodeURIComponent(dashboardId)}`;
          if (args.fields) url += `?fields=${encodeURIComponent(args.fields as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get dashboard: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Looker returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_dashboards': {
          let url = `${this.baseUrl}/api/4.0/dashboards/search`;
          const params: string[] = [];
          if (args.title) params.push(`title=${encodeURIComponent(args.title as string)}`);
          if (args.limit) params.push(`limit=${args.limit as number}`);
          if (args.fields) params.push(`fields=${encodeURIComponent(args.fields as string)}`);
          if (params.length > 0) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search dashboards: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Looker returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_explores': {
          const modelName = args.model_name as string;

          if (!modelName) {
            return {
              content: [{ type: 'text', text: 'model_name is required' }],
              isError: true,
            };
          }

          let url = `${this.baseUrl}/api/4.0/lookml_models/${encodeURIComponent(modelName)}/explores`;
          if (args.fields) url += `?fields=${encodeURIComponent(args.fields as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list explores: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Looker returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_current_user': {
          const response = await fetch(`${this.baseUrl}/api/4.0/user`, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get current user: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Looker returned non-JSON response (HTTP ${response.status})`); }
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
