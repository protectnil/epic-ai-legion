/**
 * incident.io MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/incident-io/incidentio-mcp-golang — transport: stdio, auth: API key env var
// Actively maintained (last commit March 2026). Go binary; requires Go runtime or pre-built binary.
// Our adapter covers: 18 tools (incidents, actions, alerts, severities, roles, statuses, types, workflows, catalog).
// Vendor MCP covers: full incident.io API. Use vendor MCP when Go runtime is available.
// Recommendation: Use this adapter for air-gapped TypeScript-only deployments.
//
// Base URL: https://api.incident.io/v2
// Auth: Authorization: Bearer {api_key}
// Docs: https://api-docs.incident.io/
// Rate limits: Not publicly documented. Avoid bulk polling; use pagination cursors.

import { ToolDefinition, ToolResult } from './types.js';

interface IncidentIoConfig {
  apiKey: string;
  baseUrl?: string;
}

export class IncidentIoMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: IncidentIoConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.incident.io').replace(/\/$/, '') + '/v2';
  }

  static catalog() {
    return {
      name: 'incident-io',
      displayName: 'incident.io',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: ['incident', 'incident-io', 'on-call', 'severity', 'postmortem', 'alert', 'action', 'escalation', 'workflow', 'status-page'],
      toolNames: [
        'list_incidents', 'get_incident', 'create_incident', 'update_incident',
        'list_incident_updates', 'create_incident_update',
        'list_actions', 'create_action', 'update_action',
        'list_alerts', 'get_alert',
        'list_severities', 'get_severity',
        'list_incident_roles',
        'list_incident_statuses',
        'list_incident_types',
        'list_workflows',
        'list_catalog_types',
      ],
      description: 'incident.io: create and manage incidents, post updates, triage actions, query alerts, severities, roles, workflows, and catalog.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_incidents',
        description: 'List incidents with optional filters for status, severity, incident type, and cursor-based pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: triage, active, post_incident, learning, closed',
            },
            severity_id: { type: 'string', description: 'Filter by severity ID' },
            incident_type_id: { type: 'string', description: 'Filter by incident type ID' },
            page_size: { type: 'number', description: 'Results per page (max 25, default: 25)' },
            after: { type: 'string', description: 'Pagination cursor — return results after this incident ID' },
          },
        },
      },
      {
        name: 'get_incident',
        description: 'Retrieve full details of a single incident.io incident by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: { type: 'string', description: 'The incident.io incident ID' },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'create_incident',
        description: 'Create a new incident in incident.io with name, severity, mode, and optional summary',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name / title of the incident' },
            summary: { type: 'string', description: 'Brief description of the incident' },
            severity_id: { type: 'string', description: 'ID of the severity level to assign (from list_severities)' },
            incident_type_id: { type: 'string', description: 'ID of the incident type (from list_incident_types)' },
            mode: {
              type: 'string',
              description: 'Incident mode: real (default), test, or tutorial',
            },
            idempotency_key: { type: 'string', description: 'Unique key to prevent duplicate creation (UUID recommended)' },
          },
          required: ['name', 'idempotency_key'],
        },
      },
      {
        name: 'update_incident',
        description: 'Update an existing incident — change name, summary, severity, or incident type',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: { type: 'string', description: 'The incident.io incident ID to update' },
            name: { type: 'string', description: 'New name / title for the incident' },
            summary: { type: 'string', description: 'Updated description of the incident' },
            severity_id: { type: 'string', description: 'New severity level ID to assign' },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'list_incident_updates',
        description: 'List timeline updates posted to a specific incident, ordered chronologically',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: { type: 'string', description: 'The incident.io incident ID' },
            page_size: { type: 'number', description: 'Results per page (default: 25)' },
            after: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'create_incident_update',
        description: 'Post a new status update to an incident timeline with message and optional new status',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: { type: 'string', description: 'The incident.io incident ID to update' },
            message: { type: 'string', description: 'Update message to post to the incident timeline' },
            new_incident_status_id: { type: 'string', description: 'Transition the incident to this status ID (from list_incident_statuses)' },
            idempotency_key: { type: 'string', description: 'Unique key to prevent duplicate update creation' },
          },
          required: ['incident_id', 'message', 'idempotency_key'],
        },
      },
      {
        name: 'list_actions',
        description: 'List follow-up actions across all incidents or filtered by incident ID and completion status',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: { type: 'string', description: 'Filter actions for a specific incident' },
            is_follow_up: { type: 'boolean', description: 'Filter by follow-up flag (true = post-incident follow-ups only)' },
            page_size: { type: 'number', description: 'Results per page (default: 25)' },
            after: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
        },
      },
      {
        name: 'create_action',
        description: 'Create a follow-up action item for an incident with description, assignee, and due date',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: { type: 'string', description: 'The incident.io incident ID to attach this action to' },
            description: { type: 'string', description: 'Description of the action to take' },
            assignee_id: { type: 'string', description: 'ID of the user to assign this action to' },
            status: { type: 'string', description: 'Action status: outstanding or completed (default: outstanding)' },
            idempotency_key: { type: 'string', description: 'Unique key to prevent duplicate action creation' },
          },
          required: ['incident_id', 'description', 'idempotency_key'],
        },
      },
      {
        name: 'update_action',
        description: 'Update an existing action item — change description, assignee, or completion status',
        inputSchema: {
          type: 'object',
          properties: {
            action_id: { type: 'string', description: 'The action ID to update' },
            description: { type: 'string', description: 'Updated description of the action' },
            status: { type: 'string', description: 'New status: outstanding or completed' },
            assignee_id: { type: 'string', description: 'New assignee user ID' },
          },
          required: ['action_id'],
        },
      },
      {
        name: 'list_alerts',
        description: 'List alerts routed to incidents with optional filters for status and incident ID',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: { type: 'string', description: 'Filter alerts linked to a specific incident' },
            page_size: { type: 'number', description: 'Results per page (default: 25)' },
            after: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Retrieve full details of a single alert by its ID including source, payload, and linked incidents',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: { type: 'string', description: 'The incident.io alert ID' },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'list_severities',
        description: 'List all configured severity levels in incident.io with names, descriptions, and IDs',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_severity',
        description: 'Retrieve details for a specific severity level by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            severity_id: { type: 'string', description: 'The severity ID to retrieve' },
          },
          required: ['severity_id'],
        },
      },
      {
        name: 'list_incident_roles',
        description: 'List all incident roles defined in incident.io (e.g. incident lead, communications lead)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_incident_statuses',
        description: 'List all incident status definitions in incident.io with IDs, names, and category mappings',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_incident_types',
        description: 'List all incident types configured in incident.io with descriptions and default severity',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_workflows',
        description: 'List automation workflows configured in incident.io with trigger conditions and actions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_catalog_types',
        description: 'List all catalog types in the incident.io catalog (services, teams, customers, etc.)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_incidents':
          return await this.listIncidents(args);
        case 'get_incident':
          return await this.getIncident(args);
        case 'create_incident':
          return await this.createIncident(args);
        case 'update_incident':
          return await this.updateIncident(args);
        case 'list_incident_updates':
          return await this.listIncidentUpdates(args);
        case 'create_incident_update':
          return await this.createIncidentUpdate(args);
        case 'list_actions':
          return await this.listActions(args);
        case 'create_action':
          return await this.createAction(args);
        case 'update_action':
          return await this.updateAction(args);
        case 'list_alerts':
          return await this.listAlerts(args);
        case 'get_alert':
          return await this.getAlert(args);
        case 'list_severities':
          return await this.listSeverities();
        case 'get_severity':
          return await this.getSeverity(args);
        case 'list_incident_roles':
          return await this.listIncidentRoles();
        case 'list_incident_statuses':
          return await this.listIncidentStatuses();
        case 'list_incident_types':
          return await this.listIncidentTypes();
        case 'list_workflows':
          return await this.listWorkflows();
        case 'list_catalog_types':
          return await this.listCatalogTypes();
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

  // ── Private helpers ──────────────────────────────────────────────────────────

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async apiGet(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}${params && params.toString() ? `?${params}` : ''}`;
    const response = await fetch(url, { headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.append('status[one_of][]', args.status as string);
    if (args.severity_id) params.append('severity_id[one_of][]', args.severity_id as string);
    if (args.incident_type_id) params.append('incident_type_id[one_of][]', args.incident_type_id as string);
    if (args.page_size) params.set('page_size', String(args.page_size));
    if (args.after) params.set('after', args.after as string);
    return this.apiGet('/incidents', params);
  }

  private async getIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.incident_id as string;
    if (!id) return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
    return this.apiGet(`/incidents/${encodeURIComponent(id)}`);
  }

  private async createIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    const idempotencyKey = args.idempotency_key as string;
    if (!name || !idempotencyKey) {
      return { content: [{ type: 'text', text: 'name and idempotency_key are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name,
      mode: (args.mode as string) ?? 'real',
      idempotency_key: idempotencyKey,
    };
    if (args.summary) body.summary = args.summary;
    if (args.severity_id) body.severity = { id: args.severity_id };
    if (args.incident_type_id) body.incident_type = { id: args.incident_type_id };
    return this.apiPost('/incidents', body);
  }

  private async updateIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.incident_id as string;
    if (!id) return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.summary) body.summary = args.summary;
    if (args.severity_id) body.severity = { id: args.severity_id };
    return this.apiPatch(`/incidents/${encodeURIComponent(id)}`, body);
  }

  private async listIncidentUpdates(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.incident_id as string;
    if (!id) return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.page_size) params.set('page_size', String(args.page_size));
    if (args.after) params.set('after', args.after as string);
    return this.apiGet(`/incident_updates?incident_id=${encodeURIComponent(id)}`, params);
  }

  private async createIncidentUpdate(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    const message = args.message as string;
    const idempotencyKey = args.idempotency_key as string;
    if (!incidentId || !message || !idempotencyKey) {
      return { content: [{ type: 'text', text: 'incident_id, message, and idempotency_key are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      incident_id: incidentId,
      message,
      idempotency_key: idempotencyKey,
    };
    if (args.new_incident_status_id) body.new_incident_status = { id: args.new_incident_status_id };
    return this.apiPost('/incident_updates', body);
  }

  private async listActions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.incident_id) params.set('incident_id', args.incident_id as string);
    if (args.is_follow_up !== undefined) params.set('is_follow_up', String(args.is_follow_up));
    if (args.page_size) params.set('page_size', String(args.page_size));
    if (args.after) params.set('after', args.after as string);
    return this.apiGet('/actions', params);
  }

  private async createAction(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    const description = args.description as string;
    const idempotencyKey = args.idempotency_key as string;
    if (!incidentId || !description || !idempotencyKey) {
      return { content: [{ type: 'text', text: 'incident_id, description, and idempotency_key are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      incident_id: incidentId,
      description,
      status: (args.status as string) ?? 'outstanding',
      idempotency_key: idempotencyKey,
    };
    if (args.assignee_id) body.assignee = { id: args.assignee_id };
    return this.apiPost('/actions', body);
  }

  private async updateAction(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.action_id as string;
    if (!id) return { content: [{ type: 'text', text: 'action_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.description) body.description = args.description;
    if (args.status) body.status = args.status;
    if (args.assignee_id) body.assignee = { id: args.assignee_id };
    return this.apiPatch(`/actions/${encodeURIComponent(id)}`, body);
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.incident_id) params.set('incident_id', args.incident_id as string);
    if (args.page_size) params.set('page_size', String(args.page_size));
    if (args.after) params.set('after', args.after as string);
    return this.apiGet('/alerts', params);
  }

  private async getAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.alert_id as string;
    if (!id) return { content: [{ type: 'text', text: 'alert_id is required' }], isError: true };
    return this.apiGet(`/alerts/${encodeURIComponent(id)}`);
  }

  private async listSeverities(): Promise<ToolResult> {
    return this.apiGet('/severities');
  }

  private async getSeverity(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.severity_id as string;
    if (!id) return { content: [{ type: 'text', text: 'severity_id is required' }], isError: true };
    return this.apiGet(`/severities/${encodeURIComponent(id)}`);
  }

  private async listIncidentRoles(): Promise<ToolResult> {
    return this.apiGet('/incident_roles');
  }

  private async listIncidentStatuses(): Promise<ToolResult> {
    return this.apiGet('/incident_statuses');
  }

  private async listIncidentTypes(): Promise<ToolResult> {
    return this.apiGet('/incident_types');
  }

  private async listWorkflows(): Promise<ToolResult> {
    return this.apiGet('/workflows');
  }

  private async listCatalogTypes(): Promise<ToolResult> {
    return this.apiGet('/catalog_types');
  }
}
