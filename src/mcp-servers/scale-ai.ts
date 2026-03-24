/**
 * Scale AI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no official MCP server from Scale AI (scaleapi) as of March 2026.
// Scale AI has a "mcp-atlas" repo under github.com/scaleapi but it is an unrelated MCP registry
// utility, not an MCP server for the Scale AI data labeling platform.
// This adapter covers the Scale AI REST API (https://api.scale.com/v1) directly.

import { ToolDefinition, ToolResult } from './types.js';

interface ScaleAIConfig {
  apiKey: string;
  baseUrl?: string;
}

export class ScaleAIMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ScaleAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.scale.com/v1';
  }

  // Scale AI uses HTTP Basic auth: API key as the username, empty password.
  // The Authorization header value is "Basic <base64(apiKey:)>".
  private get authHeader(): string {
    const encoded = Buffer.from(`${this.apiKey}:`).toString('base64');
    return `Basic ${encoded}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_tasks',
        description: 'List Scale AI data labeling tasks, optionally filtered by project, batch, or status',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Filter tasks by project name',
            },
            batch: {
              type: 'string',
              description: 'Filter tasks by batch name',
            },
            status: {
              type: 'string',
              description: 'Filter by task status: pending, completed, canceled, error',
            },
            limit: {
              type: 'number',
              description: 'Number of tasks to return per page (max 100, default: 20)',
            },
          },
        },
      },
      {
        name: 'get_task',
        description: 'Retrieve a single Scale AI task by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'The unique ID of the task',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'cancel_task',
        description: 'Cancel a pending Scale AI task',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'The unique ID of the task to cancel',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'create_batch',
        description: 'Create a new batch to group labeling tasks',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The project name to associate the batch with',
            },
            name: {
              type: 'string',
              description: 'A unique name for this batch',
            },
            calibration_batch: {
              type: 'boolean',
              description: 'If true, tasks in this batch are used for calibration (default: false)',
            },
          },
          required: ['project', 'name'],
        },
      },
      {
        name: 'get_batch',
        description: 'Retrieve the status and metadata of a batch by name',
        inputSchema: {
          type: 'object',
          properties: {
            batch_name: {
              type: 'string',
              description: 'The unique name of the batch',
            },
          },
          required: ['batch_name'],
        },
      },
      {
        name: 'finalize_batch',
        description: 'Finalize a batch to signal that all tasks have been submitted and work can begin',
        inputSchema: {
          type: 'object',
          properties: {
            batch_name: {
              type: 'string',
              description: 'The unique name of the batch to finalize',
            },
          },
          required: ['batch_name'],
        },
      },
      {
        name: 'get_project',
        description: 'Retrieve details and configuration for a Scale AI project',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'The unique name of the project',
            },
          },
          required: ['project_name'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all Scale AI projects accessible with this API key',
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
      };

      switch (name) {
        case 'list_tasks': {
          const params = new URLSearchParams();
          if (args.project) params.set('project', args.project as string);
          if (args.batch) params.set('batch', args.batch as string);
          if (args.status) params.set('status', args.status as string);
          if (args.limit) params.set('limit', String(args.limit as number));

          const qs = params.toString() ? `?${params.toString()}` : '';
          const response = await fetch(`${this.baseUrl}/tasks${qs}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list tasks: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Scale AI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_task': {
          const taskId = args.task_id as string;
          if (!taskId) {
            return {
              content: [{ type: 'text', text: 'task_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/task/${encodeURIComponent(taskId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get task: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Scale AI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'cancel_task': {
          const taskId = args.task_id as string;
          if (!taskId) {
            return {
              content: [{ type: 'text', text: 'task_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/task/${encodeURIComponent(taskId)}/cancel`,
            { method: 'POST', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to cancel task: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Scale AI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_batch': {
          const project = args.project as string;
          const batchName = args.name as string;
          if (!project || !batchName) {
            return {
              content: [{ type: 'text', text: 'project and name are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { project, name: batchName };
          if (typeof args.calibration_batch === 'boolean') {
            body.calibration_batch = args.calibration_batch;
          }

          const response = await fetch(`${this.baseUrl}/batches`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create batch: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Scale AI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_batch': {
          const batchName = args.batch_name as string;
          if (!batchName) {
            return {
              content: [{ type: 'text', text: 'batch_name is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/batches/${encodeURIComponent(batchName)}/status`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get batch: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Scale AI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'finalize_batch': {
          const batchName = args.batch_name as string;
          if (!batchName) {
            return {
              content: [{ type: 'text', text: 'batch_name is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/batches/${encodeURIComponent(batchName)}/finalize`,
            { method: 'POST', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to finalize batch: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Scale AI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_project': {
          const projectName = args.project_name as string;
          if (!projectName) {
            return {
              content: [{ type: 'text', text: 'project_name is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/projects/${encodeURIComponent(projectName)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get project: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Scale AI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_projects': {
          const response = await fetch(`${this.baseUrl}/projects`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list projects: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Scale AI returned non-JSON response (HTTP ${response.status})`); }
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
