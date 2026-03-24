/**
 * dbt Cloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/dbt-labs/dbt-mcp — official dbt Labs MCP server.
// That server covers dbt Core, dbt Fusion, and dbt Platform with deep CLI integration.
// This adapter serves the REST API/service-token use case for headless CI/CD pipelines
// and environments where the dbt CLI is not available.

// dbt Cloud Administrative API v2 base URL: https://cloud.getdbt.com/api/v2
//   EMEA: https://emea.dbt.com/api/v2
//   Custom single-tenant: https://{account_prefix}.us1.dbt.com/api/v2
// Auth: Authorization header with value "Token {service_token}" or "Token {user_pat}".
//   Service tokens are recommended for server-to-server use.
// Ref: https://docs.getdbt.com/dbt-cloud/api-v2
//      https://docs.getdbt.com/docs/dbt-cloud-apis/authentication

import { ToolDefinition, ToolResult } from './types.js';

interface DbtCloudConfig {
  /** Service token or personal access token */
  serviceToken: string;
  /**
   * Base URL for your dbt Cloud region.
   * US (default): "https://cloud.getdbt.com/api/v2"
   * EMEA: "https://emea.dbt.com/api/v2"
   * Single-tenant: "https://{prefix}.us1.dbt.com/api/v2"
   */
  baseUrl?: string;
  /** dbt Cloud account ID — required for job and run operations */
  accountId: number;
}

export class DbtCloudMCPServer {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly accountId: number;

