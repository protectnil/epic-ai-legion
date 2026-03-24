/**
 * Fly.io MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/superfly/flymcp — wraps flyctl CLI (not REST); 30 stars. Our adapter targets the Machines REST API directly for headless/CI use cases.

import { ToolDefinition, ToolResult } from './types.js';

interface FlyioConfig {
  token: string;
  baseUrl?: string;
}

export class FlyioMCPServer {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: FlyioConfig) {
    this.token = config.token;
    // Public Machines API base URL. Internal deployments can override with http://_api.internal:4280
    this.baseUrl = config.baseUrl || 'https://api.machines.dev';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_apps',
        description: 'List all Fly.io apps in an organization',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'Organization slug to scope the app listing (e.g. personal)',
            },
          },
        },
      },
      {
        name: 'get_app',
        description: 'Get details for a specific Fly.io app by name',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
          },
          required: ['app_name'],
        },
      },
      {
        name: 'list_machines',
        description: 'List all Machines (VMs) in a Fly.io app',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            include_deleted: {
              type: 'boolean',
              description: 'Include deleted machines in the response (default: false)',
            },
          },
          required: ['app_name'],
        },
      },
      {
        name: 'start_machine',
        description: 'Start a stopped Machine in a Fly.io app',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            machine_id: {
              type: 'string',
              description: 'ID of the Machine to start',
            },
          },
          required: ['app_name', 'machine_id'],
        },
      },
      {
        name: 'stop_machine',
        description: 'Stop a running Machine in a Fly.io app',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            machine_id: {
              type: 'string',
              description: 'ID of the Machine to stop',
            },
            signal: {
              type: 'string',
              description: 'Signal to send to the process (default: SIGINT)',
            },
          },
          required: ['app_name', 'machine_id'],
        },
      },
      {
        name: 'list_volumes',
        description: 'List all persistent volumes in a Fly.io app',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
          },
          required: ['app_name'],
        },
      },
      {
        name: 'delete_machine',
        description: 'Delete a Machine from a Fly.io app. The machine must be stopped first.',
        inputSchema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the Fly.io app',
            },
            machine_id: {
              type: 'string',
              description: 'ID of the Machine to delete',
            },
            force: {
              type: 'boolean',
              description: 'Force deletion even if the machine is still running (default: false)',
            },
          },
          required: ['app_name', 'machine_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_apps': {
          let url = `${this.baseUrl}/v1/apps`;
          if (args.org_slug) url += `?org_slug=${encodeURIComponent(args.org_slug as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list apps: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Fly.io returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_app': {
          const appName = args.app_name as string;
          if (!appName) {
            return { content: [{ type: 'text', text: 'app_name is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/v1/apps/${encodeURIComponent(appName)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get app ${appName}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Fly.io returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_machines': {
          const appName = args.app_name as string;
          if (!appName) {
            return { content: [{ type: 'text', text: 'app_name is required' }], isError: true };
          }
          let url = `${this.baseUrl}/v1/apps/${encodeURIComponent(appName)}/machines`;
          if (args.include_deleted) url += `?include_deleted=true`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list machines for ${appName}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Fly.io returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'start_machine': {
          const appName = args.app_name as string;
          const machineId = args.machine_id as string;
          if (!appName || !machineId) {
            return { content: [{ type: 'text', text: 'app_name and machine_id are required' }], isError: true };
          }
          const response = await fetch(
            `${this.baseUrl}/v1/apps/${encodeURIComponent(appName)}/machines/${encodeURIComponent(machineId)}/start`,
            { method: 'POST', headers }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to start machine ${machineId}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown = { message: `Machine ${machineId} start requested` };
          try { data = await response.json(); } catch { /* some start responses return empty body */ }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'stop_machine': {
          const appName = args.app_name as string;
          const machineId = args.machine_id as string;
          if (!appName || !machineId) {
            return { content: [{ type: 'text', text: 'app_name and machine_id are required' }], isError: true };
          }
          const body: Record<string, unknown> = {};
          if (args.signal) body.signal = args.signal;

          const response = await fetch(
            `${this.baseUrl}/v1/apps/${encodeURIComponent(appName)}/machines/${encodeURIComponent(machineId)}/stop`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to stop machine ${machineId}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown = { message: `Machine ${machineId} stop requested` };
          try { data = await response.json(); } catch { /* some stop responses return empty body */ }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_volumes': {
          const appName = args.app_name as string;
          if (!appName) {
            return { content: [{ type: 'text', text: 'app_name is required' }], isError: true };
          }
          const response = await fetch(
            `${this.baseUrl}/v1/apps/${encodeURIComponent(appName)}/volumes`,
            { method: 'GET', headers }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list volumes for ${appName}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Fly.io returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_machine': {
          const appName = args.app_name as string;
          const machineId = args.machine_id as string;
          if (!appName || !machineId) {
            return { content: [{ type: 'text', text: 'app_name and machine_id are required' }], isError: true };
          }
          let url = `${this.baseUrl}/v1/apps/${encodeURIComponent(appName)}/machines/${encodeURIComponent(machineId)}`;
          if (args.force) url += `?force=true`;

          const response = await fetch(url, { method: 'DELETE', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to delete machine ${machineId}: ${response.status} ${response.statusText}` }], isError: true };
          }
          return { content: [{ type: 'text', text: JSON.stringify({ message: `Machine ${machineId} deleted successfully` }) }], isError: false };
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
