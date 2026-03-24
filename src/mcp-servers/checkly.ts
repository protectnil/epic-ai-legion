/**
 * Checkly MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — Checkly has no vendor-published MCP server as of March 2026.

import { ToolDefinition, ToolResult } from './types.js';

interface ChecklyConfig {
  /**
   * Checkly API key. Passed as: Authorization: Bearer {apiKey}.
   * Generate at app.checklyhq.com → Account Settings → API Keys.
   */
  apiKey: string;
  /**
   * Checkly Account ID. Required as the x-checkly-account header on every request.
   * Found at app.checklyhq.com → Account Settings → General.
   */
  accountId: string;
  /** Override the base URL (default: https://api.checklyhq.com/v1). */
  baseUrl?: string;
}

export class ChecklyMCPServer {
  private readonly apiKey: string;
  private readonly accountId: string;
  private readonly baseUrl: string;

  constructor(config: ChecklyConfig) {
    this.apiKey = config.apiKey;
    this.accountId = config.accountId;
    this.baseUrl = config.baseUrl || 'https://api.checklyhq.com/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_checks',
        description: 'List all checks (API and browser) in the Checkly account',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of checks to return (max 100, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_check',
        description: 'Retrieve the full configuration and details for a specific check',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'UUID of the check to retrieve',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'create_api_check',
        description: 'Create a new API check that monitors an HTTP endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the check',
            },
            url: {
              type: 'string',
              description: 'URL to monitor (e.g. https://api.example.com/health)',
            },
            frequency: {
              type: 'number',
              description: 'Check run frequency in minutes (default: 10)',
            },
            method: {
              type: 'string',
              description: 'HTTP method: GET | POST | PUT | PATCH | DELETE | HEAD (default: GET)',
            },
            activated: {
              type: 'boolean',
              description: 'Whether the check is active immediately (default: true)',
            },
            locations: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of location slugs to run from (e.g. ["us-east-1", "eu-west-1"])',
            },
          },
          required: ['name', 'url'],
        },
      },
      {
        name: 'delete_check',
        description: 'Delete a check permanently from the Checkly account',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'UUID of the check to delete',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'list_check_results',
        description: 'List recent check results for a specific check',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'UUID of the check to retrieve results for',
            },
            limit: {
              type: 'number',
              description: 'Number of results to return (max 100, default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            has_failures: {
              type: 'boolean',
              description: 'Filter to only return failed results when true',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'list_check_statuses',
        description: 'List the current pass/fail status for all checks in the account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_check_groups',
        description: 'List all check groups in the Checkly account',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of groups to return (max 100, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'list_alert_channels',
        description: 'List all alert channels configured in the Checkly account',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of alert channels to return (max 100, default: 100)',
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
        Authorization: `Bearer ${this.apiKey}`,
        'x-checkly-account': this.accountId,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_checks': {
          const limit = (args.limit as number) || 100;
          const page = (args.page as number) || 1;
          const response = await fetch(`${this.baseUrl}/checks?limit=${limit}&page=${page}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list checks: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Checkly returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_check': {
          const checkId = args.check_id as string;
          if (!checkId) {
            return { content: [{ type: 'text', text: 'check_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/checks/${encodeURIComponent(checkId)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get check: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Checkly returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_api_check': {
          const checkName = args.name as string;
          const url = args.url as string;
          if (!checkName || !url) {
            return { content: [{ type: 'text', text: 'name and url are required' }], isError: true };
          }
          const body: Record<string, unknown> = {
            name: checkName,
            activated: typeof args.activated === 'boolean' ? args.activated : true,
            frequency: (args.frequency as number) || 10,
            type: 'API',
            request: {
              method: (args.method as string) || 'GET',
              url,
            },
          };
          if (args.locations) body.locations = args.locations;

          const response = await fetch(`${this.baseUrl}/checks/api`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create API check: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Checkly returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_check': {
          const checkId = args.check_id as string;
          if (!checkId) {
            return { content: [{ type: 'text', text: 'check_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/checks/${encodeURIComponent(checkId)}`, { method: 'DELETE', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to delete check: ${response.statusText}` }], isError: true };
          }
          return { content: [{ type: 'text', text: `Check ${checkId} deleted successfully` }], isError: false };
        }

        case 'list_check_results': {
          const checkId = args.check_id as string;
          if (!checkId) {
            return { content: [{ type: 'text', text: 'check_id is required' }], isError: true };
          }
          const limit = (args.limit as number) || 10;
          const page = (args.page as number) || 1;
          let url = `${this.baseUrl}/check-results/${encodeURIComponent(checkId)}?limit=${limit}&page=${page}`;
          if (typeof args.has_failures === 'boolean') url += `&hasFailures=${args.has_failures}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list check results: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Checkly returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_check_statuses': {
          const response = await fetch(`${this.baseUrl}/check-statuses`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list check statuses: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Checkly returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_check_groups': {
          const limit = (args.limit as number) || 100;
          const page = (args.page as number) || 1;
          const response = await fetch(`${this.baseUrl}/check-groups?limit=${limit}&page=${page}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list check groups: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Checkly returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_alert_channels': {
          const limit = (args.limit as number) || 100;
          const page = (args.page as number) || 1;
          const response = await fetch(`${this.baseUrl}/alert-channels?limit=${limit}&page=${page}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list alert channels: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Checkly returned non-JSON (HTTP ${response.status})`); }
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
