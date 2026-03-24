/**
 * Databricks MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/databrickslabs/mcp — actively maintained by Databricks Labs.
// That server provides deep Unity Catalog and workspace integration. This adapter serves the
// API-key/PAT use case for self-hosted or air-gapped deployments without the Python runtime
// dependency that databrickslabs/mcp requires.

// Databricks REST API base URL: https://{workspace-host}/api/2.0/ (clusters, jobs, secrets)
//   and https://{workspace-host}/api/2.1/ (jobs v2.1) and /api/2.0/sql/statements/ (SQL exec).
// Auth: Bearer token — personal access token (PAT) or short-lived OAuth2 access token.
// Ref: https://docs.databricks.com/api/workspace/introduction

import { ToolDefinition, ToolResult } from './types.js';

interface DatabricksConfig {
  /** Workspace host, e.g. "https://dbc-a1b2345c-d6e7.cloud.databricks.com" */
  host: string;
  /** Personal access token or OAuth2 access token */
  token: string;
}

export class DatabricksMCPServer {
  private readonly host: string;
  private readonly token: string;

  constructor(config: DatabricksConfig) {
    this.host = config.host.replace(/\/$/, '');
    this.token = config.token;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_clusters',
        description: 'List all clusters in the Databricks workspace, including their state and configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            filter_by_state: {
              type: 'string',
              description: 'Optional state filter: PENDING, RUNNING, RESTARTING, RESIZING, WAITING, TERMINATING, TERMINATED, ERROR, or UNKNOWN.',
            },
          },
        },
      },
      {
        name: 'get_cluster',
        description: 'Retrieve detailed information about a specific Databricks cluster.',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'The unique identifier of the cluster (e.g. "1234-567890-abc123").',
            },
          },
          required: ['cluster_id'],
        },
      },
      {
        name: 'list_jobs',
        description: 'List all Databricks jobs in the workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of jobs to return (max 25, default: 20).',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0).',
            },
            name: {
              type: 'string',
              description: 'Filter jobs by name (exact match).',
            },
          },
        },
      },
      {
        name: 'run_job',
        description: 'Trigger an existing Databricks job to run immediately (run-now).',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'The numeric ID of the job to run.',
            },
            notebook_params: {
              type: 'object',
              description: 'Key-value map of parameters to pass to notebook tasks.',
            },
            python_params: {
              type: 'array',
              description: 'List of string parameters to pass to Python script tasks.',
              items: { type: 'string' },
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'list_job_runs',
        description: 'List runs for a specific Databricks job, ordered by start time descending.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'The numeric ID of the job whose runs to list.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of runs to return (max 25, default: 20).',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination.',
            },
            completed_only: {
              type: 'boolean',
              description: 'If true, only return completed runs.',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'get_job_run',
        description: 'Retrieve details and status of a specific Databricks job run.',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'number',
              description: 'The numeric ID of the job run to retrieve.',
            },
          },
          required: ['run_id'],
        },
      },
      {
        name: 'execute_sql',
        description: 'Execute a SQL statement against a Databricks SQL warehouse and return the result. The statement runs asynchronously; poll get_sql_statement_result if status is PENDING or RUNNING.',
        inputSchema: {
          type: 'object',
          properties: {
            warehouse_id: {
              type: 'string',
              description: 'ID of the SQL warehouse to execute the statement against.',
            },
            statement: {
              type: 'string',
              description: 'SQL statement to execute.',
            },
            catalog: {
              type: 'string',
              description: 'Unity Catalog catalog to use as the default for the statement.',
            },
            schema: {
              type: 'string',
              description: 'Schema to use as the default for the statement.',
            },
            wait_timeout: {
              type: 'string',
              description: 'How long to wait for the result inline (e.g. "30s"). Use "0s" to run fully async. Max "50s".',
            },
          },
          required: ['warehouse_id', 'statement'],
        },
      },
      {
        name: 'get_sql_statement_result',
        description: 'Poll the status and fetch results of a previously submitted SQL statement execution.',
        inputSchema: {
          type: 'object',
          properties: {
            statement_id: {
              type: 'string',
              description: 'The statement ID returned by execute_sql.',
            },
          },
          required: ['statement_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const h = this.headers;

      switch (name) {
        case 'list_clusters': {
          const response = await fetch(`${this.host}/api/2.0/clusters/list`, {
            method: 'GET',
            headers: h,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list clusters: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Databricks returned non-JSON response (HTTP ${response.status})`); }

          if (args.filter_by_state) {
            const state = args.filter_by_state as string;
            const parsed = data as { clusters?: Array<{ state?: string }> };
            if (Array.isArray(parsed.clusters)) {
              const filtered = parsed.clusters.filter((c) => c.state === state);
              return { content: [{ type: 'text', text: JSON.stringify({ clusters: filtered }, null, 2) }], isError: false };
            }
          }

          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_cluster': {
          const cluster_id = args.cluster_id as string;
          if (!cluster_id) {
            return { content: [{ type: 'text', text: 'cluster_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.host}/api/2.0/clusters/get?cluster_id=${encodeURIComponent(cluster_id)}`,
            { method: 'GET', headers: h }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get cluster: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Databricks returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_jobs': {
          const params = new URLSearchParams();
          params.set('limit', String((args.limit as number) || 20));
          params.set('offset', String((args.offset as number) || 0));
          if (args.name) params.set('name', args.name as string);

          const response = await fetch(`${this.host}/api/2.1/jobs/list?${params.toString()}`, {
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
          try { data = await response.json(); } catch { throw new Error(`Databricks returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'run_job': {
          const job_id = args.job_id as number;
          if (!job_id) {
            return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
          }

          const body: Record<string, unknown> = { job_id };
          if (args.notebook_params) body.notebook_params = args.notebook_params;
          if (args.python_params) body.python_params = args.python_params;

          const response = await fetch(`${this.host}/api/2.1/jobs/run-now`, {
            method: 'POST',
            headers: h,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to run job: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Databricks returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_job_runs': {
          const job_id = args.job_id as number;
          if (!job_id) {
            return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
          }

          const params = new URLSearchParams();
          params.set('job_id', String(job_id));
          params.set('limit', String((args.limit as number) || 20));
          if (args.offset) params.set('offset', String(args.offset as number));
          if (typeof args.completed_only === 'boolean') params.set('completed_only', String(args.completed_only));

          const response = await fetch(`${this.host}/api/2.1/jobs/runs/list?${params.toString()}`, {
            method: 'GET',
            headers: h,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list job runs: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Databricks returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_job_run': {
          const run_id = args.run_id as number;
          if (!run_id) {
            return { content: [{ type: 'text', text: 'run_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.host}/api/2.1/jobs/runs/get?run_id=${encodeURIComponent(String(run_id))}`,
            { method: 'GET', headers: h }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get job run: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Databricks returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'execute_sql': {
          const warehouse_id = args.warehouse_id as string;
          const statement = args.statement as string;

          if (!warehouse_id || !statement) {
            return { content: [{ type: 'text', text: 'warehouse_id and statement are required' }], isError: true };
          }

          const body: Record<string, unknown> = {
            warehouse_id,
            statement,
            wait_timeout: (args.wait_timeout as string) || '30s',
            disposition: 'INLINE',
            format: 'JSON_ARRAY',
          };
          if (args.catalog) body.catalog = args.catalog;
          if (args.schema) body.schema = args.schema;

          const response = await fetch(`${this.host}/api/2.0/sql/statements`, {
            method: 'POST',
            headers: h,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to execute SQL: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Databricks returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_sql_statement_result': {
          const statement_id = args.statement_id as string;
          if (!statement_id) {
            return { content: [{ type: 'text', text: 'statement_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.host}/api/2.0/sql/statements/${encodeURIComponent(statement_id)}`,
            { method: 'GET', headers: h }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get SQL statement result: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Databricks returned non-JSON response (HTTP ${response.status})`); }
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
