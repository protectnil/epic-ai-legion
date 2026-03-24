/**
 * Cision MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Cision MCP server was found on GitHub or npm as of March 2026.
// Cision GitHub org (https://github.com/cision) contains web display modules but no MCP server.
//
// Base URL (CisionOne API v2): https://api.cision.one/v2
// Auth: Token-based — POST to /auth/token with username+password to receive X-Auth-Token; pass in subsequent request headers
// Docs: https://developers.cision.one/docs/api/v2
// Rate limits: 10 requests/minute (1 request every 6 seconds) across all endpoints; 429 on breach

import { ToolDefinition, ToolResult } from './types.js';

interface CisionConfig {
  username: string;
  password: string;
  baseUrl?: string;
}

export class CisionMCPServer {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;
  private authToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: CisionConfig) {
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl || 'https://api.cision.one/v2';
  }

  static catalog() {
    return {
      name: 'cision',
      displayName: 'Cision',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'cision', 'pr', 'public relations', 'media monitoring', 'press release', 'media intelligence',
        'mention', 'coverage', 'journalist', 'earned media', 'brand monitoring', 'cisionone',
        'media release', 'distribution', 'newswire', 'communication', 'reputation',
      ],
      toolNames: [
        'list_mention_streams', 'get_mention_stream', 'list_mentions', 'get_mention',
        'search_mentions', 'get_mention_stream_summary',
        'list_media_releases', 'get_media_release', 'create_media_release',
        'list_contacts', 'get_contact', 'search_contacts',
        'list_media_outlets', 'get_media_outlet', 'search_media_outlets',
      ],
      description: 'Cision PR and media intelligence: monitor brand mentions, manage media releases, search journalist contacts and outlets, and track earned media coverage.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_mention_streams',
        description: 'List all saved Mention Streams (media monitoring searches) in the Cision account',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_mention_stream',
        description: 'Get configuration details for a specific Cision Mention Stream by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            streamId: {
              type: 'string',
              description: 'Mention Stream ID',
            },
          },
          required: ['streamId'],
        },
      },
      {
        name: 'list_mentions',
        description: 'List media mentions from a Mention Stream with optional date range and type filters',
        inputSchema: {
          type: 'object',
          properties: {
            streamId: {
              type: 'string',
              description: 'Mention Stream ID to retrieve mentions from',
            },
            startDate: {
              type: 'string',
              description: 'Start date filter (ISO 8601, e.g. 2026-01-01T00:00:00Z)',
            },
            endDate: {
              type: 'string',
              description: 'End date filter (ISO 8601)',
            },
            mediaType: {
              type: 'string',
              description: 'Filter by media type: online, print, broadcast, podcast, social (comma-separated)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
          required: ['streamId'],
        },
      },
      {
        name: 'get_mention',
        description: 'Get full details for a single media mention by its ID including content, outlet, and metrics',
        inputSchema: {
          type: 'object',
          properties: {
            mentionId: {
              type: 'string',
              description: 'Mention ID',
            },
          },
          required: ['mentionId'],
        },
      },
      {
        name: 'search_mentions',
        description: 'Search across all Mention Streams for mentions matching a keyword query with optional date range',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string for mention content or headline',
            },
            startDate: {
              type: 'string',
              description: 'Start date filter (ISO 8601)',
            },
            endDate: {
              type: 'string',
              description: 'End date filter (ISO 8601)',
            },
            mediaType: {
              type: 'string',
              description: 'Filter by media type: online, print, broadcast, podcast, social (comma-separated)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_mention_stream_summary',
        description: 'Get aggregated analytics summary for a Mention Stream including volume, sentiment, and top outlets',
        inputSchema: {
          type: 'object',
          properties: {
            streamId: {
              type: 'string',
              description: 'Mention Stream ID',
            },
            startDate: {
              type: 'string',
              description: 'Start date for analytics period (ISO 8601)',
            },
            endDate: {
              type: 'string',
              description: 'End date for analytics period (ISO 8601)',
            },
          },
          required: ['streamId'],
        },
      },
      {
        name: 'list_media_releases',
        description: 'List media releases (press releases) in the Cision account with status and distribution info',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by release status: draft, scheduled, sent (default: all)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_media_release',
        description: 'Get full content and distribution details for a specific media release by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            releaseId: {
              type: 'string',
              description: 'Media release ID',
            },
          },
          required: ['releaseId'],
        },
      },
      {
        name: 'create_media_release',
        description: 'Create a new draft media release with subject, body, and optional recipient list IDs',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Subject line of the media release',
            },
            body: {
              type: 'string',
              description: 'HTML or plain-text body content of the release',
            },
            recipientListIds: {
              type: 'string',
              description: 'Comma-separated list of contact list IDs to distribute to',
            },
            scheduledAt: {
              type: 'string',
              description: 'ISO 8601 datetime to schedule distribution; omit to save as draft',
            },
          },
          required: ['subject', 'body'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List journalist and media contacts in the Cision database with beat and outlet information',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Get profile details for a specific journalist or media contact by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: {
              type: 'string',
              description: 'Contact ID',
            },
          },
          required: ['contactId'],
        },
      },
      {
        name: 'search_contacts',
        description: 'Search journalist and media contacts by name, beat, outlet, or location',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Name or keyword to search contacts',
            },
            beat: {
              type: 'string',
              description: 'Journalist beat/topic area (e.g. technology, health, finance)',
            },
            outlet: {
              type: 'string',
              description: 'Media outlet name to filter by',
            },
            country: {
              type: 'string',
              description: 'Country code (ISO 3166-1 alpha-2, e.g. US, GB)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'list_media_outlets',
        description: 'List media outlets tracked in Cision with type, circulation, and reach information',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_media_outlet',
        description: 'Get details for a specific media outlet by outlet ID including type, reach, and beat coverage',
        inputSchema: {
          type: 'object',
          properties: {
            outletId: {
              type: 'string',
              description: 'Media outlet ID',
            },
          },
          required: ['outletId'],
        },
      },
      {
        name: 'search_media_outlets',
        description: 'Search media outlets by name, type, topic, or geographic market',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Outlet name or keyword',
            },
            type: {
              type: 'string',
              description: 'Outlet type: online, print, broadcast, podcast, blog',
            },
            country: {
              type: 'string',
              description: 'Country code (ISO 3166-1 alpha-2, e.g. US, GB)',
            },
            topic: {
              type: 'string',
              description: 'Topic or beat area (e.g. technology, healthcare, finance)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_mention_streams':
          return this.listMentionStreams(args);
        case 'get_mention_stream':
          return this.getMentionStream(args);
        case 'list_mentions':
          return this.listMentions(args);
        case 'get_mention':
          return this.getMention(args);
        case 'search_mentions':
          return this.searchMentions(args);
        case 'get_mention_stream_summary':
          return this.getMentionStreamSummary(args);
        case 'list_media_releases':
          return this.listMediaReleases(args);
        case 'get_media_release':
          return this.getMediaRelease(args);
        case 'create_media_release':
          return this.createMediaRelease(args);
        case 'list_contacts':
          return this.listContacts(args);
        case 'get_contact':
          return this.getContact(args);
        case 'search_contacts':
          return this.searchContacts(args);
        case 'list_media_outlets':
          return this.listMediaOutlets(args);
        case 'get_media_outlet':
          return this.getMediaOutlet(args);
        case 'search_media_outlets':
          return this.searchMediaOutlets(args);
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
    if (this.authToken && this.tokenExpiry > now) {
      return this.authToken;
    }
    const response = await fetch(`${this.baseUrl}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: this.username, password: this.password }),
    });
    if (!response.ok) {
      throw new Error(`Cision authentication failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { token: string; expiresIn?: number };
    this.authToken = data.token;
    // Default token lifetime assumed 1 hour; refresh 60s early
    this.tokenExpiry = now + ((data.expiresIn ?? 3600) - 60) * 1000;
    return this.authToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return { 'X-Auth-Token': token, 'Content-Type': 'application/json' };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async cisionGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Cision returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async cisionPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Cision returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listMentionStreams(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      pageSize: String((args.pageSize as number) ?? 20),
    };
    return this.cisionGet('/mention-streams', params);
  }

  private async getMentionStream(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.streamId) return { content: [{ type: 'text', text: 'streamId is required' }], isError: true };
    return this.cisionGet(`/mention-streams/${args.streamId}`);
  }

  private async listMentions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.streamId) return { content: [{ type: 'text', text: 'streamId is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      pageSize: String((args.pageSize as number) ?? 20),
    };
    if (args.startDate) params.startDate = args.startDate as string;
    if (args.endDate) params.endDate = args.endDate as string;
    if (args.mediaType) params.mediaType = args.mediaType as string;
    return this.cisionGet(`/mention-streams/${args.streamId}/mentions`, params);
  }

  private async getMention(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.mentionId) return { content: [{ type: 'text', text: 'mentionId is required' }], isError: true };
    return this.cisionGet(`/mentions/${args.mentionId}`);
  }

  private async searchMentions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      q: args.query as string,
      page: String((args.page as number) ?? 1),
      pageSize: String((args.pageSize as number) ?? 20),
    };
    if (args.startDate) params.startDate = args.startDate as string;
    if (args.endDate) params.endDate = args.endDate as string;
    if (args.mediaType) params.mediaType = args.mediaType as string;
    return this.cisionGet('/mentions/search', params);
  }

  private async getMentionStreamSummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.streamId) return { content: [{ type: 'text', text: 'streamId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.startDate) params.startDate = args.startDate as string;
    if (args.endDate) params.endDate = args.endDate as string;
    return this.cisionGet(`/mention-streams/${args.streamId}/summary`, params);
  }

  private async listMediaReleases(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      pageSize: String((args.pageSize as number) ?? 20),
    };
    if (args.status) params.status = args.status as string;
    return this.cisionGet('/media-releases', params);
  }

  private async getMediaRelease(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.releaseId) return { content: [{ type: 'text', text: 'releaseId is required' }], isError: true };
    return this.cisionGet(`/media-releases/${args.releaseId}`);
  }

  private async createMediaRelease(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.subject || !args.body) return { content: [{ type: 'text', text: 'subject and body are required' }], isError: true };
    const payload: Record<string, unknown> = { subject: args.subject, body: args.body };
    if (args.recipientListIds) payload.recipientListIds = (args.recipientListIds as string).split(',').map(s => s.trim());
    if (args.scheduledAt) payload.scheduledAt = args.scheduledAt;
    return this.cisionPost('/media-releases', payload);
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      pageSize: String((args.pageSize as number) ?? 20),
    };
    return this.cisionGet('/contacts', params);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contactId) return { content: [{ type: 'text', text: 'contactId is required' }], isError: true };
    return this.cisionGet(`/contacts/${args.contactId}`);
  }

  private async searchContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      pageSize: String((args.pageSize as number) ?? 20),
    };
    if (args.query) params.q = args.query as string;
    if (args.beat) params.beat = args.beat as string;
    if (args.outlet) params.outlet = args.outlet as string;
    if (args.country) params.country = args.country as string;
    return this.cisionGet('/contacts/search', params);
  }

  private async listMediaOutlets(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      pageSize: String((args.pageSize as number) ?? 20),
    };
    return this.cisionGet('/outlets', params);
  }

  private async getMediaOutlet(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.outletId) return { content: [{ type: 'text', text: 'outletId is required' }], isError: true };
    return this.cisionGet(`/outlets/${args.outletId}`);
  }

  private async searchMediaOutlets(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      pageSize: String((args.pageSize as number) ?? 20),
    };
    if (args.query) params.q = args.query as string;
    if (args.type) params.type = args.type as string;
    if (args.country) params.country = args.country as string;
    if (args.topic) params.topic = args.topic as string;
    return this.cisionGet('/outlets/search', params);
  }
}
