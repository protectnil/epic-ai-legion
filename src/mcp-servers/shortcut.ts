/**
 * Shortcut MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/useshortcut/mcp-server-shortcut — self-hostable via stdio (API token)
// OR hosted-only via OAuth. Our adapter is the API-token / self-hosted fallback for air-gapped deployments.
// Base URL: https://api.app.shortcut.com/api/v3
// Auth: Header "Shortcut-Token: {token}" — generate at https://app.shortcut.com/settings/account/api-tokens

import { ToolDefinition, ToolResult } from './types.js';

interface ShortcutConfig {
  apiToken: string;
  baseUrl?: string;
}

export class ShortcutMCPServer {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: ShortcutConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.app.shortcut.com/api/v3';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_current_member',
        description: 'Get the profile of the currently authenticated member',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_members',
        description: 'List all members in the Shortcut workspace',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_stories',
        description: 'Search for stories using Shortcut search query syntax',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string. Supports operators like owner:username, state:name, epic:name, label:name, type:feature|bug|chore',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (max 25)',
            },
            next: {
              type: 'string',
              description: 'Pagination cursor from a previous search response',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_story',
        description: 'Get a story by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            storyPublicId: {
              type: 'number',
              description: 'The numeric public ID of the story (e.g., 1234)',
            },
          },
          required: ['storyPublicId'],
        },
      },
      {
        name: 'create_story',
        description: 'Create a new story in Shortcut',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the story',
            },
            description: {
              type: 'string',
              description: 'Description of the story (Markdown supported)',
            },
            storyType: {
              type: 'string',
              description: 'Type of story: feature, bug, or chore (default: feature)',
            },
            workflowStateId: {
              type: 'number',
              description: 'ID of the workflow state to place the story in',
            },
            epicId: {
              type: 'number',
              description: 'ID of the epic to add this story to',
            },
            iterationId: {
              type: 'number',
              description: 'ID of the iteration (sprint) to add this story to',
            },
            ownerIds: {
              type: 'array',
              description: 'Array of member UUIDs to assign as owners',
              items: { type: 'string' },
            },
            labels: {
              type: 'array',
              description: 'Array of label objects with a name field, e.g. [{"name": "bug"}]',
              items: { type: 'object' },
            },
            estimate: {
              type: 'number',
              description: 'Story point estimate',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_story',
        description: 'Update an existing story',
        inputSchema: {
          type: 'object',
          properties: {
            storyPublicId: {
              type: 'number',
              description: 'The numeric public ID of the story to update',
            },
            name: {
              type: 'string',
              description: 'New name for the story',
            },
            description: {
              type: 'string',
              description: 'New description for the story',
            },
            workflowStateId: {
              type: 'number',
              description: 'New workflow state ID',
            },
            epicId: {
              type: 'number',
              description: 'New epic ID (pass null to remove from epic)',
            },
            ownerIds: {
              type: 'array',
              description: 'New array of owner member UUIDs (replaces existing owners)',
              items: { type: 'string' },
            },
            estimate: {
              type: 'number',
              description: 'New story point estimate',
            },
          },
          required: ['storyPublicId'],
        },
      },
      {
        name: 'list_epics',
        description: 'List all epics in the workspace',
        inputSchema: {
          type: 'object',
          properties: {
            includeArchived: {
              type: 'boolean',
              description: 'Whether to include archived epics (default: false)',
            },
          },
        },
      },
      {
        name: 'list_workflows',
        description: 'List all workflows and their states in the workspace',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_iterations',
        description: 'List all iterations (sprints) in the workspace',
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
        'Shortcut-Token': this.apiToken,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'get_current_member': {
          const response = await fetch(`${this.baseUrl}/member`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get current member: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Shortcut returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_members': {
          const response = await fetch(`${this.baseUrl}/members`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list members: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Shortcut returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_stories': {
          const query = args.query as string;
          if (!query) {
            return { content: [{ type: 'text', text: 'query is required' }], isError: true };
          }

          let url = `${this.baseUrl}/search/stories?query=${encodeURIComponent(query)}`;
          if (args.pageSize) url += `&page_size=${args.pageSize}`;
          if (args.next) url += `&next=${encodeURIComponent(args.next as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to search stories: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Shortcut returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_story': {
          const storyPublicId = args.storyPublicId as number;
          if (storyPublicId === undefined || storyPublicId === null) {
            return { content: [{ type: 'text', text: 'storyPublicId is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/stories/${storyPublicId}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get story: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Shortcut returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_story': {
          const storyName = args.name as string;
          if (!storyName) {
            return { content: [{ type: 'text', text: 'name is required' }], isError: true };
          }

          const body: Record<string, unknown> = {
            name: storyName,
            story_type: (args.storyType as string) || 'feature',
          };
          if (args.description) body.description = args.description;
          if (args.workflowStateId) body.workflow_state_id = args.workflowStateId;
          if (args.epicId) body.epic_id = args.epicId;
          if (args.iterationId) body.iteration_id = args.iterationId;
          if (args.ownerIds) body.owner_ids = args.ownerIds;
          if (args.labels) body.labels = args.labels;
          if (args.estimate !== undefined) body.estimate = args.estimate;

          const response = await fetch(`${this.baseUrl}/stories`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create story: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Shortcut returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_story': {
          const storyPublicId = args.storyPublicId as number;
          if (storyPublicId === undefined || storyPublicId === null) {
            return { content: [{ type: 'text', text: 'storyPublicId is required' }], isError: true };
          }

          const body: Record<string, unknown> = {};
          if (args.name) body.name = args.name;
          if (args.description !== undefined) body.description = args.description;
          if (args.workflowStateId) body.workflow_state_id = args.workflowStateId;
          if (args.epicId !== undefined) body.epic_id = args.epicId;
          if (args.ownerIds) body.owner_ids = args.ownerIds;
          if (args.estimate !== undefined) body.estimate = args.estimate;

          const response = await fetch(`${this.baseUrl}/stories/${storyPublicId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update story: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Shortcut returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_epics': {
          let url = `${this.baseUrl}/epics`;
          if (args.includeArchived === true) url += '?includes_description=true';

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list epics: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Shortcut returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_workflows': {
          const response = await fetch(`${this.baseUrl}/workflows`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list workflows: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Shortcut returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_iterations': {
          const response = await fetch(`${this.baseUrl}/iterations`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list iterations: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Shortcut returned non-JSON response (HTTP ${response.status})`); }
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
