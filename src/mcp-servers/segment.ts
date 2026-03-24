/**
 * Segment MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no official Segment/Twilio MCP server for the Segment CDP product.

import { ToolDefinition, ToolResult } from './types.js';

interface SegmentConfig {
  /** Write Key for the Segment source — used for event ingestion (track, identify, group, page, screen, alias). */
  writeKey: string;
  /** Public API Token (Bearer) — required for workspace management tools (list_sources, list_destinations, etc.).
   *  Generate in Segment App → Settings → Access Management → Tokens. */
  publicApiToken?: string;
  /** Override ingestion base URL. Defaults to https://api.segment.io/v1 */
  ingestionBaseUrl?: string;
  /** Override public API base URL. Defaults to https://api.segmentapis.com */
  publicApiBaseUrl?: string;
}

export class SegmentMCPServer {
  private readonly writeKey: string;
  private readonly publicApiToken: string | undefined;
  private readonly ingestionBaseUrl: string;
  private readonly publicApiBaseUrl: string;

  constructor(config: SegmentConfig) {
    this.writeKey = config.writeKey;
    this.publicApiToken = config.publicApiToken;
    this.ingestionBaseUrl = config.ingestionBaseUrl ?? 'https://api.segment.io/v1';
    this.publicApiBaseUrl = config.publicApiBaseUrl ?? 'https://api.segmentapis.com';
  }

