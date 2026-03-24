/**
 * ClickUp MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no official ClickUp-published MCP server exists on GitHub as of March 2026.
// Community servers exist (e.g. taazkareem/clickup-mcp-server) but none are published by ClickUp Inc.

import { ToolDefinition, ToolResult } from './types.js';

interface ClickUpConfig {
  /**
   * Personal API token (begins with "pk_") or OAuth2 access token.
   * Header format: Authorization: {token} — no "Bearer" prefix for personal tokens.
   * OAuth access tokens also use the same header format per ClickUp v2 docs.
   */
  apiToken: string;
  baseUrl?: string;
}

const CLICKUP_BASE_URL = 'https://api.clickup.com/api/v2';

export class ClickUpMCPServer {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: ClickUpConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = (config.baseUrl || CLICKUP_BASE_URL).replace(/\/$/, '');
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_authorized_user',
        description: 'Retrieve the authenticated user profile and their authorized workspaces',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_workspaces',
        description: 'List all workspaces (teams) authorized for the current API token',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_spaces',
        description: 'List all Spaces in a ClickUp workspace',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: {
              type: 'string',
              description: 'Workspace (team) ID',
            },
            archived: {
              type: 'boolean',
              description: 'Include archived Spaces (default: false)',
            },
          },
          required: ['teamId'],
        },
      },
      {
        name: 'get_lists',
        description: 'List all Lists in a ClickUp Space (not in a Folder)',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: {
              type: 'string',
              description: 'Space ID',
            },
            archived: {
              type: 'boolean',
              description: 'Include archived Lists (default: false)',
            },
          },
          required: ['spaceId'],
        },
      },
      {
        name: 'get_tasks',
        description: 'Retrieve tasks from a ClickUp List with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            listId: {
              type: 'string',
              description: 'List ID to retrieve tasks from',
            },
            archived: {
              type: 'boolean',
              description: 'Include archived tasks (default: false)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            orderBy: {
              type: 'string',
              description: 'Sort field: id, created, updated, or due_date (default: created)',
            },
            reverse: {
              type: 'boolean',
              description: 'Reverse the sort order (default: false)',
            },
            subtasks: {
              type: 'boolean',
              description: 'Include subtasks (default: false)',
            },
            statuses: {
              type: 'string',
              description: 'Comma-separated list of status names to filter by (optional)',
            },
            assignees: {
              type: 'string',
              description: 'Comma-separated list of assignee user IDs to filter by (optional)',
            },
            dueDateGt: {
              type: 'number',
              description: 'Filter tasks with due date greater than this Unix timestamp in ms (optional)',
            },
            dueDateLt: {
              type: 'number',
              description: 'Filter tasks with due date less than this Unix timestamp in ms (optional)',
            },
          },
          required: ['listId'],
        },
      },
      {
        name: 'get_task',
        description: 'Retrieve a single ClickUp task by its task ID',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'ClickUp task ID',
            },
            customTaskIds: {
              type: 'boolean',
              description: 'If true, treat taskId as a custom task ID (requires teamId)',
            },
            teamId: {
              type: 'string',
              description: 'Workspace (team) ID — required when customTaskIds is true',
            },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'create_task',
        description: 'Create a new task in a ClickUp List',
        inputSchema: {
          type: 'object',
          properties: {
            listId: {
              type: 'string',
              description: 'List ID to create the task in',
            },
            name: {
              type: 'string',
              description: 'Task name',
            },
            description: {
              type: 'string',
              description: 'Task description (plain text, optional)',
            },
            assignees: {
              type: 'array',
              description: 'Array of user IDs to assign (optional)',
              items: { type: 'number' },
            },
            tags: {
              type: 'array',
              description: 'Array of tag names to apply (optional)',
              items: { type: 'string' },
            },
            status: {
              type: 'string',
              description: 'Status name (optional, defaults to the first status in the List)',
            },
            priority: {
              type: 'number',
              description: 'Priority: 1 (urgent), 2 (high), 3 (normal), 4 (low) (optional)',
            },
            dueDate: {
              type: 'number',
              description: 'Due date as Unix timestamp in milliseconds (optional)',
            },
            parentId: {
              type: 'string',
              description: 'Parent task ID to create this task as a subtask (optional)',
            },
          },
          required: ['listId', 'name'],
        },
      },
      {
        name: 'update_task',
        description: 'Update fields on an existing ClickUp task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'ClickUp task ID',
            },
            name: {
              type: 'string',
              description: 'New task name (optional)',
            },
            description: {
              type: 'string',
              description: 'New task description (optional)',
            },
            status: {
              type: 'string',
              description: 'New status name (optional)',
            },
            priority: {
              type: 'number',
              description: 'Priority: 1 (urgent), 2 (high), 3 (normal), 4 (low) (optional)',
            },
            dueDate: {
              type: 'number',
              description: 'New due date as Unix timestamp in milliseconds (optional)',
            },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'create_task_comment',
        description: 'Post a comment on a ClickUp task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'ClickUp task ID',
            },
            commentText: {
              type: 'string',
              description: 'Text content of the comment',
            },
            assignee: {
              type: 'number',
              description: 'User ID to assign the comment to (optional)',
            },
            notifyAll: {
              type: 'boolean',
              description: 'Notify all assignees of the task (default: false)',
            },
          },
          required: ['taskId', 'commentText'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: this.apiToken,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'get_authorized_user': {
          const response = await fetch(`${this.baseUrl}/user`, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get authorized user: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ClickUp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_workspaces': {
          const response = await fetch(`${this.baseUrl}/team`, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get workspaces: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ClickUp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_spaces': {
          const teamId = args.teamId as string;

          if (!teamId) {
            return {
              content: [{ type: 'text', text: 'teamId is required' }],
              isError: true,
            };
          }

          const archived = args.archived === true ? 'true' : 'false';
          const response = await fetch(
            `${this.baseUrl}/team/${encodeURIComponent(teamId)}/space?archived=${archived}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get spaces: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ClickUp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_lists': {
          const spaceId = args.spaceId as string;

          if (!spaceId) {
            return {
              content: [{ type: 'text', text: 'spaceId is required' }],
              isError: true,
            };
          }

          const archived = args.archived === true ? 'true' : 'false';
          const response = await fetch(
            `${this.baseUrl}/space/${encodeURIComponent(spaceId)}/list?archived=${archived}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get lists: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ClickUp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_tasks': {
          const listId = args.listId as string;

          if (!listId) {
            return {
              content: [{ type: 'text', text: 'listId is required' }],
              isError: true,
            };
          }

          const params = new URLSearchParams();
          params.set('archived', args.archived === true ? 'true' : 'false');
          params.set('page', String((args.page as number) || 0));
          if (args.orderBy) params.set('order_by', args.orderBy as string);
          if (args.reverse === true) params.set('reverse', 'true');
          if (args.subtasks === true) params.set('subtasks', 'true');
          if (args.statuses) {
            for (const s of (args.statuses as string).split(',')) {
              params.append('statuses[]', s.trim());
            }
          }
          if (args.assignees) {
            for (const a of (args.assignees as string).split(',')) {
              params.append('assignees[]', a.trim());
            }
          }
          if (args.dueDateGt) params.set('due_date_gt', String(args.dueDateGt));
          if (args.dueDateLt) params.set('due_date_lt', String(args.dueDateLt));

          const response = await fetch(
            `${this.baseUrl}/list/${encodeURIComponent(listId)}/task?${params.toString()}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get tasks: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ClickUp returned non-JSON response (HTTP ${response.status})`); }
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

          const params = new URLSearchParams();
          if (args.customTaskIds === true) {
            params.set('custom_task_ids', 'true');
            if (args.teamId) params.set('team_id', args.teamId as string);
          }

          const qs = params.toString() ? `?${params.toString()}` : '';
          const response = await fetch(
            `${this.baseUrl}/task/${encodeURIComponent(taskId)}${qs}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get task: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ClickUp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_task': {
          const listId = args.listId as string;
          const taskName = args.name as string;

          if (!listId || !taskName) {
            return {
              content: [{ type: 'text', text: 'listId and name are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { name: taskName };
          if (args.description) body.description = args.description;
          if (args.assignees) body.assignees = args.assignees;
          if (args.tags) body.tags = args.tags;
          if (args.status) body.status = args.status;
          if (args.priority !== undefined) body.priority = args.priority;
          if (args.dueDate !== undefined) body.due_date = args.dueDate;
          if (args.parentId) body.parent = args.parentId;

          const response = await fetch(
            `${this.baseUrl}/list/${encodeURIComponent(listId)}/task`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create task: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ClickUp returned non-JSON response (HTTP ${response.status})`); }
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
          if (args.name) body.name = args.name;
          if (args.description !== undefined) body.description = args.description;
          if (args.status) body.status = args.status;
          if (args.priority !== undefined) body.priority = args.priority;
          if (args.dueDate !== undefined) body.due_date = args.dueDate;

          const response = await fetch(
            `${this.baseUrl}/task/${encodeURIComponent(taskId)}`,
            { method: 'PUT', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to update task: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ClickUp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_task_comment': {
          const taskId = args.taskId as string;
          const commentText = args.commentText as string;

          if (!taskId || !commentText) {
            return {
              content: [{ type: 'text', text: 'taskId and commentText are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            comment_text: commentText,
            notify_all: args.notifyAll === true,
          };
          if (args.assignee !== undefined) body.assignee = args.assignee;

          const response = await fetch(
            `${this.baseUrl}/task/${encodeURIComponent(taskId)}/comment`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create comment: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ClickUp returned non-JSON response (HTTP ${response.status})`); }
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
