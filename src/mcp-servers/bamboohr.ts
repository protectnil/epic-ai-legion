/**
 * BambooHR MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found from BambooHR. Community servers exist (encoreshao/bamboohr-mcp, evrimalacan/mcp-bamboohr) but none are vendor-official.

import { ToolDefinition, ToolResult } from './types.js';

// BambooHR REST API base URL: https://api.bamboohr.com/api/gateway.php/{companyDomain}/v1
// Auth: HTTP Basic Authentication. Use the API key as the username; any non-empty string as the password.
// Generate API keys: log into BambooHR → click your name (lower left) → API Keys.
// All requests must include Accept: application/json to receive JSON responses (default is XML).

interface BambooHRConfig {
  /** Your BambooHR subdomain, e.g. "mycompany" from mycompany.bamboohr.com */
  companyDomain: string;
  /** BambooHR API key (used as the HTTP Basic Auth username) */
  apiKey: string;
}

export class BambooHRMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: BambooHRConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = `https://api.bamboohr.com/api/gateway.php/${encodeURIComponent(config.companyDomain)}/v1`;
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.apiKey}:x`).toString('base64')}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_employee_directory',
        description: 'Retrieve the employee directory, returning all active employees with basic profile information.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_employee',
        description: 'Get detailed information for a specific employee. Specify which fields to return.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'The BambooHR employee ID',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of field names to return, e.g. "firstName,lastName,jobTitle,department,workEmail,hireDate" (default: all basic fields)',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'add_employee',
        description: 'Create a new employee record in BambooHR.',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'Employee first name',
            },
            last_name: {
              type: 'string',
              description: 'Employee last name',
            },
            hire_date: {
              type: 'string',
              description: 'Hire date (YYYY-MM-DD)',
            },
            department: {
              type: 'string',
              description: 'Department name (optional)',
            },
            job_title: {
              type: 'string',
              description: 'Job title (optional)',
            },
            work_email: {
              type: 'string',
              description: 'Work email address (optional)',
            },
          },
          required: ['first_name', 'last_name'],
        },
      },
      {
        name: 'update_employee',
        description: 'Update fields on an existing employee record in BambooHR.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'The BambooHR employee ID to update',
            },
            fields: {
              type: 'object',
              description: 'Key-value pairs of BambooHR field names and their new values, e.g. { "jobTitle": "Senior Engineer", "department": "Engineering" }',
            },
          },
          required: ['employee_id', 'fields'],
        },
      },
      {
        name: 'list_time_off_requests',
        description: 'List time off requests within a date range. Can be filtered by employee, status, or time off type.',
        inputSchema: {
          type: 'object',
          properties: {
            start: {
              type: 'string',
              description: 'Start of the date range (YYYY-MM-DD)',
            },
            end: {
              type: 'string',
              description: 'End of the date range (YYYY-MM-DD)',
            },
            employee_id: {
              type: 'string',
              description: 'Filter to a specific employee ID (optional)',
            },
            status: {
              type: 'string',
              description: 'Filter by request status: approved, denied, superseded, requested, canceled (optional)',
            },
            type: {
              type: 'string',
              description: 'Filter by time off type ID (optional)',
            },
          },
          required: ['start', 'end'],
        },
      },
      {
        name: 'get_time_off_policies',
        description: 'Retrieve all time off policies defined in BambooHR.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_employee_time_off_balances',
        description: 'Get time off balances for a specific employee as of a given date.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'The BambooHR employee ID',
            },
            end: {
              type: 'string',
              description: 'Date to calculate balances as of (YYYY-MM-DD, default: today)',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'run_custom_report',
        description: 'Run a custom report against BambooHR employee data. Specify the fields you want returned.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Report title (for reference only, not stored)',
            },
            fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of BambooHR field names to include, e.g. ["firstName","lastName","department","jobTitle","salary"]',
            },
            filters: {
              type: 'object',
              description: 'Optional filter criteria as a BambooHR filters object',
            },
          },
          required: ['title', 'fields'],
        },
      },
      {
        name: 'list_changed_employees',
        description: 'Get a list of employee IDs whose records have changed since a given date. Useful for incremental sync.',
        inputSchema: {
          type: 'object',
          properties: {
            since: {
              type: 'string',
              description: 'ISO 8601 date-time string. Returns employees changed after this timestamp.',
            },
            type: {
              type: 'string',
              description: 'Type of change to filter on: inserted, updated, deleted (optional)',
            },
          },
          required: ['since'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'get_employee_directory': {
          const response = await fetch(`${this.baseUrl}/employees/directory`, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get employee directory: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`BambooHR returned non-JSON response (HTTP ${response.status})`); }
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

          const fields = (args.fields as string) || 'firstName,lastName,jobTitle,department,workEmail,hireDate,employmentHistoryStatus,location';
          const url = `${this.baseUrl}/employees/${encodeURIComponent(employeeId)}?fields=${encodeURIComponent(fields)}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get employee: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`BambooHR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'add_employee': {
          if (!args.first_name || !args.last_name) {
            return {
              content: [{ type: 'text', text: 'first_name and last_name are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            firstName: args.first_name,
            lastName: args.last_name,
          };
          if (args.hire_date) body.hireDate = args.hire_date;
          if (args.department) body.department = args.department;
          if (args.job_title) body.jobTitle = args.job_title;
          if (args.work_email) body.workEmail = args.work_email;

          const response = await fetch(`${this.baseUrl}/employees/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to add employee: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          // POST /employees/ returns 201 with a Location header containing the new employee ID; body may be empty
          const location = response.headers.get('Location') || '';
          return { content: [{ type: 'text', text: JSON.stringify({ created: true, location }) }], isError: false };
        }

        case 'update_employee': {
          const employeeId = args.employee_id as string;
          const fields = args.fields as Record<string, unknown>;

          if (!employeeId || !fields) {
            return {
              content: [{ type: 'text', text: 'employee_id and fields are required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/employees/${encodeURIComponent(employeeId)}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(fields),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to update employee: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: JSON.stringify({ updated: true, employee_id: employeeId }) }], isError: false };
        }

        case 'list_time_off_requests': {
          const start = args.start as string;
          const end = args.end as string;

          if (!start || !end) {
            return {
              content: [{ type: 'text', text: 'start and end dates are required' }],
              isError: true,
            };
          }

          let url = `${this.baseUrl}/time_off/requests?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
          if (args.employee_id) url += `&employeeId=${encodeURIComponent(args.employee_id as string)}`;
          if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;
          if (args.type) url += `&type=${encodeURIComponent(args.type as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list time off requests: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`BambooHR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_time_off_policies': {
          const response = await fetch(`${this.baseUrl}/meta/time_off/types/`, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get time off policies: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`BambooHR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_employee_time_off_balances': {
          const employeeId = args.employee_id as string;

          if (!employeeId) {
            return {
              content: [{ type: 'text', text: 'employee_id is required' }],
              isError: true,
            };
          }

          let url = `${this.baseUrl}/employees/${encodeURIComponent(employeeId)}/time_off/calculator`;
          if (args.end) url += `?end=${encodeURIComponent(args.end as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get time off balances: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`BambooHR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'run_custom_report': {
          const title = args.title as string;
          const fields = args.fields as string[];

          if (!title || !fields || fields.length === 0) {
            return {
              content: [{ type: 'text', text: 'title and fields are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            title,
            fields: fields.map(f => ({ id: f })),
          };
          if (args.filters) body.filters = args.filters;

          const response = await fetch(`${this.baseUrl}/reports/custom?format=json`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to run custom report: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`BambooHR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_changed_employees': {
          const since = args.since as string;

          if (!since) {
            return {
              content: [{ type: 'text', text: 'since is required' }],
              isError: true,
            };
          }

          let url = `${this.baseUrl}/employees/changed?since=${encodeURIComponent(since)}`;
          if (args.type) url += `&type=${encodeURIComponent(args.type as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list changed employees: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`BambooHR returned non-JSON response (HTTP ${response.status})`); }
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
