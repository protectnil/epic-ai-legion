/**
 * Darktrace MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

import * as crypto from 'crypto';

interface DarktraceConfig {
  publicToken: string;
  privateToken: string;
  instance: string;
  baseUrl?: string;
}

export class DarktraceMCPServer {
  private readonly baseUrl: string;
  private readonly publicToken: string;
  private readonly privateToken: string;

  constructor(config: DarktraceConfig) {
    this.baseUrl = config.baseUrl || `https://${config.instance}.darktrace.com`;
    this.publicToken = config.publicToken;
    this.privateToken = config.privateToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_model_breaches',
        description: 'List model breaches (security alerts) from Darktrace',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of model breaches to return',
            },
            offset: {
              type: 'number',
              description: 'Number of model breaches to skip',
            },
            minscore: {
              type: 'number',
              description: 'Minimum breach score threshold (0 to 1)',
            },
            acknowledged: {
              type: 'boolean',
              description: 'Filter by acknowledged status',
            },
          },
        },
      },
      {
        name: 'get_model_breach',
        description: 'Get details of a specific model breach by pbid',
        inputSchema: {
          type: 'object',
          properties: {
            pbid: {
              type: 'number',
              description: 'The model breach ID (pbid)',
            },
          },
          required: ['pbid'],
        },
      },
      {
        name: 'list_devices',
        description: 'List monitored devices and their security status',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of devices to return',
            },
            offset: {
              type: 'number',
              description: 'Number of devices to skip',
            },
            query: {
              type: 'string',
              description: 'Filter devices by hostname, IP, or label',
            },
          },
        },
      },
      {
        name: 'get_model_breaches',
        description: 'Get AI model breaches and anomalies detected',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of breaches to return',
            },
            offset: {
              type: 'number',
              description: 'Number of breaches to skip',
            },
            did: {
              type: 'number',
              description: 'Filter by Darktrace device ID',
            },
          },
        },
      },
      {
        name: 'get_ai_analyst_incidents',
        description: 'Get incidents analyzed by Darktrace AI Analyst',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of incidents to return',
            },
            offset: {
              type: 'number',
              description: 'Number of incidents to skip',
            },
            starttime: {
              type: 'number',
              description: 'Start time in milliseconds since epoch',
            },
            endtime: {
              type: 'number',
              description: 'End time in milliseconds since epoch',
            },
          },
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
        case 'list_devices':
          return await this.listDevices(args);
        case 'get_model_breaches':
          return await this.getModelBreaches(args);
        case 'get_ai_analyst_incidents':
          return await this.getAIAnalystIncidents(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  /**
   * Generate HMAC-SHA1 signature for a given endpoint and timestamp.
   * Timestamp is passed in to ensure the same value is used in both the
   * signature and the Authorization header — eliminating a race condition
   * where two separate Date.now() calls could produce different values.
   */
  private generateHMACSignature(endpoint: string, timestamp: number): string {
    const message = `${endpoint}\n${this.publicToken}\n${timestamp}`;
    return crypto
      .createHmac('sha1', this.privateToken)
      .update(message)
      .digest('hex');
  }

  /**
   * Compute timestamp once, then pass it to generateHMACSignature so the
   * signature and Authorization header use the exact same value.
   */
  private getAuthHeaders(endpoint: string): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateHMACSignature(endpoint, timestamp);

    return {
      'Authorization': `DARKTRACE ${this.publicToken}:${signature}:${timestamp}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async listModelBreaches(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = args.limit || 50;
    const offset = args.offset || 0;

    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    if (args.minscore !== undefined) params.append('minscore', String(args.minscore));
    if (args.acknowledged !== undefined) params.append('acknowledged', String(args.acknowledged));

    const endpoint = `/modelbreaches?${params.toString()}`;

    const response = await fetch(
      `${this.baseUrl}${endpoint}`,
      { method: 'GET', headers: this.getAuthHeaders(endpoint) }
    );

    if (!response.ok) {
      throw new Error(`Darktrace API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Darktrace returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getModelBreach(args: Record<string, unknown>): Promise<ToolResult> {
    const { pbid } = args;
    if (pbid === undefined || pbid === null) {
      throw new Error('pbid is required');
    }

    const endpoint = `/modelbreaches/${encodeURIComponent(String(pbid))}`;

    const response = await fetch(
      `${this.baseUrl}${endpoint}`,
      { method: 'GET', headers: this.getAuthHeaders(endpoint) }
    );

    if (!response.ok) {
      throw new Error(`Darktrace API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Darktrace returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = args.limit || 50;
    const offset = args.offset || 0;

    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    if (args.query) params.append('query', String(args.query));

    const endpoint = `/devices?${params.toString()}`;

    const response = await fetch(
      `${this.baseUrl}${endpoint}`,
      { method: 'GET', headers: this.getAuthHeaders(endpoint) }
    );

    if (!response.ok) {
      throw new Error(`Darktrace API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Darktrace returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getModelBreaches(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = args.limit || 50;
    const offset = args.offset || 0;

    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    if (args.did !== undefined) params.append('did', String(args.did));

    const endpoint = `/modelbreaches?${params.toString()}`;

    const response = await fetch(
      `${this.baseUrl}${endpoint}`,
      { method: 'GET', headers: this.getAuthHeaders(endpoint) }
    );

    if (!response.ok) {
      throw new Error(`Darktrace API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Darktrace returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getAIAnalystIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = args.limit || 50;
    const offset = args.offset || 0;

    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    if (args.starttime !== undefined) params.append('starttime', String(args.starttime));
    if (args.endtime !== undefined) params.append('endtime', String(args.endtime));

    const endpoint = `/aianalyst/incidents?${params.toString()}`;

    const response = await fetch(
      `${this.baseUrl}${endpoint}`,
      { method: 'GET', headers: this.getAuthHeaders(endpoint) }
    );

    if (!response.ok) {
      throw new Error(`Darktrace API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Darktrace returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}
