/** Mimecast MCP Adapter / Built on the Epic AI® Intelligence Platform / Copyright 2026 protectNIL Inc. Apache-2.0 */

import { ToolDefinition, ToolResult } from './types.js';

interface MimecastAuthConfig {
  clientId: string;
  clientSecret: string;
}

const MIMECAST_BASE_URL = 'https://api.mimecast.com';
const MIMECAST_TOKEN_URL = 'https://api.mimecast.com/oauth/token';

export class MimecastMCPServer {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: MimecastAuthConfig) {
    this.baseUrl = MIMECAST_BASE_URL;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  private async ensureToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiry > now) {
      return this.accessToken;
    }

    const response = await fetch(MIMECAST_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Mimecast auth failed: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.accessToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in * 1000 - 60000);
    return this.accessToken;
  }

  private async request(
    endpoint: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<unknown> {
    const token = await this.ensureToken();
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `Mimecast API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_messages',
        description: 'Search messages in the Mimecast account',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'Search query (sender, recipient, subject, or content)',
            },
            from_date: {
              type: 'string',
              description: 'Start date in ISO 8601 format (e.g., 2026-03-01)',
            },
            to_date: {
              type: 'string',
              description: 'End date in ISO 8601 format (e.g., 2026-03-20)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
              default: 100,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_held_messages',
        description: 'Retrieve messages currently held for review',
        inputSchema: {
          type: 'object',
          properties: {
            hold_reason: {
              type: 'string',
              enum: [
                'dlp',
                'malware',
                'archive',
                'awaiting-sandbox-verdict',
              ],
              description: 'Filter by reason for hold',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
              default: 100,
            },
          },
        },
      },
      {
        name: 'list_blocked_senders',
        description: 'List blocked senders and domains',
        inputSchema: {
          type: 'object',
          properties: {
            policy_type: {
              type: 'string',
              enum: ['internal', 'external'],
              description: 'Filter by policy type',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
              default: 100,
            },
          },
        },
      },
      {
        name: 'get_threat_intel',
        description:
          'Retrieve threat intelligence data for a specific indicator',
        inputSchema: {
          type: 'object',
          properties: {
            indicator: {
              type: 'string',
              description: 'Indicator value (IP, domain, hash, URL)',
            },
            indicator_type: {
              type: 'string',
              enum: ['ip', 'domain', 'hash', 'url'],
              description: 'Type of indicator',
            },
          },
          required: ['indicator', 'indicator_type'],
        },
      },
      {
        name: 'list_policies',
        description: 'List email security policies configured in Mimecast',
        inputSchema: {
          type: 'object',
          properties: {
            policy_type: {
              type: 'string',
              enum: [
                'anti-malware',
                'anti-spam',
                'dlp',
                'impersonation',
                'url-rewrite',
              ],
              description: 'Filter by policy type',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
              default: 100,
            },
          },
        },
      },
    ];
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    try {
      let result: unknown;

      switch (name) {
        case 'search_messages':
          {
            const payload = {
              query: args.query,
              from: args.from_date,
              to: args.to_date,
              limit: args.limit || 100,
            };
            result = await this.request('/api/message-finder/search', 'POST', payload);
          }
          break;

        case 'get_held_messages':
          {
            const payload = {
              reason: args.hold_reason,
              limit: args.limit || 100,
            };
            result = await this.request(
              '/api/gateway/get-hold-message-list',
              'POST',
              payload
            );
          }
          break;

        case 'list_blocked_senders':
          {
            const payload: Record<string, unknown> = {
              pageSize: args.limit || 100,
            };
            if (args.policy_type) payload.policyType = args.policy_type;
            result = await this.request('/api/policy/blockedsenders/get-policy', 'POST', payload);
          }
          break;

        case 'get_threat_intel':
          {
            const payload = {
              indicator: args.indicator,
              type: args.indicator_type,
            };
            result = await this.request(
              '/api/ttp/threat-intel/get-feed',
              'POST',
              payload
            );
          }
          break;

        case 'list_policies':
          {
            const payload: Record<string, unknown> = {
              pageSize: args.limit || 100,
            };
            if (args.policy_type) payload.policyType = args.policy_type;
            result = await this.request('/api/policy/get-policy', 'POST', payload);
          }
          break;

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error calling ${name}: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
}
