/**
 * Tipalti MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found

// Auth: OAuth2 client_credentials.
// Token endpoint: POST https://api.tipalti.com/oauth2/token
//   Body (x-www-form-urlencoded): grant_type=client_credentials, client_id, client_secret
// Production API base URL: https://api.tipalti.com
// Sandbox API base URL:    https://api.sandbox.tipalti.com
// Source: https://developer.tipalti.com/ and https://apiworx.com/diy-developer-guide-building-custom-integrations-for-tipalti/

import { ToolDefinition, ToolResult } from './types.js';

interface TipaltiConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class TipaltiMCPServer {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: TipaltiConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.tipalti.com';
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }
    const tokenUrl = `${this.baseUrl}/oauth2/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`Tipalti OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.cachedToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.cachedToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_payees',
        description: 'List all payees (vendors/suppliers) registered in Tipalti',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of payees to return',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
            status: {
              type: 'string',
              description: 'Filter by payee status: active, inactive, pending',
            },
          },
        },
      },
      {
        name: 'get_payee',
        description: 'Retrieve details for a single payee by their Tipalti payee ID',
        inputSchema: {
          type: 'object',
          properties: {
            payee_id: {
              type: 'string',
              description: 'Tipalti payee ID',
            },
          },
          required: ['payee_id'],
        },
      },
      {
        name: 'create_payee',
        description: 'Create a new payee in Tipalti',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Payee legal name',
            },
            email: {
              type: 'string',
              description: 'Payee email address',
            },
            currency: {
              type: 'string',
              description: 'Preferred payment currency code (e.g. USD, EUR)',
            },
            country: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code (e.g. US, GB)',
            },
          },
          required: ['name', 'email'],
        },
      },
      {
        name: 'list_bills',
        description: 'List bills (vendor invoices) in Tipalti',
        inputSchema: {
          type: 'object',
          properties: {
            payee_id: {
              type: 'string',
              description: 'Filter bills by payee ID',
            },
            status: {
              type: 'string',
              description: 'Filter by bill status: pending, approved, paid, rejected',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of bills to return',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
          },
        },
      },
      {
        name: 'get_bill',
        description: 'Retrieve details for a single bill by bill ID',
        inputSchema: {
          type: 'object',
          properties: {
            bill_id: {
              type: 'string',
              description: 'Tipalti bill ID',
            },
          },
          required: ['bill_id'],
        },
      },
      {
        name: 'create_bill',
        description: 'Create a new bill (vendor invoice) in Tipalti for AP processing',
        inputSchema: {
          type: 'object',
          properties: {
            payee_id: {
              type: 'string',
              description: 'Tipalti payee ID for the vendor',
            },
            amount: {
              type: 'number',
              description: 'Bill amount in the specified currency',
            },
            currency: {
              type: 'string',
              description: 'Currency code for the bill amount (e.g. USD)',
            },
            description: {
              type: 'string',
              description: 'Description or memo for the bill',
            },
            due_date: {
              type: 'string',
              description: 'Bill due date in YYYY-MM-DD format',
            },
            reference_code: {
              type: 'string',
              description: 'External reference code for reconciliation',
            },
          },
          required: ['payee_id', 'amount', 'currency'],
        },
      },
      {
        name: 'list_payments',
        description: 'List payment batches processed through Tipalti',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by payment status: pending, processing, completed, failed',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of payments to return',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
          },
        },
      },
      {
        name: 'get_payment',
        description: 'Retrieve details for a single payment by payment ID',
        inputSchema: {
          type: 'object',
          properties: {
            payment_id: {
              type: 'string',
              description: 'Tipalti payment ID',
            },
          },
          required: ['payment_id'],
        },
      },
      {
        name: 'get_payee_payment_method',
        description: 'Retrieve the payment method details registered for a payee',
        inputSchema: {
          type: 'object',
          properties: {
            payee_id: {
              type: 'string',
              description: 'Tipalti payee ID',
            },
          },
          required: ['payee_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const accessToken = await this.getAccessToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_payees': {
          const params = new URLSearchParams();
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          if (args.status) params.set('status', args.status as string);
          let url = `${this.baseUrl}/api/payees`;
          if (params.toString()) url += `?${params.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list payees: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Tipalti returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_payee': {
          const payeeId = args.payee_id as string;
          if (!payeeId) {
            return { content: [{ type: 'text', text: 'payee_id is required' }], isError: true };
          }
          const url = `${this.baseUrl}/api/payees/${encodeURIComponent(payeeId)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get payee: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Tipalti returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_payee': {
          const name = args.name as string;
          const email = args.email as string;
          if (!name || !email) {
            return { content: [{ type: 'text', text: 'name and email are required' }], isError: true };
          }
          const body: Record<string, unknown> = { name, email };
          if (args.currency) body.currency = args.currency;
          if (args.country) body.country = args.country;

          const response = await fetch(`${this.baseUrl}/api/payees`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create payee: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Tipalti returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_bills': {
          const params = new URLSearchParams();
          if (args.payee_id) params.set('payee_id', args.payee_id as string);
          if (args.status) params.set('status', args.status as string);
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          let url = `${this.baseUrl}/api/bills`;
          if (params.toString()) url += `?${params.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list bills: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Tipalti returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_bill': {
          const billId = args.bill_id as string;
          if (!billId) {
            return { content: [{ type: 'text', text: 'bill_id is required' }], isError: true };
          }
          const url = `${this.baseUrl}/api/bills/${encodeURIComponent(billId)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get bill: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Tipalti returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_bill': {
          const payeeId = args.payee_id as string;
          const amount = args.amount as number;
          const currency = args.currency as string;
          if (!payeeId || amount === undefined || !currency) {
            return { content: [{ type: 'text', text: 'payee_id, amount, and currency are required' }], isError: true };
          }
          const body: Record<string, unknown> = { payee_id: payeeId, amount, currency };
          if (args.description) body.description = args.description;
          if (args.due_date) body.due_date = args.due_date;
          if (args.reference_code) body.reference_code = args.reference_code;

          const response = await fetch(`${this.baseUrl}/api/bills`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create bill: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Tipalti returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_payments': {
          const params = new URLSearchParams();
          if (args.status) params.set('status', args.status as string);
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          let url = `${this.baseUrl}/api/payments`;
          if (params.toString()) url += `?${params.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list payments: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Tipalti returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_payment': {
          const paymentId = args.payment_id as string;
          if (!paymentId) {
            return { content: [{ type: 'text', text: 'payment_id is required' }], isError: true };
          }
          const url = `${this.baseUrl}/api/payments/${encodeURIComponent(paymentId)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get payment: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Tipalti returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_payee_payment_method': {
          const payeeId = args.payee_id as string;
          if (!payeeId) {
            return { content: [{ type: 'text', text: 'payee_id is required' }], isError: true };
          }
          const url = `${this.baseUrl}/api/payees/${encodeURIComponent(payeeId)}/payment-method`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get payee payment method: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Tipalti returned non-JSON response (HTTP ${response.status})`); }
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
