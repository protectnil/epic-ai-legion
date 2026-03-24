/**
 * Arize AI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/Arize-ai/phoenix — actively maintained, hosted within the
// Arize-ai/phoenix monorepo at js/packages/phoenix-mcp. That server is NPX-hosted and requires
// a running Phoenix instance. This adapter provides a lightweight REST API fallback for
// self-hosted and air-gapped Phoenix deployments, calling the Phoenix HTTP REST API directly.

import { ToolDefinition, ToolResult } from './types.js';

interface ArizeAIConfig {
  apiKey: string;
  baseUrl?: string;
}

export class ArizeAIMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ArizeAIConfig) {
    this.apiKey = config.apiKey;
    // Default to Phoenix Cloud. Override with self-hosted URL, e.g. http://localhost:6006
    this.baseUrl = config.baseUrl || 'https://app.phoenix.arize.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all projects (tracing namespaces) in the Phoenix instance',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_spans',
        description: 'Query LLM trace spans, optionally filtered by project name and time range',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Filter spans to a specific project name',
            },
            start_time: {
              type: 'string',
              description: 'ISO 8601 timestamp — return spans after this time',
            },
            end_time: {
              type: 'string',
              description: 'ISO 8601 timestamp — return spans before this time',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of spans to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'list_datasets',
        description: 'List all datasets stored in the Phoenix instance',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_dataset',
        description: 'Retrieve a dataset by its ID, including its examples',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: {
              type: 'string',
              description: 'The unique ID of the dataset',
            },
          },
          required: ['dataset_id'],
        },
      },
      {
        name: 'list_experiments',
        description: 'List experiments associated with a specific dataset',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: {
              type: 'string',
              description: 'The dataset ID to list experiments for',
            },
          },
          required: ['dataset_id'],
        },
      },
      {
        name: 'get_experiment',
        description: 'Retrieve a single experiment by its ID, including run results and scores',
        inputSchema: {
          type: 'object',
          properties: {
            experiment_id: {
              type: 'string',
              description: 'The unique ID of the experiment',
            },
          },
          required: ['experiment_id'],
        },
      },
      {
        name: 'list_prompts',
        description: 'List prompt templates managed in the Phoenix prompt registry',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_prompt',
        description: 'Retrieve a specific prompt template by name or ID',
        inputSchema: {
          type: 'object',
          properties: {
            prompt_identifier: {
              type: 'string',
              description: 'The prompt name or unique ID',
            },
          },
          required: ['prompt_identifier'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_projects': {
          const response = await fetch(`${this.baseUrl}/v1/projects`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list projects: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Arize Phoenix returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_spans': {
          const params = new URLSearchParams();
          if (args.project_name) params.set('project_name', args.project_name as string);
          if (args.start_time) params.set('start_time', args.start_time as string);
          if (args.end_time) params.set('end_time', args.end_time as string);
          if (args.limit) params.set('limit', String(args.limit as number));

          const qs = params.toString() ? `?${params.toString()}` : '';
          const response = await fetch(`${this.baseUrl}/v1/spans${qs}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list spans: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Arize Phoenix returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_datasets': {
          const response = await fetch(`${this.baseUrl}/v1/datasets`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list datasets: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Arize Phoenix returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_dataset': {
          const datasetId = args.dataset_id as string;
          if (!datasetId) {
            return {
              content: [{ type: 'text', text: 'dataset_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/v1/datasets/${encodeURIComponent(datasetId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get dataset: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Arize Phoenix returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_experiments': {
          const datasetId = args.dataset_id as string;
          if (!datasetId) {
            return {
              content: [{ type: 'text', text: 'dataset_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/v1/datasets/${encodeURIComponent(datasetId)}/experiments`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list experiments: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Arize Phoenix returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_experiment': {
          const experimentId = args.experiment_id as string;
          if (!experimentId) {
            return {
              content: [{ type: 'text', text: 'experiment_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/v1/experiments/${encodeURIComponent(experimentId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get experiment: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Arize Phoenix returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_prompts': {
          const response = await fetch(`${this.baseUrl}/v1/prompts`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list prompts: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Arize Phoenix returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_prompt': {
          const identifier = args.prompt_identifier as string;
          if (!identifier) {
            return {
              content: [{ type: 'text', text: 'prompt_identifier is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/v1/prompts/${encodeURIComponent(identifier)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get prompt: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Arize Phoenix returned non-JSON response (HTTP ${response.status})`); }
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
