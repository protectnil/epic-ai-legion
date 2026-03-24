/**
 * Carta MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found

// Auth: OAuth2 Authorization Code Flow.
// Token endpoint:  POST https://login.app.carta.com/o/access_token/
// Authorize URL:   https://login.app.carta.com/o/authorize/
// Production API:  https://api.carta.com
// Mock/test API:   https://mock-api.carta.com
// Access tokens expire after 3600 s; refresh tokens expire after 14 days.
// Source: https://docs.carta.com/carta/docs/authorization-code-flow

import { ToolDefinition, ToolResult } from './types.js';

interface CartaConfig {
  accessToken: string;
  baseUrl?: string;
}

export class CartaMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: CartaConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.carta.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_stakeholders',
        description: 'List all stakeholders on the cap table for a company',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Carta company ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of stakeholders to return',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_stakeholder',
        description: 'Retrieve details for a single stakeholder by ID',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Carta company ID',
            },
            stakeholder_id: {
              type: 'string',
              description: 'Carta stakeholder ID',
            },
          },
          required: ['company_id', 'stakeholder_id'],
        },
      },
      {
        name: 'list_securities',
        description: 'List all securities (stock options, RSUs, warrants, convertible notes, SAFEs) issued by a company',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Carta company ID',
            },
            security_type: {
              type: 'string',
              description: 'Filter by type: stock_option, rsu, warrant, convertible_note, safe',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of securities to return',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_cap_table',
        description: 'Retrieve the cap table summary for a company including share classes and ownership percentages',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Carta company ID',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'list_holdings',
        description: 'List portfolio holdings for an investor fund across their Carta-managed investments',
        inputSchema: {
          type: 'object',
          properties: {
            fund_id: {
              type: 'string',
              description: 'Fund or portfolio entity ID for the investor',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of holdings to return',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
          },
          required: ['fund_id'],
        },
      },
      {
        name: 'list_equity_plans',
        description: 'List equity incentive plans (EIPs) for a company',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Carta company ID',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'list_vesting_schedules',
        description: 'List vesting events for a specific security grant',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Carta company ID',
            },
            security_id: {
              type: 'string',
              description: 'Security (grant) ID to retrieve vesting events for',
            },
          },
          required: ['company_id', 'security_id'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List cap table transactions (issuances, transfers, cancellations, exercises) for a company',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Carta company ID',
            },
            transaction_type: {
              type: 'string',
              description: 'Filter by type: issuance, transfer, cancellation, exercise, repurchase',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of transactions to return',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
          },
          required: ['company_id'],
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
        case 'list_stakeholders': {
          const companyId = args.company_id as string;
          if (!companyId) {
            return { content: [{ type: 'text', text: 'company_id is required' }], isError: true };
          }
          const params = new URLSearchParams();
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          let url = `${this.baseUrl}/companies/${encodeURIComponent(companyId)}/stakeholders`;
          if (params.toString()) url += `?${params.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list stakeholders: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Carta returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_stakeholder': {
          const companyId = args.company_id as string;
          const stakeholderId = args.stakeholder_id as string;
          if (!companyId || !stakeholderId) {
            return { content: [{ type: 'text', text: 'company_id and stakeholder_id are required' }], isError: true };
          }
          const url = `${this.baseUrl}/companies/${encodeURIComponent(companyId)}/stakeholders/${encodeURIComponent(stakeholderId)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get stakeholder: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Carta returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_securities': {
          const companyId = args.company_id as string;
          if (!companyId) {
            return { content: [{ type: 'text', text: 'company_id is required' }], isError: true };
          }
          const params = new URLSearchParams();
          if (args.security_type) params.set('security_type', args.security_type as string);
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          let url = `${this.baseUrl}/companies/${encodeURIComponent(companyId)}/securities`;
          if (params.toString()) url += `?${params.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list securities: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Carta returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_cap_table': {
          const companyId = args.company_id as string;
          if (!companyId) {
            return { content: [{ type: 'text', text: 'company_id is required' }], isError: true };
          }
          const url = `${this.baseUrl}/companies/${encodeURIComponent(companyId)}/cap-table`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get cap table: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Carta returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_holdings': {
          const fundId = args.fund_id as string;
          if (!fundId) {
            return { content: [{ type: 'text', text: 'fund_id is required' }], isError: true };
          }
          const params = new URLSearchParams();
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          let url = `${this.baseUrl}/funds/${encodeURIComponent(fundId)}/holdings`;
          if (params.toString()) url += `?${params.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list holdings: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Carta returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_equity_plans': {
          const companyId = args.company_id as string;
          if (!companyId) {
            return { content: [{ type: 'text', text: 'company_id is required' }], isError: true };
          }
          const url = `${this.baseUrl}/companies/${encodeURIComponent(companyId)}/equity-plans`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list equity plans: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Carta returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_vesting_schedules': {
          const companyId = args.company_id as string;
          const securityId = args.security_id as string;
          if (!companyId || !securityId) {
            return { content: [{ type: 'text', text: 'company_id and security_id are required' }], isError: true };
          }
          const url = `${this.baseUrl}/companies/${encodeURIComponent(companyId)}/securities/${encodeURIComponent(securityId)}/vesting`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list vesting schedules: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Carta returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_transactions': {
          const companyId = args.company_id as string;
          if (!companyId) {
            return { content: [{ type: 'text', text: 'company_id is required' }], isError: true };
          }
          const params = new URLSearchParams();
          if (args.transaction_type) params.set('transaction_type', args.transaction_type as string);
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          let url = `${this.baseUrl}/companies/${encodeURIComponent(companyId)}/transactions`;
          if (params.toString()) url += `?${params.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list transactions: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Carta returned non-JSON response (HTTP ${response.status})`); }
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
