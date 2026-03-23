/**
 * VMware Carbon Black Cloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface CarbonBlackConfig {
  apiKey: string;
  connectorId: string;
  orgKey: string;
  baseUrl?: string;
}

export class CarbonBlackMCPServer {
  private readonly authToken: string;
  private readonly baseUrl: string;
  private readonly orgKey: string;

  constructor(config: CarbonBlackConfig) {
    this.authToken = `${config.apiKey}/${config.connectorId}`;
    this.baseUrl = config.baseUrl || 'https://defense.conferdeploy.net';
    this.orgKey = config.orgKey;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alerts',
        description: 'List security alerts with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of alerts to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity (critical, high, medium, low)',
            },
            status: {
              type: 'string',
              description: 'Filter by alert status (open, resolved, dismissed)',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get detailed information about a specific alert',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'Unique alert identifier',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'search_processes',
        description: 'Search for processes across managed endpoints (async: submits job, polls for results)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Process search query (process name, path, hash)',
            },
            rows: {
              type: 'number',
              description: 'Number of results to return (default: 50, max: 100)',
            },
            start: {
              type: 'number',
              description: 'Starting row for pagination (default: 0)',
            },
            start_time: {
              type: 'string',
              description: 'ISO 8601 start timestamp for process search',
            },
            end_time: {
              type: 'string',
              description: 'ISO 8601 end timestamp for process search',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_watchlists',
        description: 'List configured watchlists for threat detection',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'start_live_response',
        description: 'Initiate a live response session on an endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Unique endpoint/device identifier',
            },
            session_timeout: {
              type: 'number',
              description: 'Session timeout in seconds (default: 300)',
            },
          },
          required: ['device_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        'X-Auth-Token': this.authToken,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_alerts': {
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;
          const severity = args.severity as string | undefined;
          const status = args.status as string | undefined;

          // POST _search for v7 alerts API
          const requestBody: Record<string, unknown> = {
            rows: limit,
            start: offset,
          };
          const criteria: Record<string, unknown> = {};
          if (severity) {
            criteria['severity'] = [severity.toUpperCase()];
          }
          if (status) {
            criteria['workflow_status'] = [status.toUpperCase()];
          }
          if (Object.keys(criteria).length > 0) {
            requestBody['criteria'] = criteria;
          }

          const response = await fetch(
            `${this.baseUrl}/api/alerts/v7/orgs/${encodeURIComponent(this.orgKey)}/alerts/_search`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify(requestBody),
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list alerts: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Carbon Black returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_alert': {
          const alertId = args.alert_id as string;
          if (!alertId) {
            return {
              content: [{ type: 'text', text: 'alert_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/api/alerts/v7/orgs/${encodeURIComponent(this.orgKey)}/alerts/${encodeURIComponent(alertId)}`,
            {
              method: 'GET',
              headers,
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get alert: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Carbon Black returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_processes': {
          const query = args.query as string;
          const rows = (args.rows as number) || 50;
          const start = (args.start as number) || 0;
          const startTime = args.start_time as string | undefined;
          const endTime = args.end_time as string | undefined;

          if (!query) {
            return {
              content: [{ type: 'text', text: 'query is required' }],
              isError: true,
            };
          }

          // Step 1: Submit async search job
          const requestBody: Record<string, unknown> = { query, rows, start };
          if (startTime !== undefined || endTime !== undefined) {
            const timeRange: Record<string, string> = {};
            if (startTime) timeRange['start'] = startTime;
            if (endTime) timeRange['end'] = endTime;
            requestBody['time_range'] = timeRange;
          }

          const submitResponse = await fetch(
            `${this.baseUrl}/api/investigate/v2/orgs/${encodeURIComponent(this.orgKey)}/processes/search_jobs`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify(requestBody),
            }
          );

          if (!submitResponse.ok) {
            return {
              content: [{ type: 'text', text: `Failed to submit process search: ${submitResponse.statusText}` }],
              isError: true,
            };
          }

          let submitData: { job_id?: string };
          try {
            submitData = await submitResponse.json() as { job_id?: string };
          } catch {
            throw new Error(`Carbon Black returned non-JSON response (HTTP ${submitResponse.status})`);
          }

          const jobId = submitData.job_id;
          if (!jobId) {
            return {
              content: [{ type: 'text', text: 'Process search job did not return a job_id' }],
              isError: true,
            };
          }

          // Step 2: Poll for results (contacted == completed)
          const deadline = Date.now() + 180_000; // 3-minute max per API spec
          const resultsUrl = `${this.baseUrl}/api/investigate/v2/orgs/${encodeURIComponent(this.orgKey)}/processes/search_jobs/${encodeURIComponent(jobId)}/results?start=${start}&rows=${rows}`;

          while (Date.now() < deadline) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            const resultsResponse = await fetch(resultsUrl, { method: 'GET', headers });

            if (!resultsResponse.ok) {
              return {
                content: [{ type: 'text', text: `Failed to retrieve process search results: ${resultsResponse.statusText}` }],
                isError: true,
              };
            }

            let resultsData: { contacted?: number; completed?: number };
            try {
              resultsData = await resultsResponse.json() as { contacted?: number; completed?: number };
            } catch {
              throw new Error(`Carbon Black returned non-JSON response (HTTP ${resultsResponse.status})`);
            }

            const contacted = resultsData.contacted ?? 0;
            const completed = resultsData.completed ?? 0;
            // Job is done when contacted == completed (allow off-by-one per API docs)
            if (contacted > 0 && Math.abs(contacted - completed) <= 1) {
              return { content: [{ type: 'text', text: JSON.stringify(resultsData, null, 2) }], isError: false };
            }
          }

          return {
            content: [{ type: 'text', text: `Process search job ${jobId} timed out after 3 minutes` }],
            isError: true,
          };
        }

        case 'list_watchlists': {
          const response = await fetch(
            `${this.baseUrl}/threathunter/watchlistmgr/v3/orgs/${encodeURIComponent(this.orgKey)}/watchlists`,
            {
              method: 'GET',
              headers,
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list watchlists: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Carbon Black returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'start_live_response': {
          const deviceId = args.device_id as string;
          const sessionTimeout = (args.session_timeout as number) || 300;

          if (!deviceId) {
            return {
              content: [{ type: 'text', text: 'device_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/appservices/v6/orgs/${encodeURIComponent(this.orgKey)}/liveresponse/sessions`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                device_id: deviceId,
                session_timeout: sessionTimeout,
              }),
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to start live response: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Carbon Black returned non-JSON response (HTTP ${response.status})`);
          }
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
