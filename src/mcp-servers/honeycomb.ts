/**
 * Honeycomb MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/honeycombio/honeycomb-mcp — official, actively maintained, Enterprise customers only. Requires hosted deployment; self-hosted option is deprecated. Our adapter targets the Honeycomb REST API v1 directly using an API key for teams on any plan that have REST API access.

import { ToolDefinition, ToolResult } from './types.js';

// Auth: X-Honeycomb-Team header containing the API key.
// Regional URLs: https://api.honeycomb.io (US, default) or https://api.eu1.honeycomb.io (EU).
// All paths are under /1/.

interface HoneycombConfig {
  apiKey: string;
  baseUrl?: string;
}

export class HoneycombMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: HoneycombConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.honeycomb.io';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_datasets',
        description: 'List all datasets in the Honeycomb environment',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_dataset',
        description: 'Get metadata for a specific Honeycomb dataset',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: {
              type: 'string',
              description: 'The dataset slug (URL-safe name)',
            },
          },
          required: ['dataset'],
        },
      },
      {
        name: 'create_query',
        description: 'Create a query specification against a Honeycomb dataset. Returns a query ID to use with run_query.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: {
              type: 'string',
              description: 'The dataset slug to query',
            },
            calculations: {
              type: 'array',
              description: 'Array of calculation objects (e.g. [{"op":"COUNT"}, {"op":"AVG","column":"duration_ms"}])',
            },
            filters: {
              type: 'array',
              description: 'Array of filter objects (e.g. [{"column":"error","op":"=","value":true}])',
            },
            breakdowns: {
              type: 'array',
              description: 'Array of column names to group results by (e.g. ["service.name","status_code"])',
            },
            time_range: {
              type: 'number',
              description: 'Relative time range in seconds from now (e.g. 3600 for last hour)',
            },
            start_time: {
              type: 'number',
              description: 'Absolute start time as Unix epoch seconds (overrides time_range)',
            },
            end_time: {
              type: 'number',
              description: 'Absolute end time as Unix epoch seconds (use with start_time)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of result rows to return (default: 10000)',
            },
            order: {
              type: 'array',
              description: 'Array of order objects (e.g. [{"op":"COUNT","order":"descending"}])',
            },
          },
          required: ['dataset', 'calculations'],
        },
      },
      {
        name: 'run_query',
        description: 'Execute a previously created query and return the results. Creates a query result and polls until complete.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: {
              type: 'string',
              description: 'The dataset slug',
            },
            query_id: {
              type: 'string',
              description: 'The query ID returned by create_query',
            },
          },
          required: ['dataset', 'query_id'],
        },
      },
      {
        name: 'list_markers',
        description: 'List all markers (deploy events, incidents, annotations) for a dataset',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: {
              type: 'string',
              description: 'The dataset slug',
            },
          },
          required: ['dataset'],
        },
      },
      {
        name: 'create_marker',
        description: 'Create a marker on a Honeycomb dataset to annotate a deploy, incident, or other event',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: {
              type: 'string',
              description: 'The dataset slug',
            },
            message: {
              type: 'string',
              description: 'Human-readable description of the event (e.g. "Deploy v1.4.2 to production")',
            },
            type: {
              type: 'string',
              description: 'Marker type for visual grouping (e.g. deploy, feature-flag, incident)',
            },
            url: {
              type: 'string',
              description: 'URL to link to for more context (e.g. GitHub release URL)',
            },
            start_time: {
              type: 'number',
              description: 'Start time as Unix epoch seconds (defaults to now)',
            },
            end_time: {
              type: 'number',
              description: 'End time as Unix epoch seconds for range markers (optional)',
            },
          },
          required: ['dataset', 'message'],
        },
      },
      {
        name: 'list_slos',
        description: 'List all Service Level Objectives (SLOs) defined for a dataset',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: {
              type: 'string',
              description: 'The dataset slug',
            },
          },
          required: ['dataset'],
        },
      },
      {
        name: 'get_slo',
        description: 'Get details and current compliance status for a specific SLO',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: {
              type: 'string',
              description: 'The dataset slug',
            },
            slo_id: {
              type: 'string',
              description: 'The SLO ID',
            },
          },
          required: ['dataset', 'slo_id'],
        },
      },
      {
        name: 'list_triggers',
        description: 'List all alert triggers defined for a dataset',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: {
              type: 'string',
              description: 'The dataset slug',
            },
          },
          required: ['dataset'],
        },
      },
      {
        name: 'get_trigger',
        description: 'Get details for a specific Honeycomb alert trigger',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: {
              type: 'string',
              description: 'The dataset slug',
            },
            trigger_id: {
              type: 'string',
              description: 'The trigger ID',
            },
          },
          required: ['dataset', 'trigger_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        'X-Honeycomb-Team': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_datasets': {
          const response = await fetch(`${this.baseUrl}/1/datasets`, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list datasets: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Honeycomb returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_dataset': {
          const dataset = args.dataset as string;

          if (!dataset) {
            return {
              content: [{ type: 'text', text: 'dataset is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/1/datasets/${encodeURIComponent(dataset)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get dataset: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Honeycomb returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_query': {
          const dataset = args.dataset as string;
          const calculations = args.calculations;

          if (!dataset || !calculations) {
            return {
              content: [{ type: 'text', text: 'dataset and calculations are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { calculations };
          if (args.filters) body.filters = args.filters;
          if (args.breakdowns) body.breakdowns = args.breakdowns;
          if (args.time_range) body.time_range = args.time_range;
          if (args.start_time) body.start_time = args.start_time;
          if (args.end_time) body.end_time = args.end_time;
          if (args.limit) body.limit = args.limit;
          if (args.order) body.orders = args.order;

          const response = await fetch(
            `${this.baseUrl}/1/queries/${encodeURIComponent(dataset)}`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create query: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Honeycomb returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'run_query': {
          const dataset = args.dataset as string;
          const queryId = args.query_id as string;

          if (!dataset || !queryId) {
            return {
              content: [{ type: 'text', text: 'dataset and query_id are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/1/query_results/${encodeURIComponent(dataset)}`,
            { method: 'POST', headers, body: JSON.stringify({ query_id: queryId }) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to run query: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Honeycomb returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_markers': {
          const dataset = args.dataset as string;

          if (!dataset) {
            return {
              content: [{ type: 'text', text: 'dataset is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/1/markers/${encodeURIComponent(dataset)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list markers: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Honeycomb returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_marker': {
          const dataset = args.dataset as string;
          const message = args.message as string;

          if (!dataset || !message) {
            return {
              content: [{ type: 'text', text: 'dataset and message are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { message };
          if (args.type) body.type = args.type;
          if (args.url) body.url = args.url;
          if (args.start_time) body.start_time = args.start_time;
          if (args.end_time) body.end_time = args.end_time;

          const response = await fetch(
            `${this.baseUrl}/1/markers/${encodeURIComponent(dataset)}`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create marker: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Honeycomb returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_slos': {
          const dataset = args.dataset as string;

          if (!dataset) {
            return {
              content: [{ type: 'text', text: 'dataset is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/1/slos/${encodeURIComponent(dataset)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list SLOs: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Honeycomb returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_slo': {
          const dataset = args.dataset as string;
          const sloId = args.slo_id as string;

          if (!dataset || !sloId) {
            return {
              content: [{ type: 'text', text: 'dataset and slo_id are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/1/slos/${encodeURIComponent(dataset)}/${encodeURIComponent(sloId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get SLO: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Honeycomb returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_triggers': {
          const dataset = args.dataset as string;

          if (!dataset) {
            return {
              content: [{ type: 'text', text: 'dataset is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/1/triggers/${encodeURIComponent(dataset)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list triggers: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Honeycomb returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_trigger': {
          const dataset = args.dataset as string;
          const triggerId = args.trigger_id as string;

          if (!dataset || !triggerId) {
            return {
              content: [{ type: 'text', text: 'dataset and trigger_id are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/1/triggers/${encodeURIComponent(dataset)}/${encodeURIComponent(triggerId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get trigger: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Honeycomb returned non-JSON response (HTTP ${response.status})`); }
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
