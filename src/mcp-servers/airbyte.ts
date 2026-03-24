/**
 * Airbyte MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — airbytehq/connector-builder-mcp covers connector authoring only, not general platform management via REST API.

import { ToolDefinition, ToolResult } from './types.js';

interface AirbyteConfig {
  /**
   * Bearer access token for the Airbyte Cloud API.
   * Obtain via POST https://api.airbyte.com/v1/applications/token
   * using your client_id and client_secret.
   */
  accessToken: string;
  /**
   * Override the API base URL (e.g. for self-managed Airbyte Enterprise).
   * Defaults to https://api.airbyte.com/v1
   */
  baseUrl?: string;
}

export class AirbyteMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: AirbyteConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.airbyte.com/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workspaces',
        description: 'List all workspaces accessible to the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of workspaces to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Number of workspaces to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_sources',
        description: 'List all sources in a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID to list sources for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of sources to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Number of sources to skip for pagination (default: 0)',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'list_destinations',
        description: 'List all destinations in a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID to list destinations for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of destinations to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Number of destinations to skip for pagination (default: 0)',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'list_connections',
        description: 'List all connections in a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID to list connections for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of connections to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Number of connections to skip for pagination (default: 0)',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'get_connection',
        description: 'Get details of a specific connection by ID',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: {
              type: 'string',
              description: 'The connection ID to retrieve',
            },
          },
          required: ['connectionId'],
        },
      },
      {
        name: 'trigger_sync',
        description: 'Trigger a sync or reset job for a connection',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: {
              type: 'string',
              description: 'The connection ID to trigger a job for',
            },
            jobType: {
              type: 'string',
              description: 'Type of job to trigger: "sync" (default) or "reset"',
            },
          },
          required: ['connectionId'],
        },
      },
      {
        name: 'list_jobs',
        description: 'List sync/reset jobs for a connection',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: {
              type: 'string',
              description: 'The connection ID to list jobs for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of jobs to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Number of jobs to skip for pagination (default: 0)',
            },
            jobType: {
              type: 'string',
              description: 'Filter by job type: "sync" or "reset"',
            },
            status: {
              type: 'string',
              description: 'Filter by status: "pending", "running", "succeeded", "failed", "cancelled"',
            },
          },
          required: ['connectionId'],
        },
      },
      {
        name: 'get_job',
        description: 'Get details and current status of a specific job by ID',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: {
              type: 'string',
              description: 'The job ID to retrieve',
            },
          },
          required: ['jobId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_workspaces': {
          const limit = (args.limit as number) || 20;
          const offset = (args.offset as number) || 0;

          const response = await fetch(
            `${this.baseUrl}/workspaces?limit=${limit}&offset=${offset}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list workspaces: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Airbyte returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_sources': {
          const workspaceId = args.workspaceId as string;

          if (!workspaceId) {
            return {
              content: [{ type: 'text', text: 'workspaceId is required' }],
              isError: true,
            };
          }

          const limit = (args.limit as number) || 20;
          const offset = (args.offset as number) || 0;

          const response = await fetch(
            `${this.baseUrl}/sources?workspaceId=${encodeURIComponent(workspaceId)}&limit=${limit}&offset=${offset}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list sources: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Airbyte returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_destinations': {
          const workspaceId = args.workspaceId as string;

          if (!workspaceId) {
            return {
              content: [{ type: 'text', text: 'workspaceId is required' }],
              isError: true,
            };
          }

          const limit = (args.limit as number) || 20;
          const offset = (args.offset as number) || 0;

          const response = await fetch(
            `${this.baseUrl}/destinations?workspaceId=${encodeURIComponent(workspaceId)}&limit=${limit}&offset=${offset}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list destinations: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Airbyte returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_connections': {
          const workspaceId = args.workspaceId as string;

          if (!workspaceId) {
            return {
              content: [{ type: 'text', text: 'workspaceId is required' }],
              isError: true,
            };
          }

          const limit = (args.limit as number) || 20;
          const offset = (args.offset as number) || 0;

          const response = await fetch(
            `${this.baseUrl}/connections?workspaceId=${encodeURIComponent(workspaceId)}&limit=${limit}&offset=${offset}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list connections: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Airbyte returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_connection': {
          const connectionId = args.connectionId as string;

          if (!connectionId) {
            return {
              content: [{ type: 'text', text: 'connectionId is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/connections/${encodeURIComponent(connectionId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get connection: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Airbyte returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'trigger_sync': {
          const connectionId = args.connectionId as string;

          if (!connectionId) {
            return {
              content: [{ type: 'text', text: 'connectionId is required' }],
              isError: true,
            };
          }

          const jobType = (args.jobType as string) || 'sync';

          const response = await fetch(`${this.baseUrl}/jobs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ connectionId, jobType }),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to trigger sync: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Airbyte returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_jobs': {
          const connectionId = args.connectionId as string;

          if (!connectionId) {
            return {
              content: [{ type: 'text', text: 'connectionId is required' }],
              isError: true,
            };
          }

          const limit = (args.limit as number) || 20;
          const offset = (args.offset as number) || 0;

          let url = `${this.baseUrl}/jobs?connectionId=${encodeURIComponent(connectionId)}&limit=${limit}&offset=${offset}`;
          if (args.jobType) url += `&jobType=${encodeURIComponent(args.jobType as string)}`;
          if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list jobs: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Airbyte returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_job': {
          const jobId = args.jobId as string;

          if (!jobId) {
            return {
              content: [{ type: 'text', text: 'jobId is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/jobs/${encodeURIComponent(jobId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get job: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Airbyte returned non-JSON response (HTTP ${response.status})`); }
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
