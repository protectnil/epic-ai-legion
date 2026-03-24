/**
 * HashiCorp Terraform Cloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/hashicorp/terraform-mcp-server — actively maintained by HashiCorp.
// The official MCP focuses on Terraform Registry (provider/module discovery) and basic workspace ops.
// This adapter covers the full HCP Terraform Cloud REST API including runs, state versions,
// workspace variables, and organization management — use cases not covered by the official MCP.
// Self-hosted Terraform Enterprise: override baseUrl with your TFE hostname.
// Auth: Bearer token via Authorization header. Content-Type: application/vnd.api+json (JSON:API spec).

import { ToolDefinition, ToolResult } from './types.js';

interface TerraformCloudConfig {
  /**
   * HCP Terraform or Terraform Enterprise API token.
   * Generate from: User Settings > Tokens or Organization Settings > API Tokens.
   */
  token: string;
  /**
   * Base URL for the API. Defaults to https://app.terraform.io for HCP Terraform (cloud).
   * For Terraform Enterprise, use your instance URL, e.g. https://tfe.example.com
   */
  baseUrl?: string;
}

export class HashicorpTerraformCloudMCPServer {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: TerraformCloudConfig) {
    this.token = config.token;
    this.baseUrl = (config.baseUrl || 'https://app.terraform.io').replace(/\/$/, '');
  }

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/vnd.api+json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workspaces',
        description: 'List all workspaces in a Terraform Cloud organization.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: {
              type: 'string',
              description: 'The organization name.',
            },
            search: {
              type: 'string',
              description: 'Filter workspaces by name substring.',
            },
            pageNumber: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            pageSize: {
              type: 'number',
              description: 'Number of workspaces per page (default: 20, max: 100).',
            },
          },
          required: ['organization'],
        },
      },
      {
        name: 'get_workspace',
        description: 'Get details for a specific workspace by organization and workspace name.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: {
              type: 'string',
              description: 'The organization name.',
            },
            workspace: {
              type: 'string',
              description: 'The workspace name.',
            },
          },
          required: ['organization', 'workspace'],
        },
      },
      {
        name: 'list_runs',
        description: 'List runs for a specific workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID (ws-xxxxxxxxxxxxxxxx).',
            },
            pageNumber: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            pageSize: {
              type: 'number',
              description: 'Number of runs per page (default: 20, max: 100).',
            },
            filterStatus: {
              type: 'string',
              description: 'Filter runs by status, e.g. "pending,planning,applying,planned,applied,errored,canceled,discarded".',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'get_run',
        description: 'Get details and status of a specific Terraform run.',
        inputSchema: {
          type: 'object',
          properties: {
            runId: {
              type: 'string',
              description: 'The run ID (run-xxxxxxxxxxxxxxxx).',
            },
          },
          required: ['runId'],
        },
      },
      {
        name: 'create_run',
        description: 'Create a new Terraform run (plan + optional apply) in a workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID to run in.',
            },
            message: {
              type: 'string',
              description: 'Message describing this run.',
            },
            isDestroy: {
              type: 'boolean',
              description: 'If true, create a destroy run (default: false).',
            },
            autoApply: {
              type: 'boolean',
              description: 'If true, automatically apply after a successful plan (overrides workspace setting).',
            },
            planOnly: {
              type: 'boolean',
              description: 'If true, create a speculative plan-only run that cannot be applied.',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'apply_run',
        description: 'Apply a run that is in the "planned" state, confirming execution of the Terraform plan.',
        inputSchema: {
          type: 'object',
          properties: {
            runId: {
              type: 'string',
              description: 'The run ID to apply.',
            },
            comment: {
              type: 'string',
              description: 'Optional comment explaining why this run is being applied.',
            },
          },
          required: ['runId'],
        },
      },
      {
        name: 'discard_run',
        description: 'Discard a run that is in the "planned" or "policy_checked" state.',
        inputSchema: {
          type: 'object',
          properties: {
            runId: {
              type: 'string',
              description: 'The run ID to discard.',
            },
            comment: {
              type: 'string',
              description: 'Optional comment explaining why this run is being discarded.',
            },
          },
          required: ['runId'],
        },
      },
      {
        name: 'cancel_run',
        description: 'Cancel a run that is currently planning or applying.',
        inputSchema: {
          type: 'object',
          properties: {
            runId: {
              type: 'string',
              description: 'The run ID to cancel.',
            },
            comment: {
              type: 'string',
              description: 'Optional comment explaining why this run is being canceled.',
            },
          },
          required: ['runId'],
        },
      },
      {
        name: 'get_current_state_version',
        description: 'Get the current (latest) state version for a workspace, including resource counts and outputs.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID (ws-xxxxxxxxxxxxxxxx).',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'list_workspace_variables',
        description: 'List all Terraform and environment variables configured for a workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID (ws-xxxxxxxxxxxxxxxx).',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'list_organizations',
        description: 'List all Terraform Cloud organizations accessible with the current token.',
        inputSchema: {
          type: 'object',
          properties: {
            pageNumber: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            pageSize: {
              type: 'number',
              description: 'Number of organizations per page (default: 20).',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers = this.buildHeaders();

      switch (name) {
        case 'list_workspaces': {
          const organization = args.organization as string;
          if (!organization) {
            return { content: [{ type: 'text', text: 'organization is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.search) params.append('search[name]', args.search as string);
          if (args.pageNumber) params.append('page[number]', String(args.pageNumber as number));
          if (args.pageSize) params.append('page[size]', String(args.pageSize as number));

          const qs = params.toString();
          const url = `${this.baseUrl}/api/v2/organizations/${encodeURIComponent(organization)}/workspaces${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list workspaces: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Terraform Cloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_workspace': {
          const organization = args.organization as string;
          const workspace = args.workspace as string;

          if (!organization || !workspace) {
            return { content: [{ type: 'text', text: 'organization and workspace are required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/api/v2/organizations/${encodeURIComponent(organization)}/workspaces/${encodeURIComponent(workspace)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get workspace: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Terraform Cloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_runs': {
          const workspaceId = args.workspaceId as string;
          if (!workspaceId) {
            return { content: [{ type: 'text', text: 'workspaceId is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.pageNumber) params.append('page[number]', String(args.pageNumber as number));
          if (args.pageSize) params.append('page[size]', String(args.pageSize as number));
          if (args.filterStatus) params.append('filter[status]', args.filterStatus as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/api/v2/workspaces/${encodeURIComponent(workspaceId)}/runs${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list runs: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Terraform Cloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_run': {
          const runId = args.runId as string;
          if (!runId) {
            return { content: [{ type: 'text', text: 'runId is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/api/v2/runs/${encodeURIComponent(runId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get run: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Terraform Cloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_run': {
          const workspaceId = args.workspaceId as string;
          if (!workspaceId) {
            return { content: [{ type: 'text', text: 'workspaceId is required' }], isError: true };
          }

          const attributes: Record<string, unknown> = {};
          if (args.message) attributes.message = args.message;
          if (typeof args.isDestroy === 'boolean') attributes['is-destroy'] = args.isDestroy;
          if (typeof args.autoApply === 'boolean') attributes['auto-apply'] = args.autoApply;
          if (typeof args.planOnly === 'boolean') attributes['plan-only'] = args.planOnly;

          const body = {
            data: {
              type: 'runs',
              attributes,
              relationships: {
                workspace: {
                  data: { type: 'workspaces', id: workspaceId },
                },
              },
            },
          };

          const response = await fetch(`${this.baseUrl}/api/v2/runs`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create run: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Terraform Cloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'apply_run': {
          const runId = args.runId as string;
          if (!runId) {
            return { content: [{ type: 'text', text: 'runId is required' }], isError: true };
          }

          const body: Record<string, unknown> = {};
          if (args.comment) body.comment = args.comment;

          const response = await fetch(`${this.baseUrl}/api/v2/runs/${encodeURIComponent(runId)}/actions/apply`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to apply run: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: `Run ${runId} apply initiated.` }], isError: false };
        }

        case 'discard_run': {
          const runId = args.runId as string;
          if (!runId) {
            return { content: [{ type: 'text', text: 'runId is required' }], isError: true };
          }

          const body: Record<string, unknown> = {};
          if (args.comment) body.comment = args.comment;

          const response = await fetch(`${this.baseUrl}/api/v2/runs/${encodeURIComponent(runId)}/actions/discard`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to discard run: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: `Run ${runId} discarded.` }], isError: false };
        }

        case 'cancel_run': {
          const runId = args.runId as string;
          if (!runId) {
            return { content: [{ type: 'text', text: 'runId is required' }], isError: true };
          }

          const body: Record<string, unknown> = {};
          if (args.comment) body.comment = args.comment;

          const response = await fetch(`${this.baseUrl}/api/v2/runs/${encodeURIComponent(runId)}/actions/cancel`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to cancel run: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: `Run ${runId} canceled.` }], isError: false };
        }

        case 'get_current_state_version': {
          const workspaceId = args.workspaceId as string;
          if (!workspaceId) {
            return { content: [{ type: 'text', text: 'workspaceId is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/api/v2/workspaces/${encodeURIComponent(workspaceId)}/current-state-version`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get current state version: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Terraform Cloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_workspace_variables': {
          const workspaceId = args.workspaceId as string;
          if (!workspaceId) {
            return { content: [{ type: 'text', text: 'workspaceId is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/api/v2/workspaces/${encodeURIComponent(workspaceId)}/vars`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list workspace variables: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Terraform Cloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_organizations': {
          const params = new URLSearchParams();
          if (args.pageNumber) params.append('page[number]', String(args.pageNumber as number));
          if (args.pageSize) params.append('page[size]', String(args.pageSize as number));

          const qs = params.toString();
          const url = `${this.baseUrl}/api/v2/organizations${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list organizations: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Terraform Cloud returned non-JSON response (HTTP ${response.status})`); }
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
