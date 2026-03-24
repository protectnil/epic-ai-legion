/**
 * Vanta MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/VantaInc/vanta-mcp-server — 13 tools (public preview, actively maintained)
// Note: The official Vanta MCP server is in public preview. This adapter provides a
// stable, self-hostable alternative using the Vanta REST API directly with OAuth2
// client credentials — suitable for server-side automation and air-gapped deployments.
//
// Auth: OAuth2 client_credentials flow.
//   POST https://api.vanta.com/oauth/token with:
//     { client_id, client_secret, grant_type: "client_credentials", scope: "vanta-api.all:read" }
//   Returns a Bearer token valid for 1 hour.
//   Verified at: developer.vanta.com/docs/api-access-setup
//
// Base URL: https://api.vanta.com  (single global endpoint, no regional variants)
// API version prefix: /v1/
//
// Verified endpoints (developer.vanta.com/reference):
//   GET  /v1/tests
//   GET  /v1/controls
//   GET  /v1/controls/{controlId}/tests
//   GET  /v1/documents
//   GET  /v1/integrations
//   GET  /v1/people
//   GET  /v1/risks
//   GET  /v1/vulnerabilities
//   GET  /v1/frameworks

import { ToolDefinition, ToolResult } from './types.js';

interface VantaConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class VantaMCPServer {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: VantaConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.vanta.com';
  }

  private async getToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
        scope: 'vanta-api.all:read vanta-api.all:write',
      }),
    });

    if (!response.ok) {
      throw new Error(`Vanta token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token?: string; expires_in?: number };
    const token = data?.access_token;
    if (!token) {
      throw new Error('Vanta token response did not contain access_token');
    }

    const expiresIn = data.expires_in ?? 3600;
    this.cachedToken = token;
    this.tokenExpiry = Date.now() + (expiresIn - 60) * 1000;
    return token;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_tests',
        description: 'List compliance tests (automated checks) in Vanta with their current pass/fail status and associated controls',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'list_controls',
        description: 'List security controls tracked in Vanta across all compliance frameworks (SOC 2, ISO 27001, HIPAA, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            framework_id: {
              type: 'string',
              description: 'Filter controls by framework ID',
            },
            page_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_control_tests',
        description: 'Get all tests associated with a specific control, showing which automated checks are mapped to that control requirement',
        inputSchema: {
          type: 'object',
          properties: {
            control_id: {
              type: 'string',
              description: 'The ID of the control whose tests to retrieve',
            },
          },
          required: ['control_id'],
        },
      },
      {
        name: 'list_frameworks',
        description: 'List compliance frameworks configured in Vanta (SOC 2, ISO 27001, HIPAA, GDPR, PCI DSS, etc.) with their overall readiness status',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'list_vulnerabilities',
        description: 'List vulnerabilities tracked in Vanta with their severity, affected assets, and SLA deadlines',
        inputSchema: {
          type: 'object',
          properties: {
            severity: {
              type: 'string',
              description: 'Filter by severity: critical, high, medium, low',
            },
            page_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'list_people',
        description: 'List people (employees and contractors) in Vanta — their access reviews, training status, and compliance posture',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'list_risks',
        description: 'List risk scenarios in Vanta with scoring, treatment status (accepted, mitigated, transferred), and mitigation strategies',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'list_integrations',
        description: 'List third-party integrations connected to Vanta and their sync status (AWS, GitHub, GCP, Okta, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
    ];
  }

  private async request(path: string, method: string, body?: unknown): Promise<ToolResult> {
    const token = await this.getToken();
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Vanta API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Vanta returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_tests': {
          const pageSize = (args.page_size as number) ?? 100;
          let path = `/v1/tests?pageSize=${pageSize}`;
          if (args.page_cursor) path += `&pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_controls': {
          const pageSize = (args.page_size as number) ?? 100;
          let path = `/v1/controls?pageSize=${pageSize}`;
          if (args.framework_id) path += `&frameworkId=${encodeURIComponent(args.framework_id as string)}`;
          if (args.page_cursor) path += `&pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'get_control_tests': {
          const controlId = args.control_id as string;
          if (!controlId) {
            return { content: [{ type: 'text', text: 'control_id is required' }], isError: true };
          }
          return await this.request(`/v1/controls/${encodeURIComponent(controlId)}/tests`, 'GET');
        }

        case 'list_frameworks': {
          let path = '/v1/frameworks';
          if (args.page_cursor) path += `?pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_vulnerabilities': {
          const pageSize = (args.page_size as number) ?? 100;
          let path = `/v1/vulnerabilities?pageSize=${pageSize}`;
          if (args.severity) path += `&severity=${encodeURIComponent(args.severity as string)}`;
          if (args.page_cursor) path += `&pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_people': {
          const pageSize = (args.page_size as number) ?? 100;
          let path = `/v1/people?pageSize=${pageSize}`;
          if (args.page_cursor) path += `&pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_risks': {
          const pageSize = (args.page_size as number) ?? 100;
          let path = `/v1/risks?pageSize=${pageSize}`;
          if (args.page_cursor) path += `&pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_integrations': {
          let path = '/v1/integrations';
          if (args.page_cursor) path += `?pageCursor=${encodeURIComponent(args.page_cursor as string)}`;
          return await this.request(path, 'GET');
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
