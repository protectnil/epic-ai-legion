/**
 * Smartsheet MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/smartsheet-platform/smar-mcp — self-hostable, actively maintained.
// Our adapter is a lightweight self-hosted fallback for air-gapped / API-key-only deployments.
// Regional base URL variants: https://api.smartsheet.eu/2.0 (EU), https://api.smartsheet.au/2.0 (AU).

import { ToolDefinition, ToolResult } from './types.js';

interface SmartsheetConfig {
  accessToken: string;
  baseUrl?: string;
}

export class SmartsheetMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: SmartsheetConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.smartsheet.com/2.0';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_sheets',
        description: 'List all sheets accessible to the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            include: {
              type: 'string',
              description: 'Comma-separated optional fields: attachments, discussions, source, sourceTemplates',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 100, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_sheet',
        description: 'Get a sheet by its ID, including all rows, columns, and cells',
        inputSchema: {
          type: 'object',
          properties: {
            sheetId: {
              type: 'string',
              description: 'The ID of the sheet to retrieve',
            },
            include: {
              type: 'string',
              description: 'Comma-separated optional fields: attachments, crossSheetReferences, discussions, filters, format, ganttConfig, objectValue, ownerInfo, rowPermalink, source',
            },
            rowNumbers: {
              type: 'string',
              description: 'Comma-separated list of row numbers to include (1-based)',
            },
            columnIds: {
              type: 'string',
              description: 'Comma-separated list of column IDs to include',
            },
          },
          required: ['sheetId'],
        },
      },
      {
        name: 'add_rows',
        description: 'Add one or more rows to a sheet',
        inputSchema: {
          type: 'object',
          properties: {
            sheetId: {
              type: 'string',
              description: 'The ID of the sheet to add rows to',
            },
            rows: {
              type: 'array',
              description: 'Array of row objects. Each row has cells (array of {columnId, value}) and optional positioning: toTop, toBottom, parentId, siblingId, above.',
              items: { type: 'object' },
            },
          },
          required: ['sheetId', 'rows'],
        },
      },
      {
        name: 'update_rows',
        description: 'Update one or more existing rows in a sheet',
        inputSchema: {
          type: 'object',
          properties: {
            sheetId: {
              type: 'string',
              description: 'The ID of the sheet containing the rows',
            },
            rows: {
              type: 'array',
              description: 'Array of row objects. Each row must have id and cells (array of {columnId, value}).',
              items: { type: 'object' },
            },
          },
          required: ['sheetId', 'rows'],
        },
      },
      {
        name: 'delete_rows',
        description: 'Delete one or more rows from a sheet',
        inputSchema: {
          type: 'object',
          properties: {
            sheetId: {
              type: 'string',
              description: 'The ID of the sheet containing the rows',
            },
            rowIds: {
              type: 'array',
              description: 'Array of row IDs to delete',
              items: { type: 'string' },
            },
          },
          required: ['sheetId', 'rowIds'],
        },
      },
      {
        name: 'get_columns',
        description: 'Get all columns defined in a sheet',
        inputSchema: {
          type: 'object',
          properties: {
            sheetId: {
              type: 'string',
              description: 'The ID of the sheet',
            },
            include: {
              type: 'string',
              description: 'Optional: "filters" to include column filter definitions',
            },
          },
          required: ['sheetId'],
        },
      },
      {
        name: 'search_sheets',
        description: 'Search across all sheets (or a specific sheet) for a query string in cell values, comments, and attachment names',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Text to search for',
            },
            scopes: {
              type: 'string',
              description: 'Comma-separated scopes: attachmentName, cellData, commentBody, formulaKeyword, rowData, sheetName, summaryFields',
            },
            sheetId: {
              type: 'string',
              description: 'If provided, restricts the search to a specific sheet (uses GET /sheets/{sheetId}/search)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_current_user',
        description: 'Get the profile of the currently authenticated user',
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
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_sheets': {
          let url = `${this.baseUrl}/sheets`;
          const params: string[] = [];
          if (args.include) params.push(`include=${encodeURIComponent(args.include as string)}`);
          if (args.page) params.push(`page=${args.page}`);
          if (args.pageSize) params.push(`pageSize=${args.pageSize}`);
          if (params.length) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list sheets: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Smartsheet returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_sheet': {
          const sheetId = args.sheetId as string;
          if (!sheetId) {
            return { content: [{ type: 'text', text: 'sheetId is required' }], isError: true };
          }

          let url = `${this.baseUrl}/sheets/${encodeURIComponent(sheetId)}`;
          const params: string[] = [];
          if (args.include) params.push(`include=${encodeURIComponent(args.include as string)}`);
          if (args.rowNumbers) params.push(`rowNumbers=${encodeURIComponent(args.rowNumbers as string)}`);
          if (args.columnIds) params.push(`columnIds=${encodeURIComponent(args.columnIds as string)}`);
          if (params.length) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get sheet: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Smartsheet returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'add_rows': {
          const sheetId = args.sheetId as string;
          const rows = args.rows as unknown[];
          if (!sheetId || !rows || !Array.isArray(rows) || rows.length === 0) {
            return { content: [{ type: 'text', text: 'sheetId and rows (non-empty array) are required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/sheets/${encodeURIComponent(sheetId)}/rows`, {
            method: 'POST',
            headers,
            body: JSON.stringify(rows),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to add rows: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Smartsheet returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_rows': {
          const sheetId = args.sheetId as string;
          const rows = args.rows as unknown[];
          if (!sheetId || !rows || !Array.isArray(rows) || rows.length === 0) {
            return { content: [{ type: 'text', text: 'sheetId and rows (non-empty array) are required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/sheets/${encodeURIComponent(sheetId)}/rows`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(rows),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update rows: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Smartsheet returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_rows': {
          const sheetId = args.sheetId as string;
          const rowIds = args.rowIds as string[];
          if (!sheetId || !rowIds || !Array.isArray(rowIds) || rowIds.length === 0) {
            return { content: [{ type: 'text', text: 'sheetId and rowIds (non-empty array) are required' }], isError: true };
          }

          const idList = rowIds.join(',');
          const response = await fetch(`${this.baseUrl}/sheets/${encodeURIComponent(sheetId)}/rows?ids=${encodeURIComponent(idList)}`, {
            method: 'DELETE',
            headers,
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to delete rows: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Smartsheet returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_columns': {
          const sheetId = args.sheetId as string;
          if (!sheetId) {
            return { content: [{ type: 'text', text: 'sheetId is required' }], isError: true };
          }

          let url = `${this.baseUrl}/sheets/${encodeURIComponent(sheetId)}/columns`;
          if (args.include) url += `?include=${encodeURIComponent(args.include as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get columns: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Smartsheet returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_sheets': {
          const query = args.query as string;
          if (!query) {
            return { content: [{ type: 'text', text: 'query is required' }], isError: true };
          }

          let url: string;
          if (args.sheetId) {
            url = `${this.baseUrl}/sheets/${encodeURIComponent(args.sheetId as string)}/search?query=${encodeURIComponent(query)}`;
          } else {
            url = `${this.baseUrl}/search?query=${encodeURIComponent(query)}`;
          }
          if (args.scopes) url += `&scopes=${encodeURIComponent(args.scopes as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to search: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Smartsheet returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_current_user': {
          const response = await fetch(`${this.baseUrl}/users/me`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get current user: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Smartsheet returned non-JSON response (HTTP ${response.status})`); }
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
