/**
 * Power BI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/microsoft/powerbi-modeling-mcp — local desktop only, covers semantic
// modeling (DAX, measures, relationships) via Tabular Object Model. Does NOT expose the cloud REST API.
// This adapter covers the Power BI REST API (api.powerbi.com) for cloud automation: reports, datasets,
// workspaces, refresh operations, and dashboards.

import { ToolDefinition, ToolResult } from './types.js';

interface PowerBIConfig {
  /**
   * Azure AD / Microsoft Entra access token for the Power BI service.
   * Obtain via OAuth2 client credentials flow:
   *   POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
   *   with scope https://analysis.windows.net/powerbi/api/.default
   */
  accessToken: string;
  /**
   * Override the Power BI REST API base URL.
   * Defaults to https://api.powerbi.com/v1.0/myorg
   */
  baseUrl?: string;
}

export class PowerBIMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: PowerBIConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl || 'https://api.powerbi.com/v1.0/myorg').replace(/\/$/, '');
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workspaces',
        description: 'List all Power BI workspaces (groups) the service principal has access to',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData filter expression (e.g. "type eq \'Workspace\'")',
            },
            top: {
              type: 'number',
              description: 'Maximum number of workspaces to return',
            },
            skip: {
              type: 'number',
              description: 'Number of workspaces to skip for pagination',
            },
          },
        },
      },
      {
        name: 'list_reports',
        description: 'List reports in a workspace, or all reports in My workspace if no workspaceId provided',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace (group) ID. Omit to list reports in My workspace.',
            },
          },
        },
      },
      {
        name: 'get_report',
        description: 'Get details of a specific report by ID',
        inputSchema: {
          type: 'object',
          properties: {
            reportId: {
              type: 'string',
              description: 'The report ID (GUID)',
            },
            workspaceId: {
              type: 'string',
              description: 'The workspace ID containing the report. Omit for My workspace.',
            },
          },
          required: ['reportId'],
        },
      },
      {
        name: 'list_datasets',
        description: 'List datasets in a workspace, or all datasets in My workspace if no workspaceId provided',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace (group) ID. Omit to list datasets in My workspace.',
            },
          },
        },
      },
      {
        name: 'get_dataset',
        description: 'Get details of a specific dataset by ID',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: {
              type: 'string',
              description: 'The dataset ID (GUID)',
            },
            workspaceId: {
              type: 'string',
              description: 'The workspace ID containing the dataset. Omit for My workspace.',
            },
          },
          required: ['datasetId'],
        },
      },
      {
        name: 'refresh_dataset',
        description: 'Trigger an on-demand refresh for a dataset. Returns HTTP 202 Accepted on success.',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: {
              type: 'string',
              description: 'The dataset ID (GUID) to refresh',
            },
            workspaceId: {
              type: 'string',
              description: 'The workspace ID containing the dataset. Omit for My workspace.',
            },
            notifyOption: {
              type: 'string',
              description: 'Notification option: "MailOnCompletion", "MailOnFailure", or "NoNotification" (default)',
            },
          },
          required: ['datasetId'],
        },
      },
      {
        name: 'get_refresh_history',
        description: 'Get the refresh history for a dataset',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: {
              type: 'string',
              description: 'The dataset ID (GUID)',
            },
            workspaceId: {
              type: 'string',
              description: 'The workspace ID containing the dataset. Omit for My workspace.',
            },
            top: {
              type: 'number',
              description: 'Maximum number of refresh records to return',
            },
          },
          required: ['datasetId'],
        },
      },
      {
        name: 'list_dashboards',
        description: 'List dashboards in a workspace, or all dashboards in My workspace if no workspaceId provided',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace (group) ID. Omit to list dashboards in My workspace.',
            },
          },
        },
      },
      {
        name: 'list_dashboard_tiles',
        description: 'List tiles on a specific dashboard',
        inputSchema: {
          type: 'object',
          properties: {
            dashboardId: {
              type: 'string',
              description: 'The dashboard ID (GUID)',
            },
            workspaceId: {
              type: 'string',
              description: 'The workspace ID containing the dashboard. Omit for My workspace.',
            },
          },
          required: ['dashboardId'],
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
        case 'list_workspaces': {
          let url = `${this.baseUrl}/groups`;
          const params: string[] = [];
          if (args.filter) params.push(`$filter=${encodeURIComponent(args.filter as string)}`);
          if (args.top) params.push(`$top=${args.top as number}`);
          if (args.skip) params.push(`$skip=${args.skip as number}`);
          if (params.length > 0) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list workspaces: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Power BI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_reports': {
          const workspaceId = args.workspaceId as string | undefined;
          const url = workspaceId
            ? `${this.baseUrl}/groups/${encodeURIComponent(workspaceId)}/reports`
            : `${this.baseUrl}/reports`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list reports: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Power BI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_report': {
          const reportId = args.reportId as string;

          if (!reportId) {
            return {
              content: [{ type: 'text', text: 'reportId is required' }],
              isError: true,
            };
          }

          const workspaceId = args.workspaceId as string | undefined;
          const url = workspaceId
            ? `${this.baseUrl}/groups/${encodeURIComponent(workspaceId)}/reports/${encodeURIComponent(reportId)}`
            : `${this.baseUrl}/reports/${encodeURIComponent(reportId)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get report: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Power BI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_datasets': {
          const workspaceId = args.workspaceId as string | undefined;
          const url = workspaceId
            ? `${this.baseUrl}/groups/${encodeURIComponent(workspaceId)}/datasets`
            : `${this.baseUrl}/datasets`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list datasets: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Power BI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_dataset': {
          const datasetId = args.datasetId as string;

          if (!datasetId) {
            return {
              content: [{ type: 'text', text: 'datasetId is required' }],
              isError: true,
            };
          }

          const workspaceId = args.workspaceId as string | undefined;
          const url = workspaceId
            ? `${this.baseUrl}/groups/${encodeURIComponent(workspaceId)}/datasets/${encodeURIComponent(datasetId)}`
            : `${this.baseUrl}/datasets/${encodeURIComponent(datasetId)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get dataset: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Power BI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'refresh_dataset': {
          const datasetId = args.datasetId as string;

          if (!datasetId) {
            return {
              content: [{ type: 'text', text: 'datasetId is required' }],
              isError: true,
            };
          }

          const workspaceId = args.workspaceId as string | undefined;
          const url = workspaceId
            ? `${this.baseUrl}/groups/${encodeURIComponent(workspaceId)}/datasets/${encodeURIComponent(datasetId)}/refreshes`
            : `${this.baseUrl}/datasets/${encodeURIComponent(datasetId)}/refreshes`;

          const body: Record<string, unknown> = {};
          if (args.notifyOption) body.notifyOption = args.notifyOption;

          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to refresh dataset: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          // POST /refreshes returns 202 Accepted with no body on success
          return {
            content: [{ type: 'text', text: `Dataset refresh triggered successfully (HTTP ${response.status})` }],
            isError: false,
          };
        }

        case 'get_refresh_history': {
          const datasetId = args.datasetId as string;

          if (!datasetId) {
            return {
              content: [{ type: 'text', text: 'datasetId is required' }],
              isError: true,
            };
          }

          const workspaceId = args.workspaceId as string | undefined;
          let url = workspaceId
            ? `${this.baseUrl}/groups/${encodeURIComponent(workspaceId)}/datasets/${encodeURIComponent(datasetId)}/refreshes`
            : `${this.baseUrl}/datasets/${encodeURIComponent(datasetId)}/refreshes`;
          if (args.top) url += `?$top=${args.top as number}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get refresh history: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Power BI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_dashboards': {
          const workspaceId = args.workspaceId as string | undefined;
          const url = workspaceId
            ? `${this.baseUrl}/groups/${encodeURIComponent(workspaceId)}/dashboards`
            : `${this.baseUrl}/dashboards`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list dashboards: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Power BI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_dashboard_tiles': {
          const dashboardId = args.dashboardId as string;

          if (!dashboardId) {
            return {
              content: [{ type: 'text', text: 'dashboardId is required' }],
              isError: true,
            };
          }

          const workspaceId = args.workspaceId as string | undefined;
          const url = workspaceId
            ? `${this.baseUrl}/groups/${encodeURIComponent(workspaceId)}/dashboards/${encodeURIComponent(dashboardId)}/tiles`
            : `${this.baseUrl}/dashboards/${encodeURIComponent(dashboardId)}/tiles`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list dashboard tiles: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Power BI returned non-JSON response (HTTP ${response.status})`); }
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
