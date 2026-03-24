/**
 * Deel MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/JonasDNielsen/deel-mcp-server — community-maintained, read-only, 25 tools, requires OAuth (no API-key support). Our adapter serves the Bearer token (API key) use case and adds write operations.

import { ToolDefinition, ToolResult } from './types.js';

// Deel REST API base URL: https://api.letsdeel.com
// API version: v2 path prefix, e.g. /rest/v2/contracts
// Auth: Bearer token. Generate from Deel account → Developer Center → API Tokens.
// Two token types: Personal Token (tied to user, expires on departure) and Organization Token (not user-linked, no expiry, cannot sign contracts).
// OAuth2 also available: requires Authorization header AND x-client-id header.
// All requests must be over HTTPS.

interface DeelConfig {
  apiToken: string;
  /** Override base URL for sandbox testing; defaults to production */
  baseUrl?: string;
}

export class DeelMCPServer {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: DeelConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = (config.baseUrl || 'https://api.letsdeel.com').replace(/\/$/, '');
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_contracts',
        description: 'List all contracts in your Deel account. Returns contract ID, type (employee, contractor, EOR), status, worker name, and compensation details.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of contracts to return (default: 25, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            status: {
              type: 'string',
              description: 'Filter by contract status, e.g. active, pending, ended (optional)',
            },
          },
        },
      },
      {
        name: 'get_contract',
        description: 'Retrieve full details for a specific Deel contract by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: {
              type: 'string',
              description: 'The Deel contract ID',
            },
          },
          required: ['contract_id'],
        },
      },
      {
        name: 'list_people',
        description: 'List all people (workers, contractors, and EOR employees) in your Deel organization.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of people to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            search: {
              type: 'string',
              description: 'Search by name or email (optional)',
            },
          },
        },
      },
      {
        name: 'list_invoices',
        description: 'List invoices in your Deel account. Returns invoice ID, amount, currency, status, and associated contract.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of invoices to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            contract_id: {
              type: 'string',
              description: 'Filter invoices by contract ID (optional)',
            },
          },
        },
      },
      {
        name: 'get_worker_payslips',
        description: 'Retrieve payslips for a Global Payroll (GP) worker.',
        inputSchema: {
          type: 'object',
          properties: {
            worker_id: {
              type: 'string',
              description: 'The Deel GP worker ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of payslips to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
          required: ['worker_id'],
        },
      },
      {
        name: 'list_contract_adjustments',
        description: 'List all adjustments (bonuses, commissions, expenses) for a specific Deel contract.',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: {
              type: 'string',
              description: 'The Deel contract ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of adjustments to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
          required: ['contract_id'],
        },
      },
      {
        name: 'list_deel_invoices',
        description: 'List Deel fee invoices (platform charges billed to your organization by Deel).',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of Deel fee invoices to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            contract_id: {
              type: 'string',
              description: 'Filter by contract ID (optional)',
            },
          },
        },
      },
      {
        name: 'get_worker_banks',
        description: 'Retrieve bank account information for a specific Global Payroll worker.',
        inputSchema: {
          type: 'object',
          properties: {
            worker_id: {
              type: 'string',
              description: 'The Deel GP worker ID',
            },
          },
          required: ['worker_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_contracts': {
          const limit = (args.limit as number) || 25;
          const offset = (args.offset as number) || 0;
          let url = `${this.baseUrl}/rest/v2/contracts?limit=${limit}&offset=${offset}`;
          if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list contracts: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Deel returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_contract': {
          const contractId = args.contract_id as string;

          if (!contractId) {
            return {
              content: [{ type: 'text', text: 'contract_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/rest/v2/contracts/${encodeURIComponent(contractId)}`, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get contract: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Deel returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_people': {
          const limit = (args.limit as number) || 25;
          const offset = (args.offset as number) || 0;
          let url = `${this.baseUrl}/rest/v2/people?limit=${limit}&offset=${offset}`;
          if (args.search) url += `&search=${encodeURIComponent(args.search as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list people: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Deel returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_invoices': {
          const limit = (args.limit as number) || 25;
          const offset = (args.offset as number) || 0;
          let url = `${this.baseUrl}/rest/v2/invoices?limit=${limit}&offset=${offset}`;
          if (args.contract_id) url += `&contract_id=${encodeURIComponent(args.contract_id as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list invoices: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Deel returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_worker_payslips': {
          const workerId = args.worker_id as string;

          if (!workerId) {
            return {
              content: [{ type: 'text', text: 'worker_id is required' }],
              isError: true,
            };
          }

          const limit = (args.limit as number) || 25;
          const offset = (args.offset as number) || 0;
          const url = `${this.baseUrl}/rest/v2/gp/workers/${encodeURIComponent(workerId)}/payslips?limit=${limit}&offset=${offset}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get worker payslips: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Deel returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_contract_adjustments': {
          const contractId = args.contract_id as string;

          if (!contractId) {
            return {
              content: [{ type: 'text', text: 'contract_id is required' }],
              isError: true,
            };
          }

          const limit = (args.limit as number) || 25;
          const offset = (args.offset as number) || 0;
          const url = `${this.baseUrl}/rest/v2/contracts/${encodeURIComponent(contractId)}/adjustments?limit=${limit}&offset=${offset}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list contract adjustments: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Deel returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_deel_invoices': {
          const limit = (args.limit as number) || 25;
          const offset = (args.offset as number) || 0;
          let url = `${this.baseUrl}/rest/v2/invoices/deel?limit=${limit}&offset=${offset}`;
          if (args.contract_id) url += `&contract_id=${encodeURIComponent(args.contract_id as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list Deel fee invoices: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Deel returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_worker_banks': {
          const workerId = args.worker_id as string;

          if (!workerId) {
            return {
              content: [{ type: 'text', text: 'worker_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/rest/v2/gp/workers/${encodeURIComponent(workerId)}/banks`, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get worker banks: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Deel returned non-JSON response (HTTP ${response.status})`); }
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
