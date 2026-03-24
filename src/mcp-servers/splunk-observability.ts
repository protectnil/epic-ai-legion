/**
 * Splunk Observability Cloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/splunk/splunk-mcp-server2 — covers Splunk Enterprise/Cloud search (unofficial).
// No vendor-official MCP exists specifically for Splunk Observability Cloud (formerly SignalFx) APM + infra APIs.
// This adapter targets the Observability Cloud REST API at api.{realm}.signalfx.com.

import { ToolDefinition, ToolResult } from './types.js';

interface SplunkObservabilityConfig {
  /**
   * Organization access token for authenticating Observability Cloud API requests.
   * Passed as: X-SF-Token: {accessToken}
   * Create at Splunk Observability Cloud → Settings → Access Tokens.
   */
  accessToken: string;
  /**
   * Your Splunk Observability Cloud realm (e.g. us0, us1, us2, eu0, ap0).
   * Determines the API base URL: https://api.{realm}.signalfx.com
   * Find your realm at Settings → Organizations.
   */
  realm: string;
}

export class SplunkObservabilityMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: SplunkObservabilityConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = `https://api.${config.realm}.signalfx.com`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_detectors',
        description: 'List alert detectors in Splunk Observability Cloud',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of detectors to return (max 1000, default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            name: {
              type: 'string',
              description: 'Filter detectors by name (substring match)',
            },
          },
        },
      },
      {
        name: 'get_detector',
        description: 'Retrieve full configuration and rules for a specific detector',
        inputSchema: {
          type: 'object',
          properties: {
            detector_id: {
              type: 'string',
              description: 'ID of the detector to retrieve',
            },
          },
          required: ['detector_id'],
        },
      },
      {
        name: 'list_detector_incidents',
        description: 'List active alert incidents triggered by a specific detector',
        inputSchema: {
          type: 'object',
          properties: {
            detector_id: {
              type: 'string',
              description: 'ID of the detector to retrieve incidents for',
            },
          },
          required: ['detector_id'],
        },
      },
      {
        name: 'list_alerts',
        description: 'List active alerts across the organization, optionally filtered by detector or severity',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of alerts to return (max 1000, default: 50)',
            },
            detector_id: {
              type: 'string',
              description: 'Filter alerts to those from a specific detector',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: Critical | Major | Minor | Warning | Info',
            },
          },
        },
      },
      {
        name: 'search_metrics',
        description: 'Search for metric time series (MTS) by metric name and optional filter dimensions',
        inputSchema: {
          type: 'object',
          properties: {
            metric: {
              type: 'string',
              description: 'Metric name to search for (e.g. cpu.utilization)',
            },
            query: {
              type: 'string',
              description: 'Additional filter query string (e.g. host:web-server-1)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of time series to return (max 1000, default: 50)',
            },
          },
          required: ['metric'],
        },
      },
      {
        name: 'execute_signalflow',
        description: 'Execute a SignalFlow analytics program and return the computed data. SignalFlow is Splunk Observability Cloud\'s streaming analytics language.',
        inputSchema: {
          type: 'object',
          properties: {
            program: {
              type: 'string',
              description: 'SignalFlow program to execute (e.g. "data(\'cpu.utilization\').mean().publish()")',
            },
            start: {
              type: 'number',
              description: 'Start time as Unix milliseconds (default: now minus 1 hour)',
            },
            stop: {
              type: 'number',
              description: 'Stop time as Unix milliseconds (default: now)',
            },
            resolution: {
              type: 'number',
              description: 'Data resolution in milliseconds (default: 60000 for 1-minute intervals)',
            },
          },
          required: ['program'],
        },
      },
      {
        name: 'list_dashboards',
        description: 'List dashboards in Splunk Observability Cloud',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of dashboards to return (max 1000, default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            name: {
              type: 'string',
              description: 'Filter dashboards by name (substring match)',
            },
          },
        },
      },
      {
        name: 'get_org_token',
        description: 'List organization access tokens (requires admin privileges)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of tokens to return (max 1000, default: 50)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        'X-SF-Token': this.accessToken,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_detectors': {
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;
          let url = `${this.baseUrl}/v2/detector?limit=${limit}&offset=${offset}`;
          if (args.name) url += `&name=${encodeURIComponent(args.name as string)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list detectors: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Splunk Observability returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_detector': {
          const detectorId = args.detector_id as string;
          if (!detectorId) {
            return { content: [{ type: 'text', text: 'detector_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/v2/detector/${encodeURIComponent(detectorId)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get detector: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Splunk Observability returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_detector_incidents': {
          const detectorId = args.detector_id as string;
          if (!detectorId) {
            return { content: [{ type: 'text', text: 'detector_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/v2/detector/${encodeURIComponent(detectorId)}/incidents`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list detector incidents: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Splunk Observability returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_alerts': {
          const limit = (args.limit as number) || 50;
          let url = `${this.baseUrl}/v2/alert?limit=${limit}`;
          if (args.detector_id) url += `&detectorId=${encodeURIComponent(args.detector_id as string)}`;
          if (args.severity) url += `&severity=${encodeURIComponent(args.severity as string)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list alerts: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Splunk Observability returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_metrics': {
          const metric = args.metric as string;
          if (!metric) {
            return { content: [{ type: 'text', text: 'metric is required' }], isError: true };
          }
          const limit = (args.limit as number) || 50;
          let url = `${this.baseUrl}/v2/metrictimeseries?metric=${encodeURIComponent(metric)}&limit=${limit}`;
          if (args.query) url += `&query=${encodeURIComponent(args.query as string)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to search metrics: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Splunk Observability returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'execute_signalflow': {
          const program = args.program as string;
          if (!program) {
            return { content: [{ type: 'text', text: 'program is required' }], isError: true };
          }
          const now = Date.now();
          const start = (args.start as number) || now - 3600000;
          const stop = (args.stop as number) || now;
          const resolution = (args.resolution as number) || 60000;

          const response = await fetch(`${this.baseUrl}/v2/signalflow/execute`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ program, start, stop, resolution }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to execute SignalFlow: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Splunk Observability returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_dashboards': {
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;
          let url = `${this.baseUrl}/v2/dashboard?limit=${limit}&offset=${offset}`;
          if (args.name) url += `&name=${encodeURIComponent(args.name as string)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list dashboards: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Splunk Observability returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_org_token': {
          const limit = (args.limit as number) || 50;
          const response = await fetch(`${this.baseUrl}/v2/token?limit=${limit}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list org tokens: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Splunk Observability returned non-JSON (HTTP ${response.status})`); }
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
