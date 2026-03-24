/**
 * Juro MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Juro MCP server was found on GitHub. A Zapier-based Juro MCP integration exists
// at https://zapier.com/mcp/juro-1 but is not vendor-published and not suitable for air-gapped use.
//
// Base URL: https://api.juro.com/v3
// Auth: x-api-key header (API key from Juro workspace settings)
// Docs: https://api-docs.juro.com/
// Rate limits: Not publicly documented

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
    this.baseUrl = config.baseUrl ?? 'https://api.juro.com/v3';
  }

  static catalog() {
    return {
      name: 'juro',
      displayName: 'Juro',
      version: '1.0.0',
      category: 'misc',
      keywords: ['juro', 'contract', 'legal', 'clm', 'signing', 'template', 'document', 'e-signature', 'counterparty'],
      toolNames: [
        'list_contracts', 'get_contract', 'create_contract', 'update_contract', 'delete_contract',
        'upload_contract', 'send_for_signing', 'void_contract',
        'list_templates', 'get_template',
        'list_contract_events', 'get_signing_status',
      ],
      description: 'Juro contract lifecycle management: create, edit, sign, and track contracts. Manage templates, upload PDFs, and monitor signing workflows.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_contracts',
        description: 'List contracts in the Juro workspace with optional filters for status, counterparty, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by contract status: draft, review, signing, executed, terminated (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of contracts to return (default: 50, max: 200)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            search: {
              type: 'string',
              description: 'Search term to filter contracts by title or counterparty name',
            },
          },
        },
      },
      {
        name: 'get_contract',
        description: 'Retrieve full details of a specific Juro contract including metadata, smartfields, and status',
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
        description: 'Create a new Juro contract from a template with smartfield values populated via answers map',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: {
              type: 'string',
              description: 'The template ID to create the contract from (use list_templates to find IDs)',
            },
            answers: {
              type: 'object',
              description: 'Key-value map of template smartfield answers to populate the contract',
            },
            title: {
              type: 'string',
              description: 'Optional title override for the contract (defaults to template title)',
            },
          },
          required: ['templateId'],
        },
      },
      {
        name: 'update_contract',
        description: 'Update smartfield values on an existing Juro contract using PATCH',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: {
              type: 'string',
              description: 'The Juro contract ID to update',
            },
            answers: {
              type: 'object',
              description: 'Key-value map of smartfield names to new values to update on the contract',
            },
          },
          required: ['contract_id', 'answers'],
        },
      },
      {
        name: 'delete_contract',
        description: 'Delete a Juro contract by ID — only draft contracts can be deleted',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: {
              type: 'string',
              description: 'The Juro contract ID to delete',
            },
          },
          required: ['contract_id'],
        },
      },
      {
        name: 'upload_contract',
        description: 'Upload a PDF or DOCX file to create a Juro contract record from an existing document',
        inputSchema: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: 'The filename of the document being uploaded (e.g. "agreement.pdf")',
            },
            base64_content: {
              type: 'string',
              description: 'Base64-encoded content of the PDF or DOCX file',
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
        name: 'send_for_signing',
        description: 'Send a Juro contract to a counterparty signing party for e-signature',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: {
              type: 'string',
              description: 'The Juro contract ID to send for signing',
            },
            signing_side_uid: {
              type: 'string',
              description: 'The UID of the signing side/party to send the signing request to',
            },
          },
          required: ['contract_id', 'signing_side_uid'],
        },
      },
      {
        name: 'void_contract',
        description: 'Void a Juro contract that is currently in the signing workflow, cancelling pending signatures',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: {
              type: 'string',
              description: 'The Juro contract ID to void',
            },
            reason: {
              type: 'string',
              description: 'Optional reason for voiding the contract',
            },
          },
          required: ['contract_id'],
        },
      },
      {
        name: 'list_templates',
        description: 'List available Juro contract templates in the workspace with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of templates to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            search: {
              type: 'string',
              description: 'Search term to filter templates by name',
            },
          },
        },
      },
      {
        name: 'get_template',
        description: 'Get full details of a specific Juro contract template including smartfield definitions',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: {
              type: 'string',
              description: 'The Juro template ID',
            },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'list_contract_events',
        description: 'List the audit event history for a Juro contract including status changes, views, and edits',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: {
              type: 'string',
              description: 'The Juro contract ID to retrieve event history for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
          },
          required: ['contract_id'],
        },
      },
      {
        name: 'get_signing_status',
        description: 'Get the current signing status of a Juro contract including which parties have signed',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: {
              type: 'string',
              description: 'The Juro contract ID to check signing status for',
            },
          },
          required: ['contract_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_contracts':
          return await this.listContracts(args);
        case 'get_contract':
          return await this.getContract(args);
        case 'create_contract':
          return await this.createContract(args);
        case 'update_contract':
          return await this.updateContract(args);
        case 'delete_contract':
          return await this.deleteContract(args);
        case 'upload_contract':
          return await this.uploadContract(args);
        case 'send_for_signing':
          return await this.sendForSigning(args);
        case 'void_contract':
          return await this.voidContract(args);
        case 'list_templates':
          return await this.listTemplates(args);
        case 'get_template':
          return await this.getTemplate(args);
        case 'list_contract_events':
          return await this.listContractEvents(args);
        case 'get_signing_status':
          return await this.getSigningStatus(args);
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

  private get headers(): Record<string, string> {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async fetchJSON(url: string, options: RequestInit = {}): Promise<{ ok: boolean; status: number; statusText: string; data: unknown }> {
    const response = await fetch(url, { headers: this.headers, ...options });
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { status: response.status, statusText: response.statusText };
    }
    return { ok: response.ok, status: response.status, statusText: response.statusText, data };
  }

  private async listContracts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.set('status', args.status as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    if (args.search) params.set('search', args.search as string);
    const qs = params.toString();

    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrl}/contracts${qs ? `?${qs}` : ''}`
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getContract(args: Record<string, unknown>): Promise<ToolResult> {
    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrl}/contracts/${encodeURIComponent(args.contract_id as string)}`
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createContract(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { templateId: args.templateId };
    if (args.answers !== undefined) body.answers = args.answers;
    if (args.title !== undefined) body.title = args.title;

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrl}/contracts`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateContract(args: Record<string, unknown>): Promise<ToolResult> {
    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrl}/contracts/${encodeURIComponent(args.contract_id as string)}`,
      { method: 'PATCH', body: JSON.stringify({ answers: args.answers }) }
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteContract(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/contracts/${encodeURIComponent(args.contract_id as string)}`,
      { method: 'DELETE', headers: this.headers }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, contract_id: args.contract_id }) }], isError: false };
  }

  private async uploadContract(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      filename: args.filename,
      content: args.base64_content,
    };
    if (args.title !== undefined) body.title = args.title;

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrl}/contracts/upload`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async sendForSigning(args: Record<string, unknown>): Promise<ToolResult> {
    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrl}/contracts/${encodeURIComponent(args.contract_id as string)}/signing-request/${encodeURIComponent(args.signing_side_uid as string)}`,
      { method: 'POST', body: JSON.stringify({}) }
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async voidContract(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.reason !== undefined) body.reason = args.reason;

    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrl}/contracts/${encodeURIComponent(args.contract_id as string)}/void`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    if (args.search) params.set('search', args.search as string);
    const qs = params.toString();

    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrl}/templates${qs ? `?${qs}` : ''}`
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrl}/templates/${encodeURIComponent(args.template_id as string)}`
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listContractEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    const qs = params.toString();

    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrl}/contracts/${encodeURIComponent(args.contract_id as string)}/events${qs ? `?${qs}` : ''}`
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSigningStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrl}/contracts/${encodeURIComponent(args.contract_id as string)}/signing-status`
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
