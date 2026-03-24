/**
 * SAP Concur MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/CDataSoftware/sap-concur-mcp-server-by-cdata — CData read-only JDBC bridge, not SAP-official, requires CData license. Our adapter is API-key/Bearer use case against the native REST API.

import { ToolDefinition, ToolResult } from './types.js';

// Base URL verified: https://developer.concur.com/api-reference/
//   Geolocation-based: https://{datacenter}.api.concursolutions.com (e.g. us, eu)
//   Default fallback: https://us.api.concursolutions.com
//   Users can supply their datacenter base URL via config.baseUrl
// Auth: OAuth2 Bearer token — POST /oauth2/v0/token with client_id, client_secret, grant_type, refresh_token
//   Returns { access_token, token_type: "Bearer", expires_in, refresh_token }
// Key v4 endpoints:
//   Reports:      /expensereports/v4/users/{userID}/context/{contextType}/reports
//   Expenses:     /expensereports/v4/users/{userID}/context/{contextType}/reports/{reportId}/expenses
//   Allocations:  /expensereports/v4/users/{userID}/context/{contextType}/reports/{reportId}/expenses/{expenseId}/allocations
//   Attendees:    /expensereports/v4/users/{userID}/context/{contextType}/reports/{reportId}/expenses/{expenseId}/attendees
//   Submit:       PATCH /expensereports/v4/users/{userID}/reports/{reportId}/submit
// CRITICAL: SAP Concur API is geolocation-aware. Always allow caller to supply baseUrl. Hardcoding us.api.concursolutions.com breaks EU/AP customers.

interface ConcurConfig {
  accessToken: string;
  baseUrl?: string;
}

export class ConcurMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: ConcurConfig) {
    this.accessToken = config.accessToken;
    // Default to US datacenter; callers in EU/AP should supply their regional URL
    this.baseUrl = config.baseUrl || 'https://us.api.concursolutions.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_expense_reports',
        description: 'List expense reports for a user in SAP Concur',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The Concur user UUID (from the JWT sub claim or user profile)',
            },
            context_type: {
              type: 'string',
              description: 'Access context: TRAVELER (user) or MANAGER (approver). Default: TRAVELER',
            },
            start_date: {
              type: 'string',
              description: 'Filter reports created on or after this date (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Filter reports created on or before this date (YYYY-MM-DD)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_expense_report',
        description: 'Get the full details of a single expense report',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The Concur user UUID',
            },
            report_id: {
              type: 'string',
              description: 'The expense report ID',
            },
            context_type: {
              type: 'string',
              description: 'Access context: TRAVELER or MANAGER. Default: TRAVELER',
            },
          },
          required: ['user_id', 'report_id'],
        },
      },
      {
        name: 'create_expense_report',
        description: 'Create a new expense report header for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The Concur user UUID',
            },
            name: {
              type: 'string',
              description: 'Name/title of the expense report',
            },
            business_purpose: {
              type: 'string',
              description: 'Business purpose statement for the report',
            },
            policy_id: {
              type: 'string',
              description: 'Policy ID to apply to this report',
            },
            start_date: {
              type: 'string',
              description: 'Report start date (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Report end date (YYYY-MM-DD)',
            },
          },
          required: ['user_id', 'name'],
        },
      },
      {
        name: 'submit_expense_report',
        description: 'Submit an expense report for approval',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The Concur user UUID',
            },
            report_id: {
              type: 'string',
              description: 'The expense report ID to submit',
            },
          },
          required: ['user_id', 'report_id'],
        },
      },
      {
        name: 'list_report_expenses',
        description: 'List individual expense line items within a report',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The Concur user UUID',
            },
            report_id: {
              type: 'string',
              description: 'The expense report ID',
            },
            context_type: {
              type: 'string',
              description: 'Access context: TRAVELER or MANAGER. Default: TRAVELER',
            },
          },
          required: ['user_id', 'report_id'],
        },
      },
      {
        name: 'get_expense_allocations',
        description: 'Get cost allocations for a specific expense line item',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The Concur user UUID',
            },
            report_id: {
              type: 'string',
              description: 'The expense report ID',
            },
            expense_id: {
              type: 'string',
              description: 'The expense line item ID',
            },
            context_type: {
              type: 'string',
              description: 'Access context: TRAVELER or MANAGER. Default: TRAVELER',
            },
          },
          required: ['user_id', 'report_id', 'expense_id'],
        },
      },
      {
        name: 'get_expense_attendees',
        description: 'Get attendees associated with a specific expense line item',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The Concur user UUID',
            },
            report_id: {
              type: 'string',
              description: 'The expense report ID',
            },
            expense_id: {
              type: 'string',
              description: 'The expense line item ID',
            },
            context_type: {
              type: 'string',
              description: 'Access context: TRAVELER or MANAGER. Default: TRAVELER',
            },
          },
          required: ['user_id', 'report_id', 'expense_id'],
        },
      },
      {
        name: 'approve_expense_report',
        description: 'Approve an expense report as a manager or authorized approver',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The approver user UUID',
            },
            report_id: {
              type: 'string',
              description: 'The expense report ID to approve',
            },
            comment: {
              type: 'string',
              description: 'Optional approval comment',
            },
          },
          required: ['user_id', 'report_id'],
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
        case 'list_expense_reports': {
          const userId = args.user_id as string;
          if (!userId) {
            return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
          }
          const contextType = (args.context_type as string) || 'TRAVELER';
          const params = new URLSearchParams();
          if (args.start_date) params.set('startDate', args.start_date as string);
          if (args.end_date) params.set('endDate', args.end_date as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/${encodeURIComponent(contextType)}/reports${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list expense reports: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Concur returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_expense_report': {
          const userId = args.user_id as string;
          const reportId = args.report_id as string;
          if (!userId || !reportId) {
            return { content: [{ type: 'text', text: 'user_id and report_id are required' }], isError: true };
          }
          const contextType = (args.context_type as string) || 'TRAVELER';

          const url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/${encodeURIComponent(contextType)}/reports/${encodeURIComponent(reportId)}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get expense report: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Concur returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_expense_report': {
          const userId = args.user_id as string;
          const reportName = args.name as string;
          if (!userId || !reportName) {
            return { content: [{ type: 'text', text: 'user_id and name are required' }], isError: true };
          }

          const body: Record<string, unknown> = { name: reportName };
          if (args.business_purpose) body.businessPurpose = args.business_purpose;
          if (args.policy_id) body.policy = { id: args.policy_id };
          if (args.start_date) body.startDate = args.start_date;
          if (args.end_date) body.endDate = args.end_date;

          const url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/TRAVELER/reports`;
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create expense report: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Concur returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'submit_expense_report': {
          const userId = args.user_id as string;
          const reportId = args.report_id as string;
          if (!userId || !reportId) {
            return { content: [{ type: 'text', text: 'user_id and report_id are required' }], isError: true };
          }

          const url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/reports/${encodeURIComponent(reportId)}/submit`;
          const response = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify({}) });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to submit expense report: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { data = { status: 'submitted' }; }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_report_expenses': {
          const userId = args.user_id as string;
          const reportId = args.report_id as string;
          if (!userId || !reportId) {
            return { content: [{ type: 'text', text: 'user_id and report_id are required' }], isError: true };
          }
          const contextType = (args.context_type as string) || 'TRAVELER';

          const url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/${encodeURIComponent(contextType)}/reports/${encodeURIComponent(reportId)}/expenses`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list report expenses: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Concur returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_expense_allocations': {
          const userId = args.user_id as string;
          const reportId = args.report_id as string;
          const expenseId = args.expense_id as string;
          if (!userId || !reportId || !expenseId) {
            return { content: [{ type: 'text', text: 'user_id, report_id, and expense_id are required' }], isError: true };
          }
          const contextType = (args.context_type as string) || 'TRAVELER';

          const url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/${encodeURIComponent(contextType)}/reports/${encodeURIComponent(reportId)}/expenses/${encodeURIComponent(expenseId)}/allocations`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get allocations: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Concur returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_expense_attendees': {
          const userId = args.user_id as string;
          const reportId = args.report_id as string;
          const expenseId = args.expense_id as string;
          if (!userId || !reportId || !expenseId) {
            return { content: [{ type: 'text', text: 'user_id, report_id, and expense_id are required' }], isError: true };
          }
          const contextType = (args.context_type as string) || 'TRAVELER';

          const url = `${this.baseUrl}/expensereports/v4/users/${encodeURIComponent(userId)}/context/${encodeURIComponent(contextType)}/reports/${encodeURIComponent(reportId)}/expenses/${encodeURIComponent(expenseId)}/attendees`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get attendees: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Concur returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'approve_expense_report': {
          const userId = args.user_id as string;
          const reportId = args.report_id as string;
          if (!userId || !reportId) {
            return { content: [{ type: 'text', text: 'user_id and report_id are required' }], isError: true };
          }

          const body: Record<string, unknown> = {};
          if (args.comment) body.comment = args.comment;

          const url = `${this.baseUrl}/expensereports/v4/reports/${encodeURIComponent(reportId)}/approve`;
          const response = await fetch(url, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to approve expense report: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { data = { status: 'approved' }; }
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
