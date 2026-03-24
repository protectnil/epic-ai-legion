/**
 * Brex MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/crazyrabbitLTC/mcp-brex-server — community adapter (not by Brex), read-only, limited scope. Our adapter covers the full API surface including write operations.

import { ToolDefinition, ToolResult } from './types.js';

// Base URL verified: https://developer.brex.com — production endpoint: https://platform.brexapis.com
// Auth: Bearer token in Authorization header (user token or OAuth2 token)
// Transactions: GET /v2/transactions/card/primary, GET /v2/transactions/cash/{id}
// Expenses: GET /v1/expenses/card, GET /v1/expenses/card/{expense_id}, PUT /v1/expenses/card/{expense_id}
// Budgets: GET /v1/budgets, GET /v1/budgets/{id}
// Cards: GET /v1/cards, GET /v1/cards/{id}
// Accounts: GET /v1/accounts/cash

interface BrexConfig {
  accessToken: string;
  baseUrl?: string;
}

export class BrexMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: BrexConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://platform.brexapis.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_card_transactions',
        description: 'List card transactions for the primary Brex card account with optional date range and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response (next_cursor field)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of transactions to return (default: 100)',
            },
            user_ids: {
              type: 'string',
              description: 'Comma-separated list of user IDs to filter transactions by',
            },
            posted_at_start: {
              type: 'string',
              description: 'Filter transactions posted at or after this ISO 8601 datetime (e.g. 2026-01-01T00:00:00Z)',
            },
          },
        },
      },
      {
        name: 'get_cash_transaction',
        description: 'Get a single cash account transaction by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The cash transaction ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_expenses',
        description: 'List card expenses with optional filters. Expenses represent individual spend events attached to card transactions.',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of expenses to return (default: 100)',
            },
            user_id: {
              type: 'string',
              description: 'Filter expenses by user ID',
            },
            parent_expense_id: {
              type: 'string',
              description: 'Filter by parent expense ID',
            },
            expand: {
              type: 'string',
              description: 'Comma-separated list of fields to expand (e.g. merchant,receipts)',
            },
          },
        },
      },
      {
        name: 'get_expense',
        description: 'Get a single card expense by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            expense_id: {
              type: 'string',
              description: 'The expense ID',
            },
            expand: {
              type: 'string',
              description: 'Comma-separated list of fields to expand (e.g. merchant,receipts)',
            },
          },
          required: ['expense_id'],
        },
      },
      {
        name: 'update_expense',
        description: 'Update a card expense memo or category',
        inputSchema: {
          type: 'object',
          properties: {
            expense_id: {
              type: 'string',
              description: 'The expense ID to update',
            },
            memo: {
              type: 'string',
              description: 'A short note or description for the expense',
            },
            category: {
              type: 'string',
              description: 'Expense category (e.g. travel, software, meals)',
            },
          },
          required: ['expense_id'],
        },
      },
      {
        name: 'list_budgets',
        description: 'List all budgets (spend limits) in the organization',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of budgets to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_budget',
        description: 'Get a single budget by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The budget ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_cards',
        description: 'List all cards in the organization with optional user filter',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of cards to return (default: 100)',
            },
            user_id: {
              type: 'string',
              description: 'Filter cards by the owning user ID',
            },
          },
        },
      },
      {
        name: 'get_card',
        description: 'Get a single card by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The card ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_cash_accounts',
        description: 'List all Brex cash deposit accounts in the organization',
        inputSchema: {
          type: 'object',
          properties: {},
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
        case 'list_card_transactions': {
          const params = new URLSearchParams();
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.limit) params.set('limit', String(args.limit));
          if (args.user_ids) params.set('user_ids', args.user_ids as string);
          if (args.posted_at_start) params.set('posted_at_start', args.posted_at_start as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/v2/transactions/card/primary${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list card transactions: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Brex returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_cash_transaction': {
          const id = args.id as string;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/v2/transactions/cash/${encodeURIComponent(id)}`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get cash transaction: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Brex returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_expenses': {
          const params = new URLSearchParams();
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.limit) params.set('limit', String(args.limit));
          if (args.user_id) params.set('user_id', args.user_id as string);
          if (args.parent_expense_id) params.set('parent_expense_id', args.parent_expense_id as string);
          if (args.expand) params.set('expand[]', args.expand as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/v1/expenses/card${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list expenses: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Brex returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_expense': {
          const expenseId = args.expense_id as string;
          if (!expenseId) {
            return { content: [{ type: 'text', text: 'expense_id is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.expand) params.set('expand[]', args.expand as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/v1/expenses/card/${encodeURIComponent(expenseId)}${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get expense: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Brex returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_expense': {
          const expenseId = args.expense_id as string;
          if (!expenseId) {
            return { content: [{ type: 'text', text: 'expense_id is required' }], isError: true };
          }

          const body: Record<string, unknown> = {};
          if (args.memo !== undefined) body.memo = args.memo;
          if (args.category !== undefined) body.category = args.category;

          const response = await fetch(`${this.baseUrl}/v1/expenses/card/${encodeURIComponent(expenseId)}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update expense: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Brex returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_budgets': {
          const params = new URLSearchParams();
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.limit) params.set('limit', String(args.limit));

          const qs = params.toString();
          const url = `${this.baseUrl}/v1/budgets${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list budgets: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Brex returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_budget': {
          const id = args.id as string;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/v1/budgets/${encodeURIComponent(id)}`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get budget: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Brex returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_cards': {
          const params = new URLSearchParams();
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.limit) params.set('limit', String(args.limit));
          if (args.user_id) params.set('user_id', args.user_id as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/v1/cards${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list cards: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Brex returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_card': {
          const id = args.id as string;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/v1/cards/${encodeURIComponent(id)}`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get card: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Brex returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_cash_accounts': {
          const response = await fetch(`${this.baseUrl}/v1/accounts/cash`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list cash accounts: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Brex returned non-JSON response (HTTP ${response.status})`); }
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
