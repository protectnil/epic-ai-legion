/**
 * Panther Labs MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/panther-labs/mcp-panther — 40+ tools, actively maintained by Panther Labs (103 commits, March 2026). If self-hosting the official MCP is feasible, prefer it. This adapter serves API-key REST use cases without running the official Python MCP process.

import { ToolDefinition, ToolResult } from './types.js';

// Auth: X-API-Key header. Generate an API token in the Panther Console (gear icon > API Tokens).
// Base URL format for SaaS: https://api.{YOUR_PANTHER_DOMAIN}.runpanther.net
// The REST API (Beta) base path is /v1 — e.g. /v1/alerts, /v1/queries, /v1/detections.
// GraphQL is also available at /public/graphql but this adapter uses REST only.

interface PantherConfig {
  apiToken: string;
  baseUrl: string;
}

export class PantherMCPServer {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: PantherConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alerts',
        description: 'List Panther alerts with optional filtering by status, severity, or rule ID',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by alert status: OPEN, TRIAGED, CLOSED, RESOLVED (comma-separated for multiple)',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: CRITICAL, HIGH, MEDIUM, LOW, INFO (comma-separated)',
            },
            rule_id: {
              type: 'string',
              description: 'Filter alerts by the detection rule ID that triggered them',
            },
            created_at_after: {
              type: 'string',
              description: 'Return alerts created after this ISO 8601 timestamp',
            },
            created_at_before: {
              type: 'string',
              description: 'Return alerts created before this ISO 8601 timestamp',
            },
            page_size: {
              type: 'number',
              description: 'Number of alerts per page (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Retrieve details for a specific Panther alert by ID',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'The Panther alert ID',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'update_alert_status',
        description: 'Update the status of one or more Panther alerts',
        inputSchema: {
          type: 'object',
          properties: {
            alert_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of alert IDs to update',
            },
            status: {
              type: 'string',
              description: 'New status: OPEN, TRIAGED, CLOSED, or RESOLVED',
            },
          },
          required: ['alert_ids', 'status'],
        },
      },
      {
        name: 'query_data_lake',
        description: 'Execute a SQL query against the Panther data lake',
        inputSchema: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'SQL query to execute against the Panther data lake (Snowflake SQL dialect)',
            },
            database: {
              type: 'string',
              description: 'Database to query (optional — uses default if omitted)',
            },
          },
          required: ['sql'],
        },
      },
      {
        name: 'list_detections',
        description: 'List Panther detection rules with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean',
              description: 'Filter by enabled/disabled state (optional)',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: CRITICAL, HIGH, MEDIUM, LOW, INFO',
            },
            name_contains: {
              type: 'string',
              description: 'Filter rules whose name contains this string',
            },
            page_size: {
              type: 'number',
              description: 'Number of detections per page (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_detection',
        description: 'Retrieve details for a specific Panther detection rule by ID',
        inputSchema: {
          type: 'object',
          properties: {
            detection_id: {
              type: 'string',
              description: 'The Panther detection rule ID',
            },
          },
          required: ['detection_id'],
        },
      },
      {
        name: 'list_log_sources',
        description: 'List configured log sources in Panther',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of log sources per page (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'list_saved_queries',
        description: 'List saved SQL queries (scheduled queries) in Panther',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of queries per page (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        'X-API-Key': this.apiToken,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_alerts': {
          const params = new URLSearchParams();
          if (args.status) params.set('status', args.status as string);
          if (args.severity) params.set('severity', args.severity as string);
          if (args.rule_id) params.set('ruleId', args.rule_id as string);
          if (args.created_at_after) params.set('createdAtAfter', args.created_at_after as string);
          if (args.created_at_before) params.set('createdAtBefore', args.created_at_before as string);
          if (args.page_size) params.set('pageSize', String(args.page_size));
          if (args.cursor) params.set('cursor', args.cursor as string);

          const response = await fetch(`${this.baseUrl}/v1/alerts?${params.toString()}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to list alerts (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Panther returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_alert': {
          const alertId = args.alert_id as string;
          if (!alertId) {
            return { content: [{ type: 'text', text: 'alert_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/v1/alerts/${encodeURIComponent(alertId)}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to get alert (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Panther returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_alert_status': {
          const alertIds = args.alert_ids as string[];
          const status = args.status as string;
          if (!alertIds || !alertIds.length || !status) {
            return { content: [{ type: 'text', text: 'alert_ids and status are required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/v1/alerts`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ ids: alertIds, status }),
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to update alert status (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Panther returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'query_data_lake': {
          const sql = args.sql as string;
          if (!sql) {
            return { content: [{ type: 'text', text: 'sql is required' }], isError: true };
          }

          const body: Record<string, unknown> = { sql };
          if (args.database) body.database = args.database;

          const response = await fetch(`${this.baseUrl}/v1/queries`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Data lake query failed (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Panther returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_detections': {
          const params = new URLSearchParams();
          if (typeof args.enabled === 'boolean') params.set('enabled', String(args.enabled));
          if (args.severity) params.set('severity', args.severity as string);
          if (args.name_contains) params.set('nameContains', args.name_contains as string);
          if (args.page_size) params.set('pageSize', String(args.page_size));
          if (args.cursor) params.set('cursor', args.cursor as string);

          const response = await fetch(`${this.baseUrl}/v1/detections?${params.toString()}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to list detections (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Panther returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_detection': {
          const detectionId = args.detection_id as string;
          if (!detectionId) {
            return { content: [{ type: 'text', text: 'detection_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/v1/detections/${encodeURIComponent(detectionId)}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to get detection (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Panther returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_log_sources': {
          const params = new URLSearchParams();
          if (args.page_size) params.set('pageSize', String(args.page_size));
          if (args.cursor) params.set('cursor', args.cursor as string);

          const response = await fetch(`${this.baseUrl}/v1/log-sources?${params.toString()}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to list log sources (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Panther returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_saved_queries': {
          const params = new URLSearchParams();
          if (args.page_size) params.set('pageSize', String(args.page_size));
          if (args.cursor) params.set('cursor', args.cursor as string);

          const response = await fetch(`${this.baseUrl}/v1/queries/saved?${params.toString()}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to list saved queries (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Panther returned non-JSON response (HTTP ${response.status})`); }
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
