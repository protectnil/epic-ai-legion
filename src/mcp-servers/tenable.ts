/**
 * Tenable MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface TenableConfig {
  baseUrl?: string;
  accessKey: string;
  secretKey: string;
}

export class TenableMCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: TenableConfig) {
    this.baseUrl = config.baseUrl || 'https://cloud.tenable.com';
    const apiKeys = `accessKey=${config.accessKey};secretKey=${config.secretKey}`;
    this.headers = {
      'X-ApiKeys': apiKeys,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_vulnerabilities',
        description: 'List vulnerabilities from Tenable Vulnerability Management workbench (up to 5,000)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of vulnerabilities to return' },
            offset: { type: 'number', description: 'Number of vulnerabilities to skip' },
            sortBy: { type: 'string', description: 'Field to sort by (e.g. "severity")' },
          },
        },
      },
      {
        name: 'get_vulnerability',
        description: 'Get details of a specific vulnerability plugin from the Tenable workbench',
        inputSchema: {
          type: 'object',
          properties: {
            pluginId: { type: 'number', description: 'Vulnerability plugin ID' },
          },
          required: ['pluginId'],
        },
      },
      {
        name: 'list_assets',
        description: 'List assets in Tenable Vulnerability Management workbench (up to 5,000)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of assets to return' },
            offset: { type: 'number', description: 'Number of assets to skip' },
          },
        },
      },
      {
        name: 'run_scan',
        description: 'Launch an existing Tenable scan by scan ID',
        inputSchema: {
          type: 'object',
          properties: {
            scanId: { type: 'string', description: 'ID of the scan to launch' },
            altTargets: { type: 'array', items: { type: 'string' }, description: 'Optional list of target IPs/hostnames to override scan targets' },
          },
          required: ['scanId'],
        },
      },
      {
        name: 'get_asset_vulnerabilities',
        description: 'List vulnerabilities associated with a specific asset',
        inputSchema: {
          type: 'object',
          properties: {
            assetId: { type: 'string', description: 'Asset UUID' },
          },
          required: ['assetId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_vulnerabilities':
          return await this.listVulnerabilities(args);
        case 'get_vulnerability':
          return await this.getVulnerability(args);
        case 'list_assets':
          return await this.listAssets(args);
        case 'run_scan':
          return await this.runScan(args);
        case 'get_asset_vulnerabilities':
          return await this.getAssetVulnerabilities(args);
        default:
          return {
            content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Error calling ${name}: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async listVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    const sortBy = (args.sortBy as string) || 'severity';

    const url = new URL(`${this.baseUrl}/workbenches/vulnerabilities`);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());
    url.searchParams.append('sort', sortBy);

    const response = await fetch(url.toString(), { headers: this.headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Non-JSON response (HTTP ${response.status})`);
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getVulnerability(args: Record<string, unknown>): Promise<ToolResult> {
    const pluginId = args.pluginId as number;
    if (!pluginId) {
      throw new Error('pluginId is required');
    }

    const url = `${this.baseUrl}/workbenches/vulnerabilities/${encodeURIComponent(String(pluginId))}/info`;
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Non-JSON response (HTTP ${response.status})`);
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;

    const url = new URL(`${this.baseUrl}/workbenches/assets`);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());

    const response = await fetch(url.toString(), { headers: this.headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Non-JSON response (HTTP ${response.status})`);
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async runScan(args: Record<string, unknown>): Promise<ToolResult> {
    const scanId = args.scanId as string;
    if (!scanId) {
      throw new Error('scanId is required');
    }

    const altTargets = args.altTargets as string[] | undefined;
    const body = altTargets && altTargets.length > 0
      ? { alt_targets: altTargets }
      : undefined;

    const url = `${this.baseUrl}/scans/${encodeURIComponent(scanId)}/launch`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Non-JSON response (HTTP ${response.status})`);
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getAssetVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const assetId = args.assetId as string;
    if (!assetId) {
      throw new Error('assetId is required');
    }

    const url = `${this.baseUrl}/workbenches/assets/${encodeURIComponent(assetId)}/vulnerabilities`;
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Non-JSON response (HTTP ${response.status})`);
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}
