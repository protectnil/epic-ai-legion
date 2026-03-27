/**
 * Meltwater MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Meltwater MCP server was found on GitHub or the MCP registry.
//
// Base URL: https://api.meltwater.com/v3
// Auth: API key passed as custom header "apikey" (not Authorization Bearer)
// Docs: https://developer.meltwater.com/docs/meltwater-api/reference/overview/
// Rate limits: 100 req/min per endpoint; global 2,000 req/hour per IP; Mira API 60 req/min

import { ToolDefinition, ToolResult } from './types.js';

interface MeltwaterConfig {
  apiKey: string;
  baseUrl?: string;
}

export class MeltwaterMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: MeltwaterConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.meltwater.com/v3';
  }

  static catalog() {
    return {
      name: 'meltwater',
      displayName: 'Meltwater',
      version: '1.0.0',
      category: 'misc',
      keywords: ['meltwater', 'media monitoring', 'press', 'news', 'mentions', 'editorial', 'social listening', 'analytics', 'influencer', 'pr', 'public relations', 'brand monitoring', 'sentiment'],
      toolNames: [
        'list_searches',
        'get_search',
        'create_search',
        'delete_search',
        'list_mentions',
        'search_mentions',
        'get_mention_analytics',
        'list_social_accounts',
        'get_social_analytics',
        'get_social_account_metrics',
        'list_newsletters',
        'get_newsletter',
        'get_usage_stats',
        'mira_chat',
      ],
      description: 'Meltwater media intelligence: search news and social mentions, analyze earned media coverage, track brand sentiment, and query owned social analytics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_searches',
        description: 'List all saved Meltwater searches (listening queries) configured in the account',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of searches to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_search',
        description: 'Get the configuration and metadata of a specific Meltwater saved search by search ID',
        inputSchema: {
          type: 'object',
          properties: {
            search_id: {
              type: 'string',
              description: 'The saved search ID to retrieve',
            },
          },
          required: ['search_id'],
        },
      },
      {
        name: 'create_search',
        description: 'Create a new Meltwater saved search (listening query) with a keyword expression and source filters',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the saved search',
            },
            query: {
              type: 'string',
              description: 'Boolean keyword query expression (e.g. "brand AND (launch OR release)")',
            },
            sources: {
              type: 'string',
              description: 'Comma-separated source types: news, editorial, reddit, twitter, facebook, instagram, youtube (default: news)',
            },
          },
          required: ['name', 'query'],
        },
      },
      {
        name: 'delete_search',
        description: 'Delete a Meltwater saved search by search ID',
        inputSchema: {
          type: 'object',
          properties: {
            search_id: {
              type: 'string',
              description: 'The saved search ID to delete',
            },
          },
          required: ['search_id'],
        },
      },
      {
        name: 'list_mentions',
        description: 'Retrieve media mentions for a saved search with optional date range and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            search_id: {
              type: 'string',
              description: 'The saved search ID to retrieve mentions for',
            },
            start_date: {
              type: 'string',
              description: 'Start of the date range (ISO 8601: YYYY-MM-DDTHH:MM:SSZ)',
            },
            end_date: {
              type: 'string',
              description: 'End of the date range (ISO 8601: YYYY-MM-DDTHH:MM:SSZ)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of mentions to return (default: 50, max: 1000)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['search_id'],
        },
      },
      {
        name: 'search_mentions',
        description: 'Search mentions across the Explore+ index by keyword, date range, and source type',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Boolean keyword query expression to search mentions',
            },
            start_date: {
              type: 'string',
              description: 'Start of the search window (ISO 8601: YYYY-MM-DDTHH:MM:SSZ)',
            },
            end_date: {
              type: 'string',
              description: 'End of the search window (ISO 8601: YYYY-MM-DDTHH:MM:SSZ)',
            },
            sources: {
              type: 'string',
              description: 'Comma-separated source filter: news, reddit, twitter, facebook, etc.',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 50, max: 500)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_mention_analytics',
        description: 'Get aggregated analytics (volume, sentiment, reach, top sources) for a saved search over a time period',
        inputSchema: {
          type: 'object',
          properties: {
            search_id: {
              type: 'string',
              description: 'The saved search ID to analyze',
            },
            start_date: {
              type: 'string',
              description: 'Start of the analysis window (ISO 8601: YYYY-MM-DDTHH:MM:SSZ)',
            },
            end_date: {
              type: 'string',
              description: 'End of the analysis window (ISO 8601: YYYY-MM-DDTHH:MM:SSZ)',
            },
            group_by: {
              type: 'string',
              description: 'Aggregation interval: day, week, month (default: day)',
            },
          },
          required: ['search_id'],
        },
      },
      {
        name: 'list_social_accounts',
        description: 'List owned social media accounts connected to the Meltwater account for Social Analytics',
        inputSchema: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description: 'Filter by social platform: twitter, facebook, instagram, linkedin, youtube (optional)',
            },
          },
        },
      },
      {
        name: 'get_social_analytics',
        description: 'Retrieve owned social analytics summary (followers, engagement, impressions) for connected accounts over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            account_ids: {
              type: 'string',
              description: 'Comma-separated list of social account IDs to retrieve analytics for',
            },
            start_date: {
              type: 'string',
              description: 'Start of the analytics window (ISO 8601: YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'End of the analytics window (ISO 8601: YYYY-MM-DD)',
            },
            source: {
              type: 'string',
              description: 'Filter by social platform: twitter, facebook, instagram, linkedin, youtube (optional)',
            },
          },
          required: ['account_ids'],
        },
      },
      {
        name: 'get_social_account_metrics',
        description: 'Get detailed numeric metrics (likes, shares, comments, reach) for a specific owned social account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'The social account ID to retrieve metrics for',
            },
            start_date: {
              type: 'string',
              description: 'Start date (ISO 8601: YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'End date (ISO 8601: YYYY-MM-DD)',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_newsletters',
        description: 'List Meltwater newsletter templates and scheduled newsletters configured in the account',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of newsletters to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_newsletter',
        description: 'Retrieve configuration and content of a specific Meltwater newsletter by newsletter ID',
        inputSchema: {
          type: 'object',
          properties: {
            newsletter_id: {
              type: 'string',
              description: 'The newsletter ID to retrieve',
            },
          },
          required: ['newsletter_id'],
        },
      },
      {
        name: 'get_usage_stats',
        description: 'Retrieve API usage statistics for the current billing period including request counts per endpoint',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'mira_chat',
        description: 'Send a prompt to Meltwater Mira AI for media intelligence insights, trend summaries, or content generation (60 req/min limit)',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The prompt or question to send to Mira AI',
            },
            context: {
              type: 'string',
              description: 'Optional context to ground the response (e.g. recent mention data as JSON)',
            },
          },
          required: ['prompt'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_searches':
          return this.listSearches(args);
        case 'get_search':
          return this.getSearch(args);
        case 'create_search':
          return this.createSearch(args);
        case 'delete_search':
          return this.deleteSearch(args);
        case 'list_mentions':
          return this.listMentions(args);
        case 'search_mentions':
          return this.searchMentions(args);
        case 'get_mention_analytics':
          return this.getMentionAnalytics(args);
        case 'list_social_accounts':
          return this.listSocialAccounts(args);
        case 'get_social_analytics':
          return this.getSocialAnalytics(args);
        case 'get_social_account_metrics':
          return this.getSocialAccountMetrics(args);
        case 'list_newsletters':
          return this.listNewsletters(args);
        case 'get_newsletter':
          return this.getNewsletter(args);
        case 'get_usage_stats':
          return this.getUsageStats();
        case 'mira_chat':
          return this.miraChat(args);
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
      apikey: this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async mwGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await fetch(`${this.baseUrl}${path}${qs}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async mwPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async mwDelete(path: string): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = response.status === 204 ? { deleted: true } : await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSearches(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    return this.mwGet('/searches', params);
  }

  private async getSearch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.search_id) return { content: [{ type: 'text', text: 'search_id is required' }], isError: true };
    return this.mwGet(`/searches/${encodeURIComponent(args.search_id as string)}`);
  }

  private async createSearch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.query) {
      return { content: [{ type: 'text', text: 'name and query are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name: args.name, query: args.query };
    if (args.sources) body.sources = (args.sources as string).split(',').map(s => s.trim());
    return this.mwPost('/searches', body);
  }

  private async deleteSearch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.search_id) return { content: [{ type: 'text', text: 'search_id is required' }], isError: true };
    return this.mwDelete(`/searches/${encodeURIComponent(args.search_id as string)}`);
  }

  private async listMentions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.search_id) return { content: [{ type: 'text', text: 'search_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.start_date) params.startDate = args.start_date as string;
    if (args.end_date) params.endDate = args.end_date as string;
    return this.mwGet(`/searches/${encodeURIComponent(args.search_id as string)}/mentions`, params);
  }

  private async searchMentions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const body: Record<string, unknown> = {
      query: args.query,
      limit: (args.limit as number) ?? 50,
    };
    if (args.start_date) body.startDate = args.start_date;
    if (args.end_date) body.endDate = args.end_date;
    if (args.sources) body.sources = (args.sources as string).split(',').map(s => s.trim());
    return this.mwPost('/explore_plus/search', body);
  }

  private async getMentionAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.search_id) return { content: [{ type: 'text', text: 'search_id is required' }], isError: true };
    const params: Record<string, string> = {
      groupBy: (args.group_by as string) ?? 'day',
    };
    if (args.start_date) params.startDate = args.start_date as string;
    if (args.end_date) params.endDate = args.end_date as string;
    return this.mwGet(`/analytics/${encodeURIComponent(args.search_id as string)}/custom`, params);
  }

  private async listSocialAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.source) params.source = args.source as string;
    return this.mwGet('/owned/accounts', params);
  }

  private async getSocialAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_ids) return { content: [{ type: 'text', text: 'account_ids is required' }], isError: true };
    const params: Record<string, string> = {
      account_ids: args.account_ids as string,
    };
    if (args.start_date) params.startDate = args.start_date as string;
    if (args.end_date) params.endDate = args.end_date as string;
    if (args.source) params.source = args.source as string;
    return this.mwGet('/owned/accounts/metrics/numeric', params);
  }

  private async getSocialAccountMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.start_date) params.startDate = args.start_date as string;
    if (args.end_date) params.endDate = args.end_date as string;
    return this.mwGet(`/owned/accounts/${encodeURIComponent(args.account_id as string)}/metrics`, params);
  }

  private async listNewsletters(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    return this.mwGet('/newsletters', params);
  }

  private async getNewsletter(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.newsletter_id) return { content: [{ type: 'text', text: 'newsletter_id is required' }], isError: true };
    return this.mwGet(`/newsletters/${encodeURIComponent(args.newsletter_id as string)}`);
  }

  private async getUsageStats(): Promise<ToolResult> {
    return this.mwGet('/usage');
  }

  private async miraChat(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.prompt) return { content: [{ type: 'text', text: 'prompt is required' }], isError: true };
    const body: Record<string, unknown> = {
      messages: [{ role: 'user', content: args.prompt }],
    };
    if (args.context) {
      body.messages = [
        { role: 'system', content: args.context },
        { role: 'user', content: args.prompt },
      ];
    }
    return this.mwPost('/mira/chat/completions', body);
  }
}
