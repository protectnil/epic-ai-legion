/**
 * Zoho CRM MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — multiple community implementations exist (Mgabr90/zoho-mcp-server, junnaisystems/zoho-crm-mcp, ampcome-mcps/zoho-crm-mcp) but none are official Zoho-published servers

import { ToolDefinition, ToolResult } from './types.js';

// Zoho CRM API v8 regional base URLs.
// The api_domain returned by the OAuth token response is authoritative.
// Regional defaults:
//   US:  https://www.zohoapis.com/crm/v8
//   EU:  https://www.zohoapis.eu/crm/v8
//   IN:  https://www.zohoapis.in/crm/v8
//   AU:  https://www.zohoapis.com.au/crm/v8
//   JP:  https://www.zohoapis.jp/crm/v8
//   CA:  https://www.zohoapis.ca/crm/v8
//   CN:  https://www.zohoapis.com.cn/crm/v8
// Sandbox prefix: replace "www" with "sandbox", e.g. https://sandbox.zohoapis.com/crm/v8

interface ZohoCRMConfig {
  accessToken: string;
  baseUrl?: string;
}

export class ZohoCRMMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: ZohoCRMConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://www.zohoapis.com/crm/v8';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_records',
        description: 'List records from any Zoho CRM module (Leads, Contacts, Accounts, Deals, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Module API name: Leads, Contacts, Accounts, Deals, Tasks, Calls, Meetings',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated field API names to return. Omit to return all fields.',
            },
            sort_by: {
              type: 'string',
              description: 'Field API name to sort results by',
            },
            sort_order: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of records per page (max 200, default: 200)',
            },
          },
          required: ['module'],
        },
      },
      {
        name: 'get_record',
        description: 'Get a single record from a Zoho CRM module by record ID',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Module API name: Leads, Contacts, Accounts, Deals, Tasks, Calls, Meetings',
            },
            record_id: {
              type: 'string',
              description: 'Zoho CRM record ID',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated field API names to return. Omit to return all fields.',
            },
          },
          required: ['module', 'record_id'],
        },
      },
      {
        name: 'create_record',
        description: 'Create one or more records in a Zoho CRM module',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Module API name: Leads, Contacts, Accounts, Deals, Tasks, Calls, Meetings',
            },
            data: {
              type: 'object',
              description: 'Record field values as key-value pairs. Field names must match the module\'s API names.',
            },
          },
          required: ['module', 'data'],
        },
      },
      {
        name: 'update_record',
        description: 'Update an existing record in a Zoho CRM module by record ID',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Module API name: Leads, Contacts, Accounts, Deals, Tasks, Calls, Meetings',
            },
            record_id: {
              type: 'string',
              description: 'Zoho CRM record ID to update',
            },
            data: {
              type: 'object',
              description: 'Fields to update as key-value pairs. Only include fields you want to change.',
            },
          },
          required: ['module', 'record_id', 'data'],
        },
      },
      {
        name: 'search_records',
        description: 'Search records in a Zoho CRM module by criteria, email, phone, word, or COQL query',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Module API name: Leads, Contacts, Accounts, Deals, Tasks, Calls, Meetings',
            },
            criteria: {
              type: 'string',
              description: 'Field-based criteria, e.g. (Last_Name:equals:Smith). Use this OR email/phone/word, not together.',
            },
            email: {
              type: 'string',
              description: 'Search by exact email address',
            },
            phone: {
              type: 'string',
              description: 'Search by exact phone number',
            },
            word: {
              type: 'string',
              description: 'Search by word (searches across all text fields)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Records per page (max 200, default: 200)',
            },
          },
          required: ['module'],
        },
      },
      {
        name: 'delete_record',
        description: 'Delete a record from a Zoho CRM module by record ID',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Module API name: Leads, Contacts, Accounts, Deals, Tasks, Calls, Meetings',
            },
            record_id: {
              type: 'string',
              description: 'Zoho CRM record ID to delete',
            },
          },
          required: ['module', 'record_id'],
        },
      },
      {
        name: 'list_modules',
        description: 'List all available modules in the Zoho CRM organization',
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
        Authorization: `Zoho-oauthtoken ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      switch (name) {
        case 'list_records': {
          const module = args.module as string;
          if (!module) {
            return { content: [{ type: 'text', text: 'module is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.fields) params.set('fields', args.fields as string);
          if (args.sort_by) params.set('sort_by', args.sort_by as string);
          if (args.sort_order) params.set('sort_order', args.sort_order as string);
          params.set('page', String((args.page as number) || 1));
          params.set('per_page', String((args.per_page as number) || 200));

          const response = await fetch(`${this.baseUrl}/${encodeURIComponent(module)}?${params.toString()}`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list records: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zoho CRM returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_record': {
          const module = args.module as string;
          const record_id = args.record_id as string;
          if (!module || !record_id) {
            return { content: [{ type: 'text', text: 'module and record_id are required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.fields) params.set('fields', args.fields as string);
          const qs = params.toString() ? `?${params.toString()}` : '';

          const response = await fetch(`${this.baseUrl}/${encodeURIComponent(module)}/${encodeURIComponent(record_id)}${qs}`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get record: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zoho CRM returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_record': {
          const module = args.module as string;
          const data = args.data as Record<string, unknown>;
          if (!module || !data) {
            return { content: [{ type: 'text', text: 'module and data are required' }], isError: true };
          }

          const body = { data: [data] };

          const response = await fetch(`${this.baseUrl}/${encodeURIComponent(module)}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create record: ${response.status} ${response.statusText}` }], isError: true };
          }

          let responseData: unknown;
          try { responseData = await response.json(); } catch { throw new Error(`Zoho CRM returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(responseData, null, 2) }], isError: false };
        }

        case 'update_record': {
          const module = args.module as string;
          const record_id = args.record_id as string;
          const data = args.data as Record<string, unknown>;
          if (!module || !record_id || !data) {
            return { content: [{ type: 'text', text: 'module, record_id, and data are required' }], isError: true };
          }

          const body = { data: [{ id: record_id, ...data }] };

          const response = await fetch(`${this.baseUrl}/${encodeURIComponent(module)}/${encodeURIComponent(record_id)}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update record: ${response.status} ${response.statusText}` }], isError: true };
          }

          let responseData: unknown;
          try { responseData = await response.json(); } catch { throw new Error(`Zoho CRM returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(responseData, null, 2) }], isError: false };
        }

        case 'search_records': {
          const module = args.module as string;
          if (!module) {
            return { content: [{ type: 'text', text: 'module is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.criteria) params.set('criteria', args.criteria as string);
          if (args.email) params.set('email', args.email as string);
          if (args.phone) params.set('phone', args.phone as string);
          if (args.word) params.set('word', args.word as string);
          params.set('page', String((args.page as number) || 1));
          params.set('per_page', String((args.per_page as number) || 200));

          const response = await fetch(`${this.baseUrl}/${encodeURIComponent(module)}/search?${params.toString()}`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to search records: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zoho CRM returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_record': {
          const module = args.module as string;
          const record_id = args.record_id as string;
          if (!module || !record_id) {
            return { content: [{ type: 'text', text: 'module and record_id are required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/${encodeURIComponent(module)}/${encodeURIComponent(record_id)}`, {
            method: 'DELETE',
            headers,
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to delete record: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zoho CRM returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_modules': {
          const response = await fetch(`${this.baseUrl}/settings/modules`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list modules: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zoho CRM returned non-JSON response (HTTP ${response.status})`); }
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
