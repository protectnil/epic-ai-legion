/**
 * Trellix EDR MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no vendor-shipped MCP server for Trellix EDR.

import { ToolDefinition, ToolResult } from './types.js';

// Trellix EDR (formerly McAfee MVISION EDR) REST API.
//
// Auth: OAuth2 client_credentials grant.
//   Token endpoint: https://iam.manage.trellix.com/iam/v1.1/token
//   (The IAM domain migrated from iam.mcafee.com to iam.manage.trellix.com in January 2023 — hard cutover.)
//   Required scope: soc.act.tg
//   Credentials (client_id, client_secret) are generated via the Trellix UAM portal:
//   https://uam.ui.trellix.com/clientcreds.html
//
// Regional API base URLs (select the data center for your tenant):
//   US-West:   https://api.soc.trellix.com
//   US-East:   https://api.soc.us-east-1.trellix.com
//   Frankfurt: https://api.soc.eu-central-1.trellix.com
//   Sydney:    https://api.soc.ap-southeast-2.trellix.com
//   Tokyo:     https://api.soc.ap-northeast-1.trellix.com
//   Singapore: https://api.soc.ap-southeast-1.trellix.com
//
// Ref: https://docs.trellix.com/bundle/mvision-endpoint-detection-and-response-product-guide
//      https://developer.manage.trellix.com/mvision/apis/home

interface TrellixEDRConfig {
  clientId: string;
  clientSecret: string;
  region?: string;
  baseUrl?: string;
}

export class TrellixEDRMCPServer {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly iamUrl = 'https://iam.manage.trellix.com/iam/v1.1/token';
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: TrellixEDRConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;

    if (config.baseUrl) {
      this.baseUrl = config.baseUrl.replace(/\/$/, '');
    } else {
      // Map friendly region names to the verified API hostnames
      const regionMap: Record<string, string> = {
        'us-west':          'https://api.soc.trellix.com',
        'us-east':          'https://api.soc.us-east-1.trellix.com',
        'eu-central':       'https://api.soc.eu-central-1.trellix.com',
        'ap-southeast-2':   'https://api.soc.ap-southeast-2.trellix.com',
        'ap-northeast-1':   'https://api.soc.ap-northeast-1.trellix.com',
        'ap-southeast-1':   'https://api.soc.ap-southeast-1.trellix.com',
      };
      this.baseUrl = regionMap[config.region || 'us-west'] || 'https://api.soc.trellix.com';
    }
  }

  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'soc.act.tg',
    });

    const response = await fetch(this.iamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Trellix IAM token request failed: ${response.status} ${errText}`);
    }

    const tokenData = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = tokenData.access_token;
    this.tokenExpiresAt = now + tokenData.expires_in * 1000;
    return this.accessToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_threats',
        description: 'Retrieve threat detections from Trellix EDR (GET /edr/v2/threats). Returns threats visible in the Monitoring Dashboard.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of threats to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            filter: {
              type: 'string',
              description: 'Filter expression for threats (e.g. "severity:high")',
            },
          },
        },
      },
      {
        name: 'get_threat',
        description: 'Get details for a specific threat by its ID (GET /edr/v2/threats/{threatId})',
        inputSchema: {
          type: 'object',
          properties: {
            threatId: {
              type: 'string',
              description: 'Trellix EDR threat ID',
            },
          },
          required: ['threatId'],
        },
      },
      {
        name: 'search_devices',
        description: 'Search for devices/endpoints in Trellix EDR (GET /edr/v2/devices). Supports filtering by hostname, IP, OS, or connection status.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of devices to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. "hostname:workstation-01" or "status:online")',
            },
          },
        },
      },
      {
        name: 'get_device',
        description: 'Get details for a specific device by its ID (GET /edr/v2/devices/{deviceId})',
        inputSchema: {
          type: 'object',
          properties: {
            deviceId: {
              type: 'string',
              description: 'Trellix EDR device/endpoint ID',
            },
          },
          required: ['deviceId'],
        },
      },
      {
        name: 'get_investigations',
        description: 'List active investigations in Trellix EDR (GET /edr/v2/investigations)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of investigations to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            status: {
              type: 'string',
              description: 'Filter by investigation status (e.g. "open", "closed")',
            },
          },
        },
      },
      {
        name: 'get_investigation',
        description: 'Get details for a specific investigation by ID (GET /edr/v2/investigations/{investigationId})',
        inputSchema: {
          type: 'object',
          properties: {
            investigationId: {
              type: 'string',
              description: 'Trellix EDR investigation ID',
            },
          },
          required: ['investigationId'],
        },
      },
      {
        name: 'get_action_history',
        description: 'Retrieve the action history log from Trellix EDR (GET /edr/v2/action-history). Shows completed response actions such as isolations and file quarantines.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of action records to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const token = await this.getToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'get_threats': {
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;
          let url = `${this.baseUrl}/edr/v2/threats?limit=${limit}&offset=${offset}`;
          if (args.filter) url += `&filter=${encodeURIComponent(args.filter as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get threats: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Trellix EDR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_threat': {
          const threatId = args.threatId as string;
          if (!threatId) {
            return { content: [{ type: 'text', text: 'threatId is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/edr/v2/threats/${encodeURIComponent(threatId)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get threat: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Trellix EDR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_devices': {
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;
          let url = `${this.baseUrl}/edr/v2/devices?limit=${limit}&offset=${offset}`;
          if (args.filter) url += `&filter=${encodeURIComponent(args.filter as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to search devices: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Trellix EDR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_device': {
          const deviceId = args.deviceId as string;
          if (!deviceId) {
            return { content: [{ type: 'text', text: 'deviceId is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/edr/v2/devices/${encodeURIComponent(deviceId)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get device: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Trellix EDR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_investigations': {
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;
          let url = `${this.baseUrl}/edr/v2/investigations?limit=${limit}&offset=${offset}`;
          if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get investigations: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Trellix EDR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_investigation': {
          const investigationId = args.investigationId as string;
          if (!investigationId) {
            return { content: [{ type: 'text', text: 'investigationId is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/edr/v2/investigations/${encodeURIComponent(investigationId)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get investigation: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Trellix EDR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_action_history': {
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;
          const url = `${this.baseUrl}/edr/v2/action-history?limit=${limit}&offset=${offset}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get action history: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Trellix EDR returned non-JSON response (HTTP ${response.status})`); }
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
