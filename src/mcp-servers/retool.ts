/**
 * Retool MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Retool-published MCP server found on GitHub. A community adapter
// (TechnicalRhino/retool-mcp) exists but is unmaintained. Retool itself supports
// connecting *to* external MCP servers from its Agents product, but does not publish
// an MCP server for managing the Retool platform via MCP.
//
// Base URL: https://api.retool.com/api/v2
// Auth: Bearer token — generate via Retool Settings → API → Create token
// Docs: https://docs.retool.com/reference/api/v2
// Rate limits: Not publicly documented; Retool API is Business/Enterprise plan only

import { ToolDefinition, ToolResult } from './types.js';

interface RetoolConfig {
  apiKey: string;
  /** Override base URL if needed (default: https://api.retool.com/api/v2) */
  baseUrl?: string;
}

export class RetoolMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: RetoolConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.retool.com/api/v2';
  }

  static catalog() {
    return {
      name: 'retool',
      displayName: 'Retool',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: ['retool', 'internal-tool', 'app', 'workflow', 'automation', 'resource', 'folder', 'user', 'group', 'space', 'permission'],
      toolNames: [
        'list_apps', 'get_app', 'list_folders', 'create_folder',
        'list_resources', 'get_resource',
        'trigger_workflow', 'list_workflows',
        'list_users', 'get_user', 'update_user',
        'list_groups', 'get_group', 'create_group',
        'list_spaces',
      ],
      description: 'Manage Retool apps, workflows, resources, users, groups, folders, and spaces via the Retool API v2.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Apps ────────────────────────────────────────────────────────────────
      {
        name: 'list_apps',
        description: 'List all Retool apps with optional pagination; returns app IDs, names, folder, and last updated time',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of apps per page (default: 25, max: 100)',
            },
            folderId: {
              type: 'string',
              description: 'Filter apps by folder ID',
            },
          },
        },
      },
      {
        name: 'get_app',
        description: 'Retrieve metadata for a single Retool app by its UUID, including name, folder, owner, and timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            appId: {
              type: 'string',
              description: 'The UUID of the Retool app',
            },
          },
          required: ['appId'],
        },
      },
      // ── Folders ─────────────────────────────────────────────────────────────
      {
        name: 'list_folders',
        description: 'List all folders in the Retool organization with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of folders per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'create_folder',
        description: 'Create a new folder in the Retool organization for organizing apps and workflows',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the new folder',
            },
            parentFolderId: {
              type: 'string',
              description: 'ID of the parent folder (omit to create at root level)',
            },
          },
          required: ['name'],
        },
      },
      // ── Resources ───────────────────────────────────────────────────────────
      {
        name: 'list_resources',
        description: 'List all data resources (databases, APIs, etc.) configured in Retool with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of resources per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_resource',
        description: 'Retrieve configuration details for a single Retool resource by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            resourceId: {
              type: 'string',
              description: 'The ID of the Retool resource',
            },
          },
          required: ['resourceId'],
        },
      },
      // ── Workflows ───────────────────────────────────────────────────────────
      {
        name: 'list_workflows',
        description: 'List all Retool workflows with optional pagination; returns workflow IDs, names, and enabled status',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of workflows per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'trigger_workflow',
        description: 'Trigger a Retool workflow by ID with an optional JSON payload; returns the workflow run result',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: {
              type: 'string',
              description: 'The UUID of the Retool workflow to trigger',
            },
            payload: {
              type: 'object',
              description: 'Optional JSON payload passed as input to the workflow',
              additionalProperties: true,
            },
          },
          required: ['workflowId'],
        },
      },
      // ── Users ───────────────────────────────────────────────────────────────
      {
        name: 'list_users',
        description: 'List all users in the Retool organization with optional pagination; returns email, role, and group membership',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of users per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Retrieve details for a single Retool user by their numeric ID, including email, role, and groups',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'The numeric ID of the Retool user',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'update_user',
        description: 'Update a Retool user\'s role or metadata by their numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'The numeric ID of the Retool user to update',
            },
            role: {
              type: 'string',
              description: 'New role for the user: viewer, editor, admin',
            },
          },
          required: ['userId'],
        },
      },
      // ── Groups ──────────────────────────────────────────────────────────────
      {
        name: 'list_groups',
        description: 'List all permission groups in the Retool organization with their member counts',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of groups per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Retrieve details and members of a single Retool permission group by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'The numeric ID of the Retool group',
            },
          },
          required: ['groupId'],
        },
      },
      {
        name: 'create_group',
        description: 'Create a new permission group in the Retool organization',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new permission group',
            },
          },
          required: ['name'],
        },
      },
      // ── Spaces ──────────────────────────────────────────────────────────────
      {
        name: 'list_spaces',
        description: 'List all Spaces in the Retool organization (Enterprise plan only); returns space names and IDs',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of spaces per page (default: 25)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_apps':
          return this.listApps(args);
        case 'get_app':
          return this.getApp(args);
        case 'list_folders':
          return this.listFolders(args);
        case 'create_folder':
          return this.createFolder(args);
        case 'list_resources':
          return this.listResources(args);
        case 'get_resource':
          return this.getResource(args);
        case 'list_workflows':
          return this.listWorkflows(args);
        case 'trigger_workflow':
          return this.triggerWorkflow(args);
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'update_user':
          return this.updateUser(args);
        case 'list_groups':
          return this.listGroups(args);
        case 'get_group':
          return this.getGroup(args);
        case 'create_group':
          return this.createGroup(args);
        case 'list_spaces':
          return this.listSpaces(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private truncate(text: string): string {
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async fetchJson(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await fetch(url, { headers: this.headers, ...init });
    if (!response.ok) {
      let detail: unknown;
      try { detail = await response.json(); } catch { detail = await response.text(); }
      return {
        content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${JSON.stringify(detail)}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private buildPageParams(args: Record<string, unknown>): URLSearchParams {
    const p = new URLSearchParams();
    if (args.page !== undefined) p.set('page', String(args.page));
    if (args.pageSize !== undefined) p.set('pageSize', String(args.pageSize));
    return p;
  }

  private async listApps(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildPageParams(args);
    if (args.folderId) p.set('folderId', args.folderId as string);
    return this.fetchJson(`${this.baseUrl}/apps?${p}`);
  }

  private async getApp(args: Record<string, unknown>): Promise<ToolResult> {
    const appId = args.appId as string;
    if (!appId) return { content: [{ type: 'text', text: 'appId is required' }], isError: true };
    return this.fetchJson(`${this.baseUrl}/apps/${encodeURIComponent(appId)}`);
  }

  private async listFolders(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildPageParams(args);
    return this.fetchJson(`${this.baseUrl}/folders?${p}`);
  }

  private async createFolder(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name };
    if (args.parentFolderId) body.parentFolderId = args.parentFolderId;
    return this.fetchJson(`${this.baseUrl}/folders`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async listResources(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildPageParams(args);
    return this.fetchJson(`${this.baseUrl}/resources?${p}`);
  }

  private async getResource(args: Record<string, unknown>): Promise<ToolResult> {
    const resourceId = args.resourceId as string;
    if (!resourceId) return { content: [{ type: 'text', text: 'resourceId is required' }], isError: true };
    return this.fetchJson(`${this.baseUrl}/resources/${encodeURIComponent(resourceId)}`);
  }

  private async listWorkflows(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildPageParams(args);
    return this.fetchJson(`${this.baseUrl}/workflows?${p}`);
  }

  private async triggerWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    const workflowId = args.workflowId as string;
    if (!workflowId) return { content: [{ type: 'text', text: 'workflowId is required' }], isError: true };
    return this.fetchJson(`${this.baseUrl}/workflows/${encodeURIComponent(workflowId)}/trigger`, {
      method: 'POST',
      body: JSON.stringify(args.payload ?? {}),
    });
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildPageParams(args);
    return this.fetchJson(`${this.baseUrl}/users?${p}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.userId as string;
    if (!userId) return { content: [{ type: 'text', text: 'userId is required' }], isError: true };
    return this.fetchJson(`${this.baseUrl}/users/${encodeURIComponent(userId)}`);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.userId as string;
    if (!userId) return { content: [{ type: 'text', text: 'userId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.role) body.role = args.role;
    return this.fetchJson(`${this.baseUrl}/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildPageParams(args);
    return this.fetchJson(`${this.baseUrl}/groups?${p}`);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const groupId = args.groupId as string;
    if (!groupId) return { content: [{ type: 'text', text: 'groupId is required' }], isError: true };
    return this.fetchJson(`${this.baseUrl}/groups/${encodeURIComponent(groupId)}`);
  }

  private async createGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.fetchJson(`${this.baseUrl}/groups`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  private async listSpaces(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildPageParams(args);
    return this.fetchJson(`${this.baseUrl}/spaces?${p}`);
  }
}
