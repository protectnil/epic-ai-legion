/**
 * Salesloft MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — CData community adapter exists (CDataSoftware/salesloft-mcp-server-by-cdata) but no Salesloft-published MCP server

// Salesloft API v2.
// Base URL: https://api.salesloft.com/v2
// Auth: Bearer token (OAuth2 or API key). All requests require: Authorization: Bearer {token}
// Pagination: responses include { metadata: { paging: { next_href, prev_href, per_page, current_page } } }
// Activity emails endpoint: GET /v2/activities/emails

import { ToolDefinition, ToolResult } from './types.js';

interface SalesloftConfig {
  accessToken: string;
  baseUrl?: string;
}

export class SalesloftMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: SalesloftConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl || 'https://api.salesloft.com').replace(/\/$/, '') + '/v2';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_people',
        description: 'List people (prospects/contacts) in Salesloft',
        inputSchema: {
          type: 'object',
          properties: {
            email_addresses: {
              type: 'string',
              description: 'Filter by exact email address',
            },
            account_id: {
              type: 'number',
              description: 'Filter people by Salesloft account ID',
            },
            cadence_id: {
              type: 'number',
              description: 'Filter people who are on this cadence ID',
            },
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 100, default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            sort_by: {
              type: 'string',
              description: 'Field to sort by (e.g. last_name, created_at)',
            },
            sort_direction: {
              type: 'string',
              description: 'Sort direction: ASC or DESC (default: DESC)',
            },
          },
        },
      },
      {
        name: 'get_person',
        description: 'Get a single person by Salesloft person ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Salesloft person ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_person',
        description: 'Create a new person in Salesloft',
        inputSchema: {
          type: 'object',
          properties: {
            email_address: {
              type: 'string',
              description: 'Primary email address (required)',
            },
            first_name: {
              type: 'string',
              description: 'First name',
            },
            last_name: {
              type: 'string',
              description: 'Last name',
            },
            title: {
              type: 'string',
              description: 'Job title',
            },
            phone: {
              type: 'string',
              description: 'Primary phone number',
            },
            account_id: {
              type: 'number',
              description: 'Salesloft account ID to associate this person with',
            },
          },
          required: ['email_address'],
        },
      },
      {
        name: 'list_accounts',
        description: 'List account records in Salesloft. Accounts represent companies.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter accounts by name (prefix search)',
            },
            domain: {
              type: 'string',
              description: 'Filter accounts by website domain',
            },
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 100, default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            sort_by: {
              type: 'string',
              description: 'Field to sort by (e.g. name, created_at)',
            },
            sort_direction: {
              type: 'string',
              description: 'Sort direction: ASC or DESC (default: DESC)',
            },
          },
        },
      },
      {
        name: 'list_cadences',
        description: 'List cadence records in Salesloft. Cadences are automated outreach sequences.',
        inputSchema: {
          type: 'object',
          properties: {
            team_cadence: {
              type: 'boolean',
              description: 'If true, return team cadences only. If false, return personal cadences only.',
            },
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 100, default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            sort_by: {
              type: 'string',
              description: 'Field to sort by (e.g. name, created_at)',
            },
            sort_direction: {
              type: 'string',
              description: 'Sort direction: ASC or DESC (default: DESC)',
            },
          },
        },
      },
      {
        name: 'list_calls',
        description: 'List call records in Salesloft',
        inputSchema: {
          type: 'object',
          properties: {
            person_id: {
              type: 'number',
              description: 'Filter calls by Salesloft person ID',
            },
            cadence_id: {
              type: 'number',
              description: 'Filter calls by cadence ID',
            },
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 100, default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'list_email_activities',
        description: 'List email activity records in Salesloft (sent emails)',
        inputSchema: {
          type: 'object',
          properties: {
            person_id: {
              type: 'number',
              description: 'Filter email activities by Salesloft person ID',
            },
            cadence_id: {
              type: 'number',
              description: 'Filter email activities by cadence ID',
            },
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 100, default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      const buildListParams = (args: Record<string, unknown>, filterMap: Record<string, string> = {}): URLSearchParams => {
        const params = new URLSearchParams();
        for (const [argKey, paramName] of Object.entries(filterMap)) {
          if (args[argKey] !== undefined) {
            params.set(paramName, String(args[argKey]));
          }
        }
        params.set('per_page', String((args.per_page as number) || 25));
        params.set('page', String((args.page as number) || 1));
        if (args.sort_by) params.set('sort_by', args.sort_by as string);
        if (args.sort_direction) params.set('sort_direction', args.sort_direction as string);
        return params;
      };

      switch (name) {
        case 'list_people': {
          const params = buildListParams(args, {
            email_addresses: 'filter[email_addresses]',
            account_id: 'filter[account_id]',
            cadence_id: 'filter[cadence_id]',
          });
          const response = await fetch(`${this.baseUrl}/people?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list people: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Salesloft returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_person': {
          const id = args.id as number;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/people/${id}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get person: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Salesloft returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_person': {
          const email_address = args.email_address as string;
          if (!email_address) {
            return { content: [{ type: 'text', text: 'email_address is required' }], isError: true };
          }

          const body: Record<string, unknown> = { email_address };
          if (args.first_name) body.first_name = args.first_name;
          if (args.last_name) body.last_name = args.last_name;
          if (args.title) body.title = args.title;
          if (args.phone) body.phone = args.phone;
          if (args.account_id !== undefined) body.account_id = args.account_id;

          const response = await fetch(`${this.baseUrl}/people`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create person: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Salesloft returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_accounts': {
          const params = buildListParams(args, {
            name: 'filter[name]',
            domain: 'filter[domain]',
          });
          const response = await fetch(`${this.baseUrl}/accounts?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list accounts: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Salesloft returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_cadences': {
          const params = buildListParams(args);
          if (typeof args.team_cadence === 'boolean') params.set('filter[team_cadence]', String(args.team_cadence));
          const response = await fetch(`${this.baseUrl}/cadences?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list cadences: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Salesloft returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_calls': {
          const params = buildListParams(args, {
            person_id: 'filter[person_id]',
            cadence_id: 'filter[cadence_id]',
          });
          const response = await fetch(`${this.baseUrl}/calls?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list calls: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Salesloft returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_email_activities': {
          const params = buildListParams(args, {
            person_id: 'filter[person_id]',
            cadence_id: 'filter[cadence_id]',
          });
          const response = await fetch(`${this.baseUrl}/activities/emails?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list email activities: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Salesloft returned non-JSON response (HTTP ${response.status})`); }
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
