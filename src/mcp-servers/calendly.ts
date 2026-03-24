/**
 * Calendly MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official Calendly MCP server was found on GitHub. Community implementations exist
// (universal-mcp/calendly, meAmitPatil/calendly-mcp-server) but are not maintained by Calendly Inc.
//
// Base URL: https://api.calendly.com
// Auth: Bearer token (Personal Access Token or OAuth2 access token)
// Docs: https://developer.calendly.com/api-docs
// Rate limits: Not officially documented; practical limit observed at ~100 req/min per token.
// Note: Many endpoints require a "current_user" URI (format: https://api.calendly.com/users/{uuid}).
//       Use get_current_user first to obtain the user URI for scoping queries.

import { ToolDefinition, ToolResult } from './types.js';

interface CalendlyConfig {
  accessToken: string;
  baseUrl?: string;
}

export class CalendlyMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: CalendlyConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.calendly.com';
  }

  static catalog() {
    return {
      name: 'calendly',
      displayName: 'Calendly',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'calendly', 'scheduling', 'appointments', 'meetings', 'calendar', 'booking',
        'event type', 'invitee', 'availability', 'webhook', 'organization',
        'one-on-one', 'group', 'time slot',
      ],
      toolNames: [
        'get_current_user', 'get_user',
        'list_event_types', 'get_event_type', 'get_event_type_availability',
        'list_scheduled_events', 'get_scheduled_event',
        'cancel_event',
        'list_event_invitees', 'get_event_invitee',
        'list_organization_memberships', 'get_organization_membership',
        'remove_organization_membership',
        'list_organization_invitations', 'send_organization_invitation', 'revoke_organization_invitation',
        'list_webhook_subscriptions', 'create_webhook_subscription', 'delete_webhook_subscription',
        'list_routing_forms', 'get_routing_form', 'list_routing_form_submissions',
      ],
      description: 'Calendly scheduling automation: manage event types, list and cancel scheduled meetings, access invitees, control organization memberships, and configure webhooks.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_current_user',
        description: 'Get the authenticated Calendly user profile including URI, name, email, timezone, and organization',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_user',
        description: 'Get a specific Calendly user profile by their user UUID',
        inputSchema: {
          type: 'object',
          properties: {
            user_uuid: {
              type: 'string',
              description: 'The Calendly user UUID (not the full URI — just the UUID portion)',
            },
          },
          required: ['user_uuid'],
        },
      },
      {
        name: 'list_event_types',
        description: 'List event types (meeting types) for a user or organization, with optional active/inactive filter',
        inputSchema: {
          type: 'object',
          properties: {
            user_uri: {
              type: 'string',
              description: 'Full Calendly user URI (e.g. https://api.calendly.com/users/abc123). Use get_current_user to obtain.',
            },
            organization_uri: {
              type: 'string',
              description: 'Organization URI to list event types for (use instead of user_uri for org-wide listing)',
            },
            active: {
              type: 'boolean',
              description: 'If true, return only active event types; if false, return only inactive (optional — omit for all)',
            },
            count: {
              type: 'number',
              description: 'Number of results to return (default: 20, max: 100)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response (optional)',
            },
          },
        },
      },
      {
        name: 'get_event_type',
        description: 'Get full details of a specific Calendly event type by its UUID',
        inputSchema: {
          type: 'object',
          properties: {
            event_type_uuid: {
              type: 'string',
              description: 'The event type UUID',
            },
          },
          required: ['event_type_uuid'],
        },
      },
      {
        name: 'get_event_type_availability',
        description: 'Get available time slots for a Calendly event type within a specified date range',
        inputSchema: {
          type: 'object',
          properties: {
            event_type_uri: {
              type: 'string',
              description: 'Full event type URI (e.g. https://api.calendly.com/event_types/abc123)',
            },
            start_time: {
              type: 'string',
              description: 'Start of the availability window in ISO 8601 UTC (e.g. 2026-04-01T00:00:00.000000Z)',
            },
            end_time: {
              type: 'string',
              description: 'End of the availability window in ISO 8601 UTC (e.g. 2026-04-07T23:59:59.000000Z)',
            },
          },
          required: ['event_type_uri', 'start_time', 'end_time'],
        },
      },
      {
        name: 'list_scheduled_events',
        description: 'List scheduled (booked) events for a user or organization, with filters for status and date range',
        inputSchema: {
          type: 'object',
          properties: {
            user_uri: {
              type: 'string',
              description: 'Calendly user URI to scope results (use get_current_user to obtain)',
            },
            organization_uri: {
              type: 'string',
              description: 'Organization URI to list events across all members (use instead of user_uri for org-wide)',
            },
            status: {
              type: 'string',
              description: 'Filter by event status: active or canceled (default: active)',
            },
            min_start_time: {
              type: 'string',
              description: 'ISO 8601 UTC datetime — only return events starting at or after this time',
            },
            max_start_time: {
              type: 'string',
              description: 'ISO 8601 UTC datetime — only return events starting before or at this time',
            },
            count: {
              type: 'number',
              description: 'Number of results to return (default: 20, max: 100)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            sort: {
              type: 'string',
              description: 'Sort order: start_time:asc or start_time:desc (default: start_time:asc)',
            },
          },
        },
      },
      {
        name: 'get_scheduled_event',
        description: 'Get full details of a specific scheduled Calendly event by its UUID',
        inputSchema: {
          type: 'object',
          properties: {
            event_uuid: {
              type: 'string',
              description: 'The scheduled event UUID',
            },
          },
          required: ['event_uuid'],
        },
      },
      {
        name: 'cancel_event',
        description: 'Cancel a scheduled Calendly event with an optional cancellation reason',
        inputSchema: {
          type: 'object',
          properties: {
            event_uuid: {
              type: 'string',
              description: 'The scheduled event UUID to cancel',
            },
            reason: {
              type: 'string',
              description: 'Reason for cancellation (sent to invitees, optional)',
            },
          },
          required: ['event_uuid'],
        },
      },
      {
        name: 'list_event_invitees',
        description: 'List all invitees (attendees) for a specific scheduled Calendly event',
        inputSchema: {
          type: 'object',
          properties: {
            event_uuid: {
              type: 'string',
              description: 'The scheduled event UUID',
            },
            status: {
              type: 'string',
              description: 'Filter by invitee status: active or canceled (default: all)',
            },
            count: {
              type: 'number',
              description: 'Number of results to return (default: 20, max: 100)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['event_uuid'],
        },
      },
      {
        name: 'get_event_invitee',
        description: 'Get details of a specific invitee on a scheduled Calendly event by event UUID and invitee UUID',
        inputSchema: {
          type: 'object',
          properties: {
            event_uuid: {
              type: 'string',
              description: 'The scheduled event UUID',
            },
            invitee_uuid: {
              type: 'string',
              description: 'The invitee UUID',
            },
          },
          required: ['event_uuid', 'invitee_uuid'],
        },
      },
      {
        name: 'list_organization_memberships',
        description: 'List all members of a Calendly organization with their roles and status',
        inputSchema: {
          type: 'object',
          properties: {
            organization_uri: {
              type: 'string',
              description: 'Organization URI (from get_current_user response)',
            },
            count: {
              type: 'number',
              description: 'Number of results to return (default: 20, max: 100)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            email: {
              type: 'string',
              description: 'Filter memberships by email address (optional)',
            },
          },
          required: ['organization_uri'],
        },
      },
      {
        name: 'get_organization_membership',
        description: 'Get details of a specific organization membership by membership UUID',
        inputSchema: {
          type: 'object',
          properties: {
            membership_uuid: {
              type: 'string',
              description: 'The organization membership UUID',
            },
          },
          required: ['membership_uuid'],
        },
      },
      {
        name: 'remove_organization_membership',
        description: 'Remove a member from a Calendly organization by membership UUID',
        inputSchema: {
          type: 'object',
          properties: {
            membership_uuid: {
              type: 'string',
              description: 'The organization membership UUID to remove',
            },
          },
          required: ['membership_uuid'],
        },
      },
      {
        name: 'list_organization_invitations',
        description: 'List pending and accepted invitations sent to join a Calendly organization',
        inputSchema: {
          type: 'object',
          properties: {
            org_uuid: {
              type: 'string',
              description: 'The organization UUID (extracted from organization URI)',
            },
            status: {
              type: 'string',
              description: 'Filter by invitation status: pending or accepted (optional — omit for all)',
            },
            count: {
              type: 'number',
              description: 'Number of results to return (default: 20, max: 100)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['org_uuid'],
        },
      },
      {
        name: 'send_organization_invitation',
        description: 'Invite a new user to join a Calendly organization by email address',
        inputSchema: {
          type: 'object',
          properties: {
            org_uuid: {
              type: 'string',
              description: 'The organization UUID',
            },
            email: {
              type: 'string',
              description: 'Email address of the person to invite',
            },
            role: {
              type: 'string',
              description: 'Role to assign: user or admin (default: user)',
            },
          },
          required: ['org_uuid', 'email'],
        },
      },
      {
        name: 'revoke_organization_invitation',
        description: 'Revoke (cancel) a pending invitation to join a Calendly organization',
        inputSchema: {
          type: 'object',
          properties: {
            org_uuid: {
              type: 'string',
              description: 'The organization UUID',
            },
            invitation_uuid: {
              type: 'string',
              description: 'The invitation UUID to revoke',
            },
          },
          required: ['org_uuid', 'invitation_uuid'],
        },
      },
      {
        name: 'list_webhook_subscriptions',
        description: 'List webhook subscriptions for a user or organization, showing event triggers and callback URLs',
        inputSchema: {
          type: 'object',
          properties: {
            organization_uri: {
              type: 'string',
              description: 'Organization URI to scope the listing',
            },
            user_uri: {
              type: 'string',
              description: 'User URI for user-scoped webhook listing (optional — use with organization_uri)',
            },
            scope: {
              type: 'string',
              description: 'Webhook scope: user or organization (required)',
            },
            count: {
              type: 'number',
              description: 'Number of results to return (default: 20, max: 100)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['organization_uri', 'scope'],
        },
      },
      {
        name: 'create_webhook_subscription',
        description: 'Create a Calendly webhook subscription to receive event notifications at a callback URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'HTTPS callback URL to send webhook events to',
            },
            events: {
              type: 'string',
              description: 'Comma-separated list of events to subscribe to: invitee.created, invitee.canceled, routing_form_submission.created',
            },
            organization_uri: {
              type: 'string',
              description: 'Organization URI (required for organization scope)',
            },
            user_uri: {
              type: 'string',
              description: 'User URI (required for user scope)',
            },
            scope: {
              type: 'string',
              description: 'Webhook scope: user or organization',
            },
            signing_key: {
              type: 'string',
              description: 'Secret key for HMAC-SHA256 webhook signature verification (optional but recommended)',
            },
          },
          required: ['url', 'events', 'organization_uri', 'scope'],
        },
      },
      {
        name: 'delete_webhook_subscription',
        description: 'Delete a Calendly webhook subscription by its UUID to stop receiving event notifications',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_uuid: {
              type: 'string',
              description: 'The webhook subscription UUID to delete',
            },
          },
          required: ['webhook_uuid'],
        },
      },
      {
        name: 'list_routing_forms',
        description: 'List routing forms in a Calendly organization for lead qualification and event routing',
        inputSchema: {
          type: 'object',
          properties: {
            organization_uri: {
              type: 'string',
              description: 'Organization URI to list routing forms for',
            },
            count: {
              type: 'number',
              description: 'Number of results to return (default: 20, max: 100)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['organization_uri'],
        },
      },
      {
        name: 'get_routing_form',
        description: 'Get details of a specific Calendly routing form by its UUID',
        inputSchema: {
          type: 'object',
          properties: {
            form_uuid: {
              type: 'string',
              description: 'The routing form UUID',
            },
          },
          required: ['form_uuid'],
        },
      },
      {
        name: 'list_routing_form_submissions',
        description: 'List submissions for a Calendly routing form — responses to qualification questions',
        inputSchema: {
          type: 'object',
          properties: {
            form_uuid: {
              type: 'string',
              description: 'The routing form UUID',
            },
            count: {
              type: 'number',
              description: 'Number of results to return (default: 20, max: 100)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['form_uuid'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_current_user':
          return this.getCurrentUser();
        case 'get_user':
          return this.getUser(args);
        case 'list_event_types':
          return this.listEventTypes(args);
        case 'get_event_type':
          return this.getEventType(args);
        case 'get_event_type_availability':
          return this.getEventTypeAvailability(args);
        case 'list_scheduled_events':
          return this.listScheduledEvents(args);
        case 'get_scheduled_event':
          return this.getScheduledEvent(args);
        case 'cancel_event':
          return this.cancelEvent(args);
        case 'list_event_invitees':
          return this.listEventInvitees(args);
        case 'get_event_invitee':
          return this.getEventInvitee(args);
        case 'list_organization_memberships':
          return this.listOrganizationMemberships(args);
        case 'get_organization_membership':
          return this.getOrganizationMembership(args);
        case 'remove_organization_membership':
          return this.removeOrganizationMembership(args);
        case 'list_organization_invitations':
          return this.listOrganizationInvitations(args);
        case 'send_organization_invitation':
          return this.sendOrganizationInvitation(args);
        case 'revoke_organization_invitation':
          return this.revokeOrganizationInvitation(args);
        case 'list_webhook_subscriptions':
          return this.listWebhookSubscriptions(args);
        case 'create_webhook_subscription':
          return this.createWebhookSubscription(args);
        case 'delete_webhook_subscription':
          return this.deleteWebhookSubscription(args);
        case 'list_routing_forms':
          return this.listRoutingForms(args);
        case 'get_routing_form':
          return this.getRoutingForm(args);
        case 'list_routing_form_submissions':
          return this.listRoutingFormSubmissions(args);
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
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async calGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await fetch(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async calPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async calDelete(path: string): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  private async getCurrentUser(): Promise<ToolResult> {
    return this.calGet('/users/me');
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_uuid) return { content: [{ type: 'text', text: 'user_uuid is required' }], isError: true };
    return this.calGet(`/users/${args.user_uuid}`);
  }

  private async listEventTypes(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.user_uri) params.user = args.user_uri as string;
    if (args.organization_uri) params.organization = args.organization_uri as string;
    if (typeof args.active === 'boolean') params.active = String(args.active);
    if (args.count) params.count = String(args.count);
    if (args.page_token) params.page_token = args.page_token as string;
    return this.calGet('/event_types', params);
  }

  private async getEventType(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_type_uuid) return { content: [{ type: 'text', text: 'event_type_uuid is required' }], isError: true };
    return this.calGet(`/event_types/${args.event_type_uuid}`);
  }

  private async getEventTypeAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_type_uri || !args.start_time || !args.end_time) {
      return { content: [{ type: 'text', text: 'event_type_uri, start_time, and end_time are required' }], isError: true };
    }
    const params: Record<string, string> = {
      event_type: args.event_type_uri as string,
      start_time: args.start_time as string,
      end_time: args.end_time as string,
    };
    return this.calGet('/event_type_available_times', params);
  }

  private async listScheduledEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.user_uri) params.user = args.user_uri as string;
    if (args.organization_uri) params.organization = args.organization_uri as string;
    if (args.status) params.status = args.status as string;
    if (args.min_start_time) params.min_start_time = args.min_start_time as string;
    if (args.max_start_time) params.max_start_time = args.max_start_time as string;
    if (args.count) params.count = String(args.count);
    if (args.page_token) params.page_token = args.page_token as string;
    if (args.sort) params.sort = args.sort as string;
    return this.calGet('/scheduled_events', params);
  }

  private async getScheduledEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_uuid) return { content: [{ type: 'text', text: 'event_uuid is required' }], isError: true };
    return this.calGet(`/scheduled_events/${args.event_uuid}`);
  }

  private async cancelEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_uuid) return { content: [{ type: 'text', text: 'event_uuid is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.reason) body.reason = args.reason;
    return this.calPost(`/scheduled_events/${args.event_uuid}/cancellation`, body);
  }

  private async listEventInvitees(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_uuid) return { content: [{ type: 'text', text: 'event_uuid is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.status) params.status = args.status as string;
    if (args.count) params.count = String(args.count);
    if (args.page_token) params.page_token = args.page_token as string;
    return this.calGet(`/scheduled_events/${args.event_uuid}/invitees`, params);
  }

  private async getEventInvitee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_uuid || !args.invitee_uuid) {
      return { content: [{ type: 'text', text: 'event_uuid and invitee_uuid are required' }], isError: true };
    }
    return this.calGet(`/scheduled_events/${args.event_uuid}/invitees/${args.invitee_uuid}`);
  }

  private async listOrganizationMemberships(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_uri) return { content: [{ type: 'text', text: 'organization_uri is required' }], isError: true };
    const params: Record<string, string> = { organization: args.organization_uri as string };
    if (args.count) params.count = String(args.count);
    if (args.page_token) params.page_token = args.page_token as string;
    if (args.email) params.email = args.email as string;
    return this.calGet('/organization_memberships', params);
  }

  private async getOrganizationMembership(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.membership_uuid) return { content: [{ type: 'text', text: 'membership_uuid is required' }], isError: true };
    return this.calGet(`/organization_memberships/${args.membership_uuid}`);
  }

  private async removeOrganizationMembership(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.membership_uuid) return { content: [{ type: 'text', text: 'membership_uuid is required' }], isError: true };
    return this.calDelete(`/organization_memberships/${args.membership_uuid}`);
  }

  private async listOrganizationInvitations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_uuid) return { content: [{ type: 'text', text: 'org_uuid is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.status) params.status = args.status as string;
    if (args.count) params.count = String(args.count);
    if (args.page_token) params.page_token = args.page_token as string;
    return this.calGet(`/organizations/${args.org_uuid}/invitations`, params);
  }

  private async sendOrganizationInvitation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_uuid || !args.email) return { content: [{ type: 'text', text: 'org_uuid and email are required' }], isError: true };
    const body: Record<string, unknown> = { email: args.email };
    if (args.role) body.role = args.role;
    return this.calPost(`/organizations/${args.org_uuid}/invitations`, body);
  }

  private async revokeOrganizationInvitation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_uuid || !args.invitation_uuid) {
      return { content: [{ type: 'text', text: 'org_uuid and invitation_uuid are required' }], isError: true };
    }
    return this.calDelete(`/organizations/${args.org_uuid}/invitations/${args.invitation_uuid}`);
  }

  private async listWebhookSubscriptions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_uri || !args.scope) {
      return { content: [{ type: 'text', text: 'organization_uri and scope are required' }], isError: true };
    }
    const params: Record<string, string> = {
      organization: args.organization_uri as string,
      scope: args.scope as string,
    };
    if (args.user_uri) params.user = args.user_uri as string;
    if (args.count) params.count = String(args.count);
    if (args.page_token) params.page_token = args.page_token as string;
    return this.calGet('/webhook_subscriptions', params);
  }

  private async createWebhookSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url || !args.events || !args.organization_uri || !args.scope) {
      return { content: [{ type: 'text', text: 'url, events, organization_uri, and scope are required' }], isError: true };
    }
    const eventList = (args.events as string).split(',').map(e => e.trim());
    const body: Record<string, unknown> = {
      url: args.url,
      events: eventList,
      organization: args.organization_uri,
      scope: args.scope,
    };
    if (args.user_uri) body.user = args.user_uri;
    if (args.signing_key) body.signing_key = args.signing_key;
    return this.calPost('/webhook_subscriptions', body);
  }

  private async deleteWebhookSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.webhook_uuid) return { content: [{ type: 'text', text: 'webhook_uuid is required' }], isError: true };
    return this.calDelete(`/webhook_subscriptions/${args.webhook_uuid}`);
  }

  private async listRoutingForms(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_uri) return { content: [{ type: 'text', text: 'organization_uri is required' }], isError: true };
    const params: Record<string, string> = { organization: args.organization_uri as string };
    if (args.count) params.count = String(args.count);
    if (args.page_token) params.page_token = args.page_token as string;
    return this.calGet('/routing_forms', params);
  }

  private async getRoutingForm(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.form_uuid) return { content: [{ type: 'text', text: 'form_uuid is required' }], isError: true };
    return this.calGet(`/routing_forms/${args.form_uuid}`);
  }

  private async listRoutingFormSubmissions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.form_uuid) return { content: [{ type: 'text', text: 'form_uuid is required' }], isError: true };
    const params: Record<string, string> = { form: `${this.baseUrl}/routing_forms/${args.form_uuid}` };
    if (args.count) params.count = String(args.count);
    if (args.page_token) params.page_token = args.page_token as string;
    return this.calGet('/routing_form_submissions', params);
  }
}
