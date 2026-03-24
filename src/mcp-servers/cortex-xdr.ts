/**
 * Palo Alto Cortex XDR MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no vendor-shipped MCP server for Cortex XDR.

import { ToolDefinition, ToolResult } from './types.js';
import { createHash, randomBytes } from 'crypto';

// Base URL: https://api-{fqdn}/public_api/v1/{api_name}/{call_name}/
//   The FQDN is customer-specific and assigned when the API key is generated in the Cortex XDR console.
//   Example: api-example.xdr.us.paloaltonetworks.com
//
// Auth — two modes (selected at key-generation time):
//   Standard: Authorization header = SHA256(apiKey + "".padEnd(64, "\x00") + timestampMs)
//             Headers: x-xdr-auth-id, x-xdr-timestamp, Authorization
//   Advanced: nonce = 64 random bytes (hex), Authorization = SHA256(apiKey + nonce + timestampMs)
//             Headers: x-xdr-auth-id, x-xdr-timestamp, x-xdr-nonce, Authorization
//
// Ref: https://docs-cortex.paloaltonetworks.com/r/Cortex-XDR-REST-API/Get-Started-with-Cortex-XDR-APIs

interface CortexXDRConfig {
  apiKey: string;
  apiKeyId: string;
  fqdn: string;
  advancedAuth?: boolean;
}

export class CortexXDRMCPServer {
  private readonly apiKey: string;
  private readonly apiKeyId: string;
  private readonly baseUrl: string;
  private readonly advancedAuth: boolean;

  constructor(config: CortexXDRConfig) {
    this.apiKey = config.apiKey;
    this.apiKeyId = config.apiKeyId;
    // Strip trailing slash and protocol if user included them
    const fqdn = config.fqdn.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.baseUrl = `https://${fqdn}/public_api/v1`;
    this.advancedAuth = config.advancedAuth ?? true;
  }

  private buildHeaders(): Record<string, string> {
    const timestamp = String(Date.now());

    let authValue: string;
    const extraHeaders: Record<string, string> = {};

    if (this.advancedAuth) {
      // Advanced: nonce = 64 random bytes encoded as hex string (128 chars)
      const nonce = randomBytes(64).toString('hex');
      authValue = createHash('sha256')
        .update(this.apiKey + nonce + timestamp)
        .digest('hex');
      extraHeaders['x-xdr-nonce'] = nonce;
    } else {
      // Standard: pad key to 64 null bytes then append timestamp
      const padding = '\x00'.repeat(64);
      authValue = createHash('sha256')
        .update(this.apiKey + padding + timestamp)
        .digest('hex');
    }

    return {
      'x-xdr-auth-id': this.apiKeyId,
      'x-xdr-timestamp': timestamp,
      ...extraHeaders,
      Authorization: authValue,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_incidents',
        description: 'Retrieve a list of incidents from Cortex XDR (POST /public_api/v1/incidents/get_incidents/). Supports filter, search_from, search_to, sort.',
        inputSchema: {
          type: 'object',
          properties: {
            filters: {
              type: 'array',
              description: 'Array of filter objects with field, operator, and value (e.g. [{"field":"status","operator":"eq","value":"new"}])',
            },
            search_from: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            search_to: {
              type: 'number',
              description: 'Upper bound for pagination (default: 100)',
            },
            sort: {
              type: 'object',
              description: 'Sort object with field and keyword (asc/desc) (e.g. {"field":"creation_time","keyword":"desc"})',
            },
          },
        },
      },
      {
        name: 'get_incident_extra_data',
        description: 'Get detailed data for a specific incident including alerts and key artifacts (POST /public_api/v1/incidents/get_incident_extra_data/)',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'Cortex XDR incident ID',
            },
            alerts_limit: {
              type: 'number',
              description: 'Maximum number of related alerts to return (default: 1000)',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'get_alerts',
        description: 'Retrieve a list of alerts from Cortex XDR (POST /public_api/v1/alerts/get_alerts/). Supports filter, search_from, search_to, sort.',
        inputSchema: {
          type: 'object',
          properties: {
            filters: {
              type: 'array',
              description: 'Array of filter objects with field, operator, and value (e.g. [{"field":"severity","operator":"eq","value":"high"}])',
            },
            search_from: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            search_to: {
              type: 'number',
              description: 'Upper bound for pagination (default: 100)',
            },
            sort: {
              type: 'object',
              description: 'Sort object with field and keyword (asc/desc) (e.g. {"field":"source_insert_ts","keyword":"desc"})',
            },
          },
        },
      },
      {
        name: 'get_endpoints',
        description: 'Retrieve a list of endpoints registered in Cortex XDR (POST /public_api/v1/endpoints/get_endpoint/). Supports filter, search_from, search_to, sort.',
        inputSchema: {
          type: 'object',
          properties: {
            filters: {
              type: 'array',
              description: 'Array of filter objects (e.g. [{"field":"endpoint_status","operator":"eq","value":"connected"}])',
            },
            search_from: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            search_to: {
              type: 'number',
              description: 'Upper bound for pagination (default: 100)',
            },
            sort: {
              type: 'object',
              description: 'Sort object with field and keyword (asc/desc)',
            },
          },
        },
      },
      {
        name: 'isolate_endpoint',
        description: 'Isolate one or more endpoints from the network (POST /public_api/v1/endpoints/isolate/). Requires appropriate RBAC permissions.',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id_list: {
              type: 'array',
              description: 'List of endpoint IDs to isolate',
            },
          },
          required: ['endpoint_id_list'],
        },
      },
      {
        name: 'unisolate_endpoint',
        description: 'Remove network isolation from one or more endpoints (POST /public_api/v1/endpoints/unisolate/)',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id_list: {
              type: 'array',
              description: 'List of endpoint IDs to unisolate',
            },
          },
          required: ['endpoint_id_list'],
        },
      },
      {
        name: 'scan_endpoint',
        description: 'Trigger an antivirus scan on one or more endpoints (POST /public_api/v1/endpoints/scan/)',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id_list: {
              type: 'array',
              description: 'List of endpoint IDs to scan',
            },
          },
          required: ['endpoint_id_list'],
        },
      },
      {
        name: 'update_incident',
        description: 'Update the status, assigned user, severity, or resolve comment of an incident (POST /public_api/v1/incidents/update_incident/)',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'Cortex XDR incident ID to update',
            },
            assigned_user_mail: {
              type: 'string',
              description: 'Email address of the user to assign the incident to',
            },
            status: {
              type: 'string',
              description: 'New status: new, under_investigation, resolved_threat_handled, resolved_known_issue, resolved_duplicate, resolved_false_positive, resolved_auto',
            },
            severity: {
              type: 'string',
              description: 'New severity: low, medium, high, critical',
            },
            resolve_comment: {
              type: 'string',
              description: 'Comment to add when resolving the incident',
            },
          },
          required: ['incident_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_incidents': {
          const body: Record<string, unknown> = {
            request_data: {
              filters: (args.filters as unknown[]) || [],
              search_from: (args.search_from as number) || 0,
              search_to: (args.search_to as number) || 100,
            },
          };
          if (args.sort) (body.request_data as Record<string, unknown>).sort = args.sort;

          const response = await fetch(`${this.baseUrl}/incidents/get_incidents/`, {
            method: 'POST',
            headers: this.buildHeaders(),
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get incidents: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cortex XDR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_incident_extra_data': {
          const incidentId = args.incident_id as string;
          if (!incidentId) {
            return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
          }
          const body = {
            request_data: {
              incident_id: incidentId,
              alerts_limit: (args.alerts_limit as number) || 1000,
            },
          };
          const response = await fetch(`${this.baseUrl}/incidents/get_incident_extra_data/`, {
            method: 'POST',
            headers: this.buildHeaders(),
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get incident extra data: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cortex XDR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_alerts': {
          const body: Record<string, unknown> = {
            request_data: {
              filters: (args.filters as unknown[]) || [],
              search_from: (args.search_from as number) || 0,
              search_to: (args.search_to as number) || 100,
            },
          };
          if (args.sort) (body.request_data as Record<string, unknown>).sort = args.sort;

          const response = await fetch(`${this.baseUrl}/alerts/get_alerts/`, {
            method: 'POST',
            headers: this.buildHeaders(),
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get alerts: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cortex XDR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_endpoints': {
          const body: Record<string, unknown> = {
            request_data: {
              filters: (args.filters as unknown[]) || [],
              search_from: (args.search_from as number) || 0,
              search_to: (args.search_to as number) || 100,
            },
          };
          if (args.sort) (body.request_data as Record<string, unknown>).sort = args.sort;

          const response = await fetch(`${this.baseUrl}/endpoints/get_endpoint/`, {
            method: 'POST',
            headers: this.buildHeaders(),
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get endpoints: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cortex XDR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'isolate_endpoint': {
          const endpointIdList = args.endpoint_id_list as string[];
          if (!endpointIdList || endpointIdList.length === 0) {
            return { content: [{ type: 'text', text: 'endpoint_id_list is required and must not be empty' }], isError: true };
          }
          const body = { request_data: { endpoint_id_list: endpointIdList } };
          const response = await fetch(`${this.baseUrl}/endpoints/isolate/`, {
            method: 'POST',
            headers: this.buildHeaders(),
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to isolate endpoint(s): ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cortex XDR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'unisolate_endpoint': {
          const endpointIdList = args.endpoint_id_list as string[];
          if (!endpointIdList || endpointIdList.length === 0) {
            return { content: [{ type: 'text', text: 'endpoint_id_list is required and must not be empty' }], isError: true };
          }
          const body = { request_data: { endpoint_id_list: endpointIdList } };
          const response = await fetch(`${this.baseUrl}/endpoints/unisolate/`, {
            method: 'POST',
            headers: this.buildHeaders(),
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to unisolate endpoint(s): ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cortex XDR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'scan_endpoint': {
          const endpointIdList = args.endpoint_id_list as string[];
          if (!endpointIdList || endpointIdList.length === 0) {
            return { content: [{ type: 'text', text: 'endpoint_id_list is required and must not be empty' }], isError: true };
          }
          const body = { request_data: { endpoint_id_list: endpointIdList } };
          const response = await fetch(`${this.baseUrl}/endpoints/scan/`, {
            method: 'POST',
            headers: this.buildHeaders(),
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to scan endpoint(s): ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cortex XDR returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_incident': {
          const incidentId = args.incident_id as string;
          if (!incidentId) {
            return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
          }
          const updateFields: Record<string, unknown> = { incident_id: incidentId };
          if (args.assigned_user_mail) updateFields.assigned_user_mail = args.assigned_user_mail;
          if (args.status) updateFields.status = args.status;
          if (args.severity) updateFields.severity = args.severity;
          if (args.resolve_comment) updateFields.resolve_comment = args.resolve_comment;

          const body = { request_data: updateFields };
          const response = await fetch(`${this.baseUrl}/incidents/update_incident/`, {
            method: 'POST',
            headers: this.buildHeaders(),
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update incident: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cortex XDR returned non-JSON response (HTTP ${response.status})`); }
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
