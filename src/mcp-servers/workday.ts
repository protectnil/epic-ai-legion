/**
 * Workday MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/CDataSoftware/workday-mcp-server-by-cdata — read-only JDBC bridge requiring a CData license; no native REST adapter. Our adapter serves the direct OAuth2 REST API use case for self-hosted deployments.

import { ToolDefinition, ToolResult } from './types.js';

// Workday REST API URLs are tenant-specific — there is no single global base URL.
// Caller must supply the ccx/api base URL from their Workday tenant, e.g.:
//   https://wd5-impl-services1.workday.com/ccx/api
// Endpoint paths follow the pattern: /{service}/{version}/{tenant}/{resource}
// Services used here: staffing (workers, positions, orgs), timeTracking, payrollInterface, recruiting.
// Auth: OAuth2 Bearer. Obtain tokens from the Token Endpoint in Workday's View API Clients report.

interface WorkdayConfig {
  /** Full ccx/api base URL, e.g. "https://wd5-impl-services1.workday.com/ccx/api" */
  baseUrl: string;
  /** Workday tenant name, e.g. "mycompany_prd1" */
  tenant: string;
  accessToken: string;
}

export class WorkdayMCPServer {
  private readonly baseUrl: string;
  private readonly tenant: string;
  private readonly accessToken: string;

  constructor(config: WorkdayConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.tenant = config.tenant;
    this.accessToken = config.accessToken;
  }

  private url(service: string, version: string, resource: string): string {
    return `${this.baseUrl}/${service}/${version}/${this.tenant}/${resource}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workers',
        description: 'Retrieve a paginated list of workers from Workday Staffing. Returns worker IDs, names, positions, and employment status.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of workers to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            search: {
              type: 'string',
              description: 'Optional search string to filter workers by name',
            },
          },
        },
      },
      {
        name: 'get_worker',
        description: 'Retrieve full details for a single Workday worker by their Worker ID, including personal data, position, compensation, and employment status.',
        inputSchema: {
          type: 'object',
          properties: {
            worker_id: {
              type: 'string',
              description: 'The Workday Worker ID (e.g. a WID reference string)',
            },
          },
          required: ['worker_id'],
        },
      },
      {
        name: 'list_organizations',
        description: 'List Workday organizations such as supervisory orgs, cost centers, and companies. Used to map workers to organizational units.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Organization type filter, e.g. SUPERVISORY, COST_CENTER, COMPANY (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of organizations to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_positions',
        description: 'List open and filled positions in Workday. Useful for headcount planning and recruiting alignment.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by position status: OPEN or FILLED (optional, returns all if omitted)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of positions to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_worker_time_off',
        description: 'Retrieve time-off entries for a specific Workday worker via the Time Tracking service.',
        inputSchema: {
          type: 'object',
          properties: {
            worker_id: {
              type: 'string',
              description: 'The Workday Worker ID',
            },
            start_date: {
              type: 'string',
              description: 'Start date for the time-off query range (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'End date for the time-off query range (YYYY-MM-DD)',
            },
          },
          required: ['worker_id'],
        },
      },
      {
        name: 'list_payroll_results',
        description: 'Retrieve payroll run results for workers via the Workday Payroll Interface service. Returns pay calculation summaries for a given period.',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Payroll period start date (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Payroll period end date (YYYY-MM-DD)',
            },
            worker_id: {
              type: 'string',
              description: 'Optional: filter results to a specific worker ID',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'list_job_requisitions',
        description: 'List job requisitions in Workday Recruiting. Includes job title, hiring manager, target hire date, and status.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by requisition status, e.g. OPEN, FILLED, CANCELLED (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of requisitions to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
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
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_workers': {
          const limit = (args.limit as number) || 100;
          const offset = (args.offset as number) || 0;
          let url = this.url('staffing', 'v5', `workers?limit=${limit}&offset=${offset}`);
          if (args.search) url += `&search=${encodeURIComponent(args.search as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list workers: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Workday returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_worker': {
          const workerId = args.worker_id as string;

          if (!workerId) {
            return {
              content: [{ type: 'text', text: 'worker_id is required' }],
              isError: true,
            };
          }

          const url = this.url('staffing', 'v5', `workers/${encodeURIComponent(workerId)}`);
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get worker: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Workday returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_organizations': {
          const limit = (args.limit as number) || 100;
          const offset = (args.offset as number) || 0;
          let url = this.url('staffing', 'v5', `organizations?limit=${limit}&offset=${offset}`);
          if (args.type) url += `&type=${encodeURIComponent(args.type as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list organizations: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Workday returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_positions': {
          const limit = (args.limit as number) || 100;
          const offset = (args.offset as number) || 0;
          let url = this.url('staffing', 'v5', `positions?limit=${limit}&offset=${offset}`);
          if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list positions: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Workday returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_worker_time_off': {
          const workerId = args.worker_id as string;

          if (!workerId) {
            return {
              content: [{ type: 'text', text: 'worker_id is required' }],
              isError: true,
            };
          }

          let url = this.url('timeTracking', 'v3', `workers/${encodeURIComponent(workerId)}/timeOffEntries`);
          const params: string[] = [];
          if (args.start_date) params.push(`startDate=${encodeURIComponent(args.start_date as string)}`);
          if (args.end_date) params.push(`endDate=${encodeURIComponent(args.end_date as string)}`);
          if (params.length > 0) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get worker time off: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Workday returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_payroll_results': {
          const startDate = args.start_date as string;
          const endDate = args.end_date as string;

          if (!startDate || !endDate) {
            return {
              content: [{ type: 'text', text: 'start_date and end_date are required' }],
              isError: true,
            };
          }

          let url = this.url('payrollInterface', 'v1', `payrollResults?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
          if (args.worker_id) url += `&worker=${encodeURIComponent(args.worker_id as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list payroll results: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Workday returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_job_requisitions': {
          const limit = (args.limit as number) || 100;
          const offset = (args.offset as number) || 0;
          let url = this.url('recruiting', 'v1', `jobRequisitions?limit=${limit}&offset=${offset}`);
          if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list job requisitions: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Workday returned non-JSON response (HTTP ${response.status})`); }
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
