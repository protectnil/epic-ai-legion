/**
 * Opsgenie MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — community implementations exist (giantswarm/mcp-opsgenie,
// burakdirin/mcp-opsgenie, daviddykeuk/opsgenie-mcp) but no official Atlassian-published
// MCP server. This adapter covers the API-key / bearer-token self-hosted use case.
// Note: Atlassian has announced end-of-sale for Opsgenie; customers may migrate to
// Jira Service Management (see jira-service-management.ts).

import { ToolDefinition, ToolResult } from './types.js';

interface OpsgenieConfig {
  apiKey: string;
  /** Override base URL for EU instance: https://api.eu.opsgenie.com */
  baseUrl?: string;
}

export class OpsgenieMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: OpsgenieConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.opsgenie.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alerts',
        description: 'List alerts in Opsgenie with optional query filtering, sorting, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to filter alerts (e.g. "status: open AND priority: P1")',
            },
            offset: {
              type: 'number',
              description: 'Start index of the result set (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (max 100, default: 20)',
            },
            sort: {
              type: 'string',
              description: 'Field to sort by: createdAt, updatedAt, tinyId, alias, message, status, acknowledged, isSeen, snoozed, count, lastOccurredAt, source, owner, priority',
            },
            order: {
              type: 'string',
              description: 'Sort order: asc or desc (default: desc)',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get details of a specific Opsgenie alert by its identifier',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Alert ID, tiny ID, or alias',
            },
            identifierType: {
              type: 'string',
              description: 'Type of identifier: id, tiny, or alias (default: id)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'create_alert',
        description: 'Create a new alert in Opsgenie',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Alert message/title (required, max 130 characters)',
            },
            alias: {
              type: 'string',
              description: 'Unique client-defined identifier for deduplication (max 512 characters)',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the alert',
            },
            priority: {
              type: 'string',
              description: 'Alert priority: P1, P2, P3, P4, or P5 (default: P3)',
            },
            tags: {
              type: 'array',
              description: 'Array of tag strings for the alert',
              items: { type: 'string' },
            },
            entity: {
              type: 'string',
              description: 'Domain of the alert, e.g. server name or application',
            },
            source: {
              type: 'string',
              description: 'Source/origin of the alert',
            },
            note: {
              type: 'string',
              description: 'Additional note to attach to the alert at creation time',
            },
          },
          required: ['message'],
        },
      },
      {
        name: 'acknowledge_alert',
        description: 'Acknowledge an Opsgenie alert. The request is processed asynchronously and returns HTTP 202.',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Alert ID, tiny ID, or alias',
            },
            identifierType: {
              type: 'string',
              description: 'Type of identifier: id, tiny, or alias (default: id)',
            },
            note: {
              type: 'string',
              description: 'Optional note to attach when acknowledging',
            },
            source: {
              type: 'string',
              description: 'Source of the acknowledge action',
            },
            user: {
              type: 'string',
              description: 'Display name of the user acknowledging the alert',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'close_alert',
        description: 'Close an Opsgenie alert. The request is processed asynchronously and returns HTTP 202.',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Alert ID, tiny ID, or alias',
            },
            identifierType: {
              type: 'string',
              description: 'Type of identifier: id, tiny, or alias (default: id)',
            },
            note: {
              type: 'string',
              description: 'Optional note to attach when closing',
            },
            source: {
              type: 'string',
              description: 'Source of the close action',
            },
            user: {
              type: 'string',
              description: 'Display name of the user closing the alert',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'add_alert_note',
        description: 'Add a note to an existing Opsgenie alert',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Alert ID, tiny ID, or alias',
            },
            identifierType: {
              type: 'string',
              description: 'Type of identifier: id, tiny, or alias (default: id)',
            },
            note: {
              type: 'string',
              description: 'Note text to add to the alert (required)',
            },
            source: {
              type: 'string',
              description: 'Source of the note',
            },
            user: {
              type: 'string',
              description: 'Display name of the user adding the note',
            },
          },
          required: ['identifier', 'note'],
        },
      },
      {
        name: 'list_schedules',
        description: 'List all on-call schedules in Opsgenie',
        inputSchema: {
          type: 'object',
          properties: {
            expand: {
              type: 'string',
              description: 'Comma-separated list of fields to expand: rotation',
            },
          },
        },
      },
      {
        name: 'get_on_call',
        description: 'Get current on-call participants for a specific Opsgenie schedule',
        inputSchema: {
          type: 'object',
          properties: {
            scheduleIdentifier: {
              type: 'string',
              description: 'Schedule name or ID (required)',
            },
            scheduleIdentifierType: {
              type: 'string',
              description: 'Type of schedule identifier: id or name (default: id)',
            },
            flat: {
              type: 'boolean',
              description: 'When true, returns a flat list of on-call participants rather than grouped by rotation',
            },
          },
          required: ['scheduleIdentifier'],
        },
      },
      {
        name: 'list_incidents',
        description: 'List Opsgenie incidents with optional query filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to filter incidents (e.g. "status: open")',
            },
            offset: {
              type: 'number',
              description: 'Start index of the result set (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (max 100, default: 20)',
            },
            sort: {
              type: 'string',
              description: 'Field to sort by: createdAt, updatedAt, or tinyId',
            },
            order: {
              type: 'string',
              description: 'Sort order: asc or desc (default: desc)',
            },
          },
        },
      },
      {
        name: 'create_incident',
        description: 'Create a new incident in Opsgenie',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Incident message/title (required)',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the incident',
            },
            priority: {
              type: 'string',
              description: 'Incident priority: P1, P2, P3, P4, or P5 (default: P3)',
            },
            tags: {
              type: 'array',
              description: 'Array of tag strings',
              items: { type: 'string' },
            },
          },
          required: ['message'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `GenieKey ${this.apiKey}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_alerts': {
          const params = new URLSearchParams();
          if (args.query) params.set('query', args.query as string);
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          if (args.sort) params.set('sort', args.sort as string);
          if (args.order) params.set('order', args.order as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/v2/alerts${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list alerts: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Opsgenie returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_alert': {
          const identifier = args.identifier as string;
          if (!identifier) {
            return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.identifierType) params.set('identifierType', args.identifierType as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/v2/alerts/${encodeURIComponent(identifier)}${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get alert: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Opsgenie returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_alert': {
          const message = args.message as string;
          if (!message) {
            return { content: [{ type: 'text', text: 'message is required' }], isError: true };
          }

          const body: Record<string, unknown> = { message };
          if (args.alias) body.alias = args.alias;
          if (args.description) body.description = args.description;
          if (args.priority) body.priority = args.priority;
          if (args.tags) body.tags = args.tags;
          if (args.entity) body.entity = args.entity;
          if (args.source) body.source = args.source;
          if (args.note) body.note = args.note;

          const response = await fetch(`${this.baseUrl}/v2/alerts`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create alert: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Opsgenie returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'acknowledge_alert': {
          const identifier = args.identifier as string;
          if (!identifier) {
            return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.identifierType) params.set('identifierType', args.identifierType as string);

          const body: Record<string, unknown> = {};
          if (args.note) body.note = args.note;
          if (args.source) body.source = args.source;
          if (args.user) body.user = args.user;

          const qs = params.toString();
          const url = `${this.baseUrl}/v2/alerts/${encodeURIComponent(identifier)}/acknowledge${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to acknowledge alert: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Opsgenie returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'close_alert': {
          const identifier = args.identifier as string;
          if (!identifier) {
            return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.identifierType) params.set('identifierType', args.identifierType as string);

          const body: Record<string, unknown> = {};
          if (args.note) body.note = args.note;
          if (args.source) body.source = args.source;
          if (args.user) body.user = args.user;

          const qs = params.toString();
          const url = `${this.baseUrl}/v2/alerts/${encodeURIComponent(identifier)}/close${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to close alert: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Opsgenie returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'add_alert_note': {
          const identifier = args.identifier as string;
          const note = args.note as string;
          if (!identifier || !note) {
            return { content: [{ type: 'text', text: 'identifier and note are required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.identifierType) params.set('identifierType', args.identifierType as string);

          const body: Record<string, unknown> = { note };
          if (args.source) body.source = args.source;
          if (args.user) body.user = args.user;

          const qs = params.toString();
          const url = `${this.baseUrl}/v2/alerts/${encodeURIComponent(identifier)}/notes${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to add note: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Opsgenie returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_schedules': {
          const params = new URLSearchParams();
          if (args.expand) params.set('expand', args.expand as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/v2/schedules${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list schedules: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Opsgenie returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_on_call': {
          const scheduleIdentifier = args.scheduleIdentifier as string;
          if (!scheduleIdentifier) {
            return { content: [{ type: 'text', text: 'scheduleIdentifier is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.scheduleIdentifierType) params.set('scheduleIdentifierType', args.scheduleIdentifierType as string);
          if (typeof args.flat === 'boolean') params.set('flat', String(args.flat));

          const qs = params.toString();
          const url = `${this.baseUrl}/v2/schedules/${encodeURIComponent(scheduleIdentifier)}/on-calls${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get on-call: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Opsgenie returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_incidents': {
          const params = new URLSearchParams();
          if (args.query) params.set('query', args.query as string);
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          if (args.sort) params.set('sort', args.sort as string);
          if (args.order) params.set('order', args.order as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/v1/incidents${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list incidents: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Opsgenie returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_incident': {
          const message = args.message as string;
          if (!message) {
            return { content: [{ type: 'text', text: 'message is required' }], isError: true };
          }

          const body: Record<string, unknown> = { message };
          if (args.description) body.description = args.description;
          if (args.priority) body.priority = args.priority;
          if (args.tags) body.tags = args.tags;

          const response = await fetch(`${this.baseUrl}/v1/incidents`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create incident: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Opsgenie returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
}
