/**
 * Gusto MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found. Gusto does not ship a vendor-maintained MCP server.

import { ToolDefinition, ToolResult } from './types.js';

// Gusto REST API base URLs:
//   Production: https://api.gusto.com
//   Demo/sandbox: https://api.gusto-demo.com
// Auth: OAuth2. Token endpoint: POST https://api.gusto.com/oauth/token
//   grant_type = authorization_code (user-facing OAuth) or client_credentials (system access)
// API version: v1 path prefix, e.g. /v1/companies/{company_id}/employees
// All authenticated requests require: Authorization: Bearer {access_token}

interface GustoConfig {
  accessToken: string;
  /** Override base URL for demo/sandbox environment; defaults to production */
  baseUrl?: string;
}

export class GustoMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: GustoConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl || 'https://api.gusto.com').replace(/\/$/, '');
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_current_user',
        description: 'Retrieve the currently authenticated Gusto user and the companies they are associated with.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_company',
        description: 'Retrieve details for a specific Gusto company, including name, EIN, entity type, and addresses.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'The Gusto company ID (UUID)',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'list_employees',
        description: 'List all employees for a given Gusto company. Includes onboarding, active, and terminated employees.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'The Gusto company ID (UUID)',
            },
            terminated: {
              type: 'boolean',
              description: 'Set to true to include terminated employees (default: false)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per: {
              type: 'number',
              description: 'Number of results per page (default: 25)',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_employee',
        description: 'Retrieve details for a specific Gusto employee including their jobs, compensation, and personal information.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'The Gusto employee ID (UUID)',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'list_payrolls',
        description: 'List payrolls for a Gusto company. Filter by processing status and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'The Gusto company ID (UUID)',
            },
            processing_statuses: {
              type: 'string',
              description: 'Comma-separated processing statuses to filter by: unprocessed, processed (optional)',
            },
            start_date: {
              type: 'string',
              description: 'Filter payrolls with pay periods on or after this date (YYYY-MM-DD, optional)',
            },
            end_date: {
              type: 'string',
              description: 'Filter payrolls with pay periods on or before this date (YYYY-MM-DD, optional)',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_payroll',
        description: 'Get details for a specific Gusto payroll run, including employee pay stubs and totals.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'The Gusto company ID (UUID)',
            },
            payroll_id: {
              type: 'string',
              description: 'The Gusto payroll ID (UUID)',
            },
          },
          required: ['company_id', 'payroll_id'],
        },
      },
      {
        name: 'list_pay_periods',
        description: 'List upcoming and past pay periods for a Gusto company.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'The Gusto company ID (UUID)',
            },
            start_date: {
              type: 'string',
              description: 'Start of the date range to retrieve pay periods for (YYYY-MM-DD, optional)',
            },
            end_date: {
              type: 'string',
              description: 'End of the date range to retrieve pay periods for (YYYY-MM-DD, optional)',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_employee_jobs',
        description: 'Retrieve all jobs held by an employee, including their compensation details.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'The Gusto employee ID (UUID)',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'list_company_benefits',
        description: 'List all benefits available to employees in a Gusto company.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'The Gusto company ID (UUID)',
            },
          },
          required: ['company_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'get_current_user': {
          const response = await fetch(`${this.baseUrl}/v1/me`, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get current user: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gusto returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_company': {
          const companyId = args.company_id as string;

          if (!companyId) {
            return {
              content: [{ type: 'text', text: 'company_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/v1/companies/${encodeURIComponent(companyId)}`, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get company: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gusto returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_employees': {
          const companyId = args.company_id as string;

          if (!companyId) {
            return {
              content: [{ type: 'text', text: 'company_id is required' }],
              isError: true,
            };
          }

          const page = (args.page as number) || 1;
          const per = (args.per as number) || 25;
          let url = `${this.baseUrl}/v1/companies/${encodeURIComponent(companyId)}/employees?page=${page}&per=${per}`;
          if (args.terminated === true) url += '&terminated=true';

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list employees: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gusto returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_employee': {
          const employeeId = args.employee_id as string;

          if (!employeeId) {
            return {
              content: [{ type: 'text', text: 'employee_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/v1/employees/${encodeURIComponent(employeeId)}`, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get employee: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gusto returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_payrolls': {
          const companyId = args.company_id as string;

          if (!companyId) {
            return {
              content: [{ type: 'text', text: 'company_id is required' }],
              isError: true,
            };
          }

          let url = `${this.baseUrl}/v1/companies/${encodeURIComponent(companyId)}/payrolls`;
          const params: string[] = [];
          if (args.processing_statuses) params.push(`processing_statuses=${encodeURIComponent(args.processing_statuses as string)}`);
          if (args.start_date) params.push(`start_date=${encodeURIComponent(args.start_date as string)}`);
          if (args.end_date) params.push(`end_date=${encodeURIComponent(args.end_date as string)}`);
          if (params.length > 0) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list payrolls: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gusto returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_payroll': {
          const companyId = args.company_id as string;
          const payrollId = args.payroll_id as string;

          if (!companyId || !payrollId) {
            return {
              content: [{ type: 'text', text: 'company_id and payroll_id are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/v1/companies/${encodeURIComponent(companyId)}/payrolls/${encodeURIComponent(payrollId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get payroll: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gusto returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_pay_periods': {
          const companyId = args.company_id as string;

          if (!companyId) {
            return {
              content: [{ type: 'text', text: 'company_id is required' }],
              isError: true,
            };
          }

          let url = `${this.baseUrl}/v1/companies/${encodeURIComponent(companyId)}/pay_periods`;
          const params: string[] = [];
          if (args.start_date) params.push(`start_date=${encodeURIComponent(args.start_date as string)}`);
          if (args.end_date) params.push(`end_date=${encodeURIComponent(args.end_date as string)}`);
          if (params.length > 0) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list pay periods: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gusto returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_employee_jobs': {
          const employeeId = args.employee_id as string;

          if (!employeeId) {
            return {
              content: [{ type: 'text', text: 'employee_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/v1/employees/${encodeURIComponent(employeeId)}/jobs`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get employee jobs: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gusto returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_company_benefits': {
          const companyId = args.company_id as string;

          if (!companyId) {
            return {
              content: [{ type: 'text', text: 'company_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/v1/companies/${encodeURIComponent(companyId)}/company_benefits`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list company benefits: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gusto returned non-JSON response (HTTP ${response.status})`); }
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
