/**
 * Zuora MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/CDataSoftware/zuora-mcp-server-by-cdata — read-only JDBC wrapper (not official Zuora MCP)

// Auth: OAuth2 client_credentials.
// Token endpoint: POST {baseUrl}/oauth/token
//   Body (x-www-form-urlencoded): grant_type=client_credentials, client_id, client_secret
// Regional base URLs (pass via config.baseUrl):
//   US Production:   https://rest.zuora.com
//   US Sandbox:      https://rest.apisandbox.zuora.com
//   EU Production:   https://rest.eu.zuora.com
//   EU Sandbox:      https://rest.sandbox.eu.zuora.com
// Default: https://rest.zuora.com
// Source: https://developer.zuora.com/v1-api-reference/api/overview/
//         https://developer.zuora.com/rest-api/general-concepts/authentication/

import { ToolDefinition, ToolResult } from './types.js';

interface ZuoraConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class ZuoraMCPServer {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: ZuoraConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://rest.zuora.com';
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }
    const tokenUrl = `${this.baseUrl}/oauth/token`;
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
      throw new Error(`Zuora OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.cachedToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.cachedToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_accounts',
        description: 'Query customer accounts in Zuora using ZOQL (Zuora Object Query Language)',
        inputSchema: {
          type: 'object',
          properties: {
            query_string: {
              type: 'string',
              description: 'ZOQL query string, e.g. "select Id, Name, Status from Account where Status = \'Active\'"',
            },
          },
          required: ['query_string'],
        },
      },
      {
        name: 'get_account',
        description: 'Retrieve a customer account by its Zuora account key (ID or account number)',
        inputSchema: {
          type: 'object',
          properties: {
            account_key: {
              type: 'string',
              description: 'Zuora account ID or account number',
            },
          },
          required: ['account_key'],
        },
      },
      {
        name: 'get_account_summary',
        description: 'Retrieve a full account summary including subscriptions, invoices, and payments',
        inputSchema: {
          type: 'object',
          properties: {
            account_key: {
              type: 'string',
              description: 'Zuora account ID or account number',
            },
          },
          required: ['account_key'],
        },
      },
      {
        name: 'list_subscriptions',
        description: 'List subscriptions for a customer account',
        inputSchema: {
          type: 'object',
          properties: {
            account_key: {
              type: 'string',
              description: 'Zuora account ID or account number',
            },
          },
          required: ['account_key'],
        },
      },
      {
        name: 'get_subscription',
        description: 'Retrieve a subscription by its subscription number or ID',
        inputSchema: {
          type: 'object',
          properties: {
            subscription_key: {
              type: 'string',
              description: 'Zuora subscription number or ID',
            },
          },
          required: ['subscription_key'],
        },
      },
      {
        name: 'create_subscription',
        description: 'Create a new subscription for a customer account',
        inputSchema: {
          type: 'object',
          properties: {
            account_key: {
              type: 'string',
              description: 'Zuora account ID or account number for the subscriber',
            },
            contract_effective_date: {
              type: 'string',
              description: 'Subscription contract effective date in YYYY-MM-DD format',
            },
            subscribe_to_rate_plans: {
              type: 'array',
              description: 'Array of rate plan objects to subscribe to, each with productRatePlanId',
            },
            term_type: {
              type: 'string',
              description: 'Subscription term type: TERMED or EVERGREEN',
            },
            initial_term: {
              type: 'number',
              description: 'Initial term length in months (required for TERMED subscriptions)',
            },
          },
          required: ['account_key', 'contract_effective_date', 'subscribe_to_rate_plans'],
        },
      },
      {
        name: 'list_invoices',
        description: 'List invoices for a customer account',
        inputSchema: {
          type: 'object',
          properties: {
            account_key: {
              type: 'string',
              description: 'Zuora account ID or account number',
            },
          },
          required: ['account_key'],
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve an invoice by its Zuora invoice ID',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'string',
              description: 'Zuora invoice ID',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'list_payments',
        description: 'List payments for a customer account',
        inputSchema: {
          type: 'object',
          properties: {
            account_key: {
              type: 'string',
              description: 'Zuora account ID or account number',
            },
          },
          required: ['account_key'],
        },
      },
      {
        name: 'create_payment',
        description: 'Create and apply a payment to a customer account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Zuora account ID',
            },
            amount: {
              type: 'number',
              description: 'Payment amount',
            },
            currency: {
              type: 'string',
              description: 'Currency code (e.g. USD)',
            },
            effective_date: {
              type: 'string',
              description: 'Payment effective date in YYYY-MM-DD format',
            },
            type: {
              type: 'string',
              description: 'Payment type: External or Electronic',
            },
          },
          required: ['account_id', 'amount', 'currency', 'effective_date', 'type'],
        },
      },
      {
        name: 'list_products',
        description: 'List products in the Zuora product catalog',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of results per page (max 40, default 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination',
            },
          },
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
        case 'list_accounts': {
          const queryString = args.query_string as string;
          if (!queryString) {
            return { content: [{ type: 'text', text: 'query_string is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/v1/action/query`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ queryString }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to query accounts: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_account': {
          const accountKey = args.account_key as string;
          if (!accountKey) {
            return { content: [{ type: 'text', text: 'account_key is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/v1/accounts/${encodeURIComponent(accountKey)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get account: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_account_summary': {
          const accountKey = args.account_key as string;
          if (!accountKey) {
            return { content: [{ type: 'text', text: 'account_key is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/v1/accounts/${encodeURIComponent(accountKey)}/summary`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get account summary: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_subscriptions': {
          const accountKey = args.account_key as string;
          if (!accountKey) {
            return { content: [{ type: 'text', text: 'account_key is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/v1/subscriptions/accounts/${encodeURIComponent(accountKey)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list subscriptions: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_subscription': {
          const subscriptionKey = args.subscription_key as string;
          if (!subscriptionKey) {
            return { content: [{ type: 'text', text: 'subscription_key is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/v1/subscriptions/${encodeURIComponent(subscriptionKey)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get subscription: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_subscription': {
          const accountKey = args.account_key as string;
          const contractEffectiveDate = args.contract_effective_date as string;
          const subscribeToRatePlans = args.subscribe_to_rate_plans;
          if (!accountKey || !contractEffectiveDate || !subscribeToRatePlans) {
            return { content: [{ type: 'text', text: 'account_key, contract_effective_date, and subscribe_to_rate_plans are required' }], isError: true };
          }
          const body: Record<string, unknown> = {
            accountKey,
            contractEffectiveDate,
            subscribeToRatePlans,
          };
          if (args.term_type) body.termType = args.term_type;
          if (args.initial_term !== undefined) body.initialTerm = args.initial_term;

          const response = await fetch(`${this.baseUrl}/v1/subscriptions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create subscription: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_invoices': {
          const accountKey = args.account_key as string;
          if (!accountKey) {
            return { content: [{ type: 'text', text: 'account_key is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/v1/transactions/invoices/accounts/${encodeURIComponent(accountKey)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list invoices: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_invoice': {
          const invoiceId = args.invoice_id as string;
          if (!invoiceId) {
            return { content: [{ type: 'text', text: 'invoice_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/v1/invoices/${encodeURIComponent(invoiceId)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get invoice: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_payments': {
          const accountKey = args.account_key as string;
          if (!accountKey) {
            return { content: [{ type: 'text', text: 'account_key is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/v1/transactions/payments/accounts/${encodeURIComponent(accountKey)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list payments: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_payment': {
          const accountId = args.account_id as string;
          const amount = args.amount as number;
          const currency = args.currency as string;
          const effectiveDate = args.effective_date as string;
          const type = args.type as string;
          if (!accountId || amount === undefined || !currency || !effectiveDate || !type) {
            return { content: [{ type: 'text', text: 'account_id, amount, currency, effective_date, and type are required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/v1/payments`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ accountId, amount, currency, effectiveDate, type }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create payment: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_products': {
          const params = new URLSearchParams();
          if (args.page_size !== undefined) params.set('pageSize', String(args.page_size));
          if (args.page !== undefined) params.set('page', String(args.page));
          let url = `${this.baseUrl}/v1/catalog/products`;
          if (params.toString()) url += `?${params.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list products: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON response (HTTP ${response.status})`); }
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
