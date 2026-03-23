/** Ping Identity PingOne MCP Adapter / Built on the Epic AI® Intelligence Platform / Copyright 2026 protectNIL Inc. Apache-2.0 */

import { ToolDefinition, ToolResult } from './types.js';

interface PingIdentityConfig {
  bearerToken: string;
  environmentId: string;
  baseUrl?: string;
}

export class PingIdentityMCPServer {
  private readonly bearerToken: string;
  private readonly environmentId: string;
  private readonly baseUrl: string;

  constructor(config: PingIdentityConfig) {
    this.bearerToken = config.bearerToken;
    this.environmentId = config.environmentId;
    const rawBase = config.baseUrl || 'https://api.pingone.com';
    this.baseUrl = rawBase.replace(/\/v\d+\/?$/, '');
  }

  private envPath(path: string): string {
    return `${this.baseUrl}/v1/environments/${encodeURIComponent(this.environmentId)}/${path}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List users with optional filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 100)',
            },
            filter: {
              type: 'string',
              description: 'SCIM filter expression for users',
            },
            order: {
              type: 'string',
              description: 'Sort order for results',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get detailed information about a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Unique user identifier',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_policies',
        description: 'List sign-on policies for the environment',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of policies to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'create_risk_evaluation',
        description: 'Create a risk evaluation for an authentication event',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User identifier for the authentication event',
            },
            user_type: {
              type: 'string',
              description: 'User type (PING_ONE)',
              default: 'PING_ONE',
            },
            ip: {
              type: 'string',
              description: 'IP address of the authentication event',
            },
            risk_policy_set_id: {
              type: 'string',
              description: 'ID of the risk policy set to apply (omit for environment default)',
            },
          },
          required: ['user_id', 'ip'],
        },
      },
      {
        name: 'list_sessions',
        description: 'List active and historical user sessions',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Filter sessions by user ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum sessions to return (default: 100)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_users': {
          const limit = (args.limit as number) || 100;
          const filter = args.filter as string | undefined;
          const order = args.order as string | undefined;

          let url = this.envPath(`users?limit=${limit}`);
          if (filter) url += `&filter=${encodeURIComponent(filter)}`;
          if (order) url += `&order=${encodeURIComponent(order)}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${this.bearerToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list users: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Ping Identity returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_user': {
          const userId = args.user_id as string;
          if (!userId) {
            return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
          }

          const response = await fetch(this.envPath(`users/${encodeURIComponent(userId)}`), {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${this.bearerToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get user: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Ping Identity returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_policies': {
          const limit = (args.limit as number) || 100;

          const url = this.envPath(`signOnPolicies?limit=${limit}`);

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${this.bearerToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list policies: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Ping Identity returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_risk_evaluation': {
          const userId = args.user_id as string;
          const ip = args.ip as string;
          const userType = (args.user_type as string) || 'PING_ONE';
          const riskPolicySetId = args.risk_policy_set_id as string | undefined;

          if (!userId || !ip) {
            return { content: [{ type: 'text', text: 'user_id and ip are required' }], isError: true };
          }

          const body: Record<string, unknown> = {
            event: {
              user: { id: userId, type: userType },
              ip,
            },
          };
          if (riskPolicySetId) {
            body['riskPolicySet'] = { id: riskPolicySetId };
          }

          const response = await fetch(this.envPath('riskEvaluations'), {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.bearerToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create risk evaluation: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Ping Identity returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_sessions': {
          const userId = args.user_id as string | undefined;
          const limit = (args.limit as number) || 100;

          let url = this.envPath(`sessions?limit=${limit}`);
          if (userId) url += `&filter=${encodeURIComponent(`user.id eq "${userId}"`)}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${this.bearerToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list sessions: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Ping Identity returned non-JSON response (HTTP ${response.status})`);
          }
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
