/** CrowdStrike Falcon MCP Adapter / Built on the Epic AI® Intelligence Platform / Copyright 2026 protectNIL Inc. Apache-2.0 */

import { ToolDefinition, ToolResult } from './types.js';

interface CrowdStrikeConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class CrowdStrikeMCPServer {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: CrowdStrikeConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.crowdstrike.com';
  }

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    try {
      const authHeader = btoa(`${this.clientId}:${this.clientSecret}`);
      const response = await fetch(`${this.baseUrl}/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`OAuth2 token request failed: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
      };
      this.bearerToken = data.access_token;
      this.tokenExpiry = now + (data.expires_in - 60) * 1000;
      return this.bearerToken;
    } catch (error) {
      throw new Error(
        `Failed to obtain CrowdStrike OAuth2 token: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_detections',
        description: 'List detections with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of detections to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
            filter: {
              type: 'string',
              description: 'Filter expression for detections',
            },
          },
        },
      },
      {
        name: 'get_detection',
        description: 'Get details of a specific detection by ID',
        inputSchema: {
          type: 'object',
          properties: {
            detection_id: {
              type: 'string',
              description: 'Unique detection identifier',
            },
          },
          required: ['detection_id'],
        },
      },
      {
        name: 'search_hosts',
        description: 'Search for hosts with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter expression for hosts',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of hosts to return',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
          },
        },
      },
      {
        name: 'get_host_detail',
        description: 'Get detailed information about a specific host',
        inputSchema: {
          type: 'object',
          properties: {
            host_id: {
              type: 'string',
              description: 'Unique host identifier (agent ID)',
            },
          },
          required: ['host_id'],
        },
      },
      {
        name: 'quarantine_host',
        description: 'Quarantine a host to prevent network communication',
        inputSchema: {
          type: 'object',
          properties: {
            host_id: {
              type: 'string',
              description: 'Unique host identifier (agent ID)',
            },
            action_name: {
              type: 'string',
              description: 'Action name (typically "contain")',
            },
          },
          required: ['host_id'],
        },
      },
      {
        name: 'search_incidents',
        description:
          'Search for incidents (Automated Leads) using the Alerts API v2. The legacy /incidents API was decommissioned March 9 2026; this tool queries /alerts/queries/alerts/v2 which is the current replacement for incident-level SOC workflows.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'FQL filter expression (e.g. "severity:>=\'High\'+status:\'new\'")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of alert IDs to return (default: 50)',
            },
            sort: {
              type: 'string',
              description: 'Sort expression (e.g. "created_timestamp|desc")',
            },
            after: {
              type: 'string',
              description: 'Pagination token returned from a previous response',
            },
          },
        },
      },
      {
        name: 'get_incident',
        description:
          'Get full details for one or more incidents (Automated Leads) by composite alert ID using the Alerts API v2. The legacy /incidents API was decommissioned March 9 2026; this tool posts to /alerts/entities/alerts/v2.',
        inputSchema: {
          type: 'object',
          properties: {
            composite_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'One or more composite alert IDs returned by search_incidents',
            },
          },
          required: ['composite_ids'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const token = await this.getOrRefreshToken();

      switch (name) {
        case 'list_detections': {
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;
          const filter = args.filter as string | undefined;

          let url = `${this.baseUrl}/detects/queries/detects/v1?limit=${limit}&offset=${offset}`;
          if (filter) {
            url += `&filter=${encodeURIComponent(filter)}`;
          }

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list detections: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`CrowdStrike returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_detection': {
          const detectionId = args.detection_id as string;
          if (!detectionId) {
            return {
              content: [{ type: 'text', text: 'detection_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/detects/entities/summaries/GET/v1?ids=${encodeURIComponent(detectionId)}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get detection: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`CrowdStrike returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_hosts': {
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;
          const filter = args.filter as string | undefined;

          let url = `${this.baseUrl}/hosts/queries/devices/v1?limit=${limit}&offset=${offset}`;
          if (filter) {
            url += `&filter=${encodeURIComponent(filter)}`;
          }

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search hosts: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`CrowdStrike returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_host_detail': {
          const hostId = args.host_id as string;
          if (!hostId) {
            return {
              content: [{ type: 'text', text: 'host_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/hosts/entities/devices/GET/v1?ids=${encodeURIComponent(hostId)}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get host details: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`CrowdStrike returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'quarantine_host': {
          const hostId = args.host_id as string;
          const actionName = (args.action_name as string) || 'contain';

          if (!hostId) {
            return {
              content: [{ type: 'text', text: 'host_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/host-actions/entities/actions/v1`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action_parameters: [],
              action_name: actionName,
              host_ids: [hostId],
            }),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to quarantine host: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`CrowdStrike returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_incidents': {
          const limit = (args.limit as number) || 50;
          const filter = args.filter as string | undefined;
          const sort = args.sort as string | undefined;
          const after = args.after as string | undefined;

          let url = `${this.baseUrl}/alerts/queries/alerts/v2?limit=${limit}`;
          if (filter) url += `&filter=${encodeURIComponent(filter)}`;
          if (sort) url += `&sort=${encodeURIComponent(sort)}`;
          if (after) url += `&after=${encodeURIComponent(after)}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search incidents: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`CrowdStrike returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_incident': {
          const compositeIds = args.composite_ids as string[];
          if (!compositeIds || compositeIds.length === 0) {
            return {
              content: [{ type: 'text', text: 'composite_ids is required and must be non-empty' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/alerts/entities/alerts/v2`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ composite_ids: compositeIds }),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get incident details: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`CrowdStrike returned non-JSON response (HTTP ${response.status})`); }
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
        content: [{ type: 'text', text: String(`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`) }],
        isError: true,
      };
    }
  }
}
