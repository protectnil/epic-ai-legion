/**
 * Mixpanel MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no official MCP server from the Mixpanel GitHub organization.

import { ToolDefinition, ToolResult } from './types.js';

interface MixpanelConfig {
  projectToken: string;
  serviceAccountUsername: string;
  serviceAccountSecret: string;
  /** Project ID — required for analytics query endpoints (query API uses project_id, not token). */
  projectId: string;
  /** Override ingestion base URL. Defaults to https://api.mixpanel.com
   *  EU residency: https://api-eu.mixpanel.com */
  ingestionBaseUrl?: string;
  /** Override analytics base URL. Defaults to https://mixpanel.com/api/2.0 */
  analyticsBaseUrl?: string;
}

export class MixpanelMCPServer {
  private readonly projectToken: string;
  private readonly serviceAccountUsername: string;
  private readonly serviceAccountSecret: string;
  private readonly projectId: string;
  private readonly ingestionBaseUrl: string;
  private readonly analyticsBaseUrl: string;

  constructor(config: MixpanelConfig) {
    this.projectToken = config.projectToken;
    this.serviceAccountUsername = config.serviceAccountUsername;
    this.serviceAccountSecret = config.serviceAccountSecret;
    this.projectId = config.projectId;
    this.ingestionBaseUrl = config.ingestionBaseUrl ?? 'https://api.mixpanel.com';
    this.analyticsBaseUrl = config.analyticsBaseUrl ?? 'https://mixpanel.com/api/2.0';
  }

