/**
 * Dialpad MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// Dialpad's "Dialtone MCP Server" (github.com/dialpad/dialtone) is a design-system search tool,
// not an API integration MCP. No official Dialpad API MCP server found on GitHub.
//
// Base URL: https://dialpad.com/api/v2
// Auth: Bearer token (API key used as bearer token in Authorization header)
// Docs: https://developers.dialpad.com/docs/welcome
// Rate limits: 20 requests per second per company

import { ToolDefinition, ToolResult } from './types.js';

interface DialpadConfig {
  apiKey: string;
  baseUrl?: string;
}

export class DialpadMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: DialpadConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://dialpad.com/api/v2';
  }

  static catalog() {
    return {
      name: 'dialpad',
      displayName: 'Dialpad',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'dialpad', 'voip', 'phone', 'call', 'sms', 'messaging', 'business communications',
        'contact center', 'ai calling', 'voice', 'user management', 'analytics',
        'dialpad ai', 'uccaas',
      ],
      toolNames: [
        'list_users', 'get_user', 'get_current_user',
        'list_calls', 'get_call', 'initiate_call',
        'send_sms', 'list_sms',
        'list_contacts', 'get_contact', 'create_contact', 'update_contact', 'delete_contact',
        'list_call_logs', 'get_call_analytics',
        'list_departments', 'get_department',
        'list_numbers', 'get_number',
      ],
      description: 'Dialpad AI business communications: manage calls, SMS, contacts, users, departments, phone numbers, and retrieve call analytics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List users in the Dialpad company with optional filters for state and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            state: {
              type: 'string',
              description: 'Filter by user state: active, suspended, deleted (default: active)',
            },
            email: {
              type: 'string',
              description: 'Filter users by email address (exact match)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get detailed information about a specific Dialpad user by their user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Dialpad user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_current_user',
        description: 'Get the profile and account information for the currently authenticated Dialpad user',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_calls',
        description: 'List recent calls with optional filters for direction, type, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of calls to return (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            started_after: {
              type: 'number',
              description: 'Filter calls started after this Unix timestamp (milliseconds)',
            },
            started_before: {
              type: 'number',
              description: 'Filter calls started before this Unix timestamp (milliseconds)',
            },
            direction: {
              type: 'string',
              description: 'Filter by call direction: inbound or outbound',
            },
            call_type: {
              type: 'string',
              description: 'Filter by call type: voip, pstn',
            },
          },
        },
      },
      {
        name: 'get_call',
        description: 'Get detailed information about a specific call by call ID, including recording and transcript metadata',
        inputSchema: {
          type: 'object',
          properties: {
            call_id: {
              type: 'string',
              description: 'Dialpad call ID',
            },
          },
          required: ['call_id'],
        },
      },
      {
        name: 'initiate_call',
        description: 'Initiate an outbound call from a Dialpad user or number to a destination phone number',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number: {
              type: 'string',
              description: 'Destination phone number in E.164 format (e.g. +12025551234)',
            },
            user_id: {
              type: 'string',
              description: 'ID of the Dialpad user initiating the call',
            },
            outbound_caller_id: {
              type: 'string',
              description: 'Caller ID phone number to display to the recipient in E.164 format',
            },
          },
          required: ['phone_number', 'user_id'],
        },
      },
      {
        name: 'send_sms',
        description: 'Send an SMS or MMS message from a Dialpad number to one or more recipients',
        inputSchema: {
          type: 'object',
          properties: {
            to_numbers: {
              type: 'string',
              description: 'Comma-separated list of destination phone numbers in E.164 format',
            },
            text: {
              type: 'string',
              description: 'Text content of the SMS message (max 1600 characters)',
            },
            from_number: {
              type: 'string',
              description: 'Dialpad phone number to send from in E.164 format',
            },
            user_id: {
              type: 'string',
              description: 'ID of the user sending the message',
            },
          },
          required: ['to_numbers', 'text', 'user_id'],
        },
      },
      {
        name: 'list_sms',
        description: 'List SMS/MMS messages with optional filters for direction, phone number, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of messages to return (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            created_after: {
              type: 'number',
              description: 'Filter messages created after this Unix timestamp (milliseconds)',
            },
            direction: {
              type: 'string',
              description: 'Filter by direction: inbound or outbound',
            },
          },
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts in the Dialpad company directory with optional search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of contacts to return (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            search: {
              type: 'string',
              description: 'Search query to filter contacts by name, email, or phone',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Get detailed information about a specific Dialpad contact by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Dialpad contact ID',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in the Dialpad company directory',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'Contact first name',
            },
            last_name: {
              type: 'string',
              description: 'Contact last name',
            },
            phone_numbers: {
              type: 'string',
              description: 'Comma-separated list of phone numbers in E.164 format',
            },
            email: {
              type: 'string',
              description: 'Contact email address',
            },
            company_name: {
              type: 'string',
              description: 'Contact company or organization name',
            },
            job_title: {
              type: 'string',
              description: 'Contact job title',
            },
          },
          required: ['first_name'],
        },
      },
      {
        name: 'update_contact',
        description: 'Update an existing Dialpad contact by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Dialpad contact ID to update',
            },
            first_name: {
              type: 'string',
              description: 'Updated first name',
            },
            last_name: {
              type: 'string',
              description: 'Updated last name',
            },
            phone_numbers: {
              type: 'string',
              description: 'Updated comma-separated list of phone numbers in E.164 format',
            },
            email: {
              type: 'string',
              description: 'Updated email address',
            },
            company_name: {
              type: 'string',
              description: 'Updated company name',
            },
            job_title: {
              type: 'string',
              description: 'Updated job title',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'delete_contact',
        description: 'Delete a contact from the Dialpad company directory by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Dialpad contact ID to delete',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'list_call_logs',
        description: 'List call log records with filters for date range, user, and call type for reporting purposes',
        inputSchema: {
          type: 'object',
          properties: {
            started_after: {
              type: 'number',
              description: 'Filter logs for calls started after this Unix timestamp (milliseconds)',
            },
            started_before: {
              type: 'number',
              description: 'Filter logs for calls started before this Unix timestamp (milliseconds)',
            },
            user_id: {
              type: 'string',
              description: 'Filter logs for a specific user ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of log records to return (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_call_analytics',
        description: 'Retrieve call analytics data including volume, duration, and performance metrics for a date range',
        inputSchema: {
          type: 'object',
          properties: {
            date_start: {
              type: 'string',
              description: 'Start date for analytics in YYYY-MM-DD format',
            },
            date_end: {
              type: 'string',
              description: 'End date for analytics in YYYY-MM-DD format',
            },
            user_id: {
              type: 'string',
              description: 'Filter analytics for a specific user ID',
            },
            department_id: {
              type: 'string',
              description: 'Filter analytics for a specific department ID',
            },
            timezone: {
              type: 'string',
              description: 'Timezone for date grouping (e.g. America/New_York). Default: UTC',
            },
          },
          required: ['date_start', 'date_end'],
        },
      },
      {
        name: 'list_departments',
        description: 'List departments (call centers, groups) in the Dialpad company with member counts',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of departments to return (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_department',
        description: 'Get detailed information about a specific Dialpad department by department ID',
        inputSchema: {
          type: 'object',
          properties: {
            department_id: {
              type: 'string',
              description: 'Dialpad department ID',
            },
          },
          required: ['department_id'],
        },
      },
      {
        name: 'list_numbers',
        description: 'List phone numbers assigned to the Dialpad company with type and assignment details',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of phone numbers to return (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_number',
        description: 'Get details about a specific Dialpad phone number including assignment and capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            number_id: {
              type: 'string',
              description: 'Dialpad phone number ID',
            },
          },
          required: ['number_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'get_current_user':
          return this.getCurrentUser();
        case 'list_calls':
          return this.listCalls(args);
        case 'get_call':
          return this.getCall(args);
        case 'initiate_call':
          return this.initiateCall(args);
        case 'send_sms':
          return this.sendSms(args);
        case 'list_sms':
          return this.listSms(args);
        case 'list_contacts':
          return this.listContacts(args);
        case 'get_contact':
          return this.getContact(args);
        case 'create_contact':
          return this.createContact(args);
        case 'update_contact':
          return this.updateContact(args);
        case 'delete_contact':
          return this.deleteContact(args);
        case 'list_call_logs':
          return this.listCallLogs(args);
        case 'get_call_analytics':
          return this.getCallAnalytics(args);
        case 'list_departments':
          return this.listDepartments(args);
        case 'get_department':
          return this.getDepartment(args);
        case 'list_numbers':
          return this.listNumbers(args);
        case 'get_number':
          return this.getNumber(args);
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

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async dialpadGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await fetch(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async dialpadPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async dialpadPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async dialpadDelete(path: string): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (response.status === 204 || response.ok) {
      return { content: [{ type: 'text', text: 'Deleted successfully' }], isError: false };
    }
    return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 25) };
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.state) params.state = args.state as string;
    if (args.email) params.email = args.email as string;
    return this.dialpadGet('/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.dialpadGet(`/users/${args.user_id}`);
  }

  private async getCurrentUser(): Promise<ToolResult> {
    return this.dialpadGet('/users/me');
  }

  private async listCalls(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 25) };
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.started_after) params.started_after = String(args.started_after);
    if (args.started_before) params.started_before = String(args.started_before);
    if (args.direction) params.direction = args.direction as string;
    if (args.call_type) params.call_type = args.call_type as string;
    return this.dialpadGet('/calls', params);
  }

  private async getCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.call_id) return { content: [{ type: 'text', text: 'call_id is required' }], isError: true };
    return this.dialpadGet(`/calls/${args.call_id}`);
  }

  private async initiateCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone_number || !args.user_id) {
      return { content: [{ type: 'text', text: 'phone_number and user_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      phone_number: args.phone_number,
      user_id: args.user_id,
    };
    if (args.outbound_caller_id) body.outbound_caller_id = args.outbound_caller_id;
    return this.dialpadPost('/calls', body);
  }

  private async sendSms(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.to_numbers || !args.text || !args.user_id) {
      return { content: [{ type: 'text', text: 'to_numbers, text, and user_id are required' }], isError: true };
    }
    const toList = (args.to_numbers as string).split(',').map(n => n.trim());
    const body: Record<string, unknown> = {
      to_numbers: toList,
      text: args.text,
      user_id: args.user_id,
    };
    if (args.from_number) body.from_number = args.from_number;
    return this.dialpadPost('/sms', body);
  }

  private async listSms(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 25) };
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.created_after) params.created_after = String(args.created_after);
    if (args.direction) params.direction = args.direction as string;
    return this.dialpadGet('/sms', params);
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 25) };
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.search) params.search = args.search as string;
    return this.dialpadGet('/contacts', params);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.dialpadGet(`/contacts/${args.contact_id}`);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name) return { content: [{ type: 'text', text: 'first_name is required' }], isError: true };
    const body: Record<string, unknown> = { first_name: args.first_name };
    if (args.last_name) body.last_name = args.last_name;
    if (args.phone_numbers) body.phones = (args.phone_numbers as string).split(',').map(p => ({ phone_number: p.trim() }));
    if (args.email) body.emails = [{ email: args.email }];
    if (args.company_name) body.company_name = args.company_name;
    if (args.job_title) body.job_title = args.job_title;
    return this.dialpadPost('/contacts', body);
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.first_name) body.first_name = args.first_name;
    if (args.last_name) body.last_name = args.last_name;
    if (args.phone_numbers) body.phones = (args.phone_numbers as string).split(',').map(p => ({ phone_number: p.trim() }));
    if (args.email) body.emails = [{ email: args.email }];
    if (args.company_name) body.company_name = args.company_name;
    if (args.job_title) body.job_title = args.job_title;
    return this.dialpadPatch(`/contacts/${args.contact_id}`, body);
  }

  private async deleteContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.dialpadDelete(`/contacts/${args.contact_id}`);
  }

  private async listCallLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 25) };
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.started_after) params.started_after = String(args.started_after);
    if (args.started_before) params.started_before = String(args.started_before);
    if (args.user_id) params.user_id = args.user_id as string;
    return this.dialpadGet('/call-logs', params);
  }

  private async getCallAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.date_start || !args.date_end) {
      return { content: [{ type: 'text', text: 'date_start and date_end are required' }], isError: true };
    }
    const params: Record<string, string> = {
      date_start: args.date_start as string,
      date_end: args.date_end as string,
    };
    if (args.user_id) params.user_id = args.user_id as string;
    if (args.department_id) params.department_id = args.department_id as string;
    if (args.timezone) params.timezone = args.timezone as string;
    return this.dialpadGet('/analytics/calls', params);
  }

  private async listDepartments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 25) };
    if (args.cursor) params.cursor = args.cursor as string;
    return this.dialpadGet('/departments', params);
  }

  private async getDepartment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.department_id) return { content: [{ type: 'text', text: 'department_id is required' }], isError: true };
    return this.dialpadGet(`/departments/${args.department_id}`);
  }

  private async listNumbers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 25) };
    if (args.cursor) params.cursor = args.cursor as string;
    return this.dialpadGet('/numbers', params);
  }

  private async getNumber(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.number_id) return { content: [{ type: 'text', text: 'number_id is required' }], isError: true };
    return this.dialpadGet(`/numbers/${args.number_id}`);
  }
}
