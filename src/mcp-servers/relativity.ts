/**
 * Relativity MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no official Relativity eDiscovery MCP server exists on GitHub as of March 2026.

import { ToolDefinition, ToolResult } from './types.js';

interface RelativityConfig {
  /** OAuth2 Bearer access token obtained from {host}/Relativity/Identity/connect/token */
  accessToken: string;
  /** Base URL for the Relativity instance, e.g. https://myinstance.relativity.one/Relativity.Rest/API */
  baseUrl: string;
}

export class RelativityMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: RelativityConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workspaces',
        description: 'List all workspaces accessible to the authenticated user in Relativity',
        inputSchema: {
          type: 'object',
          properties: {
            start: {
              type: 'number',
              description: 'Starting index for pagination (default: 1)',
            },
            length: {
              type: 'number',
              description: 'Number of workspaces to return (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_workspace',
        description: 'Retrieve details for a specific Relativity workspace by its Artifact ID',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'number',
              description: 'Artifact ID of the workspace. Use -1 for admin-level context.',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'search_documents',
        description: 'Run a keyword search against documents in a Relativity workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'number',
              description: 'Artifact ID of the workspace to search within',
            },
            searchText: {
              type: 'string',
              description: 'Keyword search string',
            },
            start: {
              type: 'number',
              description: 'Starting index for pagination (default: 1)',
            },
            length: {
              type: 'number',
              description: 'Number of results to return (default: 25)',
            },
          },
          required: ['workspaceId', 'searchText'],
        },
      },
      {
        name: 'get_document',
        description: 'Retrieve metadata and fields for a specific document artifact in a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'number',
              description: 'Artifact ID of the workspace containing the document',
            },
            documentId: {
              type: 'number',
              description: 'Artifact ID of the document',
            },
          },
          required: ['workspaceId', 'documentId'],
        },
      },
      {
        name: 'list_saved_searches',
        description: 'List all saved searches in a Relativity workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'number',
              description: 'Artifact ID of the workspace',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'run_saved_search',
        description: 'Execute a saved search in a Relativity workspace and return matching documents',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'number',
              description: 'Artifact ID of the workspace',
            },
            searchId: {
              type: 'number',
              description: 'Artifact ID of the saved search to execute',
            },
            start: {
              type: 'number',
              description: 'Starting index for pagination (default: 1)',
            },
            length: {
              type: 'number',
              description: 'Number of results to return (default: 25)',
            },
          },
          required: ['workspaceId', 'searchId'],
        },
      },
      {
        name: 'list_matters',
        description: 'List matters (cases) in Relativity at the admin level',
        inputSchema: {
          type: 'object',
          properties: {
            start: {
              type: 'number',
              description: 'Starting index for pagination (default: 1)',
            },
            length: {
              type: 'number',
              description: 'Number of matters to return (default: 25)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-CSRF-Header': '-',
      };

      switch (name) {
        case 'list_workspaces': {
          const start = (args.start as number) || 1;
          const length = (args.length as number) || 25;

          const response = await fetch(
            `${this.baseUrl}/Relativity.Services.Workspace.IWorkspaceModule/Workspace%20Manager/QueryAsync`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                queryRequest: {
                  Fields: [
                    { Name: 'Name' },
                    { Name: 'Artifact ID' },
                    { Name: 'Status' },
                  ],
                  Condition: '',
                  Sorts: [],
                },
                start,
                length,
              }),
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list workspaces: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Relativity returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_workspace': {
          const workspaceId = args.workspaceId as number;

          if (workspaceId === undefined || workspaceId === null) {
            return {
              content: [{ type: 'text', text: 'workspaceId is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/Relativity.Services.Workspace.IWorkspaceModule/Workspace%20Manager/ReadSingleAsync`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({ workspaceArtifactID: workspaceId }),
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get workspace: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Relativity returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_documents': {
          const workspaceId = args.workspaceId as number;
          const searchText = args.searchText as string;

          if (!workspaceId || !searchText) {
            return {
              content: [{ type: 'text', text: 'workspaceId and searchText are required' }],
              isError: true,
            };
          }

          const start = (args.start as number) || 1;
          const length = (args.length as number) || 25;

          const response = await fetch(
            `${this.baseUrl}/Relativity.Services.Search.ISearchModule/Keyword%20Search%20Manager/QueryAsync`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                workspaceArtifactID: workspaceId,
                queryRequest: {
                  Fields: [
                    { Name: 'Control Number' },
                    { Name: 'File Name' },
                    { Name: 'Artifact ID' },
                  ],
                  Condition: `'Extracted Text' LIKE '${searchText.replace(/'/g, "''")}'`,
                  Sorts: [],
                },
                start,
                length,
              }),
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search documents: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Relativity returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_document': {
          const workspaceId = args.workspaceId as number;
          const documentId = args.documentId as number;

          if (!workspaceId || !documentId) {
            return {
              content: [{ type: 'text', text: 'workspaceId and documentId are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/Relativity.Services.Objects.IObjectsModule/Object%20Manager/ReadAsync`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                workspaceArtifactID: workspaceId,
                artifactID: documentId,
                fieldTypes: ['All'],
              }),
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get document: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Relativity returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_saved_searches': {
          const workspaceId = args.workspaceId as number;

          if (!workspaceId) {
            return {
              content: [{ type: 'text', text: 'workspaceId is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/Relativity.Services.Search.ISearchModule/Search%20Container%20Manager/QueryAsync`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                workspaceArtifactID: workspaceId,
                queryRequest: {
                  Fields: [{ Name: 'Name' }, { Name: 'Artifact ID' }],
                  Condition: '',
                  Sorts: [],
                },
                start: 1,
                length: 100,
              }),
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list saved searches: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Relativity returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'run_saved_search': {
          const workspaceId = args.workspaceId as number;
          const searchId = args.searchId as number;

          if (!workspaceId || !searchId) {
            return {
              content: [{ type: 'text', text: 'workspaceId and searchId are required' }],
              isError: true,
            };
          }

          const start = (args.start as number) || 1;
          const length = (args.length as number) || 25;

          const response = await fetch(
            `${this.baseUrl}/Relativity.Services.Objects.IObjectsModule/Object%20Manager/QueryAsync`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                workspaceArtifactID: workspaceId,
                queryRequest: {
                  Fields: [
                    { Name: 'Control Number' },
                    { Name: 'File Name' },
                    { Name: 'Artifact ID' },
                  ],
                  SavedSearchArtifactID: searchId,
                },
                start,
                length,
              }),
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to run saved search: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Relativity returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_matters': {
          const start = (args.start as number) || 1;
          const length = (args.length as number) || 25;

          // Matters are queried at the admin context (workspaceArtifactID = -1)
          const response = await fetch(
            `${this.baseUrl}/Relativity.Services.Objects.IObjectsModule/Object%20Manager/QueryAsync`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                workspaceArtifactID: -1,
                queryRequest: {
                  ObjectType: { ArtifactTypeID: 5 },
                  Fields: [{ Name: 'Name' }, { Name: 'Artifact ID' }, { Name: 'Status' }],
                  Condition: '',
                  Sorts: [],
                },
                start,
                length,
              }),
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list matters: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Relativity returned non-JSON response (HTTP ${response.status})`); }
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
