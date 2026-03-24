/**
 * Help Scout MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found from Help Scout — community implementation only (drewburchfield/help-scout-mcp-server)

import { ToolDefinition, ToolResult } from './types.js';

// Base URL: https://api.helpscout.net/v2
// Auth: OAuth2 Client Credentials — obtain Bearer token from https://api.helpscout.net/v2/oauth2/token
//   POST with grant_type=client_credentials, client_id, client_secret (x-www-form-urlencoded)
//   Then use: Authorization: Bearer {access_token}

interface HelpScoutConfig {
  accessToken: string;
  baseUrl?: string;
}

export class HelpScoutMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: HelpScoutConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.helpscout.net/v2';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_conversations',
        description: 'List conversations with optional filtering by mailbox, status, tag, or assigned user',
        inputSchema: {
          type: 'object',
          properties: {
            mailbox: {
              type: 'number',
              description: 'Filter by mailbox ID',
            },
            status: {
              type: 'string',
              description: 'Filter by status: active, pending, closed, spam (default: active)',
            },
            tag: {
              type: 'string',
              description: 'Filter by tag slug',
            },
            assigned_to: {
              type: 'number',
              description: 'Filter by assigned user ID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
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
              type: 'number',
              description: 'The Help Scout conversation ID',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'create_conversation',
        description: 'Create a new conversation in a mailbox',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Subject of the conversation',
            },
            mailboxId: {
              type: 'number',
              description: 'ID of the mailbox to create the conversation in',
            },
            type: {
              type: 'string',
              description: 'Conversation type: email (default) or chat',
            },
            status: {
              type: 'string',
              description: 'Initial status: active, pending, closed (default: active)',
            },
            customer: {
              type: 'object',
              description: 'Customer object. Must include email. Optional: firstName, lastName.',
            },
            threads: {
              type: 'array',
              description: 'Array of thread objects for the initial messages. Each thread needs type (customer or message) and text (body).',
              items: { type: 'object' },
            },
            tags: {
              type: 'array',
              description: 'Array of tag slugs to apply to the conversation',
              items: { type: 'string' },
            },
          },
          required: ['subject', 'mailboxId', 'customer'],
        },
      },
      {
        name: 'update_conversation',
        description: 'Update the status, assignee, subject, or tags of a conversation',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'number',
              description: 'The Help Scout conversation ID to update',
            },
            status: {
              type: 'string',
              description: 'New status: active, pending, closed, spam',
            },
            assignTo: {
              type: 'number',
              description: 'User ID to assign the conversation to (0 to unassign)',
            },
            subject: {
              type: 'string',
              description: 'New conversation subject',
            },
            tags: {
              type: 'array',
              description: 'New set of tag slugs (replaces existing tags)',
              items: { type: 'string' },
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'reply_to_conversation',
        description: 'Add a reply thread to a conversation (visible to customer)',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'number',
              description: 'The Help Scout conversation ID',
            },
            text: {
              type: 'string',
              description: 'Plain text body of the reply',
            },
            user: {
              type: 'number',
              description: 'ID of the agent sending the reply',
            },
            cc: {
              type: 'array',
              description: 'Array of email addresses to CC',
              items: { type: 'string' },
            },
            bcc: {
              type: 'array',
              description: 'Array of email addresses to BCC',
              items: { type: 'string' },
            },
          },
          required: ['conversation_id', 'text'],
        },
      },
      {
        name: 'add_note_to_conversation',
        description: 'Add an internal note to a conversation (not visible to customer)',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'number',
              description: 'The Help Scout conversation ID',
            },
            text: {
              type: 'string',
              description: 'Plain text body of the note',
            },
            user: {
              type: 'number',
              description: 'ID of the agent creating the note',
            },
          },
          required: ['conversation_id', 'text'],
        },
      },
      {
        name: 'list_mailboxes',
        description: 'List all mailboxes in the Help Scout account',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_mailbox',
        description: 'Get details of a specific mailbox by ID',
        inputSchema: {
          type: 'object',
          properties: {
            mailbox_id: {
              type: 'number',
              description: 'The Help Scout mailbox ID',
            },
          },
          required: ['mailbox_id'],
        },
      },
      {
        name: 'search_conversations',
        description: 'Search conversations using a query string',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string (full-text search across conversation subject and body)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['query'],
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
      };

      switch (name) {
        case 'list_conversations': {
          const params = new URLSearchParams();
          if (args.mailbox) params.set('mailbox', String(args.mailbox));
          if (args.status) params.set('status', args.status as string);
          if (args.tag) params.set('tag', args.tag as string);
          if (args.assigned_to) params.set('assignedTo', String(args.assigned_to));
          if (args.page) params.set('page', String(args.page));

          const response = await fetch(
            `${this.baseUrl}/conversations?${params.toString()}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list conversations: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Help Scout returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_conversation': {
          const conversationId = args.conversation_id as number;
          if (!conversationId) {
            return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/conversations/${conversationId}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get conversation: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Help Scout returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_conversation': {
          const subject = args.subject as string;
          const mailboxId = args.mailboxId as number;
          const customer = args.customer;

          if (!subject || !mailboxId || !customer) {
            return {
              content: [{ type: 'text', text: 'subject, mailboxId, and customer are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            subject,
            mailboxId,
            customer,
          };
          if (args.type) body.type = args.type;
          if (args.status) body.status = args.status;
          if (args.threads) body.threads = args.threads;
          if (args.tags) body.tags = args.tags;

          const response = await fetch(
            `${this.baseUrl}/conversations`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create conversation: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          // 201 Created returns the Location header; body may be empty
          const location = response.headers.get('Location') || '';
          return {
            content: [{ type: 'text', text: JSON.stringify({ created: true, location }, null, 2) }],
            isError: false,
          };
        }

        case 'update_conversation': {
          const conversationId = args.conversation_id as number;
          if (!conversationId) {
            return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
          }

          const body: Record<string, unknown> = {};
          if (args.status) body.status = args.status;
          if (args.assignTo !== undefined) body.assignTo = args.assignTo;
          if (args.subject) body.subject = args.subject;
          if (args.tags) body.tags = args.tags;

          const response = await fetch(
            `${this.baseUrl}/conversations/${conversationId}`,
            { method: 'PATCH', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to update conversation: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          // 204 No Content on success
          return { content: [{ type: 'text', text: 'Conversation updated successfully' }], isError: false };
        }

        case 'reply_to_conversation': {
          const conversationId = args.conversation_id as number;
          const text = args.text as string;

          if (!conversationId || !text) {
            return { content: [{ type: 'text', text: 'conversation_id and text are required' }], isError: true };
          }

          const body: Record<string, unknown> = { type: 'reply', text };
          if (args.user) body.user = { id: args.user };
          if (args.cc) body.cc = args.cc;
          if (args.bcc) body.bcc = args.bcc;

          const response = await fetch(
            `${this.baseUrl}/conversations/${conversationId}/threads`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to reply to conversation: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: 'Reply sent successfully' }], isError: false };
        }

        case 'add_note_to_conversation': {
          const conversationId = args.conversation_id as number;
          const text = args.text as string;

          if (!conversationId || !text) {
            return { content: [{ type: 'text', text: 'conversation_id and text are required' }], isError: true };
          }

          const body: Record<string, unknown> = { type: 'note', text };
          if (args.user) body.user = { id: args.user };

          const response = await fetch(
            `${this.baseUrl}/conversations/${conversationId}/threads`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to add note to conversation: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: 'Note added successfully' }], isError: false };
        }

        case 'list_mailboxes': {
          const params = new URLSearchParams();
          if (args.page) params.set('page', String(args.page));

          const response = await fetch(
            `${this.baseUrl}/mailboxes?${params.toString()}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list mailboxes: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Help Scout returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_mailbox': {
          const mailboxId = args.mailbox_id as number;
          if (!mailboxId) {
            return { content: [{ type: 'text', text: 'mailbox_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/mailboxes/${mailboxId}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get mailbox: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Help Scout returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_conversations': {
          const query = args.query as string;
          if (!query) {
            return { content: [{ type: 'text', text: 'query is required' }], isError: true };
          }

          const params = new URLSearchParams({ query });
          if (args.page) params.set('page', String(args.page));

          const response = await fetch(
            `${this.baseUrl}/conversations?${params.toString()}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search conversations: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Help Scout returned non-JSON response (HTTP ${response.status})`); }
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
