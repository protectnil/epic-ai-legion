/**
 * Auth0 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/auth0/auth0-mcp-server — 20+ tools (actively maintained, uses device auth flow, hosted-only with keychain storage). Build this adapter for service-to-service / M2M access-token use cases.

import { ToolDefinition, ToolResult } from './types.js';

// Auth: OAuth 2.0 Machine-to-Machine Bearer token.
// Get a token: POST https://{domain}/oauth/token with grant_type=client_credentials,
// audience=https://{domain}/api/v2/ , client_id, client_secret.
// Base URL: https://{domain}/api/v2  (domain = your Auth0 tenant, e.g. your-tenant.auth0.com)

interface Auth0Config {
  domain: string;        // e.g. your-tenant.auth0.com  (no https://, no trailing slash)
  managementToken: string; // M2M access token with required Management API scopes
}

export class Auth0MCPServer {
  private readonly baseUrl: string;
  private readonly managementToken: string;

  constructor(config: Auth0Config) {
    const domain = config.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.baseUrl = `https://${domain}/api/v2`;
    this.managementToken = config.managementToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List users in the Auth0 tenant with optional search and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Lucene query string (e.g. email:"alice@example.com" or name:"Alice")',
            },
            search_engine: {
              type: 'string',
              description: 'Search engine version: v2 or v3 (default: v3)',
            },
            page: {
              type: 'number',
              description: 'Page number (0-based, default: 0)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 50)',
            },
            include_totals: {
              type: 'boolean',
              description: 'Include total count in response (default: false)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include or exclude',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get a specific Auth0 user by their user ID.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Auth0 user ID (e.g. auth0|64abc123)',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'update_user',
        description: 'Update attributes on an Auth0 user (name, email, blocked status, metadata, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'Auth0 user ID' },
            name: { type: 'string', description: 'Display name' },
            email: { type: 'string', description: 'Email address' },
            blocked: { type: 'boolean', description: 'Block (true) or unblock (false) the user' },
            user_metadata: {
              type: 'object',
              description: 'User-editable metadata object (merged, not replaced)',
            },
            app_metadata: {
              type: 'object',
              description: 'Application-controlled metadata object (merged, not replaced)',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'delete_user',
        description: 'Permanently delete an Auth0 user by their user ID.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'Auth0 user ID to delete' },
          },
          required: ['userId'],
        },
      },
      {
        name: 'list_clients',
        description: 'List Auth0 applications (clients) in the tenant.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (0-based, default: 0)' },
            per_page: { type: 'number', description: 'Results per page (max 100, default: 50)' },
            include_totals: { type: 'boolean', description: 'Include total count (default: false)' },
            fields: { type: 'string', description: 'Comma-separated fields to include' },
            app_type: {
              type: 'string',
              description: 'Filter by app type: native, spa, regular_web, non_interactive',
            },
          },
        },
      },
      {
        name: 'list_logs',
        description: 'Retrieve Auth0 tenant log events.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (0-based, default: 0)' },
            per_page: { type: 'number', description: 'Results per page (max 100, default: 50)' },
            include_totals: { type: 'boolean', description: 'Include total count (default: false)' },
            from: {
              type: 'string',
              description: 'Log ID to start from (for checkpoint-based pagination)',
            },
            take: {
              type: 'number',
              description: 'Number of entries to take when using checkpoint-based pagination (max 100)',
            },
            q: {
              type: 'string',
              description: 'Lucene query filter (e.g. type:fp for failed passwords)',
            },
            sort: {
              type: 'string',
              description: 'Sort field and order (e.g. date:-1 for descending)',
            },
          },
        },
      },
      {
        name: 'list_roles',
        description: 'List roles defined in the Auth0 tenant.',
        inputSchema: {
          type: 'object',
          properties: {
            name_filter: { type: 'string', description: 'Filter by role name prefix' },
            page: { type: 'number', description: 'Page number (0-based, default: 0)' },
            per_page: { type: 'number', description: 'Results per page (max 100, default: 50)' },
            include_totals: { type: 'boolean', description: 'Include total count (default: false)' },
          },
        },
      },
      {
        name: 'assign_roles_to_user',
        description: 'Assign one or more roles to an Auth0 user.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'Auth0 user ID' },
            roles: {
              type: 'array',
              description: 'Array of role IDs to assign',
              items: { type: 'string' },
            },
          },
          required: ['userId', 'roles'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.managementToken}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_users': {
          const params = new URLSearchParams();
          if (args.q) params.set('q', args.q as string);
          params.set('search_engine', (args.search_engine as string) ?? 'v3');
          if (typeof args.page === 'number') params.set('page', String(args.page));
          if (typeof args.per_page === 'number') params.set('per_page', String(args.per_page));
          if (typeof args.include_totals === 'boolean') params.set('include_totals', String(args.include_totals));
          if (args.fields) params.set('fields', args.fields as string);

          const response = await fetch(`${this.baseUrl}/users?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list users: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Auth0 returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_user': {
          const userId = args.userId as string;
          if (!userId) return { content: [{ type: 'text', text: 'userId is required' }], isError: true };

          const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(userId)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get user: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Auth0 returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_user': {
          const userId = args.userId as string;
          if (!userId) return { content: [{ type: 'text', text: 'userId is required' }], isError: true };

          const body: Record<string, unknown> = {};
          if (args.name !== undefined) body.name = args.name;
          if (args.email !== undefined) body.email = args.email;
          if (typeof args.blocked === 'boolean') body.blocked = args.blocked;
          if (args.user_metadata !== undefined) body.user_metadata = args.user_metadata;
          if (args.app_metadata !== undefined) body.app_metadata = args.app_metadata;

          const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(userId)}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update user: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Auth0 returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_user': {
          const userId = args.userId as string;
          if (!userId) return { content: [{ type: 'text', text: 'userId is required' }], isError: true };

          const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(userId)}`, { method: 'DELETE', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to delete user: ${response.status} ${response.statusText}` }], isError: true };
          }
          return { content: [{ type: 'text', text: JSON.stringify({ status: 'success', deleted: userId }) }], isError: false };
        }

        case 'list_clients': {
          const params = new URLSearchParams();
          if (typeof args.page === 'number') params.set('page', String(args.page));
          if (typeof args.per_page === 'number') params.set('per_page', String(args.per_page));
          if (typeof args.include_totals === 'boolean') params.set('include_totals', String(args.include_totals));
          if (args.fields) params.set('fields', args.fields as string);
          if (args.app_type) params.set('app_type', args.app_type as string);

          const response = await fetch(`${this.baseUrl}/clients?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list clients: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Auth0 returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_logs': {
          const params = new URLSearchParams();
          if (typeof args.page === 'number') params.set('page', String(args.page));
          if (typeof args.per_page === 'number') params.set('per_page', String(args.per_page));
          if (typeof args.include_totals === 'boolean') params.set('include_totals', String(args.include_totals));
          if (args.from) params.set('from', args.from as string);
          if (args.take) params.set('take', String(args.take));
          if (args.q) params.set('q', args.q as string);
          if (args.sort) params.set('sort', args.sort as string);

          const response = await fetch(`${this.baseUrl}/logs?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list logs: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Auth0 returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_roles': {
          const params = new URLSearchParams();
          if (args.name_filter) params.set('name_filter', args.name_filter as string);
          if (typeof args.page === 'number') params.set('page', String(args.page));
          if (typeof args.per_page === 'number') params.set('per_page', String(args.per_page));
          if (typeof args.include_totals === 'boolean') params.set('include_totals', String(args.include_totals));

          const response = await fetch(`${this.baseUrl}/roles?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list roles: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Auth0 returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'assign_roles_to_user': {
          const userId = args.userId as string;
          const roles = args.roles as string[];
          if (!userId || !Array.isArray(roles) || roles.length === 0) {
            return { content: [{ type: 'text', text: 'userId and a non-empty roles array are required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(userId)}/roles`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ roles }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to assign roles: ${response.status} ${response.statusText}` }], isError: true };
          }
          return { content: [{ type: 'text', text: JSON.stringify({ status: 'success', userId, rolesAssigned: roles }) }], isError: false };
        }

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
}
