/**
 * KnowBe4 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/mirage-security/knowbe4-mcp-server — transport: stdio, auth: API token
// Note: This is a third-party MCP by Mirage Security, NOT an official KnowBe4 MCP server.
// Our adapter covers: 14 tools (phishing, training, users, groups, risk scores). Vendor MCP covers: 92+ GraphQL queries.
// Recommendation: Use this adapter for standard REST reporting. Use vendor MCP for advanced GraphQL queries.
//
// Base URL: https://us.api.knowbe4.com/v1 (region-specific: us, eu, ca, de, uk)
// Auth: Bearer token — API key from Account Settings > API > Reporting API
// Docs: https://developer.knowbe4.com/
// Rate limits: 50 requests/min, 2000 req/day (+ 1 per licensed user), 4 req/sec max

import { ToolDefinition, ToolResult } from './types.js';

interface KnowBe4Config {
  apiToken: string;
  region?: string; // us (default), eu, ca, de, uk
  baseUrl?: string;
}

export class KnowBe4MCPServer {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: KnowBe4Config) {
    this.apiToken = config.apiToken;
    const region = config.region || 'us';
    this.baseUrl = config.baseUrl || `https://${region}.api.knowbe4.com/v1`;
  }

  static catalog() {
    return {
      name: 'knowbe4',
      displayName: 'KnowBe4',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: [
        'knowbe4', 'security awareness', 'phishing', 'phishing simulation', 'training',
        'security training', 'risk score', 'phish-prone', 'campaign', 'user risk',
        'groups', 'compliance training', 'KSAT',
      ],
      toolNames: [
        'get_account_info',
        'list_users', 'get_user', 'get_user_risk_score',
        'list_groups', 'get_group', 'list_group_members',
        'list_phishing_campaigns', 'get_phishing_campaign', 'list_phishing_security_tests',
        'list_training_campaigns', 'get_training_campaign',
        'list_training_enrollments',
        'get_phishing_campaign_results',
      ],
      description: 'KnowBe4 security awareness: query phishing campaigns, training enrollments, user risk scores, phish-prone percentages, and group data.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_account_info',
        description: 'Retrieve KnowBe4 account information including subscription, licensed users, and account settings',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_users',
        description: 'List all users in the KnowBe4 account with optional status and group filters and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: active, archived (default: active)',
            },
            group_id: {
              type: 'number',
              description: 'Filter users belonging to a specific group ID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get detailed profile and risk information for a specific KnowBe4 user by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'KnowBe4 user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_risk_score',
        description: 'Get the current risk score and phish-prone percentage history for a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'KnowBe4 user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_groups',
        description: 'List all user groups in the KnowBe4 account with optional type filter',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by group type: console_group, smart_group (default: returns all)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Get details for a specific KnowBe4 user group by group ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'number',
              description: 'KnowBe4 group ID',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'list_group_members',
        description: 'List all members of a specific KnowBe4 group with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'number',
              description: 'KnowBe4 group ID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'list_phishing_campaigns',
        description: 'List all phishing campaigns with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by campaign status: active, closed (default: returns all)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
        },
      },
      {
        name: 'get_phishing_campaign',
        description: 'Get detailed information about a specific phishing campaign by campaign ID',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'number',
              description: 'KnowBe4 phishing campaign ID',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'list_phishing_security_tests',
        description: 'List phishing security tests (PSTs) within a campaign including click rates and delivery stats',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'number',
              description: 'Phishing campaign ID to retrieve tests for',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'get_phishing_campaign_results',
        description: 'Get recipient-level results for a phishing security test including who clicked, opened, or reported the email',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'number',
              description: 'Phishing campaign ID',
            },
            pst_id: {
              type: 'number',
              description: 'Phishing security test (PST) ID within the campaign',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
          required: ['campaign_id', 'pst_id'],
        },
      },
      {
        name: 'list_training_campaigns',
        description: 'List all training campaigns with optional status filter showing completion rates and enrollment counts',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by campaign status: active, closed (default: returns all)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
        },
      },
      {
        name: 'get_training_campaign',
        description: 'Get detailed information about a specific training campaign by campaign ID',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'number',
              description: 'KnowBe4 training campaign ID',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'list_training_enrollments',
        description: 'List training enrollments for a campaign showing user completion status, scores, and time spent',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'number',
              description: 'Training campaign ID to retrieve enrollments for',
            },
            status: {
              type: 'string',
              description: 'Filter by enrollment status: in_progress, passed, failed, not_started (default: returns all)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 500, default: 500)',
            },
          },
          required: ['campaign_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_account_info':
          return this.getAccountInfo();
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'get_user_risk_score':
          return this.getUserRiskScore(args);
        case 'list_groups':
          return this.listGroups(args);
        case 'get_group':
          return this.getGroup(args);
        case 'list_group_members':
          return this.listGroupMembers(args);
        case 'list_phishing_campaigns':
          return this.listPhishingCampaigns(args);
        case 'get_phishing_campaign':
          return this.getPhishingCampaign(args);
        case 'list_phishing_security_tests':
          return this.listPhishingSecurityTests(args);
        case 'get_phishing_campaign_results':
          return this.getPhishingCampaignResults(args);
        case 'list_training_campaigns':
          return this.listTrainingCampaigns(args);
        case 'get_training_campaign':
          return this.getTrainingCampaign(args);
        case 'list_training_enrollments':
          return this.listTrainingEnrollments(args);
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
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await fetch(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAccountInfo(): Promise<ToolResult> {
    return this.get('/account');
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    if (args.status) params.status = args.status as string;
    if (args.group_id) params.group_id = String(args.group_id);
    return this.get('/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.get(`/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async getUserRiskScore(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.get(`/users/${encodeURIComponent(args.user_id as string)}/risk_score_history`);
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    if (args.type) params.type = args.type as string;
    return this.get('/groups', params);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.get(`/groups/${encodeURIComponent(args.group_id as string)}`);
  }

  private async listGroupMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    return this.get(`/groups/${encodeURIComponent(args.group_id as string)}/members`, params);
  }

  private async listPhishingCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    if (args.status) params.status = args.status as string;
    return this.get('/phishing/campaigns', params);
  }

  private async getPhishingCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.get(`/phishing/campaigns/${encodeURIComponent(args.campaign_id as string)}`);
  }

  private async listPhishingSecurityTests(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    return this.get(`/phishing/campaigns/${encodeURIComponent(args.campaign_id as string)}/security_tests`, params);
  }

  private async getPhishingCampaignResults(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id || !args.pst_id) {
      return { content: [{ type: 'text', text: 'campaign_id and pst_id are required' }], isError: true };
    }
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    return this.get(`/phishing/campaigns/${encodeURIComponent(args.campaign_id as string)}/security_tests/${encodeURIComponent(args.pst_id as string)}/recipients`, params);
  }

  private async listTrainingCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    if (args.status) params.status = args.status as string;
    return this.get('/training/campaigns', params);
  }

  private async getTrainingCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.get(`/training/campaigns/${encodeURIComponent(args.campaign_id as string)}`);
  }

  private async listTrainingEnrollments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String((args.per_page as number) || 500),
    };
    if (args.status) params.status = args.status as string;
    return this.get(`/training/campaigns/${encodeURIComponent(args.campaign_id as string)}/enrollments`, params);
  }
}
