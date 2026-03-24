/**
 * Avalara MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/CDataSoftware/avalara-avatax-mcp-server-by-cdata — CData read-only JDBC bridge, not Avalara-official, requires CData license. Our adapter targets the full AvaTax REST v2 surface directly.

import { ToolDefinition, ToolResult } from './types.js';

// Base URL verified: https://developer.avalara.com/api-reference/avatax/rest/v2/
//   Production: https://rest.avatax.com
//   Sandbox:    https://sandbox-rest.avatax.com
// Auth: HTTP Basic auth — accountId (account number as string) : licenseKey
//   Encoded as Authorization: Basic base64(accountId:licenseKey)
// Key endpoints:
//   GET    /api/v2/utilities/ping                                  — Test connectivity
//   POST   /api/v2/transactions/create                             — Create transaction (SalesOrder = estimate, no commit)
//   POST   /api/v2/transactions/createoradjust                     — Create or adjust + commit transaction
//   POST   /api/v2/companies/{companyCode}/transactions/{code}/void — Void a transaction
//   GET    /api/v2/companies/{companyCode}/transactions            — List transactions
//   GET    /api/v2/addresses/resolve                               — Validate/standardize address (GET with query params)
//   GET    /api/v2/companies                                       — List companies in account
//   GET    /api/v2/companies/{companyCode}/nexus                   — List nexus for company
//   GET    /api/v2/definitions/taxcodes                            — List tax code definitions

interface AvalaraConfig {
  accountId: string;
  licenseKey: string;
  baseUrl?: string;
}

export class AvalaraMCPServer {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: AvalaraConfig) {
    this.authHeader = 'Basic ' + Buffer.from(`${config.accountId}:${config.licenseKey}`).toString('base64');
    // Default to production; pass baseUrl = 'https://sandbox-rest.avatax.com' for sandbox testing
    this.baseUrl = config.baseUrl || 'https://rest.avatax.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'ping',
        description: 'Test connectivity to the Avalara AvaTax API and verify credentials are valid',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'calculate_tax',
        description: 'Create a SalesOrder transaction to estimate tax without committing it to the ledger. Use for real-time tax calculation at checkout.',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: {
              type: 'string',
              description: 'Your Avalara company code (default: DEFAULT)',
            },
            customer_code: {
              type: 'string',
              description: 'A unique identifier for the customer',
            },
            date: {
              type: 'string',
              description: 'Transaction date in YYYY-MM-DD format (default: today)',
            },
            lines: {
              type: 'array',
              description: 'Array of line items. Each item: { number, quantity, amount, itemCode, description, taxCode }',
            },
            ship_from: {
              type: 'object',
              description: 'Origin address: { line1, city, region, postalCode, country }',
            },
            ship_to: {
              type: 'object',
              description: 'Destination address: { line1, city, region, postalCode, country }',
            },
            currency_code: {
              type: 'string',
              description: 'ISO 4217 currency code (default: USD)',
            },
          },
          required: ['customer_code', 'lines', 'ship_from', 'ship_to'],
        },
      },
      {
        name: 'commit_transaction',
        description: 'Create and commit a SalesInvoice transaction to the Avalara ledger for tax reporting and remittance',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: {
              type: 'string',
              description: 'Your Avalara company code (default: DEFAULT)',
            },
            transaction_code: {
              type: 'string',
              description: 'A unique code for this transaction (used for later adjustments or voids)',
            },
            customer_code: {
              type: 'string',
              description: 'A unique identifier for the customer',
            },
            date: {
              type: 'string',
              description: 'Transaction date in YYYY-MM-DD format',
            },
            lines: {
              type: 'array',
              description: 'Array of line items. Each item: { number, quantity, amount, itemCode, description, taxCode }',
            },
            ship_from: {
              type: 'object',
              description: 'Origin address: { line1, city, region, postalCode, country }',
            },
            ship_to: {
              type: 'object',
              description: 'Destination address: { line1, city, region, postalCode, country }',
            },
            currency_code: {
              type: 'string',
              description: 'ISO 4217 currency code (default: USD)',
            },
          },
          required: ['transaction_code', 'customer_code', 'lines', 'ship_from', 'ship_to'],
        },
      },
      {
        name: 'void_transaction',
        description: 'Void a committed transaction by company code and transaction code',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: {
              type: 'string',
              description: 'Your Avalara company code',
            },
            transaction_code: {
              type: 'string',
              description: 'The transaction code to void',
            },
            code: {
              type: 'string',
              description: 'Void reason code: DocVoided, DocDeleted, DocReversed, AdjustmentCancelled (default: DocVoided)',
            },
          },
          required: ['company_code', 'transaction_code'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List committed transactions for a company with optional date range filter',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: {
              type: 'string',
              description: 'Your Avalara company code',
            },
            start_date: {
              type: 'string',
              description: 'Filter transactions on or after this date (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Filter transactions on or before this date (YYYY-MM-DD)',
            },
            filter: {
              type: 'string',
              description: 'OData-style filter expression (e.g. status eq Committed)',
            },
            top: {
              type: 'number',
              description: 'Maximum number of records to return (default: 20)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination',
            },
          },
          required: ['company_code'],
        },
      },
      {
        name: 'resolve_address',
        description: 'Validate and standardize a postal address using Avalara address validation',
        inputSchema: {
          type: 'object',
          properties: {
            line1: {
              type: 'string',
              description: 'Street address line 1',
            },
            line2: {
              type: 'string',
              description: 'Street address line 2 (optional)',
            },
            city: {
              type: 'string',
              description: 'City name',
            },
            region: {
              type: 'string',
              description: 'State/province/region code (e.g. CA, TX)',
            },
            postal_code: {
              type: 'string',
              description: 'Postal/ZIP code',
            },
            country: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code (e.g. US, CA)',
            },
            text_case: {
              type: 'string',
              description: 'Output casing: Upper, Mixed (default: Upper)',
            },
          },
          required: ['line1', 'city', 'region', 'postal_code', 'country'],
        },
      },
      {
        name: 'list_companies',
        description: 'List all companies configured in the Avalara account',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData-style filter expression',
            },
            top: {
              type: 'number',
              description: 'Maximum number of records to return (default: 20)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination',
            },
          },
        },
      },
      {
        name: 'list_nexus',
        description: 'List nexus registrations for a company — states/jurisdictions where the company has tax obligations',
        inputSchema: {
          type: 'object',
          properties: {
            company_code: {
              type: 'string',
              description: 'Your Avalara company code',
            },
            filter: {
              type: 'string',
              description: 'OData-style filter expression (e.g. country eq US)',
            },
          },
          required: ['company_code'],
        },
      },
      {
        name: 'list_tax_codes',
        description: 'Search the Avalara tax code definitions library',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData-style filter expression (e.g. taxCode eq P0000000)',
            },
            top: {
              type: 'number',
              description: 'Maximum number of records to return (default: 20)',
            },
          },
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
        case 'ping': {
          const response = await fetch(`${this.baseUrl}/api/v2/utilities/ping`, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Ping failed: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Avalara returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'calculate_tax': {
          const customerCode = args.customer_code as string;
          const lines = args.lines as unknown[];
          const shipFrom = args.ship_from as Record<string, unknown>;
          const shipTo = args.ship_to as Record<string, unknown>;

          if (!customerCode || !lines || !shipFrom || !shipTo) {
            return { content: [{ type: 'text', text: 'customer_code, lines, ship_from, and ship_to are required' }], isError: true };
          }

          const today = new Date().toISOString().slice(0, 10);
          const body: Record<string, unknown> = {
            type: 'SalesOrder',
            companyCode: (args.company_code as string) || 'DEFAULT',
            date: (args.date as string) || today,
            customerCode,
            currencyCode: (args.currency_code as string) || 'USD',
            addresses: { shipFrom, shipTo },
            lines,
          };

          const response = await fetch(`${this.baseUrl}/api/v2/transactions/create`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to calculate tax: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Avalara returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'commit_transaction': {
          const transactionCode = args.transaction_code as string;
          const customerCode = args.customer_code as string;
          const lines = args.lines as unknown[];
          const shipFrom = args.ship_from as Record<string, unknown>;
          const shipTo = args.ship_to as Record<string, unknown>;

          if (!transactionCode || !customerCode || !lines || !shipFrom || !shipTo) {
            return { content: [{ type: 'text', text: 'transaction_code, customer_code, lines, ship_from, and ship_to are required' }], isError: true };
          }

          const today = new Date().toISOString().slice(0, 10);
          const body: Record<string, unknown> = {
            type: 'SalesInvoice',
            companyCode: (args.company_code as string) || 'DEFAULT',
            code: transactionCode,
            date: (args.date as string) || today,
            customerCode,
            currencyCode: (args.currency_code as string) || 'USD',
            commit: true,
            addresses: { shipFrom, shipTo },
            lines,
          };

          const response = await fetch(`${this.baseUrl}/api/v2/transactions/createoradjust`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to commit transaction: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Avalara returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'void_transaction': {
          const companyCode = args.company_code as string;
          const transactionCode = args.transaction_code as string;

          if (!companyCode || !transactionCode) {
            return { content: [{ type: 'text', text: 'company_code and transaction_code are required' }], isError: true };
          }

          const voidCode = (args.code as string) || 'DocVoided';
          const url = `${this.baseUrl}/api/v2/companies/${encodeURIComponent(companyCode)}/transactions/${encodeURIComponent(transactionCode)}/void`;

          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ code: voidCode }),
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to void transaction: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Avalara returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_transactions': {
          const companyCode = args.company_code as string;
          if (!companyCode) {
            return { content: [{ type: 'text', text: 'company_code is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.start_date || args.end_date) {
            const startFilter = args.start_date ? `date ge ${args.start_date as string}` : '';
            const endFilter = args.end_date ? `date le ${args.end_date as string}` : '';
            const dateFilter = [startFilter, endFilter].filter(Boolean).join(' and ');
            params.set('$filter', dateFilter);
          } else if (args.filter) {
            params.set('$filter', args.filter as string);
          }
          if (args.top) params.set('$top', String(args.top));
          if (args.skip) params.set('$skip', String(args.skip));

          const qs = params.toString();
          const url = `${this.baseUrl}/api/v2/companies/${encodeURIComponent(companyCode)}/transactions${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list transactions: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Avalara returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'resolve_address': {
          const line1 = args.line1 as string;
          const city = args.city as string;
          const region = args.region as string;
          const postalCode = args.postal_code as string;
          const country = args.country as string;

          if (!line1 || !city || !region || !postalCode || !country) {
            return { content: [{ type: 'text', text: 'line1, city, region, postal_code, and country are required' }], isError: true };
          }

          const params = new URLSearchParams({ line1, city, region, postalCode, country });
          if (args.line2) params.set('line2', args.line2 as string);
          if (args.text_case) params.set('textCase', args.text_case as string);

          const url = `${this.baseUrl}/api/v2/addresses/resolve?${params.toString()}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to resolve address: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Avalara returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_companies': {
          const params = new URLSearchParams();
          if (args.filter) params.set('$filter', args.filter as string);
          if (args.top) params.set('$top', String(args.top));
          if (args.skip) params.set('$skip', String(args.skip));

          const qs = params.toString();
          const url = `${this.baseUrl}/api/v2/companies${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list companies: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Avalara returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_nexus': {
          const companyCode = args.company_code as string;
          if (!companyCode) {
            return { content: [{ type: 'text', text: 'company_code is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.filter) params.set('$filter', args.filter as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/api/v2/companies/${encodeURIComponent(companyCode)}/nexus${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list nexus: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Avalara returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_tax_codes': {
          const params = new URLSearchParams();
          if (args.filter) params.set('$filter', args.filter as string);
          if (args.top) params.set('$top', String(args.top));

          const qs = params.toString();
          const url = `${this.baseUrl}/api/v2/definitions/taxcodes${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list tax codes: ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Avalara returned non-JSON response (HTTP ${response.status})`); }
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
