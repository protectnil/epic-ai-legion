/**
 * Ramp MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/ramp-public/ramp_mcp — official Ramp repo, ETL + in-memory SQLite pattern, demo env by default. Our adapter covers live production REST API with full CRUD surface and no SQLite dependency.

import { ToolDefinition, ToolResult } from './types.js';

// Base URL verified: https://docs.ramp.com/developer-api/v1
//   Production: https://api.ramp.com
//   Demo/Sandbox: https://demo-api.ramp.com
// Auth: OAuth2 client_credentials — POST /developer/v1/token with Basic auth (client_id:client_secret)
//   Returns: { access_token, token_type: "Bearer", expires_in }
//   Use access_token as Bearer in subsequent calls
// Transactions: GET /developer/v1/transactions
// Cards: GET /developer/v1/cards, POST /developer/v1/cards, PATCH /developer/v1/cards/{id}
// Users: GET /developer/v1/users, POST /developer/v1/users
// Departments: GET /developer/v1/departments, POST /developer/v1/departments
// Spend Programs: GET /developer/v1/spend_programs

interface RampConfig {
  accessToken: string;
  baseUrl?: string;
}

export class RampMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: RampConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.ramp.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_transactions',
        description: 'List Ramp transactions with optional filters for date range, card, merchant, and department',
        inputSchema: {
          type: 'object',
          properties: {
            start: {
              type: 'string',
              description: 'Filter transactions on or after this date (ISO 8601, e.g. 2026-01-01T00:00:00Z)',
            },
            end: {
              type: 'string',
              description: 'Filter transactions on or before this date (ISO 8601)',
            },
            card_id: {
              type: 'string',
              description: 'Filter by card ID',
            },
            user_id: {
              type: 'string',
              description: 'Filter by user ID',
            },
            department_id: {
              type: 'string',
              description: 'Filter by department ID',
            },
            merchant_id: {
              type: 'string',
              description: 'Filter by merchant ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 100)',
            },
            start_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'list_cards',
        description: 'List all Ramp cards in the organization',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Filter cards by the owning user ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 100)',
            },
            start_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_card',
        description: 'Get a single Ramp card by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            card_id: {
              type: 'string',
              description: 'The Ramp card ID',
            },
          },
          required: ['card_id'],
        },
      },
      {
        name: 'update_card',
        description: 'Update card spend limit or display name',
        inputSchema: {
          type: 'object',
          properties: {
            card_id: {
              type: 'string',
              description: 'The card ID to update',
            },
            display_name: {
              type: 'string',
              description: 'New display name for the card',
            },
            spending_restrictions: {
              type: 'object',
              description: 'Spending restrictions object with interval and limit fields',
            },
          },
          required: ['card_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List all users in the Ramp organization',
        inputSchema: {
          type: 'object',
          properties: {
            department_id: {
              type: 'string',
              description: 'Filter users by department ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 100)',
            },
            start_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get a single Ramp user by their ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The Ramp user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_departments',
        description: 'List all departments in the Ramp organization',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 100)',
            },
            start_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_department',
        description: 'Get a single department by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            department_id: {
              type: 'string',
              description: 'The department ID',
            },
          },
          required: ['department_id'],
        },
      },
      {
        name: 'list_spend_programs',
        description: 'List all spend programs (reusable card templates with preset spending rules) in the organization',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 100)',
            },
            start_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'list_reimbursements',
        description: 'List out-of-pocket expense reimbursement requests',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Filter reimbursements by user ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 100)',
            },
            start_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
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
      };

      switch (name) {
        case 'list_transactions': {
          const params = new URLSearchParams();
          if (args.start) params.set('start', args.start as string);
          if (args.end) params.set('end', args.end as string);
          if (args.card_id) params.set('card_id', args.card_id as string);
          if (args.user_id) params.set('user_id', args.user_id as string);
          if (args.department_id) params.set('department_id', args.department_id as string);
          if (args.merchant_id) params.set('merchant_id', args.merchant_id as string);
          if (args.page_size) params.set('page_size', String(args.page_size));
          if (args.start_cursor) params.set('start_cursor', args.start_cursor as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/developer/v1/transactions${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list transactions: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_cards': {
          const params = new URLSearchParams();
          if (args.user_id) params.set('user_id', args.user_id as string);
          if (args.page_size) params.set('page_size', String(args.page_size));
          if (args.start_cursor) params.set('start_cursor', args.start_cursor as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/developer/v1/cards${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list cards: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_card': {
          const cardId = args.card_id as string;
          if (!cardId) {
            return { content: [{ type: 'text', text: 'card_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/developer/v1/cards/${encodeURIComponent(cardId)}`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get card: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_card': {
          const cardId = args.card_id as string;
          if (!cardId) {
            return { content: [{ type: 'text', text: 'card_id is required' }], isError: true };
          }

          const body: Record<string, unknown> = {};
          if (args.display_name !== undefined) body.display_name = args.display_name;
          if (args.spending_restrictions !== undefined) body.spending_restrictions = args.spending_restrictions;

          const response = await fetch(`${this.baseUrl}/developer/v1/cards/${encodeURIComponent(cardId)}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update card: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_users': {
          const params = new URLSearchParams();
          if (args.department_id) params.set('department_id', args.department_id as string);
          if (args.page_size) params.set('page_size', String(args.page_size));
          if (args.start_cursor) params.set('start_cursor', args.start_cursor as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/developer/v1/users${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list users: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_user': {
          const userId = args.user_id as string;
          if (!userId) {
            return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/developer/v1/users/${encodeURIComponent(userId)}`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get user: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_departments': {
          const params = new URLSearchParams();
          if (args.page_size) params.set('page_size', String(args.page_size));
          if (args.start_cursor) params.set('start_cursor', args.start_cursor as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/developer/v1/departments${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list departments: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_department': {
          const deptId = args.department_id as string;
          if (!deptId) {
            return { content: [{ type: 'text', text: 'department_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/developer/v1/departments/${encodeURIComponent(deptId)}`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get department: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_spend_programs': {
          const params = new URLSearchParams();
          if (args.page_size) params.set('page_size', String(args.page_size));
          if (args.start_cursor) params.set('start_cursor', args.start_cursor as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/developer/v1/spend_programs${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list spend programs: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_reimbursements': {
          const params = new URLSearchParams();
          if (args.user_id) params.set('user_id', args.user_id as string);
          if (args.page_size) params.set('page_size', String(args.page_size));
          if (args.start_cursor) params.set('start_cursor', args.start_cursor as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/developer/v1/reimbursements${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list reimbursements: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
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
