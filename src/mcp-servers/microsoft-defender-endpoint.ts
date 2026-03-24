/**
 * Microsoft Defender for Endpoint MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no vendor-shipped MCP server for Microsoft Defender for Endpoint.

import { ToolDefinition, ToolResult } from './types.js';

// Base URL: https://api.security.microsoft.com  (regional variants available for performance:
//   us.api.security.microsoft.com, eu.api.security.microsoft.com, uk.api.security.microsoft.com, etc.)
// Auth: OAuth2 client_credentials grant via
//   POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
//   scope = https://api.securitycenter.microsoft.com/.default
//   (Note: some legacy endpoints require the securitycenter.microsoft.com audience — the scope above covers both.)
// Ref: https://learn.microsoft.com/en-us/defender-endpoint/api/exposed-apis-list

interface MicrosoftDefenderEndpointConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class MicrosoftDefenderEndpointMCPServer {
  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: MicrosoftDefenderEndpointConfig) {
    this.tenantId = config.tenantId;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.security.microsoft.com';
  }

  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(this.tenantId)}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://api.securitycenter.microsoft.com/.default',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Token request failed: ${response.status} ${errText}`);
    }

    const tokenData = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = tokenData.access_token;
    this.tokenExpiresAt = now + tokenData.expires_in * 1000;
    return this.accessToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alerts',
        description: 'Retrieve a collection of alerts from Microsoft Defender for Endpoint. Supports OData $filter (alertCreationTime, severity, status, category, detectionSource), $top (max 10000), $skip, and $expand=evidence.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. "severity eq \'High\' and status eq \'New\'")',
            },
            top: {
              type: 'number',
              description: 'Maximum number of results to return (max: 10000, default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination',
            },
            expand: {
              type: 'string',
              description: 'OData $expand value — use "evidence" to include related evidence objects',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get a single alert by its ID from Microsoft Defender for Endpoint (GET /api/alerts/{id})',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Alert ID (e.g. da637308392288907382_-880718168)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_machines',
        description: 'Retrieve a collection of onboarded devices. Supports OData $filter (computerDnsName, healthStatus, osPlatform, riskScore, exposureLevel, onboardingStatus, lastSeen), $top (max 10000), $skip.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. "healthStatus eq \'Active\' and riskScore eq \'High\'")',
            },
            top: {
              type: 'number',
              description: 'Maximum number of results to return (max: 10000, default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination',
            },
          },
        },
      },
      {
        name: 'get_machine',
        description: 'Get a single machine/device by its ID from Microsoft Defender for Endpoint (GET /api/machines/{id})',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Machine ID (40-character hex string)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_machine_alerts',
        description: 'Retrieve all alerts associated with a specific machine (GET /api/machines/{id}/alerts)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Machine ID (40-character hex string)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'isolate_machine',
        description: 'Isolate a machine from the network (POST /api/machines/{id}/isolate). Requires Machine.Isolate permission.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Machine ID (40-character hex string)',
            },
            comment: {
              type: 'string',
              description: 'Comment to associate with the isolation action (required by the API)',
            },
            isolationType: {
              type: 'string',
              description: 'Type of isolation: Full, Selective, or UnManagedDevice (default: Full)',
            },
          },
          required: ['id', 'comment'],
        },
      },
      {
        name: 'unisolate_machine',
        description: 'Remove a machine from network isolation (POST /api/machines/{id}/unisolate). Requires Machine.Isolate permission.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Machine ID (40-character hex string)',
            },
            comment: {
              type: 'string',
              description: 'Comment to associate with the unisolation action',
            },
          },
          required: ['id', 'comment'],
        },
      },
      {
        name: 'run_advanced_query',
        description: 'Run a Kusto Query Language (KQL) advanced hunting query against Defender for Endpoint event data (POST /api/advancedqueries/run). Results limited to last 30 days and max 100,000 rows.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'KQL query string (e.g. "DeviceProcessEvents | where FileName =~ \'powershell.exe\' | limit 10")',
            },
          },
          required: ['query'],
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
      };

      switch (name) {
        case 'list_alerts': {
          const top = (args.top as number) || 100;
          let url = `${this.baseUrl}/api/alerts?$top=${top}`;
          if (args.filter) url += `&$filter=${encodeURIComponent(args.filter as string)}`;
          if (args.skip) url += `&$skip=${args.skip as number}`;
          if (args.expand) url += `&$expand=${encodeURIComponent(args.expand as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list alerts: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`MDE returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_alert': {
          const id = args.id as string;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/api/alerts/${encodeURIComponent(id)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get alert: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`MDE returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_machines': {
          const top = (args.top as number) || 100;
          let url = `${this.baseUrl}/api/machines?$top=${top}`;
          if (args.filter) url += `&$filter=${encodeURIComponent(args.filter as string)}`;
          if (args.skip) url += `&$skip=${args.skip as number}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list machines: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`MDE returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_machine': {
          const id = args.id as string;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/api/machines/${encodeURIComponent(id)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get machine: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`MDE returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_machine_alerts': {
          const id = args.id as string;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/api/machines/${encodeURIComponent(id)}/alerts`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get machine alerts: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`MDE returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'isolate_machine': {
          const id = args.id as string;
          const comment = args.comment as string;
          if (!id || !comment) {
            return { content: [{ type: 'text', text: 'id and comment are required' }], isError: true };
          }
          const body: Record<string, unknown> = {
            Comment: comment,
            IsolationType: (args.isolationType as string) || 'Full',
          };
          const response = await fetch(`${this.baseUrl}/api/machines/${encodeURIComponent(id)}/isolate`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to isolate machine: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`MDE returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'unisolate_machine': {
          const id = args.id as string;
          const comment = args.comment as string;
          if (!id || !comment) {
            return { content: [{ type: 'text', text: 'id and comment are required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/api/machines/${encodeURIComponent(id)}/unisolate`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ Comment: comment }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to unisolate machine: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`MDE returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'run_advanced_query': {
          const query = args.query as string;
          if (!query) {
            return { content: [{ type: 'text', text: 'query is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/api/advancedqueries/run`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ Query: query }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to run advanced query: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`MDE returned non-JSON response (HTTP ${response.status})`); }
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
