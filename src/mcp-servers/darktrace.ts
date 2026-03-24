/**
 * Darktrace MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Darktrace MCP server was found on GitHub or npmjs.
//
// Base URL: https://{instance}.darktrace.com  (or on-prem IP)
// Auth: HMAC-SHA1 — DTAPI-Token (public token) + DTAPI-Date (ISO timestamp) + DTAPISignature
//       Signature = HMAC-SHA1(privateToken, "{endpoint}\n{publicToken}\n{epochSeconds}")
// Docs: https://customerportal.darktrace.com/api (login required); community guide at
//       https://pdfcoffee.com/darktrace-api-guide-pdf-free.html
// Rate limits: Not publicly documented; timestamp must be within 30 minutes of appliance time

import { createHmac } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';

interface DarktraceConfig {
  /** Public token from Threat Visualizer → Admin → System Config → API Token */
  publicToken: string;
  /** Private token from the same page */
  privateToken: string;
  /** Fully-qualified instance hostname, e.g. "customer.cloud.darktrace.com" */
  instance: string;
  /** Override base URL (useful for on-prem appliances accessed by IP). */
  baseUrl?: string;
}

export class DarktraceMCPServer {
  private readonly baseUrl: string;
  private readonly publicToken: string;
  private readonly privateToken: string;

  constructor(config: DarktraceConfig) {
    this.baseUrl = config.baseUrl ?? `https://${config.instance}`;
    this.publicToken = config.publicToken;
    this.privateToken = config.privateToken;
  }

