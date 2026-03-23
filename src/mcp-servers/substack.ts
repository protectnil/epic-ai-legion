/**
 * Substack MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

/*
 * IMPORTANT: Substack has no official public API.
 *
 * All endpoints below are the private API reverse-engineered from browser
 * network traffic. They are undocumented, unversioned from Substack's
 * perspective, and subject to change without notice.
 *
 * Authentication: Substack uses cookie-based session authentication.
 * The session cookie is named `connect.sid`. There is no Bearer token or
 * API key scheme. To obtain a session cookie, log in at substack.com in
 * a browser and copy the `connect.sid` value from DevTools → Application
 * → Cookies.
 *
 * URL patterns (verified via community reverse engineering, March 2026):
 *   Publication posts (archive):
 *     GET https://{subdomain}.substack.com/api/v1/archive?sort=new&limit=&offset=
 *   Single post by slug:
 *     GET https://{subdomain}.substack.com/api/v1/posts/{slug}
 *   Publication metadata:
 *     GET https://{subdomain}.substack.com/api/v1/publication
 *   Subscribers (owner only, requires valid connect.sid):
 *     GET https://{subdomain}.substack.com/api/v1/subscribers?limit=&offset=&type=
 *   Publication search (global):
 *     GET https://substack.com/api/v1/publication/search?query=&page=&limit=
 */

import { ToolDefinition, ToolResult } from './types.js';

interface SubstackConfig {
  /** Value of the connect.sid session cookie from a logged-in Substack session. */
  sessionCookie: string;
}

export class SubstackMCPServer {
  private readonly globalApiBase = 'https://substack.com/api/v1';
  private readonly cookieHeader: string;

  constructor(config: SubstackConfig) {
    this.cookieHeader = `connect.sid=${config.sessionCookie}`;
  }

  private buildHeaders(): Record<string, string> {
    return {
      Cookie: this.cookieHeader,
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; EpicAI-MCP/1.0)',
    };
  }

  private pubApiBase(subdomain: string): string {
    return `https://${subdomain}.substack.com/api/v1`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_posts',
        description: 'List posts from a Substack publication archive',
        inputSchema: {
          type: 'object',
          properties: {
            publication_url: {
              type: 'string',
              description: 'Publication subdomain (e.g. "mynewsletter" for mynewsletter.substack.com)',
            },
            limit: { type: 'number', description: 'Number of posts to return (default 12)' },
            offset: { type: 'number', description: 'Pagination offset' },
            sort: { type: 'string', description: 'Sort order: new (default) or top' },
          },
          required: ['publication_url'],
        },
      },
      {
        name: 'get_post',
        description: 'Get a single Substack post by slug',
        inputSchema: {
          type: 'object',
          properties: {
            publication_url: {
              type: 'string',
              description: 'Publication subdomain (e.g. "mynewsletter")',
            },
            slug: { type: 'string', description: 'Post slug as it appears in the URL' },
          },
          required: ['publication_url', 'slug'],
        },
      },
      {
        name: 'list_subscribers',
        description:
          'List subscribers for a Substack publication. Requires the session cookie to belong to the publication owner.',
        inputSchema: {
          type: 'object',
          properties: {
            publication_url: {
              type: 'string',
              description: 'Publication subdomain (e.g. "mynewsletter")',
            },
            limit: { type: 'number', description: 'Number of subscribers to return' },
            offset: { type: 'number', description: 'Pagination offset' },
            type: {
              type: 'string',
              description: 'Subscriber type filter: active, free, paid, or comp',
            },
          },
          required: ['publication_url'],
        },
      },
      {
        name: 'get_publication',
        description: 'Get metadata for a Substack publication',
        inputSchema: {
          type: 'object',
          properties: {
            publication_url: {
              type: 'string',
              description: 'Publication subdomain (e.g. "mynewsletter")',
            },
          },
          required: ['publication_url'],
        },
      },
      {
        name: 'search_posts',
        description:
          'Search for Substack publications by keyword using the global Substack search API',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query string' },
            page: { type: 'number', description: 'Page number (0-based, default 0)' },
            limit: { type: 'number', description: 'Number of results per page (max 100)' },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_posts':
          return await this.listPosts(args);
        case 'get_post':
          return await this.getPost(args);
        case 'list_subscribers':
          return await this.listSubscribers(args);
        case 'get_publication':
          return await this.getPublication(args);
        case 'search_posts':
          return await this.searchPosts(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  }

  private async listPosts(args: Record<string, unknown>): Promise<ToolResult> {
    const subdomain = args.publication_url as string;
    const params = new URLSearchParams();
    params.append('sort', args.sort ? (args.sort as string) : 'new');
    if (args.limit !== undefined) params.append('limit', String(args.limit));
    if (args.offset !== undefined) params.append('offset', String(args.offset));
    const url = `${this.pubApiBase(subdomain)}/archive?${params}`;
    const response = await fetch(url, { method: 'GET', headers: this.buildHeaders() });
    if (!response.ok) throw new Error(`Substack API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getPost(args: Record<string, unknown>): Promise<ToolResult> {
    const subdomain = args.publication_url as string;
    const url = `${this.pubApiBase(subdomain)}/posts/${args.slug as string}`;
    const response = await fetch(url, { method: 'GET', headers: this.buildHeaders() });
    if (!response.ok) throw new Error(`Substack API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listSubscribers(args: Record<string, unknown>): Promise<ToolResult> {
    const subdomain = args.publication_url as string;
    const params = new URLSearchParams();
    if (args.limit !== undefined) params.append('limit', String(args.limit));
    if (args.offset !== undefined) params.append('offset', String(args.offset));
    if (args.type) params.append('type', args.type as string);
    const url = `${this.pubApiBase(subdomain)}/subscribers?${params}`;
    const response = await fetch(url, { method: 'GET', headers: this.buildHeaders() });
    if (!response.ok) throw new Error(`Substack API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getPublication(args: Record<string, unknown>): Promise<ToolResult> {
    const subdomain = args.publication_url as string;
    const url = `${this.pubApiBase(subdomain)}/publication`;
    const response = await fetch(url, { method: 'GET', headers: this.buildHeaders() });
    if (!response.ok) throw new Error(`Substack API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async searchPosts(args: Record<string, unknown>): Promise<ToolResult> {
    // This searches publications globally, not posts within a single publication.
    // Substack's private API does not expose per-publication full-text post search.
    const params = new URLSearchParams({
      query: args.query as string,
      skipExplanation: 'false',
      sort: 'relevance',
    });
    if (args.page !== undefined) params.append('page', String(args.page));
    if (args.limit !== undefined) params.append('limit', String(args.limit));
    const url = `${this.globalApiBase}/publication/search?${params}`;
    const response = await fetch(url, { method: 'GET', headers: this.buildHeaders() });
    if (!response.ok) throw new Error(`Substack API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
