/**
 * Outreach MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — CData community adapter exists (CDataSoftware/outreach.io-mcp-server-by-cdata) but no Outreach-published MCP server

// Outreach REST API v2 implements JSON:API 1.0 specification.
// Base URL: https://api.outreach.io/api/v2
// Auth: OAuth2 Bearer token. Access tokens valid for 2 hours; refresh tokens valid for 14 days.
// Content-Type for write requests: application/vnd.api+json
// All request bodies follow JSON:API format: { data: { type: '...', attributes: {...} } }
// All responses follow JSON:API format: { data: { id, type, attributes, relationships } }

import { ToolDefinition, ToolResult } from './types.js';

interface OutreachConfig {
  accessToken: string;
  baseUrl?: string;
}

export class OutreachMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: OutreachConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.outreach.io/api/v2';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_prospects',
        description: 'List prospect records from Outreach. Prospects are the people you are reaching out to.',
        inputSchema: {
          type: 'object',
          properties: {
            filter_email: {
              type: 'string',
              description: 'Filter prospects by exact email address',
            },
            filter_account_id: {
              type: 'number',
              description: 'Filter prospects by Outreach account ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of prospects per page (max 1000, default: 50)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            sort: {
              type: 'string',
              description: 'Sort field with optional direction prefix: createdAt, -createdAt, updatedAt, -updatedAt',
            },
          },
        },
      },
      {
        name: 'get_prospect',
        description: 'Get a single prospect by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Outreach prospect ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_prospect',
        description: 'Create a new prospect in Outreach',
        inputSchema: {
          type: 'object',
          properties: {
            emails: {
              type: 'array',
              description: 'Array of email addresses for the prospect',
            },
            firstName: {
              type: 'string',
              description: 'Prospect first name',
            },
            lastName: {
              type: 'string',
              description: 'Prospect last name',
            },
            title: {
              type: 'string',
              description: 'Prospect job title',
            },
            company: {
              type: 'string',
              description: 'Prospect company name',
            },
            phones: {
              type: 'array',
              description: 'Array of phone numbers for the prospect',
            },
            account_id: {
              type: 'number',
              description: 'Outreach account ID to associate this prospect with',
            },
          },
        },
      },
      {
        name: 'list_accounts',
        description: 'List account records from Outreach. Accounts represent companies or organizations.',
        inputSchema: {
          type: 'object',
          properties: {
            filter_name: {
              type: 'string',
              description: 'Filter accounts by name (prefix match)',
            },
            page_size: {
              type: 'number',
              description: 'Number of accounts per page (max 1000, default: 50)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            sort: {
              type: 'string',
              description: 'Sort field with optional direction prefix: name, -name, createdAt, -createdAt',
            },
          },
        },
      },
      {
        name: 'list_sequences',
        description: 'List sequence records from Outreach. Sequences are automated outreach campaigns.',
        inputSchema: {
          type: 'object',
          properties: {
            filter_enabled: {
              type: 'boolean',
              description: 'Filter by enabled/disabled state',
            },
            page_size: {
              type: 'number',
              description: 'Number of sequences per page (max 1000, default: 50)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'list_opportunities',
        description: 'List opportunity records from Outreach',
        inputSchema: {
          type: 'object',
          properties: {
            filter_account_id: {
              type: 'number',
              description: 'Filter opportunities by Outreach account ID',
            },
            filter_prospect_id: {
              type: 'number',
              description: 'Filter opportunities by Outreach prospect ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of opportunities per page (max 1000, default: 50)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'list_mailings',
        description: 'List mailing records from Outreach. Mailings are individual email sends.',
        inputSchema: {
          type: 'object',
          properties: {
            filter_prospect_id: {
              type: 'number',
              description: 'Filter mailings by prospect ID',
            },
            filter_sequence_id: {
              type: 'number',
              description: 'Filter mailings by sequence ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of mailings per page (max 1000, default: 50)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
      };

      const buildListUrl = (resource: string, args: Record<string, unknown>, filterMap: Record<string, string> = {}): string => {
        const params = new URLSearchParams();
        for (const [argKey, paramName] of Object.entries(filterMap)) {
          if (args[argKey] !== undefined) {
            params.set(paramName, String(args[argKey]));
          }
        }
        params.set('page[size]', String((args.page_size as number) || 50));
        params.set('page[number]', String((args.page_number as number) || 1));
        if (args.sort) params.set('sort', args.sort as string);
        return `${this.baseUrl}/${resource}?${params.toString()}`;
      };

      switch (name) {
        case 'list_prospects': {
          const url = buildListUrl('prospects', args, {
            filter_email: 'filter[emails]',
            filter_account_id: 'filter[account][id]',
          });
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list prospects: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Outreach returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_prospect': {
          const id = args.id as number;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/prospects/${id}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get prospect: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Outreach returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_prospect': {
          const attributes: Record<string, unknown> = {};
          if (args.emails) attributes.emails = args.emails;
          if (args.firstName) attributes.firstName = args.firstName;
          if (args.lastName) attributes.lastName = args.lastName;
          if (args.title) attributes.title = args.title;
          if (args.company) attributes.company = args.company;
          if (args.phones) attributes.phones = args.phones;

          const body: Record<string, unknown> = {
            data: { type: 'prospect', attributes },
          };

          if (args.account_id) {
            (body.data as Record<string, unknown>).relationships = {
              account: { data: { type: 'account', id: args.account_id } },
            };
          }

          const response = await fetch(`${this.baseUrl}/prospects`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create prospect: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Outreach returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_accounts': {
          const url = buildListUrl('accounts', args, {
            filter_name: 'filter[name]',
          });
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list accounts: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Outreach returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_sequences': {
          const params = new URLSearchParams();
          if (typeof args.filter_enabled === 'boolean') params.set('filter[enabled]', String(args.filter_enabled));
          params.set('page[size]', String((args.page_size as number) || 50));
          params.set('page[number]', String((args.page_number as number) || 1));
          const response = await fetch(`${this.baseUrl}/sequences?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list sequences: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Outreach returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_opportunities': {
          const url = buildListUrl('opportunities', args, {
            filter_account_id: 'filter[account][id]',
            filter_prospect_id: 'filter[prospect][id]',
          });
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list opportunities: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Outreach returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_mailings': {
          const url = buildListUrl('mailings', args, {
            filter_prospect_id: 'filter[prospect][id]',
            filter_sequence_id: 'filter[sequence][id]',
          });
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list mailings: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Outreach returned non-JSON response (HTTP ${response.status})`); }
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
