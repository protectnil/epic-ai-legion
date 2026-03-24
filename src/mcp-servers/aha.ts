/**
 * Aha! MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/aha-develop/aha-mcp — self-hostable, API-key auth, limited tools.
// Our adapter is a lightweight self-hosted fallback with broader endpoint coverage.
// Base URL pattern: https://{subdomain}.aha.io/api/v1 — subdomain is your Aha! account name.
// Auth: Bearer token — generate an API key at Settings → Personal → Developer → API keys.

import { ToolDefinition, ToolResult } from './types.js';

interface AhaConfig {
  apiKey: string;
  subdomain: string;
  baseUrl?: string;
}

export class AhaMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: AhaConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || `https://${config.subdomain}.aha.io/api/v1`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_products',
        description: 'List all products (workspaces) in the Aha! account',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Number of results per page (default: 30, max: 200)',
            },
          },
        },
      },
      {
        name: 'list_features',
        description: 'List features for a product, optionally filtered by release',
        inputSchema: {
          type: 'object',
          properties: {
            productId: {
              type: 'string',
              description: 'Product ID or reference prefix (e.g., "PRJ1") to list features for',
            },
            releaseId: {
              type: 'string',
              description: 'Release reference (e.g., "PRJ1-R-1") to filter features by release',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Number of results per page (default: 30, max: 200)',
            },
          },
          required: ['productId'],
        },
      },
      {
        name: 'get_feature',
        description: 'Get a single feature by its reference number (e.g., "PRJ1-1")',
        inputSchema: {
          type: 'object',
          properties: {
            featureId: {
              type: 'string',
              description: 'Feature reference number (e.g., "PRJ1-1") or numeric ID',
            },
          },
          required: ['featureId'],
        },
      },
      {
        name: 'create_feature',
        description: 'Create a new feature in a release',
        inputSchema: {
          type: 'object',
          properties: {
            releaseId: {
              type: 'string',
              description: 'Release reference (e.g., "PRJ1-R-1") to create the feature in',
            },
            name: {
              type: 'string',
              description: 'Name of the feature',
            },
            description: {
              type: 'string',
              description: 'Description of the feature',
            },
            workflowStatus: {
              type: 'string',
              description: 'Workflow status name for the feature (e.g., "Under consideration")',
            },
          },
          required: ['releaseId', 'name'],
        },
      },
      {
        name: 'list_releases',
        description: 'List releases for a product',
        inputSchema: {
          type: 'object',
          properties: {
            productId: {
              type: 'string',
              description: 'Product ID or reference prefix to list releases for',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Number of results per page (default: 30, max: 200)',
            },
          },
          required: ['productId'],
        },
      },
      {
        name: 'list_ideas',
        description: 'List ideas for a product. Ideas are collected from customers and stakeholders.',
        inputSchema: {
          type: 'object',
          properties: {
            productId: {
              type: 'string',
              description: 'Product ID or reference prefix to list ideas for',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Number of results per page (default: 30, max: 200)',
            },
          },
          required: ['productId'],
        },
      },
      {
        name: 'get_idea',
        description: 'Get a single idea by its reference number (e.g., "PRJ1-I-1")',
        inputSchema: {
          type: 'object',
          properties: {
            ideaId: {
              type: 'string',
              description: 'Idea reference number (e.g., "PRJ1-I-1") or numeric ID',
            },
          },
          required: ['ideaId'],
        },
      },
      {
        name: 'list_epics',
        description: 'List epics for a product',
        inputSchema: {
          type: 'object',
          properties: {
            productId: {
              type: 'string',
              description: 'Product ID or reference prefix to list epics for',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Number of results per page (default: 30, max: 200)',
            },
          },
          required: ['productId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_products': {
          let url = `${this.baseUrl}/products`;
          const params: string[] = [];
          if (args.page) params.push(`page=${args.page}`);
          if (args.perPage) params.push(`per_page=${args.perPage}`);
          if (params.length) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list products: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Aha! returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_features': {
          const productId = args.productId as string;
          if (!productId) {
            return { content: [{ type: 'text', text: 'productId is required' }], isError: true };
          }

          let url: string;
          if (args.releaseId) {
            url = `${this.baseUrl}/releases/${encodeURIComponent(args.releaseId as string)}/features`;
          } else {
            url = `${this.baseUrl}/products/${encodeURIComponent(productId)}/features`;
          }

          const params: string[] = [];
          if (args.page) params.push(`page=${args.page}`);
          if (args.perPage) params.push(`per_page=${args.perPage}`);
          if (params.length) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list features: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Aha! returned non-JSON response (HTTP ${response.status})`); }
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
          try { data = await response.json(); } catch { throw new Error(`Aha! returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_feature': {
          const releaseId = args.releaseId as string;
          const featureName = args.name as string;
          if (!releaseId || !featureName) {
            return { content: [{ type: 'text', text: 'releaseId and name are required' }], isError: true };
          }

          const featureBody: Record<string, unknown> = { name: featureName };
          if (args.description) featureBody.description = args.description;
          if (args.workflowStatus) featureBody.workflow_status = { name: args.workflowStatus };

          const response = await fetch(`${this.baseUrl}/releases/${encodeURIComponent(releaseId)}/features`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ feature: featureBody }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create feature: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Aha! returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_releases': {
          const productId = args.productId as string;
          if (!productId) {
            return { content: [{ type: 'text', text: 'productId is required' }], isError: true };
          }

          let url = `${this.baseUrl}/products/${encodeURIComponent(productId)}/releases`;
          const params: string[] = [];
          if (args.page) params.push(`page=${args.page}`);
          if (args.perPage) params.push(`per_page=${args.perPage}`);
          if (params.length) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list releases: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Aha! returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_ideas': {
          const productId = args.productId as string;
          if (!productId) {
            return { content: [{ type: 'text', text: 'productId is required' }], isError: true };
          }

          let url = `${this.baseUrl}/products/${encodeURIComponent(productId)}/ideas`;
          const params: string[] = [];
          if (args.page) params.push(`page=${args.page}`);
          if (args.perPage) params.push(`per_page=${args.perPage}`);
          if (params.length) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list ideas: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Aha! returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_idea': {
          const ideaId = args.ideaId as string;
          if (!ideaId) {
            return { content: [{ type: 'text', text: 'ideaId is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/ideas/${encodeURIComponent(ideaId)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get idea: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Aha! returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_epics': {
          const productId = args.productId as string;
          if (!productId) {
            return { content: [{ type: 'text', text: 'productId is required' }], isError: true };
          }

          let url = `${this.baseUrl}/products/${encodeURIComponent(productId)}/master_features`;
          const params: string[] = [];
          if (args.page) params.push(`page=${args.page}`);
          if (args.perPage) params.push(`per_page=${args.perPage}`);
          if (params.length) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list epics: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Aha! returned non-JSON response (HTTP ${response.status})`); }
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
