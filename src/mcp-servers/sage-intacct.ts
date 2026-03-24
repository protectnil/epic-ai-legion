/**
 * Sage Intacct MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://developer.sage.com/intacct/mcps/intacct-mcp/latest/intacct-mcp-server
// Sage ships an official Intacct MCP server (1.0) via their Developer Portal. That server requires
// OAuth 2.0 and is hosted-only (requires Sage's OAuth infrastructure). This adapter targets the
// established Sage Intacct XML Web Services API (the primary API with full object coverage) using
// session-based authentication — the recommended pattern for server-to-server integrations.
//
// Endpoint: POST https://api.intacct.com/ia/xml/xmlgw.phtml (initial session acquisition)
// The getAPISession response returns a unique session ID and a session-specific endpoint URL
// that must be used for all subsequent requests in that session.
//
// Auth flow: login credentials → getAPISession → sessionId + unique endpoint for all calls.

import { ToolDefinition, ToolResult } from './types.js';

interface SageIntacctConfig {
  senderId: string;
  senderPassword: string;
  companyId: string;
  userId: string;
  userPassword: string;
  endpointUrl?: string;
}

interface IntacctSession {
  sessionId: string;
  endpoint: string;
}

export class SageIntacctMCPServer {
  private readonly senderId: string;
  private readonly senderPassword: string;
  private readonly companyId: string;
  private readonly userId: string;
  private readonly userPassword: string;
  private readonly gatewayUrl: string;
  private session: IntacctSession | null = null;

  constructor(config: SageIntacctConfig) {
    this.senderId = config.senderId;
    this.senderPassword = config.senderPassword;
    this.companyId = config.companyId;
    this.userId = config.userId;
    this.userPassword = config.userPassword;
    this.gatewayUrl = config.endpointUrl || 'https://api.intacct.com/ia/xml/xmlgw.phtml';
  }

  /**
   * Build a minimal XML request envelope for the Sage Intacct XML API.
   * Uses login credentials on first call; session ID on subsequent calls.
   */
  private buildEnvelope(functionXml: string, useSession = false): string {
    const controlBlock = `<control>
      <senderid>${this.senderId}</senderid>
      <password>${this.senderPassword}</password>
      <controlid>ctrl-${Date.now()}</controlid>
      <uniqueid>false</uniqueid>
      <dtdversion>3.0</dtdversion>
      <includewhitespace>false</includewhitespace>
    </control>`;

    const authBlock = useSession && this.session
      ? `<authentication><sessionid>${this.session.sessionId}</sessionid></authentication>`
      : `<authentication>
          <login>
            <userid>${this.userId}</userid>
            <companyid>${this.companyId}</companyid>
            <password>${this.userPassword}</password>
          </login>
        </authentication>`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  ${controlBlock}
  <operation>
    ${authBlock}
    <content>
      <function controlid="fn-${Date.now()}">
        ${functionXml}
      </function>
    </content>
  </operation>
</request>`;
  }

  /**
   * Acquire a session ID and unique endpoint. Sessions are cached for reuse.
   */
  private async getSession(): Promise<IntacctSession> {
    if (this.session) return this.session;

    const xml = this.buildEnvelope('<getAPISession/>');
    const response = await fetch(this.gatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    });

    if (!response.ok) {
      throw new Error(`Sage Intacct session request failed: HTTP ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const sessionId = text.match(/<sessionid>([^<]+)<\/sessionid>/)?.[1];
    const endpoint = text.match(/<endpoint>([^<]+)<\/endpoint>/)?.[1];

    if (!sessionId || !endpoint) {
      throw new Error(`Failed to parse Sage Intacct session response: ${text.substring(0, 500)}`);
    }

    this.session = { sessionId, endpoint };
    return this.session;
  }

  /**
   * Post an XML function to the Intacct API using the active session endpoint.
   */
  private async postFunction(functionXml: string): Promise<string> {
    const session = await this.getSession();
    const xml = this.buildEnvelope(functionXml, true);

    const response = await fetch(session.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    });

    if (!response.ok) {
      throw new Error(`Sage Intacct API request failed: HTTP ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * Parse XML response into a plain object. Checks for API-level errors.
   */
  private parseResponse(xml: string): { success: boolean; data: string } {
    const hasError = xml.includes('<status>failure</status>') || xml.includes('<errorno>');
    const errorMsg = xml.match(/<description2?>([^<]+)<\/description2?>/)?.[1]
      || xml.match(/<errorno>([^<]+)<\/errorno>/)?.[1]
      || 'Unknown Sage Intacct error';

    if (hasError) {
      return { success: false, data: errorMsg };
    }
    return { success: true, data: xml };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query_objects',
        description: 'Query Sage Intacct objects using readByQuery (e.g. ARINVOICE, VENDOR, CUSTOMER, GLACCOUNT, APPYMT)',
        inputSchema: {
          type: 'object',
          properties: {
            object: {
              type: 'string',
              description: 'Sage Intacct object name in uppercase (e.g. ARINVOICE, VENDOR, CUSTOMER, APPYMT, GLACCOUNT)',
            },
            query: {
              type: 'string',
              description: 'Filter expression (e.g. STATUS = \'open\' AND CUSTOMERID = \'C001\'). Leave empty for all records.',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return, or * for all (default: *)',
            },
            page_size: {
              type: 'number',
              description: 'Number of records per page (max 1000, default: 100)',
            },
          },
          required: ['object'],
        },
      },
      {
        name: 'get_object',
        description: 'Retrieve a single Sage Intacct record by its key/ID using the read function',
        inputSchema: {
          type: 'object',
          properties: {
            object: {
              type: 'string',
              description: 'Sage Intacct object name in uppercase (e.g. ARINVOICE, VENDOR, CUSTOMER)',
            },
            key: {
              type: 'string',
              description: 'The record key or ID to retrieve',
            },
          },
          required: ['object', 'key'],
        },
      },
      {
        name: 'create_ar_invoice',
        description: 'Create an Accounts Receivable invoice in Sage Intacct',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'The Sage Intacct customer ID',
            },
            date_created: {
              type: 'string',
              description: 'Invoice date in MM/DD/YYYY format',
            },
            due_date: {
              type: 'string',
              description: 'Due date in MM/DD/YYYY format',
            },
            invoice_number: {
              type: 'string',
              description: 'Your invoice number/reference',
            },
            description: {
              type: 'string',
              description: 'Invoice description or memo',
            },
            gl_account_no: {
              type: 'string',
              description: 'GL account number for the revenue line',
            },
            amount: {
              type: 'number',
              description: 'Invoice line amount',
            },
          },
          required: ['customer_id', 'date_created', 'due_date', 'gl_account_no', 'amount'],
        },
      },
      {
        name: 'create_ap_bill',
        description: 'Create an Accounts Payable bill (vendor bill) in Sage Intacct',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_id: {
              type: 'string',
              description: 'The Sage Intacct vendor ID',
            },
            date_created: {
              type: 'string',
              description: 'Bill date in MM/DD/YYYY format',
            },
            due_date: {
              type: 'string',
              description: 'Due date in MM/DD/YYYY format',
            },
            bill_number: {
              type: 'string',
              description: 'Vendor bill number/reference',
            },
            description: {
              type: 'string',
              description: 'Bill description or memo',
            },
            gl_account_no: {
              type: 'string',
              description: 'GL account number for the expense line',
            },
            amount: {
              type: 'number',
              description: 'Bill line amount',
            },
          },
          required: ['vendor_id', 'date_created', 'due_date', 'gl_account_no', 'amount'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'query_objects': {
          const object = args.object as string;
          if (!object) {
            return {
              content: [{ type: 'text', text: 'object is required' }],
              isError: true,
            };
          }

          const query = (args.query as string) || '';
          const fields = (args.fields as string) || '*';
          const pageSize = (args.page_size as number) || 100;

          const functionXml = `<readByQuery>
            <object>${object}</object>
            <fields>${fields}</fields>
            <query>${query}</query>
            <pagesize>${pageSize}</pagesize>
          </readByQuery>`;

          const xml = await this.postFunction(functionXml);
          const result = this.parseResponse(xml);

          if (!result.success) {
            return {
              content: [{ type: 'text', text: `Sage Intacct query failed: ${result.data}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: result.data }], isError: false };
        }

        case 'get_object': {
          const object = args.object as string;
          const key = args.key as string;
          if (!object || !key) {
            return {
              content: [{ type: 'text', text: 'object and key are required' }],
              isError: true,
            };
          }

          const functionXml = `<read>
            <object>${object}</object>
            <keys>${key}</keys>
            <fields>*</fields>
          </read>`;

          const xml = await this.postFunction(functionXml);
          const result = this.parseResponse(xml);

          if (!result.success) {
            return {
              content: [{ type: 'text', text: `Sage Intacct read failed: ${result.data}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: result.data }], isError: false };
        }

        case 'create_ar_invoice': {
          const customerId = args.customer_id as string;
          const dateCreated = args.date_created as string;
          const dueDate = args.due_date as string;
          const glAccountNo = args.gl_account_no as string;
          const amount = args.amount as number;

          if (!customerId || !dateCreated || !dueDate || !glAccountNo || amount === undefined) {
            return {
              content: [{ type: 'text', text: 'customer_id, date_created, due_date, gl_account_no, and amount are required' }],
              isError: true,
            };
          }

          const invoiceNo = (args.invoice_number as string) || '';
          const description = (args.description as string) || '';

          const functionXml = `<create_invoice>
            <customerid>${customerId}</customerid>
            <datecreated>
              <year>${dateCreated.split('/')[2]}</year>
              <month>${dateCreated.split('/')[0]}</month>
              <day>${dateCreated.split('/')[1]}</day>
            </datecreated>
            <datedue>
              <year>${dueDate.split('/')[2]}</year>
              <month>${dueDate.split('/')[0]}</month>
              <day>${dueDate.split('/')[1]}</day>
            </datedue>
            <invoiceno>${invoiceNo}</invoiceno>
            <description>${description}</description>
            <invoiceitems>
              <lineitem>
                <glaccountno>${glAccountNo}</glaccountno>
                <amount>${amount}</amount>
                <memo>${description}</memo>
              </lineitem>
            </invoiceitems>
          </create_invoice>`;

          const xml = await this.postFunction(functionXml);
          const result = this.parseResponse(xml);

          if (!result.success) {
            return {
              content: [{ type: 'text', text: `Failed to create AR invoice: ${result.data}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: result.data }], isError: false };
        }

        case 'create_ap_bill': {
          const vendorId = args.vendor_id as string;
          const dateCreated = args.date_created as string;
          const dueDate = args.due_date as string;
          const glAccountNo = args.gl_account_no as string;
          const amount = args.amount as number;

          if (!vendorId || !dateCreated || !dueDate || !glAccountNo || amount === undefined) {
            return {
              content: [{ type: 'text', text: 'vendor_id, date_created, due_date, gl_account_no, and amount are required' }],
              isError: true,
            };
          }

          const billNo = (args.bill_number as string) || '';
          const description = (args.description as string) || '';

          const functionXml = `<create_bill>
            <vendorid>${vendorId}</vendorid>
            <datecreated>
              <year>${dateCreated.split('/')[2]}</year>
              <month>${dateCreated.split('/')[0]}</month>
              <day>${dateCreated.split('/')[1]}</day>
            </datecreated>
            <datedue>
              <year>${dueDate.split('/')[2]}</year>
              <month>${dueDate.split('/')[0]}</month>
              <day>${dueDate.split('/')[1]}</day>
            </datedue>
            <billno>${billNo}</billno>
            <description>${description}</description>
            <billitems>
              <lineitem>
                <glaccountno>${glAccountNo}</glaccountno>
                <amount>${amount}</amount>
                <memo>${description}</memo>
              </lineitem>
            </billitems>
          </create_bill>`;

          const xml = await this.postFunction(functionXml);
          const result = this.parseResponse(xml);

          if (!result.success) {
            return {
              content: [{ type: 'text', text: `Failed to create AP bill: ${result.data}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: result.data }], isError: false };
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
