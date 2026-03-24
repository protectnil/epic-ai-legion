/**
 * Telnyx MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Telnyx MCP server was found on GitHub or in Telnyx's developer documentation.
//
// Base URL: https://api.telnyx.com/v2
// Auth: Bearer token in Authorization header — API key from Mission Control Portal under Auth > Auth V2
// Docs: https://developers.telnyx.com/docs/api/v2/overview
// Rate limits: Not publicly documented per-endpoint; contact Telnyx for production rate limit details

import { ToolDefinition, ToolResult } from './types.js';

interface TelnyxConfig {
  apiKey: string;
  baseUrl?: string;
}

export class TelnyxMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: TelnyxConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.telnyx.com/v2';
  }

  static catalog() {
    return {
      name: 'telnyx',
      displayName: 'Telnyx',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'telnyx', 'sms', 'mms', 'messaging', 'phone numbers', 'voip', 'voice',
        'calls', 'fax', 'carrier', 'telecom', 'cpaas', 'programmable voice',
        'number lookup', 'porting', 'sip', 'real-time communications',
      ],
      toolNames: [
        'search_phone_numbers', 'list_phone_numbers', 'get_phone_number', 'purchase_phone_number', 'release_phone_number',
        'send_message', 'list_messages', 'get_message',
        'create_call', 'list_calls', 'get_call',
        'list_messaging_profiles', 'get_messaging_profile', 'create_messaging_profile',
        'lookup_number', 'list_number_order_phone_numbers',
        'list_connections', 'get_connection',
      ],
      description: 'Telnyx cloud communications platform: search and manage phone numbers, send SMS/MMS messages, initiate and track calls, and manage messaging profiles.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_phone_numbers',
        description: 'Search for available phone numbers to purchase with filters for country, area code, number pattern, and features',
        inputSchema: {
          type: 'object',
          properties: {
            filter_country_code: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code (e.g. US, CA, GB)',
            },
            filter_npa: {
              type: 'string',
              description: 'Area code filter for North American numbers (e.g. 415)',
            },
            filter_number_type: {
              type: 'string',
              description: 'Number type: local, toll_free, mobile, national (default: local)',
            },
            filter_features: {
              type: 'array',
              description: 'Required features: sms, mms, voice, fax (returns numbers supporting all listed features)',
            },
            filter_phone_number_starts_with: {
              type: 'string',
              description: 'Filter numbers starting with this digit sequence (e.g. +1415)',
            },
            filter_phone_number_contains: {
              type: 'string',
              description: 'Filter numbers containing this digit sequence',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 250)',
            },
          },
        },
      },
      {
        name: 'list_phone_numbers',
        description: 'List phone numbers owned by the Telnyx account with optional status and connection filters',
        inputSchema: {
          type: 'object',
          properties: {
            filter_status: {
              type: 'string',
              description: 'Filter by number status: active, pending, ported, deleted (default: active)',
            },
            filter_connection_id: {
              type: 'string',
              description: 'Filter by connection (SIP trunk or credential) ID',
            },
            filter_tag: {
              type: 'string',
              description: 'Filter by tag assigned to numbers',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 250)',
            },
          },
        },
      },
      {
        name: 'get_phone_number',
        description: 'Get detailed information about a specific phone number by its ID including features and connection assignment',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number_id: {
              type: 'string',
              description: 'Telnyx phone number ID (UUID format)',
            },
          },
          required: ['phone_number_id'],
        },
      },
      {
        name: 'purchase_phone_number',
        description: 'Purchase an available phone number found via search — the number will be provisioned to your account',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number: {
              type: 'string',
              description: 'E.164 formatted phone number to purchase (e.g. +14155550123)',
            },
            connection_id: {
              type: 'string',
              description: 'Connection ID (SIP trunk or credential) to assign the number to after purchase',
            },
            messaging_profile_id: {
              type: 'string',
              description: 'Messaging profile ID to assign to the number for SMS/MMS routing',
            },
          },
          required: ['phone_number'],
        },
      },
      {
        name: 'release_phone_number',
        description: 'Release a phone number from the Telnyx account — this immediately removes it from your account',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number_id: {
              type: 'string',
              description: 'Phone number ID to release',
            },
          },
          required: ['phone_number_id'],
        },
      },
      {
        name: 'send_message',
        description: 'Send an SMS or MMS message from a Telnyx phone number, short code, or alphanumeric sender ID',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Sender — a Telnyx phone number (E.164), short code, or alphanumeric sender ID',
            },
            to: {
              type: 'string',
              description: 'Recipient phone number in E.164 format (e.g. +14155550123)',
            },
            text: {
              type: 'string',
              description: 'Message text for SMS (up to 1600 characters)',
            },
            messaging_profile_id: {
              type: 'string',
              description: 'Messaging profile ID to use for routing (recommended for number pools)',
            },
            subject: {
              type: 'string',
              description: 'MMS subject line (only for MMS messages)',
            },
            media_urls: {
              type: 'array',
              description: 'Array of publicly accessible media URLs for MMS (images, video, audio)',
            },
            webhook_url: {
              type: 'string',
              description: 'URL to receive delivery status webhooks for this message',
            },
          },
          required: ['to', 'text'],
        },
      },
      {
        name: 'list_messages',
        description: 'List messages sent or received through the Telnyx account with optional direction and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Messages per page (default: 20, max: 250)',
            },
          },
        },
      },
      {
        name: 'get_message',
        description: 'Get the status and details of a specific message by its ID including delivery status',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: {
              type: 'string',
              description: 'Telnyx message ID (UUID format)',
            },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'create_call',
        description: 'Initiate an outbound call from a Telnyx phone number to a destination using Call Control',
        inputSchema: {
          type: 'object',
          properties: {
            connection_id: {
              type: 'string',
              description: 'Call Control Application ID (connection) to route the call through',
            },
            to: {
              type: 'string',
              description: 'Destination phone number in E.164 format or SIP URI',
            },
            from: {
              type: 'string',
              description: 'Caller ID — a Telnyx phone number in E.164 format',
            },
            from_display_name: {
              type: 'string',
              description: 'Display name shown to the recipient (CNAM)',
            },
            timeout_secs: {
              type: 'number',
              description: 'Seconds to ring before the call is abandoned (default: 30)',
            },
            client_state: {
              type: 'string',
              description: 'Base64-encoded custom data attached to all webhooks for this call',
            },
          },
          required: ['connection_id', 'to', 'from'],
        },
      },
      {
        name: 'list_calls',
        description: 'List active calls on a Call Control Application with their status and session details',
        inputSchema: {
          type: 'object',
          properties: {
            connection_id: {
              type: 'string',
              description: 'Call Control Application ID to list calls for',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Calls per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_call',
        description: 'Get the status and details of a specific call session by call control ID',
        inputSchema: {
          type: 'object',
          properties: {
            call_control_id: {
              type: 'string',
              description: 'Telnyx call control ID for the call session',
            },
          },
          required: ['call_control_id'],
        },
      },
      {
        name: 'list_messaging_profiles',
        description: 'List messaging profiles — logical groupings of phone numbers for shared routing and webhook settings',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Profiles per page (default: 20)',
            },
            filter_name: {
              type: 'string',
              description: 'Filter profiles by name (partial match)',
            },
          },
        },
      },
      {
        name: 'get_messaging_profile',
        description: 'Get details of a specific messaging profile by ID including webhook URL and number pool settings',
        inputSchema: {
          type: 'object',
          properties: {
            messaging_profile_id: {
              type: 'string',
              description: 'Messaging profile ID to retrieve',
            },
          },
          required: ['messaging_profile_id'],
        },
      },
      {
        name: 'create_messaging_profile',
        description: 'Create a new messaging profile to group phone numbers with shared webhook and routing settings',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the messaging profile',
            },
            webhook_url: {
              type: 'string',
              description: 'HTTPS URL to receive inbound message and delivery status webhooks',
            },
            webhook_failover_url: {
              type: 'string',
              description: 'Fallback URL if the primary webhook URL fails',
            },
            enabled: {
              type: 'boolean',
              description: 'Enable the profile for message routing (default: true)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'lookup_number',
        description: 'Look up carrier and caller information for a phone number using Telnyx Number Lookup',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number: {
              type: 'string',
              description: 'E.164 formatted phone number to look up (e.g. +14155550123)',
            },
            type: {
              type: 'string',
              description: 'Lookup type: caller-name, carrier (default: carrier)',
            },
          },
          required: ['phone_number'],
        },
      },
      {
        name: 'list_number_order_phone_numbers',
        description: 'List phone numbers from a specific number order to check provisioning status',
        inputSchema: {
          type: 'object',
          properties: {
            number_order_id: {
              type: 'string',
              description: 'Number order ID to retrieve phone numbers from',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['number_order_id'],
        },
      },
      {
        name: 'list_connections',
        description: 'List Call Control Application connections (SIP trunks and credential connections) in the account',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Connections per page (default: 20)',
            },
            filter_connection_name_contains: {
              type: 'string',
              description: 'Filter connections by name (partial match)',
            },
          },
        },
      },
      {
        name: 'get_connection',
        description: 'Get details of a specific connection by ID including configuration and associated phone numbers',
        inputSchema: {
          type: 'object',
          properties: {
            connection_id: {
              type: 'string',
              description: 'Connection ID to retrieve',
            },
          },
          required: ['connection_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_phone_numbers': return this.searchPhoneNumbers(args);
        case 'list_phone_numbers': return this.listPhoneNumbers(args);
        case 'get_phone_number': return this.getPhoneNumber(args);
        case 'purchase_phone_number': return this.purchasePhoneNumber(args);
        case 'release_phone_number': return this.releasePhoneNumber(args);
        case 'send_message': return this.sendMessage(args);
        case 'list_messages': return this.listMessages(args);
        case 'get_message': return this.getMessage(args);
        case 'create_call': return this.createCall(args);
        case 'list_calls': return this.listCalls(args);
        case 'get_call': return this.getCall(args);
        case 'list_messaging_profiles': return this.listMessagingProfiles(args);
        case 'get_messaging_profile': return this.getMessagingProfile(args);
        case 'create_messaging_profile': return this.createMessagingProfile(args);
        case 'lookup_number': return this.lookupNumber(args);
        case 'list_number_order_phone_numbers': return this.listNumberOrderPhoneNumbers(args);
        case 'list_connections': return this.listConnections(args);
        case 'get_connection': return this.getConnection(args);
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
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchPhoneNumbers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page[size]': String((args.page_size as number) || 20),
    };
    if (args.filter_country_code) params['filter[country_code]'] = args.filter_country_code as string;
    if (args.filter_npa) params['filter[npa]'] = args.filter_npa as string;
    if (args.filter_number_type) params['filter[number_type]'] = args.filter_number_type as string;
    if (args.filter_phone_number_starts_with) params['filter[phone_number][starts_with]'] = args.filter_phone_number_starts_with as string;
    if (args.filter_phone_number_contains) params['filter[phone_number][contains]'] = args.filter_phone_number_contains as string;
    if (args.filter_features && Array.isArray(args.filter_features)) {
      (args.filter_features as string[]).forEach((f, i) => {
        params[`filter[features][${i}]`] = f;
      });
    }
    return this.apiGet('/available_phone_numbers', params);
  }

  private async listPhoneNumbers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page[number]': String((args.page_number as number) || 1),
      'page[size]': String((args.page_size as number) || 20),
    };
    if (args.filter_status) params['filter[status]'] = args.filter_status as string;
    if (args.filter_connection_id) params['filter[connection_id]'] = args.filter_connection_id as string;
    if (args.filter_tag) params['filter[tag]'] = args.filter_tag as string;
    return this.apiGet('/phone_numbers', params);
  }

  private async getPhoneNumber(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone_number_id) return { content: [{ type: 'text', text: 'phone_number_id is required' }], isError: true };
    return this.apiGet(`/phone_numbers/${args.phone_number_id}`);
  }

  private async purchasePhoneNumber(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone_number) return { content: [{ type: 'text', text: 'phone_number is required' }], isError: true };
    const body: Record<string, unknown> = { phone_numbers: [{ phone_number: args.phone_number }] };
    if (args.connection_id) body.connection_id = args.connection_id;
    if (args.messaging_profile_id) body.messaging_profile_id = args.messaging_profile_id;
    return this.apiPost('/number_orders', body);
  }

  private async releasePhoneNumber(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone_number_id) return { content: [{ type: 'text', text: 'phone_number_id is required' }], isError: true };
    return this.apiDelete(`/phone_numbers/${args.phone_number_id}`);
  }

  private async sendMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.to || !args.text) return { content: [{ type: 'text', text: 'to and text are required' }], isError: true };
    const body: Record<string, unknown> = { to: args.to, text: args.text };
    if (args.from) body.from = args.from;
    if (args.messaging_profile_id) body.messaging_profile_id = args.messaging_profile_id;
    if (args.subject) body.subject = args.subject;
    if (args.media_urls) body.media_urls = args.media_urls;
    if (args.webhook_url) body.webhook_url = args.webhook_url;
    return this.apiPost('/messages', body);
  }

  private async listMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page[number]': String((args.page_number as number) || 1),
      'page[size]': String((args.page_size as number) || 20),
    };
    return this.apiGet('/messages', params);
  }

  private async getMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message_id) return { content: [{ type: 'text', text: 'message_id is required' }], isError: true };
    return this.apiGet(`/messages/${args.message_id}`);
  }

  private async createCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connection_id || !args.to || !args.from) return { content: [{ type: 'text', text: 'connection_id, to, and from are required' }], isError: true };
    const body: Record<string, unknown> = {
      connection_id: args.connection_id,
      to: args.to,
      from: args.from,
    };
    if (args.from_display_name) body.from_display_name = args.from_display_name;
    if (args.timeout_secs) body.timeout_secs = args.timeout_secs;
    if (args.client_state) body.client_state = args.client_state;
    return this.apiPost('/calls', body);
  }

  private async listCalls(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connection_id) return { content: [{ type: 'text', text: 'connection_id is required' }], isError: true };
    const params: Record<string, string> = {
      'page[number]': String((args.page_number as number) || 1),
      'page[size]': String((args.page_size as number) || 20),
    };
    return this.apiGet(`/calls?filter[connection_id]=${args.connection_id}`, params);
  }

  private async getCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.call_control_id) return { content: [{ type: 'text', text: 'call_control_id is required' }], isError: true };
    return this.apiGet(`/calls/${args.call_control_id}`);
  }

  private async listMessagingProfiles(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page[number]': String((args.page_number as number) || 1),
      'page[size]': String((args.page_size as number) || 20),
    };
    if (args.filter_name) params['filter[name][contains]'] = args.filter_name as string;
    return this.apiGet('/messaging_profiles', params);
  }

  private async getMessagingProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.messaging_profile_id) return { content: [{ type: 'text', text: 'messaging_profile_id is required' }], isError: true };
    return this.apiGet(`/messaging_profiles/${args.messaging_profile_id}`);
  }

  private async createMessagingProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.webhook_url) body.webhook_url = args.webhook_url;
    if (args.webhook_failover_url) body.webhook_failover_url = args.webhook_failover_url;
    if (typeof args.enabled === 'boolean') body.enabled = args.enabled;
    return this.apiPost('/messaging_profiles', body);
  }

  private async lookupNumber(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone_number) return { content: [{ type: 'text', text: 'phone_number is required' }], isError: true };
    const type = (args.type as string) || 'carrier';
    return this.apiGet(`/number_lookup/${encodeURIComponent(args.phone_number as string)}`, { type });
  }

  private async listNumberOrderPhoneNumbers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.number_order_id) return { content: [{ type: 'text', text: 'number_order_id is required' }], isError: true };
    const params: Record<string, string> = {
      'page[number]': String((args.page_number as number) || 1),
    };
    return this.apiGet(`/number_orders/${args.number_order_id}/phone_numbers`, params);
  }

  private async listConnections(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page[number]': String((args.page_number as number) || 1),
      'page[size]': String((args.page_size as number) || 20),
    };
    if (args.filter_connection_name_contains) params['filter[connection_name][contains]'] = args.filter_connection_name_contains as string;
    return this.apiGet('/connections', params);
  }

  private async getConnection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connection_id) return { content: [{ type: 'text', text: 'connection_id is required' }], isError: true };
    return this.apiGet(`/connections/${args.connection_id}`);
  }
}
