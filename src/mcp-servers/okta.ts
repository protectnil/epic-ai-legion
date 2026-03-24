/**
 * Okta MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/okta/okta-mcp-server — 15+ tools (actively maintained, supports Device Auth Grant + Private Key JWT; build this adapter for API-token / Bearer use cases)

import { ToolDefinition, ToolResult } from './types.js';

// Auth: Okta supports both the legacy SSWS API token scheme and OAuth 2.0 Bearer tokens.
// If apiToken already begins with "SSWS " or "Bearer " it is used verbatim; otherwise
// "SSWS " is prepended. Okta recommends OAuth 2.0 Bearer tokens for new integrations.
// Base URL: https://{yourOktaDomain} — caller supplies their org domain (no trailing slash).

interface OktaConfig {
  orgUrl: string;   // e.g. https://your-org.okta.com
  apiToken: string; // SSWS <token>  OR  Bearer <access_token>  OR  raw token value
}

export class OktaMCPServer {
  private readonly orgUrl: string;
  private readonly authHeader: string;

  constructor(config: OktaConfig) {
    this.orgUrl = config.orgUrl.replace(/\/$/, '');
    this.authHeader =
      config.apiToken.startsWith('SSWS ') || config.apiToken.startsWith('Bearer ')
        ? config.apiToken
        : `SSWS ${config.apiToken}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List users in the Okta org with optional search, filter, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'SCIM filter expression (e.g. status eq "ACTIVE" or profile.email sw "alice")',
            },
            filter: {
              type: 'string',
              description: 'Legacy filter expression. Prefer search for new integrations.',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (max 200, default 200)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Fetch a single Okta user by user ID or login (email).',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Okta user ID (e.g. 00u1abc123) or login (email address)',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new Okta user. Set activate=true to trigger the activation email.',
        inputSchema: {
          type: 'object',
          properties: {
            firstName: { type: 'string', description: 'First name' },
            lastName: { type: 'string', description: 'Last name' },
            email: { type: 'string', description: 'Primary email address (used as login unless login is provided)' },
            login: { type: 'string', description: 'Login name — defaults to email if omitted' },
            mobilePhone: { type: 'string', description: 'Mobile phone number' },
            activate: {
              type: 'boolean',
              description: 'Send activation email immediately (default: true)',
            },
          },
          required: ['firstName', 'lastName', 'email'],
        },
      },
      {
        name: 'update_user',
        description: 'Update profile attributes on an existing Okta user.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'Okta user ID or login' },
            firstName: { type: 'string', description: 'Updated first name' },
            lastName: { type: 'string', description: 'Updated last name' },
            email: { type: 'string', description: 'Updated email' },
            mobilePhone: { type: 'string', description: 'Updated mobile phone number' },
          },
          required: ['userId'],
        },
      },
      {
        name: 'user_lifecycle',
        description: 'Perform a lifecycle transition on an Okta user: activate, deactivate, suspend, or unsuspend.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'Okta user ID or login' },
            action: {
              type: 'string',
              description: 'Lifecycle action: activate | deactivate | suspend | unsuspend',
            },
            sendEmail: {
              type: 'boolean',
              description: 'Send notification email (applies to activate and deactivate, default: false)',
            },
          },
          required: ['userId', 'action'],
        },
      },
      {
        name: 'list_groups',
        description: 'List groups in the Okta org with optional name prefix search.',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Prefix search on the group name' },
            limit: { type: 'number', description: 'Maximum results (max 200, default 200)' },
            after: { type: 'string', description: 'Pagination cursor' },
          },
        },
      },
      {
        name: 'add_user_to_group',
        description: 'Add an Okta user to a group.',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'Okta group ID' },
            userId: { type: 'string', description: 'Okta user ID' },
          },
          required: ['groupId', 'userId'],
        },
      },
      {
        name: 'list_apps',
        description: 'List applications in the Okta org with optional filtering.',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Prefix search on the application label' },
            filter: { type: 'string', description: 'SCIM filter (e.g. status eq "ACTIVE")' },
            limit: { type: 'number', description: 'Maximum results (max 200, default 200)' },
            after: { type: 'string', description: 'Pagination cursor' },
          },
        },
      },
      {
        name: 'get_system_logs',
        description: 'Query the Okta System Log for audit and security events.',
        inputSchema: {
          type: 'object',
          properties: {
            since: {
              type: 'string',
              description: 'ISO 8601 start timestamp (e.g. 2026-03-01T00:00:00Z)',
            },
            until: {
              type: 'string',
              description: 'ISO 8601 end timestamp (e.g. 2026-03-24T23:59:59Z)',
            },
            filter: {
              type: 'string',
              description: 'SCIM filter on log fields (e.g. eventType eq "user.session.start")',
            },
            q: { type: 'string', description: 'Free-text keyword search across log fields' },
            limit: { type: 'number', description: 'Maximum results (max 1000, default 100)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_users': {
          const params = new URLSearchParams();
          if (args.search) params.set('search', args.search as string);
          if (args.filter) params.set('filter', args.filter as string);
          if (args.limit) params.set('limit', String(args.limit));
          if (args.after) params.set('after', args.after as string);

          const response = await fetch(`${this.orgUrl}/api/v1/users?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list users: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Okta returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_user': {
          const userId = args.userId as string;
          if (!userId) return { content: [{ type: 'text', text: 'userId is required' }], isError: true };

          const response = await fetch(`${this.orgUrl}/api/v1/users/${encodeURIComponent(userId)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get user: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Okta returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_user': {
          const { firstName, lastName, email, login, mobilePhone, activate } = args as Record<string, unknown>;
          if (!firstName || !lastName || !email) {
            return { content: [{ type: 'text', text: 'firstName, lastName, and email are required' }], isError: true };
          }

          const profile: Record<string, unknown> = { firstName, lastName, email, login: login || email };
          if (mobilePhone) profile.mobilePhone = mobilePhone;

          const activateParam = typeof activate === 'boolean' ? activate : true;
          const response = await fetch(`${this.orgUrl}/api/v1/users?activate=${activateParam}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ profile }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create user: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Okta returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_user': {
          const userId = args.userId as string;
          if (!userId) return { content: [{ type: 'text', text: 'userId is required' }], isError: true };

          const profile: Record<string, unknown> = {};
          if (args.firstName) profile.firstName = args.firstName;
          if (args.lastName) profile.lastName = args.lastName;
          if (args.email) profile.email = args.email;
          if (args.mobilePhone) profile.mobilePhone = args.mobilePhone;

          const response = await fetch(`${this.orgUrl}/api/v1/users/${encodeURIComponent(userId)}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ profile }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update user: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Okta returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'user_lifecycle': {
          const userId = args.userId as string;
          const action = (args.action as string | undefined)?.toLowerCase();
          if (!userId || !action) return { content: [{ type: 'text', text: 'userId and action are required' }], isError: true };

          const validActions = ['activate', 'deactivate', 'suspend', 'unsuspend'];
          if (!validActions.includes(action)) {
            return { content: [{ type: 'text', text: `Invalid action. Must be one of: ${validActions.join(', ')}` }], isError: true };
          }

          let url = `${this.orgUrl}/api/v1/users/${encodeURIComponent(userId)}/lifecycle/${action}`;
          if ((action === 'activate' || action === 'deactivate') && typeof args.sendEmail === 'boolean') {
            url += `?sendEmail=${args.sendEmail}`;
          }

          const response = await fetch(url, { method: 'POST', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to ${action} user: ${response.status} ${response.statusText}` }], isError: true };
          }
          const text = await response.text();
          const result = text.trim() ? JSON.parse(text) : { status: 'success', action };
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: false };
        }

        case 'list_groups': {
          const params = new URLSearchParams();
          if (args.q) params.set('q', args.q as string);
          if (args.limit) params.set('limit', String(args.limit));
          if (args.after) params.set('after', args.after as string);

          const response = await fetch(`${this.orgUrl}/api/v1/groups?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list groups: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Okta returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'add_user_to_group': {
          const groupId = args.groupId as string;
          const userId = args.userId as string;
          if (!groupId || !userId) return { content: [{ type: 'text', text: 'groupId and userId are required' }], isError: true };

          const response = await fetch(
            `${this.orgUrl}/api/v1/groups/${encodeURIComponent(groupId)}/users/${encodeURIComponent(userId)}`,
            { method: 'PUT', headers }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to add user to group: ${response.status} ${response.statusText}` }], isError: true };
          }
          return { content: [{ type: 'text', text: JSON.stringify({ status: 'success', groupId, userId }) }], isError: false };
        }

        case 'list_apps': {
          const params = new URLSearchParams();
          if (args.q) params.set('q', args.q as string);
          if (args.filter) params.set('filter', args.filter as string);
          if (args.limit) params.set('limit', String(args.limit));
          if (args.after) params.set('after', args.after as string);

          const response = await fetch(`${this.orgUrl}/api/v1/apps?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list apps: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Okta returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_system_logs': {
          const params = new URLSearchParams();
          if (args.since) params.set('since', args.since as string);
          if (args.until) params.set('until', args.until as string);
          if (args.filter) params.set('filter', args.filter as string);
          if (args.q) params.set('q', args.q as string);
          params.set('limit', String(args.limit ?? 100));

          const response = await fetch(`${this.orgUrl}/api/v1/logs?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get system logs: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Okta returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
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
