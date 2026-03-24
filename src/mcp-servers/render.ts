/**
 * Render MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/render-oss/render-mcp-server — actively maintained, covers services, databases, logs, metrics, and Postgres query tools

import { ToolDefinition, ToolResult } from './types.js';

interface RenderConfig {
  apiKey: string;
  baseUrl?: string;
}

export class RenderMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: RenderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.render.com/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_services',
        description: 'List all services in the Render account',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by service type: web_service, private_service, background_worker, cron_job, static_site',
            },
            name: {
              type: 'string',
              description: 'Filter services by name substring',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (max 100, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_service',
        description: 'Retrieve details for a specific Render service by its service ID',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Render service ID (e.g. srv-abc123)',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'trigger_deploy',
        description: 'Trigger a new deploy for a Render service. Optionally specify a commit SHA or clear the build cache.',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Render service ID to deploy',
            },
            clear_cache: {
              type: 'string',
              description: 'Whether to clear the build cache: do_not_clear (default) or clear',
            },
            commit_id: {
              type: 'string',
              description: 'Specific commit SHA to deploy. Omit to deploy the latest commit.',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'list_deploys',
        description: 'List deploys for a specific Render service',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Render service ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of deploys to return (max 100, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'list_env_vars',
        description: 'List all environment variables for a Render service',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Render service ID',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'update_env_vars',
        description: 'Replace all environment variables for a Render service. This is a full replacement — include all desired variables in the array.',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Render service ID',
            },
            env_vars: {
              type: 'array',
              description: 'Array of environment variable objects with key and value fields',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string', description: 'Environment variable key' },
                  value: { type: 'string', description: 'Environment variable value' },
                },
              },
            },
          },
          required: ['service_id', 'env_vars'],
        },
      },
      {
        name: 'suspend_service',
        description: 'Suspend a Render service, stopping all running instances',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Render service ID to suspend',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'resume_service',
        description: 'Resume a previously suspended Render service',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Render service ID to resume',
            },
          },
          required: ['service_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_services': {
          const limit = (args.limit as number) || 20;
          const params = new URLSearchParams({ limit: String(limit) });
          if (args.type) params.set('type', args.type as string);
          if (args.name) params.set('name', args.name as string);
          if (args.cursor) params.set('cursor', args.cursor as string);

          const response = await fetch(`${this.baseUrl}/services?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list services: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Render returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_service': {
          const serviceId = args.service_id as string;
          if (!serviceId) {
            return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/services/${serviceId}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get service ${serviceId}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Render returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'trigger_deploy': {
          const serviceId = args.service_id as string;
          if (!serviceId) {
            return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
          }
          const body: Record<string, unknown> = {};
          if (args.clear_cache) body.clearCache = args.clear_cache;
          if (args.commit_id) body.commitId = args.commit_id;

          const response = await fetch(`${this.baseUrl}/services/${serviceId}/deploys`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to trigger deploy for ${serviceId}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Render returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_deploys': {
          const serviceId = args.service_id as string;
          if (!serviceId) {
            return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
          }
          const limit = (args.limit as number) || 20;
          const params = new URLSearchParams({ limit: String(limit) });
          if (args.cursor) params.set('cursor', args.cursor as string);

          const response = await fetch(`${this.baseUrl}/services/${serviceId}/deploys?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list deploys for ${serviceId}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Render returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_env_vars': {
          const serviceId = args.service_id as string;
          if (!serviceId) {
            return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/services/${serviceId}/env-vars`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list env vars for ${serviceId}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Render returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_env_vars': {
          const serviceId = args.service_id as string;
          const envVars = args.env_vars as Array<{ key: string; value: string }>;
          if (!serviceId || !envVars) {
            return { content: [{ type: 'text', text: 'service_id and env_vars are required' }], isError: true };
          }
          // PUT /services/{serviceId}/env-vars replaces the full set of env vars
          const response = await fetch(`${this.baseUrl}/services/${serviceId}/env-vars`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(envVars),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update env vars for ${serviceId}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Render returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'suspend_service': {
          const serviceId = args.service_id as string;
          if (!serviceId) {
            return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/services/${serviceId}/suspend`, {
            method: 'POST',
            headers,
            body: JSON.stringify({}),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to suspend service ${serviceId}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Render returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'resume_service': {
          const serviceId = args.service_id as string;
          if (!serviceId) {
            return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/services/${serviceId}/resume`, {
            method: 'POST',
            headers,
            body: JSON.stringify({}),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to resume service ${serviceId}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Render returned non-JSON response (HTTP ${response.status})`); }
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
