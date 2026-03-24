/**
 * PandaDoc MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/pandadoc — PandaDoc ships an official MCP server bundle; see developers.pandadoc.com/docs/use-pandadoc-mcp-server
// This adapter serves the self-hosted / API-key use case without requiring the official hosted MCP.

import { ToolDefinition, ToolResult } from './types.js';

// Base URL: https://api.pandadoc.com/public/v1
// Auth: Two modes:
//   API Key — Authorization: API-Key {key}
//   OAuth2  — Authorization: Bearer {access_token}
// Both are sent as the Authorization header value; the prefix differs.

interface PandaDocConfig {
  apiKey?: string;        // Use API-Key auth: "API-Key {key}"
  accessToken?: string;   // Use OAuth2 Bearer auth: "Bearer {token}"
  baseUrl?: string;
}

export class PandaDocMCPServer {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: PandaDocConfig) {
    if (!config.apiKey && !config.accessToken) {
      throw new Error('PandaDocMCPServer requires either apiKey or accessToken');
    }
    this.authHeader = config.accessToken
      ? `Bearer ${config.accessToken}`
      : `API-Key ${config.apiKey}`;
    this.baseUrl = config.baseUrl || 'https://api.pandadoc.com/public/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_documents',
        description: 'List documents in the PandaDoc workspace with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'number',
              description: 'Filter by document status code: 0=draft, 1=sent, 2=completed, 3=uploaded, 4=error, 5=viewed, 6=waiting_approval, 7=approved, 8=rejected, 9=waiting_pay, 10=paid, 11=voided, 12=declined',
            },
            tag: {
              type: 'string',
              description: 'Filter by document tag',
            },
            q: {
              type: 'string',
              description: 'Search query to filter documents by name',
            },
            count: {
              type: 'number',
              description: 'Number of documents per page (default: 50, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            order_by: {
              type: 'string',
              description: 'Sort field: name, status, date_created, date_modified, date_completed',
            },
            asc: {
              type: 'boolean',
              description: 'Sort ascending (true) or descending (false)',
            },
          },
        },
      },
      {
        name: 'get_document',
        description: 'Get the status and details of a specific document',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'The PandaDoc document UUID',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'create_document_from_template',
        description: 'Create a new document from an existing PandaDoc template',
        inputSchema: {
          type: 'object',
          properties: {
            template_uuid: {
              type: 'string',
              description: 'UUID of the template to use',
            },
            name: {
              type: 'string',
              description: 'Name for the new document',
            },
            recipients: {
              type: 'array',
              description: 'Array of recipient objects. Each must have email and role. Optional: first_name, last_name.',
              items: { type: 'object' },
            },
            tokens: {
              type: 'array',
              description: 'Array of token objects for field substitution. Each must have name and value.',
              items: { type: 'object' },
            },
            fields: {
              type: 'object',
              description: 'Object mapping field identifiers to their values for pre-filling',
            },
          },
          required: ['template_uuid', 'name', 'recipients'],
        },
      },
      {
        name: 'send_document',
        description: 'Send a draft document to its recipients for signing',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'The PandaDoc document UUID to send',
            },
            message: {
              type: 'string',
              description: 'Optional message to include in the send email',
            },
            silent: {
              type: 'boolean',
              description: 'If true, send without email notifications (default: false)',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'delete_document',
        description: 'Delete a document permanently',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'The PandaDoc document UUID to delete',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'list_templates',
        description: 'List available document templates in the workspace',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query to filter templates by name',
            },
            tag: {
              type: 'string',
              description: 'Filter templates by tag',
            },
            count: {
              type: 'number',
              description: 'Number of templates per page (default: 50)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_document_session',
        description: 'Create a document session link for a recipient to view or sign without email authentication',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'The PandaDoc document UUID',
            },
            recipient_email: {
              type: 'string',
              description: 'Email of the recipient to create the session for',
            },
            lifetime: {
              type: 'number',
              description: 'Session lifetime in seconds (default: 3600)',
            },
          },
          required: ['document_id', 'recipient_email'],
        },
      },
      {
        name: 'list_document_fields',
        description: 'List all fields in a document (useful to discover field identifiers before filling)',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'The PandaDoc document UUID',
            },
          },
          required: ['document_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_documents': {
          const params = new URLSearchParams();
          if (args.status !== undefined) params.set('status', String(args.status));
          if (args.tag) params.set('tag', args.tag as string);
          if (args.q) params.set('q', args.q as string);
          if (args.count) params.set('count', String(args.count));
          if (args.page) params.set('page', String(args.page));
          if (args.order_by) params.set('order_by', args.order_by as string);
          if (typeof args.asc === 'boolean') params.set('asc', String(args.asc));

          const url = `${this.baseUrl}/documents?${params.toString()}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list documents: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`PandaDoc returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_document': {
          const documentId = args.document_id as string;
          if (!documentId) {
            return { content: [{ type: 'text', text: 'document_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/documents/${encodeURIComponent(documentId)}/details`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get document: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`PandaDoc returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_document_from_template': {
          const templateUuid = args.template_uuid as string;
          const docName = args.name as string;
          const recipients = args.recipients;

          if (!templateUuid || !docName || !recipients) {
            return {
              content: [{ type: 'text', text: 'template_uuid, name, and recipients are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            template_uuid: templateUuid,
            name: docName,
            recipients,
          };
          if (args.tokens) body.tokens = args.tokens;
          if (args.fields) body.fields = args.fields;

          const response = await fetch(
            `${this.baseUrl}/documents`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create document from template: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`PandaDoc returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'send_document': {
          const documentId = args.document_id as string;
          if (!documentId) {
            return { content: [{ type: 'text', text: 'document_id is required' }], isError: true };
          }

          const body: Record<string, unknown> = {};
          if (args.message) body.message = args.message;
          if (typeof args.silent === 'boolean') body.silent = args.silent;

          const response = await fetch(
            `${this.baseUrl}/documents/${encodeURIComponent(documentId)}/send`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to send document: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`PandaDoc returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_document': {
          const documentId = args.document_id as string;
          if (!documentId) {
            return { content: [{ type: 'text', text: 'document_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/documents/${encodeURIComponent(documentId)}`,
            { method: 'DELETE', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to delete document: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          // 204 No Content on success
          return { content: [{ type: 'text', text: 'Document deleted successfully' }], isError: false };
        }

        case 'list_templates': {
          const params = new URLSearchParams();
          if (args.q) params.set('q', args.q as string);
          if (args.tag) params.set('tag', args.tag as string);
          if (args.count) params.set('count', String(args.count));
          if (args.page) params.set('page', String(args.page));

          const url = `${this.baseUrl}/templates?${params.toString()}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list templates: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`PandaDoc returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_document_session': {
          const documentId = args.document_id as string;
          const recipientEmail = args.recipient_email as string;
          if (!documentId || !recipientEmail) {
            return { content: [{ type: 'text', text: 'document_id and recipient_email are required' }], isError: true };
          }

          const body: Record<string, unknown> = { recipient: recipientEmail };
          if (args.lifetime) body.lifetime = args.lifetime;

          const response = await fetch(
            `${this.baseUrl}/documents/${encodeURIComponent(documentId)}/session`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create document session: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`PandaDoc returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_document_fields': {
          const documentId = args.document_id as string;
          if (!documentId) {
            return { content: [{ type: 'text', text: 'document_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/documents/${encodeURIComponent(documentId)}/fields`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list document fields: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`PandaDoc returned non-JSON response (HTTP ${response.status})`); }
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
