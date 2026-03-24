/**
 * GitGuardian MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/GitGuardian/ggmcp — actively maintained, 221 commits
// The official ggmcp supports both GitGuardian SaaS and self-hosted instances and covers
// secret scanning, incident management, and honeytokens. This adapter provides the same
// coverage via the REST API directly — suitable for environments where running a Python
// subprocess is not feasible.
//
// Auth: Authorization header with "Token {api_key}" prefix (NOT "Bearer").
//   Verified at docs.gitguardian.com/api-docs/authentication.
//
// Base URLs:
//   SaaS (default): https://api.gitguardian.com
//   Self-hosted:    https://{your-instance}/api  (pass via baseUrl config)
//
// Verified endpoints (api.gitguardian.com/docs, docs.gitguardian.com):
//   GET  /v1/health
//   GET  /v1/incidents/secrets
//   GET  /v1/incidents/secrets/{id}
//   PATCH /v1/incidents/secrets/{id}
//   GET  /v1/sources
//   GET  /v1/members
//   POST /v1/multiscan
//   GET  /v1/honeytokens
//   POST /v1/honeytokens

import { ToolDefinition, ToolResult } from './types.js';

interface GitGuardianConfig {
  apiKey: string;
  baseUrl?: string;
}

export class GitGuardianMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: GitGuardianConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.gitguardian.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'health_check',
        description: 'Check the validity of the GitGuardian API key and confirm connectivity to the API',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_secret_incidents',
        description: 'List secret detection incidents in the GitGuardian workspace — hardcoded credentials, API keys, and other secrets detected in commits',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by incident status: IGNORED, TRIGGERED, ASSIGNED, RESOLVED (default: all)',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: critical, high, medium, low, info, unknown',
            },
            date_before: {
              type: 'string',
              description: 'ISO 8601 date — return incidents before this date',
            },
            date_after: {
              type: 'string',
              description: 'ISO 8601 date — return incidents after this date',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 100, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_secret_incident',
        description: 'Get full details for a specific secret incident by ID, including the secret type, affected sources, and remediation history',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'number',
              description: 'The numeric ID of the secret incident to retrieve',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'update_incident_status',
        description: 'Update the status or assignee of a secret incident (e.g., mark as RESOLVED or IGNORED)',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'number',
              description: 'The numeric ID of the incident to update',
            },
            status: {
              type: 'string',
              description: 'New status: IGNORED, TRIGGERED, ASSIGNED, RESOLVED',
            },
            assignee_email: {
              type: 'string',
              description: 'Email address of the team member to assign the incident to',
            },
            ignore_reason: {
              type: 'string',
              description: 'Reason for ignoring (required when status is IGNORED): test_credential, low_risk, false_positive, other',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'scan_content',
        description: 'Scan text content or a document for hardcoded secrets using GitGuardian detectors. Supports over 500 secret types.',
        inputSchema: {
          type: 'object',
          properties: {
            documents: {
              type: 'array',
              description: 'Array of document objects to scan. Each object must have "filename" (string) and "document" (string content).',
            },
          },
          required: ['documents'],
        },
      },
      {
        name: 'list_sources',
        description: 'List monitored sources (repositories and integrations) in the GitGuardian workspace',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by source type: github, gitlab, bitbucket, azure_devops, etc.',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 100, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'list_honeytokens',
        description: 'List honeytokens created in the workspace. Honeytokens are fake credentials used to detect unauthorized access.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: triggered, active (default: all)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 100, default: 20)',
            },
          },
        },
      },
      {
        name: 'create_honeytoken',
        description: 'Create a new honeytoken of a specified type. When accessed, it triggers an alert in GitGuardian.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Honeytoken type: AWS, GCP, Azure, GitHub, GitLab, SendGrid, etc.',
            },
            name: {
              type: 'string',
              description: 'Human-readable name for this honeytoken',
            },
            description: {
              type: 'string',
              description: 'Optional description or context for where this honeytoken will be placed',
            },
          },
          required: ['type', 'name'],
        },
      },
    ];
  }

  private async request(path: string, method: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Token ${this.apiKey}`,
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
        content: [{ type: 'text', text: `GitGuardian API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`GitGuardian returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'health_check': {
          return await this.request('/v1/health', 'GET');
        }

        case 'list_secret_incidents': {
          const perPage = (args.per_page as number) ?? 20;
          let path = `/v1/incidents/secrets?per_page=${perPage}`;
          if (args.status) path += `&status=${encodeURIComponent(args.status as string)}`;
          if (args.severity) path += `&severity=${encodeURIComponent(args.severity as string)}`;
          if (args.date_before) path += `&date_before=${encodeURIComponent(args.date_before as string)}`;
          if (args.date_after) path += `&date_after=${encodeURIComponent(args.date_after as string)}`;
          if (args.cursor) path += `&cursor=${encodeURIComponent(args.cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'get_secret_incident': {
          const incidentId = args.incident_id as number;
          if (!incidentId) {
            return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
          }
          return await this.request(`/v1/incidents/secrets/${incidentId}`, 'GET');
        }

        case 'update_incident_status': {
          const incidentId = args.incident_id as number;
          if (!incidentId) {
            return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
          }
          const body: Record<string, unknown> = {};
          if (args.status) body.status = args.status;
          if (args.assignee_email) body.assignee_email = args.assignee_email;
          if (args.ignore_reason) body.ignore_reason = args.ignore_reason;
          return await this.request(`/v1/incidents/secrets/${incidentId}`, 'PATCH', body);
        }

        case 'scan_content': {
          const documents = args.documents as Array<{ filename: string; document: string }>;
          if (!documents || !Array.isArray(documents) || documents.length === 0) {
            return { content: [{ type: 'text', text: 'documents array is required and must not be empty' }], isError: true };
          }
          return await this.request('/v1/multiscan', 'POST', documents);
        }

        case 'list_sources': {
          const perPage = (args.per_page as number) ?? 20;
          let path = `/v1/sources?per_page=${perPage}`;
          if (args.type) path += `&type=${encodeURIComponent(args.type as string)}`;
          if (args.cursor) path += `&cursor=${encodeURIComponent(args.cursor as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_honeytokens': {
          const perPage = (args.per_page as number) ?? 20;
          let path = `/v1/honeytokens?per_page=${perPage}`;
          if (args.status) path += `&status=${encodeURIComponent(args.status as string)}`;
          return await this.request(path, 'GET');
        }

        case 'create_honeytoken': {
          const type = args.type as string;
          const htName = args.name as string;
          if (!type || !htName) {
            return { content: [{ type: 'text', text: 'type and name are required' }], isError: true };
          }
          const body: Record<string, unknown> = { type, name: htName };
          if (args.description) body.description = args.description;
          return await this.request('/v1/honeytokens', 'POST', body);
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
