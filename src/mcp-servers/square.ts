/**
 * Square MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/square/square-mcp-server — 3 generic tools (get_service_info, get_type_info, make_api_request).
// Their server is auto-generated and exposes a single make_api_request wrapper rather than named domain tools.
// Our adapter provides named, typed tools for the core payment and commerce flows.

import { ToolDefinition, ToolResult } from './types.js';

interface SquareConfig {
  accessToken: string;
  /**
   * Production: https://connect.squareup.com/v2
   * Sandbox:    https://connect.squareupsandbox.com/v2
   */
  baseUrl?: string;
  /**
   * Square-Version header — API version date (e.g. 2026-01-22).
   * Defaults to 2026-01-22 (current as of adapter authorship).
   */
  apiVersion?: string;
}

export class SquareMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor(config: SquareConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://connect.squareupsandbox.com/v2';
    this.apiVersion = config.apiVersion || '2026-01-22';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_locations',
        description: "List all of the seller's locations, including inactive ones.",
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_payments',
        description: 'Retrieve a list of payments taken by the account. Results are ordered by created_at descending.',
        inputSchema: {
          type: 'object',
          properties: {
            beginTime: {
              type: 'string',
              description: 'RFC 3339 timestamp — return payments at or after this time',
            },
            endTime: {
              type: 'string',
              description: 'RFC 3339 timestamp — return payments at or before this time',
            },
            locationId: {
              type: 'string',
              description: 'Filter by location ID',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (max 100)',
            },
          },
        },
      },
      {
        name: 'create_payment',
        description: 'Create a payment using a source (nonce, card on file, etc.). Requires an idempotency key.',
        inputSchema: {
          type: 'object',
          properties: {
            sourceId: {
              type: 'string',
              description: 'Payment source ID (card nonce, payment token, or stored card ID)',
            },
            idempotencyKey: {
              type: 'string',
              description: 'Unique key to prevent duplicate payments (UUID recommended)',
            },
            amountMoney: {
              type: 'object',
              description: 'Amount object with amount (in smallest currency unit) and currency (ISO 4217). Example: { amount: 1000, currency: "USD" }',
            },
            locationId: {
              type: 'string',
              description: 'ID of the location associated with the payment',
            },
            note: {
              type: 'string',
              description: 'Optional note to associate with the payment',
            },
            referenceId: {
              type: 'string',
              description: 'Optional ID for correlating the payment with an external system',
            },
            customerId: {
              type: 'string',
              description: 'Customer ID to associate with this payment',
            },
          },
          required: ['sourceId', 'idempotencyKey', 'amountMoney'],
        },
      },
      {
        name: 'refund_payment',
        description: 'Refund a completed payment. Partial refunds are supported.',
        inputSchema: {
          type: 'object',
          properties: {
            idempotencyKey: {
              type: 'string',
              description: 'Unique key to prevent duplicate refunds',
            },
            amountMoney: {
              type: 'object',
              description: 'Amount to refund with amount (smallest unit) and currency. May be less than the payment amount.',
            },
            paymentId: {
              type: 'string',
              description: 'ID of the payment to refund',
            },
            reason: {
              type: 'string',
              description: 'Reason for the refund (max 192 characters)',
            },
          },
          required: ['idempotencyKey', 'amountMoney', 'paymentId'],
        },
      },
      {
        name: 'list_customers',
        description: "List the customer profiles associated with the seller's account.",
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (1–100)',
            },
            sortField: {
              type: 'string',
              description: 'Sort field: DEFAULT or CREATED_AT',
            },
            sortOrder: {
              type: 'string',
              description: 'Sort order: ASC or DESC',
            },
          },
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer profile.',
        inputSchema: {
          type: 'object',
          properties: {
            idempotencyKey: {
              type: 'string',
              description: 'Unique key to prevent duplicate customers',
            },
            givenName: {
              type: 'string',
              description: "Customer's first name",
            },
            familyName: {
              type: 'string',
              description: "Customer's last name",
            },
            emailAddress: {
              type: 'string',
              description: "Customer's email address",
            },
            phoneNumber: {
              type: 'string',
              description: "Customer's phone number",
            },
            referenceId: {
              type: 'string',
              description: 'External ID to associate with the customer record',
            },
            note: {
              type: 'string',
              description: 'A custom note about the customer',
            },
          },
        },
      },
      {
        name: 'create_order',
        description: 'Create a new order. Orders track items, taxes, discounts, and fulfilment details.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: {
              type: 'string',
              description: 'Location ID where the order is placed',
            },
            idempotencyKey: {
              type: 'string',
              description: 'Unique key to prevent duplicate orders',
            },
            lineItems: {
              type: 'array',
              description: 'Array of line item objects, each with name, quantity, and basePriceMoney',
            },
            customerId: {
              type: 'string',
              description: 'Customer ID to associate with the order',
            },
            referenceId: {
              type: 'string',
              description: 'Your internal reference ID for this order',
            },
          },
          required: ['locationId', 'idempotencyKey'],
        },
      },
      {
        name: 'list_catalog',
        description: 'List all CatalogObjects (items, variations, taxes, discounts, etc.) in the catalog.',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            types: {
              type: 'string',
              description: 'Comma-separated list of CatalogObject types to return (e.g. ITEM,ITEM_VARIATION,TAX,DISCOUNT)',
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
        'Square-Version': this.apiVersion,
      };

      switch (name) {
        case 'list_locations': {
          const response = await fetch(`${this.baseUrl}/locations`, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to list locations (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Square returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_payments': {
          const params = new URLSearchParams();
          if (args.beginTime) params.set('begin_time', args.beginTime as string);
          if (args.endTime) params.set('end_time', args.endTime as string);
          if (args.locationId) params.set('location_id', args.locationId as string);
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.limit) params.set('limit', String(args.limit));

          const query = params.toString();
          const url = `${this.baseUrl}/payments${query ? `?${query}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to list payments (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Square returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_payment': {
          if (!args.sourceId || !args.idempotencyKey || !args.amountMoney) {
            return {
              content: [{ type: 'text', text: 'sourceId, idempotencyKey, and amountMoney are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            source_id: args.sourceId,
            idempotency_key: args.idempotencyKey,
            amount_money: args.amountMoney,
          };
          if (args.locationId) body.location_id = args.locationId;
          if (args.note) body.note = args.note;
          if (args.referenceId) body.reference_id = args.referenceId;
          if (args.customerId) body.customer_id = args.customerId;

          const response = await fetch(`${this.baseUrl}/payments`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to create payment (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Square returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'refund_payment': {
          if (!args.idempotencyKey || !args.amountMoney || !args.paymentId) {
            return {
              content: [{ type: 'text', text: 'idempotencyKey, amountMoney, and paymentId are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            idempotency_key: args.idempotencyKey,
            amount_money: args.amountMoney,
            payment_id: args.paymentId,
          };
          if (args.reason) body.reason = args.reason;

          const response = await fetch(`${this.baseUrl}/refunds`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to refund payment (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Square returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_customers': {
          const params = new URLSearchParams();
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.limit) params.set('limit', String(args.limit));
          if (args.sortField) params.set('sort_field', args.sortField as string);
          if (args.sortOrder) params.set('sort_order', args.sortOrder as string);

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
          try { data = await response.json(); } catch { throw new Error(`Square returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_customer': {
          const body: Record<string, unknown> = {};
          if (args.idempotencyKey) body.idempotency_key = args.idempotencyKey;
          if (args.givenName) body.given_name = args.givenName;
          if (args.familyName) body.family_name = args.familyName;
          if (args.emailAddress) body.email_address = args.emailAddress;
          if (args.phoneNumber) body.phone_number = args.phoneNumber;
          if (args.referenceId) body.reference_id = args.referenceId;
          if (args.note) body.note = args.note;

          const response = await fetch(`${this.baseUrl}/customers`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to create customer (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Square returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_order': {
          if (!args.locationId || !args.idempotencyKey) {
            return {
              content: [{ type: 'text', text: 'locationId and idempotencyKey are required' }],
              isError: true,
            };
          }

          const order: Record<string, unknown> = {
            location_id: args.locationId,
          };
          if (args.lineItems) order.line_items = args.lineItems;
          if (args.customerId) order.customer_id = args.customerId;
          if (args.referenceId) order.reference_id = args.referenceId;

          const body: Record<string, unknown> = {
            idempotency_key: args.idempotencyKey,
            order,
          };

          const response = await fetch(`${this.baseUrl}/orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to create order (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Square returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_catalog': {
          const params = new URLSearchParams();
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.types) params.set('types', args.types as string);

          const query = params.toString();
          const url = `${this.baseUrl}/catalog/list${query ? `?${query}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to list catalog (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Square returned non-JSON response (HTTP ${response.status})`); }
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
