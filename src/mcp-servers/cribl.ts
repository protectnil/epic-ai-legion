/**
 * Cribl MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/pebbletek/cribl-mcp — 10 tools (community, not vendor-official; no self-hosting docs)
// This adapter serves the API-key/bearer-token use case and covers on-prem deployments.

import { ToolDefinition, ToolResult } from './types.js';

interface CriblConfig {
  /**
   * Base URL for your Cribl instance.
   * On-prem: https://cribl.example.com:9000
   * Cribl.Cloud: https://{workspaceName}-{organizationId}.cribl.cloud
   * The adapter appends /api/v1 automatically.
   */
  baseUrl: string;
  /** Client ID for Cribl.Cloud OAuth2 (grant_type: client_credentials). */
  clientId?: string;
  /** Client secret for Cribl.Cloud OAuth2. */
  clientSecret?: string;
  /** Pre-obtained Bearer token (on-prem or already-fetched cloud token). */
  bearerToken?: string;
}

export class CriblMCPServer {
  private readonly baseUrl: string;
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private bearerToken: string | undefined;

  constructor(config: CriblConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.bearerToken = config.bearerToken;
  }

  /**
   * Obtain or return a cached Bearer token.
   * Cribl.Cloud: POST https://login.cribl.cloud/oauth/token (client_credentials).
   * On-prem: callers must pass bearerToken directly (obtained via /api/v1/auth/login).
   */
  private async getToken(): Promise<string> {
    if (this.bearerToken) return this.bearerToken;

    if (this.clientId && this.clientSecret) {
      const resp = await fetch('https://login.cribl.cloud/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          audience: 'https://api.cribl.cloud',
        }),
      });
      if (!resp.ok) throw new Error(`Cribl OAuth failed: ${resp.status} ${resp.statusText}`);
      let data: unknown;
      try { data = await resp.json(); } catch { throw new Error(`Cribl OAuth returned non-JSON (HTTP ${resp.status})`); }
      const token = (data as Record<string, unknown>).access_token as string;
      this.bearerToken = token;
      return token;
    }

    throw new Error('CriblMCPServer: provide either bearerToken or clientId + clientSecret');
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_worker_groups',
        description: 'List all Worker Groups or Fleets in the Cribl deployment',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_pipelines',
        description: 'List all pipelines configured for a specific Worker Group or Fleet',
        inputSchema: {
          type: 'object',
          properties: {
            group: {
              type: 'string',
              description: 'Worker Group or Fleet name (e.g. default)',
            },
          },
          required: ['group'],
        },
      },
      {
        name: 'get_pipeline',
        description: 'Fetch the full configuration object for a specific pipeline in a Worker Group',
        inputSchema: {
          type: 'object',
          properties: {
            group: {
              type: 'string',
              description: 'Worker Group or Fleet name',
            },
            pipeline_id: {
              type: 'string',
              description: 'Pipeline ID to retrieve',
            },
          },
          required: ['group', 'pipeline_id'],
        },
      },
      {
        name: 'list_sources',
        description: 'List all configured sources (inputs) for a specific Worker Group',
        inputSchema: {
          type: 'object',
          properties: {
            group: {
              type: 'string',
              description: 'Worker Group or Fleet name',
            },
          },
          required: ['group'],
        },
      },
      {
        name: 'list_destinations',
        description: 'List all configured destinations (outputs) for a specific Worker Group',
        inputSchema: {
          type: 'object',
          properties: {
            group: {
              type: 'string',
              description: 'Worker Group or Fleet name',
            },
          },
          required: ['group'],
        },
      },
      {
        name: 'get_system_metrics',
        description: 'Retrieve system-level metrics (throughput, CPU, memory) from the Cribl deployment',
        inputSchema: {
          type: 'object',
          properties: {
            group: {
              type: 'string',
              description: 'Worker Group name. Omit to query the leader node.',
            },
          },
        },
      },
      {
        name: 'commit_config',
        description: 'Commit staged configuration changes to version control for a Worker Group',
        inputSchema: {
          type: 'object',
          properties: {
            group: {
              type: 'string',
              description: 'Worker Group or Fleet name',
            },
            message: {
              type: 'string',
              description: 'Commit message describing the changes',
            },
          },
          required: ['group', 'message'],
        },
      },
      {
        name: 'deploy_config',
        description: 'Deploy a committed configuration version to a Worker Group',
        inputSchema: {
          type: 'object',
          properties: {
            group: {
              type: 'string',
              description: 'Worker Group or Fleet name to deploy to',
            },
            version: {
              type: 'string',
              description: 'Commit hash or version tag to deploy. Omit to deploy the latest commit.',
            },
          },
          required: ['group'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const token = await this.getToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const api = `${this.baseUrl}/api/v1`;

      switch (name) {
        case 'list_worker_groups': {
          const response = await fetch(`${api}/master/groups`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list worker groups: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cribl returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_pipelines': {
          const group = args.group as string;
          if (!group) {
            return { content: [{ type: 'text', text: 'group is required' }], isError: true };
          }
          const response = await fetch(`${api}/m/${encodeURIComponent(group)}/pipelines`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list pipelines: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cribl returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_pipeline': {
          const group = args.group as string;
          const pipelineId = args.pipeline_id as string;
          if (!group || !pipelineId) {
            return { content: [{ type: 'text', text: 'group and pipeline_id are required' }], isError: true };
          }
          const response = await fetch(`${api}/m/${encodeURIComponent(group)}/pipelines/${encodeURIComponent(pipelineId)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get pipeline: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cribl returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_sources': {
          const group = args.group as string;
          if (!group) {
            return { content: [{ type: 'text', text: 'group is required' }], isError: true };
          }
          const response = await fetch(`${api}/m/${encodeURIComponent(group)}/system/inputs`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list sources: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cribl returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_destinations': {
          const group = args.group as string;
          if (!group) {
            return { content: [{ type: 'text', text: 'group is required' }], isError: true };
          }
          const response = await fetch(`${api}/m/${encodeURIComponent(group)}/system/outputs`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list destinations: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cribl returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_system_metrics': {
          const group = args.group as string | undefined;
          const url = group
            ? `${api}/m/${encodeURIComponent(group)}/system/metrics`
            : `${api}/system/metrics`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get system metrics: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cribl returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'commit_config': {
          const group = args.group as string;
          const message = args.message as string;
          if (!group || !message) {
            return { content: [{ type: 'text', text: 'group and message are required' }], isError: true };
          }
          const response = await fetch(`${api}/m/${encodeURIComponent(group)}/version/commit`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ message }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to commit config: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cribl returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'deploy_config': {
          const group = args.group as string;
          if (!group) {
            return { content: [{ type: 'text', text: 'group is required' }], isError: true };
          }
          const body: Record<string, unknown> = {};
          if (args.version) body.version = args.version;
          const response = await fetch(`${api}/m/${encodeURIComponent(group)}/version/deploy`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to deploy config: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Cribl returned non-JSON (HTTP ${response.status})`); }
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
