/**
 * DocuSign MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — third-party only (luthersystems/mcp-server-docusign, thisdot/docusign-navigator-mcp); no official docusign/docusign-mcp-server exists

import { ToolDefinition, ToolResult } from './types.js';

// DocuSign base path is account-specific. Obtain it via GET https://account.docusign.com/oauth/userinfo
// after authentication. The basePath format is e.g. "na1.docusign.net" or "eu1.docusign.net".
// Full base URL: https://{basePath}/restapi/v2.1
// Auth: Bearer token obtained via JWT Grant (server-to-server) or Authorization Code flow.

interface DocuSignConfig {
  accessToken: string;
  basePath: string; // e.g. "na1.docusign.net" — obtain from /oauth/userinfo
  accountId: string;
}

export class DocuSignMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly accountId: string;

  constructor(config: DocuSignConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = `https://${config.basePath}/restapi/v2.1`;
    this.accountId = config.accountId;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_envelopes',
        description: 'List envelopes for the account with optional filtering by status, date range, or search text',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: {
              type: 'string',
              description: 'Only return envelopes on or after this date/time (ISO 8601, e.g. 2025-01-01T00:00:00Z)',
            },
            status: {
              type: 'string',
              description: 'Filter by envelope status: created, sent, delivered, signed, completed, declined, voided',
            },
            count: {
              type: 'number',
              description: 'Maximum number of envelopes to return (default: 100)',
            },
            start_position: {
              type: 'number',
              description: 'Zero-based index for pagination (default: 0)',
            },
            search_text: {
              type: 'string',
              description: 'Free-text search across envelope subject and sender name',
            },
          },
        },
      },
      {
        name: 'get_envelope',
        description: 'Get details for a specific envelope by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            envelope_id: {
              type: 'string',
              description: 'The DocuSign envelope UUID',
            },
          },
          required: ['envelope_id'],
        },
      },
      {
        name: 'create_envelope',
        description: 'Create and optionally send an envelope (document package for signing). Set status to "sent" to send immediately or "created" to save as draft.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Set to "sent" to send immediately, or "created" to save as draft',
            },
            email_subject: {
              type: 'string',
              description: 'Subject line for the signing request email',
            },
            email_blurb: {
              type: 'string',
              description: 'Body text for the signing request email',
            },
            documents: {
              type: 'array',
              description: 'Array of document objects. Each must have documentId, name, and documentBase64 (base64-encoded file content).',
              items: { type: 'object' },
            },
            recipients: {
              type: 'object',
              description: 'Recipients object with signers, carbon_copies, etc. Each signer needs email, name, recipientId, routingOrder.',
            },
          },
          required: ['status', 'email_subject', 'documents', 'recipients'],
        },
      },
      {
        name: 'void_envelope',
        description: 'Void (cancel) an envelope that has been sent but not yet completed',
        inputSchema: {
          type: 'object',
          properties: {
            envelope_id: {
              type: 'string',
              description: 'The DocuSign envelope UUID to void',
            },
            voided_reason: {
              type: 'string',
              description: 'Reason for voiding the envelope (required by DocuSign)',
            },
          },
          required: ['envelope_id', 'voided_reason'],
        },
      },
      {
        name: 'list_envelope_recipients',
        description: 'List all recipients (signers, CCs, etc.) for an envelope',
        inputSchema: {
          type: 'object',
          properties: {
            envelope_id: {
              type: 'string',
              description: 'The DocuSign envelope UUID',
            },
          },
          required: ['envelope_id'],
        },
      },
      {
        name: 'get_envelope_documents',
        description: 'List all documents attached to an envelope',
        inputSchema: {
          type: 'object',
          properties: {
            envelope_id: {
              type: 'string',
              description: 'The DocuSign envelope UUID',
            },
          },
          required: ['envelope_id'],
        },
      },
      {
        name: 'send_envelope_reminder',
        description: 'Resend reminder notifications to pending recipients of an envelope',
        inputSchema: {
          type: 'object',
          properties: {
            envelope_id: {
              type: 'string',
              description: 'The DocuSign envelope UUID',
            },
          },
          required: ['envelope_id'],
        },
      },
      {
        name: 'list_templates',
        description: 'List envelope templates available in the account',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Maximum number of templates to return (default: 100)',
            },
            start_position: {
              type: 'number',
              description: 'Zero-based index for pagination',
            },
            search_text: {
              type: 'string',
              description: 'Filter templates by name',
            },
          },
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
        case 'list_envelopes': {
          const params = new URLSearchParams();
          if (args.from_date) params.set('from_date', args.from_date as string);
          if (args.status) params.set('status', args.status as string);
          if (args.count) params.set('count', String(args.count));
          if (args.start_position !== undefined) params.set('start_position', String(args.start_position));
          if (args.search_text) params.set('search_text', args.search_text as string);

          const url = `${this.baseUrl}/accounts/${encodeURIComponent(this.accountId)}/envelopes?${params.toString()}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list envelopes: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`DocuSign returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_envelope': {
          const envelopeId = args.envelope_id as string;
          if (!envelopeId) {
            return { content: [{ type: 'text', text: 'envelope_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/accounts/${encodeURIComponent(this.accountId)}/envelopes/${encodeURIComponent(envelopeId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get envelope: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`DocuSign returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_envelope': {
          if (!args.status || !args.email_subject || !args.documents || !args.recipients) {
            return {
              content: [{ type: 'text', text: 'status, email_subject, documents, and recipients are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            status: args.status,
            emailSubject: args.email_subject,
            documents: args.documents,
            recipients: args.recipients,
          };
          if (args.email_blurb) body.emailBlurb = args.email_blurb;

          const response = await fetch(
            `${this.baseUrl}/accounts/${encodeURIComponent(this.accountId)}/envelopes`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create envelope: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`DocuSign returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'void_envelope': {
          const envelopeId = args.envelope_id as string;
          const voidedReason = args.voided_reason as string;

          if (!envelopeId || !voidedReason) {
            return { content: [{ type: 'text', text: 'envelope_id and voided_reason are required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/accounts/${encodeURIComponent(this.accountId)}/envelopes/${encodeURIComponent(envelopeId)}`,
            {
              method: 'PUT',
              headers,
              body: JSON.stringify({ status: 'voided', voidedReason }),
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to void envelope: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`DocuSign returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_envelope_recipients': {
          const envelopeId = args.envelope_id as string;
          if (!envelopeId) {
            return { content: [{ type: 'text', text: 'envelope_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/accounts/${encodeURIComponent(this.accountId)}/envelopes/${encodeURIComponent(envelopeId)}/recipients`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list envelope recipients: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`DocuSign returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_envelope_documents': {
          const envelopeId = args.envelope_id as string;
          if (!envelopeId) {
            return { content: [{ type: 'text', text: 'envelope_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/accounts/${encodeURIComponent(this.accountId)}/envelopes/${encodeURIComponent(envelopeId)}/documents`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get envelope documents: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`DocuSign returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'send_envelope_reminder': {
          const envelopeId = args.envelope_id as string;
          if (!envelopeId) {
            return { content: [{ type: 'text', text: 'envelope_id is required' }], isError: true };
          }

          // Resend is triggered by PUT /envelopes/{envelopeId}?resend_envelope=true
          const response = await fetch(
            `${this.baseUrl}/accounts/${encodeURIComponent(this.accountId)}/envelopes/${encodeURIComponent(envelopeId)}?resend_envelope=true`,
            { method: 'PUT', headers, body: JSON.stringify({}) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to send envelope reminder: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`DocuSign returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_templates': {
          const params = new URLSearchParams();
          if (args.count) params.set('count', String(args.count));
          if (args.start_position !== undefined) params.set('start_position', String(args.start_position));
          if (args.search_text) params.set('search_text', args.search_text as string);

          const url = `${this.baseUrl}/accounts/${encodeURIComponent(this.accountId)}/templates?${params.toString()}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list templates: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`DocuSign returned non-JSON response (HTTP ${response.status})`); }
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
