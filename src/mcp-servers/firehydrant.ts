/**
 * FireHydrant MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/firehydrant/firehydrant-mcp — official, actively maintained
// (last updated Feb 23 2026), available via npm and as a Claude Desktop Extension (.dxt).
// This adapter is a lightweight self-hosted fallback for air-gapped or on-prem deployments.

import { ToolDefinition, ToolResult } from './types.js';

interface FireHydrantConfig {
  /** FireHydrant bot token or user API key */
  apiKey: string;
  /** Override base URL if needed (default: https://api.firehydrant.io/v1) */
  baseUrl?: string;
}

export class FireHydrantMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: FireHydrantConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.firehydrant.io/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_incidents',
        description: 'List FireHydrant incidents with optional filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to filter incidents by name or description',
            },
            status: {
              type: 'string',
              description: 'Filter by status: open, closed, or all (default: open)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of incidents per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_incident',
        description: 'Retrieve details of a specific FireHydrant incident by its ID',
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
        description: 'Create a new incident in FireHydrant',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name/title of the incident (required)',
            },
            summary: {
              type: 'string',
              description: 'A brief summary of what is happening',
            },
            severity: {
              type: 'string',
              description: 'Severity slug (e.g. SEV1, SEV2, SEV3). Must match a severity defined in your FireHydrant account.',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the incident',
            },
            impacts: {
              type: 'array',
              description: 'Array of impact objects specifying affected services or environments. Each object has id and type fields.',
              items: { type: 'object', properties: {} },
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_incident',
        description: 'Update an existing FireHydrant incident',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The unique ID of the incident to update (required)',
            },
            name: {
              type: 'string',
              description: 'Updated incident name',
            },
            summary: {
              type: 'string',
              description: 'Updated summary',
            },
            severity: {
              type: 'string',
              description: 'Updated severity slug',
            },
            description: {
              type: 'string',
              description: 'Updated description',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'resolve_incident',
        description: 'Resolve (close) a FireHydrant incident',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The unique ID of the incident to resolve (required)',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'add_incident_note',
        description: 'Add a note to the timeline of a FireHydrant incident',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The unique ID of the incident (required)',
            },
            body: {
              type: 'string',
              description: 'Text content of the note (required)',
            },
          },
          required: ['incident_id', 'body'],
        },
      },
      {
        name: 'list_runbooks',
        description: 'List runbooks configured in FireHydrant',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to filter runbooks by name',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of runbooks per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_runbook',
        description: 'Retrieve details of a specific FireHydrant runbook by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            runbook_id: {
              type: 'string',
              description: 'The unique ID of the runbook (required)',
            },
          },
          required: ['runbook_id'],
        },
      },
      {
        name: 'list_services',
        description: 'List services in the FireHydrant service catalog',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to filter services by name',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of services per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'list_environments',
        description: 'List environments registered in FireHydrant',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to filter environments by name',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of environments per page (default: 20)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_incidents': {
          const params = new URLSearchParams();
          if (args.query) params.set('query', args.query as string);
          if (args.status) params.set('status', args.status as string);
          if (args.page !== undefined) params.set('page', String(args.page));
          if (args.per_page !== undefined) params.set('per_page', String(args.per_page));

          const qs = params.toString();
          const url = `${this.baseUrl}/incidents${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list incidents: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`FireHydrant returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_incident': {
          const incident_id = args.incident_id as string;
          if (!incident_id) {
            return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/incidents/${encodeURIComponent(incident_id)}`, {
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
          try { data = await response.json(); } catch { throw new Error(`FireHydrant returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_incident': {
          const name_str = args.name as string;
          if (!name_str) {
            return { content: [{ type: 'text', text: 'name is required' }], isError: true };
          }

          const body: Record<string, unknown> = { name: name_str };
          if (args.summary) body.summary = args.summary;
          if (args.severity) body.severity = args.severity;
          if (args.description) body.description = args.description;
          if (args.impacts) body.impacts = args.impacts;

          const response = await fetch(`${this.baseUrl}/incidents`, {
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
          try { data = await response.json(); } catch { throw new Error(`FireHydrant returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_incident': {
          const incident_id = args.incident_id as string;
          if (!incident_id) {
            return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
          }

          const body: Record<string, unknown> = {};
          if (args.name) body.name = args.name;
          if (args.summary) body.summary = args.summary;
          if (args.severity) body.severity = args.severity;
          if (args.description) body.description = args.description;

          const response = await fetch(`${this.baseUrl}/incidents/${encodeURIComponent(incident_id)}`, {
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
          try { data = await response.json(); } catch { throw new Error(`FireHydrant returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'resolve_incident': {
          const incident_id = args.incident_id as string;
          if (!incident_id) {
            return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/incidents/${encodeURIComponent(incident_id)}/resolve`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({}),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to resolve incident: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`FireHydrant returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'add_incident_note': {
          const incident_id = args.incident_id as string;
          const body_text = args.body as string;

          if (!incident_id || !body_text) {
            return {
              content: [{ type: 'text', text: 'incident_id and body are required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/incidents/${encodeURIComponent(incident_id)}/notes`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ body: body_text }),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to add note: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`FireHydrant returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_runbooks': {
          const params = new URLSearchParams();
          if (args.query) params.set('query', args.query as string);
          if (args.page !== undefined) params.set('page', String(args.page));
          if (args.per_page !== undefined) params.set('per_page', String(args.per_page));

          const qs = params.toString();
          const url = `${this.baseUrl}/runbooks${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list runbooks: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`FireHydrant returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_runbook': {
          const runbook_id = args.runbook_id as string;
          if (!runbook_id) {
            return { content: [{ type: 'text', text: 'runbook_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/runbooks/${encodeURIComponent(runbook_id)}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get runbook: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`FireHydrant returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_services': {
          const params = new URLSearchParams();
          if (args.query) params.set('query', args.query as string);
          if (args.page !== undefined) params.set('page', String(args.page));
          if (args.per_page !== undefined) params.set('per_page', String(args.per_page));

          const qs = params.toString();
          const url = `${this.baseUrl}/services${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list services: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`FireHydrant returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_environments': {
          const params = new URLSearchParams();
          if (args.query) params.set('query', args.query as string);
          if (args.page !== undefined) params.set('page', String(args.page));
          if (args.per_page !== undefined) params.set('per_page', String(args.per_page));

          const qs = params.toString();
          const url = `${this.baseUrl}/environments${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list environments: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`FireHydrant returned non-JSON response (HTTP ${response.status})`); }
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
