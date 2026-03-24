/**
 * Freshdesk MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found from Freshworks — community implementations only (effytech/freshdesk_mcp, Enreign/freshdeck-mcp)

import { ToolDefinition, ToolResult } from './types.js';

// Base URL: https://{domain}.freshdesk.com/api/v2
// Auth: HTTP Basic — API key as username, literal "X" as password.
// Example: Authorization: Basic base64("apikey:X")
// The domain is the subdomain of your Freshdesk account (e.g. "acme" for acme.freshdesk.com).

interface FreshdeskConfig {
  apiKey: string;
  domain: string;   // e.g. "acme" (subdomain only, not full hostname)
  baseUrl?: string; // override full base URL if needed
}

export class FreshdeskMCPServer {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: FreshdeskConfig) {
    // Freshdesk Basic auth: API key as username, "X" as password
    const credentials = Buffer.from(`${config.apiKey}:X`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
    this.baseUrl = config.baseUrl || `https://${config.domain}.freshdesk.com/api/v2`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_tickets',
        description: 'List tickets with optional filtering by status, priority, type, or requester',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Predefined filter: new_and_my_open, watching, spam, deleted',
            },
            requester_id: {
              type: 'number',
              description: 'Filter tickets by requester ID',
            },
            email: {
              type: 'string',
              description: 'Filter tickets by requester email',
            },
            type: {
              type: 'string',
              description: 'Filter by ticket type (e.g. Question, Incident, Problem, Feature Request)',
            },
            updated_since: {
              type: 'string',
              description: 'Return tickets updated after this ISO 8601 timestamp',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 30)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            order_by: {
              type: 'string',
              description: 'Sort field: created_at, due_by, updated_at, status (default: created_at)',
            },
            order_type: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc)',
            },
          },
        },
      },
      {
        name: 'get_ticket',
        description: 'Get full details of a specific ticket by ID',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: {
              type: 'number',
              description: 'The Freshdesk ticket ID',
            },
          },
          required: ['ticket_id'],
        },
      },
      {
        name: 'create_ticket',
        description: 'Create a new support ticket',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Subject of the ticket',
            },
            description: {
              type: 'string',
              description: 'HTML body of the ticket description',
            },
            email: {
              type: 'string',
              description: 'Email address of the requester',
            },
            priority: {
              type: 'number',
              description: 'Priority: 1=Low, 2=Medium, 3=High, 4=Urgent',
            },
            status: {
              type: 'number',
              description: 'Status: 2=Open, 3=Pending, 4=Resolved, 5=Closed',
            },
            type: {
              type: 'string',
              description: 'Ticket type (e.g. Question, Incident, Problem, Feature Request)',
            },
            tags: {
              type: 'array',
              description: 'Array of tag strings to attach to the ticket',
              items: { type: 'string' },
            },
          },
          required: ['subject', 'email'],
        },
      },
      {
        name: 'update_ticket',
        description: 'Update fields on an existing ticket',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: {
              type: 'number',
              description: 'The Freshdesk ticket ID to update',
            },
            status: {
              type: 'number',
              description: 'New status: 2=Open, 3=Pending, 4=Resolved, 5=Closed',
            },
            priority: {
              type: 'number',
              description: 'New priority: 1=Low, 2=Medium, 3=High, 4=Urgent',
            },
            subject: {
              type: 'string',
              description: 'New subject',
            },
            type: {
              type: 'string',
              description: 'New ticket type',
            },
            tags: {
              type: 'array',
              description: 'New set of tags (replaces existing tags)',
              items: { type: 'string' },
            },
            responder_id: {
              type: 'number',
              description: 'Agent ID to assign the ticket to',
            },
          },
          required: ['ticket_id'],
        },
      },
      {
        name: 'reply_to_ticket',
        description: 'Add a reply to a ticket (visible to requester)',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: {
              type: 'number',
              description: 'The Freshdesk ticket ID',
            },
            body: {
              type: 'string',
              description: 'HTML content of the reply',
            },
            cc_emails: {
              type: 'array',
              description: 'Array of email addresses to CC on this reply',
              items: { type: 'string' },
            },
          },
          required: ['ticket_id', 'body'],
        },
      },
      {
        name: 'add_note_to_ticket',
        description: 'Add an internal note to a ticket (not visible to requester by default)',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: {
              type: 'number',
              description: 'The Freshdesk ticket ID',
            },
            body: {
              type: 'string',
              description: 'HTML content of the note',
            },
            private: {
              type: 'boolean',
              description: 'If true, note is private (visible to agents only). Default: true',
            },
          },
          required: ['ticket_id', 'body'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts with optional search filtering',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Filter by exact email address',
            },
            mobile: {
              type: 'string',
              description: 'Filter by mobile number',
            },
            phone: {
              type: 'string',
              description: 'Filter by phone number',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 30)',
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
              type: 'number',
              description: 'The Freshdesk contact ID',
            },
          },
          required: ['contact_id'],
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
        case 'list_tickets': {
          const params = new URLSearchParams();
          if (args.filter) params.set('filter', args.filter as string);
          if (args.requester_id) params.set('requester_id', String(args.requester_id));
          if (args.email) params.set('email', args.email as string);
          if (args.type) params.set('type', args.type as string);
          if (args.updated_since) params.set('updated_since', args.updated_since as string);
          if (args.per_page) params.set('per_page', String(args.per_page));
          if (args.page) params.set('page', String(args.page));
          if (args.order_by) params.set('order_by', args.order_by as string);
          if (args.order_type) params.set('order_type', args.order_type as string);

          const url = `${this.baseUrl}/tickets?${params.toString()}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list tickets: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshdesk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_ticket': {
          const ticketId = args.ticket_id as number;
          if (!ticketId) {
            return { content: [{ type: 'text', text: 'ticket_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/tickets/${ticketId}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get ticket: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshdesk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_ticket': {
          const subject = args.subject as string;
          const email = args.email as string;
          if (!subject || !email) {
            return { content: [{ type: 'text', text: 'subject and email are required' }], isError: true };
          }

          const body: Record<string, unknown> = { subject, email };
          if (args.description) body.description = args.description;
          if (args.priority) body.priority = args.priority;
          if (args.status) body.status = args.status;
          if (args.type) body.type = args.type;
          if (args.tags) body.tags = args.tags;

          const response = await fetch(
            `${this.baseUrl}/tickets`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create ticket: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshdesk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_ticket': {
          const ticketId = args.ticket_id as number;
          if (!ticketId) {
            return { content: [{ type: 'text', text: 'ticket_id is required' }], isError: true };
          }

          const body: Record<string, unknown> = {};
          if (args.status !== undefined) body.status = args.status;
          if (args.priority !== undefined) body.priority = args.priority;
          if (args.subject) body.subject = args.subject;
          if (args.type) body.type = args.type;
          if (args.tags) body.tags = args.tags;
          if (args.responder_id) body.responder_id = args.responder_id;

          const response = await fetch(
            `${this.baseUrl}/tickets/${ticketId}`,
            { method: 'PUT', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to update ticket: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshdesk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'reply_to_ticket': {
          const ticketId = args.ticket_id as number;
          const body_text = args.body as string;
          if (!ticketId || !body_text) {
            return { content: [{ type: 'text', text: 'ticket_id and body are required' }], isError: true };
          }

          const body: Record<string, unknown> = { body: body_text };
          if (args.cc_emails) body.cc_emails = args.cc_emails;

          const response = await fetch(
            `${this.baseUrl}/tickets/${ticketId}/reply`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to reply to ticket: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshdesk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'add_note_to_ticket': {
          const ticketId = args.ticket_id as number;
          const noteBody = args.body as string;
          if (!ticketId || !noteBody) {
            return { content: [{ type: 'text', text: 'ticket_id and body are required' }], isError: true };
          }

          const body: Record<string, unknown> = {
            body: noteBody,
            private: typeof args.private === 'boolean' ? args.private : true,
          };

          const response = await fetch(
            `${this.baseUrl}/tickets/${ticketId}/notes`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to add note to ticket: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshdesk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_contacts': {
          const params = new URLSearchParams();
          if (args.email) params.set('email', args.email as string);
          if (args.mobile) params.set('mobile', args.mobile as string);
          if (args.phone) params.set('phone', args.phone as string);
          if (args.page) params.set('page', String(args.page));
          if (args.per_page) params.set('per_page', String(args.per_page));

          const url = `${this.baseUrl}/contacts?${params.toString()}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list contacts: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshdesk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_contact': {
          const contactId = args.contact_id as number;
          if (!contactId) {
            return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/contacts/${contactId}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get contact: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshdesk returned non-JSON response (HTTP ${response.status})`); }
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
