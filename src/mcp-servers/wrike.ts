/**
 * Wrike MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://developers.wrike.com/wrike-mcp/ — Wrike ships a hosted MCP server (OAuth, no self-hosting).
// This adapter serves the personal API token / self-hosted / air-gapped use case.
// EU data residency: set baseUrl to https://app-eu.wrike.com/api/v4 for EU-hosted accounts.
// The correct host is returned in the OAuth token response as the "host" field.

import { ToolDefinition, ToolResult } from './types.js';

interface WrikeConfig {
  /**
   * Wrike permanent API token or OAuth2 access token.
   * Header format: Authorization: bearer {token}
   * Obtain a permanent token from: Wrike Profile > Apps & Integrations > API.
   */
  apiToken: string;
  /**
   * Base URL for the Wrike API.
   * Default (US): https://www.wrike.com/api/v4
   * EU data residency: https://app-eu.wrike.com/api/v4
   * The correct URL is provided as the "host" field in the OAuth token response.
   */
  baseUrl?: string;
}

const WRIKE_BASE_URL_US = 'https://www.wrike.com/api/v4';

export class WrikeMCPServer {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: WrikeConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = (config.baseUrl || WRIKE_BASE_URL_US).replace(/\/$/, '');
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_contacts',
        description: 'Retrieve all contacts (users and user groups) in the Wrike account',
        inputSchema: {
          type: 'object',
          properties: {
            me: {
              type: 'boolean',
              description: 'If true, return only the current user\'s contact (default: false)',
            },
          },
        },
      },
      {
        name: 'get_folders',
        description: 'Retrieve the root folder tree for a Wrike account or space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: {
              type: 'string',
              description: 'Space ID to list folders within (optional — omit for root tree)',
            },
          },
        },
      },
      {
        name: 'get_tasks',
        description: 'Retrieve tasks from a Wrike folder or project with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            folderId: {
              type: 'string',
              description: 'Folder or project ID to list tasks from',
            },
            status: {
              type: 'string',
              description: 'Filter by status: Active, Completed, Deferred, or Cancelled (optional)',
            },
            importance: {
              type: 'string',
              description: 'Filter by importance: High, Normal, or Low (optional)',
            },
            startDate: {
              type: 'string',
              description: 'Filter tasks starting on or after this date (YYYY-MM-DD) (optional)',
            },
            dueDate: {
              type: 'string',
              description: 'Filter tasks due on or before this date (YYYY-MM-DD) (optional)',
            },
            subTasks: {
              type: 'boolean',
              description: 'Include subtasks (default: false)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of tasks to return (max: 1000, default: 100)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of tasks per page (max: 1000)',
            },
            nextPageToken: {
              type: 'string',
              description: 'Pagination token from a previous response (optional)',
            },
          },
          required: ['folderId'],
        },
      },
      {
        name: 'get_task',
        description: 'Retrieve a single Wrike task by its task ID',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'Wrike task ID',
            },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'create_task',
        description: 'Create a new task in a Wrike folder or project',
        inputSchema: {
          type: 'object',
          properties: {
            folderId: {
              type: 'string',
              description: 'Folder or project ID to create the task in',
            },
            title: {
              type: 'string',
              description: 'Task title',
            },
            description: {
              type: 'string',
              description: 'Task description (optional)',
            },
            status: {
              type: 'string',
              description: 'Task status: Active, Completed, Deferred, or Cancelled (optional)',
            },
            importance: {
              type: 'string',
              description: 'Task importance: High, Normal, or Low (optional)',
            },
            dates: {
              type: 'object',
              description: 'Date object with optional start (YYYY-MM-DD) and due (YYYY-MM-DD) fields (optional)',
            },
            responsibles: {
              type: 'array',
              description: 'Array of contact IDs to assign as responsibles (optional)',
              items: { type: 'string' },
            },
          },
          required: ['folderId', 'title'],
        },
      },
      {
        name: 'update_task',
        description: 'Update fields on an existing Wrike task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'Wrike task ID',
            },
            title: {
              type: 'string',
              description: 'New task title (optional)',
            },
            description: {
              type: 'string',
              description: 'New task description (optional)',
            },
            status: {
              type: 'string',
              description: 'New status: Active, Completed, Deferred, or Cancelled (optional)',
            },
            importance: {
              type: 'string',
              description: 'New importance: High, Normal, or Low (optional)',
            },
            dates: {
              type: 'object',
              description: 'Date object with optional start (YYYY-MM-DD) and due (YYYY-MM-DD) fields (optional)',
            },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'get_comments',
        description: 'Retrieve comments for a specific Wrike task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'Wrike task ID',
            },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'create_comment',
        description: 'Post a comment on a Wrike task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'Wrike task ID',
            },
            text: {
              type: 'string',
              description: 'Comment text',
            },
          },
          required: ['taskId', 'text'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'get_contacts': {
          const url = args.me === true
            ? `${this.baseUrl}/contacts?me=true`
            : `${this.baseUrl}/contacts`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get contacts: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Wrike returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_folders': {
          let url: string;

          if (args.spaceId) {
            url = `${this.baseUrl}/spaces/${encodeURIComponent(args.spaceId as string)}/folders`;
          } else {
            url = `${this.baseUrl}/folders`;
          }

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get folders: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Wrike returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_tasks': {
          const folderId = args.folderId as string;

          if (!folderId) {
            return {
              content: [{ type: 'text', text: 'folderId is required' }],
              isError: true,
            };
          }

          const params = new URLSearchParams();
          if (args.status) params.set('status', args.status as string);
          if (args.importance) params.set('importance', args.importance as string);
          if (args.startDate) params.set('startDate', `{"start":"${args.startDate as string}"}`);
          if (args.dueDate) params.set('dueDate', `{"end":"${args.dueDate as string}"}`);
          if (args.subTasks === true) params.set('subTasks', 'true');
          if (args.limit) params.set('limit', String(args.limit));
          if (args.pageSize) params.set('pageSize', String(args.pageSize));
          if (args.nextPageToken) params.set('nextPageToken', args.nextPageToken as string);

          const qs = params.toString() ? `?${params.toString()}` : '';
          const response = await fetch(
            `${this.baseUrl}/folders/${encodeURIComponent(folderId)}/tasks${qs}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get tasks: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Wrike returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_task': {
          const taskId = args.taskId as string;

          if (!taskId) {
            return {
              content: [{ type: 'text', text: 'taskId is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/tasks/${encodeURIComponent(taskId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get task: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Wrike returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_task': {
          const folderId = args.folderId as string;
          const title = args.title as string;

          if (!folderId || !title) {
            return {
              content: [{ type: 'text', text: 'folderId and title are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { title };
          if (args.description) body.description = args.description;
          if (args.status) body.status = args.status;
          if (args.importance) body.importance = args.importance;
          if (args.dates) body.dates = args.dates;
          if (args.responsibles) body.responsibles = args.responsibles;

          const response = await fetch(
            `${this.baseUrl}/folders/${encodeURIComponent(folderId)}/tasks`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create task: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Wrike returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_task': {
          const taskId = args.taskId as string;

          if (!taskId) {
            return {
              content: [{ type: 'text', text: 'taskId is required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {};
          if (args.title) body.title = args.title;
          if (args.description !== undefined) body.description = args.description;
          if (args.status) body.status = args.status;
          if (args.importance) body.importance = args.importance;
          if (args.dates) body.dates = args.dates;

          const response = await fetch(
            `${this.baseUrl}/tasks/${encodeURIComponent(taskId)}`,
            { method: 'PUT', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to update task: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Wrike returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_comments': {
          const taskId = args.taskId as string;

          if (!taskId) {
            return {
              content: [{ type: 'text', text: 'taskId is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/tasks/${encodeURIComponent(taskId)}/comments`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get comments: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Wrike returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_comment': {
          const taskId = args.taskId as string;
          const text = args.text as string;

          if (!taskId || !text) {
            return {
              content: [{ type: 'text', text: 'taskId and text are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/tasks/${encodeURIComponent(taskId)}/comments`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({ text }),
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create comment: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Wrike returned non-JSON response (HTTP ${response.status})`); }
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
