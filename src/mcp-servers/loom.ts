/**
 * Loom MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03 from Atlassian/Loom directly.
// Community MCP servers exist (e.g. m2ai-mcp-servers/mcp-loom-video, loom-agents.github.io)
// but none are vendor-published with stdio/streamable-HTTP transport and 10+ tools.
// Note: Loom does not publish an official public REST API. Loom's developer platform
// focuses on the Record SDK (embedded recording) and embed SDK. The REST endpoints
// used here are documented via community discovery and the Atlassian Loom developer portal.
// Enterprise customers may have access to additional API endpoints — contact Loom support.
// Our adapter covers: 12 tools (recordings, comments, folders/spaces, sharing, webhooks).
// Recommendation: Use this adapter for automation needs; evaluate official MCP if/when Atlassian publishes one.
//
// Base URL: https://api.loom.com/v1
// Auth: Bearer access token obtained via OAuth2 from the Loom Developer Portal (dev.loom.com)
// Docs: https://dev.loom.com/docs/record-sdk/details/api
// Rate limits: Not publicly documented; subject to Loom's fair use policy per account tier.

import { ToolDefinition, ToolResult } from './types.js';

interface LoomConfig {
  accessToken: string;
  baseUrl?: string;
}

export class LoomMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: LoomConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.loom.com/v1';
  }

  static catalog() {
    return {
      name: 'loom',
      displayName: 'Loom',
      version: '1.0.0',
      category: 'collaboration',
      keywords: [
        'loom', 'video', 'recording', 'async video', 'screen recording',
        'async communication', 'video message', 'walkthrough', 'demo',
        'comment', 'transcript', 'share', 'embed', 'folder', 'space',
      ],
      toolNames: [
        'list_recordings', 'get_recording', 'delete_recording', 'update_recording',
        'get_recording_transcript',
        'list_comments', 'create_comment',
        'list_folders', 'get_folder', 'create_folder',
        'generate_share_link',
        'list_webhooks',
      ],
      description: 'Loom async video: list and manage recordings, retrieve transcripts, manage comments, folders, share links, and webhooks.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_recordings',
        description: 'List Loom video recordings for the authenticated user with optional folder and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of recordings to return (default: 25, max: 100)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination cursor token from a previous response next_page_token field',
            },
            folder_id: {
              type: 'string',
              description: 'Filter recordings to a specific folder ID',
            },
          },
        },
      },
      {
        name: 'get_recording',
        description: 'Get detailed metadata for a single Loom recording by recording ID including URL, duration, and view count',
        inputSchema: {
          type: 'object',
          properties: {
            recording_id: {
              type: 'string',
              description: 'Loom recording ID (UUID format)',
            },
          },
          required: ['recording_id'],
        },
      },
      {
        name: 'delete_recording',
        description: 'Permanently delete a Loom recording by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            recording_id: {
              type: 'string',
              description: 'Loom recording ID to delete (this action is irreversible)',
            },
          },
          required: ['recording_id'],
        },
      },
      {
        name: 'update_recording',
        description: 'Update the title, description, or privacy settings of a Loom recording',
        inputSchema: {
          type: 'object',
          properties: {
            recording_id: {
              type: 'string',
              description: 'Loom recording ID to update',
            },
            title: {
              type: 'string',
              description: 'New title for the recording',
            },
            description: {
              type: 'string',
              description: 'New description for the recording',
            },
            privacy: {
              type: 'string',
              description: 'Privacy setting: public, team, or private (default: unchanged)',
            },
          },
          required: ['recording_id'],
        },
      },
      {
        name: 'get_recording_transcript',
        description: 'Retrieve the full auto-generated transcript for a Loom recording with timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            recording_id: {
              type: 'string',
              description: 'Loom recording ID to fetch the transcript for',
            },
          },
          required: ['recording_id'],
        },
      },
      {
        name: 'list_comments',
        description: 'List all comments on a Loom recording including threaded replies and timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            recording_id: {
              type: 'string',
              description: 'Loom recording ID to list comments for',
            },
          },
          required: ['recording_id'],
        },
      },
      {
        name: 'create_comment',
        description: 'Post a text comment on a Loom recording at a specific timestamp in the video',
        inputSchema: {
          type: 'object',
          properties: {
            recording_id: {
              type: 'string',
              description: 'Loom recording ID to comment on',
            },
            text: {
              type: 'string',
              description: 'Comment text content',
            },
            timestamp: {
              type: 'number',
              description: 'Video position in seconds where the comment is anchored (optional)',
            },
          },
          required: ['recording_id', 'text'],
        },
      },
      {
        name: 'list_folders',
        description: 'List Loom folders (spaces) available to the authenticated user for organizing recordings',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of folders to return (default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_folder',
        description: 'Get details of a single Loom folder including name, owner, and recording count',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: {
              type: 'string',
              description: 'Loom folder ID to retrieve',
            },
          },
          required: ['folder_id'],
        },
      },
      {
        name: 'create_folder',
        description: 'Create a new Loom folder for organizing video recordings',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the new folder',
            },
            parent_folder_id: {
              type: 'string',
              description: 'Parent folder ID to nest this folder inside (optional — creates at root if omitted)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'generate_share_link',
        description: 'Generate a shareable link for a Loom recording with optional password and expiry settings',
        inputSchema: {
          type: 'object',
          properties: {
            recording_id: {
              type: 'string',
              description: 'Loom recording ID to generate a share link for',
            },
            password: {
              type: 'string',
              description: 'Optional password to protect the share link',
            },
            expires_in_days: {
              type: 'number',
              description: 'Number of days until the link expires (optional — permanent if omitted)',
            },
          },
          required: ['recording_id'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List configured Loom webhook endpoints for recording events like creation and deletion',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of webhooks to return (default: 25)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_recordings':
          return this.listRecordings(args);
        case 'get_recording':
          return this.getRecording(args);
        case 'delete_recording':
          return this.deleteRecording(args);
        case 'update_recording':
          return this.updateRecording(args);
        case 'get_recording_transcript':
          return this.getRecordingTranscript(args);
        case 'list_comments':
          return this.listComments(args);
        case 'create_comment':
          return this.createComment(args);
        case 'list_folders':
          return this.listFolders(args);
        case 'get_folder':
          return this.getFolder(args);
        case 'create_folder':
          return this.createFolder(args);
        case 'generate_share_link':
          return this.generateShareLink(args);
        case 'list_webhooks':
          return this.listWebhooks(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/${path}${qs ? '?' + qs : ''}`;
    const response = await fetch(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/${path}`;
    const response = await fetch(url, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/${path}`;
    const response = await fetch(url, { method: 'PATCH', headers: this.headers, body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const url = `${this.baseUrl}/${path}`;
    const response = await fetch(url, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  private async listRecordings(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
    };
    if (args.page_token) params['page_token'] = args.page_token as string;
    if (args.folder_id) params['folder_id'] = args.folder_id as string;
    return this.apiGet('recordings', params);
  }

  private async getRecording(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recording_id) return { content: [{ type: 'text', text: 'recording_id is required' }], isError: true };
    return this.apiGet(`recordings/${args.recording_id}`);
  }

  private async deleteRecording(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recording_id) return { content: [{ type: 'text', text: 'recording_id is required' }], isError: true };
    return this.apiDelete(`recordings/${args.recording_id}`);
  }

  private async updateRecording(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recording_id) return { content: [{ type: 'text', text: 'recording_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.title) body['title'] = args.title;
    if (args.description) body['description'] = args.description;
    if (args.privacy) body['privacy'] = args.privacy;
    return this.apiPatch(`recordings/${args.recording_id}`, body);
  }

  private async getRecordingTranscript(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recording_id) return { content: [{ type: 'text', text: 'recording_id is required' }], isError: true };
    return this.apiGet(`recordings/${args.recording_id}/transcripts`);
  }

  private async listComments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recording_id) return { content: [{ type: 'text', text: 'recording_id is required' }], isError: true };
    return this.apiGet(`recordings/${args.recording_id}/comments`);
  }

  private async createComment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recording_id || !args.text) return { content: [{ type: 'text', text: 'recording_id and text are required' }], isError: true };
    const body: Record<string, unknown> = { body: args.text };
    if (typeof args.timestamp === 'number') body['timestamp'] = args.timestamp;
    return this.apiPost(`recordings/${args.recording_id}/comments`, body);
  }

  private async listFolders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
    };
    if (args.page_token) params['page_token'] = args.page_token as string;
    return this.apiGet('folders', params);
  }

  private async getFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.folder_id) return { content: [{ type: 'text', text: 'folder_id is required' }], isError: true };
    return this.apiGet(`folders/${args.folder_id}`);
  }

  private async createFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.parent_folder_id) body['parent_folder_id'] = args.parent_folder_id;
    return this.apiPost('folders', body);
  }

  private async generateShareLink(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recording_id) return { content: [{ type: 'text', text: 'recording_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.password) body['password'] = args.password;
    if (typeof args.expires_in_days === 'number') body['expires_in_days'] = args.expires_in_days;
    return this.apiPost(`recordings/${args.recording_id}/share`, body);
  }

  private async listWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
    };
    return this.apiGet('webhooks', params);
  }
}
