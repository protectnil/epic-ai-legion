/** Rapid7 InsightVM MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface Rapid7Config {
  host: string;
  username: string;
  password: string;
  port?: number;
  /** Set to false only in controlled non-production environments. Default: true */
  tlsRejectUnauthorized?: boolean;
}

export class Rapid7MCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  constructor(config: Rapid7Config) {
    const port = config.port || 3780;
    this.baseUrl = `https://${config.host}:${port}/api/3`;
    // tlsRejectUnauthorized is stored for future use when the HTTP client is wired to respect it
    void (config.tlsRejectUnauthorized !== false);

    const credentials = btoa(`${config.username}:${config.password}`);
    this.headers = {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_vulnerabilities',
        description: 'List vulnerabilities from Rapid7 InsightVM',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of vulnerabilities to return' },
            offset: { type: 'number', description: 'Number of vulnerabilities to skip' },
            sort: { type: 'string', description: 'Sort field and direction (e.g., "severity,DESC")' },
          },
        },
      },
      {
        name: 'get_vulnerability',
        description: 'Get details of a specific vulnerability',
        inputSchema: {
          type: 'object',
          properties: {
            vulnId: { type: 'string', description: 'Vulnerability ID' },
          },
          required: ['vulnId'],
        },
      },
      {
        name: 'list_assets',
        description: 'List assets in Rapid7 InsightVM',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of assets to return' },
            offset: { type: 'number', description: 'Number of assets to skip' },
          },
        },
      },
      {
        name: 'list_scans',
        description: 'List scans in Rapid7 InsightVM',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of scans to return' },
            offset: { type: 'number', description: 'Number of scans to skip' },
          },
        },
      },
      {
        name: 'get_vulnerability_solutions',
        description: 'Get remediation solutions for a specific vulnerability (GET /vulnerabilities/{id}/solutions)',
        inputSchema: {
          type: 'object',
          properties: {
            vulnId: { type: 'string', description: 'Vulnerability ID' },
          },
          required: ['vulnId'],
        },
      },
      {
        name: 'get_asset_vulnerabilities',
        description: 'Get vulnerabilities found on a specific asset (GET /assets/{id}/vulnerabilities)',
        inputSchema: {
          type: 'object',
          properties: {
            assetId: { type: 'string', description: 'Asset ID' },
            limit: { type: 'number', description: 'Maximum number of vulnerabilities to return' },
            offset: { type: 'number', description: 'Number of vulnerabilities to skip' },
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
        case 'list_scans':
          return await this.listScans(args);
        case 'get_vulnerability_solutions':
          return await this.getVulnerabilitySolutions(args);
        case 'get_asset_vulnerabilities':
          return await this.getAssetVulnerabilities(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error calling ${name}: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async listVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    const sort = (args.sort as string) || 'severity,DESC';

    const url = new URL(`${this.baseUrl}/vulnerabilities`);
    url.searchParams.append('size', limit.toString());
    url.searchParams.append('page', Math.floor(offset / limit).toString());
    url.searchParams.append('sort', sort);

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
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getVulnerability(args: Record<string, unknown>): Promise<ToolResult> {
    const vulnId = args.vulnId as string;
    if (!vulnId) {
      throw new Error('vulnId is required');
    }

    const url = new URL(`${this.baseUrl}/vulnerabilities/${encodeURIComponent(vulnId)}`);
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
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;

    const url = new URL(`${this.baseUrl}/assets`);
    url.searchParams.append('size', limit.toString());
    url.searchParams.append('page', Math.floor(offset / limit).toString());

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
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listScans(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;

    const url = new URL(`${this.baseUrl}/scans`);
    url.searchParams.append('size', limit.toString());
    url.searchParams.append('page', Math.floor(offset / limit).toString());

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
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getVulnerabilitySolutions(args: Record<string, unknown>): Promise<ToolResult> {
    const vulnId = args.vulnId as string;

    if (!vulnId) {
      throw new Error('vulnId is required');
    }

    // InsightVM API v3: GET /vulnerabilities/{id}/solutions
    const url = new URL(`${this.baseUrl}/vulnerabilities/${encodeURIComponent(vulnId)}/solutions`);

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
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getAssetVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const assetId = args.assetId as string;
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;

    if (!assetId) {
      throw new Error('assetId is required');
    }

    // InsightVM API v3: GET /assets/{id}/vulnerabilities
    const url = new URL(`${this.baseUrl}/assets/${encodeURIComponent(assetId)}/vulnerabilities`);
    url.searchParams.append('size', limit.toString());
    url.searchParams.append('page', Math.floor(offset / limit).toString());

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
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}
