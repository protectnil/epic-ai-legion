/**
 * Intercom MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/intercom/intercom-mcp-server — official Intercom MCP (hosted-only, US workspaces only)
// This adapter serves the self-hosted / Bearer token use case and supports all regions.

import { ToolDefinition, ToolResult } from './types.js';

// Base URL: https://api.intercom.io
// Auth: Authorization: Bearer {access_token}
// Version header: Intercom-Version: 2.15 (current latest as of March 2026)
// Note: The official MCP is currently limited to US-hosted workspaces only.

interface IntercomConfig {
  accessToken: string;
  apiVersion?: string; // defaults to "2.15" (current latest)
  baseUrl?: string;
}

export class IntercomMCPServer {
  private readonly accessToken: string;
  private readonly apiVersion: string;
  private readonly baseUrl: string;

  constructor(config: IntercomConfig) {
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion || '2.15';
    this.baseUrl = config.baseUrl || 'https://api.intercom.io';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_conversations',
        description: 'List conversations with optional filtering by status, assignee, or date',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: open, closed, snoozed, pending',
            },
            assignee_id: {
              type: 'number',
              description: 'Filter conversations assigned to this admin ID',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 150, default: 20)',
            },
            starting_after: {
              type: 'string',
              description: 'Pagination cursor — pass the next_page cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_conversation',
        description: 'Get full details of a specific conversation by ID',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'The Intercom conversation ID',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'reply_to_conversation',
        description: 'Reply to a conversation as an admin or assign it',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'The Intercom conversation ID',
            },
            message_type: {
              type: 'string',
              description: 'Reply type: comment (visible to user) or note (internal)',
            },
            body: {
              type: 'string',
              description: 'HTML body of the reply',
            },
            admin_id: {
              type: 'string',
              description: 'ID of the admin sending the reply',
            },
          },
          required: ['conversation_id', 'message_type', 'body', 'admin_id'],
        },
      },
      {
        name: 'search_conversations',
        description: 'Search conversations using field filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'object',
              description: 'Search query object. Use field/operator/value for simple queries, or operator/value for compound queries with nested conditions.',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 150, default: 20)',
            },
            starting_after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts (users and leads) in the workspace',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: {
              type: 'number',
              description: 'Results per page (max 150, default: 10)',
            },
            starting_after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Get full details of a contact by ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'The Intercom contact ID',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'search_contacts',
        description: 'Search contacts by email, name, phone, or custom attributes',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'object',
              description: 'Search query object with field, operator, and value. Example: { "field": "email", "operator": "=", "value": "user@example.com" }',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 150, default: 10)',
            },
            starting_after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact (user or lead)',
        inputSchema: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              description: 'Contact role: user (has user_id or email) or lead (anonymous)',
            },
            email: {
              type: 'string',
              description: 'Email address of the contact',
            },
            name: {
              type: 'string',
              description: 'Full name of the contact',
            },
            phone: {
              type: 'string',
              description: 'Phone number of the contact',
            },
            external_id: {
              type: 'string',
              description: 'Your application\'s ID for this contact (maps to user_id in Intercom)',
            },
            custom_attributes: {
              type: 'object',
              description: 'Key-value map of custom attributes to set on the contact',
            },
          },
          required: ['role'],
        },
      },
      {
        name: 'list_admins',
        description: 'List all admins (agents) in the workspace',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_me',
        description: 'Get information about the authenticated admin',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Intercom-Version': this.apiVersion,
      };

      switch (name) {
        case 'list_conversations': {
          const params = new URLSearchParams();
          if (args.per_page) params.set('per_page', String(args.per_page));
          if (args.starting_after) params.set('starting_after', args.starting_after as string);

          // status and assignee_id are sent as part of a filter query
          const filterParts: string[] = [];
          if (args.status) filterParts.push(`state=${encodeURIComponent(args.status as string)}`);
          if (args.assignee_id) filterParts.push(`assignee_id=${args.assignee_id}`);
          filterParts.forEach(p => {
            const [k, v] = p.split('=');
            params.set(k, v);
          });

          const url = `${this.baseUrl}/conversations?${params.toString()}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list conversations: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Intercom returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_conversation': {
          const conversationId = args.conversation_id as string;
          if (!conversationId) {
            return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get conversation: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Intercom returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'reply_to_conversation': {
          const conversationId = args.conversation_id as string;
          const messageType = args.message_type as string;
          const body = args.body as string;
          const adminId = args.admin_id as string;

          if (!conversationId || !messageType || !body || !adminId) {
            return {
              content: [{ type: 'text', text: 'conversation_id, message_type, body, and admin_id are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/reply`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                message_type: messageType,
                type: 'admin',
                admin_id: adminId,
                body,
              }),
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to reply to conversation: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Intercom returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_conversations': {
          if (!args.query) {
            return { content: [{ type: 'text', text: 'query is required' }], isError: true };
          }

          const body: Record<string, unknown> = { query: args.query };
          if (args.per_page || args.starting_after) {
            body.pagination = {};
            if (args.per_page) (body.pagination as Record<string, unknown>).per_page = args.per_page;
            if (args.starting_after) (body.pagination as Record<string, unknown>).starting_after = args.starting_after;
          }

          const response = await fetch(
            `${this.baseUrl}/conversations/search`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search conversations: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Intercom returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_contacts': {
          const params = new URLSearchParams();
          if (args.per_page) params.set('per_page', String(args.per_page));
          if (args.starting_after) params.set('starting_after', args.starting_after as string);

          const response = await fetch(
            `${this.baseUrl}/contacts?${params.toString()}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list contacts: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Intercom returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_contact': {
          const contactId = args.contact_id as string;
          if (!contactId) {
            return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/contacts/${encodeURIComponent(contactId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get contact: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Intercom returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_contacts': {
          if (!args.query) {
            return { content: [{ type: 'text', text: 'query is required' }], isError: true };
          }

          const body: Record<string, unknown> = { query: args.query };
          if (args.per_page || args.starting_after) {
            body.pagination = {};
            if (args.per_page) (body.pagination as Record<string, unknown>).per_page = args.per_page;
            if (args.starting_after) (body.pagination as Record<string, unknown>).starting_after = args.starting_after;
          }

          const response = await fetch(
            `${this.baseUrl}/contacts/search`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search contacts: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Intercom returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_contact': {
          const role = args.role as string;
          if (!role) {
            return { content: [{ type: 'text', text: 'role is required' }], isError: true };
          }

          const body: Record<string, unknown> = { role };
          if (args.email) body.email = args.email;
          if (args.name) body.name = args.name;
          if (args.phone) body.phone = args.phone;
          if (args.external_id) body.external_id = args.external_id;
          if (args.custom_attributes) body.custom_attributes = args.custom_attributes;

          const response = await fetch(
            `${this.baseUrl}/contacts`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create contact: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Intercom returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_admins': {
          const response = await fetch(
            `${this.baseUrl}/admins`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list admins: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Intercom returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_me': {
          const response = await fetch(
            `${this.baseUrl}/me`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get me: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Intercom returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
}
