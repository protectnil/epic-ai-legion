/**
 * FreshBooks MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — FreshBooks has not published an official MCP server as of March 2026.
// Several community servers exist (roboulos/freshbooks-mcp, OI-OS/freshbooks-mcp-server,
// Good-Samaritan-Software-LLC/freshbooks-mcp) but none is an official FreshBooks product.
//
// FreshBooks REST API:
// Base URL: https://api.freshbooks.com
// Auth: OAuth2 Bearer token — Authorization: Bearer <access_token>
// Accounting endpoints use accountId: /accounting/account/{accountId}/
// Time tracking / projects use businessId: /timetracking/business/{businessId}/
//
// NOTE: Accounting and time-tracking endpoints use different ID namespaces. Both IDs can be
// retrieved from the identity endpoint: GET /auth/api/v1/users/me

import { ToolDefinition, ToolResult } from './types.js';

interface FreshBooksConfig {
  accessToken: string;
  accountId: string;
  businessId?: string;
  baseUrl?: string;
}

export class FreshBooksMCPServer {
  private readonly accessToken: string;
  private readonly accountId: string;
  private readonly businessId: string;
  private readonly baseUrl: string;

  constructor(config: FreshBooksConfig) {
    this.accessToken = config.accessToken;
    this.accountId = config.accountId;
    this.businessId = config.businessId || '';
    this.baseUrl = config.baseUrl || 'https://api.freshbooks.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_clients',
        description: 'List clients in the FreshBooks account',
        inputSchema: {
          type: 'object',
          properties: {
            search_name: {
              type: 'string',
              description: 'Filter clients by name (partial match)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Clients per page (max 100, default: 25)',
            },
          },
        },
      },
      {
        name: 'get_client',
        description: 'Retrieve a single FreshBooks client by their client ID',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: {
              type: 'string',
              description: 'The FreshBooks client ID',
            },
          },
          required: ['client_id'],
        },
      },
      {
        name: 'list_invoices',
        description: 'List invoices in the FreshBooks account, optionally filtered by status or client',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: {
              type: 'string',
              description: 'Filter invoices by client ID',
            },
            status: {
              type: 'number',
              description: 'Filter by invoice status code: 1=draft, 2=sent, 3=viewed, 4=paid, 5=auto-paid, 6=retry, 7=failed, 8=partial',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Invoices per page (max 100, default: 25)',
            },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve a single FreshBooks invoice by its invoice ID',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'string',
              description: 'The FreshBooks invoice ID',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'create_invoice',
        description: 'Create a new invoice in FreshBooks',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: {
              type: 'string',
              description: 'The client ID to bill',
            },
            due_offset_days: {
              type: 'number',
              description: 'Number of days from today until the invoice is due (default: 30)',
            },
            notes: {
              type: 'string',
              description: 'Notes or terms to include on the invoice',
            },
            lines: {
              type: 'array',
              description: 'Line items for the invoice',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Line item name/description' },
                  unit_cost: { type: 'number', description: 'Cost per unit' },
                  qty: { type: 'number', description: 'Quantity' },
                },
              },
            },
          },
          required: ['client_id', 'lines'],
        },
      },
      {
        name: 'list_expenses',
        description: 'List expenses in the FreshBooks account',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: {
              type: 'string',
              description: 'Filter expenses by client ID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Expenses per page (max 100, default: 25)',
            },
          },
        },
      },
      {
        name: 'list_payments',
        description: 'List payments received on invoices',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'string',
              description: 'Filter payments by invoice ID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Payments per page (max 100, default: 25)',
            },
          },
        },
      },
      {
        name: 'list_time_entries',
        description: 'List time tracking entries. Requires businessId to be set in the adapter config.',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: {
              type: 'string',
              description: 'Filter time entries by client ID',
            },
            project_id: {
              type: 'string',
              description: 'Filter time entries by project ID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Entries per page (max 100, default: 25)',
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
        'Api-Version': 'alpha',
      };

      switch (name) {
        case 'list_clients': {
          const params = new URLSearchParams();
          if (args.search_name) params.set('search[name]', args.search_name as string);
          if (args.page) params.set('page', String(args.page as number));
          if (args.per_page) params.set('per_page', String(args.per_page as number));

          const qs = params.toString() ? `?${params.toString()}` : '';
          const url = `${this.baseUrl}/accounting/account/${this.accountId}/users/clients${qs}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list clients: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`FreshBooks returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_client': {
          const clientId = args.client_id as string;
          if (!clientId) {
            return {
              content: [{ type: 'text', text: 'client_id is required' }],
              isError: true,
            };
          }

          const url = `${this.baseUrl}/accounting/account/${this.accountId}/users/clients/${encodeURIComponent(clientId)}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get client: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`FreshBooks returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_invoices': {
          const params = new URLSearchParams();
          if (args.client_id) params.set('search[clientid]', args.client_id as string);
          if (args.status !== undefined) params.set('search[invoice_status]', String(args.status as number));
          if (args.page) params.set('page', String(args.page as number));
          if (args.per_page) params.set('per_page', String(args.per_page as number));

          const qs = params.toString() ? `?${params.toString()}` : '';
          const url = `${this.baseUrl}/accounting/account/${this.accountId}/invoices/invoices${qs}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list invoices: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`FreshBooks returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_invoice': {
          const invoiceId = args.invoice_id as string;
          if (!invoiceId) {
            return {
              content: [{ type: 'text', text: 'invoice_id is required' }],
              isError: true,
            };
          }

          const url = `${this.baseUrl}/accounting/account/${this.accountId}/invoices/invoices/${encodeURIComponent(invoiceId)}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get invoice: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`FreshBooks returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_invoice': {
          const clientId = args.client_id as string;
          const lines = args.lines as Array<{ name: string; unit_cost: number; qty: number }>;

          if (!clientId || !lines || lines.length === 0) {
            return {
              content: [{ type: 'text', text: 'client_id and lines are required' }],
              isError: true,
            };
          }

          const dueOffsetDays = (args.due_offset_days as number) ?? 30;
          const notes = (args.notes as string) || '';

          const body = {
            invoice: {
              customerid: clientId,
              due_offset_days: dueOffsetDays,
              notes,
              lines: lines.map((l) => ({
                name: l.name,
                unit_cost: { amount: String(l.unit_cost), code: 'USD' },
                qty: l.qty,
                type: 0,
              })),
            },
          };

          const url = `${this.baseUrl}/accounting/account/${this.accountId}/invoices/invoices`;
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create invoice: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`FreshBooks returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_expenses': {
          const params = new URLSearchParams();
          if (args.client_id) params.set('search[clientid]', args.client_id as string);
          if (args.page) params.set('page', String(args.page as number));
          if (args.per_page) params.set('per_page', String(args.per_page as number));

          const qs = params.toString() ? `?${params.toString()}` : '';
          const url = `${this.baseUrl}/accounting/account/${this.accountId}/expenses/expenses${qs}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list expenses: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`FreshBooks returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_payments': {
          const params = new URLSearchParams();
          if (args.invoice_id) params.set('search[invoiceid]', args.invoice_id as string);
          if (args.page) params.set('page', String(args.page as number));
          if (args.per_page) params.set('per_page', String(args.per_page as number));

          const qs = params.toString() ? `?${params.toString()}` : '';
          const url = `${this.baseUrl}/accounting/account/${this.accountId}/payments/payments${qs}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list payments: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`FreshBooks returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_time_entries': {
          if (!this.businessId) {
            return {
              content: [{ type: 'text', text: 'businessId is required in the adapter config to use list_time_entries' }],
              isError: true,
            };
          }

          const params = new URLSearchParams();
          if (args.client_id) params.set('client_id', args.client_id as string);
          if (args.project_id) params.set('project_id', args.project_id as string);
          if (args.page) params.set('page', String(args.page as number));
          if (args.per_page) params.set('per_page', String(args.per_page as number));

          const qs = params.toString() ? `?${params.toString()}` : '';
          const url = `${this.baseUrl}/timetracking/business/${this.businessId}/time_entries${qs}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list time entries: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`FreshBooks returned non-JSON response (HTTP ${response.status})`); }
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
