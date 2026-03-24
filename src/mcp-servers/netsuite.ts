/**
 * Oracle NetSuite MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — Oracle has not published an official NetSuite MCP server as of March 2026.
// Community adapters exist (glints-dev/mcp-netsuite, dsvantien/netsuite-mcp-server) but are unofficial.
// Oracle does publish a "NetSuite AI Connector Service" page but it is a hosted product, not an open MCP server.
// This adapter calls the NetSuite SuiteTalk REST Web Services API directly using
// Token-Based Authentication (TBA / OAuth 1.0a with HMAC-SHA256).
//
// NetSuite REST base URL format: https://{accountId}.suitetalk.api.netsuite.com
// Record API:  /services/rest/record/v1/{recordType}/{id}
// SuiteQL API: POST /services/rest/query/v1/suiteql
//
// NOTE: TBA requires an HMAC-SHA256 signature computed per-request. The signature
// components are: HTTP method, URL, OAuth params, consumer secret, and token secret.
// The crypto module (Node.js built-in) handles HMAC-SHA256 signing.

import { createHmac } from 'crypto';
import { ToolDefinition, ToolResult } from './types.js';

interface NetSuiteConfig {
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
}

export class NetSuiteMCPServer {
  private readonly accountId: string;
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly tokenId: string;
  private readonly tokenSecret: string;
  private readonly baseUrl: string;

  constructor(config: NetSuiteConfig) {
    this.accountId = config.accountId;
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.tokenId = config.tokenId;
    this.tokenSecret = config.tokenSecret;
    // Account IDs with underscores use dashes in the subdomain (e.g. 1234567_SB1 → 1234567-sb1)
    const subdomain = this.accountId.toLowerCase().replace(/_/g, '-');
    this.baseUrl = `https://${subdomain}.suitetalk.api.netsuite.com`;
  }

  /**
   * Build an OAuth 1.0a TBA Authorization header for a given HTTP method and URL.
   * NetSuite requires: realm, oauth_consumer_key, oauth_token, oauth_signature_method,
   * oauth_timestamp, oauth_nonce, oauth_version, oauth_signature.
   * Signature method: HMAC-SHA256. Signing key: consumerSecret&tokenSecret (RFC 5849).
   */
  private buildAuthHeader(method: string, url: string): string {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.consumerKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA256',
      oauth_timestamp: timestamp,
      oauth_token: this.tokenId,
      oauth_version: '1.0',
    };

    // Percent-encode per RFC 5849
    const pct = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

    // Build the base string: METHOD&url&params (all percent-encoded)
    const sortedParams = Object.entries(oauthParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${pct(k)}=${pct(v)}`)
      .join('&');

    const baseString = `${method.toUpperCase()}&${pct(url)}&${pct(sortedParams)}`;
    const signingKey = `${pct(this.consumerSecret)}&${pct(this.tokenSecret)}`;

    const signature = createHmac('sha256', signingKey)
      .update(baseString)
      .digest('base64');

    // Realm is the account ID in uppercase (NetSuite requirement)
    const realm = this.accountId.toUpperCase();

    const headerParts = [
      `realm="${realm}"`,
      `oauth_consumer_key="${this.consumerKey}"`,
      `oauth_token="${this.tokenId}"`,
      `oauth_signature_method="HMAC-SHA256"`,
      `oauth_timestamp="${timestamp}"`,
      `oauth_nonce="${nonce}"`,
      `oauth_version="1.0"`,
      `oauth_signature="${encodeURIComponent(signature)}"`,
    ];

    return `OAuth ${headerParts.join(', ')}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'run_suiteql',
        description: 'Execute a SuiteQL query (SQL-92 style) against NetSuite data. Returns up to 1000 rows by default.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The SuiteQL SELECT statement to execute (e.g. SELECT id, companyName FROM customer WHERE isInactive = \'F\')',
            },
            limit: {
              type: 'number',
              description: 'Maximum rows to return (max 1000, default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Row offset for pagination (default: 0)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_record',
        description: 'Retrieve a single NetSuite record by type and internal ID',
        inputSchema: {
          type: 'object',
          properties: {
            record_type: {
              type: 'string',
              description: 'NetSuite record type in lowercase (e.g. customer, vendor, invoice, salesorder, employee, item)',
            },
            record_id: {
              type: 'string',
              description: 'The NetSuite internal ID of the record',
            },
          },
          required: ['record_type', 'record_id'],
        },
      },
      {
        name: 'list_records',
        description: 'List NetSuite records of a given type with optional field filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            record_type: {
              type: 'string',
              description: 'NetSuite record type in lowercase (e.g. customer, vendor, invoice, salesorder)',
            },
            limit: {
              type: 'number',
              description: 'Number of records to return (max 1000, default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Record offset for pagination (default: 0)',
            },
          },
          required: ['record_type'],
        },
      },
      {
        name: 'create_record',
        description: 'Create a new NetSuite record of the specified type',
        inputSchema: {
          type: 'object',
          properties: {
            record_type: {
              type: 'string',
              description: 'NetSuite record type in lowercase (e.g. customer, vendor, salesorder)',
            },
            fields: {
              type: 'object',
              description: 'Key-value pairs of field names and values for the new record',
            },
          },
          required: ['record_type', 'fields'],
        },
      },
      {
        name: 'update_record',
        description: 'Update fields on an existing NetSuite record using PATCH (partial update)',
        inputSchema: {
          type: 'object',
          properties: {
            record_type: {
              type: 'string',
              description: 'NetSuite record type in lowercase (e.g. customer, vendor, salesorder)',
            },
            record_id: {
              type: 'string',
              description: 'The NetSuite internal ID of the record to update',
            },
            fields: {
              type: 'object',
              description: 'Key-value pairs of field names and updated values',
            },
          },
          required: ['record_type', 'record_id', 'fields'],
        },
      },
      {
        name: 'delete_record',
        description: 'Delete a NetSuite record by type and internal ID',
        inputSchema: {
          type: 'object',
          properties: {
            record_type: {
              type: 'string',
              description: 'NetSuite record type in lowercase (e.g. customer, vendor, salesorder)',
            },
            record_id: {
              type: 'string',
              description: 'The NetSuite internal ID of the record to delete',
            },
          },
          required: ['record_type', 'record_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'run_suiteql': {
          const query = args.query as string;
          if (!query) {
            return {
              content: [{ type: 'text', text: 'query is required' }],
              isError: true,
            };
          }

          const limit = (args.limit as number) || 100;
          const offset = (args.offset as number) || 0;
          const url = `${this.baseUrl}/services/rest/query/v1/suiteql?limit=${limit}&offset=${offset}`;

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: this.buildAuthHeader('POST', url),
              'Content-Type': 'application/json',
              Prefer: 'transient',
            },
            body: JSON.stringify({ q: query }),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `SuiteQL query failed: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`NetSuite returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_record': {
          const recordType = args.record_type as string;
          const recordId = args.record_id as string;
          if (!recordType || !recordId) {
            return {
              content: [{ type: 'text', text: 'record_type and record_id are required' }],
              isError: true,
            };
          }

          const url = `${this.baseUrl}/services/rest/record/v1/${encodeURIComponent(recordType)}/${encodeURIComponent(recordId)}`;
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: this.buildAuthHeader('GET', url),
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get record: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`NetSuite returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_records': {
          const recordType = args.record_type as string;
          if (!recordType) {
            return {
              content: [{ type: 'text', text: 'record_type is required' }],
              isError: true,
            };
          }

          const limit = (args.limit as number) || 25;
          const offset = (args.offset as number) || 0;
          const url = `${this.baseUrl}/services/rest/record/v1/${encodeURIComponent(recordType)}?limit=${limit}&offset=${offset}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: this.buildAuthHeader('GET', url),
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list records: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`NetSuite returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_record': {
          const recordType = args.record_type as string;
          const fields = args.fields as Record<string, unknown>;
          if (!recordType || !fields) {
            return {
              content: [{ type: 'text', text: 'record_type and fields are required' }],
              isError: true,
            };
          }

          const url = `${this.baseUrl}/services/rest/record/v1/${encodeURIComponent(recordType)}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: this.buildAuthHeader('POST', url),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(fields),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create record: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          // POST to record API returns 204 with Location header on success
          const location = response.headers.get('Location') || '';
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, location }, null, 2) }],
            isError: false,
          };
        }

        case 'update_record': {
          const recordType = args.record_type as string;
          const recordId = args.record_id as string;
          const fields = args.fields as Record<string, unknown>;
          if (!recordType || !recordId || !fields) {
            return {
              content: [{ type: 'text', text: 'record_type, record_id, and fields are required' }],
              isError: true,
            };
          }

          const url = `${this.baseUrl}/services/rest/record/v1/${encodeURIComponent(recordType)}/${encodeURIComponent(recordId)}`;
          const response = await fetch(url, {
            method: 'PATCH',
            headers: {
              Authorization: this.buildAuthHeader('PATCH', url),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(fields),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to update record: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, record_type: recordType, record_id: recordId }, null, 2) }],
            isError: false,
          };
        }

        case 'delete_record': {
          const recordType = args.record_type as string;
          const recordId = args.record_id as string;
          if (!recordType || !recordId) {
            return {
              content: [{ type: 'text', text: 'record_type and record_id are required' }],
              isError: true,
            };
          }

          const url = `${this.baseUrl}/services/rest/record/v1/${encodeURIComponent(recordType)}/${encodeURIComponent(recordId)}`;
          const response = await fetch(url, {
            method: 'DELETE',
            headers: {
              Authorization: this.buildAuthHeader('DELETE', url),
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to delete record: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, record_type: recordType, record_id: recordId }, null, 2) }],
            isError: false,
          };
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
