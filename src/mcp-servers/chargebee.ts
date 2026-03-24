/**
 * Chargebee MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/chargebee/agentkit (modelcontextprotocol dir) — DEPRECATED.
// The official package (@chargebee/mcp) is deprecated and will no longer receive updates.
// Our adapter provides a complete, maintained integration against Chargebee REST API v2.

import { ToolDefinition, ToolResult } from './types.js';

interface ChargebeeConfig {
  apiKey: string;
  /**
   * Your Chargebee site name (the subdomain of your Chargebee account).
   * Example: if your URL is https://acme-test.chargebee.com, set site to "acme-test".
   */
  site: string;
  /**
   * Base URL override. Defaults to https://{site}.chargebee.com/api/v2.
   * Override only if using a custom domain or EU data residency.
   */
  baseUrl?: string;
}

export class ChargebeeMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ChargebeeConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || `https://${config.site}.chargebee.com/api/v2`;
  }

  private get authHeader(): string {
    // Chargebee uses HTTP Basic auth: API key as username, empty password.
    return `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_subscriptions',
        description: 'List subscriptions in the Chargebee account. Supports filtering and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of subscriptions to return (max 100, default 10)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
            customerId: {
              type: 'string',
              description: 'Filter by customer ID',
            },
            status: {
              type: 'string',
              description: 'Filter by subscription status (active, cancelled, future, in_trial, non_renewing, paused)',
            },
          },
        },
      },
      {
        name: 'get_subscription',
        description: 'Retrieve details of a specific subscription by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: {
              type: 'string',
              description: 'The Chargebee subscription ID',
            },
          },
          required: ['subscriptionId'],
        },
      },
      {
        name: 'cancel_subscription',
        description: 'Cancel a subscription. Can be scheduled for end of term or immediate.',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: {
              type: 'string',
              description: 'The Chargebee subscription ID to cancel',
            },
            endOfTerm: {
              type: 'boolean',
              description: 'If true, the subscription is cancelled at the end of the current term. Defaults to false (immediate).',
            },
            cancelReasonCode: {
              type: 'string',
              description: 'Reason code for the cancellation',
            },
          },
          required: ['subscriptionId'],
        },
      },
      {
        name: 'list_customers',
        description: 'List customers in the Chargebee account.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of customers to return (max 100, default 10)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
            email: {
              type: 'string',
              description: 'Filter by customer email address',
            },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Retrieve details of a specific customer by their ID.',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: {
              type: 'string',
              description: 'The Chargebee customer ID',
            },
          },
          required: ['customerId'],
        },
      },
      {
        name: 'list_invoices',
        description: 'List invoices in the Chargebee account. Supports filtering by customer, subscription, and status.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of invoices to return (max 100, default 10)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
            customerId: {
              type: 'string',
              description: 'Filter by customer ID',
            },
            subscriptionId: {
              type: 'string',
              description: 'Filter by subscription ID',
            },
            status: {
              type: 'string',
              description: 'Filter by invoice status (paid, posted, payment_due, not_paid, voided, pending)',
            },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve details of a specific invoice by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            invoiceId: {
              type: 'string',
              description: 'The Chargebee invoice ID',
            },
          },
          required: ['invoiceId'],
        },
      },
      {
        name: 'list_plans',
        description: 'List plans defined in the Chargebee account (Product Catalog 1.0). For Product Catalog 2.0, use item prices.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of plans to return (max 100, default 10)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
            status: {
              type: 'string',
              description: 'Filter by plan status (active, archived)',
            },
          },
        },
      },
      {
        name: 'list_coupons',
        description: 'List coupons defined in the Chargebee account.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of coupons to return (max 100, default 10)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
            status: {
              type: 'string',
              description: 'Filter by coupon status (active, expired, archived, deleted)',
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
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      switch (name) {
        case 'list_subscriptions': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.offset) params.set('offset', args.offset as string);
          if (args.customerId) params.set('customer_id[is]', args.customerId as string);
          if (args.status) params.set('status[is]', args.status as string);

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
          try { data = await response.json(); } catch { throw new Error(`Chargebee returned non-JSON response (HTTP ${response.status})`); }
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
          try { data = await response.json(); } catch { throw new Error(`Chargebee returned non-JSON response (HTTP ${response.status})`); }
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

          const body = new URLSearchParams();
          if (typeof args.endOfTerm === 'boolean') body.set('end_of_term', String(args.endOfTerm));
          if (args.cancelReasonCode) body.set('cancel_reason_code', args.cancelReasonCode as string);

          const response = await fetch(
            `${this.baseUrl}/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
            { method: 'POST', headers, body: body.toString() }
          );

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to cancel subscription (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Chargebee returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_customers': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.offset) params.set('offset', args.offset as string);
          if (args.email) params.set('email[is]', args.email as string);

          const query = params.toString();
          const url = `${this.baseUrl}/customers${query ? `?${query}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to list customers (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Chargebee returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_customer': {
          const customerId = args.customerId as string;
          if (!customerId) {
            return {
              content: [{ type: 'text', text: 'customerId is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/customers/${encodeURIComponent(customerId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to get customer (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Chargebee returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_invoices': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.offset) params.set('offset', args.offset as string);
          if (args.customerId) params.set('customer_id[is]', args.customerId as string);
          if (args.subscriptionId) params.set('subscription_id[is]', args.subscriptionId as string);
          if (args.status) params.set('status[is]', args.status as string);

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
          try { data = await response.json(); } catch { throw new Error(`Chargebee returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_invoice': {
          const invoiceId = args.invoiceId as string;
          if (!invoiceId) {
            return {
              content: [{ type: 'text', text: 'invoiceId is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/invoices/${encodeURIComponent(invoiceId)}`,
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
          try { data = await response.json(); } catch { throw new Error(`Chargebee returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_plans': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.offset) params.set('offset', args.offset as string);
          if (args.status) params.set('status[is]', args.status as string);

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
          try { data = await response.json(); } catch { throw new Error(`Chargebee returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_coupons': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.offset) params.set('offset', args.offset as string);
          if (args.status) params.set('status[is]', args.status as string);

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
          try { data = await response.json(); } catch { throw new Error(`Chargebee returned non-JSON response (HTTP ${response.status})`); }
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
