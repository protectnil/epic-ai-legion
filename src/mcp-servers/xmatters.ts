/**
 * xMatters MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no official xMatters MCP server exists on GitHub as of March 2026.

// xMatters REST API base URL: https://{company}.xmatters.com/api/xm/1/
// Auth: HTTP Basic (Base64 username:password) OR OAuth Bearer token.
// Ref: https://help.xmatters.com/xmapi/

import { ToolDefinition, ToolResult } from './types.js';

interface XMattersConfig {
  /** Full base URL of your xMatters instance, e.g. "https://mycompany.xmatters.com" */
  baseUrl: string;
  /** OAuth Bearer token (preferred) */
  apiToken?: string;
  /** Basic-auth username (used when apiToken is not supplied) */
  username?: string;
  /** Basic-auth password (used when apiToken is not supplied) */
  password?: string;
}

export class XMattersMCPServer {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: XMattersConfig) {
    const root = config.baseUrl.replace(/\/$/, '');
    this.baseUrl = root.endsWith('/api/xm/1') ? root : `${root}/api/xm/1`;

    if (config.apiToken) {
      this.authHeader = `Bearer ${config.apiToken}`;
    } else if (config.username && config.password) {
      const encoded = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      this.authHeader = `Basic ${encoded}`;
    } else {
      throw new Error('XMattersMCPServer: supply apiToken or username+password');
    }
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'trigger_event',
        description: 'Trigger a new xMatters event (notification). Recipients are required unless the target form has pre-configured recipients.',
        inputSchema: {
          type: 'object',
          properties: {
            recipients: {
              type: 'array',
              description: 'Array of recipient objects, each with a "targetName" (xMatters user, group, or dynamic team name).',
              items: { type: 'object' },
            },
            properties: {
              type: 'object',
              description: 'Key-value map of event properties matching the form property names configured in xMatters.',
            },
            priority: {
              type: 'string',
              description: 'Event priority: LOW, MEDIUM, or HIGH (default: MEDIUM).',
            },
          },
          required: ['recipients'],
        },
      },
      {
        name: 'get_event',
        description: 'Retrieve details of a specific xMatters event by its UUID.',
        inputSchema: {
          type: 'object',
          properties: {
            eventId: {
              type: 'string',
              description: 'UUID of the xMatters event to retrieve.',
            },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'list_events',
        description: 'List xMatters events with optional status and date-range filters.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by event status: ACTIVE, SUSPENDED, or TERMINATED.',
            },
            from: {
              type: 'string',
              description: 'ISO 8601 start timestamp for the filter window (e.g. 2026-01-01T00:00:00Z).',
            },
            to: {
              type: 'string',
              description: 'ISO 8601 end timestamp for the filter window.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 100).',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
          },
        },
      },
      {
        name: 'get_person',
        description: 'Retrieve an xMatters user (person) by UUID or targetName.',
        inputSchema: {
          type: 'object',
          properties: {
            personId: {
              type: 'string',
              description: 'UUID or targetName of the xMatters user.',
            },
          },
          required: ['personId'],
        },
      },
      {
        name: 'search_people',
        description: 'Search for xMatters users by name or custom property value.',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search term matched against first name, last name, and targetName.',
            },
            propertyName: {
              type: 'string',
              description: 'Custom user property name to search against.',
            },
            propertyValue: {
              type: 'string',
              description: 'Custom user property value to match.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 100).',
            },
            offset: {
              type: 'number',
              description: 'Records to skip for pagination.',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Retrieve details of an xMatters group by UUID or targetName.',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'UUID or targetName of the xMatters group.',
            },
          },
          required: ['groupId'],
        },
      },
      {
        name: 'list_groups',
        description: 'List xMatters groups with optional name/description search.',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Filter groups whose name or description contains this string.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of groups to return (default: 100).',
            },
            offset: {
              type: 'number',
              description: 'Records to skip for pagination.',
            },
          },
        },
      },
      {
        name: 'get_on_call',
        description: 'Retrieve the current on-call members for an xMatters group.',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'UUID or targetName of the group whose on-call schedule to retrieve.',
            },
          },
          required: ['groupId'],
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
        case 'trigger_event': {
          if (!args.recipients) {
            return { content: [{ type: 'text', text: 'recipients is required' }], isError: true };
          }

          const body: Record<string, unknown> = { recipients: args.recipients };
          if (args.properties) body.properties = args.properties;
          if (args.priority) body.priority = args.priority;

          const response = await fetch(`${this.baseUrl}/events`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to trigger event: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`xMatters returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_event': {
          const eventId = args.eventId as string;
          if (!eventId) {
            return { content: [{ type: 'text', text: 'eventId is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/events/${encodeURIComponent(eventId)}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get event: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`xMatters returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_events': {
          const params = new URLSearchParams();
          if (args.status) params.set('status', args.status as string);
          if (args.from) params.set('from', args.from as string);
          if (args.to) params.set('to', args.to as string);
          params.set('limit', String((args.limit as number) || 100));
          params.set('offset', String((args.offset as number) || 0));

          const response = await fetch(`${this.baseUrl}/events?${params.toString()}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list events: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`xMatters returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_person': {
          const personId = args.personId as string;
          if (!personId) {
            return { content: [{ type: 'text', text: 'personId is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/people/${encodeURIComponent(personId)}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get person: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`xMatters returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_people': {
          const params = new URLSearchParams();
          if (args.search) params.set('search', args.search as string);
          if (args.propertyName) params.set('propertyName', args.propertyName as string);
          if (args.propertyValue) params.set('propertyValue', args.propertyValue as string);
          params.set('limit', String((args.limit as number) || 100));
          if (args.offset) params.set('offset', String(args.offset as number));

          const response = await fetch(`${this.baseUrl}/people?${params.toString()}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search people: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`xMatters returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_group': {
          const groupId = args.groupId as string;
          if (!groupId) {
            return { content: [{ type: 'text', text: 'groupId is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/groups/${encodeURIComponent(groupId)}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get group: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`xMatters returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_groups': {
          const params = new URLSearchParams();
          if (args.search) params.set('search', args.search as string);
          params.set('limit', String((args.limit as number) || 100));
          if (args.offset) params.set('offset', String(args.offset as number));

          const response = await fetch(`${this.baseUrl}/groups?${params.toString()}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list groups: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`xMatters returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_on_call': {
          const groupId = args.groupId as string;
          if (!groupId) {
            return { content: [{ type: 'text', text: 'groupId is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/on-call?groups=${encodeURIComponent(groupId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get on-call data: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`xMatters returned non-JSON response (HTTP ${response.status})`); }
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
