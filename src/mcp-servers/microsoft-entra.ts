/**
 * Microsoft Entra ID MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/Azure/azure-mcp — archived Aug 2025, superseded by https://github.com/microsoft/mcp (enterprise-focused, read-only Entra scenarios). Build this adapter for service-principal / client-credentials use cases.

import { ToolDefinition, ToolResult } from './types.js';

// Auth: OAuth 2.0 Bearer token obtained via client credentials grant.
// Token endpoint: https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
// Graph base URL: https://graph.microsoft.com/v1.0
// NOTE: Microsoft Graph rejects requests that use both $search and $filter simultaneously — they are mutually exclusive.
// NOTE: $search requires ConsistencyLevel: eventual header.

interface MicrosoftEntraConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  graphBaseUrl?: string; // Override for national clouds (e.g. https://graph.microsoft.us/v1.0)
}

export class MicrosoftEntraMCPServer {
  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly graphBaseUrl: string;
  private cachedToken: string | null = null;
  private tokenExpiry = 0;

  constructor(config: MicrosoftEntraConfig) {
    this.tenantId = config.tenantId;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.graphBaseUrl = (config.graphBaseUrl ?? 'https://graph.microsoft.com/v1.0').replace(/\/$/, '');
  }

  private async getToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiry) return this.cachedToken;

    const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(this.tenantId)}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token acquisition failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.cachedToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.cachedToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List users in the Microsoft Entra ID (Azure AD) tenant. Supports OData $filter, $search, $select, and $top.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. displayName eq "Alice"). Cannot be combined with search.',
            },
            search: {
              type: 'string',
              description: 'OData $search expression (e.g. "displayName:Alice"). Cannot be combined with filter. Requires ConsistencyLevel: eventual.',
            },
            select: {
              type: 'string',
              description: 'Comma-separated list of properties to return (e.g. id,displayName,mail,userPrincipalName)',
            },
            top: {
              type: 'number',
              description: 'Maximum number of results (max 999, default 100)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get a specific Microsoft Entra user by their object ID or user principal name (UPN).',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Object ID (GUID) or user principal name (e.g. alice@contoso.com)',
            },
            select: {
              type: 'string',
              description: 'Comma-separated list of properties to return',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'list_groups',
        description: 'List Microsoft Entra security and Microsoft 365 groups.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. displayName eq "Engineering")',
            },
            search: {
              type: 'string',
              description: 'OData $search expression (requires ConsistencyLevel: eventual)',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return',
            },
            top: {
              type: 'number',
              description: 'Maximum number of results (default 100)',
            },
          },
        },
      },
      {
        name: 'get_group_members',
        description: 'List direct members of a Microsoft Entra group.',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'Object ID of the group',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return for each member',
            },
            top: {
              type: 'number',
              description: 'Maximum number of members to return (default 100)',
            },
          },
          required: ['groupId'],
        },
      },
      {
        name: 'list_applications',
        description: 'List application registrations in the tenant.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. displayName eq "MyApp")',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return',
            },
            top: {
              type: 'number',
              description: 'Maximum number of results (default 100)',
            },
          },
        },
      },
      {
        name: 'list_conditional_access_policies',
        description: 'List all Conditional Access policies in the tenant.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. state eq "enabled")',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return',
            },
          },
        },
      },
      {
        name: 'get_sign_in_logs',
        description: 'Retrieve sign-in activity logs from Microsoft Entra ID. Requires AuditLog.Read.All permission.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. createdDateTime ge 2026-03-01T00:00:00Z and userDisplayName eq "Alice")',
            },
            top: {
              type: 'number',
              description: 'Maximum number of log entries to return (max 1000, default 50)',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return',
            },
          },
        },
      },
      {
        name: 'get_audit_logs',
        description: 'Retrieve directory audit logs from Microsoft Entra ID. Requires AuditLog.Read.All permission.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. activityDateTime ge 2026-03-01T00:00:00Z)',
            },
            top: {
              type: 'number',
              description: 'Maximum number of log entries to return (max 1000, default 50)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const token = await this.getToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      const buildParams = (fields: { filter?: unknown; search?: unknown; select?: unknown; top?: unknown }): URLSearchParams => {
        const p = new URLSearchParams();
        if (fields.filter) p.set('$filter', fields.filter as string);
        if (fields.select) p.set('$select', fields.select as string);
        if (fields.top) p.set('$top', String(fields.top));
        return p;
      };

      switch (name) {
        case 'list_users': {
          if (args.filter && args.search) {
            return { content: [{ type: 'text', text: '$filter and $search are mutually exclusive — provide one or the other, not both' }], isError: true };
          }

          const p = buildParams(args);
          const reqHeaders = { ...headers };
          if (args.search) {
            p.set('$search', args.search as string);
            reqHeaders['ConsistencyLevel'] = 'eventual';
          }

          const response = await fetch(`${this.graphBaseUrl}/users?${p.toString()}`, { method: 'GET', headers: reqHeaders });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list users: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Graph returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_user': {
          const userId = args.userId as string;
          if (!userId) return { content: [{ type: 'text', text: 'userId is required' }], isError: true };

          const p = new URLSearchParams();
          if (args.select) p.set('$select', args.select as string);

          const response = await fetch(`${this.graphBaseUrl}/users/${encodeURIComponent(userId)}?${p.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get user: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Graph returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_groups': {
          if (args.filter && args.search) {
            return { content: [{ type: 'text', text: '$filter and $search are mutually exclusive' }], isError: true };
          }

          const p = buildParams(args);
          const reqHeaders = { ...headers };
          if (args.search) {
            p.set('$search', args.search as string);
            reqHeaders['ConsistencyLevel'] = 'eventual';
          }

          const response = await fetch(`${this.graphBaseUrl}/groups?${p.toString()}`, { method: 'GET', headers: reqHeaders });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list groups: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Graph returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_group_members': {
          const groupId = args.groupId as string;
          if (!groupId) return { content: [{ type: 'text', text: 'groupId is required' }], isError: true };

          const p = new URLSearchParams();
          if (args.select) p.set('$select', args.select as string);
          if (args.top) p.set('$top', String(args.top));

          const response = await fetch(`${this.graphBaseUrl}/groups/${encodeURIComponent(groupId)}/members?${p.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get group members: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Graph returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_applications': {
          const p = buildParams(args);
          const response = await fetch(`${this.graphBaseUrl}/applications?${p.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list applications: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Graph returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_conditional_access_policies': {
          const p = new URLSearchParams();
          if (args.filter) p.set('$filter', args.filter as string);
          if (args.select) p.set('$select', args.select as string);

          const response = await fetch(`${this.graphBaseUrl}/identity/conditionalAccess/policies?${p.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list conditional access policies: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Graph returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_sign_in_logs': {
          const p = new URLSearchParams();
          if (args.filter) p.set('$filter', args.filter as string);
          if (args.select) p.set('$select', args.select as string);
          p.set('$top', String(args.top ?? 50));

          const response = await fetch(`${this.graphBaseUrl}/auditLogs/signIns?${p.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get sign-in logs: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Graph returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_audit_logs': {
          const p = new URLSearchParams();
          if (args.filter) p.set('$filter', args.filter as string);
          p.set('$top', String(args.top ?? 50));

          const response = await fetch(`${this.graphBaseUrl}/auditLogs/directoryAudits?${p.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get audit logs: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Graph returned non-JSON (HTTP ${response.status})`); }
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
