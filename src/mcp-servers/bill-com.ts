/**
 * Bill.com MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no official Bill.com MCP server exists on GitHub as of March 2026.

import { ToolDefinition, ToolResult } from './types.js';

interface BillComConfig {
  userName: string;
  password: string;
  organizationId: string;
  devKey: string;
  /**
   * Production: https://gateway.bill.com/connect/v3
   * Sandbox:    https://gateway.stage.bill.com/connect/v3
   */
  baseUrl?: string;
}

export class BillComMCPServer {
  private readonly userName: string;
  private readonly password: string;
  private readonly organizationId: string;
  private readonly devKey: string;
  private readonly baseUrl: string;
  private sessionId: string | null = null;

  constructor(config: BillComConfig) {
    this.userName = config.userName;
    this.password = config.password;
    this.organizationId = config.organizationId;
    this.devKey = config.devKey;
    this.baseUrl = config.baseUrl || 'https://gateway.stage.bill.com/connect/v3';
  }

  /**
   * Authenticate with Bill.com and obtain a sessionId.
   * The sessionId expires after 35 minutes of inactivity.
   * This adapter calls login automatically before each tool invocation.
   */
  private async login(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: this.userName,
        password: this.password,
        organizationId: this.organizationId,
        devKey: this.devKey,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Bill.com login failed (HTTP ${response.status}): ${errText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Bill.com login returned non-JSON response (HTTP ${response.status})`); }

    const sessionData = data as Record<string, unknown>;
    if (!sessionData.sessionId) {
      throw new Error(`Bill.com login succeeded but no sessionId in response: ${JSON.stringify(data)}`);
    }
    this.sessionId = sessionData.sessionId as string;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.sessionId) {
      await this.login();
    }
    return {
      'Content-Type': 'application/json',
      devKey: this.devKey,
      sessionId: this.sessionId as string,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_vendors',
        description: 'List vendors in the Bill.com account.',
        inputSchema: {
          type: 'object',
          properties: {
            max: {
              type: 'number',
              description: 'Maximum number of vendors to return (default 100)',
            },
            start: {
              type: 'number',
              description: 'Starting index for pagination (0-based)',
            },
            filter: {
              type: 'object',
              description: 'Optional filter criteria as a key-value object (e.g. { isActive: "1" })',
            },
          },
        },
      },
      {
        name: 'get_vendor',
        description: 'Retrieve a specific vendor by their ID.',
        inputSchema: {
          type: 'object',
          properties: {
            vendorId: {
              type: 'string',
              description: 'The Bill.com vendor ID',
            },
          },
          required: ['vendorId'],
        },
      },
      {
        name: 'create_vendor',
        description: 'Create a new vendor in Bill.com.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Vendor name',
            },
            email: {
              type: 'string',
              description: 'Vendor email address',
            },
            address1: {
              type: 'string',
              description: 'Vendor street address line 1',
            },
            address2: {
              type: 'string',
              description: 'Vendor street address line 2',
            },
            addressCity: {
              type: 'string',
              description: 'Vendor city',
            },
            addressState: {
              type: 'string',
              description: 'Vendor state (2-letter code)',
            },
            addressZip: {
              type: 'string',
              description: 'Vendor ZIP/postal code',
            },
            phone: {
              type: 'string',
              description: 'Vendor phone number',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_bills',
        description: 'List bills (accounts payable) in the Bill.com account.',
        inputSchema: {
          type: 'object',
          properties: {
            max: {
              type: 'number',
              description: 'Maximum number of bills to return (default 100)',
            },
            start: {
              type: 'number',
              description: 'Starting index for pagination (0-based)',
            },
            filter: {
              type: 'object',
              description: 'Optional filter criteria as a key-value object (e.g. { paymentStatus: "1" })',
            },
          },
        },
      },
      {
        name: 'get_bill',
        description: 'Retrieve a specific bill by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            billId: {
              type: 'string',
              description: 'The Bill.com bill ID',
            },
          },
          required: ['billId'],
        },
      },
      {
        name: 'create_bill',
        description: 'Create a new bill (accounts payable entry) in Bill.com.',
        inputSchema: {
          type: 'object',
          properties: {
            vendorId: {
              type: 'string',
              description: 'ID of the vendor this bill is from',
            },
            invoiceNumber: {
              type: 'string',
              description: 'Vendor invoice number',
            },
            invoiceDate: {
              type: 'string',
              description: 'Invoice date in YYYY-MM-DD format',
            },
            dueDate: {
              type: 'string',
              description: 'Payment due date in YYYY-MM-DD format',
            },
            amount: {
              type: 'number',
              description: 'Total bill amount in dollars',
            },
            description: {
              type: 'string',
              description: 'Description or memo for the bill',
            },
            billLineItems: {
              type: 'array',
              description: 'Array of line item objects, each with amount, chartOfAccountId, and description',
            },
          },
          required: ['vendorId', 'invoiceDate', 'dueDate', 'amount'],
        },
      },
      {
        name: 'pay_bill',
        description: 'Pay one or more bills. Creates a payment for the specified bills.',
        inputSchema: {
          type: 'object',
          properties: {
            billId: {
              type: 'string',
              description: 'ID of the bill to pay',
            },
            amount: {
              type: 'number',
              description: 'Amount to pay (can be partial)',
            },
            chartOfAccountId: {
              type: 'string',
              description: 'Chart of account ID for the payment (your bank account in Bill.com)',
            },
            processDate: {
              type: 'string',
              description: 'Requested payment processing date in YYYY-MM-DD format',
            },
          },
          required: ['billId', 'amount', 'chartOfAccountId'],
        },
      },
      {
        name: 'pay_bills_bulk',
        description: 'Pay multiple bills in a single request.',
        inputSchema: {
          type: 'object',
          properties: {
            payments: {
              type: 'array',
              description: 'Array of payment objects, each with billId, amount, chartOfAccountId, and optional processDate',
            },
          },
          required: ['payments'],
        },
      },
      {
        name: 'list_payments',
        description: 'List sent payments in the Bill.com account.',
        inputSchema: {
          type: 'object',
          properties: {
            max: {
              type: 'number',
              description: 'Maximum number of payments to return (default 100)',
            },
            start: {
              type: 'number',
              description: 'Starting index for pagination (0-based)',
            },
            filter: {
              type: 'object',
              description: 'Optional filter criteria as a key-value object',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      // Re-authenticate before each call to handle session expiry.
      // Bill.com sessions expire after 35 minutes of inactivity.
      await this.login();
      const headers = await this.getAuthHeaders();

      switch (name) {
        case 'list_vendors': {
          const body: Record<string, unknown> = {
            max: args.max || 100,
            start: args.start || 0,
          };
          if (args.filter) body.filter = args.filter;

          const response = await fetch(`${this.baseUrl}/vendors/list`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to list vendors (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bill.com returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_vendor': {
          const vendorId = args.vendorId as string;
          if (!vendorId) {
            return {
              content: [{ type: 'text', text: 'vendorId is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/vendors/${encodeURIComponent(vendorId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to get vendor (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bill.com returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_vendor': {
          if (!args.name) {
            return {
              content: [{ type: 'text', text: 'name is required' }],
              isError: true,
            };
          }

          const vendor: Record<string, unknown> = { name: args.name };
          if (args.email) vendor.email = args.email;
          if (args.address1) vendor.address1 = args.address1;
          if (args.address2) vendor.address2 = args.address2;
          if (args.addressCity) vendor.addressCity = args.addressCity;
          if (args.addressState) vendor.addressState = args.addressState;
          if (args.addressZip) vendor.addressZip = args.addressZip;
          if (args.phone) vendor.phone = args.phone;

          const response = await fetch(`${this.baseUrl}/vendors`, {
            method: 'POST',
            headers,
            body: JSON.stringify(vendor),
          });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to create vendor (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bill.com returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_bills': {
          const body: Record<string, unknown> = {
            max: args.max || 100,
            start: args.start || 0,
          };
          if (args.filter) body.filter = args.filter;

          const response = await fetch(`${this.baseUrl}/bills/list`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to list bills (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bill.com returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_bill': {
          const billId = args.billId as string;
          if (!billId) {
            return {
              content: [{ type: 'text', text: 'billId is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/bills/${encodeURIComponent(billId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to get bill (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bill.com returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_bill': {
          if (!args.vendorId || !args.invoiceDate || !args.dueDate || args.amount === undefined) {
            return {
              content: [{ type: 'text', text: 'vendorId, invoiceDate, dueDate, and amount are required' }],
              isError: true,
            };
          }

          const bill: Record<string, unknown> = {
            vendorId: args.vendorId,
            invoiceDate: args.invoiceDate,
            dueDate: args.dueDate,
            amount: args.amount,
          };
          if (args.invoiceNumber) bill.invoiceNumber = args.invoiceNumber;
          if (args.description) bill.description = args.description;
          if (args.billLineItems) bill.billLineItems = args.billLineItems;

          const response = await fetch(`${this.baseUrl}/bills`, {
            method: 'POST',
            headers,
            body: JSON.stringify(bill),
          });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to create bill (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bill.com returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'pay_bill': {
          if (!args.billId || args.amount === undefined || !args.chartOfAccountId) {
            return {
              content: [{ type: 'text', text: 'billId, amount, and chartOfAccountId are required' }],
              isError: true,
            };
          }

          const payment: Record<string, unknown> = {
            billId: args.billId,
            amount: args.amount,
            chartOfAccountId: args.chartOfAccountId,
          };
          if (args.processDate) payment.processDate = args.processDate;

          const response = await fetch(`${this.baseUrl}/payments`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payment),
          });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to pay bill (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bill.com returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'pay_bills_bulk': {
          if (!args.payments) {
            return {
              content: [{ type: 'text', text: 'payments array is required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/payments/bulk`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ payments: args.payments }),
          });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to pay bills in bulk (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bill.com returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_payments': {
          const body: Record<string, unknown> = {
            max: args.max || 100,
            start: args.start || 0,
          };
          if (args.filter) body.filter = args.filter;

          const response = await fetch(`${this.baseUrl}/payments/list`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to list payments (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bill.com returned non-JSON response (HTTP ${response.status})`); }
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
