/**
 * Culture Amp MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Culture Amp MCP server was found on GitHub or the MCP registry.
//
// Base URL: https://api.cultureamp.com/v1
// Auth: OAuth2 client credentials flow — token endpoint: https://api.cultureamp.com/v1/oauth2/token
// Docs: https://docs.api.cultureamp.com/docs/resources-getting-started
// Rate limits: Not publicly documented; apply reasonable backoff on 429 responses.
// Note: The legacy Survey API (https://api.cultureamp.com/v1/surveys) was deprecated Feb 2026.
//       Use the Reporting API for survey/response data.

import { ToolDefinition, ToolResult } from './types.js';

interface CultureAmpConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class CultureAmpMCPServer {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: CultureAmpConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.cultureamp.com/v1';
  }

  static catalog() {
    return {
      name: 'culture-amp',
      displayName: 'Culture Amp',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'culture amp', 'employee engagement', 'engagement survey', 'hr', 'people analytics',
        'performance review', 'feedback', 'pulse survey', 'eNPS', 'workforce', 'retention',
        'employee experience', 'manager effectiveness',
      ],
      toolNames: [
        'list_employees', 'get_employee', 'list_employee_demographics',
        'list_surveys', 'get_survey', 'list_survey_responses',
        'list_performance_cycles', 'get_performance_cycle', 'list_performance_reviews',
      ],
      description: 'Culture Amp employee engagement and performance data: list employees, survey results, response data, and performance review cycles.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_employees',
        description: 'List all employees in the Culture Amp account with optional pagination cursor',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response to retrieve the next page of employees',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of employees to return per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_employee',
        description: 'Retrieve detailed profile information for a specific Culture Amp employee by their ID',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'Unique Culture Amp employee ID',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'list_employee_demographics',
        description: 'List demographic attributes for a specific employee, including department, location, and custom properties',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'Unique Culture Amp employee ID to retrieve demographics for',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'list_surveys',
        description: 'List all engagement and pulse surveys in the Culture Amp account with status and date information',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter surveys by status: active, closed, draft (default: no filter, returns all)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of surveys to return per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_survey',
        description: 'Retrieve metadata and question details for a specific Culture Amp survey by survey ID',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Unique Culture Amp survey ID',
            },
          },
          required: ['survey_id'],
        },
      },
      {
        name: 'list_survey_responses',
        description: 'List completed responses for a survey via the Reporting API, with pagination support for large response sets',
        inputSchema: {
          type: 'object',
          properties: {
            survey_id: {
              type: 'string',
              description: 'Unique Culture Amp survey ID to retrieve responses for',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response (responses are paginated at 1000 per page)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of responses per page (default: 1000, max: 1000)',
            },
          },
          required: ['survey_id'],
        },
      },
      {
        name: 'list_performance_cycles',
        description: 'List all performance review cycles in Culture Amp with cycle name, status, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter cycles by status: active, completed, draft (default: no filter)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of cycles to return per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_performance_cycle',
        description: 'Retrieve details for a specific Culture Amp performance review cycle by cycle ID',
        inputSchema: {
          type: 'object',
          properties: {
            cycle_id: {
              type: 'string',
              description: 'Unique performance cycle ID',
            },
          },
          required: ['cycle_id'],
        },
      },
      {
        name: 'list_performance_reviews',
        description: 'List performance reviews (evaluations) within a specific cycle, with employee and reviewer details',
        inputSchema: {
          type: 'object',
          properties: {
            cycle_id: {
              type: 'string',
              description: 'Unique performance cycle ID to retrieve reviews from',
            },
            employee_id: {
              type: 'string',
              description: 'Filter reviews for a specific employee by their ID',
            },
            status: {
              type: 'string',
              description: 'Filter by review status: pending, in_progress, completed (default: no filter)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of reviews to return per page (default: 100)',
            },
          },
          required: ['cycle_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_employees':
          return this.listEmployees(args);
        case 'get_employee':
          return this.getEmployee(args);
        case 'list_employee_demographics':
          return this.listEmployeeDemographics(args);
        case 'list_surveys':
          return this.listSurveys(args);
        case 'get_survey':
          return this.getSurvey(args);
        case 'list_survey_responses':
          return this.listSurveyResponses(args);
        case 'list_performance_cycles':
          return this.listPerformanceCycles(args);
        case 'get_performance_cycle':
          return this.getPerformanceCycle(args);
        case 'list_performance_reviews':
          return this.listPerformanceReviews(args);
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
    const response = await fetch(`${this.baseUrl}/oauth2/token`, {
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

  private async apiGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const url = `${this.baseUrl}${path}${qs}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.limit) params.limit = String(args.limit);
    return this.apiGet('/employees', params);
  }

  private async getEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.employee_id) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    return this.apiGet(`/employees/${encodeURIComponent(args.employee_id as string)}`);
  }

  private async listEmployeeDemographics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.employee_id) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    return this.apiGet(`/employees/${encodeURIComponent(args.employee_id as string)}/demographics`);
  }

  private async listSurveys(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.status) params.status = args.status as string;
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.limit) params.limit = String(args.limit);
    return this.apiGet('/surveys', params);
  }

  private async getSurvey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id) return { content: [{ type: 'text', text: 'survey_id is required' }], isError: true };
    return this.apiGet(`/surveys/${encodeURIComponent(args.survey_id as string)}`);
  }

  private async listSurveyResponses(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.survey_id) return { content: [{ type: 'text', text: 'survey_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.limit) params.limit = String(args.limit);
    // Reporting API uses a different path structure
    return this.apiGet(`/surveys/${encodeURIComponent(args.survey_id as string)}/responses`, params);
  }

  private async listPerformanceCycles(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.status) params.status = args.status as string;
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.limit) params.limit = String(args.limit);
    return this.apiGet('/performance_cycles', params);
  }

  private async getPerformanceCycle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cycle_id) return { content: [{ type: 'text', text: 'cycle_id is required' }], isError: true };
    return this.apiGet(`/performance_cycles/${encodeURIComponent(args.cycle_id as string)}`);
  }

  private async listPerformanceReviews(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cycle_id) return { content: [{ type: 'text', text: 'cycle_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.employee_id) params.employee_id = args.employee_id as string;
    if (args.status) params.status = args.status as string;
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.limit) params.limit = String(args.limit);
    return this.apiGet(`/performance_cycles/${encodeURIComponent(args.cycle_id as string)}/reviews`, params);
  }
}
