/**
 * Amplitude MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/amplitude/mcp-server-guide — hosted-only (requires Amplitude AI subscription, OAuth-gated). Our adapter serves the REST API key / Basic auth use case for self-hosted and air-gapped deployments.

import { ToolDefinition, ToolResult } from './types.js';

interface AmplitudeConfig {
  apiKey: string;
  secretKey: string;
  /** Override ingestion base URL. Defaults to https://api2.amplitude.com/2/httpapi (US).
   *  EU residency: https://api.eu.amplitude.com/2/httpapi */
  ingestionBaseUrl?: string;
  /** Override analytics base URL. Defaults to https://amplitude.com/api/2 (US).
   *  EU residency: https://analytics.eu.amplitude.com/api/2 */
  analyticsBaseUrl?: string;
}

export class AmplitudeMCPServer {
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly ingestionBaseUrl: string;
  private readonly analyticsBaseUrl: string;

  constructor(config: AmplitudeConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.ingestionBaseUrl = config.ingestionBaseUrl ?? 'https://api2.amplitude.com/2/httpapi';
    this.analyticsBaseUrl = config.analyticsBaseUrl ?? 'https://amplitude.com/api/2';
  }

  private get basicAuthHeader(): string {
    const encoded = Buffer.from(`${this.apiKey}:${this.secretKey}`).toString('base64');
    return `Basic ${encoded}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'track_events',
        description: 'Send one or more events to Amplitude via the HTTP V2 ingestion API. Accepts up to 2000 events per request (keep under 1 MB). Events older than 5 days should use import_events instead.',
        inputSchema: {
          type: 'object',
          properties: {
            events: {
              type: 'array',
              description: 'Array of event objects. Each event must have event_type and either user_id or device_id. Optional fields: event_properties, user_properties, time (Unix ms), session_id, insert_id, ip, country, city, language, platform, os_name, os_version, device_model.',
              items: { type: 'object' },
            },
            options: {
              type: 'object',
              description: 'Optional upload options, e.g. { "min_id_length": 1 }',
            },
          },
          required: ['events'],
        },
      },
      {
        name: 'get_active_users',
        description: 'Query the Amplitude Dashboard REST API for active user counts over a date range.',
        inputSchema: {
          type: 'object',
          properties: {
            start: {
              type: 'string',
              description: 'Start date in YYYYMMDD format (e.g. 20240101)',
            },
            end: {
              type: 'string',
              description: 'End date in YYYYMMDD format (e.g. 20240131)',
            },
            m: {
              type: 'string',
              description: 'Metric to return: active (default), new, or average',
            },
            i: {
              type: 'number',
              description: 'Interval in days for bucketing results (1, 7, or 30)',
            },
          },
          required: ['start', 'end'],
        },
      },
      {
        name: 'get_event_segmentation',
        description: 'Run an event segmentation query — returns a time series of event counts or unique user counts for a given event type.',
        inputSchema: {
          type: 'object',
          properties: {
            e: {
              type: 'object',
              description: 'Event object specifying the event type, e.g. { "event_type": "Button Clicked" }',
            },
            start: {
              type: 'string',
              description: 'Start date in YYYYMMDD format',
            },
            end: {
              type: 'string',
              description: 'End date in YYYYMMDD format',
            },
            m: {
              type: 'string',
              description: 'Metric: totals (default), uniques, average, pct_dau, or formula',
            },
            i: {
              type: 'number',
              description: 'Interval in days (1, 7, or 30)',
            },
            s: {
              type: 'array',
              description: 'Array of segment filters (optional)',
              items: { type: 'object' },
            },
            g: {
              type: 'array',
              description: 'Array of group-by properties (optional)',
              items: { type: 'object' },
            },
            limit: {
              type: 'number',
              description: 'Max number of group-by values to return (default: 100)',
            },
          },
          required: ['e', 'start', 'end'],
        },
      },
      {
        name: 'get_funnel',
        description: 'Query a conversion funnel to see how users progress through a sequence of events.',
        inputSchema: {
          type: 'object',
          properties: {
            e: {
              type: 'array',
              description: 'Array of funnel step event objects (minimum 2), each with an event_type field',
              items: { type: 'object' },
            },
            start: {
              type: 'string',
              description: 'Start date in YYYYMMDD format',
            },
            end: {
              type: 'string',
              description: 'End date in YYYYMMDD format',
            },
            converted_within: {
              type: 'number',
              description: 'Conversion window in seconds (e.g. 86400 for 1 day)',
            },
            s: {
              type: 'array',
              description: 'Optional segment filter array',
              items: { type: 'object' },
            },
          },
          required: ['e', 'start', 'end'],
        },
      },
      {
        name: 'get_retention',
        description: 'Query retention analysis — returns the percentage of users who return after an initial action.',
        inputSchema: {
          type: 'object',
          properties: {
            se: {
              type: 'object',
              description: 'Starting event object, e.g. { "event_type": "Sign Up" }',
            },
            re: {
              type: 'object',
              description: 'Return event object, e.g. { "event_type": "any" } for any event',
            },
            start: {
              type: 'string',
              description: 'Start date in YYYYMMDD format',
            },
            end: {
              type: 'string',
              description: 'End date in YYYYMMDD format',
            },
            retention_type: {
              type: 'string',
              description: 'Type of retention: n-day (default) or unbounded',
            },
            i: {
              type: 'number',
              description: 'Interval in days (1, 7, or 30)',
            },
          },
          required: ['se', 're', 'start', 'end'],
        },
      },
      {
        name: 'get_user_activity',
        description: 'Retrieve the full event stream for a specific user by their Amplitude user ID.',
        inputSchema: {
          type: 'object',
          properties: {
            user: {
              type: 'string',
              description: 'Amplitude user ID (the internal numeric id, not the customer user_id)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 1000)',
            },
          },
          required: ['user'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'track_events': {
          const events = args.events as unknown[];
          if (!events || !Array.isArray(events) || events.length === 0) {
            return { content: [{ type: 'text', text: 'events array is required and must be non-empty' }], isError: true };
          }

          const body: Record<string, unknown> = {
            api_key: this.apiKey,
            events,
          };
          if (args.options) body.options = args.options;

          const response = await fetch(this.ingestionBaseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to track events: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Amplitude returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_active_users': {
          const start = args.start as string;
          const end = args.end as string;
          if (!start || !end) {
            return { content: [{ type: 'text', text: 'start and end are required' }], isError: true };
          }

          let url = `${this.analyticsBaseUrl}/users?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
          if (args.m) url += `&m=${encodeURIComponent(args.m as string)}`;
          if (args.i) url += `&i=${args.i as number}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: { Authorization: this.basicAuthHeader },
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get active users: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Amplitude returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_event_segmentation': {
          const e = args.e as object;
          const start = args.start as string;
          const end = args.end as string;
          if (!e || !start || !end) {
            return { content: [{ type: 'text', text: 'e, start, and end are required' }], isError: true };
          }

          let url = `${this.analyticsBaseUrl}/events/segmentation?e=${encodeURIComponent(JSON.stringify(e))}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
          if (args.m) url += `&m=${encodeURIComponent(args.m as string)}`;
          if (args.i) url += `&i=${args.i as number}`;
          if (args.s) url += `&s=${encodeURIComponent(JSON.stringify(args.s))}`;
          if (args.g) url += `&g=${encodeURIComponent(JSON.stringify(args.g))}`;
          if (args.limit) url += `&limit=${args.limit as number}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: { Authorization: this.basicAuthHeader },
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get event segmentation: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Amplitude returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_funnel': {
          const e = args.e as object[];
          const start = args.start as string;
          const end = args.end as string;
          if (!e || !Array.isArray(e) || e.length < 2 || !start || !end) {
            return { content: [{ type: 'text', text: 'e (array of at least 2 events), start, and end are required' }], isError: true };
          }

          let url = `${this.analyticsBaseUrl}/funnels?e=${encodeURIComponent(JSON.stringify(e))}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
          if (args.converted_within) url += `&converted_within=${args.converted_within as number}`;
          if (args.s) url += `&s=${encodeURIComponent(JSON.stringify(args.s))}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: { Authorization: this.basicAuthHeader },
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get funnel: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Amplitude returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_retention': {
          const se = args.se as object;
          const re = args.re as object;
          const start = args.start as string;
          const end = args.end as string;
          if (!se || !re || !start || !end) {
            return { content: [{ type: 'text', text: 'se, re, start, and end are required' }], isError: true };
          }

          let url = `${this.analyticsBaseUrl}/retention?se=${encodeURIComponent(JSON.stringify(se))}&re=${encodeURIComponent(JSON.stringify(re))}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
          if (args.retention_type) url += `&retention_type=${encodeURIComponent(args.retention_type as string)}`;
          if (args.i) url += `&i=${args.i as number}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: { Authorization: this.basicAuthHeader },
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get retention: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Amplitude returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_user_activity': {
          const user = args.user as string;
          if (!user) {
            return { content: [{ type: 'text', text: 'user is required' }], isError: true };
          }

          let url = `${this.analyticsBaseUrl}/useractivity?user=${encodeURIComponent(user)}`;
          if (args.limit) url += `&limit=${args.limit as number}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: { Authorization: this.basicAuthHeader },
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get user activity: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Amplitude returned non-JSON response (HTTP ${response.status})`); }
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
