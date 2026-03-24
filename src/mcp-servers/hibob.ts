/**
 * HiBob MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/hibobio/hibob-public-mcp — hosted-only (Python/uvx, env-var token). This adapter serves the self-hosted Basic-auth service-user use case.

import { ToolDefinition, ToolResult } from './types.js';

interface HiBobConfig {
  serviceUserId: string;
  token: string;
  baseUrl?: string;
}

export class HiBobMCPServer {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: HiBobConfig) {
    const credentials = Buffer.from(`${config.serviceUserId}:${config.token}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
    this.baseUrl = config.baseUrl || 'https://api.hibob.com/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_employees',
        description: 'Retrieve a list of all employees in the company',
        inputSchema: {
          type: 'object',
          properties: {
            showInactive: {
              type: 'boolean',
              description: 'Include inactive employees in results (default: false)',
            },
            humanReadable: {
              type: 'string',
              description: 'Return field values in human-readable format. One of: REPLACE, APPEND',
            },
          },
        },
      },
      {
        name: 'get_employee',
        description: 'Read all fields for a specific employee by their employee ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The employee ID',
            },
            humanReadable: {
              type: 'string',
              description: 'Return field values in human-readable format. One of: REPLACE, APPEND',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_employees',
        description: 'Search employees using filters. Returns matching employee records.',
        inputSchema: {
          type: 'object',
          properties: {
            filters: {
              type: 'array',
              description: 'Array of filter objects, each with fieldPath, operator, and values',
              items: { type: 'object' },
            },
            fields: {
              type: 'array',
              description: 'List of field paths to return for each employee',
              items: { type: 'string' },
            },
            showInactive: {
              type: 'boolean',
              description: 'Include inactive employees (default: false)',
            },
            humanReadable: {
              type: 'string',
              description: 'Return field values in human-readable format. One of: REPLACE, APPEND',
            },
          },
        },
      },
      {
        name: 'get_employee_work_details',
        description: 'Read work details (department, site, employment type, etc.) for a specific employee',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The employee ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_time_off_requests',
        description: 'Read a list of time-off requests for a specific employee',
        inputSchema: {
          type: 'object',
          properties: {
            employeeId: {
              type: 'string',
              description: 'The employee ID',
            },
            startDate: {
              type: 'string',
              description: 'Filter requests starting from this date (YYYY-MM-DD)',
            },
            endDate: {
              type: 'string',
              description: 'Filter requests up to this date (YYYY-MM-DD)',
            },
          },
          required: ['employeeId'],
        },
      },
      {
        name: 'list_company_holidays',
        description: 'Read the company holiday calendar',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'The calendar year to retrieve holidays for',
            },
          },
        },
      },
      {
        name: 'get_payroll_history',
        description: 'Read the payroll history for a specific employee',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The employee ID',
            },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_employees': {
          let url = `${this.baseUrl}/people`;
          const params = new URLSearchParams();
          if (typeof args.showInactive === 'boolean') params.set('showInactive', String(args.showInactive));
          if (args.humanReadable) params.set('humanReadable', args.humanReadable as string);
          const qs = params.toString();
          if (qs) url += `?${qs}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list employees: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`HiBob returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_employee': {
          const id = args.id as string;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }

          let url = `${this.baseUrl}/people/${encodeURIComponent(id)}`;
          if (args.humanReadable) url += `?humanReadable=${encodeURIComponent(args.humanReadable as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get employee: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`HiBob returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_employees': {
          const body: Record<string, unknown> = {};
          if (args.filters) body.filters = args.filters;
          if (args.fields) body.fields = args.fields;
          if (typeof args.showInactive === 'boolean') body.showInactive = args.showInactive;
          if (args.humanReadable) body.humanReadable = args.humanReadable;

          const response = await fetch(`${this.baseUrl}/people/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search employees: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`HiBob returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_employee_work_details': {
          const id = args.id as string;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/people/${encodeURIComponent(id)}/work`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get employee work details: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`HiBob returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_time_off_requests': {
          const employeeId = args.employeeId as string;
          if (!employeeId) {
            return { content: [{ type: 'text', text: 'employeeId is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.startDate) params.set('startDate', args.startDate as string);
          if (args.endDate) params.set('endDate', args.endDate as string);
          const qs = params.toString();
          let url = `${this.baseUrl}/timeoff/employees/${encodeURIComponent(employeeId)}/requests`;
          if (qs) url += `?${qs}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list time-off requests: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`HiBob returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_company_holidays': {
          let url = `${this.baseUrl}/timeoff/holidays`;
          if (args.year) url += `?year=${encodeURIComponent(String(args.year))}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list company holidays: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`HiBob returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_payroll_history': {
          const id = args.id as string;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/payroll/history/${encodeURIComponent(id)}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get payroll history: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`HiBob returned non-JSON response (HTTP ${response.status})`); }
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