  static catalog() {
    return {
      name: 'darktrace',
      displayName: 'Darktrace',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: [
        'darktrace', 'ai analyst', 'model breach', 'anomaly', 'ndr',
        'network detection', 'device', 'antigena', 'respond', 'tag',
        'subnet', 'acknowledge', 'ztna',
      ],
      toolNames: [
        'list_model_breaches', 'get_model_breach', 'acknowledge_model_breach',
        'list_devices', 'get_device', 'get_device_connection_history',
        'get_ai_analyst_incidents', 'get_ai_analyst_incident',
        'list_tags', 'tag_device', 'untag_device',
        'list_subnets', 'get_system_status',
        'trigger_antigena_action',
      ],
      description: 'Darktrace NDR: query model breaches, AI Analyst incidents, manage devices, tags, Antigena response actions, and system status.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_model_breaches',
        description: 'List model breaches with filters for score threshold, acknowledgement status, and time range',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of breaches to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of breaches to skip for pagination (default: 0)',
            },
            minscore: {
              type: 'number',
              description: 'Minimum breach score 0.0–1.0 to filter results (default: no filter)',
            },
            acknowledged: {
              type: 'boolean',
              description: 'Filter by acknowledgement: true=only acknowledged, false=only unacknowledged',
            },
            starttime: {
              type: 'number',
              description: 'Start of time window in Unix milliseconds (default: 24 hours ago)',
            },
            endtime: {
              type: 'number',
              description: 'End of time window in Unix milliseconds (default: now)',
            },
          },
        },
      },
      {
        name: 'get_model_breach',
        description: 'Get full details of a single model breach by its pbid, including score, model, and device',
        inputSchema: {
          type: 'object',
          properties: {
            pbid: {
              type: 'number',
              description: 'Model breach ID (pbid) to retrieve',
            },
          },
          required: ['pbid'],
        },
      },
      {
        name: 'acknowledge_model_breach',
        description: 'Acknowledge or unacknowledge a model breach to mark it as reviewed by a human analyst',
        inputSchema: {
          type: 'object',
          properties: {
            pbid: {
              type: 'number',
              description: 'Model breach ID (pbid) to acknowledge or unacknowledge',
            },
            acknowledge: {
              type: 'boolean',
              description: 'true to acknowledge the breach, false to unacknowledge it (default: true)',
            },
          },
          required: ['pbid'],
        },
      },
      {
        name: 'list_devices',
        description: 'List monitored devices with optional hostname, IP, or label search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of devices to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of devices to skip for pagination (default: 0)',
            },
            query: {
              type: 'string',
              description: 'Filter devices by hostname, IP address, or label substring',
            },
          },
        },
      },
      {
        name: 'get_device',
        description: 'Get full profile for a single device by its Darktrace device ID (did), including IPs and hostnames',
        inputSchema: {
          type: 'object',
          properties: {
            did: {
              type: 'number',
              description: 'Darktrace device ID (did)',
            },
          },
          required: ['did'],
        },
      },
      {
        name: 'get_device_connection_history',
        description: 'Retrieve recent connection history for a device, showing peers, ports, and protocols',
        inputSchema: {
          type: 'object',
          properties: {
            did: {
              type: 'number',
              description: 'Darktrace device ID (did) whose connections to retrieve',
            },
            starttime: {
              type: 'number',
              description: 'Start of time window in Unix milliseconds (default: 1 hour ago)',
            },
            endtime: {
              type: 'number',
              description: 'End of time window in Unix milliseconds (default: now)',
            },
          },
          required: ['did'],
        },
      },
      {
        name: 'get_ai_analyst_incidents',
        description: 'List AI Analyst-generated incident summaries with optional time range and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of incidents to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of incidents to skip for pagination (default: 0)',
            },
            starttime: {
              type: 'number',
              description: 'Start of time window in Unix milliseconds',
            },
            endtime: {
              type: 'number',
              description: 'End of time window in Unix milliseconds',
            },
          },
        },
      },
      {
        name: 'get_ai_analyst_incident',
        description: 'Get the full narrative and evidence for a single AI Analyst incident by its incident ID',
        inputSchema: {
          type: 'object',
          properties: {
            incidentId: {
              type: 'string',
              description: 'AI Analyst incident ID (uuid string)',
            },
          },
          required: ['incidentId'],
        },
      },
      {
        name: 'list_tags',
        description: 'List all device tags defined in Darktrace, showing tag names, IDs, and descriptions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'tag_device',
        description: 'Apply an existing tag to a device by device ID and tag ID for grouping or policy',
        inputSchema: {
          type: 'object',
          properties: {
            did: {
              type: 'number',
              description: 'Darktrace device ID (did) to tag',
            },
            tagId: {
              type: 'number',
              description: 'Tag ID to apply (from list_tags)',
            },
          },
          required: ['did', 'tagId'],
        },
      },
      {
        name: 'untag_device',
        description: 'Remove a tag from a device by device ID and tag ID',
        inputSchema: {
          type: 'object',
          properties: {
            did: {
              type: 'number',
              description: 'Darktrace device ID (did) to untag',
            },
            tagId: {
              type: 'number',
              description: 'Tag ID to remove (from list_tags)',
            },
          },
          required: ['did', 'tagId'],
        },
      },
      {
        name: 'list_subnets',
        description: 'List all network subnets known to Darktrace with CIDR ranges and device counts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_system_status',
        description: 'Retrieve the Darktrace appliance system status including sensor health and data ingestion metrics',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'trigger_antigena_action',
        description: 'Trigger or cancel a Darktrace Antigena autonomous response action on a device',
        inputSchema: {
          type: 'object',
          properties: {
            did: {
              type: 'number',
              description: 'Darktrace device ID (did) to act on',
            },
            action: {
              type: 'string',
              description: 'Action type: block, enforce_pattern_of_life, quarantine (vendor-specific string)',
            },
            active: {
              type: 'boolean',
              description: 'true to activate the action, false to cancel it (default: true)',
            },
          },
          required: ['did', 'action'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_model_breaches':
          return await this.listModelBreaches(args);
        case 'get_model_breach':
          return await this.getModelBreach(args);
        case 'acknowledge_model_breach':
          return await this.acknowledgeModelBreach(args);
        case 'list_devices':
          return await this.listDevices(args);
        case 'get_device':
          return await this.getDevice(args);
        case 'get_device_connection_history':
          return await this.getDeviceConnectionHistory(args);
        case 'get_ai_analyst_incidents':
          return await this.getAIAnalystIncidents(args);
        case 'get_ai_analyst_incident':
          return await this.getAIAnalystIncident(args);
        case 'list_tags':
          return await this.listTags();
        case 'tag_device':
          return await this.tagDevice(args);
        case 'untag_device':
          return await this.untagDevice(args);
        case 'list_subnets':
          return await this.listSubnets();
        case 'get_system_status':
          return await this.getSystemStatus();
        case 'trigger_antigena_action':
          return await this.triggerAntigenAction(args);
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

  // ── Auth ──────────────────────────────────────────────────────────────────────

  /**
   * Build HMAC-SHA1 Authorization headers for the given endpoint path+query string.
   * Timestamp is computed once and shared between header and signature to eliminate
   * a race condition that would occur with two separate Date.now() calls.
   */
  private authHeaders(endpoint: string): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${endpoint}\n${this.publicToken}\n${timestamp}`;
    const signature = createHmac('sha1', this.privateToken).update(message).digest('hex');
    return {
      'DTAPI-Token': this.publicToken,
      'DTAPI-Date': String(timestamp),
      'DTAPISignature': signature,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async dtFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    return fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      ...options,
      headers: this.authHeaders(endpoint),
    });
  }

  // ── Response helper ───────────────────────────────────────────────────────────

  private truncate(data: unknown): ToolResult {
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async jsonOrError(res: Response): Promise<unknown> {
    if (!res.ok) throw new Error(`Darktrace API error: ${res.status} ${res.statusText}`);
    try {
      return await res.json();
    } catch {
      throw new Error(`Darktrace returned non-JSON response (HTTP ${res.status})`);
    }
  }

  // ── Tool implementations ──────────────────────────────────────────────────────

  private async listModelBreaches(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.minscore !== undefined) params.set('minscore', String(args.minscore));
    if (args.acknowledged !== undefined) params.set('acknowledged', String(args.acknowledged));
    if (args.starttime !== undefined) params.set('starttime', String(args.starttime));
    if (args.endtime !== undefined) params.set('endtime', String(args.endtime));

    const endpoint = `/modelbreaches?${params.toString()}`;
    return this.truncate(await this.jsonOrError(await this.dtFetch(endpoint)));
  }

  private async getModelBreach(args: Record<string, unknown>): Promise<ToolResult> {
    const pbid = args.pbid;
    if (pbid === undefined) throw new Error('pbid is required');
    const endpoint = `/modelbreaches/${encodeURIComponent(String(pbid))}`;
    return this.truncate(await this.jsonOrError(await this.dtFetch(endpoint)));
  }

  private async acknowledgeModelBreach(args: Record<string, unknown>): Promise<ToolResult> {
    const pbid = args.pbid;
    if (pbid === undefined) throw new Error('pbid is required');
    const acknowledge = (args.acknowledge as boolean) ?? true;
    const endpoint = `/modelbreaches/${encodeURIComponent(String(pbid))}/acknowledge`;
    const res = await this.dtFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ acknowledge }),
    });
    return this.truncate(await this.jsonOrError(res));
  }

  private async listDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.query) params.set('query', String(args.query));

    const endpoint = `/devices?${params.toString()}`;
    return this.truncate(await this.jsonOrError(await this.dtFetch(endpoint)));
  }

  private async getDevice(args: Record<string, unknown>): Promise<ToolResult> {
    const did = args.did;
    if (did === undefined) throw new Error('did is required');
    const endpoint = `/devices?did=${encodeURIComponent(String(did))}`;
    return this.truncate(await this.jsonOrError(await this.dtFetch(endpoint)));
  }

  private async getDeviceConnectionHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const did = args.did;
    if (did === undefined) throw new Error('did is required');
    const now = Date.now();
    const params = new URLSearchParams();
    params.set('did', String(did));
    params.set('starttime', String((args.starttime as number) ?? now - 3_600_000));
    params.set('endtime', String((args.endtime as number) ?? now));

    const endpoint = `/connections?${params.toString()}`;
    return this.truncate(await this.jsonOrError(await this.dtFetch(endpoint)));
  }

  private async getAIAnalystIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.starttime !== undefined) params.set('starttime', String(args.starttime));
    if (args.endtime !== undefined) params.set('endtime', String(args.endtime));

    const endpoint = `/aianalyst/incidents?${params.toString()}`;
    return this.truncate(await this.jsonOrError(await this.dtFetch(endpoint)));
  }

  private async getAIAnalystIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incidentId as string;
    if (!incidentId) throw new Error('incidentId is required');
    const endpoint = `/aianalyst/incidents/${encodeURIComponent(incidentId)}`;
    return this.truncate(await this.jsonOrError(await this.dtFetch(endpoint)));
  }

  private async listTags(): Promise<ToolResult> {
    return this.truncate(await this.jsonOrError(await this.dtFetch('/tags')));
  }

  private async tagDevice(args: Record<string, unknown>): Promise<ToolResult> {
    const did = args.did;
    const tagId = args.tagId;
    if (did === undefined) throw new Error('did is required');
    if (tagId === undefined) throw new Error('tagId is required');

    const endpoint = `/tags/entities`;
    const res = await this.dtFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ did, tagId }),
    });
    return this.truncate(await this.jsonOrError(res));
  }

  private async untagDevice(args: Record<string, unknown>): Promise<ToolResult> {
    const did = args.did;
    const tagId = args.tagId;
    if (did === undefined) throw new Error('did is required');
    if (tagId === undefined) throw new Error('tagId is required');

    const endpoint = `/tags/entities?did=${encodeURIComponent(String(did))}&tagId=${encodeURIComponent(String(tagId))}`;
    const res = await this.dtFetch(endpoint, { method: 'DELETE' });
    return this.truncate(await this.jsonOrError(res));
  }

  private async listSubnets(): Promise<ToolResult> {
    return this.truncate(await this.jsonOrError(await this.dtFetch('/subnets')));
  }

  private async getSystemStatus(): Promise<ToolResult> {
    return this.truncate(await this.jsonOrError(await this.dtFetch('/status')));
  }

  private async triggerAntigenAction(args: Record<string, unknown>): Promise<ToolResult> {
    const did = args.did;
    const action = args.action as string;
    if (did === undefined) throw new Error('did is required');
    if (!action) throw new Error('action is required');
    const active = (args.active as boolean) ?? true;

    const endpoint = `/antigena/host`;
    const res = await this.dtFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ did, action, active }),
    });
    return this.truncate(await this.jsonOrError(res));
  }
}
