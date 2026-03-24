/**
 * ADP MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/CDataSoftware/adp-mcp-server-by-cdata — read-only JDBC bridge requiring a CData license. Our adapter serves the direct OAuth2 REST API use case for ADP Workforce Now.

import { ToolDefinition, ToolResult } from './types.js';

// ADP Workforce Now REST API base URL: https://api.adp.com
// Auth: OAuth2 client_credentials flow. Token endpoint: https://accounts.adp.com/auth/oauth/v2/token
// Requires mutual TLS (mTLS) — ADP mandates a client certificate in addition to the Bearer token.
// Workers API: GET /hr/v2/workers, GET /hr/v2/workers/{aoid}
// Payroll: GET /payroll/v1/paydata
// Time Off: GET /time/v2/workers/{aoid}/time-off-details/time-off-requests

interface ADPConfig {
  clientId: string;
  clientSecret: string;
  /** Override production base URL; useful for sandbox testing */
  baseUrl?: string;
  /** Pre-obtained Bearer access token (if you manage token refresh externally) */
  accessToken?: string;
}

export class ADPMCPServer {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private accessToken: string;

  constructor(config: ADPConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = (config.baseUrl || 'https://api.adp.com').replace(/\/$/, '');
    this.accessToken = config.accessToken || '';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch('https://accounts.adp.com/auth/oauth/v2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`ADP token request failed: HTTP ${response.status} ${response.statusText}`);
    }

    let tokenData: { access_token?: string };
    try { tokenData = await response.json() as { access_token?: string }; } catch { throw new Error('ADP returned non-JSON token response'); }

    if (!tokenData.access_token) {
      throw new Error('ADP token response did not include access_token');
    }

    this.accessToken = tokenData.access_token;
    return this.accessToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workers',
        description: 'Retrieve a paginated list of workers from ADP Workforce Now. Returns worker details including Associate OID (AOID), name, department, job title, and employment status.',
        inputSchema: {
          type: 'object',
          properties: {
            top: {
              type: 'number',
              description: 'Maximum number of workers to return (ADP uses $top, default: 100, max: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination using $skip (default: 0)',
            },
            filter: {
              type: 'string',
              description: 'OData-style filter string, e.g. "workers/workAssignments/jobCode/codeValue eq \'ENG\'\'  (optional)',
            },
          },
        },
      },
      {
        name: 'get_worker',
        description: 'Retrieve full details for a single ADP worker by their Associate OID (AOID).',
        inputSchema: {
          type: 'object',
          properties: {
            aoid: {
              type: 'string',
              description: 'The ADP Associate OID (unique worker identifier)',
            },
          },
          required: ['aoid'],
        },
      },
      {
        name: 'get_worker_time_off_requests',
        description: 'Retrieve time off requests for a specific ADP worker by their Associate OID.',
        inputSchema: {
          type: 'object',
          properties: {
            aoid: {
              type: 'string',
              description: 'The ADP Associate OID of the worker',
            },
            start_date: {
              type: 'string',
              description: 'Start date for the time-off request query (YYYY-MM-DD, optional)',
            },
            end_date: {
              type: 'string',
              description: 'End date for the time-off request query (YYYY-MM-DD, optional)',
            },
          },
          required: ['aoid'],
        },
      },
      {
        name: 'get_payroll_data',
        description: 'Retrieve payroll data from ADP. Returns pay data including earnings, deductions, and net pay.',
        inputSchema: {
          type: 'object',
          properties: {
            top: {
              type: 'number',
              description: 'Maximum number of payroll records to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            filter: {
              type: 'string',
              description: 'OData filter string to narrow payroll results (optional)',
            },
          },
        },
      },
      {
        name: 'get_workers_meta',
        description: 'Retrieve metadata for the Workers v2 API, including available fields and their data types. Useful for discovering what data can be queried.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const token = await this.getAccessToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_workers': {
          const top = (args.top as number) || 100;
          const skip = (args.skip as number) || 0;
          let url = `${this.baseUrl}/hr/v2/workers?$top=${top}&$skip=${skip}`;
          if (args.filter) url += `&$filter=${encodeURIComponent(args.filter as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list workers: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ADP returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_worker': {
          const aoid = args.aoid as string;

          if (!aoid) {
            return {
              content: [{ type: 'text', text: 'aoid is required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/hr/v2/workers/${encodeURIComponent(aoid)}`, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get worker: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ADP returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_worker_time_off_requests': {
          const aoid = args.aoid as string;

          if (!aoid) {
            return {
              content: [{ type: 'text', text: 'aoid is required' }],
              isError: true,
            };
          }

          let url = `${this.baseUrl}/time/v2/workers/${encodeURIComponent(aoid)}/time-off-details/time-off-requests`;
          const params: string[] = [];
          if (args.start_date) params.push(`startDate=${encodeURIComponent(args.start_date as string)}`);
          if (args.end_date) params.push(`endDate=${encodeURIComponent(args.end_date as string)}`);
          if (params.length > 0) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get time off requests: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ADP returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_payroll_data': {
          const top = (args.top as number) || 100;
          const skip = (args.skip as number) || 0;
          let url = `${this.baseUrl}/payroll/v1/paydata?$top=${top}&$skip=${skip}`;
          if (args.filter) url += `&$filter=${encodeURIComponent(args.filter as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get payroll data: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ADP returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_workers_meta': {
          const response = await fetch(`${this.baseUrl}/hr/v2/workers/meta`, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get workers meta: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ADP returned non-JSON response (HTTP ${response.status})`); }
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
