/**
 * Close CRM MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.close.com/mcp — hosted-only, requires OAuth 2.0 Dynamic Client Registration (DCR).
// This adapter serves the API-key use case for self-hosted and air-gapped deployments.

import { ToolDefinition, ToolResult } from './types.js';

interface CloseCRMConfig {
  apiKey: string;
  /**
   * Base URL for the Close API.
   * Defaults to https://api.close.com/api/v1
   */
  baseUrl?: string;
}

export class CloseCRMMCPServer {
  private readonly basicToken: string;
  private readonly baseUrl: string;

  constructor(config: CloseCRMConfig) {
    // Close uses HTTP Basic auth: API key as username, empty string as password.
    this.basicToken = Buffer.from(`${config.apiKey}:`).toString('base64');
    this.baseUrl = config.baseUrl || 'https://api.close.com/api/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_leads',
        description: 'Search and list leads (companies/accounts) in Close CRM with optional pagination and field filtering.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string to filter leads by name or other text fields.',
            },
            _limit: {
              type: 'number',
              description: 'Maximum number of leads to return (default: 100, max: 1000 per request).',
            },
            _skip: {
              type: 'number',
              description: 'Number of leads to skip for pagination.',
            },
            _fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in the response.',
            },
          },
        },
      },
      {
        name: 'create_lead',
        description: 'Create a new lead (company/account) in Close CRM. Contacts, addresses, and custom fields can be nested in the same request.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Lead (company) name.',
            },
            url: {
              type: 'string',
              description: 'Company website URL.',
            },
            description: {
              type: 'string',
              description: 'Lead description or notes.',
            },
            contacts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  title: { type: 'string' },
                  emails: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        email: { type: 'string' },
                        type: { type: 'string', description: 'e.g. "work", "home"' },
                      },
                    },
                  },
                  phones: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        phone: { type: 'string' },
                        type: { type: 'string' },
                      },
                    },
                  },
                },
              },
              description: 'Contacts to create and associate with this lead.',
            },
            status_id: {
              type: 'string',
              description: 'Lead status ID.',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_opportunities',
        description: 'List opportunities (deals) in Close CRM with optional filtering by lead, user, status, and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            lead_id: {
              type: 'string',
              description: 'Filter opportunities by lead ID.',
            },
            user_id: {
              type: 'string',
              description: 'Filter opportunities by owner user ID.',
            },
            status_type: {
              type: 'string',
              description: 'Filter by status type: "active", "won", or "lost".',
            },
            date_created__gt: {
              type: 'string',
              description: 'Filter opportunities created after this ISO-8601 date.',
            },
            date_created__lt: {
              type: 'string',
              description: 'Filter opportunities created before this ISO-8601 date.',
            },
            date_won__gt: {
              type: 'string',
              description: 'Filter by won date after this ISO-8601 date.',
            },
            date_won__lt: {
              type: 'string',
              description: 'Filter by won date before this ISO-8601 date.',
            },
            _limit: {
              type: 'number',
              description: 'Maximum number of results to return.',
            },
            _skip: {
              type: 'number',
              description: 'Number of results to skip for pagination.',
            },
          },
        },
      },
      {
        name: 'create_opportunity',
        description: 'Create a new opportunity (deal) in Close CRM for a given lead.',
        inputSchema: {
          type: 'object',
          properties: {
            lead_id: {
              type: 'string',
              description: 'Lead ID to associate the opportunity with.',
            },
            note: {
              type: 'string',
              description: 'Notes about the opportunity.',
            },
            confidence: {
              type: 'number',
              description: 'Win probability as a percentage (0–100).',
            },
            value: {
              type: 'number',
              description: 'Opportunity value in the base currency unit (e.g. cents for USD).',
            },
            value_period: {
              type: 'string',
              description: 'Revenue period: "one_time", "monthly", "annual".',
            },
            status_id: {
              type: 'string',
              description: 'Opportunity status ID. If omitted, the org default active status is used.',
            },
            close_date: {
              type: 'string',
              description: 'Expected close date in YYYY-MM-DD format.',
            },
            user_id: {
              type: 'string',
              description: 'Owner user ID (defaults to the authenticated user).',
            },
          },
          required: ['lead_id'],
        },
      },
      {
        name: 'list_activities',
        description: 'List activity log entries in Close CRM. Activities include calls, emails, SMS, notes, and meetings. Filter by lead, user, type, or date range.',
        inputSchema: {
          type: 'object',
          properties: {
            lead_id: {
              type: 'string',
              description: 'Filter activities by lead ID.',
            },
            user_id: {
              type: 'string',
              description: 'Filter activities by user ID.',
            },
            _type: {
              type: 'string',
              description: 'Activity type to filter by (e.g. "Call", "Email", "Note", "Meeting").',
            },
            date_created__gt: {
              type: 'string',
              description: 'Filter activities created after this ISO-8601 datetime.',
            },
            date_created__lt: {
              type: 'string',
              description: 'Filter activities created before this ISO-8601 datetime.',
            },
            activity_at__gt: {
              type: 'string',
              description: 'Filter by activity timestamp after this ISO-8601 datetime.',
            },
            activity_at__lt: {
              type: 'string',
              description: 'Filter by activity timestamp before this ISO-8601 datetime.',
            },
            _limit: {
              type: 'number',
              description: 'Maximum number of results to return.',
            },
            _skip: {
              type: 'number',
              description: 'Number of results to skip for pagination.',
            },
            _order_by: {
              type: 'string',
              description: 'Field to sort by, prefix with "-" for descending (e.g. "-date_created").',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Retrieve a single contact record from Close CRM by contact ID.',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Close CRM contact ID.',
            },
          },
          required: ['contact_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Basic ${this.basicToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'search_leads': {
          const params: string[] = [];
          if (args.query) params.push(`query=${encodeURIComponent(args.query as string)}`);
          if (args._limit) params.push(`_limit=${args._limit}`);
          if (args._skip) params.push(`_skip=${args._skip}`);
          if (args._fields) params.push(`_fields=${encodeURIComponent(args._fields as string)}`);

          const url = `${this.baseUrl}/lead/${params.length ? `?${params.join('&')}` : ''}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search leads: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Close returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_lead': {
          if (!args.name) {
            return {
              content: [{ type: 'text', text: 'name is required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { name: args.name };
          if (args.url) body.url = args.url;
          if (args.description) body.description = args.description;
          if (args.contacts) body.contacts = args.contacts;
          if (args.status_id) body.status_id = args.status_id;

          const response = await fetch(`${this.baseUrl}/lead/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create lead: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Close returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_opportunities': {
          const params: string[] = [];
          if (args.lead_id) params.push(`lead_id=${encodeURIComponent(args.lead_id as string)}`);
          if (args.user_id) params.push(`user_id=${encodeURIComponent(args.user_id as string)}`);
          if (args.status_type) params.push(`status_type=${encodeURIComponent(args.status_type as string)}`);
          if (args.date_created__gt) params.push(`date_created__gt=${encodeURIComponent(args.date_created__gt as string)}`);
          if (args.date_created__lt) params.push(`date_created__lt=${encodeURIComponent(args.date_created__lt as string)}`);
          if (args.date_won__gt) params.push(`date_won__gt=${encodeURIComponent(args.date_won__gt as string)}`);
          if (args.date_won__lt) params.push(`date_won__lt=${encodeURIComponent(args.date_won__lt as string)}`);
          if (args._limit) params.push(`_limit=${args._limit}`);
          if (args._skip) params.push(`_skip=${args._skip}`);

          const url = `${this.baseUrl}/opportunity/${params.length ? `?${params.join('&')}` : ''}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list opportunities: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Close returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_opportunity': {
          if (!args.lead_id) {
            return {
              content: [{ type: 'text', text: 'lead_id is required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { lead_id: args.lead_id };
          if (args.note) body.note = args.note;
          if (typeof args.confidence === 'number') body.confidence = args.confidence;
          if (typeof args.value === 'number') body.value = args.value;
          if (args.value_period) body.value_period = args.value_period;
          if (args.status_id) body.status_id = args.status_id;
          if (args.close_date) body.close_date = args.close_date;
          if (args.user_id) body.user_id = args.user_id;

          const response = await fetch(`${this.baseUrl}/opportunity/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create opportunity: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Close returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_activities': {
          const params: string[] = [];
          if (args.lead_id) params.push(`lead_id=${encodeURIComponent(args.lead_id as string)}`);
          if (args.user_id) params.push(`user_id=${encodeURIComponent(args.user_id as string)}`);
          if (args._type) params.push(`_type=${encodeURIComponent(args._type as string)}`);
          if (args.date_created__gt) params.push(`date_created__gt=${encodeURIComponent(args.date_created__gt as string)}`);
          if (args.date_created__lt) params.push(`date_created__lt=${encodeURIComponent(args.date_created__lt as string)}`);
          if (args.activity_at__gt) params.push(`activity_at__gt=${encodeURIComponent(args.activity_at__gt as string)}`);
          if (args.activity_at__lt) params.push(`activity_at__lt=${encodeURIComponent(args.activity_at__lt as string)}`);
          if (args._limit) params.push(`_limit=${args._limit}`);
          if (args._skip) params.push(`_skip=${args._skip}`);
          if (args._order_by) params.push(`_order_by=${encodeURIComponent(args._order_by as string)}`);

          const url = `${this.baseUrl}/activity/${params.length ? `?${params.join('&')}` : ''}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list activities: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Close returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_contact': {
          const contactId = args.contact_id as string;
          if (!contactId) {
            return {
              content: [{ type: 'text', text: 'contact_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/contact/${encodeURIComponent(contactId)}/`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get contact: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Close returned non-JSON response (HTTP ${response.status})`); }
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
