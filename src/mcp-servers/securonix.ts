/**
 * Securonix MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no official Securonix MCP server exists on GitHub as of March 2026.

import { ToolDefinition, ToolResult } from './types.js';

// Auth: Token-based. Generate a token via GET /ws/token/generate with username/password/validity headers.
// The token is then passed as a query parameter (token=...) or header on subsequent requests.
// Base URL format: https://{your-tenant}.securonix.net (cloud) — must be supplied by the user.
// All endpoints are prefixed with /ws/.

interface SecuronixConfig {
  baseUrl: string;
  token?: string;
  username?: string;
  password?: string;
}

export class SecuronixMCPServer {
  private readonly baseUrl: string;
  private token: string;
  private readonly username: string;
  private readonly password: string;

  constructor(config: SecuronixConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token || '';
    this.username = config.username || '';
    this.password = config.password || '';
  }

  private async ensureToken(): Promise<string | null> {
    if (this.token) return this.token;
    if (!this.username || !this.password) return null;

    const response = await fetch(`${this.baseUrl}/ws/token/generate`, {
      method: 'GET',
      headers: {
        username: this.username,
        password: this.password,
        validity: '1',
      },
    });

    if (!response.ok) return null;
    const text = await response.text();
    this.token = text.trim();
    return this.token;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'generate_token',
        description: 'Generate a Securonix authentication token using username and password. Required before other calls if a token was not provided at construction.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Securonix username',
            },
            password: {
              type: 'string',
              description: 'Securonix password',
            },
            validity: {
              type: 'number',
              description: 'Token validity in days (default: 1)',
            },
          },
          required: ['username', 'password'],
        },
      },
      {
        name: 'list_incidents',
        description: 'List Securonix incidents within a time range',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Start time in epoch milliseconds',
            },
            to: {
              type: 'string',
              description: 'End time in epoch milliseconds',
            },
            rangeType: {
              type: 'string',
              description: 'Time range type: updated or opened (default: updated)',
            },
            max: {
              type: 'number',
              description: 'Maximum number of incidents to return (default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'get_incident',
        description: 'Retrieve details for a specific Securonix incident by incident ID',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The Securonix incident ID',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'update_incident',
        description: 'Update the status or workflow of a Securonix incident',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The Securonix incident ID to update',
            },
            action: {
              type: 'string',
              description: 'Workflow action to perform (e.g. Accept, Reject, Complete)',
            },
            status: {
              type: 'string',
              description: 'New status value',
            },
            comment: {
              type: 'string',
              description: 'Comment to attach to the status change',
            },
          },
          required: ['incident_id', 'action'],
        },
      },
      {
        name: 'spotter_search',
        description: 'Execute a Securonix Spotter query to search activity, violation, or risk data',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Spotter query string (e.g. index=activity | where username="jdoe")',
            },
            from: {
              type: 'string',
              description: 'Start time in epoch milliseconds',
            },
            to: {
              type: 'string',
              description: 'End time in epoch milliseconds',
            },
            max: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_violations',
        description: 'List Securonix policy violations (threats) within a time range',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Start time in epoch milliseconds',
            },
            to: {
              type: 'string',
              description: 'End time in epoch milliseconds',
            },
            max: {
              type: 'number',
              description: 'Maximum number of violations to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'get_threats',
        description: 'List threats from the Securonix Security Command Center for a time range',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Start time in epoch milliseconds',
            },
            to: {
              type: 'string',
              description: 'End time in epoch milliseconds',
            },
            type: {
              type: 'string',
              description: 'Threat type filter (optional)',
            },
            max: {
              type: 'number',
              description: 'Maximum number of threats to return (default: 25)',
            },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'get_user_risk_score',
        description: 'Retrieve the current risk score and risk history for a Securonix user',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'The username to look up',
            },
          },
          required: ['username'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'generate_token': {
          const username = args.username as string;
          const password = args.password as string;
          if (!username || !password) {
            return { content: [{ type: 'text', text: 'username and password are required' }], isError: true };
          }

          const validity = String(args.validity || 1);
          const response = await fetch(`${this.baseUrl}/ws/token/generate`, {
            method: 'GET',
            headers: { username, password, validity },
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Token generation failed (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          const token = (await response.text()).trim();
          this.token = token;
          return { content: [{ type: 'text', text: JSON.stringify({ token }) }], isError: false };
        }

        case 'list_incidents': {
          const token = await this.ensureToken();
          if (!token) {
            return { content: [{ type: 'text', text: 'Authentication required: provide a token or username/password' }], isError: true };
          }

          const params = new URLSearchParams({ token });
          params.set('from', args.from as string);
          params.set('to', args.to as string);
          if (args.rangeType) params.set('rangeType', args.rangeType as string);
          if (args.max) params.set('max', String(args.max));
          if (args.offset !== undefined) params.set('offset', String(args.offset));

          const response = await fetch(`${this.baseUrl}/ws/incident/listIncidents?${params.toString()}`, {
            method: 'GET',
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to list incidents (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Securonix returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_incident': {
          const token = await this.ensureToken();
          if (!token) {
            return { content: [{ type: 'text', text: 'Authentication required: provide a token or username/password' }], isError: true };
          }

          const incidentId = args.incident_id as string;
          if (!incidentId) {
            return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
          }

          const params = new URLSearchParams({ token, type: 'metaInfo', incidentId });
          const response = await fetch(`${this.baseUrl}/ws/incident/get?${params.toString()}`, {
            method: 'GET',
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to get incident (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Securonix returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_incident': {
          const token = await this.ensureToken();
          if (!token) {
            return { content: [{ type: 'text', text: 'Authentication required: provide a token or username/password' }], isError: true };
          }

          const incidentId = args.incident_id as string;
          const action = args.action as string;
          if (!incidentId || !action) {
            return { content: [{ type: 'text', text: 'incident_id and action are required' }], isError: true };
          }

          const params = new URLSearchParams({ token, incidentId, actionName: action });
          if (args.status) params.set('status', args.status as string);
          if (args.comment) params.set('comment', args.comment as string);

          const response = await fetch(`${this.baseUrl}/ws/incident/actions?${params.toString()}`, {
            method: 'POST',
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to update incident (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Securonix returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'spotter_search': {
          const token = await this.ensureToken();
          if (!token) {
            return { content: [{ type: 'text', text: 'Authentication required: provide a token or username/password' }], isError: true };
          }

          const query = args.query as string;
          if (!query) {
            return { content: [{ type: 'text', text: 'query is required' }], isError: true };
          }

          const params = new URLSearchParams({ token, query });
          if (args.from) params.set('startTime', args.from as string);
          if (args.to) params.set('endTime', args.to as string);
          if (args.max) params.set('max', String(args.max));

          const response = await fetch(`${this.baseUrl}/ws/spotter/index/search?${params.toString()}`, {
            method: 'GET',
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Spotter search failed (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Securonix returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_violations': {
          const token = await this.ensureToken();
          if (!token) {
            return { content: [{ type: 'text', text: 'Authentication required: provide a token or username/password' }], isError: true };
          }

          const params = new URLSearchParams({ token });
          params.set('from', args.from as string);
          params.set('to', args.to as string);
          if (args.max) params.set('max', String(args.max));
          if (args.offset !== undefined) params.set('offset', String(args.offset));

          const response = await fetch(`${this.baseUrl}/ws/violation/listviolations?${params.toString()}`, {
            method: 'GET',
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to list violations (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Securonix returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_threats': {
          const token = await this.ensureToken();
          if (!token) {
            return { content: [{ type: 'text', text: 'Authentication required: provide a token or username/password' }], isError: true };
          }

          const params = new URLSearchParams({ token });
          params.set('from', args.from as string);
          params.set('to', args.to as string);
          if (args.type) params.set('type', args.type as string);
          if (args.max) params.set('max', String(args.max));

          const response = await fetch(`${this.baseUrl}/ws/sccWidget/getThreats?${params.toString()}`, {
            method: 'GET',
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to get threats (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Securonix returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_user_risk_score': {
          const token = await this.ensureToken();
          if (!token) {
            return { content: [{ type: 'text', text: 'Authentication required: provide a token or username/password' }], isError: true };
          }

          const username = args.username as string;
          if (!username) {
            return { content: [{ type: 'text', text: 'username is required' }], isError: true };
          }

          const params = new URLSearchParams({ token, username });
          const response = await fetch(`${this.baseUrl}/ws/user/getUserRisk?${params.toString()}`, {
            method: 'GET',
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to get user risk score (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Securonix returned non-JSON response (HTTP ${response.status})`); }
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
