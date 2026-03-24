/**
 * HubSpot Marketing Hub MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/hubspot/mcp-server — transport: stdio + streamable-HTTP, auth: Private App token
// The official HubSpot MCP server (in public beta as of 2026-03) covers the full HubSpot API surface (60+ tools).
// Our adapter focuses on Marketing Hub specifically: campaigns, emails, forms, contact lists,
// subscriptions, and marketing events. Complements hubspot.ts (CRM adapter) which covers contacts/deals/companies.
// Recommendation: Use vendor MCP for full coverage. Use this adapter for Marketing Hub in air-gapped deployments.
//
// Base URL: https://api.hubapi.com
// Auth: Bearer token (HubSpot Private App access token — does not expire, can be revoked)
//   Set Authorization: Bearer {token} on all requests.
// Docs: https://developers.hubspot.com/docs/api-reference/marketing-campaigns-public-api-v3/guide
// Rate limits: 100 req/10 sec per token (Private App); burst up to 150 req/10 sec

import { ToolDefinition, ToolResult } from './types.js';

interface HubSpotMarketingConfig {
  privateAppToken: string;
  baseUrl?: string;
}

export class HubSpotMarketingMCPServer {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: HubSpotMarketingConfig) {
    this.token = config.privateAppToken;
    this.baseUrl = config.baseUrl ?? 'https://api.hubapi.com';
  }

  static catalog() {
    return {
      name: 'hubspot-marketing',
      displayName: 'HubSpot Marketing Hub',
      version: '1.0.0',
      category: 'crm' as const,
      keywords: [
        'hubspot', 'marketing', 'campaign', 'email', 'marketing email', 'form',
        'contact list', 'list', 'subscription', 'marketing event', 'lead',
        'nurture', 'automation', 'newsletter', 'open rate', 'click rate',
      ],
      toolNames: [
        'list_campaigns',
        'get_campaign',
        'create_campaign',
        'update_campaign',
        'list_marketing_emails',
        'get_marketing_email',
        'send_marketing_email',
        'get_email_statistics',
        'list_forms',
        'get_form',
        'list_contact_lists',
        'get_contact_list',
        'create_contact_list',
        'add_contacts_to_list',
        'remove_contacts_from_list',
        'get_subscription_types',
        'get_contact_subscription_status',
        'update_contact_subscription',
        'list_marketing_events',
        'create_marketing_event',
      ],
      description: 'HubSpot Marketing Hub: manage campaigns, marketing emails, forms, contact lists, subscriptions, and marketing events.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_campaigns',
        description: 'List HubSpot marketing campaigns with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of campaigns to return (default: 20, max: 100)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response paging.next.after field',
            },
          },
        },
      },
      {
        name: 'get_campaign',
        description: 'Get full details for a specific HubSpot marketing campaign including associated assets and budget',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Unique identifier of the marketing campaign',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'create_campaign',
        description: 'Create a new HubSpot marketing campaign with name, start date, and optional budget',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the campaign',
            },
            startDate: {
              type: 'string',
              description: 'Campaign start date in ISO 8601 format (e.g. 2026-04-01)',
            },
            endDate: {
              type: 'string',
              description: 'Campaign end date in ISO 8601 format (e.g. 2026-06-30)',
            },
            notes: {
              type: 'string',
              description: 'Internal notes or description for the campaign',
            },
            goal: {
              type: 'string',
              description: 'Campaign goal text (e.g. "Generate 500 leads")',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_campaign',
        description: 'Update an existing HubSpot marketing campaign name, dates, or notes',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Unique identifier of the campaign to update',
            },
            name: {
              type: 'string',
              description: 'New display name for the campaign',
            },
            startDate: {
              type: 'string',
              description: 'New start date in ISO 8601 format',
            },
            endDate: {
              type: 'string',
              description: 'New end date in ISO 8601 format',
            },
            notes: {
              type: 'string',
              description: 'Updated internal notes',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'list_marketing_emails',
        description: 'List marketing emails in HubSpot with optional status, campaign, and type filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of emails to return (default: 20, max: 300)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: DRAFT, SCHEDULED, PROCESSING, SENT, CANCELED, ERROR',
            },
            campaignName: {
              type: 'string',
              description: 'Filter by associated campaign name',
            },
          },
        },
      },
      {
        name: 'get_marketing_email',
        description: 'Get full details for a specific HubSpot marketing email including content, subject, and send settings',
        inputSchema: {
          type: 'object',
          properties: {
            email_id: {
              type: 'number',
              description: 'Numeric ID of the marketing email',
            },
          },
          required: ['email_id'],
        },
      },
      {
        name: 'send_marketing_email',
        description: 'Schedule or immediately send a HubSpot marketing email to a contact list',
        inputSchema: {
          type: 'object',
          properties: {
            email_id: {
              type: 'number',
              description: 'Numeric ID of the marketing email to send',
            },
            scheduledAt: {
              type: 'string',
              description: 'ISO 8601 datetime to schedule the send (send immediately if omitted)',
            },
          },
          required: ['email_id'],
        },
      },
      {
        name: 'get_email_statistics',
        description: 'Get performance statistics for a sent HubSpot marketing email: opens, clicks, bounces, unsubscribes',
        inputSchema: {
          type: 'object',
          properties: {
            email_id: {
              type: 'number',
              description: 'Numeric ID of the sent marketing email',
            },
          },
          required: ['email_id'],
        },
      },
      {
        name: 'list_forms',
        description: 'List HubSpot forms with optional pagination — returns form names, IDs, and field counts',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of forms to return (default: 20, max: 100)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            formTypes: {
              type: 'string',
              description: 'Comma-separated form types to include: hubspot, embedded, popup, collected_forms (default: all)',
            },
          },
        },
      },
      {
        name: 'get_form',
        description: 'Get full configuration of a specific HubSpot form including all fields and submission settings',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: {
              type: 'string',
              description: 'GUID of the HubSpot form',
            },
          },
          required: ['form_id'],
        },
      },
      {
        name: 'list_contact_lists',
        description: 'List HubSpot contact lists (static and active/smart lists) with optional name search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Maximum number of lists to return (default: 20, max: 250)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            query: {
              type: 'string',
              description: 'Search string to filter lists by name',
            },
          },
        },
      },
      {
        name: 'get_contact_list',
        description: 'Get details for a specific HubSpot contact list including member count and filter criteria',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'number',
              description: 'Numeric ID of the contact list',
            },
          },
          required: ['list_id'],
        },
      },
      {
        name: 'create_contact_list',
        description: 'Create a new static or active HubSpot contact list',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the contact list',
            },
            dynamic: {
              type: 'boolean',
              description: 'True = active/smart list with filter criteria; false = static list (default: false)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'add_contacts_to_list',
        description: 'Add contacts to a static HubSpot contact list by contact IDs or email addresses',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'number',
              description: 'Numeric ID of the static contact list',
            },
            vids: {
              type: 'array',
              description: 'Array of numeric HubSpot contact IDs (vids) to add to the list',
            },
            emails: {
              type: 'array',
              description: 'Array of email addresses to add to the list (resolves to contact vids)',
            },
          },
          required: ['list_id'],
        },
      },
      {
        name: 'remove_contacts_from_list',
        description: 'Remove contacts from a static HubSpot contact list by contact IDs',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'number',
              description: 'Numeric ID of the static contact list',
            },
            vids: {
              type: 'array',
              description: 'Array of numeric HubSpot contact IDs to remove from the list',
            },
          },
          required: ['list_id', 'vids'],
        },
      },
      {
        name: 'get_subscription_types',
        description: 'List all email subscription types defined in the HubSpot portal for subscription preference management',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_contact_subscription_status',
        description: 'Get the email subscription status for a contact by email address across all subscription types',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address of the contact to check subscription status for',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'update_contact_subscription',
        description: 'Subscribe or unsubscribe a contact from a specific HubSpot email subscription type',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address of the contact',
            },
            subscription_id: {
              type: 'number',
              description: 'Numeric ID of the subscription type to update',
            },
            subscribed: {
              type: 'boolean',
              description: 'True to subscribe the contact, false to unsubscribe',
            },
            legal_basis: {
              type: 'string',
              description: 'GDPR legal basis for the change: LEGITIMATE_INTEREST_PQL, PERFORMANCE_OF_CONTRACT, CONSENT_WITH_NOTICE, NON_GDPR (default: NON_GDPR)',
            },
          },
          required: ['email', 'subscription_id', 'subscribed'],
        },
      },
      {
        name: 'list_marketing_events',
        description: 'List HubSpot marketing events (webinars, conferences, etc.) with optional app and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 20, max: 100)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'create_marketing_event',
        description: 'Create a HubSpot marketing event to track attendance and engagement for webinars and conferences',
        inputSchema: {
          type: 'object',
          properties: {
            eventName: {
              type: 'string',
              description: 'Display name for the marketing event',
            },
            startDateTime: {
              type: 'string',
              description: 'Event start time in ISO 8601 format (e.g. 2026-05-15T14:00:00Z)',
            },
            endDateTime: {
              type: 'string',
              description: 'Event end time in ISO 8601 format',
            },
            externalEventId: {
              type: 'string',
              description: 'Unique ID from the external event platform (e.g. Zoom webinar ID)',
            },
            eventOrganizer: {
              type: 'string',
              description: 'Name of the event organizer or company',
            },
            eventUrl: {
              type: 'string',
              description: 'Public URL for the event registration or landing page',
            },
            eventType: {
              type: 'string',
              description: 'Type of event: WEBINAR, CONFERENCE, WORKSHOP, VIRTUAL_CONFERENCE (default: WEBINAR)',
            },
          },
          required: ['eventName', 'startDateTime', 'endDateTime', 'externalEventId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_campaigns': return this.listCampaigns(args);
        case 'get_campaign': return this.getCampaign(args);
        case 'create_campaign': return this.createCampaign(args);
        case 'update_campaign': return this.updateCampaign(args);
        case 'list_marketing_emails': return this.listMarketingEmails(args);
        case 'get_marketing_email': return this.getMarketingEmail(args);
        case 'send_marketing_email': return this.sendMarketingEmail(args);
        case 'get_email_statistics': return this.getEmailStatistics(args);
        case 'list_forms': return this.listForms(args);
        case 'get_form': return this.getForm(args);
        case 'list_contact_lists': return this.listContactLists(args);
        case 'get_contact_list': return this.getContactList(args);
        case 'create_contact_list': return this.createContactList(args);
        case 'add_contacts_to_list': return this.addContactsToList(args);
        case 'remove_contacts_from_list': return this.removeContactsFromList(args);
        case 'get_subscription_types': return this.getSubscriptionTypes();
        case 'get_contact_subscription_status': return this.getContactSubscriptionStatus(args);
        case 'update_contact_subscription': return this.updateContactSubscription(args);
        case 'list_marketing_events': return this.listMarketingEvents(args);
        case 'create_marketing_event': return this.createMarketingEvent(args);
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
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async apiGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await fetch(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
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

  private async apiPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }


  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 20) };
    if (args.after) params.after = args.after as string;
    return this.apiGet('/marketing/v3/campaigns', params);
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.apiGet(`/marketing/v3/campaigns/${args.campaign_id}`);
  }

  private async createCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.startDate) body.startDate = args.startDate;
    if (args.endDate) body.endDate = args.endDate;
    if (args.notes) body.notes = args.notes;
    if (args.goal) body.goal = args.goal;
    return this.apiPost('/marketing/v3/campaigns', body);
  }

  private async updateCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.startDate) body.startDate = args.startDate;
    if (args.endDate) body.endDate = args.endDate;
    if (args.notes) body.notes = args.notes;
    return this.apiPatch(`/marketing/v3/campaigns/${args.campaign_id}`, body);
  }

  private async listMarketingEmails(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      count: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.status) params.status = args.status as string;
    if (args.campaignName) params.campaignName = args.campaignName as string;
    return this.apiGet('/marketing-emails/v1/emails', params);
  }

  private async getMarketingEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email_id) return { content: [{ type: 'text', text: 'email_id is required' }], isError: true };
    return this.apiGet(`/marketing-emails/v1/emails/${args.email_id}`);
  }

  private async sendMarketingEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email_id) return { content: [{ type: 'text', text: 'email_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.scheduledAt) body.scheduledAt = args.scheduledAt;
    return this.apiPost(`/marketing-emails/v1/emails/${args.email_id}/send-test`, body);
  }

  private async getEmailStatistics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email_id) return { content: [{ type: 'text', text: 'email_id is required' }], isError: true };
    return this.apiGet(`/marketing-emails/v1/emails/${args.email_id}/statistics`);
  }

  private async listForms(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 20) };
    if (args.after) params.after = args.after as string;
    if (args.formTypes) params.formTypes = args.formTypes as string;
    return this.apiGet('/marketing/v3/forms', params);
  }

  private async getForm(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.form_id) return { content: [{ type: 'text', text: 'form_id is required' }], isError: true };
    return this.apiGet(`/marketing/v3/forms/${args.form_id}`);
  }

  private async listContactLists(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      count: String((args.count as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.query) params.query = args.query as string;
    return this.apiGet('/contacts/v1/lists', params);
  }

  private async getContactList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id) return { content: [{ type: 'text', text: 'list_id is required' }], isError: true };
    return this.apiGet(`/contacts/v1/lists/${args.list_id}`);
  }

  private async createContactList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      dynamic: args.dynamic ?? false,
    };
    return this.apiPost('/contacts/v1/lists', body);
  }

  private async addContactsToList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id) return { content: [{ type: 'text', text: 'list_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.vids) body.vids = args.vids;
    if (args.emails) body.emails = args.emails;
    if (!args.vids && !args.emails) {
      return { content: [{ type: 'text', text: 'At least one of vids or emails is required' }], isError: true };
    }
    return this.apiPost(`/contacts/v1/lists/${args.list_id}/add`, body);
  }

  private async removeContactsFromList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id || !args.vids) {
      return { content: [{ type: 'text', text: 'list_id and vids are required' }], isError: true };
    }
    return this.apiPost(`/contacts/v1/lists/${args.list_id}/remove`, { vids: args.vids });
  }

  private async getSubscriptionTypes(): Promise<ToolResult> {
    return this.apiGet('/communication-preferences/v3/definitions');
  }

  private async getContactSubscriptionStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    return this.apiGet(`/communication-preferences/v3/status/email/${encodeURIComponent(args.email as string)}`);
  }

  private async updateContactSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || args.subscription_id === undefined || args.subscribed === undefined) {
      return { content: [{ type: 'text', text: 'email, subscription_id, and subscribed are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      emailAddress: args.email,
      subscriptionId: String(args.subscription_id),
      legalBasis: args.legal_basis ?? 'NON_GDPR',
      legalBasisExplanation: 'Updated via API',
    };
    const action = args.subscribed ? 'subscribe' : 'unsubscribe';
    return this.apiPost(`/communication-preferences/v3/${action}`, body);
  }

  private async listMarketingEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 20) };
    if (args.after) params.after = args.after as string;
    return this.apiGet('/marketing/v3/marketing-events', params);
  }

  private async createMarketingEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.eventName || !args.startDateTime || !args.endDateTime || !args.externalEventId) {
      return { content: [{ type: 'text', text: 'eventName, startDateTime, endDateTime, and externalEventId are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      eventName: args.eventName,
      startDateTime: args.startDateTime,
      endDateTime: args.endDateTime,
      externalEventId: String(args.externalEventId),
      eventType: args.eventType ?? 'WEBINAR',
    };
    if (args.eventOrganizer) body.eventOrganizer = args.eventOrganizer;
    if (args.eventUrl) body.eventUrl = args.eventUrl;
    return this.apiPost('/marketing/v3/marketing-events', body);
  }
}
