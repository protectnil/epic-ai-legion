/**
 * Ironclad MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found

import { ToolDefinition, ToolResult } from './types.js';

interface IroncladConfig {
  accessToken: string;
  /**
   * Ironclad regional subdomain. Most customers use 'na1'. EU customers use 'eu1'.
   * Also accepts 'demo' or 'preview' for non-production environments.
   * Defaults to 'na1'.
   */
  region?: string;
  baseUrl?: string;
}

export class IroncladMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: IroncladConfig) {
    this.accessToken = config.accessToken;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    } else {
      const region = config.region || 'na1';
      this.baseUrl = `https://${region}.ironcladapp.com/public/api/v1`;
    }
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workflows',
        description: 'List workflow (contract) records in Ironclad, with optional filtering by status or template',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by workflow status: in_review, form_complete, waiting_for_counterparty, signing, executed, terminated',
            },
            template_id: {
              type: 'string',
              description: 'Filter by workflow template ID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (max: 20, default: 10)',
            },
          },
        },
      },
      {
        name: 'get_workflow',
        description: 'Retrieve details of a specific Ironclad workflow by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'The Ironclad workflow ID',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'create_workflow',
        description: 'Launch a new contract workflow from a template with initial form data',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: {
              type: 'string',
              description: 'The workflow template ID to use',
            },
            attributes: {
              type: 'object',
              description: 'Key-value map of form field values to populate the workflow',
            },
            creator_email: {
              type: 'string',
              description: 'Email of the Ironclad user to launch the workflow on behalf of',
            },
          },
          required: ['template_id', 'attributes'],
        },
      },
      {
        name: 'list_records',
        description: 'List contract records stored in the Ironclad records repository',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (max: 20, default: 10)',
            },
            type: {
              type: 'string',
              description: 'Filter records by type',
            },
          },
        },
      },
      {
        name: 'get_record',
        description: 'Retrieve a specific contract record by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            record_id: {
              type: 'string',
              description: 'The Ironclad record ID',
            },
          },
          required: ['record_id'],
        },
      },
      {
        name: 'create_record',
        description: 'Create a new contract record in the Ironclad repository (for importing existing contracts)',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'The record type',
            },
            attributes: {
              type: 'object',
              description: 'Key-value map of record field values',
            },
          },
          required: ['type', 'attributes'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all registered webhooks in the Ironclad account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_webhook',
        description: 'Register a new webhook endpoint to receive Ironclad event notifications',
        inputSchema: {
          type: 'object',
          properties: {
            target_url: {
              type: 'string',
              description: 'The HTTPS URL that Ironclad will POST events to',
            },
            event_types: {
              type: 'array',
              description: 'Array of event type strings to subscribe to (e.g. workflow.created, workflow.completed)',
              items: { type: 'string' },
            },
          },
          required: ['target_url', 'event_types'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a registered webhook by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'string',
              description: 'The Ironclad webhook ID to delete',
            },
          },
          required: ['webhook_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_workflows': {
          const params = new URLSearchParams();
          if (args.status) params.set('status', args.status as string);
          if (args.template_id) params.set('template', args.template_id as string);
          if (args.page) params.set('page', String(args.page));
          if (args.page_size) params.set('pageSize', String(args.page_size));
          const qs = params.toString();
          const url = `${this.baseUrl}/workflows${qs ? `?${qs}` : ''}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list workflows: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ironclad returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_workflow': {
          const workflowId = args.workflow_id as string;
          if (!workflowId) {
            return { content: [{ type: 'text', text: 'workflow_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/workflows/${encodeURIComponent(workflowId)}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get workflow: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ironclad returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_workflow': {
          const templateId = args.template_id as string;
          const attributes = args.attributes as Record<string, unknown>;
          if (!templateId || !attributes) {
            return {
              content: [{ type: 'text', text: 'template_id and attributes are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { template: templateId, attributes };
          if (args.creator_email) body.creatorEmail = args.creator_email;

          const response = await fetch(`${this.baseUrl}/workflows`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create workflow: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ironclad returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_records': {
          const params = new URLSearchParams();
          if (args.page) params.set('page', String(args.page));
          if (args.page_size) params.set('pageSize', String(args.page_size));
          if (args.type) params.set('type', args.type as string);
          const qs = params.toString();
          const url = `${this.baseUrl}/records${qs ? `?${qs}` : ''}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list records: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ironclad returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_record': {
          const recordId = args.record_id as string;
          if (!recordId) {
            return { content: [{ type: 'text', text: 'record_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/records/${encodeURIComponent(recordId)}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get record: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ironclad returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_record': {
          const type = args.type as string;
          const attributes = args.attributes as Record<string, unknown>;
          if (!type || !attributes) {
            return {
              content: [{ type: 'text', text: 'type and attributes are required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/records`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ type, attributes }),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create record: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ironclad returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_webhooks': {
          const response = await fetch(`${this.baseUrl}/webhooks`, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list webhooks: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ironclad returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_webhook': {
          const targetUrl = args.target_url as string;
          const eventTypes = args.event_types as string[];
          if (!targetUrl || !eventTypes) {
            return {
              content: [{ type: 'text', text: 'target_url and event_types are required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/webhooks`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ targetUrl, eventTypes }),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create webhook: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ironclad returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_webhook': {
          const webhookId = args.webhook_id as string;
          if (!webhookId) {
            return { content: [{ type: 'text', text: 'webhook_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/webhooks/${encodeURIComponent(webhookId)}`, {
            method: 'DELETE',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to delete webhook: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: `Webhook ${webhookId} deleted successfully` }], isError: false };
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
