/**
 * Medallia MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Medallia MCP server was found on GitHub or the MCP registry.
//
// Base URL: https://{instance}-{company}.apis.medallia.com (instance-specific; set via baseUrl)
// Auth: OAuth2 client credentials — token endpoint: https://{instance}.medallia.com/oauth/{company}/token
// Docs: https://developer.medallia.com/medallia-apis/reference/integrations
// Rate limits: Cost-unit throttling per query; Query API capped at 3,000,000 cost-units per query

import { ToolDefinition, ToolResult } from './types.js';

interface MedalliaConfig {
  clientId: string;
  clientSecret: string;
  instance: string;   // e.g. "companyname" — used in token URL: https://{instance}.medallia.com
  company: string;    // e.g. "companyname" — used in API base: https://{instance}-{company}.apis.medallia.com
  baseUrl?: string;   // optional override for the API gateway base
}

export class MedalliaMCPServer {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly instance: string;
  private readonly company: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: MedalliaConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.instance = config.instance;
    this.company = config.company;
    this.baseUrl = config.baseUrl || `https://${config.instance}-${config.company}.apis.medallia.com`;
  }

  static catalog() {
    return {
      name: 'medallia',
      displayName: 'Medallia',
      version: '1.0.0',
      category: 'misc',
      keywords: ['medallia', 'cx', 'customer experience', 'feedback', 'survey', 'nps', 'csat', 'voice of customer', 'voc', 'reporting', 'response', 'touchpoint'],
      toolNames: [
        'query_feedback',
        'get_report',
        'list_reports',
        'list_roles',
        'list_units',
        'get_response',
        'search_responses',
        'get_field_definitions',
        'list_programs',
        'list_invitations',
        'create_invitation',
        'get_usage_stats',
      ],
      description: 'Medallia Experience Cloud: query customer feedback, retrieve survey responses, run reports, list programs and touchpoints for CX analytics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query_feedback',
        description: 'Run a Query API request to retrieve aggregated feedback data with optional field filters, date range, and metric grouping',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'JSON string of the Medallia Query API request body (fields, rules, metrics, groupby)',
            },
            resource_group: {
              type: 'string',
              description: 'API resource group path (e.g. "feedback/v1") — defaults to "feedback/v1"',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_report',
        description: 'Retrieve a specific Medallia report by report ID, returning its configuration and last run results',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'The report ID to retrieve',
            },
          },
          required: ['report_id'],
        },
      },
      {
        name: 'list_reports',
        description: 'List available Medallia reports accessible to the authenticated account with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of reports per page (default: 50, max: 200)',
            },
          },
        },
      },
      {
        name: 'list_roles',
        description: 'List Medallia roles defined in the instance for access control and permission auditing',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of roles per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'list_units',
        description: 'List organizational units (touchpoints, programs) available in the Medallia instance',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of units per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_response',
        description: 'Retrieve a single survey response record by response ID, including all field values and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            response_id: {
              type: 'string',
              description: 'The unique response ID to retrieve',
            },
          },
          required: ['response_id'],
        },
      },
      {
        name: 'search_responses',
        description: 'Search survey responses by date range, NPS score, or field value filters with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start date for the response window (ISO 8601: YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'End date for the response window (ISO 8601: YYYY-MM-DD)',
            },
            unit_id: {
              type: 'string',
              description: 'Filter by touchpoint or program unit ID (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of responses per page (default: 50, max: 200)',
            },
          },
        },
      },
      {
        name: 'get_field_definitions',
        description: 'List field definitions (survey questions, data fields, metrics) available for querying in a program',
        inputSchema: {
          type: 'object',
          properties: {
            unit_id: {
              type: 'string',
              description: 'The unit (touchpoint) ID to retrieve field definitions for',
            },
          },
          required: ['unit_id'],
        },
      },
      {
        name: 'list_programs',
        description: 'List CX programs configured in the Medallia instance, including program type and touchpoints',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of programs per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'list_invitations',
        description: 'List survey invitations sent to customers, with optional filtering by status and date range',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by invitation status: sent, opened, completed, bounced (optional)',
            },
            start_date: {
              type: 'string',
              description: 'Filter invitations sent after this date (ISO 8601: YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Filter invitations sent before this date (ISO 8601: YYYY-MM-DD)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of invitations per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'create_invitation',
        description: 'Create and send a survey invitation to a customer for a specific Medallia program or touchpoint',
        inputSchema: {
          type: 'object',
          properties: {
            unit_id: {
              type: 'string',
              description: 'The touchpoint or program unit ID to send the invitation for',
            },
            email: {
              type: 'string',
              description: 'Recipient email address',
            },
            customer_data: {
              type: 'string',
              description: 'JSON string of key-value pairs to pre-populate in the survey (optional)',
            },
          },
          required: ['unit_id', 'email'],
        },
      },
      {
        name: 'get_usage_stats',
        description: 'Retrieve API usage statistics for the current period including request counts and cost-unit consumption',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'query_feedback':
          return this.queryFeedback(args);
        case 'get_report':
          return this.getReport(args);
        case 'list_reports':
          return this.listReports(args);
        case 'list_roles':
          return this.listRoles(args);
        case 'list_units':
          return this.listUnits(args);
        case 'get_response':
          return this.getResponse(args);
        case 'search_responses':
          return this.searchResponses(args);
        case 'get_field_definitions':
          return this.getFieldDefinitions(args);
        case 'list_programs':
          return this.listPrograms(args);
        case 'list_invitations':
          return this.listInvitations(args);
        case 'create_invitation':
          return this.createInvitation(args);
        case 'get_usage_stats':
          return this.getUsageStats();
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const tokenUrl = `https://${this.instance}.medallia.com/oauth/${this.company}/token`;
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async mGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await fetch(`${this.baseUrl}${path}${qs}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async mPost(path: string, body: unknown): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async queryFeedback(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    let queryBody: unknown;
    try {
      queryBody = JSON.parse(args.query as string);
    } catch {
      return { content: [{ type: 'text', text: 'query must be valid JSON' }], isError: true };
    }
    const resourceGroup = (args.resource_group as string) ?? 'feedback/v1';
    return this.mPost(`/${resourceGroup}/query`, queryBody);
  }

  private async getReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.report_id) return { content: [{ type: 'text', text: 'report_id is required' }], isError: true };
    return this.mGet(`/reporting/v1/reports/${encodeURIComponent(args.report_id as string)}`);
  }

  private async listReports(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 0),
      pageSize: String((args.page_size as number) ?? 50),
    };
    return this.mGet('/reporting/v1/reports', params);
  }

  private async listRoles(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 0),
      pageSize: String((args.page_size as number) ?? 50),
    };
    return this.mGet('/admin/v1/roles', params);
  }

  private async listUnits(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 0),
      pageSize: String((args.page_size as number) ?? 50),
    };
    return this.mGet('/feedback/v1/units', params);
  }

  private async getResponse(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.response_id) return { content: [{ type: 'text', text: 'response_id is required' }], isError: true };
    return this.mGet(`/feedback/v1/responses/${encodeURIComponent(args.response_id as string)}`);
  }

  private async searchResponses(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 0),
      pageSize: String((args.page_size as number) ?? 50),
    };
    if (args.start_date) params.startDate = args.start_date as string;
    if (args.end_date) params.endDate = args.end_date as string;
    if (args.unit_id) params.unitId = args.unit_id as string;
    return this.mGet('/feedback/v1/responses', params);
  }

  private async getFieldDefinitions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.unit_id) return { content: [{ type: 'text', text: 'unit_id is required' }], isError: true };
    return this.mGet(`/feedback/v1/units/${encodeURIComponent(args.unit_id as string)}/fields`);
  }

  private async listPrograms(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 0),
      pageSize: String((args.page_size as number) ?? 50),
    };
    return this.mGet('/feedback/v1/programs', params);
  }

  private async listInvitations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 0),
      pageSize: String((args.page_size as number) ?? 50),
    };
    if (args.status) params.status = args.status as string;
    if (args.start_date) params.startDate = args.start_date as string;
    if (args.end_date) params.endDate = args.end_date as string;
    return this.mGet('/feedback/v1/invitations', params);
  }

  private async createInvitation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.unit_id || !args.email) {
      return { content: [{ type: 'text', text: 'unit_id and email are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      unitId: args.unit_id,
      recipient: { email: args.email },
    };
    if (args.customer_data) {
      try {
        body.customerData = JSON.parse(args.customer_data as string);
      } catch {
        return { content: [{ type: 'text', text: 'customer_data must be valid JSON' }], isError: true };
      }
    }
    return this.mPost('/feedback/v1/invitations', body);
  }

  private async getUsageStats(): Promise<ToolResult> {
    return this.mGet('/feedback/v1/usage');
  }
}
