/**
 * ChurnZero MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found

import { ToolDefinition, ToolResult } from './types.js';

interface ChurnZeroConfig {
  instance: string;
  email: string;
  apiKey: string;
  baseUrl?: string;
}

export class ChurnZeroMCPServer {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: ChurnZeroConfig) {
    // Basic auth: base64(email:apiKey) — confirmed via app.churnzero.net/developers
    const credentials = Buffer.from(`${config.email}:${config.apiKey}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
    this.baseUrl = config.baseUrl || `https://${config.instance}.us1app.churnzero.net/public/v1`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_accounts',
        description: 'List accounts (customers) in ChurnZero via OData',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. Name eq \'Acme Corp\')',
            },
            select: {
              type: 'string',
              description: 'Comma-separated OData $select field list',
            },
            top: {
              type: 'number',
              description: 'OData $top — maximum number of records to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'OData $skip — number of records to skip for pagination',
            },
            order_by: {
              type: 'string',
              description: 'OData $orderby expression (e.g. Name asc)',
            },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Get a specific account by its ChurnZero ID',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'ChurnZero account ID',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts in ChurnZero via OData',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression',
            },
            select: {
              type: 'string',
              description: 'Comma-separated OData $select field list',
            },
            top: {
              type: 'number',
              description: 'OData $top — maximum number of records to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'OData $skip — number of records to skip for pagination',
            },
            order_by: {
              type: 'string',
              description: 'OData $orderby expression',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Get a specific contact by their ChurnZero ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'ChurnZero contact ID',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'list_events',
        description: 'List events tracked in ChurnZero via OData',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression',
            },
            select: {
              type: 'string',
              description: 'Comma-separated OData $select field list',
            },
            top: {
              type: 'number',
              description: 'OData $top — maximum number of records to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'OData $skip — number of records to skip for pagination',
            },
            order_by: {
              type: 'string',
              description: 'OData $orderby expression',
            },
          },
        },
      },
      {
        name: 'track_event',
        description: 'Track a custom event for an account or contact in ChurnZero',
        inputSchema: {
          type: 'object',
          properties: {
            account_external_id: {
              type: 'string',
              description: 'Your external ID for the account',
            },
            contact_external_id: {
              type: 'string',
              description: 'Your external ID for the contact (optional)',
            },
            event_name: {
              type: 'string',
              description: 'Name of the event to track',
            },
            event_date: {
              type: 'string',
              description: 'ISO 8601 timestamp of the event (defaults to now)',
            },
            attributes: {
              type: 'object',
              description: 'Key-value pairs of additional event attributes',
            },
          },
          required: ['account_external_id', 'event_name'],
        },
      },
      {
        name: 'list_tasks',
        description: 'List tasks in ChurnZero via OData',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression',
            },
            select: {
              type: 'string',
              description: 'Comma-separated OData $select field list',
            },
            top: {
              type: 'number',
              description: 'OData $top — maximum number of records to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'OData $skip — number of records to skip for pagination',
            },
          },
        },
      },
    ];
  }

  private buildODataParams(args: Record<string, unknown>): string {
    const params = new URLSearchParams();
    if (args.filter) params.set('$filter', args.filter as string);
    if (args.select) params.set('$select', args.select as string);
    if (args.top) params.set('$top', String(args.top));
    if (args.skip) params.set('$skip', String(args.skip));
    if (args.order_by) params.set('$orderby', args.order_by as string);
    return params.toString() ? '?' + params.toString() : '';
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_accounts': {
          const url = `${this.baseUrl}/Account${this.buildODataParams(args)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list accounts: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ChurnZero returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_account': {
          const account_id = args.account_id as string;
          if (!account_id) {
            return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
          }
          const url = `${this.baseUrl}/Account(${encodeURIComponent(account_id)})`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get account: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ChurnZero returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_contacts': {
          const url = `${this.baseUrl}/Contact${this.buildODataParams(args)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list contacts: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ChurnZero returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_contact': {
          const contact_id = args.contact_id as string;
          if (!contact_id) {
            return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
          }
          const url = `${this.baseUrl}/Contact(${encodeURIComponent(contact_id)})`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get contact: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ChurnZero returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_events': {
          const url = `${this.baseUrl}/Event${this.buildODataParams(args)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list events: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ChurnZero returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'track_event': {
          const account_external_id = args.account_external_id as string;
          const event_name = args.event_name as string;
          if (!account_external_id || !event_name) {
            return { content: [{ type: 'text', text: 'account_external_id and event_name are required' }], isError: true };
          }
          const payload: Record<string, unknown> = {
            accountExternalId: account_external_id,
            eventName: event_name,
          };
          if (args.contact_external_id) payload.contactExternalId = args.contact_external_id;
          if (args.event_date) payload.eventDate = args.event_date;
          if (args.attributes) payload.attributes = args.attributes;

          const response = await fetch(`${this.baseUrl}/Event`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to track event: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { data = { success: true }; }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_tasks': {
          const url = `${this.baseUrl}/Task${this.buildODataParams(args)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list tasks: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ChurnZero returned non-JSON response (HTTP ${response.status})`); }
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
