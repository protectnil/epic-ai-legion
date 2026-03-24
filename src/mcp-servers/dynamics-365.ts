/**
 * Microsoft Dynamics 365 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — community implementation exists (srikanth-paladugula/mcp-dynamics365-server) but no Microsoft-published MCP server for Dynamics 365 CRM

// Dynamics 365 Web API v9.2 implements OData v4.
// Base URL format: https://{org}.crm.dynamics.com/api/data/v9.2
// The exact hostname varies by region:
//   North America:  {org}.crm.dynamics.com
//   Europe:         {org}.crm4.dynamics.com
//   Asia Pacific:   {org}.crm5.dynamics.com
//   Oceania:        {org}.crm6.dynamics.com
//   Japan:          {org}.crm7.dynamics.com
//   India:          {org}.crm8.dynamics.com
//   Canada:         {org}.crm3.dynamics.com
//   South America:  {org}.crm2.dynamics.com
//   UK:             {org}.crm11.dynamics.com
// Auth: OAuth2 Bearer token from Microsoft Entra ID (Azure AD)

import { ToolDefinition, ToolResult } from './types.js';

interface Dynamics365Config {
  accessToken: string;
  organizationUrl: string;
}

export class Dynamics365MCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: Dynamics365Config) {
    this.accessToken = config.accessToken;
    // Strip trailing slash and append Web API path
    const orgUrl = config.organizationUrl.replace(/\/$/, '');
    this.baseUrl = `${orgUrl}/api/data/v9.2`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_accounts',
        description: 'List account records from Dynamics 365. Accounts represent companies or organizations.',
        inputSchema: {
          type: 'object',
          properties: {
            select: {
              type: 'string',
              description: 'Comma-separated OData $select fields (e.g. name,accountnumber,telephone1,emailaddress1)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. statecode eq 0)',
            },
            orderby: {
              type: 'string',
              description: 'OData $orderby clause (e.g. name asc)',
            },
            top: {
              type: 'number',
              description: 'Maximum number of records to return (default: 50)',
            },
            skiptoken: {
              type: 'string',
              description: 'OData @odata.nextLink skiptoken for pagination',
            },
          },
        },
      },
      {
        name: 'list_contacts',
        description: 'List contact records from Dynamics 365. Contacts represent individual people.',
        inputSchema: {
          type: 'object',
          properties: {
            select: {
              type: 'string',
              description: 'Comma-separated OData $select fields (e.g. fullname,emailaddress1,telephone1)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. statecode eq 0)',
            },
            orderby: {
              type: 'string',
              description: 'OData $orderby clause (e.g. fullname asc)',
            },
            top: {
              type: 'number',
              description: 'Maximum number of records to return (default: 50)',
            },
            skiptoken: {
              type: 'string',
              description: 'OData @odata.nextLink skiptoken for pagination',
            },
          },
        },
      },
      {
        name: 'list_leads',
        description: 'List lead records from Dynamics 365. Leads are potential customers not yet qualified.',
        inputSchema: {
          type: 'object',
          properties: {
            select: {
              type: 'string',
              description: 'Comma-separated OData $select fields (e.g. fullname,emailaddress1,subject,statuscode)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. statuscode eq 1 for open leads)',
            },
            orderby: {
              type: 'string',
              description: 'OData $orderby clause',
            },
            top: {
              type: 'number',
              description: 'Maximum number of records to return (default: 50)',
            },
            skiptoken: {
              type: 'string',
              description: 'OData @odata.nextLink skiptoken for pagination',
            },
          },
        },
      },
      {
        name: 'list_opportunities',
        description: 'List opportunity records from Dynamics 365. Opportunities are qualified sales prospects.',
        inputSchema: {
          type: 'object',
          properties: {
            select: {
              type: 'string',
              description: 'Comma-separated OData $select fields (e.g. name,estimatedvalue,statecode,stepname,closeprobability)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. statecode eq 0 for open opportunities)',
            },
            orderby: {
              type: 'string',
              description: 'OData $orderby clause',
            },
            top: {
              type: 'number',
              description: 'Maximum number of records to return (default: 50)',
            },
            skiptoken: {
              type: 'string',
              description: 'OData @odata.nextLink skiptoken for pagination',
            },
          },
        },
      },
      {
        name: 'get_record',
        description: 'Retrieve a single record by entity set name and GUID',
        inputSchema: {
          type: 'object',
          properties: {
            entity_set: {
              type: 'string',
              description: 'OData entity set name (e.g. accounts, contacts, leads, opportunities, tasks)',
            },
            id: {
              type: 'string',
              description: 'Record GUID',
            },
            select: {
              type: 'string',
              description: 'Comma-separated OData $select fields to return',
            },
            expand: {
              type: 'string',
              description: 'OData $expand clause for related records (e.g. contact_customer_accounts)',
            },
          },
          required: ['entity_set', 'id'],
        },
      },
      {
        name: 'create_record',
        description: 'Create a new record in any Dynamics 365 entity (accounts, contacts, leads, opportunities, tasks)',
        inputSchema: {
          type: 'object',
          properties: {
            entity_set: {
              type: 'string',
              description: 'OData entity set name (e.g. accounts, contacts, leads, opportunities, tasks)',
            },
            data: {
              type: 'object',
              description: 'Record field values as key-value pairs using OData logical field names',
            },
          },
          required: ['entity_set', 'data'],
        },
      },
      {
        name: 'update_record',
        description: 'Update an existing Dynamics 365 record by entity set name and GUID using PATCH',
        inputSchema: {
          type: 'object',
          properties: {
            entity_set: {
              type: 'string',
              description: 'OData entity set name (e.g. accounts, contacts, leads, opportunities, tasks)',
            },
            id: {
              type: 'string',
              description: 'Record GUID to update',
            },
            data: {
              type: 'object',
              description: 'Fields to update as key-value pairs. Only include fields you want to change.',
            },
          },
          required: ['entity_set', 'id', 'data'],
        },
      },
      {
        name: 'list_tasks',
        description: 'List task activity records from Dynamics 365',
        inputSchema: {
          type: 'object',
          properties: {
            select: {
              type: 'string',
              description: 'Comma-separated OData $select fields (e.g. subject,description,statecode,scheduledend)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. statecode eq 0 for open tasks)',
            },
            orderby: {
              type: 'string',
              description: 'OData $orderby clause',
            },
            top: {
              type: 'number',
              description: 'Maximum number of records to return (default: 50)',
            },
            skiptoken: {
              type: 'string',
              description: 'OData @odata.nextLink skiptoken for pagination',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Prefer': 'odata.maxpagesize=100',
      };

      const buildListUrl = (entitySet: string, args: Record<string, unknown>): string => {
        const params = new URLSearchParams();
        if (args.select) params.set('$select', args.select as string);
        if (args.filter) params.set('$filter', args.filter as string);
        if (args.orderby) params.set('$orderby', args.orderby as string);
        params.set('$top', String((args.top as number) || 50));
        if (args.skiptoken) params.set('$skiptoken', args.skiptoken as string);
        return `${this.baseUrl}/${entitySet}?${params.toString()}`;
      };

      switch (name) {
        case 'list_accounts': {
          const response = await fetch(buildListUrl('accounts', args), { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list accounts: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Dynamics 365 returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_contacts': {
          const response = await fetch(buildListUrl('contacts', args), { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list contacts: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Dynamics 365 returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_leads': {
          const response = await fetch(buildListUrl('leads', args), { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list leads: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Dynamics 365 returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_opportunities': {
          const response = await fetch(buildListUrl('opportunities', args), { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list opportunities: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Dynamics 365 returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_record': {
          const entity_set = args.entity_set as string;
          const id = args.id as string;
          if (!entity_set || !id) {
            return { content: [{ type: 'text', text: 'entity_set and id are required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.select) params.set('$select', args.select as string);
          if (args.expand) params.set('$expand', args.expand as string);
          const qs = params.toString() ? `?${params.toString()}` : '';

          const response = await fetch(`${this.baseUrl}/${encodeURIComponent(entity_set)}(${encodeURIComponent(id)})${qs}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get record: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Dynamics 365 returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_record': {
          const entity_set = args.entity_set as string;
          const data = args.data as Record<string, unknown>;
          if (!entity_set || !data) {
            return { content: [{ type: 'text', text: 'entity_set and data are required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/${encodeURIComponent(entity_set)}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create record: ${response.status} ${response.statusText}` }], isError: true };
          }

          // 204 No Content on success — return location header
          const location = response.headers.get('OData-EntityId') || response.headers.get('Location') || '';
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, entityId: location }) }], isError: false };
        }

        case 'update_record': {
          const entity_set = args.entity_set as string;
          const id = args.id as string;
          const data = args.data as Record<string, unknown>;
          if (!entity_set || !id || !data) {
            return { content: [{ type: 'text', text: 'entity_set, id, and data are required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/${encodeURIComponent(entity_set)}(${encodeURIComponent(id)})`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update record: ${response.status} ${response.statusText}` }], isError: true };
          }

          // 204 No Content on success
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, updated_id: id }) }], isError: false };
        }

        case 'list_tasks': {
          const response = await fetch(buildListUrl('tasks', args), { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list tasks: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Dynamics 365 returned non-JSON response (HTTP ${response.status})`); }
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
