/**
 * Abnormal Security MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found
// No official Abnormal Security MCP server was found on GitHub as of March 2026.
//
// Auth: Authorization header with "Bearer {access_token}".
//   Token retrieved from Abnormal portal: Settings > Integrations > Abnormal REST API.
//   Verified from: abnormalsecurity.my.site.com/knowledgebase, app.swaggerhub.com/apis/abnormal-security/abx
//
// Base URL: https://api.abnormalplatform.com  (default)
//   The base URL may vary by tenant region. Pass the correct URL via baseUrl config.
//
// API version: v1
//
// Verified endpoints (SwaggerHub abnormal-security/abx v1.4.1, docs.d3security.com, Cortex XSOAR integration):
//   GET  /v1/threats
//   GET  /v1/threats/{threatId}
//   POST /v1/threats/{threatId}/actions    — remediate/unremediate
//   GET  /v1/cases
//   GET  /v1/cases/{caseId}
//   POST /v1/cases/{caseId}/actions        — acknowledge/close
//   GET  /v1/audit-logs
//   GET  /v1/employees

import { ToolDefinition, ToolResult } from './types.js';

interface AbnormalSecurityConfig {
  accessToken: string;
  baseUrl?: string;
}

export class AbnormalSecurityMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: AbnormalSecurityConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.abnormalplatform.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_threats',
        description: 'List email threats detected by Abnormal Security AI. Returns attack type, sender, recipients, and remediation status.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData-style filter string (e.g., "receivedTime gte 2024-01-01T00:00:00Z")',
            },
            page_size: {
              type: 'number',
              description: 'Number of threats per page (default: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
          },
        },
      },
      {
        name: 'get_threat',
        description: 'Get detailed information about a specific email threat by ID, including message metadata, attack indicators, and AI analysis',
        inputSchema: {
          type: 'object',
          properties: {
            threat_id: {
              type: 'string',
              description: 'The unique threat ID (UUID format)',
            },
          },
          required: ['threat_id'],
        },
      },
      {
        name: 'take_threat_action',
        description: 'Take a remediation action on a threat: remove detected messages from inboxes or restore previously removed messages',
        inputSchema: {
          type: 'object',
          properties: {
            threat_id: {
              type: 'string',
              description: 'The threat ID to take action on',
            },
            action: {
              type: 'string',
              description: 'Action to take: remediate (remove from inbox) or unremediate (restore)',
            },
          },
          required: ['threat_id', 'action'],
        },
      },
      {
        name: 'list_cases',
        description: 'List Abnormal Security Cases — groups of related threats and behavioral signals associated with a specific attacker or campaign',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData-style filter string (e.g., "lastModifiedTime gte 2024-01-01T00:00:00Z")',
            },
            page_size: {
              type: 'number',
              description: 'Number of cases per page (default: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
          },
        },
      },
      {
        name: 'get_case',
        description: 'Get full details for a specific Abnormal Security case, including associated threats, affected users, and timeline',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: {
              type: 'string',
              description: 'The unique case ID',
            },
          },
          required: ['case_id'],
        },
      },
      {
        name: 'take_case_action',
        description: 'Take an action on a case: acknowledge (mark as reviewed) or close (mark as resolved)',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: {
              type: 'string',
              description: 'The case ID to take action on',
            },
            action: {
              type: 'string',
              description: 'Action to take: acknowledge or close',
            },
          },
          required: ['case_id', 'action'],
        },
      },
      {
        name: 'get_audit_logs',
        description: 'Retrieve Abnormal Security portal audit logs — API calls, message actions, and administrative activity',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData-style filter string (e.g., "eventTime gte 2024-01-01T00:00:00Z")',
            },
            page_size: {
              type: 'number',
              description: 'Number of log entries per page (default: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
          },
        },
      },
      {
        name: 'list_employees',
        description: 'List employees and their email security risk profiles from the Abnormal Security identity graph',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of employees per page (default: 100)',
            },
            page_number: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
          },
        },
      },
    ];
  }

  private async request(path: string, method: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
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
        content: [{ type: 'text', text: `Abnormal Security API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Abnormal Security returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_threats': {
          const pageSize = (args.page_size as number) ?? 100;
          const pageNumber = (args.page_number as number) ?? 1;
          let path = `/v1/threats?pageSize=${pageSize}&pageNumber=${pageNumber}`;
          if (args.filter) path += `&filter=${encodeURIComponent(args.filter as string)}`;
          return await this.request(path, 'GET');
        }

        case 'get_threat': {
          const threatId = args.threat_id as string;
          if (!threatId) {
            return { content: [{ type: 'text', text: 'threat_id is required' }], isError: true };
          }
          return await this.request(`/v1/threats/${encodeURIComponent(threatId)}`, 'GET');
        }

        case 'take_threat_action': {
          const threatId = args.threat_id as string;
          const action = args.action as string;
          if (!threatId || !action) {
            return { content: [{ type: 'text', text: 'threat_id and action are required' }], isError: true };
          }
          return await this.request(`/v1/threats/${encodeURIComponent(threatId)}/actions`, 'POST', { action });
        }

        case 'list_cases': {
          const pageSize = (args.page_size as number) ?? 100;
          const pageNumber = (args.page_number as number) ?? 1;
          let path = `/v1/cases?pageSize=${pageSize}&pageNumber=${pageNumber}`;
          if (args.filter) path += `&filter=${encodeURIComponent(args.filter as string)}`;
          return await this.request(path, 'GET');
        }

        case 'get_case': {
          const caseId = args.case_id as string;
          if (!caseId) {
            return { content: [{ type: 'text', text: 'case_id is required' }], isError: true };
          }
          return await this.request(`/v1/cases/${encodeURIComponent(caseId)}`, 'GET');
        }

        case 'take_case_action': {
          const caseId = args.case_id as string;
          const action = args.action as string;
          if (!caseId || !action) {
            return { content: [{ type: 'text', text: 'case_id and action are required' }], isError: true };
          }
          return await this.request(`/v1/cases/${encodeURIComponent(caseId)}/actions`, 'POST', { action });
        }

        case 'get_audit_logs': {
          const pageSize = (args.page_size as number) ?? 100;
          const pageNumber = (args.page_number as number) ?? 1;
          let path = `/v1/audit-logs?pageSize=${pageSize}&pageNumber=${pageNumber}`;
          if (args.filter) path += `&filter=${encodeURIComponent(args.filter as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_employees': {
          const pageSize = (args.page_size as number) ?? 100;
          const pageNumber = (args.page_number as number) ?? 1;
          return await this.request(`/v1/employees?pageSize=${pageSize}&pageNumber=${pageNumber}`, 'GET');
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
