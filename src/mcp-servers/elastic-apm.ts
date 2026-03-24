/**
 * Elastic APM MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/elastic/mcp-server-elasticsearch — official Elastic MCP for Elasticsearch, deprecated (replaced by Elastic Agent Builder in 9.2.0+). No dedicated APM MCP exists. Our adapter targets the Kibana APM UI API directly for observability use cases.

import { ToolDefinition, ToolResult } from './types.js';

// Auth note: Elastic APM APIs are Kibana APIs. Authentication uses:
//   Authorization: ApiKey <base64(id:api_key)>  — Elasticsearch API key (recommended)
//   Authorization: Basic <base64(user:pass)>     — Basic auth
// Additionally, all mutating requests require the kbn-xsrf header.
// The Kibana host is user-supplied (e.g. https://my-kibana.example.com:5601).

interface ElasticAPMConfig {
  kibanaUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
}

export class ElasticAPMMCPServer {
  private readonly kibanaUrl: string;
  private readonly authHeader: string;

  constructor(config: ElasticAPMConfig) {
    this.kibanaUrl = config.kibanaUrl.replace(/\/$/, '');

    if (config.apiKey) {
      this.authHeader = `ApiKey ${config.apiKey}`;
    } else if (config.username && config.password) {
      this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
    } else {
      throw new Error('ElasticAPMMCPServer requires either apiKey or username+password');
    }
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_services',
        description: 'List all APM-instrumented services reporting to this Kibana/Elasticsearch instance',
        inputSchema: {
          type: 'object',
          properties: {
            start: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format (e.g. 2026-03-01T00:00:00.000Z)',
            },
            end: {
              type: 'string',
              description: 'End of time range in ISO 8601 format (e.g. 2026-03-24T23:59:59.999Z)',
            },
            environment: {
              type: 'string',
              description: 'Filter by APM environment name (e.g. production)',
            },
          },
          required: ['start', 'end'],
        },
      },
      {
        name: 'get_service_details',
        description: 'Get transaction statistics and metadata for a specific APM service',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'The APM service name',
            },
            start: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format',
            },
            end: {
              type: 'string',
              description: 'End of time range in ISO 8601 format',
            },
            environment: {
              type: 'string',
              description: 'APM environment name (optional)',
            },
          },
          required: ['service_name', 'start', 'end'],
        },
      },
      {
        name: 'list_error_groups',
        description: 'List error groups (unique errors) for an APM service within a time range',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'The APM service name',
            },
            start: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format',
            },
            end: {
              type: 'string',
              description: 'End of time range in ISO 8601 format',
            },
            environment: {
              type: 'string',
              description: 'APM environment name (optional)',
            },
          },
          required: ['service_name', 'start', 'end'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List transaction groups and their performance statistics for an APM service',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'The APM service name',
            },
            start: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format',
            },
            end: {
              type: 'string',
              description: 'End of time range in ISO 8601 format',
            },
            transaction_type: {
              type: 'string',
              description: 'Transaction type filter (e.g. request, worker, scheduled) — optional',
            },
            environment: {
              type: 'string',
              description: 'APM environment name (optional)',
            },
          },
          required: ['service_name', 'start', 'end'],
        },
      },
      {
        name: 'create_annotation',
        description: 'Create a deployment annotation on an APM service to mark a release or event',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'The APM service name to annotate',
            },
            service_version: {
              type: 'string',
              description: 'The service version being deployed',
            },
            environment: {
              type: 'string',
              description: 'APM environment name (e.g. production)',
            },
            timestamp: {
              type: 'string',
              description: 'ISO 8601 timestamp for the annotation (defaults to now if omitted)',
            },
            message: {
              type: 'string',
              description: 'Human-readable annotation message (optional)',
            },
          },
          required: ['service_name', 'service_version', 'environment'],
        },
      },
      {
        name: 'list_agent_configs',
        description: 'List all APM agent remote configurations stored in Kibana',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        'kbn-xsrf': 'true',
      };

      switch (name) {
        case 'list_services': {
          const start = args.start as string;
          const end = args.end as string;

          if (!start || !end) {
            return {
              content: [{ type: 'text', text: 'start and end are required' }],
              isError: true,
            };
          }

          let url = `${this.kibanaUrl}/api/apm/services?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
          if (args.environment) url += `&environment=${encodeURIComponent(args.environment as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list services: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Kibana returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_service_details': {
          const serviceName = args.service_name as string;
          const start = args.start as string;
          const end = args.end as string;

          if (!serviceName || !start || !end) {
            return {
              content: [{ type: 'text', text: 'service_name, start, and end are required' }],
              isError: true,
            };
          }

          let url = `${this.kibanaUrl}/api/apm/services/${encodeURIComponent(serviceName)}/transaction_groups/main_statistics?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
          if (args.environment) url += `&environment=${encodeURIComponent(args.environment as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get service details: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Kibana returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_error_groups': {
          const serviceName = args.service_name as string;
          const start = args.start as string;
          const end = args.end as string;

          if (!serviceName || !start || !end) {
            return {
              content: [{ type: 'text', text: 'service_name, start, and end are required' }],
              isError: true,
            };
          }

          let url = `${this.kibanaUrl}/api/apm/services/${encodeURIComponent(serviceName)}/errors/groups/main_statistics?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
          if (args.environment) url += `&environment=${encodeURIComponent(args.environment as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list error groups: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Kibana returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_transactions': {
          const serviceName = args.service_name as string;
          const start = args.start as string;
          const end = args.end as string;

          if (!serviceName || !start || !end) {
            return {
              content: [{ type: 'text', text: 'service_name, start, and end are required' }],
              isError: true,
            };
          }

          let url = `${this.kibanaUrl}/api/apm/services/${encodeURIComponent(serviceName)}/transactions/groups/main_statistics?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
          if (args.transaction_type) url += `&transactionType=${encodeURIComponent(args.transaction_type as string)}`;
          if (args.environment) url += `&environment=${encodeURIComponent(args.environment as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list transactions: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Kibana returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_annotation': {
          const serviceName = args.service_name as string;
          const serviceVersion = args.service_version as string;
          const environment = args.environment as string;

          if (!serviceName || !serviceVersion || !environment) {
            return {
              content: [{ type: 'text', text: 'service_name, service_version, and environment are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            '@timestamp': args.timestamp || new Date().toISOString(),
            service: {
              name: serviceName,
              version: serviceVersion,
              environment,
            },
          };
          if (args.message) body.message = args.message;

          const response = await fetch(
            `${this.kibanaUrl}/api/apm/services/${encodeURIComponent(serviceName)}/annotation`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create annotation: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Kibana returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_agent_configs': {
          const response = await fetch(
            `${this.kibanaUrl}/api/apm/settings/agent-configuration`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list agent configs: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Kibana returned non-JSON response (HTTP ${response.status})`); }
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
