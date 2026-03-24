/**
 * Cisco AppDynamics MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no official Cisco/AppDynamics MCP server exists on GitHub as of March 2026.

import { ToolDefinition, ToolResult } from './types.js';

// Auth note: AppDynamics REST API uses HTTP Basic authentication.
// Username format: username@accountName  (e.g. admin@customer1 for on-prem, or admin@myaccount for SaaS)
// Password: the user's Controller password
// The controller base URL is the full host:port for the Controller UI
// (e.g. https://mycompany.saas.appdynamics.com or http://controller.internal:8090)
// All REST endpoints are under /controller/rest/

interface AppDynamicsConfig {
  controllerUrl: string;
  username: string;
  accountName: string;
  password: string;
}

export class AppDynamicsMCPServer {
  private readonly controllerUrl: string;
  private readonly authHeader: string;

  constructor(config: AppDynamicsConfig) {
    this.controllerUrl = config.controllerUrl.replace(/\/$/, '');
    const credentials = `${config.username}@${config.accountName}:${config.password}`;
    this.authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_applications',
        description: 'List all monitored applications registered in the AppDynamics Controller',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_tiers',
        description: 'List all tiers (service components) within an AppDynamics application',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'list_nodes',
        description: 'List all nodes (JVM/process instances) within an AppDynamics application',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'list_business_transactions',
        description: 'List all business transactions tracked within an AppDynamics application',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'get_metric_data',
        description: 'Retrieve time-series metric data for an application. Metric path uses pipe-separated segments (e.g. "Overall Application Performance|Average Response Time (ms)")',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
            metric_path: {
              type: 'string',
              description: 'Full metric path (e.g. "Overall Application Performance|Average Response Time (ms)")',
            },
            time_range_type: {
              type: 'string',
              description: 'Time range type: BEFORE_NOW, BEFORE_TIME, AFTER_TIME, or BETWEEN_TIMES (default: BEFORE_NOW)',
            },
            duration_in_mins: {
              type: 'number',
              description: 'Duration in minutes before now when time_range_type is BEFORE_NOW (default: 60)',
            },
            rollup: {
              type: 'boolean',
              description: 'Whether to roll up the data into a single data point (default: false)',
            },
          },
          required: ['application_id', 'metric_path'],
        },
      },
      {
        name: 'list_health_rule_violations',
        description: 'List health rule violations (policy events) for an application within a time range',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
            time_range_type: {
              type: 'string',
              description: 'Time range type: BEFORE_NOW, BEFORE_TIME, AFTER_TIME, or BETWEEN_TIMES (default: BEFORE_NOW)',
            },
            duration_in_mins: {
              type: 'number',
              description: 'Duration in minutes before now when time_range_type is BEFORE_NOW (default: 60)',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'list_events',
        description: 'List application events (errors, exceptions, policy violations, etc.) within a time range',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
            event_types: {
              type: 'string',
              description: 'Comma-separated event types: APPLICATION_ERROR, DIAGNOSTIC_SESSION, POLICY_OPEN, POLICY_CLOSE, POLICY_CANCELLED, POLICY_UPGRADED, POLICY_DOWNGRADED, etc.',
            },
            severities: {
              type: 'string',
              description: 'Comma-separated severity levels: INFO, WARN, ERROR (default: INFO,WARN,ERROR)',
            },
            time_range_type: {
              type: 'string',
              description: 'Time range type: BEFORE_NOW, BEFORE_TIME, AFTER_TIME, or BETWEEN_TIMES (default: BEFORE_NOW)',
            },
            duration_in_mins: {
              type: 'number',
              description: 'Duration in minutes before now when time_range_type is BEFORE_NOW (default: 60)',
            },
          },
          required: ['application_id', 'event_types'],
        },
      },
      {
        name: 'list_snapshots',
        description: 'List transaction snapshots (slow or error call chains) for an application',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application name or numeric ID',
            },
            time_range_type: {
              type: 'string',
              description: 'Time range type: BEFORE_NOW, BEFORE_TIME, AFTER_TIME, or BETWEEN_TIMES (default: BEFORE_NOW)',
            },
            duration_in_mins: {
              type: 'number',
              description: 'Duration in minutes before now when time_range_type is BEFORE_NOW (default: 60)',
            },
            maximum_results: {
              type: 'number',
              description: 'Maximum number of snapshots to return (default: 600)',
            },
          },
          required: ['application_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_applications': {
          const response = await fetch(
            `${this.controllerUrl}/controller/rest/applications?output=JSON`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list applications: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`AppDynamics returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_tiers': {
          const applicationId = args.application_id as string;

          if (!applicationId) {
            return {
              content: [{ type: 'text', text: 'application_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/tiers?output=JSON`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list tiers: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`AppDynamics returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_nodes': {
          const applicationId = args.application_id as string;

          if (!applicationId) {
            return {
              content: [{ type: 'text', text: 'application_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/nodes?output=JSON`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list nodes: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`AppDynamics returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_business_transactions': {
          const applicationId = args.application_id as string;

          if (!applicationId) {
            return {
              content: [{ type: 'text', text: 'application_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/business-transactions?output=JSON`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list business transactions: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`AppDynamics returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_metric_data': {
          const applicationId = args.application_id as string;
          const metricPath = args.metric_path as string;

          if (!applicationId || !metricPath) {
            return {
              content: [{ type: 'text', text: 'application_id and metric_path are required' }],
              isError: true,
            };
          }

          const timeRangeType = (args.time_range_type as string) || 'BEFORE_NOW';
          const durationInMins = (args.duration_in_mins as number) || 60;
          const rollup = (args.rollup as boolean) || false;

          const url = `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/metric-data?metric-path=${encodeURIComponent(metricPath)}&time-range-type=${encodeURIComponent(timeRangeType)}&duration-in-mins=${durationInMins}&rollup=${rollup}&output=JSON`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get metric data: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`AppDynamics returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_health_rule_violations': {
          const applicationId = args.application_id as string;

          if (!applicationId) {
            return {
              content: [{ type: 'text', text: 'application_id is required' }],
              isError: true,
            };
          }

          const timeRangeType = (args.time_range_type as string) || 'BEFORE_NOW';
          const durationInMins = (args.duration_in_mins as number) || 60;

          const url = `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/problems/healthrule-violations?time-range-type=${encodeURIComponent(timeRangeType)}&duration-in-mins=${durationInMins}&output=JSON`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list health rule violations: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`AppDynamics returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_events': {
          const applicationId = args.application_id as string;
          const eventTypes = args.event_types as string;

          if (!applicationId || !eventTypes) {
            return {
              content: [{ type: 'text', text: 'application_id and event_types are required' }],
              isError: true,
            };
          }

          const severities = (args.severities as string) || 'INFO,WARN,ERROR';
          const timeRangeType = (args.time_range_type as string) || 'BEFORE_NOW';
          const durationInMins = (args.duration_in_mins as number) || 60;

          const url = `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/events?time-range-type=${encodeURIComponent(timeRangeType)}&duration-in-mins=${durationInMins}&event-types=${encodeURIComponent(eventTypes)}&severities=${encodeURIComponent(severities)}&output=JSON`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list events: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`AppDynamics returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_snapshots': {
          const applicationId = args.application_id as string;

          if (!applicationId) {
            return {
              content: [{ type: 'text', text: 'application_id is required' }],
              isError: true,
            };
          }

          const timeRangeType = (args.time_range_type as string) || 'BEFORE_NOW';
          const durationInMins = (args.duration_in_mins as number) || 60;
          const maximumResults = (args.maximum_results as number) || 600;

          const url = `${this.controllerUrl}/controller/rest/applications/${encodeURIComponent(applicationId)}/request-snapshots?time-range-type=${encodeURIComponent(timeRangeType)}&duration-in-mins=${durationInMins}&maximum-results=${maximumResults}&output=JSON`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list snapshots: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`AppDynamics returned non-JSON response (HTTP ${response.status})`); }
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
