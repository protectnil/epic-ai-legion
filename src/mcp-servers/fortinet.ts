/**
 * Fortinet FortiGate MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

export class FortinetMCPServer {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly headers: Record<string, string>;

  constructor(config: { baseUrl: string; apiKey: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    // FortiOS v7.4.5+ requires token in Authorization header, not URL param
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_firewall_policies',
        description: 'List all firewall policies on the FortiGate device',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: {
              type: 'string',
              description: 'Virtual domain name (default: root)',
            },
            filter: {
              type: 'string',
              description: 'Filter expression for policies',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of policies to return',
            },
            start: {
              type: 'number',
              description: 'Starting index for pagination',
            },
          },
        },
      },
      {
        name: 'get_threats',
        description: 'Retrieve IPS/intrusion prevention threat events from the local disk log',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: {
              type: 'string',
              description: 'Virtual domain name (default: root)',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity level (emergency, alert, critical, error, warning, notice, information, debug)',
            },
            rows: {
              type: 'number',
              description: 'Maximum number of events to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'list_vpn_tunnels',
        description: 'List all configured VPN tunnels',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: {
              type: 'string',
              description: 'Virtual domain name',
            },
            status: {
              type: 'string',
              description: 'Filter by tunnel status (up/down)',
            },
          },
        },
      },
      {
        name: 'get_system_status',
        description: 'Get current system status and statistics',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: {
              type: 'string',
              description: 'Virtual domain name',
            },
          },
        },
      },
      {
        name: 'list_addresses',
        description: 'List all configured address objects',
        inputSchema: {
          type: 'object',
          properties: {
            vdom: {
              type: 'string',
              description: 'Virtual domain name',
            },
            filter: {
              type: 'string',
              description: 'Filter expression for addresses',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of addresses to return',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_firewall_policies':
          return await this.listFirewallPolicies(args);
        case 'get_threats':
          return await this.getThreats(args);
        case 'list_vpn_tunnels':
          return await this.listVpnTunnels(args);
        case 'get_system_status':
          return await this.getSystemStatus(args);
        case 'list_addresses':
          return await this.listAddresses(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error instanceof Error ? error.message : 'Unknown error') }],
        isError: true,
      };
    }
  }

  private async listFirewallPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    const filter = args.filter as string | undefined;
    const limit = (args.limit as number) || 100;
    const start = (args.start as number) || 0;

    let url = `${this.baseUrl}/api/v2/cmdb/firewall/policy?vdom=${encodeURIComponent(vdom)}&limit=${limit}&start=${start}`;

    if (filter) {
      url += `&filter=${encodeURIComponent(filter)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Fortinet API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Fortinet returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getThreats(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    const severity = args.severity as string | undefined;
    const rows = (args.rows as number) || 50;

    // FortiOS log API: GET /api/v2/log/disk/utm retrieves on-device UTM security event logs.
    // The subtype filter selects IPS/intrusion prevention events specifically.
    let url = `${this.baseUrl}/api/v2/log/disk/utm?vdom=${encodeURIComponent(vdom)}&rows=${rows}&filter=subtype==ips`;

    if (severity) {
      url += `&filter=level==${encodeURIComponent(severity)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Fortinet API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Fortinet returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listVpnTunnels(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    const status = args.status as string | undefined;

    let url = `${this.baseUrl}/api/v2/cmdb/vpn.ipsec/phase1?vdom=${encodeURIComponent(vdom)}`;

    if (status) {
      url += `&filter=status==${encodeURIComponent(status)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Fortinet API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Fortinet returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getSystemStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';

    const url = `${this.baseUrl}/api/v2/monitor/system/status?vdom=${encodeURIComponent(vdom)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Fortinet API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Fortinet returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listAddresses(args: Record<string, unknown>): Promise<ToolResult> {
    const vdom = (args.vdom as string) || 'root';
    const filter = args.filter as string | undefined;
    const limit = (args.limit as number) || 100;

    let url = `${this.baseUrl}/api/v2/cmdb/firewall/address?vdom=${encodeURIComponent(vdom)}&limit=${limit}`;

    if (filter) {
      url += `&filter=${encodeURIComponent(filter)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Fortinet API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Fortinet returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
