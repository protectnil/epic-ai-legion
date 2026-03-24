/**
 * Monday.com MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/mondaycom/mcp — actively maintained by the monday.com AI team (hosted-only, requires OAuth).
// This adapter serves the personal API token / self-hosted use case.

import { ToolDefinition, ToolResult } from './types.js';

interface MondayConfig {
  /**
   * Personal V2 API token or app token.
   * Header format: Authorization: {token} — no "Bearer" prefix.
   * Obtain from: Administration > Connections > Personal API token.
   */
  apiToken: string;
  /** API version header (default: 2025-07). Monday.com uses date-based versioning. */
  apiVersion?: string;
}

const MONDAY_BASE_URL = 'https://api.monday.com/v2';

export class MondayMCPServer {
  private readonly apiToken: string;
  private readonly apiVersion: string;

  constructor(config: MondayConfig) {
    this.apiToken = config.apiToken;
    this.apiVersion = config.apiVersion || '2025-07';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_boards',
        description: 'List boards accessible to the authenticated user on monday.com',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of boards to return (default: 25, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            boardKind: {
              type: 'string',
              description: 'Filter by board kind: public, private, or share (optional)',
            },
          },
        },
      },
      {
        name: 'get_board',
        description: 'Retrieve details, columns, and groups for a specific monday.com board',
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'string',
              description: 'Numeric ID of the board',
            },
          },
          required: ['boardId'],
        },
      },
      {
        name: 'get_items',
        description: 'Retrieve items (rows) from a monday.com board with their column values',
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'string',
              description: 'Numeric ID of the board',
            },
            limit: {
              type: 'number',
              description: 'Number of items to return (default: 25, max: 500)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response (optional)',
            },
          },
          required: ['boardId'],
        },
      },
      {
        name: 'create_item',
        description: 'Create a new item (row) on a monday.com board',
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'string',
              description: 'Numeric ID of the board to add the item to',
            },
            itemName: {
              type: 'string',
              description: 'Name of the new item',
            },
            groupId: {
              type: 'string',
              description: 'ID of the group to add the item to (optional, defaults to top group)',
            },
            columnValues: {
              type: 'string',
              description: 'JSON string of column values to set, keyed by column ID (optional)',
            },
          },
          required: ['boardId', 'itemName'],
        },
      },
      {
        name: 'update_item',
        description: 'Update column values on an existing monday.com item',
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'string',
              description: 'Numeric ID of the board containing the item',
            },
            itemId: {
              type: 'string',
              description: 'Numeric ID of the item to update',
            },
            columnValues: {
              type: 'string',
              description: 'JSON string of column values to set, keyed by column ID',
            },
          },
          required: ['boardId', 'itemId', 'columnValues'],
        },
      },
      {
        name: 'create_update',
        description: 'Post an update (comment) on a monday.com item',
        inputSchema: {
          type: 'object',
          properties: {
            itemId: {
              type: 'string',
              description: 'Numeric ID of the item to post the update on',
            },
            body: {
              type: 'string',
              description: 'Text content of the update',
            },
          },
          required: ['itemId', 'body'],
        },
      },
      {
        name: 'delete_item',
        description: 'Delete an item from a monday.com board',
        inputSchema: {
          type: 'object',
          properties: {
            itemId: {
              type: 'string',
              description: 'Numeric ID of the item to delete',
            },
          },
          required: ['itemId'],
        },
      },
      {
        name: 'search_items',
        description: 'Search for items across all boards by name',
        inputSchema: {
          type: 'object',
          properties: {
            term: {
              type: 'string',
              description: 'Search term to match against item names',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 25)',
            },
          },
          required: ['term'],
        },
      },
    ];
  }

  private async runQuery(query: string, variables?: Record<string, unknown>): Promise<ToolResult> {
    const headers: Record<string, string> = {
      Authorization: this.apiToken,
      'Content-Type': 'application/json',
      'API-Version': this.apiVersion,
    };

    const body: Record<string, unknown> = { query };
    if (variables) body.variables = variables;

    const response = await fetch(MONDAY_BASE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Monday.com API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Monday.com returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_boards': {
          const limit = (args.limit as number) || 25;
          const page = (args.page as number) || 1;
          const boardKindFilter = args.boardKind ? `, board_kind: ${args.boardKind}` : '';

          const query = `query {
            boards(limit: ${limit}, page: ${page}${boardKindFilter}) {
              id
              name
              description
              board_kind
              state
              updated_at
            }
          }`;

          return await this.runQuery(query);
        }

        case 'get_board': {
          const boardId = args.boardId as string;

          if (!boardId) {
            return {
              content: [{ type: 'text', text: 'boardId is required' }],
              isError: true,
            };
          }

          const query = `query {
            boards(ids: [${boardId}]) {
              id
              name
              description
              board_kind
              state
              columns { id title type settings_str }
              groups { id title color position }
            }
          }`;

          return await this.runQuery(query);
        }

        case 'get_items': {
          const boardId = args.boardId as string;

          if (!boardId) {
            return {
              content: [{ type: 'text', text: 'boardId is required' }],
              isError: true,
            };
          }

          const limit = (args.limit as number) || 25;
          const cursorArg = args.cursor ? `, cursor: "${args.cursor as string}"` : '';

          const query = `query {
            boards(ids: [${boardId}]) {
              items_page(limit: ${limit}${cursorArg}) {
                cursor
                items {
                  id
                  name
                  state
                  updated_at
                  group { id title }
                  column_values { id text value }
                }
              }
            }
          }`;

          return await this.runQuery(query);
        }

        case 'create_item': {
          const boardId = args.boardId as string;
          const itemName = args.itemName as string;

          if (!boardId || !itemName) {
            return {
              content: [{ type: 'text', text: 'boardId and itemName are required' }],
              isError: true,
            };
          }

          const groupArg = args.groupId ? `, group_id: "${args.groupId as string}"` : '';
          const colArg = args.columnValues ? `, column_values: ${JSON.stringify(args.columnValues as string)}` : '';

          const query = `mutation {
            create_item(board_id: ${boardId}, item_name: "${itemName.replace(/"/g, '\\"')}"${groupArg}${colArg}) {
              id
              name
            }
          }`;

          return await this.runQuery(query);
        }

        case 'update_item': {
          const boardId = args.boardId as string;
          const itemId = args.itemId as string;
          const columnValues = args.columnValues as string;

          if (!boardId || !itemId || !columnValues) {
            return {
              content: [{ type: 'text', text: 'boardId, itemId, and columnValues are required' }],
              isError: true,
            };
          }

          const query = `mutation {
            change_multiple_column_values(board_id: ${boardId}, item_id: ${itemId}, column_values: ${JSON.stringify(columnValues)}) {
              id
              name
            }
          }`;

          return await this.runQuery(query);
        }

        case 'create_update': {
          const itemId = args.itemId as string;
          const body = args.body as string;

          if (!itemId || !body) {
            return {
              content: [{ type: 'text', text: 'itemId and body are required' }],
              isError: true,
            };
          }

          const query = `mutation {
            create_update(item_id: ${itemId}, body: ${JSON.stringify(body)}) {
              id
              body
              created_at
            }
          }`;

          return await this.runQuery(query);
        }

        case 'delete_item': {
          const itemId = args.itemId as string;

          if (!itemId) {
            return {
              content: [{ type: 'text', text: 'itemId is required' }],
              isError: true,
            };
          }

          const query = `mutation {
            delete_item(item_id: ${itemId}) {
              id
            }
          }`;

          return await this.runQuery(query);
        }

        case 'search_items': {
          const term = args.term as string;

          if (!term) {
            return {
              content: [{ type: 'text', text: 'term is required' }],
              isError: true,
            };
          }

          const limit = (args.limit as number) || 25;

          const query = `query {
            items_by_multiple_column_values(limit: ${limit}, board_id: null, column_id: "name", column_values: ["${term.replace(/"/g, '\\"')}"]) {
              id
              name
              board { id name }
              group { id title }
              updated_at
            }
          }`;

          return await this.runQuery(query);
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
