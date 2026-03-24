/**
 * Mailchimp MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found (multiple community adapters exist, none official from Intuit/Mailchimp)

// Auth: HTTP Basic Authentication with API key as the password (any string as username).
//   Authorization: Basic base64("anystring:{apiKey}")
//   OAuth2 Bearer token also supported.
// Base URL is datacenter-specific: https://{dc}.api.mailchimp.com/3.0
//   The datacenter (dc) is the suffix of the API key after the dash, e.g. key "...abc-us6" → dc = us6.
//   Pass the full base URL via config.baseUrl, or pass config.dc and it will be constructed automatically.
// Source: https://mailchimp.com/developer/marketing/docs/fundamentals/
//         https://mailchimp.com/developer/marketing/api/

import { ToolDefinition, ToolResult } from './types.js';

interface MailchimpConfig {
  apiKey: string;
  dc?: string;
  baseUrl?: string;
}

export class MailchimpMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: MailchimpConfig) {
    this.apiKey = config.apiKey;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl.replace(/\/$/, '');
    } else if (config.dc) {
      this.baseUrl = `https://${config.dc}.api.mailchimp.com/3.0`;
    } else {
      // Attempt to derive dc from the API key (format: <key>-<dc>)
      const dcMatch = config.apiKey.match(/-([a-z0-9]+)$/);
      if (dcMatch) {
        this.baseUrl = `https://${dcMatch[1]}.api.mailchimp.com/3.0`;
      } else {
        throw new Error('Mailchimp datacenter could not be determined. Provide dc or baseUrl in config.');
      }
    }
  }

  private get authHeader(): string {
    return 'Basic ' + Buffer.from(`anystring:${this.apiKey}`).toString('base64');
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_audiences',
        description: 'List all Mailchimp audiences (lists) in the account',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of records to return (max 1000, default 10)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
          },
        },
      },
      {
        name: 'get_audience',
        description: 'Get information about a specific Mailchimp audience (list)',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'string',
              description: 'The unique ID for the Mailchimp audience',
            },
          },
          required: ['list_id'],
        },
      },
      {
        name: 'list_members',
        description: 'List members (subscribers) in a Mailchimp audience',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'string',
              description: 'The unique ID for the Mailchimp audience',
            },
            status: {
              type: 'string',
              description: 'Filter by subscription status: subscribed, unsubscribed, cleaned, pending, transactional',
            },
            count: {
              type: 'number',
              description: 'Number of members to return (max 1000, default 10)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
          },
          required: ['list_id'],
        },
      },
      {
        name: 'add_or_update_member',
        description: 'Add a new member or update an existing member in a Mailchimp audience (upsert by email)',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'string',
              description: 'The unique ID for the Mailchimp audience',
            },
            email_address: {
              type: 'string',
              description: 'Email address of the member',
            },
            status: {
              type: 'string',
              description: 'Subscription status: subscribed, unsubscribed, cleaned, pending (use subscribed to opt-in)',
            },
            merge_fields: {
              type: 'object',
              description: 'Merge fields object, e.g. { "FNAME": "Jane", "LNAME": "Doe" }',
            },
            tags: {
              type: 'array',
              description: 'Array of tag names to assign to the member',
            },
          },
          required: ['list_id', 'email_address', 'status'],
        },
      },
      {
        name: 'list_campaigns',
        description: 'List email campaigns in the Mailchimp account',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of campaigns to return (max 1000, default 10)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
            status: {
              type: 'string',
              description: 'Filter by campaign status: save, paused, schedule, sending, sent',
            },
            type: {
              type: 'string',
              description: 'Filter by campaign type: regular, plaintext, absplit, rss, variate',
            },
          },
        },
      },
      {
        name: 'get_campaign',
        description: 'Retrieve details for a single Mailchimp campaign',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'The unique ID for the Mailchimp campaign',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'create_campaign',
        description: 'Create a new email campaign in Mailchimp',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Campaign type: regular, plaintext, absplit, rss, variate',
            },
            list_id: {
              type: 'string',
              description: 'Audience (list) ID to send the campaign to',
            },
            subject_line: {
              type: 'string',
              description: 'Email subject line',
            },
            from_name: {
              type: 'string',
              description: 'Sender display name',
            },
            reply_to: {
              type: 'string',
              description: 'Reply-to email address',
            },
            preview_text: {
              type: 'string',
              description: 'Preview text shown in email clients',
            },
          },
          required: ['type', 'list_id', 'subject_line', 'from_name', 'reply_to'],
        },
      },
      {
        name: 'send_campaign',
        description: 'Send a Mailchimp campaign that is ready to send',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'The unique ID for the campaign to send',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'get_campaign_report',
        description: 'Retrieve send performance report for a campaign',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'The unique ID for the campaign',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'list_templates',
        description: 'List email templates available in the account',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of templates to return (max 1000, default 10)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
            type: {
              type: 'string',
              description: 'Template type: user, base, gallery',
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
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_audiences': {
          const params = new URLSearchParams();
          if (args.count !== undefined) params.set('count', String(args.count));
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          let url = `${this.baseUrl}/lists`;
          if (params.toString()) url += `?${params.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list audiences: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mailchimp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_audience': {
          const listId = args.list_id as string;
          if (!listId) {
            return { content: [{ type: 'text', text: 'list_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/lists/${encodeURIComponent(listId)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get audience: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mailchimp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_members': {
          const listId = args.list_id as string;
          if (!listId) {
            return { content: [{ type: 'text', text: 'list_id is required' }], isError: true };
          }
          const params = new URLSearchParams();
          if (args.status) params.set('status', args.status as string);
          if (args.count !== undefined) params.set('count', String(args.count));
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          let url = `${this.baseUrl}/lists/${encodeURIComponent(listId)}/members`;
          if (params.toString()) url += `?${params.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list members: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mailchimp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'add_or_update_member': {
          const listId = args.list_id as string;
          const emailAddress = args.email_address as string;
          const status = args.status as string;
          if (!listId || !emailAddress || !status) {
            return { content: [{ type: 'text', text: 'list_id, email_address, and status are required' }], isError: true };
          }
          // Mailchimp uses an MD5 hash of the lowercase email as the subscriber hash for PUT upserts
          const subscriberHash = await this.md5(emailAddress.toLowerCase());
          const body: Record<string, unknown> = { email_address: emailAddress, status_if_new: status, status };
          if (args.merge_fields) body.merge_fields = args.merge_fields;
          if (args.tags && Array.isArray(args.tags)) body.tags = (args.tags as string[]).map((t: string) => ({ name: t, status: 'active' }));

          const response = await fetch(`${this.baseUrl}/lists/${encodeURIComponent(listId)}/members/${subscriberHash}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to add/update member: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mailchimp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_campaigns': {
          const params = new URLSearchParams();
          if (args.count !== undefined) params.set('count', String(args.count));
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          if (args.status) params.set('status', args.status as string);
          if (args.type) params.set('type', args.type as string);
          let url = `${this.baseUrl}/campaigns`;
          if (params.toString()) url += `?${params.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list campaigns: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mailchimp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_campaign': {
          const campaignId = args.campaign_id as string;
          if (!campaignId) {
            return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/campaigns/${encodeURIComponent(campaignId)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get campaign: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mailchimp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_campaign': {
          const type = args.type as string;
          const listId = args.list_id as string;
          const subjectLine = args.subject_line as string;
          const fromName = args.from_name as string;
          const replyTo = args.reply_to as string;
          if (!type || !listId || !subjectLine || !fromName || !replyTo) {
            return { content: [{ type: 'text', text: 'type, list_id, subject_line, from_name, and reply_to are required' }], isError: true };
          }
          const settings: Record<string, unknown> = { subject_line: subjectLine, from_name: fromName, reply_to: replyTo };
          if (args.preview_text) settings.preview_text = args.preview_text;

          const response = await fetch(`${this.baseUrl}/campaigns`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ type, recipients: { list_id: listId }, settings }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create campaign: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mailchimp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'send_campaign': {
          const campaignId = args.campaign_id as string;
          if (!campaignId) {
            return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/campaigns/${encodeURIComponent(campaignId)}/actions/send`, {
            method: 'POST',
            headers,
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to send campaign: ${response.status} ${response.statusText}` }], isError: true };
          }
          // Mailchimp returns 204 No Content on successful send
          return { content: [{ type: 'text', text: `Campaign ${campaignId} sent successfully` }], isError: false };
        }

        case 'get_campaign_report': {
          const campaignId = args.campaign_id as string;
          if (!campaignId) {
            return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/reports/${encodeURIComponent(campaignId)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get campaign report: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mailchimp returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_templates': {
          const params = new URLSearchParams();
          if (args.count !== undefined) params.set('count', String(args.count));
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          if (args.type) params.set('type', args.type as string);
          let url = `${this.baseUrl}/templates`;
          if (params.toString()) url += `?${params.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list templates: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mailchimp returned non-JSON response (HTTP ${response.status})`); }
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

  // MD5 helper for subscriber hash — Mailchimp requires MD5(lowercase email) as the member resource key
  private async md5(input: string): Promise<string> {
    const { createHash } = await import('crypto');
    return createHash('md5').update(input).digest('hex');
  }
}