  constructor(config: DbtCloudConfig) {
    this.baseUrl = (config.baseUrl || 'https://cloud.getdbt.com/api/v2').replace(/\/$/, '');
    this.authHeader = `Token ${config.serviceToken}`;
    this.accountId = config.accountId;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all dbt Cloud projects for the configured account.',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of projects to return.',
            },
          },
        },
      },
      {
        name: 'list_environments',
        description: 'List dbt Cloud environments for a project.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'dbt Cloud project ID to list environments for.',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_jobs',
        description: 'List all dbt Cloud jobs for the configured account, with optional project filter.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Filter jobs by dbt Cloud project ID.',
            },
            environment_id: {
              type: 'number',
              description: 'Filter jobs by dbt Cloud environment ID.',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of jobs to return.',
            },
          },
        },
      },
      {
        name: 'get_job',
        description: 'Retrieve the definition and most-recent run status of a specific dbt Cloud job.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'dbt Cloud job ID.',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'trigger_job_run',
        description: 'Trigger a dbt Cloud job to run immediately. Returns the enqueued run object.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'dbt Cloud job ID to run.',
            },
            cause: {
              type: 'string',
              description: 'Human-readable description of why the run was triggered (default: "Triggered via API").',
            },
            git_branch: {
              type: 'string',
              description: 'Override the branch to run against.',
            },
            git_sha: {
              type: 'string',
              description: 'Override the exact commit SHA to run against.',
            },
            schema_override: {
              type: 'string',
              description: 'Override the target schema for this run.',
            },
            dbt_version_override: {
              type: 'string',
              description: 'Override the dbt version for this run.',
            },
            steps_override: {
              type: 'array',
              description: 'Override the list of dbt commands to run (e.g. ["dbt run", "dbt test"]).',
              items: { type: 'string' },
            },
            target_name_override: {
              type: 'string',
              description: 'Override the target name (e.g. "prod").',
            },
            generate_docs_override: {
              type: 'boolean',
              description: 'Override whether to generate docs for this run.',
            },
            timeout_seconds_override: {
              type: 'number',
              description: 'Override the job timeout in seconds.',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'list_runs',
        description: 'List dbt Cloud job runs for the configured account, with optional job and status filters.',
        inputSchema: {
          type: 'object',
          properties: {
            job_definition_id: {
              type: 'number',
              description: 'Filter runs by job ID.',
            },
            status: {
              type: 'number',
              description: 'Filter by run status code (1=Queued, 2=Starting, 3=Running, 10=Success, 20=Error, 30=Cancelled).',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of runs to return.',
            },
            order_by: {
              type: 'string',
              description: 'Field to order results by (e.g. "-created_at" for descending).',
            },
          },
        },
      },
      {
        name: 'get_run',
        description: 'Retrieve details and current status of a specific dbt Cloud run.',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'number',
              description: 'dbt Cloud run ID.',
            },
            include_related: {
              type: 'array',
              description: 'Related objects to include in the response (e.g. ["trigger", "job", "debug_logs"]).',
              items: { type: 'string' },
            },
          },
          required: ['run_id'],
        },
      },
      {
        name: 'cancel_run',
        description: 'Cancel a dbt Cloud run that is currently queued or in progress.',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'number',
              description: 'dbt Cloud run ID to cancel.',
            },
          },
          required: ['run_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const h = this.headers;
      const acct = this.accountId;

      switch (name) {
        case 'list_projects': {
          const params = new URLSearchParams();
          if (args.offset) params.set('offset', String(args.offset as number));
          if (args.limit) params.set('limit', String(args.limit as number));
          const qs = params.toString() ? `?${params.toString()}` : '';

          const response = await fetch(`${this.baseUrl}/accounts/${acct}/projects/${qs}`, {
            method: 'GET',
            headers: h,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list projects: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`dbt Cloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_environments': {
          const project_id = args.project_id as number;
          if (!project_id) {
            return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/accounts/${acct}/projects/${project_id}/environments/`,
            { method: 'GET', headers: h }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list environments: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`dbt Cloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_jobs': {
          const params = new URLSearchParams();
          if (args.project_id) params.set('project_id', String(args.project_id as number));
          if (args.environment_id) params.set('environment_id', String(args.environment_id as number));
          if (args.offset) params.set('offset', String(args.offset as number));
          if (args.limit) params.set('limit', String(args.limit as number));
          const qs = params.toString() ? `?${params.toString()}` : '';

          const response = await fetch(`${this.baseUrl}/accounts/${acct}/jobs/${qs}`, {
            method: 'GET',
            headers: h,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list jobs: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`dbt Cloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_job': {
          const job_id = args.job_id as number;
          if (!job_id) {
            return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/accounts/${acct}/jobs/${job_id}/`, {
            method: 'GET',
            headers: h,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get job: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`dbt Cloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'trigger_job_run': {
          const job_id = args.job_id as number;
          if (!job_id) {
            return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
          }

          const body: Record<string, unknown> = {
            cause: (args.cause as string) || 'Triggered via API',
          };
          if (args.git_branch) body.git_branch = args.git_branch;
          if (args.git_sha) body.git_sha = args.git_sha;
          if (args.schema_override) body.schema_override = args.schema_override;
          if (args.dbt_version_override) body.dbt_version_override = args.dbt_version_override;
          if (args.steps_override) body.steps_override = args.steps_override;
          if (args.target_name_override) body.target_name_override = args.target_name_override;
          if (typeof args.generate_docs_override === 'boolean') body.generate_docs_override = args.generate_docs_override;
          if (args.timeout_seconds_override) body.timeout_seconds_override = args.timeout_seconds_override;

          const response = await fetch(`${this.baseUrl}/accounts/${acct}/jobs/${job_id}/run/`, {
            method: 'POST',
            headers: h,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to trigger job run: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`dbt Cloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_runs': {
          const params = new URLSearchParams();
          if (args.job_definition_id) params.set('job_definition_id', String(args.job_definition_id as number));
          if (args.status) params.set('status', String(args.status as number));
          if (args.offset) params.set('offset', String(args.offset as number));
          if (args.limit) params.set('limit', String(args.limit as number));
          if (args.order_by) params.set('order_by', args.order_by as string);
          const qs = params.toString() ? `?${params.toString()}` : '';

          const response = await fetch(`${this.baseUrl}/accounts/${acct}/runs/${qs}`, {
            method: 'GET',
            headers: h,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list runs: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`dbt Cloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_run': {
          const run_id = args.run_id as number;
          if (!run_id) {
            return { content: [{ type: 'text', text: 'run_id is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.include_related && Array.isArray(args.include_related)) {
            params.set('include_related', (args.include_related as string[]).join(','));
          }
          const qs = params.toString() ? `?${params.toString()}` : '';

          const response = await fetch(`${this.baseUrl}/accounts/${acct}/runs/${run_id}/${qs}`, {
            method: 'GET',
            headers: h,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get run: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`dbt Cloud returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'cancel_run': {
          const run_id = args.run_id as number;
          if (!run_id) {
            return { content: [{ type: 'text', text: 'run_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/accounts/${acct}/runs/${run_id}/cancel/`, {
            method: 'POST',
            headers: h,
            body: JSON.stringify({}),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to cancel run: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`dbt Cloud returned non-JSON response (HTTP ${response.status})`); }
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
