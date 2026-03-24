/**
 * Freshservice MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — effytech/freshservice_mcp (community, MIT) exists on GitHub
// but is not an official Freshworks-published MCP server. This is our own implementation.

import { ToolDefinition, ToolResult } from './types.js';

interface FreshserviceConfig {
  apiKey: string;
  /** Your Freshservice domain, e.g. "mycompany.freshservice.com" */
  domain: string;
}

export class FreshserviceMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: FreshserviceConfig) {
    this.apiKey = config.apiKey;
    // Freshservice uses Basic auth with the API key as the username and "X" as the password.
    // Username/password basic auth was deprecated May 31 2023.
    this.baseUrl = `https://${config.domain}/api/v2`;
  }

  private get authHeader(): string {
    // API key is passed as Basic auth username; password is a placeholder string per Freshservice docs.
    const encoded = Buffer.from(`${this.apiKey}:X`).toString('base64');
    return `Basic ${encoded}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_tickets',
        description: 'List tickets in Freshservice with optional filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Predefined filter: new_and_my_open, watching, spam, or deleted',
            },
            requester_id: {
              type: 'number',
              description: 'Filter tickets by requester ID',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of tickets per page (max 100, default: 30)',
            },
            order_by: {
              type: 'string',
              description: 'Field to order results by: created_at, due_by, updated_at (default: created_at)',
            },
            order_type: {
              type: 'string',
              description: 'Sort order: asc or desc (default: desc)',
            },
          },
        },
      },
      {
        name: 'get_ticket',
        description: 'Get details of a specific Freshservice ticket by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: {
              type: 'number',
              description: 'The numeric ID of the ticket (required)',
            },
          },
          required: ['ticket_id'],
        },
      },
      {
        name: 'create_ticket',
        description: 'Create a new ticket in Freshservice',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Subject of the ticket (required)',
            },
            description: {
              type: 'string',
              description: 'HTML content of the ticket description',
            },
            email: {
              type: 'string',
              description: 'Email address of the requester (required if requester_id is not provided)',
            },
            requester_id: {
              type: 'number',
              description: 'ID of the requester (required if email is not provided)',
            },
            priority: {
              type: 'number',
              description: 'Priority: 1=Low, 2=Medium, 3=High, 4=Urgent (default: 1)',
            },
            status: {
              type: 'number',
              description: 'Status: 2=Open, 3=Pending, 4=Resolved, 5=Closed (default: 2)',
            },
            type: {
              type: 'string',
              description: 'Ticket type, e.g. Incident, Service Request',
            },
            category: {
              type: 'string',
              description: 'Ticket category',
            },
            tags: {
              type: 'array',
              description: 'Array of tag strings',
              items: { type: 'string' },
            },
          },
          required: ['subject'],
        },
      },
      {
        name: 'update_ticket',
        description: 'Update an existing Freshservice ticket',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: {
              type: 'number',
              description: 'The numeric ID of the ticket to update (required)',
            },
            subject: {
              type: 'string',
              description: 'Updated subject of the ticket',
            },
            description: {
              type: 'string',
              description: 'Updated HTML description',
            },
            priority: {
              type: 'number',
              description: 'Priority: 1=Low, 2=Medium, 3=High, 4=Urgent',
            },
            status: {
              type: 'number',
              description: 'Status: 2=Open, 3=Pending, 4=Resolved, 5=Closed',
            },
            category: {
              type: 'string',
              description: 'Ticket category',
            },
            tags: {
              type: 'array',
              description: 'Array of tag strings',
              items: { type: 'string' },
            },
          },
          required: ['ticket_id'],
        },
      },
      {
        name: 'add_ticket_note',
        description: 'Add a note (private or public reply) to a Freshservice ticket',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: {
              type: 'number',
              description: 'The numeric ID of the ticket (required)',
            },
            body: {
              type: 'string',
              description: 'HTML content of the note (required)',
            },
            private: {
              type: 'boolean',
              description: 'Whether the note is private (visible only to agents). Default: true',
            },
          },
          required: ['ticket_id', 'body'],
        },
      },
      {
        name: 'list_problems',
        description: 'List problem records in Freshservice',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 100, default: 30)',
            },
          },
        },
      },
      {
        name: 'create_problem',
        description: 'Create a new problem record in Freshservice',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Subject/title of the problem (required)',
            },
            description: {
              type: 'string',
              description: 'HTML description of the problem',
            },
            priority: {
              type: 'number',
              description: 'Priority: 1=Low, 2=Medium, 3=High, 4=Urgent (default: 1)',
            },
            status: {
              type: 'number',
              description: 'Status: 1=Open, 2=Change Requested, 3=Closed (default: 1)',
            },
            category: {
              type: 'string',
              description: 'Problem category',
            },
          },
          required: ['subject'],
        },
      },
      {
        name: 'list_changes',
        description: 'List change requests in Freshservice',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 100, default: 30)',
            },
          },
        },
      },
      {
        name: 'create_change',
        description: 'Create a new change request in Freshservice',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Subject/title of the change request (required)',
            },
            description: {
              type: 'string',
              description: 'HTML description of the change',
            },
            priority: {
              type: 'number',
              description: 'Priority: 1=Low, 2=Medium, 3=High, 4=Urgent (default: 1)',
            },
            status: {
              type: 'number',
              description: 'Status: 1=Open, 2=Planning, 3=Approval, 4=Pending Release, 5=Pending Review, 6=closed (default: 1)',
            },
            change_type: {
              type: 'number',
              description: 'Change type: 1=Minor, 2=Standard, 3=Major, 4=Emergency (default: 1)',
            },
            planned_start_date: {
              type: 'string',
              description: 'Planned start date and time in ISO 8601 format (e.g. 2026-04-01T09:00:00Z)',
            },
            planned_end_date: {
              type: 'string',
              description: 'Planned end date and time in ISO 8601 format',
            },
          },
          required: ['subject'],
        },
      },
      {
        name: 'list_assets',
        description: 'List assets (configuration items) in Freshservice',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 100, default: 30)',
            },
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
      };

      switch (name) {
        case 'list_tickets': {
          const params = new URLSearchParams();
          if (args.filter) params.set('filter', args.filter as string);
          if (args.requester_id !== undefined) params.set('requester_id', String(args.requester_id));
          if (args.page !== undefined) params.set('page', String(args.page));
          if (args.per_page !== undefined) params.set('per_page', String(args.per_page));
          if (args.order_by) params.set('order_by', args.order_by as string);
          if (args.order_type) params.set('order_type', args.order_type as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/tickets${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list tickets: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshservice returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_ticket': {
          const ticket_id = args.ticket_id as number;
          if (!ticket_id) {
            return { content: [{ type: 'text', text: 'ticket_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/tickets/${ticket_id}`, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get ticket: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshservice returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_ticket': {
          const subject = args.subject as string;
          if (!subject) {
            return { content: [{ type: 'text', text: 'subject is required' }], isError: true };
          }

          const body: Record<string, unknown> = { subject };
          if (args.description) body.description = args.description;
          if (args.email) body.email = args.email;
          if (args.requester_id !== undefined) body.requester_id = args.requester_id;
          if (args.priority !== undefined) body.priority = args.priority;
          if (args.status !== undefined) body.status = args.status;
          if (args.type) body.type = args.type;
          if (args.category) body.category = args.category;
          if (args.tags) body.tags = args.tags;

          const response = await fetch(`${this.baseUrl}/tickets`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create ticket: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshservice returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_ticket': {
          const ticket_id = args.ticket_id as number;
          if (!ticket_id) {
            return { content: [{ type: 'text', text: 'ticket_id is required' }], isError: true };
          }

          const body: Record<string, unknown> = {};
          if (args.subject) body.subject = args.subject;
          if (args.description) body.description = args.description;
          if (args.priority !== undefined) body.priority = args.priority;
          if (args.status !== undefined) body.status = args.status;
          if (args.category) body.category = args.category;
          if (args.tags) body.tags = args.tags;

          const response = await fetch(`${this.baseUrl}/tickets/${ticket_id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to update ticket: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshservice returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'add_ticket_note': {
          const ticket_id = args.ticket_id as number;
          const body_text = args.body as string;

          if (!ticket_id || !body_text) {
            return {
              content: [{ type: 'text', text: 'ticket_id and body are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { body: body_text };
          if (typeof args.private === 'boolean') body.private = args.private;

          const response = await fetch(`${this.baseUrl}/tickets/${ticket_id}/notes`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to add note: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshservice returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_problems': {
          const params = new URLSearchParams();
          if (args.page !== undefined) params.set('page', String(args.page));
          if (args.per_page !== undefined) params.set('per_page', String(args.per_page));

          const qs = params.toString();
          const url = `${this.baseUrl}/problems${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list problems: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshservice returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_problem': {
          const subject = args.subject as string;
          if (!subject) {
            return { content: [{ type: 'text', text: 'subject is required' }], isError: true };
          }

          const body: Record<string, unknown> = { subject };
          if (args.description) body.description = args.description;
          if (args.priority !== undefined) body.priority = args.priority;
          if (args.status !== undefined) body.status = args.status;
          if (args.category) body.category = args.category;

          const response = await fetch(`${this.baseUrl}/problems`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create problem: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshservice returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_changes': {
          const params = new URLSearchParams();
          if (args.page !== undefined) params.set('page', String(args.page));
          if (args.per_page !== undefined) params.set('per_page', String(args.per_page));

          const qs = params.toString();
          const url = `${this.baseUrl}/changes${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list changes: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshservice returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_change': {
          const subject = args.subject as string;
          if (!subject) {
            return { content: [{ type: 'text', text: 'subject is required' }], isError: true };
          }

          const body: Record<string, unknown> = { subject };
          if (args.description) body.description = args.description;
          if (args.priority !== undefined) body.priority = args.priority;
          if (args.status !== undefined) body.status = args.status;
          if (args.change_type !== undefined) body.change_type = args.change_type;
          if (args.planned_start_date) body.planned_start_date = args.planned_start_date;
          if (args.planned_end_date) body.planned_end_date = args.planned_end_date;

          const response = await fetch(`${this.baseUrl}/changes`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create change: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshservice returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_assets': {
          const params = new URLSearchParams();
          if (args.page !== undefined) params.set('page', String(args.page));
          if (args.per_page !== undefined) params.set('per_page', String(args.per_page));

          const qs = params.toString();
          const url = `${this.baseUrl}/assets${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list assets: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Freshservice returned non-JSON response (HTTP ${response.status})`); }
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
