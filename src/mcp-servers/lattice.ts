/**
 * Lattice MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Lattice MCP server was found on GitHub or npm.
//
// Base URL: https://api.latticehq.com/v1
// Auth: Bearer token — API key generated in Lattice Admin > Platform > API Keys
// Docs: https://lattice.com/api, https://help.lattice.com/hc/en-us/articles/360059449534-Lattice-s-Public-API
// Rate limits: Not publicly documented — contact Lattice support for limits

import { ToolDefinition, ToolResult } from './types.js';

interface LatticeConfig {
  apiKey: string;
  baseUrl?: string;
}

export class LatticeMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LatticeConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.latticehq.com/v1';
  }

  static catalog() {
    return {
      name: 'lattice',
      displayName: 'Lattice',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'lattice', 'performance management', 'okr', 'goals', 'reviews', 'performance review',
        '1-on-1', 'one on one', 'feedback', 'engagement', 'pulse survey', 'compensation',
        'hr', 'people management', 'employee development', 'growth plans',
      ],
      toolNames: [
        'list_users', 'get_user',
        'list_departments', 'get_department',
        'list_goals', 'get_goal', 'create_goal', 'update_goal',
        'list_review_cycles', 'get_review_cycle',
        'list_reviews', 'get_review',
        'list_feedback', 'create_feedback',
        'list_one_on_ones',
      ],
      description: 'Lattice performance management: query users, goals/OKRs, performance review cycles, peer feedback, 1-on-1 meetings, and department structure.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List all Lattice users (employees) with optional status, department, and manager filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by employment status: active, inactive (default: active)',
            },
            department_id: {
              type: 'string',
              description: 'Filter users by department ID',
            },
            manager_id: {
              type: 'string',
              description: 'Filter users reporting to a specific manager ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 50)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get profile information for a specific Lattice user by user ID including manager and department',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Lattice user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_departments',
        description: 'List all departments in the Lattice organization with member counts and hierarchy info',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of departments to return (default: 50)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_department',
        description: 'Get details for a specific department by department ID including parent department and members',
        inputSchema: {
          type: 'object',
          properties: {
            department_id: {
              type: 'string',
              description: 'Lattice department ID',
            },
          },
          required: ['department_id'],
        },
      },
      {
        name: 'list_goals',
        description: 'List goals and OKRs with optional filters for status, owner, department, and time period',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by goal status: active, completed, cancelled (default: active)',
            },
            owner_id: {
              type: 'string',
              description: 'Filter by goal owner user ID',
            },
            department_id: {
              type: 'string',
              description: 'Filter by department ID',
            },
            type: {
              type: 'string',
              description: 'Filter by goal type: individual, team, company (default: returns all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of goals to return (default: 50)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_goal',
        description: 'Get detailed information about a specific goal or OKR by goal ID including key results and progress',
        inputSchema: {
          type: 'object',
          properties: {
            goal_id: {
              type: 'string',
              description: 'Lattice goal ID',
            },
          },
          required: ['goal_id'],
        },
      },
      {
        name: 'create_goal',
        description: 'Create a new goal or OKR for an individual user, team, or the company',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Title or name of the goal',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the goal',
            },
            owner_id: {
              type: 'string',
              description: 'User ID of the goal owner',
            },
            type: {
              type: 'string',
              description: 'Goal type: individual, team, company',
            },
            due_date: {
              type: 'string',
              description: 'Goal due date in ISO 8601 format (YYYY-MM-DD)',
            },
          },
          required: ['name', 'owner_id'],
        },
      },
      {
        name: 'update_goal',
        description: 'Update an existing goal — modify name, description, progress, status, or due date',
        inputSchema: {
          type: 'object',
          properties: {
            goal_id: {
              type: 'string',
              description: 'Lattice goal ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated goal title',
            },
            description: {
              type: 'string',
              description: 'Updated goal description',
            },
            status: {
              type: 'string',
              description: 'Updated status: active, completed, cancelled',
            },
            progress: {
              type: 'number',
              description: 'Goal progress as a percentage (0-100)',
            },
            due_date: {
              type: 'string',
              description: 'Updated due date in ISO 8601 format (YYYY-MM-DD)',
            },
          },
          required: ['goal_id'],
        },
      },
      {
        name: 'list_review_cycles',
        description: 'List all performance review cycles with status, date ranges, and participant counts',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by cycle status: active, completed, upcoming (default: returns all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of review cycles to return (default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_review_cycle',
        description: 'Get details for a specific performance review cycle by cycle ID including questions and timeline',
        inputSchema: {
          type: 'object',
          properties: {
            cycle_id: {
              type: 'string',
              description: 'Lattice review cycle ID',
            },
          },
          required: ['cycle_id'],
        },
      },
      {
        name: 'list_reviews',
        description: 'List individual performance reviews within a cycle with completion status and reviewer info',
        inputSchema: {
          type: 'object',
          properties: {
            cycle_id: {
              type: 'string',
              description: 'Review cycle ID to list reviews from',
            },
            reviewee_id: {
              type: 'string',
              description: 'Filter by reviewee (person being reviewed) user ID',
            },
            reviewer_id: {
              type: 'string',
              description: 'Filter by reviewer user ID',
            },
            status: {
              type: 'string',
              description: 'Filter by review status: draft, submitted, complete (default: returns all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of reviews to return (default: 50)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['cycle_id'],
        },
      },
      {
        name: 'get_review',
        description: 'Get detailed content of a specific performance review by review ID including answers and ratings',
        inputSchema: {
          type: 'object',
          properties: {
            review_id: {
              type: 'string',
              description: 'Lattice review ID',
            },
          },
          required: ['review_id'],
        },
      },
      {
        name: 'list_feedback',
        description: 'List peer feedback entries with optional filters for sender, recipient, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            recipient_id: {
              type: 'string',
              description: 'Filter by feedback recipient user ID',
            },
            sender_id: {
              type: 'string',
              description: 'Filter by feedback sender user ID',
            },
            start_date: {
              type: 'string',
              description: 'ISO 8601 date — only return feedback submitted on or after this date',
            },
            end_date: {
              type: 'string',
              description: 'ISO 8601 date — only return feedback submitted on or before this date',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of feedback entries to return (default: 50)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'create_feedback',
        description: 'Submit peer feedback for a Lattice user with optional visibility setting',
        inputSchema: {
          type: 'object',
          properties: {
            recipient_id: {
              type: 'string',
              description: 'User ID of the person receiving the feedback',
            },
            message: {
              type: 'string',
              description: 'Feedback message content',
            },
            visibility: {
              type: 'string',
              description: 'Visibility of the feedback: public (visible to recipient), private, manager_only (default: public)',
            },
          },
          required: ['recipient_id', 'message'],
        },
      },
      {
        name: 'list_one_on_ones',
        description: 'List 1-on-1 meeting records with optional filters for participant and date range',
        inputSchema: {
          type: 'object',
          properties: {
            participant_id: {
              type: 'string',
              description: 'Filter 1-on-1s involving a specific user ID',
            },
            start_date: {
              type: 'string',
              description: 'ISO 8601 date — only return 1-on-1s on or after this date',
            },
            end_date: {
              type: 'string',
              description: 'ISO 8601 date — only return 1-on-1s on or before this date',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of 1-on-1 records to return (default: 50)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
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
        case 'list_departments':
          return this.listDepartments(args);
        case 'get_department':
          return this.getDepartment(args);
        case 'list_goals':
          return this.listGoals(args);
        case 'get_goal':
          return this.getGoal(args);
        case 'create_goal':
          return this.createGoal(args);
        case 'update_goal':
          return this.updateGoal(args);
        case 'list_review_cycles':
          return this.listReviewCycles(args);
        case 'get_review_cycle':
          return this.getReviewCycle(args);
        case 'list_reviews':
          return this.listReviews(args);
        case 'get_review':
          return this.getReview(args);
        case 'list_feedback':
          return this.listFeedback(args);
        case 'create_feedback':
          return this.createFeedback(args);
        case 'list_one_on_ones':
          return this.listOneOnOnes(args);
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
      'Accept': 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async httpGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await fetch(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async httpPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async httpPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 50),
      page: String((args.page as number) || 1),
    };
    if (args.status) params.status = args.status as string;
    else params.status = 'active';
    if (args.department_id) params.department_id = args.department_id as string;
    if (args.manager_id) params.manager_id = args.manager_id as string;
    return this.httpGet('/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.httpGet(`/users/${args.user_id}`);
  }

  private async listDepartments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 50),
      page: String((args.page as number) || 1),
    };
    return this.httpGet('/departments', params);
  }

  private async getDepartment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.department_id) return { content: [{ type: 'text', text: 'department_id is required' }], isError: true };
    return this.httpGet(`/departments/${args.department_id}`);
  }

  private async listGoals(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 50),
      page: String((args.page as number) || 1),
    };
    if (args.status) params.status = args.status as string;
    else params.status = 'active';
    if (args.owner_id) params.owner_id = args.owner_id as string;
    if (args.department_id) params.department_id = args.department_id as string;
    if (args.type) params.type = args.type as string;
    return this.httpGet('/goals', params);
  }

  private async getGoal(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.goal_id) return { content: [{ type: 'text', text: 'goal_id is required' }], isError: true };
    return this.httpGet(`/goals/${args.goal_id}`);
  }

  private async createGoal(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.owner_id) {
      return { content: [{ type: 'text', text: 'name and owner_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name: args.name, owner_id: args.owner_id };
    if (args.description) body.description = args.description;
    if (args.type) body.type = args.type;
    if (args.due_date) body.due_date = args.due_date;
    return this.httpPost('/goals', body);
  }

  private async updateGoal(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.goal_id) return { content: [{ type: 'text', text: 'goal_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.status) body.status = args.status;
    if (args.progress !== undefined) body.progress = args.progress;
    if (args.due_date) body.due_date = args.due_date;
    return this.httpPut(`/goals/${args.goal_id}`, body);
  }

  private async listReviewCycles(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 25),
      page: String((args.page as number) || 1),
    };
    if (args.status) params.status = args.status as string;
    return this.httpGet('/review-cycles', params);
  }

  private async getReviewCycle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cycle_id) return { content: [{ type: 'text', text: 'cycle_id is required' }], isError: true };
    return this.httpGet(`/review-cycles/${args.cycle_id}`);
  }

  private async listReviews(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cycle_id) return { content: [{ type: 'text', text: 'cycle_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 50),
      page: String((args.page as number) || 1),
    };
    if (args.reviewee_id) params.reviewee_id = args.reviewee_id as string;
    if (args.reviewer_id) params.reviewer_id = args.reviewer_id as string;
    if (args.status) params.status = args.status as string;
    return this.httpGet(`/review-cycles/${args.cycle_id}/reviews`, params);
  }

  private async getReview(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.review_id) return { content: [{ type: 'text', text: 'review_id is required' }], isError: true };
    return this.httpGet(`/reviews/${args.review_id}`);
  }

  private async listFeedback(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 50),
      page: String((args.page as number) || 1),
    };
    if (args.recipient_id) params.recipient_id = args.recipient_id as string;
    if (args.sender_id) params.sender_id = args.sender_id as string;
    if (args.start_date) params.start_date = args.start_date as string;
    if (args.end_date) params.end_date = args.end_date as string;
    return this.httpGet('/feedback', params);
  }

  private async createFeedback(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recipient_id || !args.message) {
      return { content: [{ type: 'text', text: 'recipient_id and message are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      recipient_id: args.recipient_id,
      message: args.message,
      visibility: (args.visibility as string) || 'public',
    };
    return this.httpPost('/feedback', body);
  }

  private async listOneOnOnes(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 50),
      page: String((args.page as number) || 1),
    };
    if (args.participant_id) params.participant_id = args.participant_id as string;
    if (args.start_date) params.start_date = args.start_date as string;
    if (args.end_date) params.end_date = args.end_date as string;
    return this.httpGet('/one-on-ones', params);
  }
}
