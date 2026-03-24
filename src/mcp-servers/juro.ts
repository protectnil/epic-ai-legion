/**
 * Juro MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found

import { ToolDefinition, ToolResult } from './types.js';

interface JuroConfig {
  apiKey: string;
  baseUrl?: string;
}

export class JuroMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: JuroConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.juro.com/v3';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_contracts',
        description: 'List contracts in Juro with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by contract status (e.g. draft, review, signing, executed, terminated)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of contracts to return',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination',
            },
          },
        },
      },
      {
        name: 'get_contract',
        description: 'Retrieve a specific contract by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: {
              type: 'string',
              description: 'The Juro contract ID',
            },
          },
          required: ['contract_id'],
        },
      },
      {
        name: 'create_contract',
        description: 'Create a new contract from a template with field values',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: {
              type: 'string',
              description: 'The template ID to create the contract from',
            },
            answers: {
              type: 'object',
              description: 'Key-value map of template field answers to populate the contract',
            },
          },
          required: ['templateId'],
        },
      },
      {
        name: 'upload_contract',
        description: 'Upload a PDF document to create a contract record from an existing file',
        inputSchema: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: 'The filename of the PDF being uploaded',
            },
            base64_content: {
              type: 'string',
              description: 'Base64-encoded content of the PDF file',
            },
            title: {
              type: 'string',
              description: 'Title to assign to the uploaded contract',
            },
          },
          required: ['filename', 'base64_content'],
        },
      },
      {
        name: 'update_contract',
        description: 'Update fields of an existing contract',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: {
              type: 'string',
              description: 'The Juro contract ID to update',
            },
            answers: {
              type: 'object',
              description: 'Key-value map of field values to update on the contract',
            },
          },
          required: ['contract_id', 'answers'],
        },
      },
      {
        name: 'send_for_signing',
        description: 'Send a contract to a counterparty for signing',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: {
              type: 'string',
              description: 'The Juro contract ID',
            },
            signing_side_uid: {
              type: 'string',
              description: 'The UID of the signing side/party to send the request to',
            },
          },
          required: ['contract_id', 'signing_side_uid'],
        },
      },
      {
        name: 'list_templates',
        description: 'List available contract templates in the Juro workspace',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of templates to return',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_contracts': {
          const params = new URLSearchParams();
          if (args.status) params.set('status', args.status as string);
          if (args.limit) params.set('limit', String(args.limit));
          if (args.offset) params.set('offset', String(args.offset));
          const qs = params.toString();
          const url = `${this.baseUrl}/contracts${qs ? `?${qs}` : ''}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list contracts: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Juro returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_contract': {
          const contractId = args.contract_id as string;
          if (!contractId) {
            return { content: [{ type: 'text', text: 'contract_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/contracts/${encodeURIComponent(contractId)}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get contract: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Juro returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_contract': {
          const templateId = args.templateId as string;
          if (!templateId) {
            return { content: [{ type: 'text', text: 'templateId is required' }], isError: true };
          }

          const body: Record<string, unknown> = { templateId };
          if (args.answers) body.answers = args.answers;

          const response = await fetch(`${this.baseUrl}/contracts`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create contract: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Juro returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'upload_contract': {
          const filename = args.filename as string;
          const base64Content = args.base64_content as string;
          if (!filename || !base64Content) {
            return {
              content: [{ type: 'text', text: 'filename and base64_content are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { filename, content: base64Content };
          if (args.title) body.title = args.title;

          const response = await fetch(`${this.baseUrl}/contracts/upload`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to upload contract: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Juro returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_contract': {
          const contractId = args.contract_id as string;
          const answers = args.answers as Record<string, unknown>;
          if (!contractId || !answers) {
            return {
              content: [{ type: 'text', text: 'contract_id and answers are required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/contracts/${encodeURIComponent(contractId)}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ answers }),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to update contract: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Juro returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'send_for_signing': {
          const contractId = args.contract_id as string;
          const signingPartyUid = args.signing_side_uid as string;
          if (!contractId || !signingPartyUid) {
            return {
              content: [{ type: 'text', text: 'contract_id and signing_side_uid are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/contracts/${encodeURIComponent(contractId)}/signing-request/${encodeURIComponent(signingPartyUid)}`,
            { method: 'POST', headers, body: JSON.stringify({}) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to send for signing: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Juro returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_templates': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.offset) params.set('offset', String(args.offset));
          const qs = params.toString();
          const url = `${this.baseUrl}/templates${qs ? `?${qs}` : ''}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list templates: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Juro returned non-JSON response (HTTP ${response.status})`); }
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
