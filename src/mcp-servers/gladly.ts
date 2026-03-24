/**
 * Gladly MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found

import { ToolDefinition, ToolResult } from './types.js';

interface GladlyConfig {
  organization: string;
  email: string;
  apiToken: string;
  baseUrl?: string;
}

export class GladlyMCPServer {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: GladlyConfig) {
    // Basic auth: base64(email:apiToken) — confirmed via developer.gladly.com
    const credentials = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
    this.baseUrl = config.baseUrl || `https://${config.organization}.gladly.com/api/v1`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_organization',
        description: 'Get details of the Gladly organization',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_conversations',
        description: 'List customer conversations in Gladly',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of conversations to return',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            status: {
              type: 'string',
              description: 'Filter by status: OPEN, RESOLVED (default: OPEN)',
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
              description: 'Conversation ID',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'list_customers',
        description: 'List customers in Gladly',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of customers to return',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Get details of a specific customer by ID',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Customer ID',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer in Gladly',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Customer full name',
            },
            email: {
              type: 'string',
              description: 'Customer email address',
            },
            phone: {
              type: 'string',
              description: 'Customer phone number',
            },
            external_customer_id: {
              type: 'string',
              description: 'Your system\'s unique identifier for this customer',
            },
          },
        },
      },
      {
        name: 'list_agents',
        description: 'List agents (teammates) in the Gladly organization',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of agents to return',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'add_conversation_note',
        description: 'Add an internal note to a conversation',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Conversation ID to add the note to',
            },
            body: {
              type: 'string',
              description: 'Note body text',
            },
          },
          required: ['conversation_id', 'body'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'get_organization': {
          const response = await fetch(`${this.baseUrl}/organization`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get organization: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gladly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_conversations': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.status) params.set('status', args.status as string);
          const url = `${this.baseUrl}/conversations${params.toString() ? '?' + params.toString() : ''}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list conversations: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gladly returned non-JSON response (HTTP ${response.status})`); }
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
          try { data = await response.json(); } catch { throw new Error(`Gladly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_customers': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.cursor) params.set('cursor', args.cursor as string);
          const url = `${this.baseUrl}/customers${params.toString() ? '?' + params.toString() : ''}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list customers: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gladly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_customer': {
          const customer_id = args.customer_id as string;
          if (!customer_id) {
            return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/customers/${encodeURIComponent(customer_id)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get customer: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gladly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_customer': {
          const payload: Record<string, unknown> = {};
          if (args.name) payload.name = args.name;
          if (args.email) payload.emails = [{ original: args.email }];
          if (args.phone) payload.phones = [{ original: args.phone }];
          if (args.external_customer_id) payload.externalCustomerId = args.external_customer_id;

          const response = await fetch(`${this.baseUrl}/customers`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create customer: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gladly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_agents': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.cursor) params.set('cursor', args.cursor as string);
          const url = `${this.baseUrl}/agents${params.toString() ? '?' + params.toString() : ''}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list agents: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gladly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'add_conversation_note': {
          const conversation_id = args.conversation_id as string;
          const body = args.body as string;
          if (!conversation_id || !body) {
            return { content: [{ type: 'text', text: 'conversation_id and body are required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(conversation_id)}/notes`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ body }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to add note: ${response.status} ${response.statusText}` }], isError: true };
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
