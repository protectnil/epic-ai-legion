/**
 * Sonatype Nexus Repository MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/sonatype/dependency-management-mcp-server — focused on dependency intelligence/OSS health, not Nexus repo management.
// No official Nexus repository-management MCP server exists. This adapter owns that space.

import { ToolDefinition, ToolResult } from './types.js';

interface SonatypeNexusConfig {
  baseUrl: string;
  username: string;
  password: string;
}

export class SonatypeNexusMCPServer {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: SonatypeNexusConfig) {
    // baseUrl: root Nexus URL, e.g. https://nexus.example.com (no trailing slash)
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_repositories',
        description: 'List all repositories configured in Nexus Repository Manager',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_repository',
        description: 'Get configuration details for a specific repository',
        inputSchema: {
          type: 'object',
          properties: {
            repositoryName: {
              type: 'string',
              description: 'Name of the repository',
            },
          },
          required: ['repositoryName'],
        },
      },
      {
        name: 'search_components',
        description: 'Search for components (artifacts) across repositories',
        inputSchema: {
          type: 'object',
          properties: {
            repository: {
              type: 'string',
              description: 'Limit search to this repository name',
            },
            format: {
              type: 'string',
              description: 'Repository format to search: maven2, npm, pypi, docker, helm, raw, etc.',
            },
            group: {
              type: 'string',
              description: 'Component group / Maven groupId',
            },
            name: {
              type: 'string',
              description: 'Component name / Maven artifactId',
            },
            version: {
              type: 'string',
              description: 'Component version',
            },
            continuationToken: {
              type: 'string',
              description: 'Continuation token for paginating through results',
            },
          },
        },
      },
      {
        name: 'get_component',
        description: 'Get details for a specific component by its Nexus component ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Nexus component ID (obtained from search results)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_component',
        description: 'Delete a component and all its associated assets from Nexus',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Nexus component ID to delete',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_assets',
        description: 'List assets (individual files) in a repository, with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            repository: {
              type: 'string',
              description: 'Repository name to list assets from',
            },
            continuationToken: {
              type: 'string',
              description: 'Continuation token for paginating through results',
            },
          },
          required: ['repository'],
        },
      },
      {
        name: 'get_asset',
        description: 'Get details for a specific asset by its Nexus asset ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Nexus asset ID (obtained from list_assets or search results)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_system_status',
        description: 'Get the health and status of the Nexus Repository server',
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
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_repositories': {
          const url = `${this.baseUrl}/service/rest/v1/repositories`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list repositories: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Nexus returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_repository': {
          const repositoryName = args.repositoryName as string;
          if (!repositoryName) {
            return { content: [{ type: 'text', text: 'repositoryName is required' }], isError: true };
          }

          const url = `${this.baseUrl}/service/rest/v1/repositories/${encodeURIComponent(repositoryName)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get repository: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Nexus returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_components': {
          const params: string[] = [];
          if (args.repository) params.push(`repository=${encodeURIComponent(args.repository as string)}`);
          if (args.format) params.push(`format=${encodeURIComponent(args.format as string)}`);
          if (args.group) params.push(`group=${encodeURIComponent(args.group as string)}`);
          if (args.name) params.push(`name=${encodeURIComponent(args.name as string)}`);
          if (args.version) params.push(`version=${encodeURIComponent(args.version as string)}`);
          if (args.continuationToken) params.push(`continuationToken=${encodeURIComponent(args.continuationToken as string)}`);

          const url = `${this.baseUrl}/service/rest/v1/search${params.length > 0 ? '?' + params.join('&') : ''}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to search components: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Nexus returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_component': {
          const id = args.id as string;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }

          const url = `${this.baseUrl}/service/rest/v1/components/${encodeURIComponent(id)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get component: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Nexus returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_component': {
          const id = args.id as string;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }

          const url = `${this.baseUrl}/service/rest/v1/components/${encodeURIComponent(id)}`;
          const response = await fetch(url, { method: 'DELETE', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to delete component: ${response.status} ${response.statusText}` }], isError: true };
          }
          return { content: [{ type: 'text', text: `Component ${id} deleted successfully` }], isError: false };
        }

        case 'list_assets': {
          const repository = args.repository as string;
          if (!repository) {
            return { content: [{ type: 'text', text: 'repository is required' }], isError: true };
          }

          let url = `${this.baseUrl}/service/rest/v1/assets?repository=${encodeURIComponent(repository)}`;
          if (args.continuationToken) url += `&continuationToken=${encodeURIComponent(args.continuationToken as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list assets: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Nexus returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_asset': {
          const id = args.id as string;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }

          const url = `${this.baseUrl}/service/rest/v1/assets/${encodeURIComponent(id)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get asset: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Nexus returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_system_status': {
          const url = `${this.baseUrl}/service/rest/v1/status/check`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get system status: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Nexus returned non-JSON response (HTTP ${response.status})`); }
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
