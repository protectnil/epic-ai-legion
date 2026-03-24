/**
 * Postman MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/postmanlabs/postman-mcp-server — 100+ tools, actively maintained, hosted at mcp.postman.com with OAuth. Our adapter serves the API-key use case and self-hosted/air-gapped deployments that cannot use OAuth.

import { ToolDefinition, ToolResult } from './types.js';

interface PostmanConfig {
  apiKey: string;
  baseUrl?: string;
}

export class PostmanMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: PostmanConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.getpostman.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workspaces',
        description: 'List all Postman workspaces accessible by the API key',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by workspace type: personal, team, private, public, partner (optional)',
            },
          },
        },
      },
      {
        name: 'get_workspace',
        description: 'Get details for a specific Postman workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'The workspace ID (UUID)',
            },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'list_collections',
        description: 'List all collections in the account, optionally filtered by workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: {
              type: 'string',
              description: 'Filter collections by workspace ID (optional)',
            },
          },
        },
      },
      {
        name: 'get_collection',
        description: 'Get the full definition of a Postman collection including all requests',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: {
              type: 'string',
              description: 'The collection UID (e.g. 12345678-abcd-1234-...)',
            },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'create_collection',
        description: 'Create a new Postman collection in a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: {
              type: 'string',
              description: 'The workspace ID to create the collection in',
            },
            name: {
              type: 'string',
              description: 'Name of the new collection',
            },
            description: {
              type: 'string',
              description: 'Description for the collection (optional)',
            },
          },
          required: ['workspace', 'name'],
        },
      },
      {
        name: 'delete_collection',
        description: 'Delete a Postman collection by ID',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: {
              type: 'string',
              description: 'The collection UID to delete',
            },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'list_environments',
        description: 'List all environments in the account, optionally filtered by workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: {
              type: 'string',
              description: 'Filter environments by workspace ID (optional)',
            },
          },
        },
      },
      {
        name: 'get_environment',
        description: 'Get the full definition of a Postman environment including all variables',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'The environment UID',
            },
          },
          required: ['environment_id'],
        },
      },
      {
        name: 'create_environment',
        description: 'Create a new Postman environment with optional initial variables',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: {
              type: 'string',
              description: 'The workspace ID to create the environment in',
            },
            name: {
              type: 'string',
              description: 'Name of the new environment',
            },
            values: {
              type: 'array',
              description: 'Array of variable objects with key, value, enabled, type fields (optional)',
            },
          },
          required: ['workspace', 'name'],
        },
      },
      {
        name: 'list_apis',
        description: 'List all APIs defined in a Postman workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: {
              type: 'string',
              description: 'The workspace ID to list APIs from',
            },
          },
          required: ['workspace'],
        },
      },
      {
        name: 'get_api',
        description: 'Get details for a specific Postman API definition',
        inputSchema: {
          type: 'object',
          properties: {
            api_id: {
              type: 'string',
              description: 'The API ID',
            },
          },
          required: ['api_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_workspaces': {
          let url = `${this.baseUrl}/workspaces`;
          if (args.type) url += `?type=${encodeURIComponent(args.type as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list workspaces: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Postman returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_workspace': {
          const workspaceId = args.workspace_id as string;

          if (!workspaceId) {
            return {
              content: [{ type: 'text', text: 'workspace_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/workspaces/${encodeURIComponent(workspaceId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get workspace: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Postman returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_collections': {
          let url = `${this.baseUrl}/collections`;
          if (args.workspace) url += `?workspace=${encodeURIComponent(args.workspace as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list collections: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Postman returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_collection': {
          const collectionId = args.collection_id as string;

          if (!collectionId) {
            return {
              content: [{ type: 'text', text: 'collection_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/collections/${encodeURIComponent(collectionId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get collection: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Postman returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_collection': {
          const workspace = args.workspace as string;
          const collectionName = args.name as string;

          if (!workspace || !collectionName) {
            return {
              content: [{ type: 'text', text: 'workspace and name are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            collection: {
              info: {
                name: collectionName,
                schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
              },
            },
          };
          if (args.description) {
            (body.collection as Record<string, unknown>).description = args.description;
          }

          const response = await fetch(
            `${this.baseUrl}/collections?workspace=${encodeURIComponent(workspace)}`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create collection: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Postman returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_collection': {
          const collectionId = args.collection_id as string;

          if (!collectionId) {
            return {
              content: [{ type: 'text', text: 'collection_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/collections/${encodeURIComponent(collectionId)}`,
            { method: 'DELETE', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to delete collection: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Postman returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_environments': {
          let url = `${this.baseUrl}/environments`;
          if (args.workspace) url += `?workspace=${encodeURIComponent(args.workspace as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list environments: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Postman returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_environment': {
          const environmentId = args.environment_id as string;

          if (!environmentId) {
            return {
              content: [{ type: 'text', text: 'environment_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/environments/${encodeURIComponent(environmentId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get environment: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Postman returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_environment': {
          const workspace = args.workspace as string;
          const envName = args.name as string;

          if (!workspace || !envName) {
            return {
              content: [{ type: 'text', text: 'workspace and name are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            environment: {
              name: envName,
              values: args.values || [],
            },
          };

          const response = await fetch(
            `${this.baseUrl}/environments?workspace=${encodeURIComponent(workspace)}`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create environment: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Postman returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_apis': {
          const workspace = args.workspace as string;

          if (!workspace) {
            return {
              content: [{ type: 'text', text: 'workspace is required' }],
              isError: true,
            };
          }

          const url = `${this.baseUrl}/apis?workspace=${encodeURIComponent(workspace)}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list APIs: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Postman returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_api': {
          const apiId = args.api_id as string;

          if (!apiId) {
            return {
              content: [{ type: 'text', text: 'api_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/apis/${encodeURIComponent(apiId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get API: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Postman returned non-JSON response (HTTP ${response.status})`); }
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
