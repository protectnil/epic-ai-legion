/**
 * Productboard MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no official Productboard-vendor MCP server exists.
// Community servers (e.g., Enreign/productboard-mcp, miguelarios/productboard-mcp-server) are third-party.
// Base URL: https://api.productboard.com
// Auth: Bearer token via Authorization header — generate a Personal API Access Token from
// Workspace Settings → Integrations → Public API.

import { ToolDefinition, ToolResult } from './types.js';

interface ProductboardConfig {
  apiToken: string;
  baseUrl?: string;
}

export class ProductboardMCPServer {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: ProductboardConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.productboard.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_features',
        description: 'List features from the product hierarchy. Features are the core items in Productboard representing work to be done.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by feature status name (e.g., "In progress", "Done")',
            },
            productId: {
              type: 'string',
              description: 'Filter features belonging to a specific product by its ID',
            },
            componentId: {
              type: 'string',
              description: 'Filter features belonging to a specific component by its ID',
            },
          },
        },
      },
      {
        name: 'get_feature',
        description: 'Get a single feature by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            featureId: {
              type: 'string',
              description: 'The ID of the feature to retrieve',
            },
          },
          required: ['featureId'],
        },
      },
      {
        name: 'create_feature',
        description: 'Create a new feature in Productboard',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the feature',
            },
            description: {
              type: 'string',
              description: 'Description of the feature (HTML supported)',
            },
            status: {
              type: 'object',
              description: 'Status object with a name field, e.g. {"name": "Candidate"}',
            },
            parent: {
              type: 'object',
              description: 'Parent hierarchy entity. Object with id and type (e.g., {"id": "...", "type": "component"})',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_note',
        description: 'Create a note (customer insight or feedback) in Productboard',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title of the note',
            },
            content: {
              type: 'string',
              description: 'Content of the note (plain text or HTML)',
            },
            customerEmail: {
              type: 'string',
              description: 'Email of the customer who provided the feedback',
            },
            companyName: {
              type: 'string',
              description: 'Name of the company associated with the feedback',
            },
            featureIds: {
              type: 'array',
              description: 'Array of feature IDs to link this note to',
              items: { type: 'string' },
            },
            tags: {
              type: 'array',
              description: 'Array of tag strings to apply to the note',
              items: { type: 'string' },
            },
          },
          required: ['title', 'content'],
        },
      },
      {
        name: 'list_notes',
        description: 'List notes (customer insights) in Productboard',
        inputSchema: {
          type: 'object',
          properties: {
            featureId: {
              type: 'string',
              description: 'Filter notes linked to a specific feature',
            },
          },
        },
      },
      {
        name: 'list_products',
        description: 'List all products in the Productboard workspace hierarchy',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_components',
        description: 'List components in Productboard, optionally filtered by parent product',
        inputSchema: {
          type: 'object',
          properties: {
            productId: {
              type: 'string',
              description: 'Filter components belonging to a specific product',
            },
          },
        },
      },
      {
        name: 'list_releases',
        description: 'List releases defined in Productboard',
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
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        'X-Version': '1',
      };

      switch (name) {
        case 'list_features': {
          let url = `${this.baseUrl}/features`;
          const params: string[] = [];
          if (args.status) params.push(`status.name=${encodeURIComponent(args.status as string)}`);
          if (args.productId) params.push(`productId=${encodeURIComponent(args.productId as string)}`);
          if (args.componentId) params.push(`componentId=${encodeURIComponent(args.componentId as string)}`);
          if (params.length) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list features: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Productboard returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_feature': {
          const featureId = args.featureId as string;
          if (!featureId) {
            return { content: [{ type: 'text', text: 'featureId is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/features/${encodeURIComponent(featureId)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get feature: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Productboard returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_feature': {
          const featureName = args.name as string;
          if (!featureName) {
            return { content: [{ type: 'text', text: 'name is required' }], isError: true };
          }

          const body: Record<string, unknown> = { data: { name: featureName } };
          const data = body.data as Record<string, unknown>;
          if (args.description) data.description = args.description;
          if (args.status) data.status = args.status;
          if (args.parent) data.parent = args.parent;

          const response = await fetch(`${this.baseUrl}/features`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create feature: ${response.status} ${response.statusText}` }], isError: true };
          }
          let result: unknown;
          try { result = await response.json(); } catch { throw new Error(`Productboard returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: false };
        }

        case 'create_note': {
          const title = args.title as string;
          const content = args.content as string;
          if (!title || !content) {
            return { content: [{ type: 'text', text: 'title and content are required' }], isError: true };
          }

          const noteData: Record<string, unknown> = { title, content };
          if (args.customerEmail) {
            noteData.user = { email: args.customerEmail };
          }
          if (args.companyName) {
            noteData.company = { name: args.companyName };
          }
          if (args.featureIds && Array.isArray(args.featureIds)) {
            noteData.feature_id = (args.featureIds as string[])[0];
          }
          if (args.tags && Array.isArray(args.tags)) {
            noteData.tags = args.tags;
          }

          const response = await fetch(`${this.baseUrl}/notes`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ data: noteData }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create note: ${response.status} ${response.statusText}` }], isError: true };
          }
          let result: unknown;
          try { result = await response.json(); } catch { throw new Error(`Productboard returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: false };
        }

        case 'list_notes': {
          let url = `${this.baseUrl}/notes`;
          if (args.featureId) url += `?featureId=${encodeURIComponent(args.featureId as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list notes: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Productboard returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_products': {
          const response = await fetch(`${this.baseUrl}/products`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list products: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Productboard returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_components': {
          let url = `${this.baseUrl}/components`;
          if (args.productId) url += `?productId=${encodeURIComponent(args.productId as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list components: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Productboard returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_releases': {
          const response = await fetch(`${this.baseUrl}/releases`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list releases: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Productboard returned non-JSON response (HTTP ${response.status})`); }
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
