/** IBM QRadar MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000;

export class QRadarMCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: {
    host: string;
    secToken: string;
  }) {
    this.baseUrl = `https://${config.host}/api`;
    this.headers = {
      'SEC': config.secToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_offenses',
        description: 'Retrieve list of offenses from QRadar',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'AQL filter expression (e.g., "status=OPEN and severity>5")',
            },
            range: {
              type: 'string',
              description: 'Pagination range (e.g., "items=0-99")',
            },
            sort: {
              type: 'string',
              description: 'Sort field (e.g., "+start_time" or "-severity")',
            },
          },
        },
      },
      {
        name: 'search_events',
        description: 'Search events in QRadar using AQL query (async: creates search, polls until complete, returns results)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'AQL query string for event search',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_flows',
        description: 'Retrieve network flow data from QRadar',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'AQL filter for flows (e.g., "sourceip=192.168.1.0/24")',
            },
            range: {
              type: 'string',
              description: 'Pagination range',
            },
            limit: {
              type: 'number',
              description: 'Maximum flows to return',
            },
          },
        },
      },
      {
        name: 'list_reference_sets',
        description: 'List all reference sets in QRadar',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter reference sets by name or type',
            },
            range: {
              type: 'string',
              description: 'Pagination range',
            },
          },
        },
      },
      {
        name: 'get_rules',
        description: 'Retrieve QRadar detection rules',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter rules (e.g., "enabled=true")',
            },
            range: {
              type: 'string',
              description: 'Pagination range',
            },
          },
        },
      },
    ];
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_offenses':
          return await this.getOffenses(
            args.filter as string | undefined,
            args.range as string | undefined,
            args.sort as string | undefined
          );
        case 'search_events':
          return await this.searchEvents(args.query as string);
        case 'get_flows':
          return await this.getFlows(
            args.filter as string | undefined,
            args.range as string | undefined,
            args.limit as number | undefined
          );
        case 'list_reference_sets':
          return await this.listReferenceSets(
            args.filter as string | undefined,
            args.range as string | undefined
          );
        case 'get_rules':
          return await this.getRules(
            args.filter as string | undefined,
            args.range as string | undefined
          );
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error instanceof Error ? error.message : String(error)) }],
        isError: true,
      };
    }
  }

  private async getOffenses(
    filter?: string,
    range?: string,
    sort?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('fields', 'id,status,severity,description,start_time,assigned_to');

    if (filter) {
      params.append('filter', filter);
    }

    const headers = { ...this.headers };
    if (range) {
      headers['Range'] = range;
    }
    if (sort) {
      params.append('sort', sort);
    }

    const response = await fetch(
      `${this.baseUrl}/siem/offenses?${params}`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      throw new Error(`QRadar API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`QRadar returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async searchEvents(query: string): Promise<ToolResult> {
    // Step 1: Create async search
    const createResponse = await fetch(
      `${this.baseUrl}/ariel/searches`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ query_expression: query }),
      }
    );

    if (!createResponse.ok) {
      throw new Error(`QRadar search create error: ${createResponse.status} ${createResponse.statusText}`);
    }

    let createData: { search_id?: string; status?: string };
    try {
      createData = await createResponse.json() as { search_id?: string; status?: string };
    } catch {
      throw new Error(`QRadar returned non-JSON response on search create (HTTP ${createResponse.status})`);
    }

    const searchId = createData.search_id;
    if (!searchId) {
      throw new Error('QRadar did not return a search_id');
    }

    // Step 2: Poll until status is COMPLETED, CANCELED, or ERROR
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let status = createData.status ?? 'WAIT';

    while (status !== 'COMPLETED' && status !== 'CANCELED' && status !== 'ERROR') {
      if (Date.now() > deadline) {
        throw new Error(`QRadar search ${searchId} did not complete within ${POLL_TIMEOUT_MS / 1000}s`);
      }

      await new Promise<void>(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

      const statusResponse = await fetch(
        `${this.baseUrl}/ariel/searches/${encodeURIComponent(searchId)}`,
        { method: 'GET', headers: this.headers }
      );

      if (!statusResponse.ok) {
        throw new Error(`QRadar search status error: ${statusResponse.status} ${statusResponse.statusText}`);
      }

      let statusData: { status?: string };
      try {
        statusData = await statusResponse.json() as { status?: string };
      } catch {
        throw new Error(`QRadar returned non-JSON response on status poll (HTTP ${statusResponse.status})`);
      }

      status = statusData.status ?? status;
    }

    if (status === 'CANCELED') {
      throw new Error(`QRadar search ${searchId} was canceled`);
    }
    if (status === 'ERROR') {
      throw new Error(`QRadar search ${searchId} completed with ERROR status`);
    }

    // Step 3: Retrieve results
    const resultsResponse = await fetch(
      `${this.baseUrl}/ariel/searches/${encodeURIComponent(searchId)}/results`,
      { method: 'GET', headers: this.headers }
    );

    if (!resultsResponse.ok) {
      throw new Error(`QRadar search results error: ${resultsResponse.status} ${resultsResponse.statusText}`);
    }

    let results: unknown;
    try {
      results = await resultsResponse.json();
    } catch {
      throw new Error(`QRadar returned non-JSON response on results fetch (HTTP ${resultsResponse.status})`);
    }

    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }], isError: false };
  }

  private async getFlows(
    filter?: string,
    range?: string,
    limit?: number
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('fields', 'id,sourceip,destinationip,starttime,endtime,protocol,sourceport,destinationport');

    if (filter) {
      params.append('filter', filter);
    }
    if (limit) {
      params.append('limit', String(limit));
    }

    const headers = { ...this.headers };
    if (range) {
      headers['Range'] = range;
    }

    const response = await fetch(
      `${this.baseUrl}/siem/flows?${params}`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      throw new Error(`QRadar API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`QRadar returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listReferenceSets(
    filter?: string,
    range?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('fields', 'id,name,data_type,element_type,time_to_live');

    if (filter) {
      params.append('filter', filter);
    }

    const headers = { ...this.headers };
    if (range) {
      headers['Range'] = range;
    }

    const response = await fetch(
      `${this.baseUrl}/reference_data/sets?${params}`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      throw new Error(`QRadar API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`QRadar returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getRules(
    filter?: string,
    range?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('fields', 'id,name,description,enabled,creation_date,modification_date');

    if (filter) {
      params.append('filter', filter);
    }

    const headers = { ...this.headers };
    if (range) {
      headers['Range'] = range;
    }

    const response = await fetch(
      `${this.baseUrl}/analytics/rules?${params}`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      throw new Error(`QRadar API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`QRadar returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
