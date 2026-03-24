/**
 * Pipedrive MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — multiple community implementations exist (WillDent/pipedrive-mcp-server, Wirasm/pipedrive-mcp, iamsamuelfraga/mcp-pipedrive) but none are official Pipedrive-published servers

import { ToolDefinition, ToolResult } from './types.js';

interface PipedriveConfig {
  apiToken: string;
  baseUrl?: string;
}

export class PipedriveMCPServer {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: PipedriveConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.pipedrive.com/v2';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_deals',
        description: 'List deals, optionally filtered by owner, pipeline, stage, person, or organization',
        inputSchema: {
          type: 'object',
          properties: {
            owner_id: {
              type: 'number',
              description: 'Filter deals by owner user ID',
            },
            pipeline_id: {
              type: 'number',
              description: 'Filter deals by pipeline ID',
            },
            stage_id: {
              type: 'number',
              description: 'Filter deals by stage ID',
            },
            person_id: {
              type: 'number',
              description: 'Filter deals by person ID',
            },
            org_id: {
              type: 'number',
              description: 'Filter deals by organization ID',
            },
            status: {
              type: 'string',
              description: 'Filter by deal status: open, won, lost, deleted (default: open)',
            },
            limit: {
              type: 'number',
              description: 'Number of deals to return (max 500, default: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'create_deal',
        description: 'Create a new deal in Pipedrive',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title of the deal',
            },
            value: {
              type: 'number',
              description: 'Monetary value of the deal',
            },
            currency: {
              type: 'string',
              description: 'Currency code (e.g. USD, EUR). Defaults to the company default currency.',
            },
            person_id: {
              type: 'number',
              description: 'ID of the person associated with this deal',
            },
            org_id: {
              type: 'number',
              description: 'ID of the organization associated with this deal',
            },
            pipeline_id: {
              type: 'number',
              description: 'ID of the pipeline this deal belongs to',
            },
            stage_id: {
              type: 'number',
              description: 'ID of the stage this deal is placed in',
            },
            owner_id: {
              type: 'number',
              description: 'ID of the user that owns this deal',
            },
            expected_close_date: {
              type: 'string',
              description: 'Expected close date in YYYY-MM-DD format',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_deal',
        description: 'Update an existing deal by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'ID of the deal to update',
            },
            title: {
              type: 'string',
              description: 'New title for the deal',
            },
            value: {
              type: 'number',
              description: 'New monetary value',
            },
            status: {
              type: 'string',
              description: 'New status: open, won, lost',
            },
            stage_id: {
              type: 'number',
              description: 'Move the deal to this stage ID',
            },
            expected_close_date: {
              type: 'string',
              description: 'Expected close date in YYYY-MM-DD format',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_persons',
        description: 'List persons (contacts) in Pipedrive',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'number',
              description: 'Filter persons by organization ID',
            },
            owner_id: {
              type: 'number',
              description: 'Filter persons by owner user ID',
            },
            limit: {
              type: 'number',
              description: 'Number of persons to return (max 500, default: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'search_persons',
        description: 'Search for persons by name, email, or phone using Pipedrive v2 search',
        inputSchema: {
          type: 'object',
          properties: {
            term: {
              type: 'string',
              description: 'Search term (minimum 2 characters)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to search: name, email, phone, notes, custom_fields',
            },
            limit: {
              type: 'number',
              description: 'Number of results to return (max 500, default: 100)',
            },
          },
          required: ['term'],
        },
      },
      {
        name: 'list_organizations',
        description: 'List organizations in Pipedrive',
        inputSchema: {
          type: 'object',
          properties: {
            owner_id: {
              type: 'number',
              description: 'Filter organizations by owner user ID',
            },
            limit: {
              type: 'number',
              description: 'Number of organizations to return (max 500, default: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'list_activities',
        description: 'List activities (calls, meetings, tasks, emails, etc.) in Pipedrive',
        inputSchema: {
          type: 'object',
          properties: {
            owner_id: {
              type: 'number',
              description: 'Filter activities by owner user ID',
            },
            deal_id: {
              type: 'number',
              description: 'Filter activities by deal ID',
            },
            person_id: {
              type: 'number',
              description: 'Filter activities by person ID',
            },
            org_id: {
              type: 'number',
              description: 'Filter activities by organization ID',
            },
            done: {
              type: 'boolean',
              description: 'Filter by completion status. Omit to return all activities.',
            },
            limit: {
              type: 'number',
              description: 'Number of activities to return (max 500, default: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'list_pipelines',
        description: 'List all sales pipelines in Pipedrive',
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
        'x-api-token': this.apiToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      switch (name) {
        case 'list_deals': {
          const params = new URLSearchParams();
          if (args.owner_id !== undefined) params.set('owner_id', String(args.owner_id));
          if (args.pipeline_id !== undefined) params.set('pipeline_id', String(args.pipeline_id));
          if (args.stage_id !== undefined) params.set('stage_id', String(args.stage_id));
          if (args.person_id !== undefined) params.set('person_id', String(args.person_id));
          if (args.org_id !== undefined) params.set('org_id', String(args.org_id));
          if (args.status) params.set('status', args.status as string);
          params.set('limit', String((args.limit as number) || 100));
          if (args.cursor) params.set('cursor', args.cursor as string);

          const response = await fetch(`${this.baseUrl}/deals?${params.toString()}`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list deals: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Pipedrive returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_deal': {
          const title = args.title as string;
          if (!title) {
            return { content: [{ type: 'text', text: 'title is required' }], isError: true };
          }

          const body: Record<string, unknown> = { title };
          if (args.value !== undefined) body.value = args.value;
          if (args.currency) body.currency = args.currency;
          if (args.person_id !== undefined) body.person_id = args.person_id;
          if (args.org_id !== undefined) body.org_id = args.org_id;
          if (args.pipeline_id !== undefined) body.pipeline_id = args.pipeline_id;
          if (args.stage_id !== undefined) body.stage_id = args.stage_id;
          if (args.owner_id !== undefined) body.owner_id = args.owner_id;
          if (args.expected_close_date) body.expected_close_date = args.expected_close_date;

          const response = await fetch(`${this.baseUrl}/deals`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create deal: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Pipedrive returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_deal': {
          const id = args.id as number;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }

          const body: Record<string, unknown> = {};
          if (args.title) body.title = args.title;
          if (args.value !== undefined) body.value = args.value;
          if (args.status) body.status = args.status;
          if (args.stage_id !== undefined) body.stage_id = args.stage_id;
          if (args.expected_close_date) body.expected_close_date = args.expected_close_date;

          const response = await fetch(`${this.baseUrl}/deals/${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update deal: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Pipedrive returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_persons': {
          const params = new URLSearchParams();
          if (args.org_id !== undefined) params.set('org_id', String(args.org_id));
          if (args.owner_id !== undefined) params.set('owner_id', String(args.owner_id));
          params.set('limit', String((args.limit as number) || 100));
          if (args.cursor) params.set('cursor', args.cursor as string);

          const response = await fetch(`${this.baseUrl}/persons?${params.toString()}`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list persons: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Pipedrive returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_persons': {
          const term = args.term as string;
          if (!term) {
            return { content: [{ type: 'text', text: 'term is required' }], isError: true };
          }

          const params = new URLSearchParams({ term });
          if (args.fields) params.set('fields', args.fields as string);
          params.set('limit', String((args.limit as number) || 100));

          const response = await fetch(`${this.baseUrl}/persons/search?${params.toString()}`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to search persons: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Pipedrive returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_organizations': {
          const params = new URLSearchParams();
          if (args.owner_id !== undefined) params.set('owner_id', String(args.owner_id));
          params.set('limit', String((args.limit as number) || 100));
          if (args.cursor) params.set('cursor', args.cursor as string);

          const response = await fetch(`${this.baseUrl}/organizations?${params.toString()}`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list organizations: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Pipedrive returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_activities': {
          const params = new URLSearchParams();
          if (args.owner_id !== undefined) params.set('owner_id', String(args.owner_id));
          if (args.deal_id !== undefined) params.set('deal_id', String(args.deal_id));
          if (args.person_id !== undefined) params.set('person_id', String(args.person_id));
          if (args.org_id !== undefined) params.set('org_id', String(args.org_id));
          if (typeof args.done === 'boolean') params.set('done', args.done ? '1' : '0');
          params.set('limit', String((args.limit as number) || 100));
          if (args.cursor) params.set('cursor', args.cursor as string);

          const response = await fetch(`${this.baseUrl}/activities?${params.toString()}`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list activities: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Pipedrive returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_pipelines': {
          const response = await fetch(`${this.baseUrl}/pipelines`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list pipelines: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Pipedrive returned non-JSON response (HTTP ${response.status})`); }
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
