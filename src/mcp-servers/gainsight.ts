/**
 * Gainsight MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. Pipedream hosts a Gainsight MCP but it is not
// self-hostable and is not vendor-published. No official Gainsight MCP server on GitHub.
//
// NOTE: Gainsight NXT uses per-API-type subdomains rather than a single tenant subdomain:
//   Company/Relationship API → https://companyapi.gainsightcloud.com
//   People API               → https://personapi.gainsightcloud.com
//   Custom Object API        → https://customobjectapi.gainsightcloud.com
//   Cockpit (CTAs) API       → https://{{tenant}}.gainsightcloud.com  (standard tenant subdomain)
//   Success Plans API        → https://{{tenant}}.gainsightcloud.com  (standard tenant subdomain)
// Pass the full base URL for the API type you need via the domainUrl or tenantUrl config fields.
// All requests use the `accesskey` header for authentication (key does not expire).
//
// Base URL: Per-subdomain (see above)
// Auth: accesskey header (not Bearer, not Basic — just "accesskey: {value}")
// Docs: https://support.gainsight.com/gainsight_nxt/API_and_Developer_Docs/About/API_Documentation_Overview
// Rate limits: 100 synchronous API calls/min; 50,000 API calls/day

import { ToolDefinition, ToolResult } from './types.js';

interface GainsightConfig {
  accessKey: string;
  /** Base URL for data/metadata APIs, e.g. https://companyapi.gainsightcloud.com */
  domainUrl: string;
  /** Base URL for CTA and Success Plan APIs using tenant subdomain, e.g. https://mycompany.gainsightcloud.com */
  tenantUrl?: string;
}

export class GainsightMCPServer {
  private readonly accessKey: string;
  private readonly domainUrl: string;
  private readonly tenantUrl: string;

