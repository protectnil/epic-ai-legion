/**
 * Atlassian Confluence MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/sooperset/mcp-atlassian — transport: stdio, auth: Basic (email + API token)
//   Community-maintained, covers Confluence + Jira, actively maintained.
//   Our adapter covers: 16 tools (pages, blogposts, spaces, labels, attachments, comments, versions, search).
//   Vendor MCP covers: broader tool set with full Atlassian ecosystem.
// Recommendation: Use vendor MCP for full Atlassian coverage. Use this adapter for air-gapped deployments.
//
// Base URL: https://{instance}.atlassian.net/wiki/api/v2
// Auth: Basic auth — base64(email:api_token) in Authorization header
// Docs: https://developer.atlassian.com/cloud/confluence/rest/v2/intro/
// Rate limits: Standard Atlassian Cloud rate limiting applies; no hard limit documented publicly

import { ToolDefinition, ToolResult } from './types.js';

interface ConfluenceConfig {
  instance: string;
  email: string;
  apiToken: string;
  baseUrl?: string;
}

export class ConfluenceMCPServer {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: ConfluenceConfig) {
    // Support explicit baseUrl override for Data Center or custom domains
    this.baseUrl = config.baseUrl
      ? config.baseUrl.replace(/\/$/, '')
      : `https://${config.instance}.atlassian.net/wiki/api/v2`;
    this.authHeader = `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`;
  }

  static catalog() {
    return {
      name: 'confluence',
      displayName: 'Atlassian Confluence',
      version: '1.0.0',
      category: 'collaboration' as const,
      keywords: ['confluence', 'atlassian', 'wiki', 'documentation', 'page', 'space', 'knowledge-base', 'blog', 'label'],
      toolNames: [
        'list_spaces', 'get_space',
        'list_pages', 'get_page', 'create_page', 'update_page', 'delete_page',
        'list_blogposts', 'get_blogpost', 'create_blogpost',
        'search_content',
        'get_page_labels', 'add_page_label', 'delete_page_label',
        'list_page_attachments',
        'add_footer_comment',
      ],
      description: 'Atlassian Confluence wiki: manage pages, blog posts, spaces, labels, attachments, and comments using the v2 REST API.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_spaces',
        description: 'List all Confluence spaces accessible to the authenticated user, with optional type filter and cursor pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by space type: global or personal',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of spaces per page (default: 25, max: 250)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_space',
        description: 'Get details of a specific Confluence space by its ID, including key, name, and homepage.',
        inputSchema: {
          type: 'object',
          properties: {
            space_id: {
              type: 'string',
              description: 'The numeric space ID',
            },
          },
          required: ['space_id'],
        },
      },
      {
        name: 'list_pages',
        description: 'List pages in a Confluence space with optional status filter and cursor pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            space_id: {
              type: 'string',
              description: 'The space ID to list pages from',
            },
            status: {
              type: 'string',
              description: 'Page status filter: current or draft (default: current)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of pages per page (default: 25, max: 250)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['space_id'],
        },
      },
      {
        name: 'get_page',
        description: 'Get a Confluence page by ID, optionally including the full storage-format body content.',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'The page ID',
            },
            include_body: {
              type: 'boolean',
              description: 'Include the page body in storage format (default: true)',
            },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'create_page',
        description: 'Create a new Confluence page in a space with optional parent page for hierarchy.',
        inputSchema: {
          type: 'object',
          properties: {
            space_id: {
              type: 'string',
              description: 'The space ID to create the page in',
            },
            title: {
              type: 'string',
              description: 'Page title',
            },
            body: {
              type: 'string',
              description: 'Page body content in Confluence storage (XHTML) format',
            },
            parent_id: {
              type: 'string',
              description: 'Parent page ID for nested hierarchy (optional)',
            },
            status: {
              type: 'string',
              description: 'Page status: current (published) or draft (default: current)',
            },
          },
          required: ['space_id', 'title', 'body'],
        },
      },
      {
        name: 'update_page',
        description: 'Update an existing Confluence page title or body. The version_number must be current version + 1.',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'The page ID to update',
            },
            title: {
              type: 'string',
              description: 'New page title',
            },
            body: {
              type: 'string',
              description: 'New page body in Confluence storage (XHTML) format',
            },
            version_number: {
              type: 'number',
              description: 'Next version number — must be exactly current version + 1 (fetch the page first to get current version)',
            },
            status: {
              type: 'string',
              description: 'Page status: current or draft (default: current)',
            },
            version_message: {
              type: 'string',
              description: 'Optional message describing this version change',
            },
          },
          required: ['page_id', 'title', 'body', 'version_number'],
        },
      },
      {
        name: 'delete_page',
        description: 'Delete a Confluence page by ID. The page is moved to trash; it can be restored from the Confluence UI.',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'The page ID to delete',
            },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'list_blogposts',
        description: 'List blog posts in a Confluence space with optional status filter and cursor pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            space_id: {
              type: 'string',
              description: 'The space ID to list blog posts from',
            },
            status: {
              type: 'string',
              description: 'Blog post status: current or draft (default: current)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of blog posts per page (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['space_id'],
        },
      },
      {
        name: 'get_blogpost',
        description: 'Get a Confluence blog post by ID, optionally including the full storage-format body.',
        inputSchema: {
          type: 'object',
          properties: {
            blogpost_id: {
              type: 'string',
              description: 'The blog post ID',
            },
            include_body: {
              type: 'boolean',
              description: 'Include the blog post body in storage format (default: true)',
            },
          },
          required: ['blogpost_id'],
        },
      },
      {
        name: 'create_blogpost',
        description: 'Create a new blog post in a Confluence space.',
        inputSchema: {
          type: 'object',
          properties: {
            space_id: {
              type: 'string',
              description: 'The space ID to create the blog post in',
            },
            title: {
              type: 'string',
              description: 'Blog post title',
            },
            body: {
              type: 'string',
              description: 'Blog post body in Confluence storage (XHTML) format',
            },
            status: {
              type: 'string',
              description: 'Blog post status: current (published) or draft (default: current)',
            },
          },
          required: ['space_id', 'title', 'body'],
        },
      },
      {
        name: 'search_content',
        description: 'Search Confluence content using CQL (Confluence Query Language) with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'CQL query string (e.g. "type=page AND space=ENG AND title~\\"deploy\\"", or "text~\\"error handling\\"")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_page_labels',
        description: 'Get all labels applied to a Confluence page.',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'The page ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of labels to return (default: 250)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'add_page_label',
        description: 'Add one or more labels to a Confluence page for categorization and discoverability.',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'The page ID to label',
            },
            labels: {
              type: 'array',
              description: 'Array of label name strings to add (e.g. ["release-notes", "v2.0"])',
              items: { type: 'string' },
            },
          },
          required: ['page_id', 'labels'],
        },
      },
      {
        name: 'delete_page_label',
        description: 'Remove a label from a Confluence page by label name.',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'The page ID',
            },
            label: {
              type: 'string',
              description: 'The label name to remove',
            },
          },
          required: ['page_id', 'label'],
        },
      },
      {
        name: 'list_page_attachments',
        description: 'List attachments on a Confluence page, including file names, media types, sizes, and download URLs.',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'The page ID',
            },
            media_type: {
              type: 'string',
              description: 'Filter by MIME type (e.g. image/png, application/pdf)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of attachments to return (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'add_footer_comment',
        description: 'Add a footer comment to a Confluence page for feedback, questions, or discussion.',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'The page ID to comment on',
            },
            body: {
              type: 'string',
              description: 'Comment body in Confluence storage (XHTML) format',
            },
          },
          required: ['page_id', 'body'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_spaces':
          return this.listSpaces(args);
        case 'get_space':
          return this.getSpace(args);
        case 'list_pages':
          return this.listPages(args);
        case 'get_page':
          return this.getPage(args);
        case 'create_page':
          return this.createPage(args);
        case 'update_page':
          return this.updatePage(args);
        case 'delete_page':
          return this.deletePage(args);
        case 'list_blogposts':
          return this.listBlogposts(args);
        case 'get_blogpost':
          return this.getBlogpost(args);
        case 'create_blogpost':
          return this.createBlogpost(args);
        case 'search_content':
          return this.searchContent(args);
        case 'get_page_labels':
          return this.getPageLabels(args);
        case 'add_page_label':
          return this.addPageLabel(args);
        case 'delete_page_label':
          return this.deletePageLabel(args);
        case 'list_page_attachments':
          return this.listPageAttachments(args);
        case 'add_footer_comment':
          return this.addFooterComment(args);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private truncate(text: string): string {
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async fetchJson(url: string, init: RequestInit): Promise<ToolResult> {
    const response = await fetch(url, init);
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { status: response.status, statusText: response.statusText };
    }
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${JSON.stringify(data)}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listSpaces(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ limit: String(args.limit ?? 25) });
    if (args.cursor) params.set('cursor', String(args.cursor));
    if (args.type) params.set('type', String(args.type));
    return this.fetchJson(`${this.baseUrl}/spaces?${params}`, { method: 'GET', headers: this.headers });
  }

  private async getSpace(args: Record<string, unknown>): Promise<ToolResult> {
    const spaceId = args.space_id as string;
    if (!spaceId) {
      return { content: [{ type: 'text', text: 'space_id is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/spaces/${encodeURIComponent(spaceId)}`, { method: 'GET', headers: this.headers });
  }

  private async listPages(args: Record<string, unknown>): Promise<ToolResult> {
    const spaceId = args.space_id as string;
    if (!spaceId) {
      return { content: [{ type: 'text', text: 'space_id is required' }], isError: true };
    }
    const params = new URLSearchParams({ spaceId, limit: String(args.limit ?? 25) });
    if (args.cursor) params.set('cursor', String(args.cursor));
    if (args.status) params.set('status', String(args.status));
    return this.fetchJson(`${this.baseUrl}/pages?${params}`, { method: 'GET', headers: this.headers });
  }

  private async getPage(args: Record<string, unknown>): Promise<ToolResult> {
    const pageId = args.page_id as string;
    if (!pageId) {
      return { content: [{ type: 'text', text: 'page_id is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.include_body !== false) params.set('body-format', 'storage');
    const qs = params.toString();
    return this.fetchJson(`${this.baseUrl}/pages/${encodeURIComponent(pageId)}${qs ? `?${qs}` : ''}`, { method: 'GET', headers: this.headers });
  }

  private async createPage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.space_id || !args.title || !args.body) {
      return { content: [{ type: 'text', text: 'space_id, title, and body are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      spaceId: args.space_id,
      status: args.status ?? 'current',
      title: args.title,
      body: { representation: 'storage', value: args.body },
    };
    if (args.parent_id) body.parentId = args.parent_id;
    return this.fetchJson(`${this.baseUrl}/pages`, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
  }

  private async updatePage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.page_id || !args.title || !args.body || !args.version_number) {
      return { content: [{ type: 'text', text: 'page_id, title, body, and version_number are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      id: args.page_id,
      status: args.status ?? 'current',
      title: args.title,
      body: { representation: 'storage', value: args.body },
      version: { number: args.version_number },
    };
    if (args.version_message) {
      (body.version as Record<string, unknown>).message = args.version_message;
    }
    return this.fetchJson(`${this.baseUrl}/pages/${encodeURIComponent(args.page_id as string)}`, { method: 'PUT', headers: this.headers, body: JSON.stringify(body) });
  }

  private async deletePage(args: Record<string, unknown>): Promise<ToolResult> {
    const pageId = args.page_id as string;
    if (!pageId) {
      return { content: [{ type: 'text', text: 'page_id is required' }], isError: true };
    }
    const response = await fetch(`${this.baseUrl}/pages/${encodeURIComponent(pageId)}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, page_id: pageId }) }], isError: false };
  }

  private async listBlogposts(args: Record<string, unknown>): Promise<ToolResult> {
    const spaceId = args.space_id as string;
    if (!spaceId) {
      return { content: [{ type: 'text', text: 'space_id is required' }], isError: true };
    }
    const params = new URLSearchParams({ spaceId, limit: String(args.limit ?? 25) });
    if (args.cursor) params.set('cursor', String(args.cursor));
    if (args.status) params.set('status', String(args.status));
    return this.fetchJson(`${this.baseUrl}/blogposts?${params}`, { method: 'GET', headers: this.headers });
  }

  private async getBlogpost(args: Record<string, unknown>): Promise<ToolResult> {
    const blogpostId = args.blogpost_id as string;
    if (!blogpostId) {
      return { content: [{ type: 'text', text: 'blogpost_id is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.include_body !== false) params.set('body-format', 'storage');
    const qs = params.toString();
    return this.fetchJson(`${this.baseUrl}/blogposts/${encodeURIComponent(blogpostId)}${qs ? `?${qs}` : ''}`, { method: 'GET', headers: this.headers });
  }

  private async createBlogpost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.space_id || !args.title || !args.body) {
      return { content: [{ type: 'text', text: 'space_id, title, and body are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      spaceId: args.space_id,
      status: args.status ?? 'current',
      title: args.title,
      body: { representation: 'storage', value: args.body },
    };
    return this.fetchJson(`${this.baseUrl}/blogposts`, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
  }

  private async searchContent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }
    const params = new URLSearchParams({ query: String(args.query), limit: String(args.limit ?? 25) });
    if (args.cursor) params.set('cursor', String(args.cursor));
    return this.fetchJson(`${this.baseUrl}/search?${params}`, { method: 'GET', headers: this.headers });
  }

  private async getPageLabels(args: Record<string, unknown>): Promise<ToolResult> {
    const pageId = args.page_id as string;
    if (!pageId) {
      return { content: [{ type: 'text', text: 'page_id is required' }], isError: true };
    }
    const params = new URLSearchParams({ limit: String(args.limit ?? 250) });
    if (args.cursor) params.set('cursor', String(args.cursor));
    return this.fetchJson(`${this.baseUrl}/pages/${encodeURIComponent(pageId)}/labels?${params}`, { method: 'GET', headers: this.headers });
  }

  private async addPageLabel(args: Record<string, unknown>): Promise<ToolResult> {
    const pageId = args.page_id as string;
    const labels = args.labels as string[];
    if (!pageId || !labels || labels.length === 0) {
      return { content: [{ type: 'text', text: 'page_id and labels are required' }], isError: true };
    }
    const body = labels.map((name) => ({ name, prefix: 'global' }));
    return this.fetchJson(`${this.baseUrl}/pages/${encodeURIComponent(pageId)}/labels`, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
  }

  private async deletePageLabel(args: Record<string, unknown>): Promise<ToolResult> {
    const pageId = args.page_id as string;
    const label = args.label as string;
    if (!pageId || !label) {
      return { content: [{ type: 'text', text: 'page_id and label are required' }], isError: true };
    }
    const response = await fetch(
      `${this.baseUrl}/pages/${encodeURIComponent(pageId)}/labels/${encodeURIComponent(label)}`,
      { method: 'DELETE', headers: this.headers },
    );
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, page_id: pageId, label }) }], isError: false };
  }

  private async listPageAttachments(args: Record<string, unknown>): Promise<ToolResult> {
    const pageId = args.page_id as string;
    if (!pageId) {
      return { content: [{ type: 'text', text: 'page_id is required' }], isError: true };
    }
    const params = new URLSearchParams({ limit: String(args.limit ?? 25) });
    if (args.cursor) params.set('cursor', String(args.cursor));
    if (args.media_type) params.set('mediaType', String(args.media_type));
    return this.fetchJson(`${this.baseUrl}/pages/${encodeURIComponent(pageId)}/attachments?${params}`, { method: 'GET', headers: this.headers });
  }

  private async addFooterComment(args: Record<string, unknown>): Promise<ToolResult> {
    const pageId = args.page_id as string;
    const body = args.body as string;
    if (!pageId || !body) {
      return { content: [{ type: 'text', text: 'page_id and body are required' }], isError: true };
    }
    const payload = {
      pageId,
      body: { representation: 'storage', value: body },
    };
    return this.fetchJson(`${this.baseUrl}/footer-comments`, { method: 'POST', headers: this.headers, body: JSON.stringify(payload) });
  }
}
