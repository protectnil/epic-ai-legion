/**
 * IBM Instana MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/instana/mcp-instana — actively maintained, Python-based, dozens of tools.
// That MCP requires Python/uv and is hosted-only (credentials via HTTP headers or env vars).
// This adapter provides a self-hosted TypeScript fallback for air-gapped and API-key-native deployments.

import { ToolDefinition, ToolResult } from './types.js';

interface InstanaConfig {
  /**
   * Your Instana tenant unit base URL.
   * SaaS example:  https://mycompany.instana.io
   * On-prem example: https://instana.internal.example.com
   * The adapter appends API paths directly (no /api/v1 prefix — Instana uses /api/<service>/<version>).
   */
  baseUrl: string;
  /**
   * Instana API token. Passed as: Authorization: apiToken {token}
   * Create at Instana UI → Settings → Team Settings → API Tokens.
   */
  apiToken: string;
}

export class InstanaMCPServer {
  private readonly baseUrl: string;
  private readonly apiToken: string;

  constructor(config: InstanaConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiToken = config.apiToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_infrastructure_snapshots',
        description: 'Search infrastructure entity snapshots (hosts, containers, JVMs, etc.) monitored by Instana',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Dynamic Focus query to filter entities (e.g. entity.type:host AND entity.tag:production)',
            },
            window_size: {
              type: 'number',
              description: 'Time window in milliseconds to search within (default: 60000)',
            },
          },
        },
      },
      {
        name: 'get_snapshot',
        description: 'Retrieve detailed metadata for a single infrastructure entity snapshot',
        inputSchema: {
          type: 'object',
          properties: {
            snapshot_id: {
              type: 'string',
              description: 'Snapshot ID of the infrastructure entity',
            },
          },
          required: ['snapshot_id'],
        },
      },
      {
        name: 'list_services',
        description: 'List application services discovered by Instana APM',
        inputSchema: {
          type: 'object',
          properties: {
            window_size: {
              type: 'number',
              description: 'Time window in milliseconds (default: 3600000 for 1 hour)',
            },
          },
        },
      },
      {
        name: 'get_service_metrics',
        description: 'Retrieve performance metrics (call rate, error rate, latency) for an application service',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Instana service ID',
            },
            metrics: {
              type: 'array',
              items: { type: 'string' },
              description: 'Metric names to retrieve (e.g. ["calls", "erroneousCalls", "meanLatency"])',
            },
            window_size: {
              type: 'number',
              description: 'Time window in milliseconds (default: 3600000 for 1 hour)',
            },
            granularity: {
              type: 'number',
              description: 'Data granularity in seconds (default: 60)',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'get_events',
        description: 'Retrieve events and incidents detected by Instana within a time window',
        inputSchema: {
          type: 'object',
          properties: {
            window_size: {
              type: 'number',
              description: 'Time window in milliseconds to retrieve events for (default: 3600000 for 1 hour)',
            },
            severity: {
              type: 'number',
              description: 'Minimum severity level to filter by: 5=warning, 10=critical',
            },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Retrieve details for a specific Instana event',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Instana event ID to retrieve',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_infrastructure_metrics',
        description: 'Retrieve time-series metrics for an infrastructure entity snapshot',
        inputSchema: {
          type: 'object',
          properties: {
            snapshot_id: {
              type: 'string',
              description: 'Snapshot ID of the infrastructure entity',
            },
            metrics: {
              type: 'array',
              items: { type: 'string' },
              description: 'Metric names to retrieve (e.g. ["cpu.user", "mem.used"])',
            },
            window_size: {
              type: 'number',
              description: 'Time window in milliseconds (default: 3600000 for 1 hour)',
            },
            granularity: {
              type: 'number',
              description: 'Data granularity in seconds (default: 60)',
            },
          },
          required: ['snapshot_id', 'metrics'],
        },
      },
      {
        name: 'get_trace',
        description: 'Retrieve a distributed trace by trace ID',
        inputSchema: {
          type: 'object',
          properties: {
            trace_id: {
              type: 'string',
              description: 'Trace ID to retrieve',
            },
          },
          required: ['trace_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `apiToken ${this.apiToken}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'get_infrastructure_snapshots': {
          const windowSize = (args.window_size as number) || 60000;
          const body: Record<string, unknown> = { windowSize };
          if (args.query) body.query = args.query;

          const response = await fetch(`${this.baseUrl}/api/infrastructure-monitoring/snapshots`, {
            method: 'GET',
            headers,
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get infrastructure snapshots: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Instana returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_snapshot': {
          const snapshotId = args.snapshot_id as string;
          if (!snapshotId) {
            return { content: [{ type: 'text', text: 'snapshot_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/api/infrastructure-monitoring/snapshots/${encodeURIComponent(snapshotId)}`, {
            method: 'GET',
            headers,
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get snapshot: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Instana returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_services': {
          const windowSize = (args.window_size as number) || 3600000;
          const response = await fetch(`${this.baseUrl}/api/application-monitoring/services?windowSize=${windowSize}`, {
            method: 'GET',
            headers,
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list services: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Instana returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_service_metrics': {
          const serviceId = args.service_id as string;
          if (!serviceId) {
            return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
          }
          const windowSize = (args.window_size as number) || 3600000;
          const granularity = (args.granularity as number) || 60;
          const metrics = (args.metrics as string[]) || ['calls', 'erroneousCalls', 'meanLatency'];

          const body = {
            timeFrame: { windowSize },
            metrics: metrics.map((m) => ({ metric: m, granularity })),
            applicationBoundaryScope: 'ALL',
            serviceId,
          };

          const response = await fetch(`${this.baseUrl}/api/application-monitoring/metrics/services`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get service metrics: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Instana returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_events': {
          const windowSize = (args.window_size as number) || 3600000;
          let url = `${this.baseUrl}/api/events?windowSize=${windowSize}`;
          if (args.severity !== undefined) url += `&severity=${args.severity}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get events: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Instana returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_event': {
          const eventId = args.event_id as string;
          if (!eventId) {
            return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/api/events/${encodeURIComponent(eventId)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get event: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Instana returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_infrastructure_metrics': {
          const snapshotId = args.snapshot_id as string;
          const metrics = args.metrics as string[];
          if (!snapshotId || !metrics || metrics.length === 0) {
            return { content: [{ type: 'text', text: 'snapshot_id and metrics are required' }], isError: true };
          }
          const windowSize = (args.window_size as number) || 3600000;
          const granularity = (args.granularity as number) || 60;

          const body = {
            timeFrame: { windowSize },
            metrics: metrics.map((m) => ({ metric: m, granularity })),
            snapshotId,
          };

          const response = await fetch(`${this.baseUrl}/api/infrastructure-monitoring/metrics`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get infrastructure metrics: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Instana returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_trace': {
          const traceId = args.trace_id as string;
          if (!traceId) {
            return { content: [{ type: 'text', text: 'trace_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/api/application-monitoring/traces/${encodeURIComponent(traceId)}`, {
            method: 'GET',
            headers,
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get trace: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Instana returned non-JSON (HTTP ${response.status})`); }
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
