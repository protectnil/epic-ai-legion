/**
 * Postmark Server API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Postmark MCP server was found on GitHub. We build a full REST wrapper
// for complete Postmark Server API coverage.
//
// Base URL: https://api.postmarkapp.com
// Auth: X-Postmark-Server-Token header (server API token from Postmark dashboard)
// Docs: https://postmarkapp.com/developer/api/overview
// Spec: https://api.apis.guru/v2/specs/postmarkapp.com/server/1.0.0/swagger.json
// Category: communication
// Rate limits: See Postmark docs — rate limits vary by plan

import { ToolDefinition, ToolResult } from './types.js';

interface PostmarkServerConfig {
  serverToken: string;
  baseUrl?: string;
}

export class PostmarkappServerMCPServer {
  private readonly serverToken: string;
  private readonly baseUrl: string;

  constructor(config: PostmarkServerConfig) {
    this.serverToken = config.serverToken;
    this.baseUrl = config.baseUrl || 'https://api.postmarkapp.com';
  }

  static catalog() {
    return {
      name: 'postmarkapp-server',
      displayName: 'Postmark Server API',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'postmark', 'email', 'transactional', 'smtp', 'send', 'bounce',
        'template', 'inbound', 'outbound', 'stats', 'analytics', 'open',
        'click', 'delivery', 'webhook', 'spam', 'trigger', 'server',
      ],
      toolNames: [
        'send_email',
        'send_email_batch',
        'send_email_with_template',
        'send_email_batch_with_templates',
        'get_delivery_stats',
        'get_bounces',
        'get_single_bounce',
        'get_bounce_dump',
        'activate_bounce',
        'search_outbound_messages',
        'get_outbound_message_details',
        'get_outbound_message_dump',
        'search_outbound_clicks',
        'get_clicks_for_message',
        'search_outbound_opens',
        'get_opens_for_message',
        'search_inbound_messages',
        'get_inbound_message_details',
        'bypass_inbound_rules',
        'retry_inbound_message',
        'get_server_configuration',
        'edit_server_configuration',
        'get_outbound_overview_stats',
        'get_bounce_counts',
        'get_sent_counts',
        'get_spam_complaints',
        'get_tracked_email_counts',
        'get_open_counts',
        'get_open_counts_by_email_client',
        'get_open_counts_by_platform',
        'get_click_counts',
        'get_click_counts_by_browser_family',
        'get_click_counts_by_platform',
        'get_click_counts_by_location',
        'list_templates',
        'get_template',
        'create_template',
        'update_template',
        'delete_template',
        'validate_template',
        'list_inbound_rules',
        'create_inbound_rule',
        'delete_inbound_rule',
      ],
      description: 'Postmark Server API: send transactional emails (single, batch, template-based), manage bounces, search messages, view delivery stats, manage email templates, and configure inbound rules.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Email Sending ──────────────────────────────────────────────────────
      {
        name: 'send_email',
        description: 'Send a single transactional email via Postmark with full control over recipients, subject, body (HTML and/or text), attachments, and headers',
        inputSchema: {
          type: 'object',
          properties: {
            From: {
              type: 'string',
              description: 'Sender email address (must be a verified sender signature in Postmark)',
            },
            To: {
              type: 'string',
              description: 'Recipient email address(es), comma-separated',
            },
            Cc: {
              type: 'string',
              description: 'CC email address(es), comma-separated',
            },
            Bcc: {
              type: 'string',
              description: 'BCC email address(es), comma-separated',
            },
            Subject: {
              type: 'string',
              description: 'Email subject line',
            },
            HtmlBody: {
              type: 'string',
              description: 'HTML body of the email',
            },
            TextBody: {
              type: 'string',
              description: 'Plain text body of the email',
            },
            ReplyTo: {
              type: 'string',
              description: 'Reply-To email address',
            },
            Tag: {
              type: 'string',
              description: 'Tag to categorize this email in Postmark analytics',
            },
            TrackLinks: {
              type: 'string',
              description: 'Link tracking mode: None, HtmlAndText, HtmlOnly, or TextOnly',
            },
            Headers: {
              type: 'array',
              description: 'Array of custom email headers. Each item is {Name, Value}.',
              items: { type: 'object' },
            },
            Attachments: {
              type: 'array',
              description: 'Array of file attachments. Each item is {Name, Content (base64), ContentType}.',
              items: { type: 'object' },
            },
          },
          required: ['From', 'To', 'Subject'],
        },
      },
      {
        name: 'send_email_batch',
        description: 'Send up to 500 individual transactional emails in a single API call. Each message in the batch is independent.',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of email message objects, each with the same fields as send_email (From, To, Subject, HtmlBody, etc.)',
              items: { type: 'object' },
            },
          },
          required: ['messages'],
        },
      },
      {
        name: 'send_email_with_template',
        description: 'Send a single email using a Postmark template. Supply the template ID or alias plus the model data to populate the template variables.',
        inputSchema: {
          type: 'object',
          properties: {
            From: {
              type: 'string',
              description: 'Sender email address',
            },
            To: {
              type: 'string',
              description: 'Recipient email address(es), comma-separated',
            },
            Cc: {
              type: 'string',
              description: 'CC email address(es), comma-separated',
            },
            Bcc: {
              type: 'string',
              description: 'BCC email address(es), comma-separated',
            },
            TemplateId: {
              type: 'number',
              description: 'Numeric ID of the Postmark template to use',
            },
            TemplateAlias: {
              type: 'string',
              description: 'Alias of the Postmark template to use (alternative to TemplateId)',
            },
            TemplateModel: {
              type: 'object',
              description: 'Key-value object with variables to inject into the template (e.g. {"name": "Alice", "confirmation_url": "https://..."})',
            },
            ReplyTo: {
              type: 'string',
              description: 'Reply-To email address',
            },
            Tag: {
              type: 'string',
              description: 'Tag to categorize this email in Postmark analytics',
            },
            InlineCss: {
              type: 'boolean',
              description: 'If true, CSS in HtmlBody is inlined (default: true)',
            },
            Headers: {
              type: 'array',
              description: 'Array of custom email headers. Each item is {Name, Value}.',
              items: { type: 'object' },
            },
            Attachments: {
              type: 'array',
              description: 'Array of file attachments. Each item is {Name, Content (base64), ContentType}.',
              items: { type: 'object' },
            },
          },
          required: ['From', 'To'],
        },
      },
      {
        name: 'send_email_batch_with_templates',
        description: 'Send up to 500 template-based emails in a single batch. Each message specifies its own template and model data.',
        inputSchema: {
          type: 'object',
          properties: {
            Messages: {
              type: 'array',
              description: 'Array of template email objects, each with From, To, TemplateId or TemplateAlias, and TemplateModel.',
              items: { type: 'object' },
            },
          },
          required: ['Messages'],
        },
      },
      // ── Bounces ────────────────────────────────────────────────────────────
      {
        name: 'get_delivery_stats',
        description: 'Get summary delivery statistics for the current Postmark server — total sent, bounces, spam complaints, etc.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_bounces',
        description: 'Search and list email bounces for the current Postmark server with optional filters by type, recipient, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of bounces to return per page (max 500)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset — number of records to skip',
            },
            type: {
              type: 'string',
              description: 'Bounce type filter (e.g. HardBounce, SoftBounce, Transient, Unsubscribe, Subscribe, AutoResponder, AddressChange, DnsError, SpamNotification, OpenRelayTest, Unknown, SoftBounce, VirusNotification, ChallengeVerification, BadEmailAddress, SpamComplaint, ManuallyDeactivated, Unconfirmed, Blocked)',
            },
            inactive: {
              type: 'boolean',
              description: 'If true, return only inactive (deactivated) email addresses',
            },
            emailFilter: {
              type: 'string',
              description: 'Filter by recipient email address (partial match)',
            },
            messageID: {
              type: 'string',
              description: 'Filter bounces by Postmark message ID',
            },
            tag: {
              type: 'string',
              description: 'Filter bounces by message tag',
            },
            fromdate: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format',
            },
            todate: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format',
            },
          },
          required: ['count', 'offset'],
        },
      },
      {
        name: 'get_single_bounce',
        description: 'Get full details for a single bounce record by its Postmark bounce ID',
        inputSchema: {
          type: 'object',
          properties: {
            bounceid: {
              type: 'number',
              description: 'Numeric bounce ID to retrieve',
            },
          },
          required: ['bounceid'],
        },
      },
      {
        name: 'get_bounce_dump',
        description: 'Get the raw SMTP response dump for a specific bounce by bounce ID — useful for debugging delivery issues',
        inputSchema: {
          type: 'object',
          properties: {
            bounceid: {
              type: 'number',
              description: 'Numeric bounce ID to retrieve the SMTP dump for',
            },
          },
          required: ['bounceid'],
        },
      },
      {
        name: 'activate_bounce',
        description: 'Reactivate a deactivated email address that was previously suppressed due to a bounce — allows future emails to be delivered to it',
        inputSchema: {
          type: 'object',
          properties: {
            bounceid: {
              type: 'number',
              description: 'Numeric bounce ID to activate',
            },
          },
          required: ['bounceid'],
        },
      },
      // ── Outbound Messages ──────────────────────────────────────────────────
      {
        name: 'search_outbound_messages',
        description: 'Search outbound (sent) messages with optional filters by recipient, tag, status, and date range. Returns paginated results.',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of messages to return per page (max 500)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset — number of records to skip',
            },
            recipient: {
              type: 'string',
              description: 'Filter by recipient email address',
            },
            fromemail: {
              type: 'string',
              description: 'Filter by sender email address',
            },
            tag: {
              type: 'string',
              description: 'Filter by message tag',
            },
            status: {
              type: 'string',
              description: 'Filter by delivery status: queued, sent, bounced, or spam',
            },
            fromdate: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format',
            },
            todate: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format',
            },
          },
          required: ['count', 'offset'],
        },
      },
      {
        name: 'get_outbound_message_details',
        description: 'Get full details for a specific outbound (sent) message by its Postmark message ID',
        inputSchema: {
          type: 'object',
          properties: {
            messageid: {
              type: 'string',
              description: 'Postmark message ID (UUID)',
            },
          },
          required: ['messageid'],
        },
      },
      {
        name: 'get_outbound_message_dump',
        description: 'Get the raw SMTP dump for a specific outbound message — includes full headers and body as received by the mail server',
        inputSchema: {
          type: 'object',
          properties: {
            messageid: {
              type: 'string',
              description: 'Postmark message ID (UUID)',
            },
          },
          required: ['messageid'],
        },
      },
      {
        name: 'search_outbound_clicks',
        description: 'Search click tracking data for outbound messages with optional filters by recipient, tag, browser, OS, platform, and geography',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of click records to return per page (max 500)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset — number of records to skip',
            },
            recipient: {
              type: 'string',
              description: 'Filter by recipient email address',
            },
            tag: {
              type: 'string',
              description: 'Filter by message tag',
            },
            client_name: { type: 'string', description: 'Filter by email client name' },
            client_company: { type: 'string', description: 'Filter by email client company' },
            client_family: { type: 'string', description: 'Filter by email client family' },
            os_name: { type: 'string', description: 'Filter by OS name' },
            os_family: { type: 'string', description: 'Filter by OS family' },
            os_company: { type: 'string', description: 'Filter by OS company' },
            platform: { type: 'string', description: 'Filter by platform (Desktop, Mobile, Webmail, Unknown)' },
            country: { type: 'string', description: 'Filter by country (ISO 3166-1 alpha-2 code)' },
            region: { type: 'string', description: 'Filter by region/state' },
            city: { type: 'string', description: 'Filter by city' },
          },
          required: ['count', 'offset'],
        },
      },
      {
        name: 'get_clicks_for_message',
        description: 'Get all click tracking events for a specific outbound message by message ID',
        inputSchema: {
          type: 'object',
          properties: {
            messageid: {
              type: 'string',
              description: 'Postmark message ID (UUID)',
            },
            count: {
              type: 'number',
              description: 'Number of click records to return per page (max 500)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
          },
          required: ['messageid', 'count', 'offset'],
        },
      },
      {
        name: 'search_outbound_opens',
        description: 'Search email open tracking data for outbound messages with optional filters by recipient, tag, client, OS, platform, and geography',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of open records to return per page (max 500)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset — number of records to skip',
            },
            recipient: {
              type: 'string',
              description: 'Filter by recipient email address',
            },
            tag: {
              type: 'string',
              description: 'Filter by message tag',
            },
            client_name: { type: 'string', description: 'Filter by email client name' },
            client_company: { type: 'string', description: 'Filter by email client company' },
            client_family: { type: 'string', description: 'Filter by email client family' },
            os_name: { type: 'string', description: 'Filter by OS name' },
            os_family: { type: 'string', description: 'Filter by OS family' },
            os_company: { type: 'string', description: 'Filter by OS company' },
            platform: { type: 'string', description: 'Filter by platform (Desktop, Mobile, Webmail, Unknown)' },
            country: { type: 'string', description: 'Filter by country (ISO 3166-1 alpha-2 code)' },
            region: { type: 'string', description: 'Filter by region/state' },
            city: { type: 'string', description: 'Filter by city' },
          },
          required: ['count', 'offset'],
        },
      },
      {
        name: 'get_opens_for_message',
        description: 'Get all open tracking events for a specific outbound message by message ID',
        inputSchema: {
          type: 'object',
          properties: {
            messageid: {
              type: 'string',
              description: 'Postmark message ID (UUID)',
            },
            count: {
              type: 'number',
              description: 'Number of open records to return per page (max 500)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
          },
          required: ['messageid', 'count', 'offset'],
        },
      },
      // ── Inbound Messages ───────────────────────────────────────────────────
      {
        name: 'search_inbound_messages',
        description: 'Search inbound (received) messages with optional filters by recipient, sender, subject, mailbox hash, tag, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of messages to return per page (max 500)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset — number of records to skip',
            },
            recipient: {
              type: 'string',
              description: 'Filter by recipient email address',
            },
            fromemail: {
              type: 'string',
              description: 'Filter by sender email address',
            },
            subject: {
              type: 'string',
              description: 'Filter by email subject (partial match)',
            },
            mailboxhash: {
              type: 'string',
              description: 'Filter by mailbox hash',
            },
            tag: {
              type: 'string',
              description: 'Filter by message tag',
            },
            status: {
              type: 'string',
              description: 'Filter by status: processed, queued, failed, scheduled, blocked, or pending',
            },
            fromdate: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format',
            },
            todate: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format',
            },
          },
          required: ['count', 'offset'],
        },
      },
      {
        name: 'get_inbound_message_details',
        description: 'Get full details for a specific inbound message by its Postmark message ID',
        inputSchema: {
          type: 'object',
          properties: {
            messageid: {
              type: 'string',
              description: 'Postmark message ID (UUID)',
            },
          },
          required: ['messageid'],
        },
      },
      {
        name: 'bypass_inbound_rules',
        description: 'Bypass spam/inbound rules for a blocked inbound message and force it through for processing',
        inputSchema: {
          type: 'object',
          properties: {
            messageid: {
              type: 'string',
              description: 'Postmark message ID of the blocked inbound message',
            },
          },
          required: ['messageid'],
        },
      },
      {
        name: 'retry_inbound_message',
        description: 'Retry processing a failed inbound message — triggers re-processing of the webhook delivery',
        inputSchema: {
          type: 'object',
          properties: {
            messageid: {
              type: 'string',
              description: 'Postmark message ID of the failed inbound message',
            },
          },
          required: ['messageid'],
        },
      },
      // ── Server Configuration ───────────────────────────────────────────────
      {
        name: 'get_server_configuration',
        description: 'Get the current configuration for the Postmark server associated with the API token, including webhook URLs, tracking settings, and inbound settings',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'edit_server_configuration',
        description: 'Update the Postmark server configuration — set webhook URLs for bounce/click/open/delivery/inbound events, toggle SMTP, configure inbound domain, and more',
        inputSchema: {
          type: 'object',
          properties: {
            Name: {
              type: 'string',
              description: 'New display name for the server',
            },
            Color: {
              type: 'string',
              description: 'Color for the server in Postmark UI (e.g. red, yellow, green, blue, purple, grey, white)',
            },
            SmtpApiActivated: {
              type: 'boolean',
              description: 'Whether SMTP API is enabled for this server',
            },
            RawEmailEnabled: {
              type: 'boolean',
              description: 'Whether to include raw email in inbound webhook payloads',
            },
            InboundHookUrl: {
              type: 'string',
              description: 'Webhook URL for inbound message notifications',
            },
            BounceHookUrl: {
              type: 'string',
              description: 'Webhook URL for bounce event notifications',
            },
            OpenHookUrl: {
              type: 'string',
              description: 'Webhook URL for email open event notifications',
            },
            ClickHookUrl: {
              type: 'string',
              description: 'Webhook URL for link click event notifications',
            },
            DeliveryHookUrl: {
              type: 'string',
              description: 'Webhook URL for delivery event notifications',
            },
            InboundDomain: {
              type: 'string',
              description: 'MX domain for inbound email processing',
            },
            InboundSpamThreshold: {
              type: 'number',
              description: 'Spam score threshold for inbound message filtering (0-30)',
            },
            PostFirstOpenOnly: {
              type: 'boolean',
              description: 'If true, only the first open event per recipient is sent to OpenHookUrl',
            },
          },
        },
      },
      // ── Statistics ─────────────────────────────────────────────────────────
      {
        name: 'get_outbound_overview_stats',
        description: 'Get outbound email overview statistics including sent, bounces, spam complaints, opens, and clicks — with optional tag and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter stats by message tag' },
            fromdate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            todate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
          },
        },
      },
      {
        name: 'get_bounce_counts',
        description: 'Get bounce counts over time with optional tag and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter by message tag' },
            fromdate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            todate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
          },
        },
      },
      {
        name: 'get_sent_counts',
        description: 'Get email sent counts over time with optional tag and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter by message tag' },
            fromdate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            todate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
          },
        },
      },
      {
        name: 'get_spam_complaints',
        description: 'Get spam complaint counts over time with optional tag and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter by message tag' },
            fromdate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            todate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
          },
        },
      },
      {
        name: 'get_tracked_email_counts',
        description: 'Get counts of tracked (open- or click-tracked) emails over time with optional tag and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter by message tag' },
            fromdate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            todate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
          },
        },
      },
      {
        name: 'get_open_counts',
        description: 'Get email open counts over time with optional tag and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter by message tag' },
            fromdate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            todate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
          },
        },
      },
      {
        name: 'get_open_counts_by_email_client',
        description: 'Get email open counts broken down by email client (Outlook, Apple Mail, Gmail, etc.) with optional tag and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter by message tag' },
            fromdate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            todate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
          },
        },
      },
      {
        name: 'get_open_counts_by_platform',
        description: 'Get email open counts broken down by platform (Desktop, Mobile, Webmail) with optional tag and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter by message tag' },
            fromdate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            todate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
          },
        },
      },
      {
        name: 'get_click_counts',
        description: 'Get link click counts over time with optional tag and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter by message tag' },
            fromdate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            todate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
          },
        },
      },
      {
        name: 'get_click_counts_by_browser_family',
        description: 'Get link click counts broken down by browser family (Chrome, Firefox, Safari, etc.) with optional tag and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter by message tag' },
            fromdate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            todate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
          },
        },
      },
      {
        name: 'get_click_counts_by_platform',
        description: 'Get link click counts broken down by platform (Desktop, Mobile, Webmail) with optional tag and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter by message tag' },
            fromdate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            todate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
          },
        },
      },
      {
        name: 'get_click_counts_by_location',
        description: 'Get link click counts broken down by body location (HTML link vs text link) with optional tag and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter by message tag' },
            fromdate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            todate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
          },
        },
      },
      // ── Templates ──────────────────────────────────────────────────────────
      {
        name: 'list_templates',
        description: 'List all email templates associated with this Postmark server, paginated',
        inputSchema: {
          type: 'object',
          properties: {
            Count: {
              type: 'number',
              description: 'Number of templates to return per page (max 500)',
            },
            Offset: {
              type: 'number',
              description: 'Pagination offset — number of records to skip',
            },
          },
          required: ['Count', 'Offset'],
        },
      },
      {
        name: 'get_template',
        description: 'Get full details for a specific email template by its ID or alias',
        inputSchema: {
          type: 'object',
          properties: {
            templateIdOrAlias: {
              type: 'string',
              description: 'Numeric template ID or string alias',
            },
          },
          required: ['templateIdOrAlias'],
        },
      },
      {
        name: 'create_template',
        description: 'Create a new email template in Postmark with HTML body, text body, and subject — optionally with an alias for easy reference',
        inputSchema: {
          type: 'object',
          properties: {
            Name: {
              type: 'string',
              description: 'Display name for the template',
            },
            Subject: {
              type: 'string',
              description: 'Email subject line (supports template variables like {{name}})',
            },
            HtmlBody: {
              type: 'string',
              description: 'HTML body of the template (supports Mustache-style variables)',
            },
            TextBody: {
              type: 'string',
              description: 'Plain text body of the template (supports Mustache-style variables)',
            },
            Alias: {
              type: 'string',
              description: 'Short alphanumeric alias for easy reference (e.g. welcome-email)',
            },
          },
          required: ['Name', 'Subject'],
        },
      },
      {
        name: 'update_template',
        description: 'Update an existing Postmark email template — modify name, subject, HTML body, text body, or alias',
        inputSchema: {
          type: 'object',
          properties: {
            templateIdOrAlias: {
              type: 'string',
              description: 'Numeric template ID or string alias to update',
            },
            Name: {
              type: 'string',
              description: 'New display name for the template',
            },
            Subject: {
              type: 'string',
              description: 'Updated email subject line',
            },
            HtmlBody: {
              type: 'string',
              description: 'Updated HTML body',
            },
            TextBody: {
              type: 'string',
              description: 'Updated plain text body',
            },
            Alias: {
              type: 'string',
              description: 'Updated alias',
            },
          },
          required: ['templateIdOrAlias'],
        },
      },
      {
        name: 'delete_template',
        description: 'Delete a Postmark email template permanently by its ID or alias',
        inputSchema: {
          type: 'object',
          properties: {
            templateIdOrAlias: {
              type: 'string',
              description: 'Numeric template ID or string alias to delete',
            },
          },
          required: ['templateIdOrAlias'],
        },
      },
      {
        name: 'validate_template',
        description: 'Validate and test-render a Postmark email template with sample data — checks for syntax errors and returns a preview of the rendered output',
        inputSchema: {
          type: 'object',
          properties: {
            Subject: {
              type: 'string',
              description: 'Subject line to validate (supports Mustache variables)',
            },
            HtmlBody: {
              type: 'string',
              description: 'HTML body to validate',
            },
            TextBody: {
              type: 'string',
              description: 'Text body to validate',
            },
            TestRenderModel: {
              type: 'object',
              description: 'Test data to render the template with (e.g. {"name": "Alice"})',
            },
            InlineCssForHtmlTestRender: {
              type: 'boolean',
              description: 'If true, CSS is inlined in the HTML test render (default: true)',
            },
          },
        },
      },
      // ── Inbound Rules ──────────────────────────────────────────────────────
      {
        name: 'list_inbound_rules',
        description: 'List all inbound rule triggers for the current Postmark server, paginated',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of rules to return per page (max 500)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset — number of records to skip',
            },
          },
          required: ['count', 'offset'],
        },
      },
      {
        name: 'create_inbound_rule',
        description: 'Create a new inbound rule trigger — rules can block or tag inbound emails based on sender patterns',
        inputSchema: {
          type: 'object',
          properties: {
            Rule: {
              type: 'string',
              description: 'Rule pattern to match against inbound email senders (e.g. *.spam.com or noreply@example.com)',
            },
          },
          required: ['Rule'],
        },
      },
      {
        name: 'delete_inbound_rule',
        description: 'Delete an inbound rule trigger by its numeric trigger ID',
        inputSchema: {
          type: 'object',
          properties: {
            triggerid: {
              type: 'number',
              description: 'Numeric trigger ID to delete',
            },
          },
          required: ['triggerid'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_email':                      return this.sendEmail(args);
        case 'send_email_batch':                return this.sendEmailBatch(args);
        case 'send_email_with_template':        return this.sendEmailWithTemplate(args);
        case 'send_email_batch_with_templates': return this.sendEmailBatchWithTemplates(args);
        case 'get_delivery_stats':              return this.getDeliveryStats();
        case 'get_bounces':                     return this.getBounces(args);
        case 'get_single_bounce':               return this.getSingleBounce(args);
        case 'get_bounce_dump':                 return this.getBounceDump(args);
        case 'activate_bounce':                 return this.activateBounce(args);
        case 'search_outbound_messages':        return this.searchOutboundMessages(args);
        case 'get_outbound_message_details':    return this.getOutboundMessageDetails(args);
        case 'get_outbound_message_dump':       return this.getOutboundMessageDump(args);
        case 'search_outbound_clicks':          return this.searchOutboundClicks(args);
        case 'get_clicks_for_message':          return this.getClicksForMessage(args);
        case 'search_outbound_opens':           return this.searchOutboundOpens(args);
        case 'get_opens_for_message':           return this.getOpensForMessage(args);
        case 'search_inbound_messages':         return this.searchInboundMessages(args);
        case 'get_inbound_message_details':     return this.getInboundMessageDetails(args);
        case 'bypass_inbound_rules':            return this.bypassInboundRules(args);
        case 'retry_inbound_message':           return this.retryInboundMessage(args);
        case 'get_server_configuration':        return this.getServerConfiguration();
        case 'edit_server_configuration':       return this.editServerConfiguration(args);
        case 'get_outbound_overview_stats':     return this.getOutboundOverviewStats(args);
        case 'get_bounce_counts':               return this.getBounceCounts(args);
        case 'get_sent_counts':                 return this.getSentCounts(args);
        case 'get_spam_complaints':             return this.getSpamComplaints(args);
        case 'get_tracked_email_counts':        return this.getTrackedEmailCounts(args);
        case 'get_open_counts':                 return this.getOpenCounts(args);
        case 'get_open_counts_by_email_client': return this.getOpenCountsByEmailClient(args);
        case 'get_open_counts_by_platform':     return this.getOpenCountsByPlatform(args);
        case 'get_click_counts':                return this.getClickCounts(args);
        case 'get_click_counts_by_browser_family': return this.getClickCountsByBrowserFamily(args);
        case 'get_click_counts_by_platform':    return this.getClickCountsByPlatform(args);
        case 'get_click_counts_by_location':    return this.getClickCountsByLocation(args);
        case 'list_templates':                  return this.listTemplates(args);
        case 'get_template':                    return this.getTemplate(args);
        case 'create_template':                 return this.createTemplate(args);
        case 'update_template':                 return this.updateTemplate(args);
        case 'delete_template':                 return this.deleteTemplate(args);
        case 'validate_template':               return this.validateTemplate(args);
        case 'list_inbound_rules':              return this.listInboundRules(args);
        case 'create_inbound_rule':             return this.createInboundRule(args);
        case 'delete_inbound_rule':             return this.deleteInboundRule(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get authHeader(): Record<string, string> {
    return { 'X-Postmark-Server-Token': this.serverToken };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private buildQs(params: Record<string, unknown>): string {
    const entries = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]);
    return entries.length > 0 ? '?' + new URLSearchParams(entries).toString() : '';
  }

  private async get(path: string, queryParams?: Record<string, unknown>): Promise<ToolResult> {
    const qs = queryParams ? this.buildQs(queryParams) : '';
    const url = `${this.baseUrl}${path}${qs}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...this.authHeader,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, body?: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        ...this.authHeader,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Email Sending ──────────────────────────────────────────────────────────

  private async sendEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.From || !args.To || !args.Subject) {
      return { content: [{ type: 'text', text: 'From, To, and Subject are required' }], isError: true };
    }
    return this.post('/email', args as Record<string, unknown>);
  }

  private async sendEmailBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.messages || !Array.isArray(args.messages)) {
      return { content: [{ type: 'text', text: 'messages array is required' }], isError: true };
    }
    return this.post('/email/batch', args.messages as unknown as Record<string, unknown>);
  }

  private async sendEmailWithTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.From || !args.To) {
      return { content: [{ type: 'text', text: 'From and To are required' }], isError: true };
    }
    if (!args.TemplateId && !args.TemplateAlias) {
      return { content: [{ type: 'text', text: 'TemplateId or TemplateAlias is required' }], isError: true };
    }
    return this.post('/email/withTemplate', args as Record<string, unknown>);
  }

  private async sendEmailBatchWithTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.Messages || !Array.isArray(args.Messages)) {
      return { content: [{ type: 'text', text: 'Messages array is required' }], isError: true };
    }
    return this.post('/email/batchWithTemplates', { Messages: args.Messages });
  }

  // ── Bounces ────────────────────────────────────────────────────────────────

  private async getDeliveryStats(): Promise<ToolResult> {
    return this.get('/deliverystats');
  }

  private async getBounces(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.count === undefined || args.offset === undefined) {
      return { content: [{ type: 'text', text: 'count and offset are required' }], isError: true };
    }
    return this.get('/bounces', args);
  }

  private async getSingleBounce(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bounceid) {
      return { content: [{ type: 'text', text: 'bounceid is required' }], isError: true };
    }
    return this.get(`/bounces/${encodeURIComponent(args.bounceid as string)}`);
  }

  private async getBounceDump(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bounceid) {
      return { content: [{ type: 'text', text: 'bounceid is required' }], isError: true };
    }
    return this.get(`/bounces/${encodeURIComponent(args.bounceid as string)}/dump`);
  }

  private async activateBounce(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bounceid) {
      return { content: [{ type: 'text', text: 'bounceid is required' }], isError: true };
    }
    return this.put(`/bounces/${encodeURIComponent(args.bounceid as string)}/activate`);
  }

  // ── Outbound Messages ──────────────────────────────────────────────────────

  private async searchOutboundMessages(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.count === undefined || args.offset === undefined) {
      return { content: [{ type: 'text', text: 'count and offset are required' }], isError: true };
    }
    return this.get('/messages/outbound', args);
  }

  private async getOutboundMessageDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.messageid) {
      return { content: [{ type: 'text', text: 'messageid is required' }], isError: true };
    }
    return this.get(`/messages/outbound/${encodeURIComponent(args.messageid as string)}/details`);
  }

  private async getOutboundMessageDump(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.messageid) {
      return { content: [{ type: 'text', text: 'messageid is required' }], isError: true };
    }
    return this.get(`/messages/outbound/${encodeURIComponent(args.messageid as string)}/dump`);
  }

  private async searchOutboundClicks(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.count === undefined || args.offset === undefined) {
      return { content: [{ type: 'text', text: 'count and offset are required' }], isError: true };
    }
    return this.get('/messages/outbound/clicks', args);
  }

  private async getClicksForMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.messageid || args.count === undefined || args.offset === undefined) {
      return { content: [{ type: 'text', text: 'messageid, count, and offset are required' }], isError: true };
    }
    const { messageid, ...qp } = args;
    return this.get(`/messages/outbound/clicks/${encodeURIComponent(messageid as string)}`, qp);
  }

  private async searchOutboundOpens(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.count === undefined || args.offset === undefined) {
      return { content: [{ type: 'text', text: 'count and offset are required' }], isError: true };
    }
    return this.get('/messages/outbound/opens', args);
  }

  private async getOpensForMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.messageid || args.count === undefined || args.offset === undefined) {
      return { content: [{ type: 'text', text: 'messageid, count, and offset are required' }], isError: true };
    }
    const { messageid, ...qp } = args;
    return this.get(`/messages/outbound/opens/${encodeURIComponent(messageid as string)}`, qp);
  }

  // ── Inbound Messages ───────────────────────────────────────────────────────

  private async searchInboundMessages(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.count === undefined || args.offset === undefined) {
      return { content: [{ type: 'text', text: 'count and offset are required' }], isError: true };
    }
    return this.get('/messages/inbound', args);
  }

  private async getInboundMessageDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.messageid) {
      return { content: [{ type: 'text', text: 'messageid is required' }], isError: true };
    }
    return this.get(`/messages/inbound/${encodeURIComponent(args.messageid as string)}/details`);
  }

  private async bypassInboundRules(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.messageid) {
      return { content: [{ type: 'text', text: 'messageid is required' }], isError: true };
    }
    return this.put(`/messages/inbound/${encodeURIComponent(args.messageid as string)}/bypass`);
  }

  private async retryInboundMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.messageid) {
      return { content: [{ type: 'text', text: 'messageid is required' }], isError: true };
    }
    return this.put(`/messages/inbound/${encodeURIComponent(args.messageid as string)}/retry`);
  }

  // ── Server Configuration ───────────────────────────────────────────────────

  private async getServerConfiguration(): Promise<ToolResult> {
    return this.get('/server');
  }

  private async editServerConfiguration(args: Record<string, unknown>): Promise<ToolResult> {
    return this.put('/server', args as Record<string, unknown>);
  }

  // ── Statistics ─────────────────────────────────────────────────────────────

  private async getOutboundOverviewStats(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/stats/outbound', args);
  }

  private async getBounceCounts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/stats/outbound/bounces', args);
  }

  private async getSentCounts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/stats/outbound/sends', args);
  }

  private async getSpamComplaints(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/stats/outbound/spam', args);
  }

  private async getTrackedEmailCounts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/stats/outbound/tracked', args);
  }

  private async getOpenCounts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/stats/outbound/opens', args);
  }

  private async getOpenCountsByEmailClient(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/stats/outbound/opens/emailclients', args);
  }

  private async getOpenCountsByPlatform(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/stats/outbound/opens/platforms', args);
  }

  private async getClickCounts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/stats/outbound/clicks', args);
  }

  private async getClickCountsByBrowserFamily(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/stats/outbound/clicks/browserfamilies', args);
  }

  private async getClickCountsByPlatform(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/stats/outbound/clicks/platforms', args);
  }

  private async getClickCountsByLocation(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/stats/outbound/clicks/location', args);
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  private async listTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.Count === undefined || args.Offset === undefined) {
      return { content: [{ type: 'text', text: 'Count and Offset are required' }], isError: true };
    }
    return this.get('/templates', { Count: args.Count, Offset: args.Offset });
  }

  private async getTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.templateIdOrAlias) {
      return { content: [{ type: 'text', text: 'templateIdOrAlias is required' }], isError: true };
    }
    return this.get(`/templates/${encodeURIComponent(args.templateIdOrAlias as string)}`);
  }

  private async createTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.Name || !args.Subject) {
      return { content: [{ type: 'text', text: 'Name and Subject are required' }], isError: true };
    }
    return this.post('/templates', args as Record<string, unknown>);
  }

  private async updateTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.templateIdOrAlias) {
      return { content: [{ type: 'text', text: 'templateIdOrAlias is required' }], isError: true };
    }
    const { templateIdOrAlias, ...body } = args;
    return this.put(`/templates/${encodeURIComponent(templateIdOrAlias as string)}`, body as Record<string, unknown>);
  }

  private async deleteTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.templateIdOrAlias) {
      return { content: [{ type: 'text', text: 'templateIdOrAlias is required' }], isError: true };
    }
    return this.del(`/templates/${encodeURIComponent(args.templateIdOrAlias as string)}`);
  }

  private async validateTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/templates/validate', args as Record<string, unknown>);
  }

  // ── Inbound Rules ──────────────────────────────────────────────────────────

  private async listInboundRules(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.count === undefined || args.offset === undefined) {
      return { content: [{ type: 'text', text: 'count and offset are required' }], isError: true };
    }
    return this.get('/triggers/inboundrules', { count: args.count, offset: args.offset });
  }

  private async createInboundRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.Rule) {
      return { content: [{ type: 'text', text: 'Rule is required' }], isError: true };
    }
    return this.post('/triggers/inboundrules', { Rule: args.Rule });
  }

  private async deleteInboundRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.triggerid) {
      return { content: [{ type: 'text', text: 'triggerid is required' }], isError: true };
    }
    return this.del(`/triggers/inboundrules/${encodeURIComponent(args.triggerid as string)}`);
  }
}
