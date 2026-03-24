/**
 * Veracode MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/dipsylala/veracode-mcp — 15 tools (alpha, actively maintained)
// Note: The official MCP wraps the Veracode CLI for pipeline scans. This adapter targets the
// Veracode Platform REST API directly with HMAC-SHA-256 signing — suitable for server-side,
// air-gapped, or CI/CD integrations that need credential-only access without a local CLI.
//
// Auth: VERACODE-HMAC-SHA-256 per-request signing (id + api_key).
// Base URLs (specify via baseUrl config):
//   Commercial (US): https://api.veracode.com  (default)
//   European:        https://api.veracode.eu
//
// Verified endpoints (docs.veracode.com):
//   /appsec/v1/applications
//   /appsec/v2/applications/{guid}/findings
//   /appsec/v1/applications/{guid}/sandboxes
//   /appsec/v1/applications/{guid}/policy
//   /dae/v2/analyses
//   /srcclr/v3/workspaces

import { createHmac, randomBytes } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';

interface VeracodeConfig {
  apiId: string;
  apiKey: string;
  baseUrl?: string;
}

function buildVeracodeAuthHeader(
  apiId: string,
  apiKey: string,
  urlPath: string,
  method: string,
): string {
  const nonce = randomBytes(16).toString('hex').toLowerCase();
  const ts = Date.now().toString();
  const data = `id=${apiId}&host=api.veracode.com&url=${urlPath}&method=${method.toUpperCase()}`;

  const encryptedNonce = createHmac('sha256', Buffer.from(apiKey, 'hex')).update(nonce).digest();
  const encryptedTs = createHmac('sha256', encryptedNonce).update(ts).digest();
  const signingKey = createHmac('sha256', encryptedTs).update('vcode_request_version_1').digest();
  const sig = createHmac('sha256', signingKey).update(data).digest('hex').toLowerCase();

  return `VERACODE-HMAC-SHA-256 id=${apiId},ts=${ts},nonce=${nonce},sig=${sig}`;
}

export class VericodeMCPServer {
  private readonly apiId: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: VeracodeConfig) {
    this.apiId = config.apiId;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.veracode.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_applications',
        description: 'List all applications in the Veracode portfolio with their policy and scan status',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Zero-based page number for pagination (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Results per page (max 500, default: 50)',
            },
            name: {
              type: 'string',
              description: 'Filter applications by name (partial match)',
            },
          },
        },
      },
      {
        name: 'get_application',
        description: 'Get profile and policy details for a specific Veracode application by GUID',
        inputSchema: {
          type: 'object',
          properties: {
            application_guid: {
              type: 'string',
              description: 'The GUID of the application to retrieve',
            },
          },
          required: ['application_guid'],
        },
      },
      {
        name: 'get_findings',
        description: 'Retrieve security findings (SAST, DAST, SCA, manual) for a Veracode application. Returns CWE, severity, file location, and remediation status.',
        inputSchema: {
          type: 'object',
          properties: {
            application_guid: {
              type: 'string',
              description: 'The GUID of the application to retrieve findings for',
            },
            scan_type: {
              type: 'string',
              description: 'Filter by scan type: STATIC, DYNAMIC, MANUAL, SCA (comma-separated)',
            },
            violates_policy: {
              type: 'boolean',
              description: 'If true, return only findings that violate the security policy',
            },
            severity: {
              type: 'string',
              description: 'Comma-separated severity levels 0 (informational) through 5 (very high)',
            },
            page: {
              type: 'number',
              description: 'Zero-based page number (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Results per page (max 500, default: 50)',
            },
          },
          required: ['application_guid'],
        },
      },
      {
        name: 'list_sandboxes',
        description: 'List all development sandboxes for a Veracode application. Sandboxes allow scanning feature branches without affecting policy evaluation.',
        inputSchema: {
          type: 'object',
          properties: {
            application_guid: {
              type: 'string',
              description: 'The GUID of the application whose sandboxes to list',
            },
          },
          required: ['application_guid'],
        },
      },
      {
        name: 'get_policy',
        description: 'Retrieve the security policy for a Veracode application, including pass/fail thresholds and grace period settings',
        inputSchema: {
          type: 'object',
          properties: {
            application_guid: {
              type: 'string',
              description: 'The GUID of the application whose policy to retrieve',
            },
          },
          required: ['application_guid'],
        },
      },
      {
        name: 'get_dynamic_analyses',
        description: 'List Dynamic Analysis (DAST) scan configurations, schedules, and their current status',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Zero-based page number (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Results per page (max 500, default: 50)',
            },
          },
        },
      },
      {
        name: 'submit_mitigation',
        description: 'Submit a mitigation or annotation for a finding (e.g., accept risk, mark false positive, mark remediated). Requires Reviewer or Security Lead role.',
        inputSchema: {
          type: 'object',
          properties: {
            application_guid: {
              type: 'string',
              description: 'The GUID of the application containing the finding',
            },
            issue_id: {
              type: 'number',
              description: 'The numeric issue ID of the finding to annotate',
            },
            action: {
              type: 'string',
              description: 'Action: APPDESIGN, NETENV, OSENV, LIBRARY, ACCEPTRISK, NOACTIONREQUIRED, REMEDIATED, REJECTED, ACCEPTED',
            },
            comment: {
              type: 'string',
              description: 'Justification comment for the mitigation (required for most actions)',
            },
          },
          required: ['application_guid', 'issue_id', 'action'],
        },
      },
      {
        name: 'list_sca_workspaces',
        description: 'List Software Composition Analysis (SCA) workspaces for open-source vulnerability tracking and license compliance',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Zero-based page number (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Results per page (max 500, default: 50)',
            },
          },
        },
      },
    ];
  }

  private async request(path: string, method: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const authHeader = buildVeracodeAuthHeader(this.apiId, this.apiKey, path, method);

    const headers: Record<string, string> = {
      Authorization: authHeader,
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
        content: [{ type: 'text', text: `Veracode API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Veracode returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_applications': {
          const page = (args.page as number) ?? 0;
          const size = (args.size as number) ?? 50;
          let path = `/appsec/v1/applications?page=${page}&size=${size}`;
          if (args.name) path += `&name=${encodeURIComponent(args.name as string)}`;
          return await this.request(path, 'GET');
        }

        case 'get_application': {
          const guid = args.application_guid as string;
          if (!guid) {
            return { content: [{ type: 'text', text: 'application_guid is required' }], isError: true };
          }
          return await this.request(`/appsec/v1/applications/${encodeURIComponent(guid)}`, 'GET');
        }

        case 'get_findings': {
          const guid = args.application_guid as string;
          if (!guid) {
            return { content: [{ type: 'text', text: 'application_guid is required' }], isError: true };
          }
          const page = (args.page as number) ?? 0;
          const size = (args.size as number) ?? 50;
          let path = `/appsec/v2/applications/${encodeURIComponent(guid)}/findings?page=${page}&size=${size}`;
          if (args.scan_type) path += `&scan_type=${encodeURIComponent(args.scan_type as string)}`;
          if (typeof args.violates_policy === 'boolean') path += `&violates_policy=${args.violates_policy}`;
          if (args.severity) path += `&severity=${encodeURIComponent(args.severity as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_sandboxes': {
          const guid = args.application_guid as string;
          if (!guid) {
            return { content: [{ type: 'text', text: 'application_guid is required' }], isError: true };
          }
          return await this.request(`/appsec/v1/applications/${encodeURIComponent(guid)}/sandboxes`, 'GET');
        }

        case 'get_policy': {
          const guid = args.application_guid as string;
          if (!guid) {
            return { content: [{ type: 'text', text: 'application_guid is required' }], isError: true };
          }
          return await this.request(`/appsec/v1/applications/${encodeURIComponent(guid)}/policy`, 'GET');
        }

        case 'get_dynamic_analyses': {
          const page = (args.page as number) ?? 0;
          const size = (args.size as number) ?? 50;
          return await this.request(`/dae/v2/analyses?page=${page}&size=${size}`, 'GET');
        }

        case 'submit_mitigation': {
          const guid = args.application_guid as string;
          const issueId = args.issue_id as number;
          const action = args.action as string;
          if (!guid || issueId === undefined || !action) {
            return { content: [{ type: 'text', text: 'application_guid, issue_id, and action are required' }], isError: true };
          }
          const body: Record<string, unknown> = { action };
          if (args.comment) body.comment = args.comment;
          return await this.request(
            `/appsec/v2/applications/${encodeURIComponent(guid)}/findings/${issueId}/annotations`,
            'POST',
            body,
          );
        }

        case 'list_sca_workspaces': {
          const page = (args.page as number) ?? 0;
          const size = (args.size as number) ?? 50;
          return await this.request(`/srcclr/v3/workspaces?page=${page}&size=${size}`, 'GET');
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
