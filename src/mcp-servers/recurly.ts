/**
 * Recurly MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no official Recurly MCP server exists on GitHub as of March 2026.

import { ToolDefinition, ToolResult } from './types.js';

interface RecurlyConfig {
  apiKey: string;
  /**
   * Recurly v3 REST API base URL.
   * Default: https://v3.recurly.com
   * Override only if Recurly provides an alternative regional endpoint for your account.
   */
  baseUrl?: string;
  /**
   * API version in YYYY-MM-DD format. Sent as the Accept header value.
   * Default: 2021-02-25 (latest stable as of adapter authorship).
   * See https://recurly.com/developers/api/ for available versions.
   */
  apiVersion?: string;
}

export class RecurlyMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor(config: RecurlyConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://v3.recurly.com';
    this.apiVersion = config.apiVersion || '2021-02-25';
  }

  private get authHeader(): string {
    // Recurly v3 uses HTTP Basic auth: API key as username, empty password.
    return `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_accounts',
        description: 'List all accounts in the Recurly site. Supports pagination and filtering.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of accounts to return (max 200, default 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            state: {
              type: 'string',
              description: 'Filter by account state: active, closed, subscriber, non_subscriber, past_due',
            },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Retrieve a specific account by its account code.',
        inputSchema: {
          type: 'object',
          properties: {
            accountCode: {
              type: 'string',
              description: 'The account code (unique identifier for the account in your system)',
            },
          },
          required: ['accountCode'],
        },
      },
      {
        name: 'list_account_subscriptions',
        description: "List all subscriptions for a specific account.",
        inputSchema: {
          type: 'object',
          properties: {
            accountCode: {
              type: 'string',
              description: 'The account code to list subscriptions for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of subscriptions to return (max 200, default 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            state: {
              type: 'string',
              description: 'Filter by subscription state: active, canceled, expired, future, in_trial, live, paused',
            },
          },
          required: ['accountCode'],
        },
      },
      {
        name: 'list_subscriptions',
        description: 'List all subscriptions across the Recurly site.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of subscriptions to return (max 200, default 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            state: {
              type: 'string',
              description: 'Filter by subscription state: active, canceled, expired, future, in_trial, live, paused',
            },
          },
        },
      },
      {
        name: 'get_subscription',
        description: 'Retrieve a specific subscription by its UUID.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: {
              type: 'string',
              description: 'The subscription UUID',
            },
          },
          required: ['subscriptionId'],
        },
      },
      {
        name: 'cancel_subscription',
        description: 'Cancel a subscription. The subscription remains active until the end of the current billing period.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: {
              type: 'string',
              description: 'The subscription UUID to cancel',
            },
          },
          required: ['subscriptionId'],
        },
      },
      {
        name: 'list_invoices',
        description: 'List all invoices in the Recurly site.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of invoices to return (max 200, default 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            state: {
              type: 'string',
              description: 'Filter by invoice state: open, collecting, pending, processed, past_due, failed, recovered, closed',
            },
            type: {
              type: 'string',
              description: 'Filter by invoice type: charge, credit, legacy',
            },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve a specific invoice by its number.',
        inputSchema: {
          type: 'object',
          properties: {
            invoiceNumber: {
              type: 'string',
              description: 'The invoice number (numeric string, e.g. "1001")',
            },
          },
          required: ['invoiceNumber'],
        },
      },
      {
        name: 'list_plans',
        description: 'List all subscription plans in the Recurly site.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of plans to return (max 200, default 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            state: {
              type: 'string',
              description: 'Filter by plan state: active, inactive',
            },
          },
        },
      },
      {
        name: 'list_coupons',
        description: 'List all coupons in the Recurly site.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of coupons to return (max 200, default 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            state: {
              type: 'string',
              description: 'Filter by coupon state: redeemable, expired, maxed_out, inactive',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        Accept: `application/vnd.recurly.${this.apiVersion}+json`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_accounts': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.state) params.set('state', args.state as string);

          const query = params.toString();
          const url = `${this.baseUrl}/accounts${query ? `?${query}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to list accounts (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_account': {
          const accountCode = args.accountCode as string;
          if (!accountCode) {
            return {
              content: [{ type: 'text', text: 'accountCode is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/accounts/${encodeURIComponent(accountCode)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to get account (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_account_subscriptions': {
          const accountCode = args.accountCode as string;
          if (!accountCode) {
            return {
              content: [{ type: 'text', text: 'accountCode is required' }],
              isError: true,
            };
          }

          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.state) params.set('state', args.state as string);

          const query = params.toString();
          const url = `${this.baseUrl}/accounts/${encodeURIComponent(accountCode)}/subscriptions${query ? `?${query}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to list account subscriptions (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_subscriptions': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.state) params.set('state', args.state as string);

          const query = params.toString();
          const url = `${this.baseUrl}/subscriptions${query ? `?${query}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to list subscriptions (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_subscription': {
          const subscriptionId = args.subscriptionId as string;
          if (!subscriptionId) {
            return {
              content: [{ type: 'text', text: 'subscriptionId is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/subscriptions/${encodeURIComponent(subscriptionId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to get subscription (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'cancel_subscription': {
          const subscriptionId = args.subscriptionId as string;
          if (!subscriptionId) {
            return {
              content: [{ type: 'text', text: 'subscriptionId is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
            { method: 'PUT', headers, body: JSON.stringify({}) }
          );

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to cancel subscription (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_invoices': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.state) params.set('state', args.state as string);
          if (args.type) params.set('type', args.type as string);

          const query = params.toString();
          const url = `${this.baseUrl}/invoices${query ? `?${query}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to list invoices (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_invoice': {
          const invoiceNumber = args.invoiceNumber as string;
          if (!invoiceNumber) {
            return {
              content: [{ type: 'text', text: 'invoiceNumber is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/invoices/${encodeURIComponent(invoiceNumber)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to get invoice (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_plans': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.state) params.set('state', args.state as string);

          const query = params.toString();
          const url = `${this.baseUrl}/plans${query ? `?${query}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to list plans (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_coupons': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.state) params.set('state', args.state as string);

          const query = params.toString();
          const url = `${this.baseUrl}/coupons${query ? `?${query}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to list coupons (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
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
