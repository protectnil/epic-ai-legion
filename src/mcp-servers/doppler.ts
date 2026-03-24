/**
 * Doppler MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/aledlie/doppler-mcp — community-maintained CLI wrapper (not REST), not an official Doppler release. Our adapter targets the Doppler REST API v3 directly for API-key/service-token use cases without requiring the Doppler CLI.

import { ToolDefinition, ToolResult } from './types.js';

interface DopplerConfig {
  token: string;
  baseUrl?: string;
}

export class DopplerMCPServer {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: DopplerConfig) {
    this.token = config.token;
    this.baseUrl = config.baseUrl || 'https://api.doppler.com/v3';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all Doppler projects accessible by the token',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of projects per page (max 100, default: 20)',
            },
          },
        },
      },
      {
        name: 'list_configs',
        description: 'List all configs (environments) within a Doppler project',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of configs per page (max 100, default: 20)',
            },
          },
          required: ['project'],
        },
      },
      {
        name: 'list_secrets',
        description: 'List all secret names in a Doppler project config (names only, not values)',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            config: {
              type: 'string',
              description: 'The config (environment) name, e.g. prd, stg, dev',
            },
          },
          required: ['project', 'config'],
        },
      },
      {
        name: 'get_secret',
        description: 'Retrieve the value of a single secret from a Doppler project config',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            config: {
              type: 'string',
              description: 'The config (environment) name, e.g. prd, stg, dev',
            },
            name: {
              type: 'string',
              description: 'The secret name (e.g. DATABASE_URL)',
            },
          },
          required: ['project', 'config', 'name'],
        },
      },
      {
        name: 'set_secret',
        description: 'Create or update a secret in a Doppler project config',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            config: {
              type: 'string',
              description: 'The config (environment) name, e.g. prd, stg, dev',
            },
            name: {
              type: 'string',
              description: 'The secret name (e.g. DATABASE_URL)',
            },
            value: {
              type: 'string',
              description: 'The secret value to set',
            },
          },
          required: ['project', 'config', 'name', 'value'],
        },
      },
      {
        name: 'delete_secret',
        description: 'Delete a secret from a Doppler project config',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            config: {
              type: 'string',
              description: 'The config (environment) name, e.g. prd, stg, dev',
            },
            name: {
              type: 'string',
              description: 'The secret name to delete',
            },
          },
          required: ['project', 'config', 'name'],
        },
      },
      {
        name: 'download_secrets',
        description: 'Download all secrets for a project config as a flat key-value map',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            config: {
              type: 'string',
              description: 'The config (environment) name, e.g. prd, stg, dev',
            },
            format: {
              type: 'string',
              description: 'Output format: json, dotnet-json, env, yaml, docker (default: json)',
            },
          },
          required: ['project', 'config'],
        },
      },
      {
        name: 'list_service_tokens',
        description: 'List all service tokens for a Doppler project config',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            config: {
              type: 'string',
              description: 'The config (environment) name, e.g. prd, stg, dev',
            },
          },
          required: ['project', 'config'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_projects': {
          const page = (args.page as number) || 1;
          const per_page = (args.per_page as number) || 20;

          const url = `${this.baseUrl}/projects?page=${page}&per_page=${per_page}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list projects: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Doppler returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_configs': {
          const project = args.project as string;

          if (!project) {
            return {
              content: [{ type: 'text', text: 'project is required' }],
              isError: true,
            };
          }

          const page = (args.page as number) || 1;
          const per_page = (args.per_page as number) || 20;

          const url = `${this.baseUrl}/configs?project=${encodeURIComponent(project)}&page=${page}&per_page=${per_page}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list configs: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Doppler returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_secrets': {
          const project = args.project as string;
          const config = args.config as string;

          if (!project || !config) {
            return {
              content: [{ type: 'text', text: 'project and config are required' }],
              isError: true,
            };
          }

          const url = `${this.baseUrl}/configs/config/secrets?project=${encodeURIComponent(project)}&config=${encodeURIComponent(config)}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list secrets: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Doppler returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_secret': {
          const project = args.project as string;
          const config = args.config as string;
          const secretName = args.name as string;

          if (!project || !config || !secretName) {
            return {
              content: [{ type: 'text', text: 'project, config, and name are required' }],
              isError: true,
            };
          }

          const url = `${this.baseUrl}/configs/config/secret?project=${encodeURIComponent(project)}&config=${encodeURIComponent(config)}&name=${encodeURIComponent(secretName)}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get secret: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Doppler returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'set_secret': {
          const project = args.project as string;
          const config = args.config as string;
          const secretName = args.name as string;
          const value = args.value as string;

          if (!project || !config || !secretName || value === undefined) {
            return {
              content: [{ type: 'text', text: 'project, config, name, and value are required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/configs/config/secrets`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              project,
              config,
              secrets: { [secretName]: value },
            }),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to set secret: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Doppler returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_secret': {
          const project = args.project as string;
          const config = args.config as string;
          const secretName = args.name as string;

          if (!project || !config || !secretName) {
            return {
              content: [{ type: 'text', text: 'project, config, and name are required' }],
              isError: true,
            };
          }

          const url = `${this.baseUrl}/configs/config/secret?project=${encodeURIComponent(project)}&config=${encodeURIComponent(config)}&name=${encodeURIComponent(secretName)}`;
          const response = await fetch(url, { method: 'DELETE', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to delete secret: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Doppler returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'download_secrets': {
          const project = args.project as string;
          const config = args.config as string;

          if (!project || !config) {
            return {
              content: [{ type: 'text', text: 'project and config are required' }],
              isError: true,
            };
          }

          const format = (args.format as string) || 'json';
          const url = `${this.baseUrl}/configs/config/secrets/download?project=${encodeURIComponent(project)}&config=${encodeURIComponent(config)}&format=${encodeURIComponent(format)}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to download secrets: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Doppler returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_service_tokens': {
          const project = args.project as string;
          const config = args.config as string;

          if (!project || !config) {
            return {
              content: [{ type: 'text', text: 'project and config are required' }],
              isError: true,
            };
          }

          const url = `${this.baseUrl}/configs/config/tokens?project=${encodeURIComponent(project)}&config=${encodeURIComponent(config)}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list service tokens: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Doppler returned non-JSON response (HTTP ${response.status})`); }
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
