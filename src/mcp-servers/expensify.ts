/**
 * Expensify MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — Expensify has an .mcp.json in their App repo (github.com/Expensify/App) for internal tooling only, not a public MCP server.

import { ToolDefinition, ToolResult } from './types.js';

// Base URL verified: https://integrations.expensify.com/Integration-Server/doc/
// Endpoint: POST https://integrations.expensify.com/Integration-Server/ExpensifyIntegrations
// Auth: partnerUserID + partnerUserSecret embedded in every requestJobDescription payload
//   Credentials obtained at: https://www.expensify.com/tools/integrations/
// All operations are HTTP POST with requestJobDescription JSON body
// Job types: "create" (new expense/report), "get" (retrieve data/policies), "update" (modify),
//            "file" (export report data), "download" (fetch previously exported reports)
// Note: Expensify's API is a single-endpoint POST-only design — all "verbs" are in requestJobDescription.type

interface ExpensifyConfig {
  partnerUserID: string;
  partnerUserSecret: string;
  baseUrl?: string;
}

export class ExpensifyMCPServer {
  private readonly partnerUserID: string;
  private readonly partnerUserSecret: string;
  private readonly baseUrl: string;

  constructor(config: ExpensifyConfig) {
    this.partnerUserID = config.partnerUserID;
    this.partnerUserSecret = config.partnerUserSecret;
    this.baseUrl = config.baseUrl || 'https://integrations.expensify.com/Integration-Server/ExpensifyIntegrations';
  }

  private credentials() {
    return {
      partnerUserID: this.partnerUserID,
      partnerUserSecret: this.partnerUserSecret,
    };
  }

  private async postJob(requestJobDescription: Record<string, unknown>): Promise<ToolResult> {
    const body = new URLSearchParams({
      requestJobDescription: JSON.stringify(requestJobDescription),
    });

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Expensify API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const text = await response.text();
    // Expensify returns mixed JSON / plain-text depending on job type
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { content: [{ type: 'text', text: typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2) }], isError: false };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_expense',
        description: 'Create a new expense transaction for a specific Expensify policy',
        inputSchema: {
          type: 'object',
          properties: {
            employee_email: {
              type: 'string',
              description: 'Email address of the employee submitting the expense',
            },
            merchant: {
              type: 'string',
              description: 'Merchant or vendor name',
            },
            amount: {
              type: 'number',
              description: 'Expense amount in cents (e.g. 1000 = $10.00)',
            },
            currency: {
              type: 'string',
              description: 'ISO 4217 currency code (e.g. USD, EUR)',
            },
            created: {
              type: 'string',
              description: 'Date of the expense in YYYY-MM-DD format',
            },
            comment: {
              type: 'string',
              description: 'Optional description or comment for the expense',
            },
            category: {
              type: 'string',
              description: 'Expense category as defined in the policy',
            },
            policy_id: {
              type: 'string',
              description: 'Expensify policy ID to associate the expense with',
            },
          },
          required: ['employee_email', 'merchant', 'amount', 'currency', 'created'],
        },
      },
      {
        name: 'get_expense_reports',
        description: 'Retrieve expense reports for a policy with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'The policy ID to retrieve reports from',
            },
            report_state: {
              type: 'string',
              description: 'Filter by report status: OPEN, SUBMITTED, APPROVED, REIMBURSED, CLOSED',
            },
            start_date: {
              type: 'string',
              description: 'Filter reports created on or after this date (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Filter reports created on or before this date (YYYY-MM-DD)',
            },
            employee_email: {
              type: 'string',
              description: 'Filter reports for a specific employee email',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of reports to return',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'get_policy_list',
        description: 'Retrieve the list of Expensify policies (workspaces) accessible with the current credentials',
        inputSchema: {
          type: 'object',
          properties: {
            admin_only: {
              type: 'boolean',
              description: 'If true, return only policies where the credentials hold admin access',
            },
          },
        },
      },
      {
        name: 'update_report',
        description: 'Update the status of an expense report (e.g. approve, submit, or add a comment)',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'The report ID to update',
            },
            action: {
              type: 'string',
              description: 'Action to perform: submit, approve, reject, reimburse',
            },
            comment: {
              type: 'string',
              description: 'Optional comment to add with the action',
            },
          },
          required: ['report_id', 'action'],
        },
      },
      {
        name: 'export_report',
        description: 'Export expense report data using a named export template defined in the policy',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'The policy ID the template belongs to',
            },
            template_name: {
              type: 'string',
              description: 'Name of the export template configured in Expensify',
            },
            report_state: {
              type: 'string',
              description: 'Filter by report status: OPEN, SUBMITTED, APPROVED, REIMBURSED, CLOSED',
            },
            start_date: {
              type: 'string',
              description: 'Export reports created on or after this date (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Export reports created on or before this date (YYYY-MM-DD)',
            },
          },
          required: ['policy_id', 'template_name'],
        },
      },
      {
        name: 'get_categories',
        description: 'Retrieve the expense categories configured for a policy',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'The policy ID to retrieve categories from',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'invite_employee',
        description: 'Invite or update an employee in an Expensify policy',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'The policy ID to add the employee to',
            },
            employee_email: {
              type: 'string',
              description: 'Email address of the employee to invite',
            },
            first_name: {
              type: 'string',
              description: "Employee's first name",
            },
            last_name: {
              type: 'string',
              description: "Employee's last name",
            },
            manager_email: {
              type: 'string',
              description: "Email of the employee's approving manager",
            },
          },
          required: ['policy_id', 'employee_email'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_expense': {
          const employeeEmail = args.employee_email as string;
          const merchant = args.merchant as string;
          const amount = args.amount as number;
          const currency = args.currency as string;
          const created = args.created as string;

          if (!employeeEmail || !merchant || amount === undefined || !currency || !created) {
            return { content: [{ type: 'text', text: 'employee_email, merchant, amount, currency, and created are required' }], isError: true };
          }

          const expense: Record<string, unknown> = {
            merchant,
            amount,
            currency,
            created,
          };
          if (args.comment) expense.comment = args.comment;
          if (args.category) expense.category = args.category;

          const requestJobDescription: Record<string, unknown> = {
            type: 'create',
            credentials: this.credentials(),
            inputSettings: {
              type: 'expenses',
              employeeEmail,
              expenses: [expense],
            },
          };
          if (args.policy_id) {
            (requestJobDescription.inputSettings as Record<string, unknown>).policyID = args.policy_id;
          }

          return this.postJob(requestJobDescription);
        }

        case 'get_expense_reports': {
          const policyId = args.policy_id as string;
          if (!policyId) {
            return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
          }

          const filters: Record<string, unknown> = { policyID: policyId };
          if (args.report_state) filters.reportState = args.report_state;
          if (args.start_date) filters.startDate = args.start_date;
          if (args.end_date) filters.endDate = args.end_date;
          if (args.employee_email) filters.employeeEmail = args.employee_email;
          if (args.limit) filters.limit = args.limit;

          return this.postJob({
            type: 'get',
            credentials: this.credentials(),
            inputSettings: {
              type: 'reportInfos',
              filters,
            },
            outputSettings: {
              fileExtension: 'json',
            },
          });
        }

        case 'get_policy_list': {
          const inputSettings: Record<string, unknown> = { type: 'policyList' };
          if (args.admin_only) inputSettings.adminOnly = args.admin_only;

          return this.postJob({
            type: 'get',
            credentials: this.credentials(),
            inputSettings,
          });
        }

        case 'update_report': {
          const reportId = args.report_id as string;
          const action = args.action as string;

          if (!reportId || !action) {
            return { content: [{ type: 'text', text: 'report_id and action are required' }], isError: true };
          }

          const inputSettings: Record<string, unknown> = {
            type: 'report',
            reportID: reportId,
            action,
          };
          if (args.comment) inputSettings.comment = args.comment;

          return this.postJob({
            type: 'update',
            credentials: this.credentials(),
            inputSettings,
          });
        }

        case 'export_report': {
          const policyId = args.policy_id as string;
          const templateName = args.template_name as string;

          if (!policyId || !templateName) {
            return { content: [{ type: 'text', text: 'policy_id and template_name are required' }], isError: true };
          }

          const filters: Record<string, unknown> = { policyID: policyId };
          if (args.report_state) filters.reportState = args.report_state;
          if (args.start_date) filters.startDate = args.start_date;
          if (args.end_date) filters.endDate = args.end_date;

          return this.postJob({
            type: 'file',
            credentials: this.credentials(),
            inputSettings: {
              type: 'combinedReportData',
              filters,
            },
            onReceive: {
              immediateResponse: ['returnRandomFileName'],
            },
            outputSettings: {
              fileExtension: 'csv',
              fileBasename: templateName,
            },
          });
        }

        case 'get_categories': {
          const policyId = args.policy_id as string;
          if (!policyId) {
            return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
          }

          return this.postJob({
            type: 'get',
            credentials: this.credentials(),
            inputSettings: {
              type: 'policy',
              fields: ['categories'],
              policyID: policyId,
            },
          });
        }

        case 'invite_employee': {
          const policyId = args.policy_id as string;
          const employeeEmail = args.employee_email as string;

          if (!policyId || !employeeEmail) {
            return { content: [{ type: 'text', text: 'policy_id and employee_email are required' }], isError: true };
          }

          const employee: Record<string, unknown> = { email: employeeEmail };
          if (args.first_name) employee.firstName = args.first_name;
          if (args.last_name) employee.lastName = args.last_name;
          if (args.manager_email) employee.managerEmail = args.manager_email;

          return this.postJob({
            type: 'update',
            credentials: this.credentials(),
            inputSettings: {
              type: 'employees',
              policyID: policyId,
              employees: [employee],
            },
          });
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
