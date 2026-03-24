/**
 * Clio MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found

import { ToolDefinition, ToolResult } from './types.js';

/**
 * Clio operates four regional data environments:
 *   us  → https://app.clio.com       (default, North America)
 *   eu  → https://eu.app.clio.com
 *   ca  → https://ca.app.clio.com
 *   au  → https://au.app.clio.com
 */
const CLIO_REGIONAL_BASES: Record<string, string> = {
  us: 'https://app.clio.com',
  eu: 'https://eu.app.clio.com',
  ca: 'https://ca.app.clio.com',
  au: 'https://au.app.clio.com',
};

interface ClioConfig {
  accessToken: string;
  /**
   * Data region: 'us' (default), 'eu', 'ca', or 'au'.
   * Supply baseUrl to override completely (e.g. sandbox environments).
   */
  region?: string;
  baseUrl?: string;
}

export class ClioMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: ClioConfig) {
    this.accessToken = config.accessToken;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    } else {
      const region = config.region || 'us';
      const regionalBase = CLIO_REGIONAL_BASES[region];
      if (!regionalBase) {
        throw new Error(`Unknown Clio region "${region}". Valid values: us, eu, ca, au`);
      }
      this.baseUrl = `${regionalBase}/api/v4`;
    }
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_current_user',
        description: 'Retrieve the authenticated Clio user account details',
        inputSchema: {
          type: 'object',
          properties: {
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in the response',
            },
          },
        },
      },
      {
        name: 'list_matters',
        description: 'List legal matters in the Clio account with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by matter status: open, pending, closed, cancelled',
            },
            client_id: {
              type: 'number',
              description: 'Filter matters by client ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of matters to return (max: 200, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in the response',
            },
          },
        },
      },
      {
        name: 'get_matter',
        description: 'Retrieve a specific legal matter by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            matter_id: {
              type: 'number',
              description: 'The Clio matter ID',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in the response',
            },
          },
          required: ['matter_id'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts (clients and other parties) in the Clio account',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by contact type: Person or Company',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of contacts to return (max: 200, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            query: {
              type: 'string',
              description: 'Search query to filter contacts by name',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in the response',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Retrieve a specific contact by their ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'number',
              description: 'The Clio contact ID',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in the response',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'list_activities',
        description: 'List time entries and activities logged in Clio',
        inputSchema: {
          type: 'object',
          properties: {
            matter_id: {
              type: 'number',
              description: 'Filter activities by matter ID',
            },
            user_id: {
              type: 'number',
              description: 'Filter activities by user ID',
            },
            start_date: {
              type: 'string',
              description: 'Return activities on or after this date (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Return activities on or before this date (YYYY-MM-DD)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of activities to return (max: 200, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in the response',
            },
          },
        },
      },
      {
        name: 'create_activity',
        description: 'Log a new time entry or activity against a matter',
        inputSchema: {
          type: 'object',
          properties: {
            matter_id: {
              type: 'number',
              description: 'The matter ID to log the activity against',
            },
            quantity: {
              type: 'number',
              description: 'Time in seconds for time entries, or quantity for flat-fee activities',
            },
            note: {
              type: 'string',
              description: 'Description of the activity',
            },
            date: {
              type: 'string',
              description: 'Date the activity occurred (YYYY-MM-DD, defaults to today)',
            },
            activity_description_id: {
              type: 'number',
              description: 'ID of the activity description/billing code to apply',
            },
          },
          required: ['matter_id', 'quantity'],
        },
      },
      {
        name: 'list_documents',
        description: 'List documents stored in Clio, optionally scoped to a matter',
        inputSchema: {
          type: 'object',
          properties: {
            matter_id: {
              type: 'number',
              description: 'Filter documents by matter ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of documents to return (max: 200, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in the response',
            },
          },
        },
      },
      {
        name: 'list_tasks',
        description: 'List tasks assigned in Clio with optional filtering by matter or assignee',
        inputSchema: {
          type: 'object',
          properties: {
            matter_id: {
              type: 'number',
              description: 'Filter tasks by matter ID',
            },
            assignee_id: {
              type: 'number',
              description: 'Filter tasks by assignee user ID',
            },
            status: {
              type: 'string',
              description: 'Filter by task status: complete or incomplete',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of tasks to return (max: 200, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in the response',
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
        Accept: 'application/json',
      };

      switch (name) {
        case 'get_current_user': {
          let url = `${this.baseUrl}/users/who_am_i`;
          if (args.fields) url += `?fields=${encodeURIComponent(args.fields as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get current user: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Clio returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_matters': {
          const params = new URLSearchParams();
          if (args.status) params.set('status', args.status as string);
          if (args.client_id) params.set('client_id', String(args.client_id));
          if (args.limit) params.set('limit', String(args.limit));
          if (args.page_token) params.set('page_token', args.page_token as string);
          if (args.fields) params.set('fields', args.fields as string);
          const qs = params.toString();
          const url = `${this.baseUrl}/matters${qs ? `?${qs}` : ''}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list matters: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Clio returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_matter': {
          const matterId = args.matter_id as number;
          if (!matterId) {
            return { content: [{ type: 'text', text: 'matter_id is required' }], isError: true };
          }

          let url = `${this.baseUrl}/matters/${matterId}`;
          if (args.fields) url += `?fields=${encodeURIComponent(args.fields as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get matter: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Clio returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_contacts': {
          const params = new URLSearchParams();
          if (args.type) params.set('type', args.type as string);
          if (args.limit) params.set('limit', String(args.limit));
          if (args.page_token) params.set('page_token', args.page_token as string);
          if (args.query) params.set('query', args.query as string);
          if (args.fields) params.set('fields', args.fields as string);
          const qs = params.toString();
          const url = `${this.baseUrl}/contacts${qs ? `?${qs}` : ''}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list contacts: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Clio returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_contact': {
          const contactId = args.contact_id as number;
          if (!contactId) {
            return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
          }

          let url = `${this.baseUrl}/contacts/${contactId}`;
          if (args.fields) url += `?fields=${encodeURIComponent(args.fields as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get contact: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Clio returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_activities': {
          const params = new URLSearchParams();
          if (args.matter_id) params.set('matter_id', String(args.matter_id));
          if (args.user_id) params.set('user_id', String(args.user_id));
          if (args.start_date) params.set('start_date', args.start_date as string);
          if (args.end_date) params.set('end_date', args.end_date as string);
          if (args.limit) params.set('limit', String(args.limit));
          if (args.page_token) params.set('page_token', args.page_token as string);
          if (args.fields) params.set('fields', args.fields as string);
          const qs = params.toString();
          const url = `${this.baseUrl}/activities${qs ? `?${qs}` : ''}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list activities: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Clio returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_activity': {
          const matterId = args.matter_id as number;
          const quantity = args.quantity as number;
          if (!matterId || quantity === undefined) {
            return {
              content: [{ type: 'text', text: 'matter_id and quantity are required' }],
              isError: true,
            };
          }

          const activityData: Record<string, unknown> = {
            matter: { id: matterId },
            quantity,
          };
          if (args.note) activityData.note = args.note;
          if (args.date) activityData.date = args.date;
          if (args.activity_description_id) {
            activityData.activity_description = { id: args.activity_description_id };
          }

          const response = await fetch(`${this.baseUrl}/activities`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ data: activityData }),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create activity: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Clio returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_documents': {
          const params = new URLSearchParams();
          if (args.matter_id) params.set('matter_id', String(args.matter_id));
          if (args.limit) params.set('limit', String(args.limit));
          if (args.page_token) params.set('page_token', args.page_token as string);
          if (args.fields) params.set('fields', args.fields as string);
          const qs = params.toString();
          const url = `${this.baseUrl}/documents${qs ? `?${qs}` : ''}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list documents: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Clio returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_tasks': {
          const params = new URLSearchParams();
          if (args.matter_id) params.set('matter_id', String(args.matter_id));
          if (args.assignee_id) params.set('assignee_id', String(args.assignee_id));
          if (args.status) params.set('status', args.status as string);
          if (args.limit) params.set('limit', String(args.limit));
          if (args.page_token) params.set('page_token', args.page_token as string);
          if (args.fields) params.set('fields', args.fields as string);
          const qs = params.toString();
          const url = `${this.baseUrl}/tasks${qs ? `?${qs}` : ''}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list tasks: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Clio returned non-JSON response (HTTP ${response.status})`); }
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
