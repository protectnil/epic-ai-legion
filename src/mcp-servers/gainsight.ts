/**
 * Gainsight MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found (Pipedream hosts a Gainsight MCP but it is not self-hostable; our adapter serves API-key use cases)
//
// NOTE: Gainsight NXT uses per-API-type subdomains rather than a single tenant subdomain:
//   Company API  → https://companyapi.gainsightcloud.com
//   People API   → https://personapi.gainsightcloud.com
//   Custom Object API → https://customobjectapi.gainsightcloud.com
// Pass the full domain URL for the API type you need via the `domainUrl` config field.
// All requests use the `accesskey` header for authentication (key does not expire).

import { ToolDefinition, ToolResult } from './types.js';

interface GainsightConfig {
  accessKey: string;
  domainUrl: string;
}

export class GainsightMCPServer {
  private readonly accessKey: string;
  private readonly domainUrl: string;

  constructor(config: GainsightConfig) {
    // domainUrl example: "https://companyapi.gainsightcloud.com"
    this.accessKey = config.accessKey;
    this.domainUrl = config.domainUrl.replace(/\/$/, '');
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query_object',
        description: 'Query records from a Gainsight object (e.g. Company, Person, or a Custom Object) using OData-style filters',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Name of the Gainsight object to query (e.g. Company, Person)',
            },
            select: {
              type: 'string',
              description: 'Comma-separated list of fields to return',
            },
            filter: {
              type: 'string',
              description: 'OData filter expression (e.g. Name eq \'Acme\')',
            },
            order_by: {
              type: 'string',
              description: 'Field to sort by, optionally followed by asc or desc',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of records per page (max 2000, default: 100)',
            },
          },
          required: ['object_name'],
        },
      },
      {
        name: 'upsert_records',
        description: 'Insert or update records in a Gainsight object. Matched on the keys specified.',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Name of the Gainsight object (e.g. Company)',
            },
            records: {
              type: 'array',
              description: 'Array of record objects to upsert',
              items: { type: 'object' },
            },
            keys: {
              type: 'array',
              description: 'Field names used as match keys for upsert logic',
              items: { type: 'string' },
            },
          },
          required: ['object_name', 'records', 'keys'],
        },
      },
      {
        name: 'delete_records',
        description: 'Delete records from a Gainsight object by their IDs',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Name of the Gainsight object (e.g. Company)',
            },
            ids: {
              type: 'array',
              description: 'Array of record IDs (gsid values) to delete',
              items: { type: 'string' },
            },
          },
          required: ['object_name', 'ids'],
        },
      },
      {
        name: 'get_object_metadata',
        description: 'Retrieve field metadata (schema) for a Gainsight object',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Name of the Gainsight object to inspect (e.g. Company)',
            },
          },
          required: ['object_name'],
        },
      },
      {
        name: 'list_objects',
        description: 'List all available objects in the Gainsight tenant',
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
        accesskey: this.accessKey,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'query_object': {
          const object_name = args.object_name as string;
          if (!object_name) {
            return { content: [{ type: 'text', text: 'object_name is required' }], isError: true };
          }
          const params = new URLSearchParams();
          if (args.select) params.set('select', args.select as string);
          if (args.filter) params.set('filter', args.filter as string);
          if (args.order_by) params.set('orderby', args.order_by as string);
          if (args.page) params.set('page', String(args.page));
          if (args.page_size) params.set('pageSize', String(args.page_size));

          const url = `${this.domainUrl}/v1/data/objects/${encodeURIComponent(object_name)}${params.toString() ? '?' + params.toString() : ''}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to query object: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gainsight returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'upsert_records': {
          const object_name = args.object_name as string;
          const records = args.records;
          const keys = args.keys as string[];
          if (!object_name || !records || !keys || !Array.isArray(keys) || keys.length === 0) {
            return { content: [{ type: 'text', text: 'object_name, records, and keys are required' }], isError: true };
          }
          const keysParam = keys.join(',');
          const url = `${this.domainUrl}/v1/data/objects/${encodeURIComponent(object_name)}?keys=${encodeURIComponent(keysParam)}`;

          const response = await fetch(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ records }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to upsert records: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gainsight returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_records': {
          const object_name = args.object_name as string;
          const ids = args.ids as string[];
          if (!object_name || !ids || !Array.isArray(ids) || ids.length === 0) {
            return { content: [{ type: 'text', text: 'object_name and ids are required' }], isError: true };
          }
          const url = `${this.domainUrl}/v1/data/objects/${encodeURIComponent(object_name)}`;

          const response = await fetch(url, {
            method: 'DELETE',
            headers,
            body: JSON.stringify({ ids }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to delete records: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { data = { success: true }; }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_object_metadata': {
          const object_name = args.object_name as string;
          if (!object_name) {
            return { content: [{ type: 'text', text: 'object_name is required' }], isError: true };
          }
          const url = `${this.domainUrl}/v1/meta/services/objects/${encodeURIComponent(object_name)}/fields`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get object metadata: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gainsight returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_objects': {
          const url = `${this.domainUrl}/v1/meta/services/objects`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list objects: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Gainsight returned non-JSON response (HTTP ${response.status})`); }
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
