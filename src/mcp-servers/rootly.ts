/**
 * Rootly MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/Rootly-AI-Labs/Rootly-MCP-server — actively maintained,
// hosted option available (no self-hosting required). Also available as a Cloudflare Worker
// variant at https://github.com/Rootly-AI-Labs/Rootly-MCP-cloudflare (25+ endpoints).
// This adapter is a lightweight self-hosted fallback for air-gapped or on-prem deployments.

import { ToolDefinition, ToolResult } from './types.js';

interface RootlyConfig {
  apiToken: string;
  /** Override base URL if needed (default: https://api.rootly.com) */
  baseUrl?: string;
}

export class RootlyMCPServer {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: RootlyConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.rootly.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_incidents',
        description: 'List incidents in Rootly with optional filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: started, mitigated, or resolved',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of incidents per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_incident',
        description: 'Retrieve details of a specific Rootly incident by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The unique ID of the incident (required)',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'create_incident',
        description: 'Create a new incident in Rootly',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title of the incident (required)',
            },
            severity: {
              type: 'string',
              description: 'Incident severity slug (e.g. critical, high, medium, low)',
            },
            summary: {
              type: 'string',
              description: 'A brief summary of the incident',
            },
            team_ids: {
              type: 'array',
              description: 'Array of team IDs to assign to the incident',
              items: { type: 'string' },
            },
            service_ids: {
              type: 'array',
              description: 'Array of service IDs affected by the incident',
              items: { type: 'string' },
            },
            labels: {
              type: 'array',
              description: 'Array of label strings to attach to the incident',
              items: { type: 'string' },
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_incident',
        description: 'Update an existing Rootly incident',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The unique ID of the incident to update (required)',
            },
            title: {
              type: 'string',
              description: 'Updated title',
            },
            severity: {
              type: 'string',
              description: 'Updated severity slug',
            },
            summary: {
              type: 'string',
              description: 'Updated summary',
            },
            status: {
              type: 'string',
              description: 'Updated status: started, mitigated, or resolved',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'resolve_incident',
        description: 'Mark a Rootly incident as resolved',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The unique ID of the incident to resolve (required)',
            },
            summary: {
              type: 'string',
              description: 'Optional resolution summary or post-mortem notes',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'add_incident_event',
        description: 'Add a timeline event to a Rootly incident',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The unique ID of the incident (required)',
            },
            message: {
              type: 'string',
              description: 'Text content of the timeline event (required)',
            },
          },
          required: ['incident_id', 'message'],
        },
      },
      {
        name: 'list_teams',
        description: 'List all teams configured in Rootly',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of teams per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'list_services',
        description: 'List all services registered in Rootly',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of services per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'list_alerts',
        description: 'List incident alerts in Rootly',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'Filter alerts by incident ID',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of alerts per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'list_workflows',
        description: 'List workflows configured in Rootly',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of workflows per page (default: 25)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      };

      switch (name) {
        case 'list_incidents': {
          const params = new URLSearchParams();
          if (args.status) params.set('filter[status]', args.status as string);
          if (args.page_number !== undefined) params.set('page[number]', String(args.page_number));
          if (args.page_size !== undefined) params.set('page[size]', String(args.page_size));

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
          try { data = await response.json(); } catch { throw new Error(`Rootly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_incident': {
          const incident_id = args.incident_id as string;
          if (!incident_id) {
            return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/v1/incidents/${encodeURIComponent(incident_id)}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get incident: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Rootly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_incident': {
          const title = args.title as string;
          if (!title) {
            return { content: [{ type: 'text', text: 'title is required' }], isError: true };
          }

          const attributes: Record<string, unknown> = { title };
          if (args.severity) attributes.severity_slug = args.severity;
          if (args.summary) attributes.summary = args.summary;
          if (args.labels) attributes.labels = args.labels;

          const relationships: Record<string, unknown> = {};
          if (args.team_ids) {
            relationships.teams = {
              data: (args.team_ids as string[]).map((id) => ({ type: 'teams', id })),
            };
          }
          if (args.service_ids) {
            relationships.services = {
              data: (args.service_ids as string[]).map((id) => ({ type: 'services', id })),
            };
          }

          const body: Record<string, unknown> = {
            data: {
              type: 'incidents',
              attributes,
              ...(Object.keys(relationships).length > 0 ? { relationships } : {}),
            },
          };

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
          try { data = await response.json(); } catch { throw new Error(`Rootly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_incident': {
          const incident_id = args.incident_id as string;
          if (!incident_id) {
            return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
          }

          const attributes: Record<string, unknown> = {};
          if (args.title) attributes.title = args.title;
          if (args.severity) attributes.severity_slug = args.severity;
          if (args.summary) attributes.summary = args.summary;
          if (args.status) attributes.status = args.status;

          const body = { data: { type: 'incidents', id: incident_id, attributes } };

          const response = await fetch(`${this.baseUrl}/v1/incidents/${encodeURIComponent(incident_id)}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to update incident: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Rootly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'resolve_incident': {
          const incident_id = args.incident_id as string;
          if (!incident_id) {
            return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
          }

          const attributes: Record<string, unknown> = { status: 'resolved' };
          if (args.summary) attributes.summary = args.summary;

          const body = { data: { type: 'incidents', id: incident_id, attributes } };

          const response = await fetch(`${this.baseUrl}/v1/incidents/${encodeURIComponent(incident_id)}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to resolve incident: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Rootly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'add_incident_event': {
          const incident_id = args.incident_id as string;
          const message = args.message as string;

          if (!incident_id || !message) {
            return {
              content: [{ type: 'text', text: 'incident_id and message are required' }],
              isError: true,
            };
          }

          const body = {
            data: {
              type: 'incident_events',
              attributes: { message },
            },
          };

          const response = await fetch(`${this.baseUrl}/v1/incidents/${encodeURIComponent(incident_id)}/incident_events`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to add event: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Rootly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_teams': {
          const params = new URLSearchParams();
          if (args.page_number !== undefined) params.set('page[number]', String(args.page_number));
          if (args.page_size !== undefined) params.set('page[size]', String(args.page_size));

          const qs = params.toString();
          const url = `${this.baseUrl}/v1/teams${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list teams: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Rootly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_services': {
          const params = new URLSearchParams();
          if (args.page_number !== undefined) params.set('page[number]', String(args.page_number));
          if (args.page_size !== undefined) params.set('page[size]', String(args.page_size));

          const qs = params.toString();
          const url = `${this.baseUrl}/v1/services${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list services: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Rootly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_alerts': {
          const params = new URLSearchParams();
          if (args.incident_id) params.set('filter[incident_id]', args.incident_id as string);
          if (args.page_number !== undefined) params.set('page[number]', String(args.page_number));
          if (args.page_size !== undefined) params.set('page[size]', String(args.page_size));

          const qs = params.toString();
          const url = `${this.baseUrl}/v1/alerts${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list alerts: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Rootly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_workflows': {
          const params = new URLSearchParams();
          if (args.page_number !== undefined) params.set('page[number]', String(args.page_number));
          if (args.page_size !== undefined) params.set('page[size]', String(args.page_size));

          const qs = params.toString();
          const url = `${this.baseUrl}/v1/workflows${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list workflows: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Rootly returned non-JSON response (HTTP ${response.status})`); }
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
