/** Shopify MCP Adapter / Built on the Epic AI® Intelligence Platform / Copyright 2026 protectNIL Inc. Apache-2.0 */

import { ToolDefinition, ToolResult } from './types.js';

interface ShopifyConfig {
  store: string;
  access_token: string;
}

export class ShopifyMCPServer {
  private config: ShopifyConfig;

  constructor(config: ShopifyConfig) {
    this.config = config;
  }

  private get baseUrl(): string {
    return `https://${this.config.store}.myshopify.com/admin/api/2026-01`;
  }

  private get authHeaders(): Record<string, string> {
    return {
      'X-Shopify-Access-Token': this.config.access_token,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_products',
        description: 'List products from the Shopify store.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of products to return (max 250).' },
            since_id: { type: 'number', description: 'Return products with ID greater than this value.' },
            status: {
              type: 'string',
              enum: ['active', 'archived', 'draft'],
              description: 'Filter products by status.',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_product',
        description: 'Retrieve a single Shopify product by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'number', description: 'The numeric Shopify product ID.' },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'list_orders',
        description: 'List orders from the Shopify store.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of orders to return (max 250).' },
            status: {
              type: 'string',
              enum: ['open', 'closed', 'cancelled', 'any'],
              description: 'Filter orders by status (default: open).',
            },
            since_id: { type: 'number', description: 'Return orders with ID greater than this value.' },
            created_at_min: { type: 'string', description: 'Return orders created after this ISO 8601 timestamp.' },
            created_at_max: { type: 'string', description: 'Return orders created before this ISO 8601 timestamp.' },
          },
          required: [],
        },
      },
      {
        name: 'get_order',
        description: 'Retrieve a single Shopify order by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: { type: 'number', description: 'The numeric Shopify order ID.' },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'list_customers',
        description: 'List customers from the Shopify store.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of customers to return (max 250).' },
            since_id: { type: 'number', description: 'Return customers with ID greater than this value.' },
            created_at_min: { type: 'string', description: 'Return customers created after this ISO 8601 timestamp.' },
            created_at_max: { type: 'string', description: 'Return customers created before this ISO 8601 timestamp.' },
          },
          required: [],
        },
      },
      {
        name: 'create_product',
        description: 'Create a new product in the Shopify store.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Product title.' },
            body_html: { type: 'string', description: 'Product description in HTML.' },
            vendor: { type: 'string', description: 'Product vendor name.' },
            product_type: { type: 'string', description: 'Product type (category).' },
            status: {
              type: 'string',
              enum: ['active', 'archived', 'draft'],
              description: 'Product status (default: draft).',
            },
            tags: { type: 'string', description: 'Comma-separated list of tags.' },
          },
          required: ['title'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_products': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.since_id) params.set('since_id', String(args.since_id));
          if (args.status) params.set('status', args.status as string);
          const response = await fetch(`${this.baseUrl}/products.json?${params}`, { headers: this.authHeaders });
          const data = await response.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_product': {
          const response = await fetch(`${this.baseUrl}/products/${args.product_id}.json`, {
            headers: this.authHeaders,
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_orders': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.status) params.set('status', args.status as string);
          if (args.since_id) params.set('since_id', String(args.since_id));
          if (args.created_at_min) params.set('created_at_min', args.created_at_min as string);
          if (args.created_at_max) params.set('created_at_max', args.created_at_max as string);
          const response = await fetch(`${this.baseUrl}/orders.json?${params}`, { headers: this.authHeaders });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_order': {
          const response = await fetch(`${this.baseUrl}/orders/${args.order_id}.json`, {
            headers: this.authHeaders,
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_customers': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.since_id) params.set('since_id', String(args.since_id));
          if (args.created_at_min) params.set('created_at_min', args.created_at_min as string);
          if (args.created_at_max) params.set('created_at_max', args.created_at_max as string);
          const response = await fetch(`${this.baseUrl}/customers.json?${params}`, { headers: this.authHeaders });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_product': {
          if (!args.title) {
            return { content: [{ type: 'text', text: 'title is required' }], isError: true };
          }
          const product: Record<string, unknown> = { title: args.title };
          if (args.body_html) product['body_html'] = args.body_html;
          if (args.vendor) product['vendor'] = args.vendor;
          if (args.product_type) product['product_type'] = args.product_type;
          if (args.status) product['status'] = args.status;
          if (args.tags) product['tags'] = args.tags;
          const response = await fetch(`${this.baseUrl}/products.json`, {
            method: 'POST',
            headers: this.authHeaders,
            body: JSON.stringify({ product }),
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create product: ${JSON.stringify(data)}` }], isError: true };
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
    }
  }
}
