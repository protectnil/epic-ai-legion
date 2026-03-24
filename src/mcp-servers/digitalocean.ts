/**
 * DigitalOcean MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/digitalocean-labs/mcp-digitalocean — actively maintained (digitalocean/digitalocean-mcp is archived; use digitalocean-labs instead)

import { ToolDefinition, ToolResult } from './types.js';

interface DigitalOceanConfig {
  token: string;
  baseUrl?: string;
}

export class DigitalOceanMCPServer {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: DigitalOceanConfig) {
    this.token = config.token;
    this.baseUrl = config.baseUrl || 'https://api.digitalocean.com/v2';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_droplets',
        description: 'List all Droplets (cloud VMs) in the account, with optional tag filtering',
        inputSchema: {
          type: 'object',
          properties: {
            tag_name: {
              type: 'string',
              description: 'Filter Droplets by a tag name',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 200, default: 20)',
            },
          },
        },
      },
      {
        name: 'get_droplet',
        description: 'Retrieve details for a specific Droplet by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            droplet_id: {
              type: 'number',
              description: 'Numeric ID of the Droplet',
            },
          },
          required: ['droplet_id'],
        },
      },
      {
        name: 'create_droplet',
        description: 'Create a new Droplet',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Human-readable hostname for the Droplet',
            },
            region: {
              type: 'string',
              description: 'Region slug where the Droplet will be created (e.g. nyc3, sfo3, ams3)',
            },
            size: {
              type: 'string',
              description: 'Droplet size slug (e.g. s-1vcpu-1gb, s-2vcpu-4gb)',
            },
            image: {
              type: 'string',
              description: 'Image slug or numeric ID (e.g. ubuntu-22-04-x64)',
            },
            ssh_keys: {
              type: 'array',
              description: 'Array of SSH key fingerprints or numeric IDs to embed in the Droplet',
              items: { type: 'string' },
            },
            tags: {
              type: 'array',
              description: 'Array of tags to apply to the new Droplet',
              items: { type: 'string' },
            },
            backups: {
              type: 'boolean',
              description: 'Enable automated backups (default: false)',
            },
            ipv6: {
              type: 'boolean',
              description: 'Enable IPv6 networking (default: false)',
            },
            user_data: {
              type: 'string',
              description: 'Cloud-Init user data script to run on first boot',
            },
          },
          required: ['name', 'region', 'size', 'image'],
        },
      },
      {
        name: 'delete_droplet',
        description: 'Permanently delete a Droplet by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            droplet_id: {
              type: 'number',
              description: 'Numeric ID of the Droplet to delete',
            },
          },
          required: ['droplet_id'],
        },
      },
      {
        name: 'list_apps',
        description: 'List all App Platform apps in the account',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 200, default: 20)',
            },
          },
        },
      },
      {
        name: 'get_app',
        description: 'Retrieve details for a specific App Platform app by its UUID',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'UUID of the App Platform app',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'list_kubernetes_clusters',
        description: 'List all Kubernetes (DOKS) clusters in the account',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 200, default: 20)',
            },
          },
        },
      },
      {
        name: 'list_databases',
        description: 'List all managed database clusters in the account',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 200, default: 20)',
            },
          },
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
        case 'list_droplets': {
          const page = (args.page as number) || 1;
          const perPage = (args.per_page as number) || 20;
          let url = `${this.baseUrl}/droplets?page=${page}&per_page=${perPage}`;
          if (args.tag_name) url += `&tag_name=${encodeURIComponent(args.tag_name as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list droplets: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`DigitalOcean returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_droplet': {
          const dropletId = args.droplet_id as number;
          if (!dropletId) {
            return { content: [{ type: 'text', text: 'droplet_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/droplets/${dropletId}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get droplet ${dropletId}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`DigitalOcean returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_droplet': {
          const name = args.name as string;
          const region = args.region as string;
          const size = args.size as string;
          const image = args.image as string;
          if (!name || !region || !size || !image) {
            return { content: [{ type: 'text', text: 'name, region, size, and image are required' }], isError: true };
          }
          const body: Record<string, unknown> = { name, region, size, image };
          if (args.ssh_keys) body.ssh_keys = args.ssh_keys;
          if (args.tags) body.tags = args.tags;
          if (typeof args.backups === 'boolean') body.backups = args.backups;
          if (typeof args.ipv6 === 'boolean') body.ipv6 = args.ipv6;
          if (args.user_data) body.user_data = args.user_data;

          const response = await fetch(`${this.baseUrl}/droplets`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create droplet: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`DigitalOcean returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_droplet': {
          const dropletId = args.droplet_id as number;
          if (!dropletId) {
            return { content: [{ type: 'text', text: 'droplet_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/droplets/${dropletId}`, { method: 'DELETE', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to delete droplet ${dropletId}: ${response.status} ${response.statusText}` }], isError: true };
          }
          return { content: [{ type: 'text', text: JSON.stringify({ message: `Droplet ${dropletId} deleted successfully` }) }], isError: false };
        }

        case 'list_apps': {
          const page = (args.page as number) || 1;
          const perPage = (args.per_page as number) || 20;
          const url = `${this.baseUrl}/apps?page=${page}&per_page=${perPage}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list apps: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`DigitalOcean returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_app': {
          const appId = args.app_id as string;
          if (!appId) {
            return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/apps/${appId}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get app ${appId}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`DigitalOcean returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_kubernetes_clusters': {
          const page = (args.page as number) || 1;
          const perPage = (args.per_page as number) || 20;
          const url = `${this.baseUrl}/kubernetes/clusters?page=${page}&per_page=${perPage}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list Kubernetes clusters: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`DigitalOcean returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_databases': {
          const page = (args.page as number) || 1;
          const perPage = (args.per_page as number) || 20;
          const url = `${this.baseUrl}/databases?page=${page}&per_page=${perPage}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list databases: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`DigitalOcean returned non-JSON response (HTTP ${response.status})`); }
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
