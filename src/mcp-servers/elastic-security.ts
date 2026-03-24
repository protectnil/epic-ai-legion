/**
 * Elastic Security MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no vendor-shipped MCP server specifically for Elastic Security.

import { ToolDefinition, ToolResult } from './types.js';

// Elastic Security APIs are hosted by Kibana, not Elasticsearch directly.
// Base URL pattern: https://{kibana-host}:{port}  (self-hosted) or the Elastic Cloud Kibana URL
//   For space-aware endpoints, prefix the path with /s/{spaceId} before /api/...
//   Default space uses /api/... directly (no /s/{spaceId} prefix required).
//
// Auth: API key in Authorization header — "ApiKey {base64-encoded-id:api_key}"
//   OR  Basic auth — "Basic {base64-encoded-user:password}"
//   kbn-xsrf header is required on all mutating (POST/PUT/DELETE) requests.
//
// Key API paths (Elastic Security / Kibana Detection Engine):
//   GET  /api/detection_engine/rules/_find          — list detection rules
//   POST /api/detection_engine/rules                — create detection rule
//   POST /api/detection_engine/signals/search       — search/find detection alerts
//   POST /api/detection_engine/signals/status       — update alert status (open/closed/acknowledged)
//   GET  /api/cases                                  — list cases
//   POST /api/cases                                  — create a case
//
// Ref: https://www.elastic.co/guide/en/security/8.19/security-apis.html

interface ElasticSecurityConfig {
  kibanaUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  spaceId?: string;
}

export class ElasticSecurityMCPServer {
  private readonly kibanaUrl: string;
  private readonly authHeader: string;
  private readonly pathPrefix: string;

  constructor(config: ElasticSecurityConfig) {
    this.kibanaUrl = config.kibanaUrl.replace(/\/$/, '');

    if (config.apiKey) {
      this.authHeader = `ApiKey ${config.apiKey}`;
    } else if (config.username && config.password) {
      const encoded = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      this.authHeader = `Basic ${encoded}`;
    } else {
      throw new Error('ElasticSecurityMCPServer: either apiKey or username+password must be provided');
    }

    // If a non-default space is specified, prefix all paths with /s/{spaceId}
    this.pathPrefix = config.spaceId ? `/s/${config.spaceId}` : '';
  }

  private getHeaders(mutating: boolean): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
    if (mutating) {
      headers['kbn-xsrf'] = 'true';
    }
    return headers;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'find_detection_rules',
        description: 'List Elastic Security detection rules. Supports pagination and sorting (GET /api/detection_engine/rules/_find).',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 10000)',
            },
            sort_field: {
              type: 'string',
              description: 'Field to sort by (e.g. "created_at", "name", "updated_at")',
            },
            sort_order: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc)',
            },
            filter: {
              type: 'string',
              description: 'KQL filter string (e.g. "alert.attributes.name: phishing")',
            },
          },
        },
      },
      {
        name: 'get_detection_rule',
        description: 'Get a specific Elastic Security detection rule by its rule_id or saved object id (GET /api/detection_engine/rules)',
        inputSchema: {
          type: 'object',
          properties: {
            rule_id: {
              type: 'string',
              description: 'Human-readable rule_id (machine-readable identifier set at rule creation)',
            },
            id: {
              type: 'string',
              description: 'Kibana saved object UUID for the rule (alternative to rule_id)',
            },
          },
        },
      },
      {
        name: 'search_alerts',
        description: 'Search Elastic Security detection alerts using an Elasticsearch query body (POST /api/detection_engine/signals/search). Alerts live in a per-space signals index.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'object',
              description: 'Elasticsearch query DSL object (e.g. {"bool":{"filter":[{"term":{"signal.status":"open"}}]}})',
            },
            size: {
              type: 'number',
              description: 'Maximum number of alerts to return (default: 10, max: 10000)',
            },
            from: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            sort: {
              type: 'array',
              description: 'Array of Elasticsearch sort clauses (e.g. [{"@timestamp":{"order":"desc"}}])',
            },
          },
        },
      },
      {
        name: 'update_alert_status',
        description: 'Update the status of one or more Elastic Security detection alerts (POST /api/detection_engine/signals/status)',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'New status for the alerts: open, closed, or acknowledged',
            },
            signal_ids: {
              type: 'array',
              description: 'Array of alert/signal IDs to update',
            },
            query: {
              type: 'object',
              description: 'Elasticsearch query DSL to select alerts by criteria (alternative to signal_ids)',
            },
          },
          required: ['status'],
        },
      },
      {
        name: 'list_cases',
        description: 'List cases in Elastic Security (GET /api/cases)',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by case status: open, closed, or in-progress',
            },
            page: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Results per page (default: 20)',
            },
            sortField: {
              type: 'string',
              description: 'Field to sort by (e.g. "createdAt", "updatedAt")',
            },
            sortOrder: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc)',
            },
          },
        },
      },
      {
        name: 'create_case',
        description: 'Create a new case in Elastic Security (POST /api/cases)',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Case title',
            },
            description: {
              type: 'string',
              description: 'Case description',
            },
            tags: {
              type: 'array',
              description: 'Array of tag strings (e.g. ["phishing","malware"])',
            },
            severity: {
              type: 'string',
              description: 'Case severity: low, medium, high, or critical (default: low)',
            },
          },
          required: ['title', 'description'],
        },
      },
      {
        name: 'create_detection_rule',
        description: 'Create a new Elastic Security detection rule (POST /api/detection_engine/rules)',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Human-readable rule name',
            },
            description: {
              type: 'string',
              description: 'Rule description',
            },
            type: {
              type: 'string',
              description: 'Rule type: query, eql, threshold, machine_learning, saved_query, threat_match',
            },
            query: {
              type: 'string',
              description: 'KQL or EQL query string for the rule condition',
            },
            language: {
              type: 'string',
              description: 'Query language: kuery or eql (required for query and eql rule types)',
            },
            index: {
              type: 'array',
              description: 'Array of index patterns to search (e.g. ["logs-endpoint.events.*"])',
            },
            severity: {
              type: 'string',
              description: 'Alert severity: low, medium, high, or critical',
            },
            risk_score: {
              type: 'number',
              description: 'Numeric risk score from 0 to 100',
            },
            enabled: {
              type: 'boolean',
              description: 'Whether to enable the rule immediately (default: true)',
            },
          },
          required: ['name', 'description', 'type', 'severity', 'risk_score'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'find_detection_rules': {
          const page = (args.page as number) || 1;
          const per_page = (args.per_page as number) || 20;
          let url = `${this.kibanaUrl}${this.pathPrefix}/api/detection_engine/rules/_find?page=${page}&per_page=${per_page}`;
          if (args.sort_field) url += `&sort_field=${encodeURIComponent(args.sort_field as string)}`;
          if (args.sort_order) url += `&sort_order=${encodeURIComponent(args.sort_order as string)}`;
          if (args.filter) url += `&filter=${encodeURIComponent(args.filter as string)}`;

          const response = await fetch(url, { method: 'GET', headers: this.getHeaders(false) });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to find detection rules: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Elastic Security returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_detection_rule': {
          if (!args.rule_id && !args.id) {
            return { content: [{ type: 'text', text: 'Either rule_id or id is required' }], isError: true };
          }
          let url = `${this.kibanaUrl}${this.pathPrefix}/api/detection_engine/rules?`;
          if (args.rule_id) url += `rule_id=${encodeURIComponent(args.rule_id as string)}`;
          else url += `id=${encodeURIComponent(args.id as string)}`;

          const response = await fetch(url, { method: 'GET', headers: this.getHeaders(false) });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get detection rule: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Elastic Security returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_alerts': {
          const body: Record<string, unknown> = {};
          if (args.query) body.query = args.query;
          if (args.size !== undefined) body.size = args.size as number;
          if (args.from !== undefined) body.from = args.from as number;
          if (args.sort) body.sort = args.sort;

          const response = await fetch(`${this.kibanaUrl}${this.pathPrefix}/api/detection_engine/signals/search`, {
            method: 'POST',
            headers: this.getHeaders(true),
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to search alerts: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Elastic Security returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_alert_status': {
          const status = args.status as string;
          if (!status) {
            return { content: [{ type: 'text', text: 'status is required' }], isError: true };
          }
          if (!args.signal_ids && !args.query) {
            return { content: [{ type: 'text', text: 'Either signal_ids or query is required to select alerts to update' }], isError: true };
          }
          const body: Record<string, unknown> = { status };
          if (args.signal_ids) body.signal_ids = args.signal_ids;
          if (args.query) body.query = args.query;

          const response = await fetch(`${this.kibanaUrl}${this.pathPrefix}/api/detection_engine/signals/status`, {
            method: 'POST',
            headers: this.getHeaders(true),
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update alert status: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Elastic Security returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_cases': {
          let url = `${this.kibanaUrl}${this.pathPrefix}/api/cases?`;
          const params: string[] = [];
          if (args.status) params.push(`status=${encodeURIComponent(args.status as string)}`);
          if (args.page) params.push(`page=${args.page as number}`);
          if (args.perPage) params.push(`perPage=${args.perPage as number}`);
          if (args.sortField) params.push(`sortField=${encodeURIComponent(args.sortField as string)}`);
          if (args.sortOrder) params.push(`sortOrder=${encodeURIComponent(args.sortOrder as string)}`);
          url += params.join('&');

          const response = await fetch(url, { method: 'GET', headers: this.getHeaders(false) });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list cases: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Elastic Security returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_case': {
          const title = args.title as string;
          const description = args.description as string;
          if (!title || !description) {
            return { content: [{ type: 'text', text: 'title and description are required' }], isError: true };
          }
          const body: Record<string, unknown> = {
            title,
            description,
            severity: (args.severity as string) || 'low',
            tags: (args.tags as string[]) || [],
            connector: { id: 'none', name: 'none', type: '.none', fields: null },
            settings: { syncAlerts: false },
          };

          const response = await fetch(`${this.kibanaUrl}${this.pathPrefix}/api/cases`, {
            method: 'POST',
            headers: this.getHeaders(true),
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create case: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Elastic Security returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_detection_rule': {
          const name = args.name as string;
          const description = args.description as string;
          const type = args.type as string;
          const severity = args.severity as string;
          const risk_score = args.risk_score as number;
          if (!name || !description || !type || !severity || risk_score === undefined) {
            return { content: [{ type: 'text', text: 'name, description, type, severity, and risk_score are required' }], isError: true };
          }
          const body: Record<string, unknown> = {
            name,
            description,
            type,
            severity,
            risk_score,
            enabled: args.enabled !== undefined ? args.enabled : true,
          };
          if (args.query) body.query = args.query;
          if (args.language) body.language = args.language;
          if (args.index) body.index = args.index;

          const response = await fetch(`${this.kibanaUrl}${this.pathPrefix}/api/detection_engine/rules`, {
            method: 'POST',
            headers: this.getHeaders(true),
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create detection rule: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Elastic Security returned non-JSON response (HTTP ${response.status})`); }
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
