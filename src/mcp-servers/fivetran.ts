/**
 * Fivetran MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/fivetran/fivetran-mcp — official Fivetran MCP server.
// That server ships 50+ tools covering the full Fivetran API and is actively maintained.
// This adapter serves the self-hosted TypeScript use case for environments where the
// official Python-based server is not suitable or where a lightweight fallback is needed.

// Fivetran REST API base URL: https://api.fivetran.com/v1
// Auth: HTTP Basic authentication — Base64-encode "api_key:api_secret" in the Authorization header.
// Ref: https://fivetran.com/docs/rest-api/getting-started
//      https://fivetran.com/docs/rest-api/api-reference

import { ToolDefinition, ToolResult } from './types.js';

interface FivetranConfig {
  /** Fivetran API key */
  apiKey: string;
  /** Fivetran API secret */
  apiSecret: string;
  /** Override the base URL (default: "https://api.fivetran.com/v1") */
  baseUrl?: string;
}

export class FivetranMCPServer {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: FivetranConfig) {
    this.baseUrl = (config.baseUrl || 'https://api.fivetran.com/v1').replace(/\/$/, '');
    const encoded = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
    this.authHeader = `Basic ${encoded}`;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json;version=2',
      Accept: 'application/json;version=2',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_connectors_in_group',
        description: 'List all Fivetran connectors (data sources) within a specified group (destination).',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'The Fivetran group (destination) ID to list connectors for.',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of connectors to return (default: 100).',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_connector',
        description: 'Retrieve configuration, status, and sync state for a specific Fivetran connector.',
        inputSchema: {
          type: 'object',
          properties: {
            connector_id: {
              type: 'string',
              description: 'The Fivetran connector ID.',
            },
          },
          required: ['connector_id'],
        },
      },
      {
        name: 'sync_connector',
        description: 'Trigger an on-demand sync for a Fivetran connector.',
        inputSchema: {
          type: 'object',
          properties: {
            connector_id: {
              type: 'string',
              description: 'The Fivetran connector ID to sync.',
            },
            force: {
              type: 'boolean',
              description: 'If true, bypass the sync frequency schedule and force a sync now.',
            },
          },
          required: ['connector_id'],
        },
      },
      {
        name: 'update_connector_schedule',
        description: 'Update the sync schedule (frequency and paused state) for a Fivetran connector.',
        inputSchema: {
          type: 'object',
          properties: {
            connector_id: {
              type: 'string',
              description: 'The Fivetran connector ID.',
            },
            sync_frequency: {
              type: 'number',
              description: 'Sync frequency in minutes (e.g. 60, 360, 720, 1440).',
            },
            paused: {
              type: 'boolean',
              description: 'If true, pause the connector sync schedule.',
            },
            pause_after_trial: {
              type: 'boolean',
              description: 'If true, pause the connector after the trial period ends.',
            },
          },
          required: ['connector_id'],
        },
      },
      {
        name: 'list_groups',
        description: 'List all Fivetran groups (destinations/schemas) in the account.',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of groups to return.',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Retrieve details of a specific Fivetran group (destination).',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'The Fivetran group ID.',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'list_users_in_group',
        description: 'List all users with access to a specific Fivetran group.',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'The Fivetran group ID.',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of users to return.',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_connector_sync_status',
        description: 'Get the current sync state, setup state, and data update state for a connector.',
        inputSchema: {
          type: 'object',
          properties: {
            connector_id: {
              type: 'string',
              description: 'The Fivetran connector ID to check status for.',
            },
          },
          required: ['connector_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const h = this.headers;

      switch (name) {
        case 'list_connectors_in_group': {
          const group_id = args.group_id as string;
          if (!group_id) {
            return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.cursor) params.set('cursor', args.cursor as string);
          params.set('limit', String((args.limit as number) || 100));
          const qs = params.toString() ? `?${params.toString()}` : '';

          const response = await fetch(
            `${this.baseUrl}/groups/${encodeURIComponent(group_id)}/connectors${qs}`,
            { method: 'GET', headers: h }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list connectors: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Fivetran returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_connector': {
          const connector_id = args.connector_id as string;
          if (!connector_id) {
            return { content: [{ type: 'text', text: 'connector_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/connectors/${encodeURIComponent(connector_id)}`,
            { method: 'GET', headers: h }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get connector: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Fivetran returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'sync_connector': {
          const connector_id = args.connector_id as string;
          if (!connector_id) {
            return { content: [{ type: 'text', text: 'connector_id is required' }], isError: true };
          }

          const body: Record<string, unknown> = {};
          if (typeof args.force === 'boolean') body.force = args.force;

          const response = await fetch(
            `${this.baseUrl}/connectors/${encodeURIComponent(connector_id)}/sync`,
            { method: 'POST', headers: h, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to trigger sync: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Fivetran returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_connector_schedule': {
          const connector_id = args.connector_id as string;
          if (!connector_id) {
            return { content: [{ type: 'text', text: 'connector_id is required' }], isError: true };
          }

          const body: Record<string, unknown> = {};
          if (args.sync_frequency !== undefined) body.sync_frequency = args.sync_frequency;
          if (typeof args.paused === 'boolean') body.paused = args.paused;
          if (typeof args.pause_after_trial === 'boolean') body.pause_after_trial = args.pause_after_trial;

          const response = await fetch(
            `${this.baseUrl}/connectors/${encodeURIComponent(connector_id)}`,
            { method: 'PATCH', headers: h, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to update connector schedule: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Fivetran returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_groups': {
          const params = new URLSearchParams();
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.limit) params.set('limit', String(args.limit as number));
          const qs = params.toString() ? `?${params.toString()}` : '';

          const response = await fetch(`${this.baseUrl}/groups${qs}`, {
            method: 'GET',
            headers: h,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list groups: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Fivetran returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_group': {
          const group_id = args.group_id as string;
          if (!group_id) {
            return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/groups/${encodeURIComponent(group_id)}`,
            { method: 'GET', headers: h }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get group: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Fivetran returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_users_in_group': {
          const group_id = args.group_id as string;
          if (!group_id) {
            return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.limit) params.set('limit', String(args.limit as number));
          const qs = params.toString() ? `?${params.toString()}` : '';

          const response = await fetch(
            `${this.baseUrl}/groups/${encodeURIComponent(group_id)}/users${qs}`,
            { method: 'GET', headers: h }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list users in group: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Fivetran returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_connector_sync_status': {
          const connector_id = args.connector_id as string;
          if (!connector_id) {
            return { content: [{ type: 'text', text: 'connector_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/connectors/${encodeURIComponent(connector_id)}`,
            { method: 'GET', headers: h }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get connector sync status: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let raw: unknown;
          try { raw = await response.json(); } catch { throw new Error(`Fivetran returned non-JSON response (HTTP ${response.status})`); }

          // Extract the status fields from the response data envelope
          const envelope = raw as { data?: { sync_state?: string; setup_state?: string; data_update_state?: string; status?: unknown } };
          const statusFields = envelope.data
            ? {
                connector_id,
                sync_state: envelope.data.sync_state,
                setup_state: envelope.data.setup_state,
                data_update_state: envelope.data.data_update_state,
                status: envelope.data.status,
              }
            : raw;

          return { content: [{ type: 'text', text: JSON.stringify(statusFields, null, 2) }], isError: false };
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