  constructor(config: GainsightConfig) {
    this.accessKey = config.accessKey;
    this.domainUrl = config.domainUrl.replace(/\/$/, '');
    this.tenantUrl = (config.tenantUrl ?? config.domainUrl).replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'gainsight',
      displayName: 'Gainsight',
      version: '1.0.0',
      category: 'crm',
      keywords: [
        'gainsight', 'customer success', 'cs', 'cta', 'call to action', 'cockpit',
        'success plan', 'health score', 'churn', 'nps', 'renewal', 'company',
        'account', 'person', 'contact', 'timeline', 'activity', 'playbook',
        'custom object', 'mda', 'matrix data architecture',
      ],
      toolNames: [
        'list_objects', 'get_object_metadata',
        'query_object', 'upsert_records', 'delete_records',
        'list_ctas', 'get_cta', 'create_cta', 'update_cta', 'close_cta',
        'list_success_plans', 'get_success_plan', 'create_success_plan',
      ],
      description: 'Customer success platform: manage companies, CTAs, success plans, timeline activities, and custom objects via Gainsight NXT REST APIs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_objects',
        description: 'List all available objects (Company, Person, custom objects) defined in the Gainsight tenant metadata',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_object_metadata',
        description: 'Retrieve field definitions and schema for a specific Gainsight object (e.g. Company, Person, or a custom object)',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Name of the Gainsight object to inspect (e.g. Company, Person)',
            },
          },
          required: ['object_name'],
        },
      },
      {
        name: 'query_object',
        description: 'Query records from a Gainsight object using optional OData-style filters, field selection, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Name of the Gainsight object to query (e.g. Company, Person, or custom object name)',
            },
            select: {
              type: 'string',
              description: 'Comma-separated list of fields to return (default: all fields)',
            },
            filter: {
              type: 'string',
              description: 'OData filter expression (e.g. Name eq \'Acme\' or HealthScore gt 70)',
            },
            order_by: {
              type: 'string',
              description: 'Field to sort by, optionally followed by asc or desc (e.g. Name asc)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of records per page (max 2000, default: 100)',
            },
          },
          required: ['object_name'],
        },
      },
      {
        name: 'upsert_records',
        description: 'Insert or update records in a Gainsight object, matched on specified key fields; supports bulk upsert up to 1000 records',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Name of the Gainsight object to upsert into (e.g. Company)',
            },
            records: {
              type: 'array',
              description: 'Array of record objects to upsert (max 1000 per call)',
              items: { type: 'object' },
            },
            keys: {
              type: 'array',
              description: 'Field names used as match keys for the upsert logic (e.g. ["Name"] or ["Gsid"])',
              items: { type: 'string' },
            },
          },
          required: ['object_name', 'records', 'keys'],
        },
      },
      {
        name: 'delete_records',
        description: 'Delete records from a Gainsight object by their GSID values; use with care — deletion is permanent',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Name of the Gainsight object (e.g. Company)',
            },
            ids: {
              type: 'array',
              description: 'Array of record GSIDs to delete',
              items: { type: 'string' },
            },
          },
          required: ['object_name', 'ids'],
        },
      },
      {
        name: 'list_ctas',
        description: 'List Calls-to-Action (CTAs) in Cockpit with optional filters for status, type, assignee, and company',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by CTA status: Open, Closed, Snoozed (default: Open)',
            },
            cta_type: {
              type: 'string',
              description: 'Filter by CTA type: Risk, Expansion, Lifecycle, Activity, Objective',
            },
            assignee_gsid: {
              type: 'string',
              description: 'Filter by assignee GSID (Customer Success Manager)',
            },
            company_gsid: {
              type: 'string',
              description: 'Filter by company GSID to return only CTAs for that account',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of CTAs per page (max 100, default: 25)',
            },
          },
        },
      },
      {
        name: 'get_cta',
        description: 'Get full details of a specific Call-to-Action by its GSID, including tasks, comments, and associated company',
        inputSchema: {
          type: 'object',
          properties: {
            cta_gsid: {
              type: 'string',
              description: 'GSID of the CTA to retrieve',
            },
          },
          required: ['cta_gsid'],
        },
      },
      {
        name: 'create_cta',
        description: 'Create a new Call-to-Action (CTA) in Gainsight Cockpit for a specific company and assignee',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Title or name of the CTA',
            },
            company_gsid: {
              type: 'string',
              description: 'GSID of the company this CTA is associated with',
            },
            cta_type_name: {
              type: 'string',
              description: 'CTA type name (e.g. Risk, Expansion, Lifecycle, Activity, Objective)',
            },
            assignee_gsid: {
              type: 'string',
              description: 'GSID of the user assigned to this CTA',
            },
            due_date: {
              type: 'string',
              description: 'Due date in ISO 8601 format (e.g. 2026-06-30)',
            },
            priority: {
              type: 'string',
              description: 'Priority level: High, Medium, Low (default: Medium)',
            },
            reason: {
              type: 'string',
              description: 'Reason or description for the CTA',
            },
          },
          required: ['name', 'company_gsid', 'cta_type_name'],
        },
      },
      {
        name: 'update_cta',
        description: 'Update an existing CTA: change assignee, due date, priority, status, or add comments',
        inputSchema: {
          type: 'object',
          properties: {
            cta_gsid: {
              type: 'string',
              description: 'GSID of the CTA to update',
            },
            assignee_gsid: {
              type: 'string',
              description: 'Updated assignee GSID',
            },
            due_date: {
              type: 'string',
              description: 'Updated due date in ISO 8601 format',
            },
            priority: {
              type: 'string',
              description: 'Updated priority: High, Medium, Low',
            },
            status: {
              type: 'string',
              description: 'Updated status: Open, Closed, Snoozed',
            },
            name: {
              type: 'string',
              description: 'Updated CTA name/title',
            },
          },
          required: ['cta_gsid'],
        },
      },
      {
        name: 'close_cta',
        description: 'Close a CTA by setting its status to Closed with an optional close reason',
        inputSchema: {
          type: 'object',
          properties: {
            cta_gsid: {
              type: 'string',
              description: 'GSID of the CTA to close',
            },
            close_reason: {
              type: 'string',
              description: 'Reason for closing the CTA (e.g. Resolved, No Action Required)',
            },
          },
          required: ['cta_gsid'],
        },
      },
      {
        name: 'list_success_plans',
        description: 'List Success Plans for all companies or a specific company, with optional status filters',
        inputSchema: {
          type: 'object',
          properties: {
            company_gsid: {
              type: 'string',
              description: 'Filter Success Plans by company GSID',
            },
            status: {
              type: 'string',
              description: 'Filter by status: Active, Completed, Draft (default: Active)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Success plans per page (max 1000, default: 25)',
            },
          },
        },
      },
      {
        name: 'get_success_plan',
        description: 'Get full details of a specific Success Plan by GSID, including objectives and tasks',
        inputSchema: {
          type: 'object',
          properties: {
            plan_gsid: {
              type: 'string',
              description: 'GSID of the Success Plan to retrieve',
            },
          },
          required: ['plan_gsid'],
        },
      },
      {
        name: 'create_success_plan',
        description: 'Create a new Success Plan for a company with a defined template, name, and due date',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the Success Plan',
            },
            company_gsid: {
              type: 'string',
              description: 'GSID of the company this Success Plan belongs to',
            },
            template_id: {
              type: 'string',
              description: 'ID of the Success Plan template to use (from admin configuration)',
            },
            due_date: {
              type: 'string',
              description: 'Target completion date in ISO 8601 format (e.g. 2026-12-31)',
            },
            assignee_gsid: {
              type: 'string',
              description: 'GSID of the user responsible for this Success Plan',
            },
          },
          required: ['name', 'company_gsid'],
        },
      },
    ];
  }

  private get dataHeaders(): Record<string, string> {
    return {
      accesskey: this.accessKey,
      'Content-Type': 'application/json',
    };
  }

  private truncate(text: string): string {
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async dataGet(path: string): Promise<ToolResult> {
    const response = await fetch(`${this.domainUrl}${path}`, {
      method: 'GET',
      headers: this.dataHeaders,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Gainsight API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async dataPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await fetch(`${this.domainUrl}${path}`, {
      method: 'PUT',
      headers: this.dataHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Gainsight API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async dataDelete(path: string, body: unknown): Promise<ToolResult> {
    const response = await fetch(`${this.domainUrl}${path}`, {
      method: 'DELETE',
      headers: this.dataHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Gainsight API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { success: true }; }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async tenantGet(path: string): Promise<ToolResult> {
    const response = await fetch(`${this.tenantUrl}${path}`, {
      method: 'GET',
      headers: this.dataHeaders,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Gainsight API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async tenantPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await fetch(`${this.tenantUrl}${path}`, {
      method: 'POST',
      headers: this.dataHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Gainsight API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async tenantPatch(path: string, body: unknown): Promise<ToolResult> {
    const response = await fetch(`${this.tenantUrl}${path}`, {
      method: 'PATCH',
      headers: this.dataHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Gainsight API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { success: true }; }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async queryObject(args: Record<string, unknown>): Promise<ToolResult> {
    const objectName = args.object_name as string;
    if (!objectName) return { content: [{ type: 'text', text: 'object_name is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.select) params.set('select', args.select as string);
    if (args.filter) params.set('filter', args.filter as string);
    if (args.order_by) params.set('orderby', args.order_by as string);
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('pageSize', String(args.page_size));
    const qs = params.toString() ? `?${params}` : '';
    return this.dataGet(`/v1/data/objects/${encodeURIComponent(objectName)}${qs}`);
  }

  private async upsertRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const objectName = args.object_name as string;
    const records = args.records as unknown[];
    const keys = args.keys as string[];
    if (!objectName || !records || !Array.isArray(records) || !keys || !Array.isArray(keys) || keys.length === 0) {
      return { content: [{ type: 'text', text: 'object_name, records, and keys are required' }], isError: true };
    }
    const keysParam = keys.join(',');
    return this.dataPut(`/v1/data/objects/${encodeURIComponent(objectName)}?keys=${encodeURIComponent(keysParam)}`, { records });
  }

  private async deleteRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const objectName = args.object_name as string;
    const ids = args.ids as string[];
    if (!objectName || !ids || !Array.isArray(ids) || ids.length === 0) {
      return { content: [{ type: 'text', text: 'object_name and ids are required' }], isError: true };
    }
    return this.dataDelete(`/v1/data/objects/${encodeURIComponent(objectName)}`, { ids });
  }

  private async getObjectMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    const objectName = args.object_name as string;
    if (!objectName) return { content: [{ type: 'text', text: 'object_name is required' }], isError: true };
    return this.dataGet(`/v1/meta/services/objects/${encodeURIComponent(objectName)}/fields`);
  }

  private async listObjects(): Promise<ToolResult> {
    return this.dataGet(`/v1/meta/services/objects`);
  }

  private async listCtas(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.set('status', args.status as string);
    if (args.cta_type) params.set('ctaType', args.cta_type as string);
    if (args.assignee_gsid) params.set('assigneeId', args.assignee_gsid as string);
    if (args.company_gsid) params.set('companyId', args.company_gsid as string);
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('pageSize', String(args.page_size));
    const qs = params.toString() ? `?${params}` : '';
    return this.tenantGet(`/v1/data/cta${qs}`);
  }

  private async getCta(args: Record<string, unknown>): Promise<ToolResult> {
    const gsid = args.cta_gsid as string;
    if (!gsid) return { content: [{ type: 'text', text: 'cta_gsid is required' }], isError: true };
    return this.tenantGet(`/v1/data/cta/${encodeURIComponent(gsid)}`);
  }

  private async createCta(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    const companyGsid = args.company_gsid as string;
    const ctaTypeName = args.cta_type_name as string;
    if (!name || !companyGsid || !ctaTypeName) {
      return { content: [{ type: 'text', text: 'name, company_gsid, and cta_type_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name, companyId: companyGsid, ctaTypeName };
    if (args.assignee_gsid) body.assigneeId = args.assignee_gsid;
    if (args.due_date) body.dueDate = args.due_date;
    if (args.priority) body.priority = args.priority;
    if (args.reason) body.reason = args.reason;
    return this.tenantPost(`/v1/data/cta`, body);
  }

  private async updateCta(args: Record<string, unknown>): Promise<ToolResult> {
    const gsid = args.cta_gsid as string;
    if (!gsid) return { content: [{ type: 'text', text: 'cta_gsid is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.assignee_gsid) body.assigneeId = args.assignee_gsid;
    if (args.due_date) body.dueDate = args.due_date;
    if (args.priority) body.priority = args.priority;
    if (args.status) body.status = args.status;
    if (args.name) body.name = args.name;
    return this.tenantPatch(`/v1/data/cta/${encodeURIComponent(gsid)}`, body);
  }

  private async closeCta(args: Record<string, unknown>): Promise<ToolResult> {
    const gsid = args.cta_gsid as string;
    if (!gsid) return { content: [{ type: 'text', text: 'cta_gsid is required' }], isError: true };
    const body: Record<string, unknown> = { status: 'Closed' };
    if (args.close_reason) body.closeReason = args.close_reason;
    return this.tenantPatch(`/v1/data/cta/${encodeURIComponent(gsid)}`, body);
  }

  private async listSuccessPlans(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.company_gsid) params.set('companyId', args.company_gsid as string);
    if (args.status) params.set('status', args.status as string);
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('pageSize', String(args.page_size));
    const qs = params.toString() ? `?${params}` : '';
    return this.tenantGet(`/v1/data/successplan${qs}`);
  }

  private async getSuccessPlan(args: Record<string, unknown>): Promise<ToolResult> {
    const gsid = args.plan_gsid as string;
    if (!gsid) return { content: [{ type: 'text', text: 'plan_gsid is required' }], isError: true };
    return this.tenantGet(`/v1/data/successplan/${encodeURIComponent(gsid)}`);
  }

  private async createSuccessPlan(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    const companyGsid = args.company_gsid as string;
    if (!name || !companyGsid) {
      return { content: [{ type: 'text', text: 'name and company_gsid are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name, companyId: companyGsid };
    if (args.template_id) body.templateId = args.template_id;
    if (args.due_date) body.dueDate = args.due_date;
    if (args.assignee_gsid) body.assigneeId = args.assignee_gsid;
    return this.tenantPost(`/v1/data/successplan`, body);
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_objects':        return await this.listObjects();
        case 'get_object_metadata': return await this.getObjectMetadata(args);
        case 'query_object':        return await this.queryObject(args);
        case 'upsert_records':      return await this.upsertRecords(args);
        case 'delete_records':      return await this.deleteRecords(args);
        case 'list_ctas':           return await this.listCtas(args);
        case 'get_cta':             return await this.getCta(args);
        case 'create_cta':          return await this.createCta(args);
        case 'update_cta':          return await this.updateCta(args);
        case 'close_cta':           return await this.closeCta(args);
        case 'list_success_plans':  return await this.listSuccessPlans(args);
        case 'get_success_plan':    return await this.getSuccessPlan(args);
        case 'create_success_plan': return await this.createSuccessPlan(args);
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