  private get writeKeyAuthHeader(): string {
    const encoded = Buffer.from(`${this.writeKey}:`).toString('base64');
    return `Basic ${encoded}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'track',
        description: 'Record a user action (event) via the Segment HTTP Tracking API. Requires either userId or anonymousId.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Unique identifier for the authenticated user',
            },
            anonymousId: {
              type: 'string',
              description: 'Unique identifier for an anonymous or unauthenticated user',
            },
            event: {
              type: 'string',
              description: 'Name of the action the user performed (e.g. "Order Completed")',
            },
            properties: {
              type: 'object',
              description: 'Free-form dictionary of properties for the event (e.g. revenue, product name, category)',
            },
            timestamp: {
              type: 'string',
              description: 'ISO 8601 timestamp for when the event occurred. Defaults to server time if omitted.',
            },
            context: {
              type: 'object',
              description: 'Optional context object (e.g. { "ip": "...", "locale": "en-US", "page": { "url": "..." } })',
            },
            integrations: {
              type: 'object',
              description: 'Optional integrations object to selectively enable/disable destinations',
            },
          },
          required: ['event'],
        },
      },
      {
        name: 'identify',
        description: 'Associate a user with their actions and record traits via the Segment HTTP Tracking API.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Unique identifier for the authenticated user',
            },
            anonymousId: {
              type: 'string',
              description: 'Unique identifier for an anonymous user',
            },
            traits: {
              type: 'object',
              description: 'Dictionary of user traits (e.g. email, name, plan, createdAt)',
            },
            timestamp: {
              type: 'string',
              description: 'ISO 8601 timestamp. Defaults to server time if omitted.',
            },
            context: {
              type: 'object',
              description: 'Optional context object',
            },
          },
        },
      },
      {
        name: 'group',
        description: 'Associate a user with a group (e.g. company or organization) and record group traits.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Unique identifier for the user being associated with the group',
            },
            anonymousId: {
              type: 'string',
              description: 'Anonymous identifier if the user is not authenticated',
            },
            groupId: {
              type: 'string',
              description: 'Unique identifier for the group (e.g. company ID)',
            },
            traits: {
              type: 'object',
              description: 'Dictionary of group traits (e.g. name, industry, employees, plan)',
            },
            timestamp: {
              type: 'string',
              description: 'ISO 8601 timestamp. Defaults to server time if omitted.',
            },
            context: {
              type: 'object',
              description: 'Optional context object',
            },
          },
          required: ['groupId'],
        },
      },
      {
        name: 'page',
        description: 'Record a page view in a web application.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Unique identifier for the authenticated user',
            },
            anonymousId: {
              type: 'string',
              description: 'Anonymous identifier',
            },
            name: {
              type: 'string',
              description: 'Name of the page (e.g. "Home", "Pricing", "Checkout")',
            },
            properties: {
              type: 'object',
              description: 'Properties of the page (e.g. url, title, referrer, path)',
            },
            timestamp: {
              type: 'string',
              description: 'ISO 8601 timestamp. Defaults to server time if omitted.',
            },
            context: {
              type: 'object',
              description: 'Optional context object',
            },
          },
        },
      },
      {
        name: 'batch',
        description: 'Send multiple Segment calls in a single request (up to 500 KB total, max 2500 events, each event < 32 KB).',
        inputSchema: {
          type: 'object',
          properties: {
            batch: {
              type: 'array',
              description: 'Array of Segment call objects. Each object must have a "type" field (track, identify, group, page, screen, or alias) and the corresponding required fields.',
              items: { type: 'object' },
            },
            context: {
              type: 'object',
              description: 'Optional top-level context applied to all events in the batch',
            },
          },
          required: ['batch'],
        },
      },
      {
        name: 'list_sources',
        description: 'List all sources in the Segment workspace via the Public API. Requires publicApiToken.',
        inputSchema: {
          type: 'object',
          properties: {
            pagination_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response for fetching the next page',
            },
            pagination_count: {
              type: 'number',
              description: 'Number of sources to return per page (default: 10)',
            },
          },
        },
      },
      {
        name: 'list_destinations',
        description: 'List all destinations in the Segment workspace via the Public API. Requires publicApiToken.',
        inputSchema: {
          type: 'object',
          properties: {
            pagination_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            pagination_count: {
              type: 'number',
              description: 'Number of destinations to return per page (default: 10)',
            },
          },
        },
      },
    ];
  }

  private async postIngestion(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await fetch(`${this.ingestionBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: this.writeKeyAuthHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Segment ingestion failed: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Segment returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'track': {
          const event = args.event as string;
          if (!event) {
            return { content: [{ type: 'text', text: 'event is required' }], isError: true };
          }
          if (!args.userId && !args.anonymousId) {
            return { content: [{ type: 'text', text: 'Either userId or anonymousId is required' }], isError: true };
          }

          const body: Record<string, unknown> = { type: 'track', event };
          if (args.userId) body.userId = args.userId;
          if (args.anonymousId) body.anonymousId = args.anonymousId;
          if (args.properties) body.properties = args.properties;
          if (args.timestamp) body.timestamp = args.timestamp;
          if (args.context) body.context = args.context;
          if (args.integrations) body.integrations = args.integrations;

          return this.postIngestion('/track', body);
        }

        case 'identify': {
          if (!args.userId && !args.anonymousId) {
            return { content: [{ type: 'text', text: 'Either userId or anonymousId is required' }], isError: true };
          }

          const body: Record<string, unknown> = { type: 'identify' };
          if (args.userId) body.userId = args.userId;
          if (args.anonymousId) body.anonymousId = args.anonymousId;
          if (args.traits) body.traits = args.traits;
          if (args.timestamp) body.timestamp = args.timestamp;
          if (args.context) body.context = args.context;

          return this.postIngestion('/identify', body);
        }

        case 'group': {
          const groupId = args.groupId as string;
          if (!groupId) {
            return { content: [{ type: 'text', text: 'groupId is required' }], isError: true };
          }
          if (!args.userId && !args.anonymousId) {
            return { content: [{ type: 'text', text: 'Either userId or anonymousId is required' }], isError: true };
          }

          const body: Record<string, unknown> = { type: 'group', groupId };
          if (args.userId) body.userId = args.userId;
          if (args.anonymousId) body.anonymousId = args.anonymousId;
          if (args.traits) body.traits = args.traits;
          if (args.timestamp) body.timestamp = args.timestamp;
          if (args.context) body.context = args.context;

          return this.postIngestion('/group', body);
        }

        case 'page': {
          if (!args.userId && !args.anonymousId) {
            return { content: [{ type: 'text', text: 'Either userId or anonymousId is required' }], isError: true };
          }

          const body: Record<string, unknown> = { type: 'page' };
          if (args.userId) body.userId = args.userId;
          if (args.anonymousId) body.anonymousId = args.anonymousId;
          if (args.name) body.name = args.name;
          if (args.properties) body.properties = args.properties;
          if (args.timestamp) body.timestamp = args.timestamp;
          if (args.context) body.context = args.context;

          return this.postIngestion('/page', body);
        }

        case 'batch': {
          const batch = args.batch as unknown[];
          if (!batch || !Array.isArray(batch) || batch.length === 0) {
            return { content: [{ type: 'text', text: 'batch array is required and must be non-empty' }], isError: true };
          }

          const body: Record<string, unknown> = { batch };
          if (args.context) body.context = args.context;

          return this.postIngestion('/batch', body);
        }

        case 'list_sources': {
          if (!this.publicApiToken) {
            return { content: [{ type: 'text', text: 'publicApiToken is required for list_sources' }], isError: true };
          }

          let url = `${this.publicApiBaseUrl}/sources`;
          const params: string[] = [];
          if (args.pagination_cursor) params.push(`pagination[cursor]=${encodeURIComponent(args.pagination_cursor as string)}`);
          if (args.pagination_count) params.push(`pagination[count]=${args.pagination_count as number}`);
          if (params.length > 0) url += `?${params.join('&')}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${this.publicApiToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list sources: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Segment returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_destinations': {
          if (!this.publicApiToken) {
            return { content: [{ type: 'text', text: 'publicApiToken is required for list_destinations' }], isError: true };
          }

          let url = `${this.publicApiBaseUrl}/destinations`;
          const params: string[] = [];
          if (args.pagination_cursor) params.push(`pagination[cursor]=${encodeURIComponent(args.pagination_cursor as string)}`);
          if (args.pagination_count) params.push(`pagination[count]=${args.pagination_count as number}`);
          if (params.length > 0) url += `?${params.join('&')}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${this.publicApiToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list destinations: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Segment returned non-JSON response (HTTP ${response.status})`); }
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
