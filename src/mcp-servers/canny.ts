/**
 * Canny MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no official Canny-vendor MCP server exists.
// Community servers (opensourceops/canny-mcp-server, itsocialist/canny-mcp-server) are third-party.
// Base URL: https://canny.io/api/v1
// Auth: All requests pass apiKey as a POST body parameter (form-encoded or JSON).
// Find your API key in Canny Settings → API.

import { ToolDefinition, ToolResult } from './types.js';

interface CannyConfig {
  apiKey: string;
  baseUrl?: string;
}

export class CannyMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CannyConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://canny.io/api/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_boards',
        description: 'List all feedback boards for the company',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_posts',
        description: 'List posts (feature requests) on a board with optional filtering and sorting',
        inputSchema: {
          type: 'object',
          properties: {
            boardID: {
              type: 'string',
              description: 'ID of the board to list posts from',
            },
            status: {
              type: 'string',
              description: 'Filter by post status (e.g., "open", "under review", "planned", "in progress", "complete", "closed")',
            },
            search: {
              type: 'string',
              description: 'Text to search for in post titles and details',
            },
            sort: {
              type: 'string',
              description: 'Sort order: newest, oldest, relevance, score, statusChanged, trending (default: newest)',
            },
            limit: {
              type: 'number',
              description: 'Number of posts to return (default: 10, max: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of posts to skip for pagination (default: 0)',
            },
          },
          required: ['boardID'],
        },
      },
      {
        name: 'get_post',
        description: 'Get a single post by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The ID of the post to retrieve',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_post',
        description: 'Create a new post (feature request) on a board',
        inputSchema: {
          type: 'object',
          properties: {
            authorID: {
              type: 'string',
              description: 'ID of the Canny user who is creating the post',
            },
            boardID: {
              type: 'string',
              description: 'ID of the board to create the post on',
            },
            title: {
              type: 'string',
              description: 'Title of the post',
            },
            details: {
              type: 'string',
              description: 'Additional details or description for the post',
            },
            categoryID: {
              type: 'string',
              description: 'ID of the category to assign the post to',
            },
          },
          required: ['authorID', 'boardID', 'title'],
        },
      },
      {
        name: 'change_post_status',
        description: 'Change the status of a post',
        inputSchema: {
          type: 'object',
          properties: {
            postID: {
              type: 'string',
              description: 'ID of the post to update',
            },
            status: {
              type: 'string',
              description: 'New status for the post: open, under review, planned, in progress, complete, closed',
            },
            changerID: {
              type: 'string',
              description: 'ID of the Canny admin user making the change',
            },
            shouldNotifyVoters: {
              type: 'boolean',
              description: 'Whether to send a notification to voters about the status change (default: true)',
            },
            commentValue: {
              type: 'string',
              description: 'Optional comment to post alongside the status change',
            },
          },
          required: ['postID', 'status', 'changerID'],
        },
      },
      {
        name: 'list_votes',
        description: 'List votes on a post or board',
        inputSchema: {
          type: 'object',
          properties: {
            postID: {
              type: 'string',
              description: 'ID of the post to list votes for',
            },
            boardID: {
              type: 'string',
              description: 'ID of the board to list votes for',
            },
            limit: {
              type: 'number',
              description: 'Number of votes to return (default: 10, max: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of votes to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_comments',
        description: 'List comments on a post',
        inputSchema: {
          type: 'object',
          properties: {
            postID: {
              type: 'string',
              description: 'ID of the post to list comments for',
            },
            limit: {
              type: 'number',
              description: 'Number of comments to return (1-100, default: 10)',
            },
            skip: {
              type: 'number',
              description: 'Number of comments to skip for pagination (default: 0)',
            },
          },
          required: ['postID'],
        },
      },
      {
        name: 'create_comment',
        description: 'Create a comment on a post',
        inputSchema: {
          type: 'object',
          properties: {
            authorID: {
              type: 'string',
              description: 'ID of the Canny user who is posting the comment',
            },
            postID: {
              type: 'string',
              description: 'ID of the post to comment on',
            },
            value: {
              type: 'string',
              description: 'Text content of the comment',
            },
            isInternal: {
              type: 'boolean',
              description: 'Whether the comment is internal (visible only to admins, default: false)',
            },
          },
          required: ['authorID', 'postID', 'value'],
        },
      },
      {
        name: 'list_users',
        description: 'List users in the Canny company',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of users to return (default: 10, max: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of users to skip for pagination (default: 0)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const post = async (path: string, params: Record<string, unknown>): Promise<Response> => {
        const body = JSON.stringify({ apiKey: this.apiKey, ...params });
        return fetch(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
      };

      switch (name) {
        case 'list_boards': {
          const response = await post('/boards/list', {});
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list boards: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Canny returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_posts': {
          const boardID = args.boardID as string;
          if (!boardID) {
            return { content: [{ type: 'text', text: 'boardID is required' }], isError: true };
          }

          const params: Record<string, unknown> = { boardID };
          if (args.status) params.status = args.status;
          if (args.search) params.search = args.search;
          if (args.sort) params.sort = args.sort;
          if (args.limit) params.limit = args.limit;
          if (args.skip !== undefined) params.skip = args.skip;

          const response = await post('/posts/list', params);
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list posts: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Canny returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_post': {
          const id = args.id as string;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }

          const response = await post('/posts/retrieve', { id });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get post: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Canny returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_post': {
          const authorID = args.authorID as string;
          const boardID = args.boardID as string;
          const title = args.title as string;
          if (!authorID || !boardID || !title) {
            return { content: [{ type: 'text', text: 'authorID, boardID, and title are required' }], isError: true };
          }

          const params: Record<string, unknown> = { authorID, boardID, title };
          if (args.details) params.details = args.details;
          if (args.categoryID) params.categoryID = args.categoryID;

          const response = await post('/posts/create', params);
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create post: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Canny returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'change_post_status': {
          const postID = args.postID as string;
          const status = args.status as string;
          const changerID = args.changerID as string;
          if (!postID || !status || !changerID) {
            return { content: [{ type: 'text', text: 'postID, status, and changerID are required' }], isError: true };
          }

          const params: Record<string, unknown> = {
            postID,
            status,
            changerID,
            shouldNotifyVoters: args.shouldNotifyVoters !== false,
          };
          if (args.commentValue) params.commentValue = args.commentValue;

          const response = await post('/posts/change_status', params);
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to change post status: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Canny returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_votes': {
          const params: Record<string, unknown> = {};
          if (args.postID) params.postID = args.postID;
          if (args.boardID) params.boardID = args.boardID;
          if (args.limit) params.limit = args.limit;
          if (args.skip !== undefined) params.skip = args.skip;

          const response = await post('/votes/list', params);
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list votes: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Canny returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_comments': {
          const postID = args.postID as string;
          if (!postID) {
            return { content: [{ type: 'text', text: 'postID is required' }], isError: true };
          }

          const params: Record<string, unknown> = { postID };
          if (args.limit) params.limit = args.limit;
          if (args.skip !== undefined) params.skip = args.skip;

          const response = await post('/comments/list', params);
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list comments: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Canny returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_comment': {
          const authorID = args.authorID as string;
          const postID = args.postID as string;
          const value = args.value as string;
          if (!authorID || !postID || !value) {
            return { content: [{ type: 'text', text: 'authorID, postID, and value are required' }], isError: true };
          }

          const params: Record<string, unknown> = { authorID, postID, value };
          if (typeof args.isInternal === 'boolean') params.isInternal = args.isInternal;

          const response = await post('/comments/create', params);
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create comment: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Canny returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_users': {
          const params: Record<string, unknown> = {};
          if (args.limit) params.limit = args.limit;
          if (args.skip !== undefined) params.skip = args.skip;

          const response = await post('/users/list', params);
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list users: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Canny returned non-JSON response (HTTP ${response.status})`); }
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
