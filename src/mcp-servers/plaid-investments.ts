/**
 * Plaid Investments MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/plaid/ai-coding-toolkit — transport: stdio, auth: Plaid credentials
// Plaid's official MCP focuses on sandbox/dev tooling. This adapter covers the Investments product APIs.
// Recommendation: Use this adapter for production investment account data access.
//
// Base URL: https://production.plaid.com (or https://sandbox.plaid.com for testing)
// Auth: All requests POST with client_id + secret in request body; access_token per Item
// Docs: https://plaid.com/docs/api/products/investments/
// Rate limits: Varies by product; contact Plaid for production rate limits

import { ToolDefinition, ToolResult } from './types.js';

interface PlaidInvestmentsConfig {
  clientId: string;
  secret: string;
  baseUrl?: string;
}

export class PlaidInvestmentsMCPServer {
  private readonly clientId: string;
  private readonly secret: string;
  private readonly baseUrl: string;

  constructor(config: PlaidInvestmentsConfig) {
    this.clientId = config.clientId;
    this.secret = config.secret;
    this.baseUrl = (config.baseUrl || 'https://production.plaid.com').replace(/\/$/, '');
  }

  private truncate(text: string): string {
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const payload = { client_id: this.clientId, secret: this.secret, ...body };
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_holdings',
        description: 'Get investment holdings for an Item including securities, quantities, and current values',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: { type: 'string', description: 'Plaid access token for the Item' },
            account_ids: { type: 'array', items: { type: 'string' }, description: 'Optional list of account IDs to filter' },
          },
          required: ['access_token'],
        },
      },
      {
        name: 'get_transactions',
        description: 'Get investment transactions (buys, sells, dividends, fees) for a date range',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: { type: 'string', description: 'Plaid access token for the Item' },
            start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            account_ids: { type: 'array', items: { type: 'string' }, description: 'Optional account IDs to filter' },
            count: { type: 'number', description: 'Number of transactions to return (default: 100, max: 500)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
          required: ['access_token', 'start_date', 'end_date'],
        },
      },
      {
        name: 'refresh_holdings',
        description: 'Trigger an on-demand refresh of investment holdings data for an Item',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: { type: 'string', description: 'Plaid access token for the Item' },
          },
          required: ['access_token'],
        },
      },
      {
        name: 'refresh_transactions',
        description: 'Trigger an on-demand refresh of investment transactions data for an Item',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: { type: 'string', description: 'Plaid access token for the Item' },
          },
          required: ['access_token'],
        },
      },
      {
        name: 'get_accounts',
        description: 'Get investment account details including balances, types, and subtypes',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: { type: 'string', description: 'Plaid access token for the Item' },
            account_ids: { type: 'array', items: { type: 'string' }, description: 'Optional account IDs to filter' },
          },
          required: ['access_token'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_holdings':
          return await this.getHoldings(args);
        case 'get_transactions':
          return await this.getTransactions(args);
        case 'refresh_holdings':
          return await this.refreshHoldings(args);
        case 'refresh_transactions':
          return await this.refreshTransactions(args);
        case 'get_accounts':
          return await this.getAccounts(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return { content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
    }
  }

  private async getHoldings(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { access_token: args.access_token };
    if (args.account_ids) body.options = { account_ids: args.account_ids };
    return this.post('/investments/holdings/get', body);
  }

  private async getTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      access_token: args.access_token,
      start_date: args.start_date,
      end_date: args.end_date,
    };
    const options: Record<string, unknown> = {};
    if (args.account_ids) options.account_ids = args.account_ids;
    if (args.count) options.count = args.count;
    if (args.offset) options.offset = args.offset;
    if (Object.keys(options).length > 0) body.options = options;
    return this.post('/investments/transactions/get', body);
  }

  private async refreshHoldings(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/investments/holdings/refresh', { access_token: args.access_token });
  }

  private async refreshTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/investments/transactions/refresh', { access_token: args.access_token });
  }

  private async getAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { access_token: args.access_token };
    if (args.account_ids) body.options = { account_ids: args.account_ids };
    return this.post('/accounts/get', body);
  }

  static catalog() {
    return {
      name: 'plaid-investments',
      displayName: 'Plaid Investments',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['plaid', 'investments', 'holdings', 'securities', 'portfolio', 'brokerage', 'stocks', 'dividends'],
      toolNames: ['get_holdings', 'get_transactions', 'refresh_holdings', 'refresh_transactions', 'get_accounts'],
      description: 'Plaid Investments: retrieve holdings, investment transactions, and account data from brokerage and retirement accounts.',
      author: 'protectnil' as const,
    };
  }
}
