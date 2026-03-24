/**
 * Tableau MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/tableau/tableau-mcp — actively maintained, self-hostable via npx, PAT auth.
// That server covers the same use case. This adapter serves as a lightweight self-hosted fallback
// for air-gapped deployments and environments where npx is not available.

import { ToolDefinition, ToolResult } from './types.js';

interface TableauConfig {
  /**
   * Hostname or IP of the Tableau Server, or "https://prod-useast-a.online.tableau.com" for Tableau Cloud.
   * Do NOT include "/api/{version}" — that is appended automatically.
   */
  serverUrl: string;
  /**
   * Tableau REST API version to use (e.g. "3.21", "3.24").
   * See https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_whats_new.htm
   */
  apiVersion: string;
  /**
   * Personal Access Token name (from the Tableau user settings page).
   */
  patName: string;
  /**
   * Personal Access Token secret value.
   */
  patSecret: string;
  /**
   * The content URL (subpath) of the site to sign in to.
   * Use an empty string "" for the Default site on Tableau Server.
   * For Tableau Cloud, this is the site name shown in the URL.
   */
  siteContentUrl: string;
}

export class TableauMCPServer {
  private readonly serverUrl: string;
  private readonly apiVersion: string;
  private readonly patName: string;
  private readonly patSecret: string;
  private readonly siteContentUrl: string;
  private credentialsToken: string | null = null;
  private siteId: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: TableauConfig) {
    this.serverUrl = config.serverUrl.replace(/\/$/, '');
    this.apiVersion = config.apiVersion;
    this.patName = config.patName;
    this.patSecret = config.patSecret;
    this.siteContentUrl = config.siteContentUrl;
  }

  private get apiBase(): string {
    return `${this.serverUrl}/api/${this.apiVersion}`;
  }

  /**
   * Sign in via POST /api/{version}/auth/signin using Personal Access Token credentials.
   * Returns a credentials token valid for 240 minutes.
   * Auth body format documented at:
   * https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_concepts_auth.htm
   */
  private async getCredentialsToken(): Promise<{ token: string; siteId: string }> {
    const now = Date.now();
    if (this.credentialsToken && this.siteId && now < this.tokenExpiresAt - 60000) {
      return { token: this.credentialsToken, siteId: this.siteId };
    }

    const response = await fetch(`${this.apiBase}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        credentials: {
          personalAccessTokenName: this.patName,
          personalAccessTokenSecret: this.patSecret,
          site: { contentUrl: this.siteContentUrl },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Tableau sign-in failed: HTTP ${response.status} ${response.statusText}`);
    }

    let data: { credentials: { token: string; site: { id: string } } };
    try {
      data = await response.json() as { credentials: { token: string; site: { id: string } } };
    } catch {
      throw new Error(`Tableau returned non-JSON response during sign-in (HTTP ${response.status})`);
    }

    this.credentialsToken = data.credentials.token;
    this.siteId = data.credentials.site.id;
    // Credentials token is valid for 240 minutes
    this.tokenExpiresAt = now + 240 * 60 * 1000;
    return { token: this.credentialsToken, siteId: this.siteId };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workbooks',
        description: 'List workbooks on the site. Returns metadata including project, owner, and last published time.',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: {
              type: 'number',
              description: 'Number of workbooks per page (max 1000, default: 100)',
            },
            pageNumber: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. "name:eq:Sales Dashboard")',
            },
          },
        },
      },
      {
        name: 'get_workbook',
        description: 'Get details of a specific workbook by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            workbookId: {
              type: 'string',
              description: 'The LUID (Locally Unique ID) of the workbook',
            },
          },
          required: ['workbookId'],
        },
      },
      {
        name: 'list_views',
        description: 'List all views (sheets/dashboards) for a workbook',
        inputSchema: {
          type: 'object',
          properties: {
            workbookId: {
              type: 'string',
              description: 'The LUID of the workbook to list views for',
            },
          },
          required: ['workbookId'],
        },
      },
      {
        name: 'list_datasources',
        description: 'List published data sources on the site',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: {
              type: 'number',
              description: 'Number of data sources per page (max 1000, default: 100)',
            },
            pageNumber: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. "type:eq:tableau")',
            },
          },
        },
      },
      {
        name: 'get_datasource',
        description: 'Get details of a specific published data source by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            datasourceId: {
              type: 'string',
              description: 'The LUID of the data source',
            },
          },
          required: ['datasourceId'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all projects on the site',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: {
              type: 'number',
              description: 'Number of projects per page (max 1000, default: 100)',
            },
            pageNumber: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'list_users',
        description: 'List users on the Tableau site',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: {
              type: 'number',
              description: 'Number of users per page (max 1000, default: 100)',
            },
            pageNumber: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'query_views_for_site',
        description: 'List all views across the entire site (not scoped to a workbook)',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: {
              type: 'number',
              description: 'Number of views per page (max 1000, default: 100)',
            },
            pageNumber: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. "name:eq:Overview")',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const { token, siteId } = await this.getCredentialsToken();
      const headers: Record<string, string> = {
        'X-Tableau-Auth': token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_workbooks': {
          const pageSize = (args.pageSize as number) || 100;
          const pageNumber = (args.pageNumber as number) || 1;
          let url = `${this.apiBase}/sites/${siteId}/workbooks?pageSize=${pageSize}&pageNumber=${pageNumber}`;
          if (args.filter) url += `&filter=${encodeURIComponent(args.filter as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list workbooks: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Tableau returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_workbook': {
          const workbookId = args.workbookId as string;

          if (!workbookId) {
            return {
              content: [{ type: 'text', text: 'workbookId is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.apiBase}/sites/${siteId}/workbooks/${encodeURIComponent(workbookId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get workbook: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Tableau returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_views': {
          const workbookId = args.workbookId as string;

          if (!workbookId) {
            return {
              content: [{ type: 'text', text: 'workbookId is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.apiBase}/sites/${siteId}/workbooks/${encodeURIComponent(workbookId)}/views`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list views: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Tableau returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_datasources': {
          const pageSize = (args.pageSize as number) || 100;
          const pageNumber = (args.pageNumber as number) || 1;
          let url = `${this.apiBase}/sites/${siteId}/datasources?pageSize=${pageSize}&pageNumber=${pageNumber}`;
          if (args.filter) url += `&filter=${encodeURIComponent(args.filter as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list datasources: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Tableau returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_datasource': {
          const datasourceId = args.datasourceId as string;

          if (!datasourceId) {
            return {
              content: [{ type: 'text', text: 'datasourceId is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.apiBase}/sites/${siteId}/datasources/${encodeURIComponent(datasourceId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get datasource: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Tableau returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_projects': {
          const pageSize = (args.pageSize as number) || 100;
          const pageNumber = (args.pageNumber as number) || 1;

          const response = await fetch(
            `${this.apiBase}/sites/${siteId}/projects?pageSize=${pageSize}&pageNumber=${pageNumber}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list projects: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Tableau returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_users': {
          const pageSize = (args.pageSize as number) || 100;
          const pageNumber = (args.pageNumber as number) || 1;

          const response = await fetch(
            `${this.apiBase}/sites/${siteId}/users?pageSize=${pageSize}&pageNumber=${pageNumber}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list users: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Tableau returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'query_views_for_site': {
          const pageSize = (args.pageSize as number) || 100;
          const pageNumber = (args.pageNumber as number) || 1;
          let url = `${this.apiBase}/sites/${siteId}/views?pageSize=${pageSize}&pageNumber=${pageNumber}`;
          if (args.filter) url += `&filter=${encodeURIComponent(args.filter as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to query views: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Tableau returned non-JSON response (HTTP ${response.status})`); }
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
