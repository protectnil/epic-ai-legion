/**
 * Front MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/zqushair/Frontapp-MCP — community-maintained, not vendor-published. Our adapter serves API-key / bearer-token use cases.

import { ToolDefinition, ToolResult } from './types.js';

interface FrontConfig {
  apiToken: string;
  baseUrl?: string;
}

export class FrontMCPServer {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: FrontConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api2.frontapp.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_conversations',
        description: 'List conversations, optionally filtered by status',
        inputSchema: {
          type: 'object',
          properties: {
            inbox_id: {
              type: 'string',
              description: 'Inbox ID to filter conversations (e.g. inb_123)',
            },
            tag_id: {
              type: 'string',
              description: 'Tag ID to filter conversations (e.g. tag_123)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: open, archived, deleted, all (default: open)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of conversations to return (max 100, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_conversation',
        description: 'Get details of a specific conversation by ID',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Conversation ID (e.g. cnv_123)',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'send_message',
        description: 'Reply to an existing conversation with a new message',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Conversation ID to reply to (e.g. cnv_123)',
            },
            body: {
              type: 'string',
              description: 'Message body text',
            },
            author_id: {
              type: 'string',
              description: 'Teammate ID sending the message (e.g. tea_123). Defaults to the API token owner.',
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID to send through',
            },
            subject: {
              type: 'string',
              description: 'Email subject line (for email channel replies)',
            },
          },
          required: ['conversation_id', 'body'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts in Front',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of contacts to return (max 100, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Get details of a specific contact by ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Contact ID (e.g. crd_123)',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in Front',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the contact',
            },
            handles: {
              type: 'array',
              description: 'Array of contact handle objects with handle and source fields',
              items: { type: 'object' },
            },
            description: {
              type: 'string',
              description: 'Notes or description for the contact',
            },
            is_spammer: {
              type: 'boolean',
              description: 'Whether the contact is marked as a spammer',
            },
          },
          required: ['handles'],
        },
      },
      {
        name: 'list_inboxes',
        description: 'List all inboxes accessible by the API token',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_teammates',
        description: 'List all teammates in the Front workspace',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of teammates to return (max 100, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'add_conversation_tag',
        description: 'Add a tag to a conversation',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Conversation ID (e.g. cnv_123)',
            },
            tag_id: {
              type: 'string',
              description: 'Tag ID to add (e.g. tag_123)',
            },
          },
          required: ['conversation_id', 'tag_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_conversations': {
          const limit = (args.limit as number) || 25;
          const status = (args.status as string) || 'open';
          let url = `${this.baseUrl}/conversations?limit=${limit}&q[statuses][]=${encodeURIComponent(status)}`;
          if (args.inbox_id) url += `&inbox_id=${encodeURIComponent(args.inbox_id as string)}`;
          if (args.tag_id) url += `&tag_id=${encodeURIComponent(args.tag_id as string)}`;
          if (args.page_token) url += `&page_token=${encodeURIComponent(args.page_token as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list conversations: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Front returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_conversation': {
          const conversation_id = args.conversation_id as string;
          if (!conversation_id) {
            return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(conversation_id)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get conversation: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Front returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'send_message': {
          const conversation_id = args.conversation_id as string;
          const body = args.body as string;
          if (!conversation_id || !body) {
            return { content: [{ type: 'text', text: 'conversation_id and body are required' }], isError: true };
          }
          const payload: Record<string, unknown> = { body };
          if (args.author_id) payload.author_id = args.author_id;
          if (args.channel_id) payload.channel_id = args.channel_id;
          if (args.subject) payload.subject = args.subject;

          const response = await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(conversation_id)}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to send message: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Front returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_contacts': {
          const limit = (args.limit as number) || 25;
          let url = `${this.baseUrl}/contacts?limit=${limit}`;
          if (args.page_token) url += `&page_token=${encodeURIComponent(args.page_token as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list contacts: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Front returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_contact': {
          const contact_id = args.contact_id as string;
          if (!contact_id) {
            return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/contacts/${encodeURIComponent(contact_id)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get contact: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Front returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_contact': {
          const handles = args.handles;
          if (!handles) {
            return { content: [{ type: 'text', text: 'handles is required' }], isError: true };
          }
          const payload: Record<string, unknown> = { handles };
          if (args.name) payload.name = args.name;
          if (args.description) payload.description = args.description;
          if (typeof args.is_spammer === 'boolean') payload.is_spammer = args.is_spammer;

          const response = await fetch(`${this.baseUrl}/contacts`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create contact: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Front returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_inboxes': {
          const response = await fetch(`${this.baseUrl}/inboxes`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list inboxes: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Front returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_teammates': {
          const limit = (args.limit as number) || 25;
          let url = `${this.baseUrl}/teammates?limit=${limit}`;
          if (args.page_token) url += `&page_token=${encodeURIComponent(args.page_token as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list teammates: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Front returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'add_conversation_tag': {
          const conversation_id = args.conversation_id as string;
          const tag_id = args.tag_id as string;
          if (!conversation_id || !tag_id) {
            return { content: [{ type: 'text', text: 'conversation_id and tag_id are required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(conversation_id)}/tags`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ tag_ids: [tag_id] }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to add tag: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { data = { success: true }; }
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
