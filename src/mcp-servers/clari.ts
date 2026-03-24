/**
 * Clari MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — community repo avadh/clari-mcp-server exists but has 0 stars and is unmaintained.
// This adapter covers both the Clari platform (revenue forecasting) and Clari Copilot (call intelligence) APIs.

import { ToolDefinition, ToolResult } from './types.js';

interface ClariConfig {
  apiKey: string;
  /**
   * Base URL for the Clari platform (forecasting/pipeline) API.
   * Defaults to https://api.clari.com/v4
   */
  baseUrl?: string;
  /**
   * Base URL for the Clari Copilot (call intelligence) API.
   * Defaults to https://api.copilot.clari.com
   */
  copilotBaseUrl?: string;
}

export class ClariMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly copilotBaseUrl: string;

  constructor(config: ClariConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.clari.com/v4';
    this.copilotBaseUrl = config.copilotBaseUrl || 'https://api.copilot.clari.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'export_forecast',
        description: 'Export manual forecast submissions from Clari for a given time period. Supports forecast calls, quota, adjustments, and CRM totals. Returns an async job ID — use get_export_job to poll for completion.',
        inputSchema: {
          type: 'object',
          properties: {
            forecastName: {
              type: 'string',
              description: 'Name of the Clari forecast to export (used in the URL path).',
            },
            timePeriod: {
              type: 'string',
              description: 'Time period in YYYY_Qn format (e.g. "2026_Q1").',
            },
            typesToExport: {
              type: 'array',
              items: { type: 'string' },
              description: 'Data types to export: forecast, quota, forecast_updated, adjustment, crm_total, crm_closed.',
            },
            currency: {
              type: 'string',
              description: 'Currency code for monetary values (e.g. "USD").',
            },
            includeHistorical: {
              type: 'boolean',
              description: 'Whether to include historical forecast snapshots (default: false).',
            },
            exportFormat: {
              type: 'string',
              description: 'Output format: "json" or "csv" (default: "json").',
            },
          },
          required: ['forecastName', 'timePeriod'],
        },
      },
      {
        name: 'get_export_job',
        description: 'Poll the status of an async Clari export job initiated by export_forecast. Returns "pending", "running", "complete", or "failed" along with a download URL when complete.',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: {
              type: 'string',
              description: 'Job ID returned by export_forecast.',
            },
          },
          required: ['jobId'],
        },
      },
      {
        name: 'get_call_details',
        description: 'Retrieve full details for a Clari Copilot call by call ID, including transcript, AI-generated summary, talk ratio, topics, and action items.',
        inputSchema: {
          type: 'object',
          properties: {
            callId: {
              type: 'string',
              description: 'Clari Copilot call ID.',
            },
          },
          required: ['callId'],
        },
      },
      {
        name: 'get_call_topics',
        description: 'Retrieve topics and keywords discussed across Clari Copilot calls, with metadata including frequency and associated call IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            fromDate: {
              type: 'string',
              description: 'Start date for filtering calls (ISO-8601, e.g. "2024-01-01").',
            },
            toDate: {
              type: 'string',
              description: 'End date for filtering calls (ISO-8601, e.g. "2024-12-31").',
            },
            userId: {
              type: 'string',
              description: 'Filter by Clari user ID.',
            },
          },
        },
      },
      {
        name: 'create_call',
        description: 'Submit an external call recording to Clari Copilot for processing. Clari will generate a transcript, talk ratio, topics, and AI insights. Accepts a publicly accessible audio/video URL.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title or subject of the call.',
            },
            mediaUrl: {
              type: 'string',
              description: 'Publicly accessible URL of the audio or video recording.',
            },
            startTime: {
              type: 'string',
              description: 'ISO-8601 start time of the call (e.g. "2024-06-15T14:00:00Z").',
            },
            durationSeconds: {
              type: 'number',
              description: 'Duration of the call in seconds.',
            },
            participants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
              description: 'List of call participants.',
            },
            crmObjectId: {
              type: 'string',
              description: 'CRM opportunity or account ID to associate with the call.',
            },
          },
          required: ['title', 'mediaUrl', 'startTime'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const platformHeaders: Record<string, string> = {
        apikey: this.apiKey,
        'Content-Type': 'application/json',
      };

      const copilotHeaders: Record<string, string> = {
        apikey: this.apiKey,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'export_forecast': {
          const forecastName = args.forecastName as string;
          if (!forecastName) {
            return {
              content: [{ type: 'text', text: 'forecastName is required' }],
              isError: true,
            };
          }
          if (!args.timePeriod) {
            return {
              content: [{ type: 'text', text: 'timePeriod is required (e.g. "2026_Q1")' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { timePeriod: args.timePeriod };
          if (args.typesToExport) body.typesToExport = args.typesToExport;
          if (args.currency) body.currency = args.currency;
          if (typeof args.includeHistorical === 'boolean') body.includeHistorical = args.includeHistorical;
          if (args.exportFormat) body.exportFormat = args.exportFormat;

          const response = await fetch(`${this.baseUrl}/export/forecast/${encodeURIComponent(forecastName)}`, {
            method: 'POST',
            headers: platformHeaders,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to export forecast: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Clari returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_export_job': {
          const jobId = args.jobId as string;
          if (!jobId) {
            return {
              content: [{ type: 'text', text: 'jobId is required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/export/jobs/${encodeURIComponent(jobId)}`, {
            method: 'GET',
            headers: platformHeaders,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get export job: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Clari returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_call_details': {
          const callId = args.callId as string;
          if (!callId) {
            return {
              content: [{ type: 'text', text: 'callId is required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.copilotBaseUrl}/call-details?id=${encodeURIComponent(callId)}`, {
            method: 'GET',
            headers: copilotHeaders,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get call details: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Clari Copilot returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_call_topics': {
          let url = `${this.copilotBaseUrl}/v2/topics`;
          const params: string[] = [];
          if (args.fromDate) params.push(`fromDate=${encodeURIComponent(args.fromDate as string)}`);
          if (args.toDate) params.push(`toDate=${encodeURIComponent(args.toDate as string)}`);
          if (args.userId) params.push(`userId=${encodeURIComponent(args.userId as string)}`);
          if (params.length) url += `?${params.join('&')}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: copilotHeaders,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get call topics: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Clari Copilot returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_call': {
          if (!args.title || !args.mediaUrl || !args.startTime) {
            return {
              content: [{ type: 'text', text: 'title, mediaUrl, and startTime are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            title: args.title,
            mediaUrl: args.mediaUrl,
            startTime: args.startTime,
          };
          if (args.durationSeconds) body.durationSeconds = args.durationSeconds;
          if (args.participants) body.participants = args.participants;
          if (args.crmObjectId) body.crmObjectId = args.crmObjectId;

          const response = await fetch(`${this.copilotBaseUrl}/create-call`, {
            method: 'POST',
            headers: copilotHeaders,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create call: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Clari Copilot returned non-JSON response (HTTP ${response.status})`); }
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
