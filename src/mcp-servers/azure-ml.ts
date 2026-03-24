/**
 * Microsoft Azure Machine Learning MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/microsoft/mcp — Azure MCP Server covers broad Azure services (Storage, Cosmos DB, App Service, etc.) but does NOT include Azure Machine Learning workspace operations, job management, or model registry. This adapter fills that gap.

import { ToolDefinition, ToolResult } from './types.js';

interface AzureMLConfig {
  subscriptionId: string;
  resourceGroupName: string;
  workspaceName: string;
  accessToken: string;
  baseUrl?: string;
  apiVersion?: string;
}

export class AzureMLMCPServer {
  private readonly subscriptionId: string;
  private readonly resourceGroupName: string;
  private readonly workspaceName: string;
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor(config: AzureMLConfig) {
    this.subscriptionId = config.subscriptionId;
    this.resourceGroupName = config.resourceGroupName;
    this.workspaceName = config.workspaceName;
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://management.azure.com';
    this.apiVersion = config.apiVersion || '2024-10-01';
  }

  private workspacePath(): string {
    return `/subscriptions/${this.subscriptionId}/resourceGroups/${this.resourceGroupName}/providers/Microsoft.MachineLearningServices/workspaces/${this.workspaceName}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_workspace',
        description: 'Get details of the configured Azure Machine Learning workspace.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_jobs',
        description: 'List training jobs in the Azure ML workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            job_type: {
              type: 'string',
              description: 'Filter by job type: Command, Sweep, Pipeline, AutoML',
            },
            status: {
              type: 'string',
              description: 'Filter by status: Running, Completed, Failed, Canceled, NotStarted, Queued',
            },
            skip: {
              type: 'string',
              description: 'Continuation token for pagination',
            },
          },
        },
      },
      {
        name: 'get_job',
        description: 'Get details and status for a specific Azure ML training job.',
        inputSchema: {
          type: 'object',
          properties: {
            job_name: {
              type: 'string',
              description: 'Name of the job',
            },
          },
          required: ['job_name'],
        },
      },
      {
        name: 'create_job',
        description: 'Create or update an Azure ML training job (Command, Sweep, Pipeline, or AutoML).',
        inputSchema: {
          type: 'object',
          properties: {
            job_name: {
              type: 'string',
              description: 'Unique name for the job',
            },
            job_spec: {
              type: 'object',
              description: 'Job specification object. Must include jobType (Command, Sweep, Pipeline, AutoML) and the relevant configuration fields.',
            },
          },
          required: ['job_name', 'job_spec'],
        },
      },
      {
        name: 'cancel_job',
        description: 'Cancel a running Azure ML training job.',
        inputSchema: {
          type: 'object',
          properties: {
            job_name: {
              type: 'string',
              description: 'Name of the job to cancel',
            },
          },
          required: ['job_name'],
        },
      },
      {
        name: 'list_models',
        description: 'List registered models in the Azure ML model registry.',
        inputSchema: {
          type: 'object',
          properties: {
            list_view_type: {
              type: 'string',
              description: 'Filter view: ActiveOnly, ArchivedOnly, or All (default: ActiveOnly)',
            },
            skip: {
              type: 'string',
              description: 'Continuation token for pagination',
            },
          },
        },
      },
      {
        name: 'get_model',
        description: 'Get details for a specific registered model version in the Azure ML model registry.',
        inputSchema: {
          type: 'object',
          properties: {
            model_name: {
              type: 'string',
              description: 'Registered model name',
            },
            version: {
              type: 'string',
              description: 'Model version string',
            },
          },
          required: ['model_name', 'version'],
        },
      },
      {
        name: 'list_online_endpoints',
        description: 'List online (real-time inference) endpoints in the Azure ML workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            skip: {
              type: 'string',
              description: 'Continuation token for pagination',
            },
          },
        },
      },
      {
        name: 'get_online_endpoint',
        description: 'Get details and scoring URI for a specific Azure ML online endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_name: {
              type: 'string',
              description: 'Name of the online endpoint',
            },
          },
          required: ['endpoint_name'],
        },
      },
      {
        name: 'list_computes',
        description: 'List compute targets (clusters, instances, AKS) in the Azure ML workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            skip: {
              type: 'string',
              description: 'Continuation token for pagination',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      };

      const base = this.baseUrl;
      const wp = this.workspacePath();
      const av = `api-version=${this.apiVersion}`;

      switch (name) {
        case 'get_workspace': {
          const url = `${base}${wp}?${av}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to get workspace: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Azure ML returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_jobs': {
          let url = `${base}${wp}/jobs?${av}`;
          if (args.job_type) url += `&jobType=${encodeURIComponent(args.job_type as string)}`;
          if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;
          if (args.skip) url += `&$skip=${encodeURIComponent(args.skip as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to list jobs: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Azure ML returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_job': {
          const jobName = args.job_name as string;

          if (!jobName) {
            return { content: [{ type: 'text', text: 'job_name is required' }], isError: true };
          }

          const url = `${base}${wp}/jobs/${encodeURIComponent(jobName)}?${av}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to get job: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Azure ML returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_job': {
          const jobName = args.job_name as string;
          const jobSpec = args.job_spec as Record<string, unknown>;

          if (!jobName || !jobSpec) {
            return { content: [{ type: 'text', text: 'job_name and job_spec are required' }], isError: true };
          }

          const url = `${base}${wp}/jobs/${encodeURIComponent(jobName)}?${av}`;
          const response = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ properties: jobSpec }) });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to create job: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Azure ML returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'cancel_job': {
          const jobName = args.job_name as string;

          if (!jobName) {
            return { content: [{ type: 'text', text: 'job_name is required' }], isError: true };
          }

          const url = `${base}${wp}/jobs/${encodeURIComponent(jobName)}/cancel?${av}`;
          const response = await fetch(url, { method: 'POST', headers, body: '{}' });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to cancel job: ${response.status} ${errText}` }], isError: true };
          }

          return { content: [{ type: 'text', text: `Job ${jobName} cancel accepted (HTTP ${response.status})` }], isError: false };
        }

        case 'list_models': {
          let url = `${base}${wp}/models?${av}`;
          if (args.list_view_type) url += `&listViewType=${encodeURIComponent(args.list_view_type as string)}`;
          if (args.skip) url += `&$skip=${encodeURIComponent(args.skip as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to list models: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Azure ML returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_model': {
          const modelName = args.model_name as string;
          const version = args.version as string;

          if (!modelName || !version) {
            return { content: [{ type: 'text', text: 'model_name and version are required' }], isError: true };
          }

          const url = `${base}${wp}/models/${encodeURIComponent(modelName)}/versions/${encodeURIComponent(version)}?${av}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to get model: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Azure ML returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_online_endpoints': {
          let url = `${base}${wp}/onlineEndpoints?${av}`;
          if (args.skip) url += `&$skip=${encodeURIComponent(args.skip as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to list online endpoints: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Azure ML returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_online_endpoint': {
          const endpointName = args.endpoint_name as string;

          if (!endpointName) {
            return { content: [{ type: 'text', text: 'endpoint_name is required' }], isError: true };
          }

          const url = `${base}${wp}/onlineEndpoints/${encodeURIComponent(endpointName)}?${av}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to get online endpoint: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Azure ML returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_computes': {
          let url = `${base}${wp}/computes?${av}`;
          if (args.skip) url += `&$skip=${encodeURIComponent(args.skip as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to list computes: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Azure ML returned non-JSON response (HTTP ${response.status})`); }
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
