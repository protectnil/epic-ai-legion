/**
 * Atlassian Statuspage MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — Atlassian's official MCP (atlassian/atlassian-mcp-server) covers Jira/Confluence only, not Statuspage.

import { ToolDefinition, ToolResult } from './types.js';

interface StatuspageConfig {
  /**
   * Statuspage API key. Found in the Statuspage management UI under API Info.
   * Passed as: Authorization: OAuth {apiKey}
   */
  apiKey: string;
  /**
   * Your Statuspage page ID. Every endpoint is scoped to a page.
   * Found in the URL of your Statuspage management dashboard.
   */
  pageId: string;
  /** Override the base URL (default: https://api.statuspage.io/v1). */
  baseUrl?: string;
}

export class StatuspageMCPServer {
  private readonly apiKey: string;
  private readonly pageId: string;
  private readonly baseUrl: string;

  constructor(config: StatuspageConfig) {
    this.apiKey = config.apiKey;
    this.pageId = config.pageId;
    this.baseUrl = config.baseUrl || 'https://api.statuspage.io/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_page',
        description: 'Retrieve metadata and configuration for the Statuspage page',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_components',
        description: 'List all components on the Statuspage page',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'update_component',
        description: 'Update the status of a component (e.g. operational, degraded_performance, partial_outage, major_outage)',
        inputSchema: {
          type: 'object',
          properties: {
            component_id: {
              type: 'string',
              description: 'ID of the component to update',
            },
            status: {
              type: 'string',
              description: 'New component status: operational | degraded_performance | partial_outage | major_outage | under_maintenance',
            },
          },
          required: ['component_id', 'status'],
        },
      },
      {
        name: 'list_incidents',
        description: 'List all unresolved incidents on the page',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of incidents to return (default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_incident',
        description: 'Retrieve details and update history for a specific incident',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'ID of the incident to retrieve',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'create_incident',
        description: 'Create a new realtime incident on the Statuspage page',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Short title for the incident',
            },
            status: {
              type: 'string',
              description: 'Initial incident status: investigating | identified | monitoring | resolved',
            },
            body: {
              type: 'string',
              description: 'Initial incident update message shown to subscribers',
            },
            component_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of component IDs affected by this incident',
            },
            impact_override: {
              type: 'string',
              description: 'Override calculated impact: none | minor | major | critical',
            },
          },
          required: ['name', 'status', 'body'],
        },
      },
      {
        name: 'update_incident',
        description: 'Post a new status update to an existing incident',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'ID of the incident to update',
            },
            status: {
              type: 'string',
              description: 'New incident status: investigating | identified | monitoring | resolved',
            },
            body: {
              type: 'string',
              description: 'Update message to post to the incident timeline',
            },
          },
          required: ['incident_id', 'status', 'body'],
        },
      },
      {
        name: 'list_scheduled_maintenances',
        description: 'List all upcoming or active scheduled maintenances',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of records to return (default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'list_subscribers',
        description: 'List all email, SMS, webhook, and Slack subscribers for the page',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of subscribers to return (default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `OAuth ${this.apiKey}`,
        'Content-Type': 'application/json',
      };
      const base = `${this.baseUrl}/pages/${encodeURIComponent(this.pageId)}`;

      switch (name) {
        case 'get_page': {
          const response = await fetch(`${this.baseUrl}/pages/${encodeURIComponent(this.pageId)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get page: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Statuspage returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_components': {
          const response = await fetch(`${base}/components`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list components: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Statuspage returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_component': {
          const componentId = args.component_id as string;
          const status = args.status as string;
          if (!componentId || !status) {
            return { content: [{ type: 'text', text: 'component_id and status are required' }], isError: true };
          }
          const response = await fetch(`${base}/components/${encodeURIComponent(componentId)}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ component: { status } }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update component: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Statuspage returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_incidents': {
          const limit = (args.limit as number) || 25;
          const page = (args.page as number) || 1;
          const response = await fetch(`${base}/incidents?limit=${limit}&page=${page}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list incidents: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Statuspage returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_incident': {
          const incidentId = args.incident_id as string;
          if (!incidentId) {
            return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
          }
          const response = await fetch(`${base}/incidents/${encodeURIComponent(incidentId)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get incident: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Statuspage returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_incident': {
          const incidentName = args.name as string;
          const status = args.status as string;
          const body = args.body as string;
          if (!incidentName || !status || !body) {
            return { content: [{ type: 'text', text: 'name, status, and body are required' }], isError: true };
          }
          const payload: Record<string, unknown> = {
            incident: {
              name: incidentName,
              status,
              body,
            },
          };
          if (args.component_ids) (payload.incident as Record<string, unknown>).component_ids = args.component_ids;
          if (args.impact_override) (payload.incident as Record<string, unknown>).impact_override = args.impact_override;

          const response = await fetch(`${base}/incidents`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create incident: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Statuspage returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_incident': {
          const incidentId = args.incident_id as string;
          const status = args.status as string;
          const body = args.body as string;
          if (!incidentId || !status || !body) {
            return { content: [{ type: 'text', text: 'incident_id, status, and body are required' }], isError: true };
          }
          const response = await fetch(`${base}/incidents/${encodeURIComponent(incidentId)}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ incident: { status, body } }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update incident: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Statuspage returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_scheduled_maintenances': {
          const limit = (args.limit as number) || 25;
          const page = (args.page as number) || 1;
          const response = await fetch(`${base}/incidents/scheduled?limit=${limit}&page=${page}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list scheduled maintenances: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Statuspage returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_subscribers': {
          const limit = (args.limit as number) || 100;
          const page = (args.page as number) || 1;
          const response = await fetch(`${base}/subscribers?limit=${limit}&page=${page}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list subscribers: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Statuspage returned non-JSON (HTTP ${response.status})`); }
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
