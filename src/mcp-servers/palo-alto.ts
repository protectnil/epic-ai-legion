/**
 * Palo Alto Networks Cortex XDR MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

export class PaloAltoMCPServer {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiKeyId: string;
  private readonly headers: Record<string, string>;

  constructor(config: { baseUrl: string; apiKey: string; apiKeyId: string }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.apiKeyId = config.apiKeyId;
    // Standard API key authentication per Cortex XDR REST API spec:
    // Authorization: {key}, x-xdr-auth-id: {key_id}
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': this.apiKey,
      'x-xdr-auth-id': this.apiKeyId,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_incidents',
        description: 'Get a list of Cortex XDR incidents, optionally filtered by incident IDs, modification time, or creation time',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id_list: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of incident IDs to retrieve',
            },
            search_from: {
              type: 'number',
              description: 'Pagination start offset (default 0)',
            },
            search_to: {
              type: 'number',
              description: 'Pagination end offset (default 100)',
            },
          },
        },
      },
      {
        name: 'get_alerts',
        description: 'Get a list of Cortex XDR alerts and their metadata, optionally filtered by alert IDs or severity',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id_list: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of alert IDs to retrieve',
            },
            severity: {
              type: 'array',
              items: { type: 'string', enum: ['low', 'medium', 'high', 'critical', 'informational'] },
              description: 'Filter alerts by severity level(s)',
            },
            search_from: {
              type: 'number',
              description: 'Pagination start offset (default 0)',
            },
            search_to: {
              type: 'number',
              description: 'Pagination end offset (default 100)',
            },
          },
        },
      },
      {
        name: 'get_endpoints',
        description: 'Get a list of Cortex XDR endpoints, optionally filtered by endpoint ID, hostname, or IP address',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id_list: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of endpoint IDs to retrieve',
            },
            hostname: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by hostnames',
            },
            ip_list: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by IP addresses',
            },
            search_from: {
              type: 'number',
              description: 'Pagination start offset (default 0)',
            },
            search_to: {
              type: 'number',
              description: 'Pagination end offset (default 100)',
            },
          },
        },
      },
      {
        name: 'isolate_endpoint',
        description: 'Isolate one or more Cortex XDR endpoints. Request is limited to 1000 endpoints.',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id_list: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of endpoint IDs to isolate',
            },
            incident_id: {
              type: 'string',
              description: 'Optional incident ID to link the isolation action to',
            },
          },
          required: ['endpoint_id_list'],
        },
      },
      {
        name: 'unisolate_endpoint',
        description: 'Reverse the isolation of one or more Cortex XDR endpoints',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id_list: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of endpoint IDs to unisolate',
            },
            incident_id: {
              type: 'string',
              description: 'Optional incident ID to link the unisolation action to',
            },
          },
          required: ['endpoint_id_list'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_incidents':
          return await this.getIncidents(args);
        case 'get_alerts':
          return await this.getAlerts(args);
        case 'get_endpoints':
          return await this.getEndpoints(args);
        case 'isolate_endpoint':
          return await this.isolateEndpoint(args);
        case 'unisolate_endpoint':
          return await this.unisolateEndpoint(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : 'Unknown error' }],
        isError: true,
      };
    }
  }

  private async postJson(path: string, body: Record<string, unknown>): Promise<unknown> {
    const url = `${this.baseUrl}/public_api/v1/${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Cortex XDR API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Cortex XDR returned non-JSON response (HTTP ${response.status})`);
    }
    return data;
  }

  private async getIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const searchFrom = (args.search_from as number) ?? 0;
    const searchTo = (args.search_to as number) ?? 100;
    const filters: Record<string, unknown>[] = [];

    if (Array.isArray(args.incident_id_list) && args.incident_id_list.length > 0) {
      filters.push({
        field: 'incident_id_list',
        operator: 'in',
        value: args.incident_id_list,
      });
    }

    const data = await this.postJson('incidents/get_incidents/', {
      request_data: {
        filters,
        search_from: searchFrom,
        search_to: searchTo,
      },
    });

    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const searchFrom = (args.search_from as number) ?? 0;
    const searchTo = (args.search_to as number) ?? 100;
    const filters: Record<string, unknown>[] = [];

    if (Array.isArray(args.alert_id_list) && args.alert_id_list.length > 0) {
      filters.push({
        field: 'alert_id_list',
        operator: 'in',
        value: args.alert_id_list,
      });
    }

    if (Array.isArray(args.severity) && args.severity.length > 0) {
      filters.push({
        field: 'severity',
        operator: 'in',
        value: args.severity,
      });
    }

    const data = await this.postJson('alerts/get_alerts/', {
      request_data: {
        filters,
        search_from: searchFrom,
        search_to: searchTo,
      },
    });

    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getEndpoints(args: Record<string, unknown>): Promise<ToolResult> {
    const searchFrom = (args.search_from as number) ?? 0;
    const searchTo = (args.search_to as number) ?? 100;
    const filters: Record<string, unknown>[] = [];

    if (Array.isArray(args.endpoint_id_list) && args.endpoint_id_list.length > 0) {
      filters.push({
        field: 'endpoint_id_list',
        operator: 'in',
        value: args.endpoint_id_list,
      });
    }

    if (Array.isArray(args.hostname) && args.hostname.length > 0) {
      filters.push({
        field: 'hostname',
        operator: 'in',
        value: args.hostname,
      });
    }

    if (Array.isArray(args.ip_list) && args.ip_list.length > 0) {
      filters.push({
        field: 'ip_list',
        operator: 'in',
        value: args.ip_list,
      });
    }

    const data = await this.postJson('endpoints/get_endpoint/', {
      request_data: {
        filters,
        search_from: searchFrom,
        search_to: searchTo,
      },
    });

    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async isolateEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    const endpointIdList = args.endpoint_id_list as string[];
    const requestData: Record<string, unknown> = {
      filters: [
        {
          field: 'endpoint_id_list',
          operator: 'in',
          value: endpointIdList,
        },
      ],
    };

    if (args.incident_id) {
      requestData.incident_id = args.incident_id;
    }

    const data = await this.postJson('endpoints/isolate/', {
      request_data: requestData,
    });

    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async unisolateEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    const endpointIdList = args.endpoint_id_list as string[];
    const requestData: Record<string, unknown> = {
      filters: [
        {
          field: 'endpoint_id_list',
          operator: 'in',
          value: endpointIdList,
        },
      ],
    };

    if (args.incident_id) {
      requestData.incident_id = args.incident_id;
    }

    const data = await this.postJson('endpoints/unisolate/', {
      request_data: requestData,
    });

    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
