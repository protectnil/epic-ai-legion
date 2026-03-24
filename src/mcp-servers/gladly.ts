/**
 * Gladly MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Gladly MCP server found on GitHub or the Gladly developer portal.
// Community integrations exist via Unified.to and Merge.dev but no first-party MCP.
// Recommendation: Use this REST adapter. Evaluate vendor MCP if one is published.
//
// Base URL: https://{organization}.gladly.com/api/v1
// Auth: Basic auth — base64(email:apiToken) per developer.gladly.com
// Docs: https://developer.gladly.com/rest/
// Rate limits: Parse response headers; Gladly recommends back-off on rate limit signals.

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
    const credentials = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
    this.baseUrl = config.baseUrl || `https://${config.organization}.gladly.com/api/v1`;
  }

  static catalog() {
    return {
      name: 'gladly',
      displayName: 'Gladly',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'gladly', 'customer service', 'support', 'helpdesk', 'conversation',
        'ticket', 'agent', 'inbox', 'topic', 'contact center', 'crm',
      ],
      toolNames: [
        'get_organization',
        'list_conversations',
        'get_conversation',
        'get_conversation_items',
        'assign_conversation',
        'close_conversation',
        'add_conversation_topic',
        'list_customers',
        'get_customer',
        'create_customer',
        'update_customer',
        'search_customers',
        'list_agents',
        'get_agent',
        'list_inboxes',
        'add_conversation_note',
      ],
      description: 'Gladly customer service platform: manage conversations, customers, agents, and inboxes. Search, triage, assign, and close support conversations.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_organization',
        description: 'Get details and configuration of the Gladly organization including settings and feature flags.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_conversations',
        description: 'List customer conversations with optional filters for status and pagination cursor. Returns conversation metadata including assignee, topics, and inbox.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: OPEN, RESOLVED (default: OPEN)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of conversations to return (default: 50, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_conversation',
        description: 'Get full details of a specific Gladly conversation by ID, including assignee, inbox, topics, and status.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Gladly conversation ID',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'get_conversation_items',
        description: 'Get the timeline items (messages, notes, channel interactions) for a specific conversation, up to 1000 items.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Gladly conversation ID',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'assign_conversation',
        description: 'Assign a conversation to a specific agent or inbox for routing and ownership.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Gladly conversation ID to assign',
            },
            agent_id: {
              type: 'string',
              description: 'Agent ID to assign the conversation to (omit to assign to inbox only)',
            },
            inbox_id: {
              type: 'string',
              description: 'Inbox ID to route the conversation to',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'close_conversation',
        description: 'Close (resolve) an open Gladly conversation, marking it as resolved.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Gladly conversation ID to close',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'add_conversation_topic',
        description: 'Add one or more topics (tags/labels) to a Gladly conversation for categorization and analysis.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Gladly conversation ID',
            },
            topics: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of topic names to add to the conversation',
            },
          },
          required: ['conversation_id', 'topics'],
        },
      },
      {
        name: 'list_customers',
        description: 'List customers in the Gladly organization with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of customers to return (default: 50)',
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
        description: 'Get full profile details for a specific Gladly customer by ID, including contact information and conversation history.',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Gladly customer ID',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer profile in Gladly with name, email, phone, and optional external system ID.',
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
              description: 'Customer phone number in E.164 format (e.g., +15555551234)',
            },
            external_customer_id: {
              type: 'string',
              description: 'Your system\'s unique identifier for this customer (for cross-system linking)',
            },
          },
        },
      },
      {
        name: 'update_customer',
        description: 'Update an existing Gladly customer profile. Only supplied fields are changed (patch semantics).',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Gladly customer ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated customer full name',
            },
            email: {
              type: 'string',
              description: 'Updated customer email address',
            },
            phone: {
              type: 'string',
              description: 'Updated customer phone number',
            },
            external_customer_id: {
              type: 'string',
              description: 'Updated external system ID',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'search_customers',
        description: 'Search Gladly customers by email address, phone number, or external customer ID.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address to search for',
            },
            phone: {
              type: 'string',
              description: 'Phone number to search for',
            },
            external_customer_id: {
              type: 'string',
              description: 'External system customer ID to look up',
            },
          },
        },
      },
      {
        name: 'list_agents',
        description: 'List agents (teammates) in the Gladly organization with their profile and availability status.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of agents to return (default: 50)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_agent',
        description: 'Get profile and role details for a specific Gladly agent by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              description: 'Gladly agent ID',
            },
          },
          required: ['agent_id'],
        },
      },
      {
        name: 'list_inboxes',
        description: 'List all inboxes configured in the Gladly organization, including channel types and routing rules.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'add_conversation_note',
        description: 'Add an internal agent note to a Gladly conversation, visible only to agents and not to the customer.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Conversation ID to add the note to',
            },
            body: {
              type: 'string',
              description: 'Note body text (plain text)',
            },
          },
          required: ['conversation_id', 'body'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_organization':
          return await this.getOrganization();
        case 'list_conversations':
          return await this.listConversations(args);
        case 'get_conversation':
          return await this.getConversation(args);
        case 'get_conversation_items':
          return await this.getConversationItems(args);
        case 'assign_conversation':
          return await this.assignConversation(args);
        case 'close_conversation':
          return await this.closeConversation(args);
        case 'add_conversation_topic':
          return await this.addConversationTopic(args);
        case 'list_customers':
          return await this.listCustomers(args);
        case 'get_customer':
          return await this.getCustomer(args);
        case 'create_customer':
          return await this.createCustomer(args);
        case 'update_customer':
          return await this.updateCustomer(args);
        case 'search_customers':
          return await this.searchCustomers(args);
        case 'list_agents':
          return await this.listAgents(args);
        case 'get_agent':
          return await this.getAgent(args);
        case 'list_inboxes':
          return await this.listInboxes();
        case 'add_conversation_note':
          return await this.addConversationNote(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async getOrganization(): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}/organization`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get organization: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listConversations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.status) params.set('status', args.status as string);
    const url = `${this.baseUrl}/conversations${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list conversations: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const conversation_id = args.conversation_id as string;
    if (!conversation_id) {
      return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    }
    const response = await fetch(
      `${this.baseUrl}/conversations/${encodeURIComponent(conversation_id)}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get conversation: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getConversationItems(args: Record<string, unknown>): Promise<ToolResult> {
    const conversation_id = args.conversation_id as string;
    if (!conversation_id) {
      return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    }
    const response = await fetch(
      `${this.baseUrl}/conversations/${encodeURIComponent(conversation_id)}/items`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get conversation items: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async assignConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const conversation_id = args.conversation_id as string;
    if (!conversation_id) {
      return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    }
    const payload: Record<string, unknown> = {};
    if (args.agent_id) payload.agentId = args.agent_id;
    if (args.inbox_id) payload.inboxId = args.inbox_id;
    const response = await fetch(
      `${this.baseUrl}/conversations/${encodeURIComponent(conversation_id)}/assignee`,
      { method: 'PATCH', headers: this.headers, body: JSON.stringify(payload) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to assign conversation: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async closeConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const conversation_id = args.conversation_id as string;
    if (!conversation_id) {
      return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    }
    const response = await fetch(
      `${this.baseUrl}/conversations/${encodeURIComponent(conversation_id)}/status`,
      { method: 'PATCH', headers: this.headers, body: JSON.stringify({ status: 'RESOLVED' }) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to close conversation: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true, status: 'RESOLVED' }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async addConversationTopic(args: Record<string, unknown>): Promise<ToolResult> {
    const conversation_id = args.conversation_id as string;
    const topics = args.topics as string[];
    if (!conversation_id || !topics || topics.length === 0) {
      return { content: [{ type: 'text', text: 'conversation_id and topics are required' }], isError: true };
    }
    const response = await fetch(
      `${this.baseUrl}/conversations/${encodeURIComponent(conversation_id)}/topics`,
      { method: 'POST', headers: this.headers, body: JSON.stringify({ topics }) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to add topic: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.cursor) params.set('cursor', args.cursor as string);
    const url = `${this.baseUrl}/customers${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list customers: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const customer_id = args.customer_id as string;
    if (!customer_id) {
      return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    }
    const response = await fetch(
      `${this.baseUrl}/customers/${encodeURIComponent(customer_id)}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get customer: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = {};
    if (args.name) payload.name = args.name;
    if (args.email) payload.emails = [{ original: args.email }];
    if (args.phone) payload.phones = [{ original: args.phone }];
    if (args.external_customer_id) payload.externalCustomerId = args.external_customer_id;
    const response = await fetch(`${this.baseUrl}/customers`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create customer: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const customer_id = args.customer_id as string;
    if (!customer_id) {
      return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    }
    const payload: Record<string, unknown> = {};
    if (args.name) payload.name = args.name;
    if (args.email) payload.emails = [{ original: args.email }];
    if (args.phone) payload.phones = [{ original: args.phone }];
    if (args.external_customer_id) payload.externalCustomerId = args.external_customer_id;
    const response = await fetch(
      `${this.baseUrl}/customers/${encodeURIComponent(customer_id)}`,
      { method: 'PATCH', headers: this.headers, body: JSON.stringify(payload) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to update customer: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.email) params.set('email', args.email as string);
    if (args.phone) params.set('phone', args.phone as string);
    if (args.external_customer_id) params.set('externalCustomerId', args.external_customer_id as string);
    if (!params.toString()) {
      return { content: [{ type: 'text', text: 'At least one search parameter (email, phone, or external_customer_id) is required' }], isError: true };
    }
    const url = `${this.baseUrl}/customer-search?${params.toString()}`;
    const response = await fetch(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to search customers: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAgents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.cursor) params.set('cursor', args.cursor as string);
    const url = `${this.baseUrl}/agents${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list agents: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAgent(args: Record<string, unknown>): Promise<ToolResult> {
    const agent_id = args.agent_id as string;
    if (!agent_id) {
      return { content: [{ type: 'text', text: 'agent_id is required' }], isError: true };
    }
    const response = await fetch(
      `${this.baseUrl}/agents/${encodeURIComponent(agent_id)}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get agent: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listInboxes(): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}/inboxes`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list inboxes: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async addConversationNote(args: Record<string, unknown>): Promise<ToolResult> {
    const conversation_id = args.conversation_id as string;
    const body = args.body as string;
    if (!conversation_id || !body) {
      return { content: [{ type: 'text', text: 'conversation_id and body are required' }], isError: true };
    }
    const response = await fetch(
      `${this.baseUrl}/conversations/${encodeURIComponent(conversation_id)}/notes`,
      { method: 'POST', headers: this.headers, body: JSON.stringify({ body }) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to add note: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