  private get basicAuthHeader(): string {
    const encoded = Buffer.from(`${this.serviceAccountUsername}:${this.serviceAccountSecret}`).toString('base64');
    return `Basic ${encoded}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'track_event',
        description: 'Track a single event via the Mixpanel ingestion API (/track). Only accepts events timestamped within the last 5 days. Use import_events for historical data.',
        inputSchema: {
          type: 'object',
          properties: {
            event: {
              type: 'string',
              description: 'Name of the event to track',
            },
            distinct_id: {
              type: 'string',
              description: 'Unique identifier for the user performing the event',
            },
            properties: {
              type: 'object',
              description: 'Additional event properties. The token is injected automatically. Optional standard fields: $insert_id (deduplication), time (Unix seconds), ip, $city, $region, $country_code.',
            },
          },
          required: ['event', 'distinct_id'],
        },
      },
      {
        name: 'import_events',
        description: 'Bulk-import historical events via the Mixpanel /import endpoint. Accepts events of any age. Authenticated with service account credentials. Max 2000 events per request.',
        inputSchema: {
          type: 'object',
          properties: {
            events: {
              type: 'array',
              description: 'Array of event objects. Each must have: event (string), properties.distinct_id (string), properties.time (Unix seconds), properties.token (auto-injected if omitted).',
              items: { type: 'object' },
            },
          },
          required: ['events'],
        },
      },
      {
        name: 'set_user_profile',
        description: 'Set or update properties on a user profile via the Mixpanel /engage endpoint ($set operation).',
        inputSchema: {
          type: 'object',
          properties: {
            distinct_id: {
              type: 'string',
              description: 'User identifier',
            },
            properties: {
              type: 'object',
              description: 'Profile properties to set (e.g. $name, $email, $phone, $first_name, $last_name, or custom properties)',
            },
            ip: {
              type: 'string',
              description: 'Optional IP address for geo-resolution',
            },
          },
          required: ['distinct_id', 'properties'],
        },
      },
      {
        name: 'increment_user_property',
        description: 'Numerically increment one or more user profile properties via the Mixpanel /engage endpoint ($add operation).',
        inputSchema: {
          type: 'object',
          properties: {
            distinct_id: {
              type: 'string',
              description: 'User identifier',
            },
            add: {
              type: 'object',
              description: 'Object mapping property names to numeric increment values (positive or negative)',
            },
          },
          required: ['distinct_id', 'add'],
        },
      },
      {
        name: 'query_segmentation',
        description: 'Run an event segmentation query against the Mixpanel analytics API — returns time series data for an event or expression.',
        inputSchema: {
          type: 'object',
          properties: {
            event: {
              type: 'string',
              description: 'Name of the event to analyze',
            },
            from_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            to_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            type: {
              type: 'string',
              description: 'Count type: general (event counts, default), unique (distinct user count), average, or median',
            },
            unit: {
              type: 'string',
              description: 'Time unit for bucketing: minute, hour, day (default), week, or month',
            },
            on: {
              type: 'string',
              description: 'Property expression to segment by, e.g. properties["plan"]',
            },
            where: {
              type: 'string',
              description: 'Filter expression, e.g. properties["$country_code"] == "US"',
            },
            limit: {
              type: 'number',
              description: 'Max number of segment values to return (default: 255)',
            },
          },
          required: ['event', 'from_date', 'to_date'],
        },
      },
      {
        name: 'query_funnel',
        description: 'Query a Mixpanel funnel by funnel ID to retrieve conversion rates and step-by-step drop-off.',
        inputSchema: {
          type: 'object',
          properties: {
            funnel_id: {
              type: 'number',
              description: 'Numeric funnel ID from the Mixpanel dashboard',
            },
            from_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            to_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            unit: {
              type: 'string',
              description: 'Time unit: day (default), week, or month',
            },
            on: {
              type: 'string',
              description: 'Property to segment the funnel by (optional)',
            },
            where: {
              type: 'string',
              description: 'Filter expression (optional)',
            },
          },
          required: ['funnel_id', 'from_date', 'to_date'],
        },
      },
      {
        name: 'query_retention',
        description: 'Query Mixpanel retention — returns the percentage of users who returned after performing a "born" event.',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            to_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            born_event: {
              type: 'string',
              description: 'Event that defines the user cohort (the "born" event)',
            },
            event: {
              type: 'string',
              description: 'Return event to measure. If omitted, defaults to any event (null).',
            },
            retention_type: {
              type: 'string',
              description: 'Type of retention: birth (default) or compounded',
            },
            unit: {
              type: 'string',
              description: 'Time unit: day (default), week, or month',
            },
          },
          required: ['from_date', 'to_date', 'born_event'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'track_event': {
          const event = args.event as string;
          const distinct_id = args.distinct_id as string;
          if (!event || !distinct_id) {
            return { content: [{ type: 'text', text: 'event and distinct_id are required' }], isError: true };
          }

          const properties: Record<string, unknown> = {
            token: this.projectToken,
            distinct_id,
            ...(args.properties as Record<string, unknown> ?? {}),
          };

          const payload = [{ event, properties }];
          const body = `data=${encodeURIComponent(JSON.stringify(payload))}`;

          const response = await fetch(`${this.ingestionBaseUrl}/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
            body,
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to track event: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mixpanel returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'import_events': {
          const events = args.events as unknown[];
          if (!events || !Array.isArray(events) || events.length === 0) {
            return { content: [{ type: 'text', text: 'events array is required and must be non-empty' }], isError: true };
          }

          const enriched = events.map((ev: unknown) => {
            const e = ev as Record<string, unknown>;
            const props = (e.properties as Record<string, unknown>) ?? {};
            if (!props.token) props.token = this.projectToken;
            return { ...e, properties: props };
          });

          const url = `${this.ingestionBaseUrl}/import?project_id=${encodeURIComponent(this.projectId)}`;

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: this.basicAuthHeader,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(enriched),
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to import events: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mixpanel returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'set_user_profile': {
          const distinct_id = args.distinct_id as string;
          const properties = args.properties as Record<string, unknown>;
          if (!distinct_id || !properties) {
            return { content: [{ type: 'text', text: 'distinct_id and properties are required' }], isError: true };
          }

          const record: Record<string, unknown> = {
            $token: this.projectToken,
            $distinct_id: distinct_id,
            $set: properties,
          };
          if (args.ip) record.$ip = args.ip;

          const body = `data=${encodeURIComponent(JSON.stringify(record))}`;

          const response = await fetch(`${this.ingestionBaseUrl}/engage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
            body,
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to set user profile: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mixpanel returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'increment_user_property': {
          const distinct_id = args.distinct_id as string;
          const add = args.add as Record<string, unknown>;
          if (!distinct_id || !add) {
            return { content: [{ type: 'text', text: 'distinct_id and add are required' }], isError: true };
          }

          const record = {
            $token: this.projectToken,
            $distinct_id: distinct_id,
            $add: add,
          };

          const body = `data=${encodeURIComponent(JSON.stringify(record))}`;

          const response = await fetch(`${this.ingestionBaseUrl}/engage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
            body,
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to increment user property: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mixpanel returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'query_segmentation': {
          const event = args.event as string;
          const from_date = args.from_date as string;
          const to_date = args.to_date as string;
          if (!event || !from_date || !to_date) {
            return { content: [{ type: 'text', text: 'event, from_date, and to_date are required' }], isError: true };
          }

          let url = `${this.analyticsBaseUrl}/segmentation?project_id=${encodeURIComponent(this.projectId)}&event=${encodeURIComponent(event)}&from_date=${encodeURIComponent(from_date)}&to_date=${encodeURIComponent(to_date)}`;
          if (args.type) url += `&type=${encodeURIComponent(args.type as string)}`;
          if (args.unit) url += `&unit=${encodeURIComponent(args.unit as string)}`;
          if (args.on) url += `&on=${encodeURIComponent(args.on as string)}`;
          if (args.where) url += `&where=${encodeURIComponent(args.where as string)}`;
          if (args.limit) url += `&limit=${args.limit as number}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: { Authorization: this.basicAuthHeader, Accept: 'application/json' },
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to query segmentation: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mixpanel returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'query_funnel': {
          const funnel_id = args.funnel_id as number;
          const from_date = args.from_date as string;
          const to_date = args.to_date as string;
          if (!funnel_id || !from_date || !to_date) {
            return { content: [{ type: 'text', text: 'funnel_id, from_date, and to_date are required' }], isError: true };
          }

          let url = `${this.analyticsBaseUrl}/funnels?project_id=${encodeURIComponent(this.projectId)}&funnel_id=${funnel_id}&from_date=${encodeURIComponent(from_date)}&to_date=${encodeURIComponent(to_date)}`;
          if (args.unit) url += `&unit=${encodeURIComponent(args.unit as string)}`;
          if (args.on) url += `&on=${encodeURIComponent(args.on as string)}`;
          if (args.where) url += `&where=${encodeURIComponent(args.where as string)}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: { Authorization: this.basicAuthHeader, Accept: 'application/json' },
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to query funnel: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mixpanel returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'query_retention': {
          const from_date = args.from_date as string;
          const to_date = args.to_date as string;
          const born_event = args.born_event as string;
          if (!from_date || !to_date || !born_event) {
            return { content: [{ type: 'text', text: 'from_date, to_date, and born_event are required' }], isError: true };
          }

          let url = `${this.analyticsBaseUrl}/retention?project_id=${encodeURIComponent(this.projectId)}&from_date=${encodeURIComponent(from_date)}&to_date=${encodeURIComponent(to_date)}&born_event=${encodeURIComponent(born_event)}`;
          if (args.event) url += `&event=${encodeURIComponent(args.event as string)}`;
          if (args.retention_type) url += `&retention_type=${encodeURIComponent(args.retention_type as string)}`;
          if (args.unit) url += `&unit=${encodeURIComponent(args.unit as string)}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: { Authorization: this.basicAuthHeader, Accept: 'application/json' },
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to query retention: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mixpanel returned non-JSON response (HTTP ${response.status})`); }
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
