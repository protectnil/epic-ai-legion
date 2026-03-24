/**
 * Sprout Social MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/jmeserve/sprout-mcp — community-built, transport: stdio, auth: API token
// No official Sprout Social MCP server found. The sprout-mcp repo is community-maintained (not by Sprout Social).
// Our adapter covers: 15 tools (profiles, analytics, posts, tags, publishing).
// Recommendation: Use this adapter; no official vendor MCP exists as of 2026-03.
//
// Base URL: https://api.sproutsocial.com/v1
// Auth: Bearer token in Authorization header (generated in Sprout Social app under Settings > API)
// Docs: https://api.sproutsocial.com/docs/
// Rate limits: 100 req/min per access token; analytics endpoints have separate quota

import { ToolDefinition, ToolResult } from './types.js';

interface SproutSocialConfig {
  apiToken: string;
  baseUrl?: string;
}

export class SproutSocialMCPServer {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: SproutSocialConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.sproutsocial.com/v1';
  }

  static catalog() {
    return {
      name: 'sprout-social',
      displayName: 'Sprout Social',
      version: '1.0.0',
      category: 'social',
      keywords: [
        'sproutsocial', 'social media', 'analytics', 'publishing', 'instagram',
        'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube', 'profiles',
        'posts', 'engagement', 'reporting', 'scheduling',
      ],
      toolNames: [
        'list_profiles', 'get_profile', 'list_profile_groups',
        'list_posts', 'get_post', 'create_post', 'schedule_post', 'delete_post',
        'get_profile_analytics', 'get_post_analytics', 'list_tags',
        'create_tag', 'tag_post', 'list_pending_posts', 'list_sent_messages',
      ],
      description: 'Sprout Social social media management: list and analyze profiles, publish and schedule posts, retrieve engagement analytics, and manage tags across networks.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_profiles',
        description: 'List all social profiles connected to the Sprout Social account with network type and status',
        inputSchema: {
          type: 'object',
          properties: {
            networks: {
              type: 'string',
              description: 'Comma-separated network filter: twitter, facebook, instagram, linkedin, pinterest, youtube, tiktok, threads',
            },
            status: {
              type: 'string',
              description: 'Filter by profile status: active, inactive (default: active)',
            },
          },
        },
      },
      {
        name: 'get_profile',
        description: 'Get detailed information about a specific social profile by its Sprout profile ID',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: {
              type: 'number',
              description: 'Numeric Sprout Social profile ID',
            },
          },
          required: ['profile_id'],
        },
      },
      {
        name: 'list_profile_groups',
        description: 'List profile groups (collections of profiles) in the Sprout Social account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_posts',
        description: 'List published or scheduled posts for one or more profiles with optional date range filter',
        inputSchema: {
          type: 'object',
          properties: {
            profile_ids: {
              type: 'string',
              description: 'Comma-separated list of profile IDs to query',
            },
            status: {
              type: 'string',
              description: 'Post status filter: sent, scheduled, draft (default: sent)',
            },
            start_date: {
              type: 'string',
              description: 'Start date for filter in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'End date for filter in YYYY-MM-DD format',
            },
            count: {
              type: 'number',
              description: 'Number of posts to return (default: 50, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_post',
        description: 'Get details of a specific post by its Sprout post ID including text, media, and engagement data',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: {
              type: 'string',
              description: 'Sprout Social post ID',
            },
          },
          required: ['post_id'],
        },
      },
      {
        name: 'create_post',
        description: 'Create and immediately publish a post to one or more social profiles',
        inputSchema: {
          type: 'object',
          properties: {
            profile_ids: {
              type: 'array',
              description: 'Array of numeric profile IDs to publish to',
            },
            text: {
              type: 'string',
              description: 'Post text content',
            },
            media_urls: {
              type: 'array',
              description: 'Array of publicly accessible media URLs to attach',
            },
          },
          required: ['profile_ids', 'text'],
        },
      },
      {
        name: 'schedule_post',
        description: 'Schedule a post for future publication to one or more social profiles at a specified time',
        inputSchema: {
          type: 'object',
          properties: {
            profile_ids: {
              type: 'array',
              description: 'Array of numeric profile IDs to schedule for',
            },
            text: {
              type: 'string',
              description: 'Post text content',
            },
            scheduled_send_time: {
              type: 'string',
              description: 'ISO 8601 datetime for scheduled publication (e.g. 2026-04-01T14:00:00Z)',
            },
            media_urls: {
              type: 'array',
              description: 'Array of publicly accessible media URLs to attach',
            },
          },
          required: ['profile_ids', 'text', 'scheduled_send_time'],
        },
      },
      {
        name: 'delete_post',
        description: 'Delete a scheduled or draft post from Sprout Social by its post ID',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: {
              type: 'string',
              description: 'Sprout Social post ID to delete',
            },
          },
          required: ['post_id'],
        },
      },
      {
        name: 'get_profile_analytics',
        description: 'Retrieve engagement analytics for one or more profiles over a date range including impressions, engagements, and follower growth',
        inputSchema: {
          type: 'object',
          properties: {
            profile_ids: {
              type: 'string',
              description: 'Comma-separated list of profile IDs',
            },
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (required)',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (required)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated metrics: impressions, engagements, followers, reach, clicks (default: all)',
            },
          },
          required: ['profile_ids', 'start_date', 'end_date'],
        },
      },
      {
        name: 'get_post_analytics',
        description: 'Retrieve per-post performance metrics for posts published in a date range across selected profiles',
        inputSchema: {
          type: 'object',
          properties: {
            profile_ids: {
              type: 'string',
              description: 'Comma-separated list of profile IDs',
            },
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            count: {
              type: 'number',
              description: 'Number of posts to return (default: 50, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['profile_ids', 'start_date', 'end_date'],
        },
      },
      {
        name: 'list_tags',
        description: 'List all tags available in the Sprout Social account for categorizing posts and messages',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of tags to return (default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'create_tag',
        description: 'Create a new tag in Sprout Social for organizing posts and incoming messages',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Tag name (must be unique within the account)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'tag_post',
        description: 'Apply one or more tags to a Sprout Social post for categorization and reporting',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: {
              type: 'string',
              description: 'Sprout Social post ID to tag',
            },
            tag_ids: {
              type: 'array',
              description: 'Array of tag IDs to apply to the post',
            },
          },
          required: ['post_id', 'tag_ids'],
        },
      },
      {
        name: 'list_pending_posts',
        description: 'List posts awaiting approval in the Sprout Social approval workflow queue',
        inputSchema: {
          type: 'object',
          properties: {
            profile_ids: {
              type: 'string',
              description: 'Comma-separated profile IDs to filter (default: all profiles)',
            },
            count: {
              type: 'number',
              description: 'Number of posts to return (default: 50)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'list_sent_messages',
        description: 'List messages (posts and comments) that have been sent from Sprout Social, with optional profile and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            profile_ids: {
              type: 'string',
              description: 'Comma-separated profile IDs to filter',
            },
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            count: {
              type: 'number',
              description: 'Number of messages to return (default: 50, max: 100)',
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
        case 'list_profiles': return this.listProfiles(args);
        case 'get_profile': return this.getProfile(args);
        case 'list_profile_groups': return this.listProfileGroups();
        case 'list_posts': return this.listPosts(args);
        case 'get_post': return this.getPost(args);
        case 'create_post': return this.createPost(args);
        case 'schedule_post': return this.schedulePost(args);
        case 'delete_post': return this.deletePost(args);
        case 'get_profile_analytics': return this.getProfileAnalytics(args);
        case 'get_post_analytics': return this.getPostAnalytics(args);
        case 'list_tags': return this.listTags(args);
        case 'create_tag': return this.createTag(args);
        case 'tag_post': return this.tagPost(args);
        case 'list_pending_posts': return this.listPendingPosts(args);
        case 'list_sent_messages': return this.listSentMessages(args);
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
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }

  private async listProfiles(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.networks) params['fields[profile][networks]'] = args.networks as string;
    if (args.status) params.status = args.status as string;
    return this.apiGet('/metadata/client', params);
  }

  private async getProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id) return { content: [{ type: 'text', text: 'profile_id is required' }], isError: true };
    return this.apiGet(`/metadata/client/${args.profile_id}`);
  }

  private async listProfileGroups(): Promise<ToolResult> {
    return this.apiGet('/metadata/client/profile_groups');
  }

  private async listPosts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      status: (args.status as string) || 'sent',
      count: String((args.count as number) || 50),
      page: String((args.page as number) || 1),
    };
    if (args.profile_ids) params.profile_ids = args.profile_ids as string;
    if (args.start_date) params.start_date = args.start_date as string;
    if (args.end_date) params.end_date = args.end_date as string;
    return this.apiGet('/message', params);
  }

  private async getPost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id) return { content: [{ type: 'text', text: 'post_id is required' }], isError: true };
    return this.apiGet(`/message/${args.post_id}`);
  }

  private async createPost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_ids || !args.text) return { content: [{ type: 'text', text: 'profile_ids and text are required' }], isError: true };
    const body: Record<string, unknown> = {
      profile_ids: args.profile_ids,
      status: { text: args.text },
    };
    if (args.media_urls) body.media_urls = args.media_urls;
    return this.apiPost('/message', body);
  }

  private async schedulePost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_ids || !args.text || !args.scheduled_send_time) {
      return { content: [{ type: 'text', text: 'profile_ids, text, and scheduled_send_time are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      profile_ids: args.profile_ids,
      status: { text: args.text },
      scheduling: { scheduled_send_time: args.scheduled_send_time },
    };
    if (args.media_urls) body.media_urls = args.media_urls;
    return this.apiPost('/message', body);
  }

  private async deletePost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id) return { content: [{ type: 'text', text: 'post_id is required' }], isError: true };
    return this.apiDelete(`/message/${args.post_id}`);
  }

  private async getProfileAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_ids || !args.start_date || !args.end_date) {
      return { content: [{ type: 'text', text: 'profile_ids, start_date, and end_date are required' }], isError: true };
    }
    const params: Record<string, string> = {
      profile_ids: args.profile_ids as string,
      start_date: args.start_date as string,
      end_date: args.end_date as string,
    };
    if (args.fields) params.fields = args.fields as string;
    return this.apiGet('/analytics/profiles', params);
  }

  private async getPostAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_ids || !args.start_date || !args.end_date) {
      return { content: [{ type: 'text', text: 'profile_ids, start_date, and end_date are required' }], isError: true };
    }
    const params: Record<string, string> = {
      profile_ids: args.profile_ids as string,
      start_date: args.start_date as string,
      end_date: args.end_date as string,
      count: String((args.count as number) || 50),
      page: String((args.page as number) || 1),
    };
    return this.apiGet('/analytics/posts', params);
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      count: String((args.count as number) || 100),
      page: String((args.page as number) || 1),
    };
    return this.apiGet('/metadata/tag', params);
  }

  private async createTag(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.apiPost('/metadata/tag', { name: args.name });
  }

  private async tagPost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id || !args.tag_ids) return { content: [{ type: 'text', text: 'post_id and tag_ids are required' }], isError: true };
    return this.apiPost(`/message/${args.post_id}/tags`, { tag_ids: args.tag_ids });
  }

  private async listPendingPosts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      count: String((args.count as number) || 50),
      page: String((args.page as number) || 1),
    };
    if (args.profile_ids) params.profile_ids = args.profile_ids as string;
    return this.apiGet('/message/pending', params);
  }

  private async listSentMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      count: String((args.count as number) || 50),
      page: String((args.page as number) || 1),
    };
    if (args.profile_ids) params.profile_ids = args.profile_ids as string;
    if (args.start_date) params.start_date = args.start_date as string;
    if (args.end_date) params.end_date = args.end_date as string;
    return this.apiGet('/message/sent', params);
  }
}
