/**
 * Marketo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/alexleventer/marketo-mcp — community, limited scope (forms only)

// Auth: OAuth2 client_credentials (2-legged).
// Token endpoint: GET {identityUrl}/oauth/token?grant_type=client_credentials&client_id=...&client_secret=...
//   (POST also supported but GET is the documented primary method)
// Identity URL and REST base URL are instance-specific (contain the Munchkin ID).
//   Example: identityUrl = https://284-RPR-133.mktorest.com/identity
//            restBaseUrl  = https://284-RPR-133.mktorest.com/rest
// As of March 31, 2026, access_token query param is removed — Bearer header only.
// Leads API:   /rest/v1/...
// Assets API:  /rest/asset/v1/...
// Bulk API:    /bulk/v1/...
// Source: https://experienceleague.adobe.com/en/docs/marketo-developer/marketo/rest/authentication
//         https://experienceleague.adobe.com/en/docs/marketo-developer/marketo/rest/rest-api

import { ToolDefinition, ToolResult } from './types.js';

interface MarketoConfig {
  clientId: string;
  clientSecret: string;
  identityUrl: string;
  restBaseUrl: string;
}

export class MarketoMCPServer {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly identityUrl: string;
  private readonly restBaseUrl: string;
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: MarketoConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    // Strip trailing slash to avoid double-slash in endpoint paths
    this.identityUrl = config.identityUrl.replace(/\/$/, '');
    this.restBaseUrl = config.restBaseUrl.replace(/\/$/, '');
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }
    const tokenUrl = `${this.identityUrl}/oauth/token?grant_type=client_credentials&client_id=${encodeURIComponent(this.clientId)}&client_secret=${encodeURIComponent(this.clientSecret)}`;
    const response = await fetch(tokenUrl, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Marketo OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.cachedToken = data.access_token;
    // expires_in is in seconds; subtract 60s buffer
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.cachedToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_leads',
        description: 'Retrieve leads from Marketo by filter type and values',
        inputSchema: {
          type: 'object',
          properties: {
            filter_type: {
              type: 'string',
              description: 'Lead field to filter on, e.g. email, id, cookie',
            },
            filter_values: {
              type: 'string',
              description: 'Comma-separated list of values to match against the filter_type field',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of lead fields to return (default: id, email, firstName, lastName)',
            },
          },
          required: ['filter_type', 'filter_values'],
        },
      },
      {
        name: 'create_or_update_leads',
        description: 'Create or update (upsert) one or more leads in Marketo',
        inputSchema: {
          type: 'object',
          properties: {
            leads: {
              type: 'array',
              description: 'Array of lead objects. Each object may include email, firstName, lastName, and any other Marketo lead fields.',
            },
            action: {
              type: 'string',
              description: 'Sync action: createOrUpdate (default), createOnly, updateOnly, createDuplicate',
            },
            lookup_field: {
              type: 'string',
              description: 'Field used to de-duplicate (default: email)',
            },
          },
          required: ['leads'],
        },
      },
      {
        name: 'list_campaigns',
        description: 'List smart campaigns in the Marketo instance',
        inputSchema: {
          type: 'object',
          properties: {
            is_triggerable: {
              type: 'boolean',
              description: 'Filter to only triggerable (requestable) campaigns when true',
            },
            program_name: {
              type: 'string',
              description: 'Filter campaigns by program name',
            },
          },
        },
      },
      {
        name: 'get_campaign',
        description: 'Retrieve a single smart campaign by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'number',
              description: 'Marketo campaign ID',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'request_campaign',
        description: 'Trigger a requestable smart campaign for a list of leads',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'number',
              description: 'Marketo campaign ID to trigger',
            },
            lead_ids: {
              type: 'array',
              description: 'Array of lead IDs to run through the campaign',
            },
          },
          required: ['campaign_id', 'lead_ids'],
        },
      },
      {
        name: 'list_programs',
        description: 'List marketing programs in Marketo',
        inputSchema: {
          type: 'object',
          properties: {
            max_return: {
              type: 'number',
              description: 'Maximum number of programs to return (max 200)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
            filter_type: {
              type: 'string',
              description: 'Filter type: programType, workspace, tag',
            },
            filter_values: {
              type: 'string',
              description: 'Comma-separated filter values matching filter_type',
            },
          },
        },
      },
      {
        name: 'list_email_templates',
        description: 'List email templates in the Marketo Design Studio',
        inputSchema: {
          type: 'object',
          properties: {
            max_return: {
              type: 'number',
              description: 'Maximum number of templates to return (max 200)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
            status: {
              type: 'string',
              description: 'Filter by status: draft or approved',
            },
          },
        },
      },
      {
        name: 'get_lead_activity',
        description: 'Retrieve activity log for a lead',
        inputSchema: {
          type: 'object',
          properties: {
            lead_id: {
              type: 'number',
              description: 'Marketo lead ID',
            },
            activity_type_ids: {
              type: 'string',
              description: 'Comma-separated activity type IDs to filter (e.g. 1,2,12 for interesting moments)',
            },
            next_page_token: {
              type: 'string',
              description: 'Pagination token from a prior response',
            },
          },
          required: ['lead_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const accessToken = await this.getAccessToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'get_leads': {
          const filterType = args.filter_type as string;
          const filterValues = args.filter_values as string;
          if (!filterType || !filterValues) {
            return { content: [{ type: 'text', text: 'filter_type and filter_values are required' }], isError: true };
          }
          const params = new URLSearchParams({
            filterType,
            filterValues,
          });
          if (args.fields) params.set('fields', args.fields as string);
          const response = await fetch(`${this.restBaseUrl}/v1/leads.json?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get leads: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Marketo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_or_update_leads': {
          const leads = args.leads;
          if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return { content: [{ type: 'text', text: 'leads array is required and must not be empty' }], isError: true };
          }
          const body: Record<string, unknown> = { input: leads };
          if (args.action) body.action = args.action;
          if (args.lookup_field) body.lookupField = args.lookup_field;

          const response = await fetch(`${this.restBaseUrl}/v1/leads.json`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create/update leads: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Marketo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_campaigns': {
          const params = new URLSearchParams();
          if (typeof args.is_triggerable === 'boolean') params.set('isTriggerable', String(args.is_triggerable));
          if (args.program_name) params.set('programName', args.program_name as string);
          let url = `${this.restBaseUrl}/v1/campaigns.json`;
          if (params.toString()) url += `?${params.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list campaigns: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Marketo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_campaign': {
          const campaignId = args.campaign_id as number;
          if (campaignId === undefined) {
            return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
          }
          const response = await fetch(`${this.restBaseUrl}/v1/campaigns/${encodeURIComponent(String(campaignId))}.json`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get campaign: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Marketo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'request_campaign': {
          const campaignId = args.campaign_id as number;
          const leadIds = args.lead_ids as number[];
          if (campaignId === undefined || !leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return { content: [{ type: 'text', text: 'campaign_id and lead_ids array are required' }], isError: true };
          }
          const input = leadIds.map((id: number) => ({ id }));
          const response = await fetch(`${this.restBaseUrl}/v1/campaigns/${encodeURIComponent(String(campaignId))}/trigger.json`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ input }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to request campaign: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Marketo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_programs': {
          const params = new URLSearchParams();
          if (args.max_return !== undefined) params.set('maxReturn', String(args.max_return));
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          if (args.filter_type) params.set('filterType', args.filter_type as string);
          if (args.filter_values) params.set('filterValues', args.filter_values as string);
          let url = `${this.restBaseUrl}/asset/v1/programs.json`;
          if (params.toString()) url += `?${params.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list programs: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Marketo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_email_templates': {
          const params = new URLSearchParams();
          if (args.max_return !== undefined) params.set('maxReturn', String(args.max_return));
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          if (args.status) params.set('status', args.status as string);
          let url = `${this.restBaseUrl}/asset/v1/emailTemplates.json`;
          if (params.toString()) url += `?${params.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list email templates: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Marketo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_lead_activity': {
          const leadId = args.lead_id as number;
          if (leadId === undefined) {
            return { content: [{ type: 'text', text: 'lead_id is required' }], isError: true };
          }
          // Activities API requires a paging token first
          let pagingToken = args.next_page_token as string | undefined;
          if (!pagingToken) {
            // Get a since-datetime paging token (7 days back)
            const sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00Z';
            const tokenResponse = await fetch(
              `${this.restBaseUrl}/v1/activities/pagingtoken.json?sinceDatetime=${encodeURIComponent(sinceDate)}`,
              { method: 'GET', headers }
            );
            if (!tokenResponse.ok) {
              return { content: [{ type: 'text', text: `Failed to get paging token: ${tokenResponse.status} ${tokenResponse.statusText}` }], isError: true };
            }
            const tokenData = await tokenResponse.json() as { nextPageToken: string };
            pagingToken = tokenData.nextPageToken;
          }
          const params = new URLSearchParams({ nextPageToken: pagingToken, leadIds: String(leadId) });
          if (args.activity_type_ids) params.set('activityTypeIds', args.activity_type_ids as string);

          const response = await fetch(`${this.restBaseUrl}/v1/activities.json?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get lead activity: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Marketo returned non-JSON response (HTTP ${response.status})`); }
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
