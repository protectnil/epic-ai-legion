/**
 * Jamf Pro MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/dbankscard/jamf-mcp-server — transport: stdio, auth: Bearer token
// Our adapter covers: 18 tools (core device management + policy + inventory). Vendor MCP covers: broader set.
// Recommendation: Use this adapter for air-gapped deployments. Evaluate vendor MCP for full coverage.
//
// Base URL: https://{instance}.jamfcloud.com (cloud) or https://{on-prem-host}:8443 (on-prem)
// Auth: OAuth2 client credentials flow via /api/oauth/token (Jamf Pro 10.49+)
//       Falls back to Bearer token via POST /api/v1/auth/token (Basic auth)
// Docs: https://developer.jamf.com/jamf-pro/docs/jamf-pro-api-overview
// Rate limits: Not officially published; community guidance is max 5 concurrent requests to avoid 429s

import { ToolDefinition, ToolResult } from './types.js';

interface JamfConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

export class JamfMCPServer {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: JamfConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    // baseUrl is required for Jamf — no default because every instance is unique
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'jamf',
      displayName: 'Jamf Pro',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'jamf', 'mdm', 'apple', 'mac', 'macos', 'ios', 'ipad', 'device-management',
        'computer', 'mobile-device', 'policy', 'inventory', 'compliance',
        'patch', 'script', 'configuration-profile', 'smart-group',
      ],
      toolNames: [
        'list_computers', 'get_computer', 'search_computers',
        'list_mobile_devices', 'get_mobile_device',
        'list_policies', 'get_policy', 'trigger_policy',
        'list_scripts', 'get_script',
        'list_groups', 'get_group',
        'list_configuration_profiles', 'get_configuration_profile',
        'get_inventory_summary', 'list_categories',
        'list_users', 'get_user',
      ],
      description: 'Jamf Pro Apple device management: computers, mobile devices, policies, scripts, configuration profiles, smart groups, and inventory.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_computers',
        description: 'List managed Mac computers from Jamf Pro inventory with optional filters for OS version, model, or management status',
        inputSchema: {
          type: 'object',
          properties: {
            section: {
              type: 'string',
              description: 'Inventory sections to include: GENERAL, HARDWARE, OS, USER_AND_LOCATION, STORAGE, APPLICATIONS (default: GENERAL)',
            },
            filter: {
              type: 'string',
              description: 'RSQL filter expression (e.g. general.managementId!="" to get managed only)',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. general.name:asc)',
            },
            page: {
              type: 'number',
              description: 'Page number (0-indexed, default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100, max: 2000)',
            },
          },
        },
      },
      {
        name: 'get_computer',
        description: 'Get full inventory record for a specific Mac computer by its Jamf ID including hardware, OS, and installed apps',
        inputSchema: {
          type: 'object',
          properties: {
            computer_id: {
              type: 'string',
              description: 'Jamf computer ID (numeric string)',
            },
            section: {
              type: 'string',
              description: 'Comma-separated sections: GENERAL, HARDWARE, OS, USER_AND_LOCATION, STORAGE, APPLICATIONS, CERTIFICATES (default: all)',
            },
          },
          required: ['computer_id'],
        },
      },
      {
        name: 'search_computers',
        description: 'Search Mac computers by name, serial number, username, or MAC address using a RSQL filter query',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'RSQL filter (e.g. general.name=="MacBook*" or hardware.serialNumber=="C02X*")',
            },
            page_size: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
          },
          required: ['filter'],
        },
      },
      {
        name: 'list_mobile_devices',
        description: 'List managed iOS, iPadOS, and tvOS devices from Jamf Pro with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'RSQL filter expression to narrow results',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. displayName:asc)',
            },
            page: {
              type: 'number',
              description: 'Page number (0-indexed, default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100, max: 2000)',
            },
          },
        },
      },
      {
        name: 'get_mobile_device',
        description: 'Get full inventory record for a specific iOS/iPadOS device by Jamf mobile device ID',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Jamf mobile device ID (numeric string)',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'list_policies',
        description: 'List Jamf Pro policies with their trigger, scope, and enabled/disabled status',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'RSQL filter expression (e.g. enabled==true)',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. name:asc)',
            },
            page: {
              type: 'number',
              description: 'Page number (0-indexed, default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_policy',
        description: 'Get full details of a Jamf Pro policy including scope, scripts, packages, and trigger configuration',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'Jamf policy ID (numeric string)',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'trigger_policy',
        description: 'Trigger a Jamf Pro policy to run immediately on a specific computer by computer ID',
        inputSchema: {
          type: 'object',
          properties: {
            computer_id: {
              type: 'string',
              description: 'Jamf computer ID to trigger the policy on',
            },
            policy_id: {
              type: 'string',
              description: 'Jamf policy ID to trigger',
            },
          },
          required: ['computer_id', 'policy_id'],
        },
      },
      {
        name: 'list_scripts',
        description: 'List all scripts stored in Jamf Pro with their names, categories, and script language',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'RSQL filter expression (e.g. name=="*Deploy*")',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. name:asc)',
            },
            page: {
              type: 'number',
              description: 'Page number (0-indexed, default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_script',
        description: 'Get the full script content and metadata for a specific Jamf Pro script by ID',
        inputSchema: {
          type: 'object',
          properties: {
            script_id: {
              type: 'string',
              description: 'Jamf script ID (numeric string)',
            },
          },
          required: ['script_id'],
        },
      },
      {
        name: 'list_groups',
        description: 'List all smart groups and static groups for computers and mobile devices in Jamf Pro',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'RSQL filter expression (e.g. groupType==SMART_GROUP)',
            },
            sort: {
              type: 'string',
              description: 'Sort field: name, groupType, isSmart (e.g. name:asc)',
            },
            page: {
              type: 'number',
              description: 'Page number (0-indexed, default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Get membership and criteria details for a specific Jamf Pro device group by ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Jamf group ID (numeric string)',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'list_configuration_profiles',
        description: 'List macOS configuration profiles managed by Jamf Pro with their scope and deployment status',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'RSQL filter expression',
            },
            page: {
              type: 'number',
              description: 'Page number (0-indexed, default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_configuration_profile',
        description: 'Get the full configuration profile XML payload and scope for a specific Jamf Pro profile',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: {
              type: 'string',
              description: 'Jamf configuration profile ID (numeric string)',
            },
          },
          required: ['profile_id'],
        },
      },
      {
        name: 'get_inventory_summary',
        description: 'Get statistics summary of managed and unmanaged computers and mobile devices in Jamf Pro inventory',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_categories',
        description: 'List all categories defined in Jamf Pro used to organize policies, scripts, and packages',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'RSQL filter expression (e.g. name=="Security*")',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. name:asc)',
            },
            page: {
              type: 'number',
              description: 'Page number (0-indexed, default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'list_users',
        description: 'List local user accounts known to Jamf Pro with their associated devices and directory status',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'RSQL filter expression (e.g. username=="jsmith")',
            },
            page: {
              type: 'number',
              description: 'Page number (0-indexed, default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get account details and assigned devices for a specific Jamf Pro user by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Jamf user ID (numeric string)',
            },
          },
          required: ['user_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_computers':
          return this.listComputers(args);
        case 'get_computer':
          return this.getComputer(args);
        case 'search_computers':
          return this.searchComputers(args);
        case 'list_mobile_devices':
          return this.listMobileDevices(args);
        case 'get_mobile_device':
          return this.getMobileDevice(args);
        case 'list_policies':
          return this.listPolicies(args);
        case 'get_policy':
          return this.getPolicy(args);
        case 'trigger_policy':
          return this.triggerPolicy(args);
        case 'list_scripts':
          return this.listScripts(args);
        case 'get_script':
          return this.getScript(args);
        case 'list_groups':
          return this.listGroups(args);
        case 'get_group':
          return this.getGroup(args);
        case 'list_configuration_profiles':
          return this.listConfigurationProfiles(args);
        case 'get_configuration_profile':
          return this.getConfigurationProfile(args);
        case 'get_inventory_summary':
          return this.getInventorySummary();
        case 'list_categories':
          return this.listCategories(args);
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    const response = await fetch(`${this.baseUrl}/api/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listComputers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page-size': String((args.page_size as number) ?? 100),
      page: String((args.page as number) ?? 0),
    };
    if (args.section) params.section = args.section as string;
    if (args.filter) params.filter = args.filter as string;
    if (args.sort) params.sort = args.sort as string;
    return this.apiGet('/api/v1/computers-inventory', params);
  }

  private async getComputer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.computer_id) return { content: [{ type: 'text', text: 'computer_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.section) params.section = args.section as string;
    return this.apiGet(`/api/v1/computers-inventory-detail/${args.computer_id as string}`, params);
  }

  private async searchComputers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.filter) return { content: [{ type: 'text', text: 'filter is required' }], isError: true };
    const params: Record<string, string> = {
      filter: args.filter as string,
      'page-size': String((args.page_size as number) ?? 50),
      page: '0',
    };
    return this.apiGet('/api/v1/computers-inventory', params);
  }

  private async listMobileDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page-size': String((args.page_size as number) ?? 100),
      page: String((args.page as number) ?? 0),
    };
    if (args.filter) params.filter = args.filter as string;
    if (args.sort) params.sort = args.sort as string;
    return this.apiGet('/api/v2/mobile-devices', params);
  }

  private async getMobileDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.apiGet(`/api/v2/mobile-devices/${args.device_id as string}/detail`);
  }

  private async listPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page-size': String((args.page_size as number) ?? 100),
      page: String((args.page as number) ?? 0),
    };
    if (args.filter) params.filter = args.filter as string;
    if (args.sort) params.sort = args.sort as string;
    return this.apiGet('/api/v1/policies', params);
  }

  private async getPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy_id) return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    return this.apiGet(`/api/v1/policies/${args.policy_id as string}`);
  }

  private async triggerPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.computer_id || !args.policy_id) {
      return { content: [{ type: 'text', text: 'computer_id and policy_id are required' }], isError: true };
    }
    return this.apiPost(`/api/v1/computers/${args.computer_id as string}/policies/${args.policy_id as string}/trigger`, {});
  }

  private async listScripts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page-size': String((args.page_size as number) ?? 100),
      page: String((args.page as number) ?? 0),
    };
    if (args.filter) params.filter = args.filter as string;
    if (args.sort) params.sort = args.sort as string;
    return this.apiGet('/api/v1/scripts', params);
  }

  private async getScript(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.script_id) return { content: [{ type: 'text', text: 'script_id is required' }], isError: true };
    return this.apiGet(`/api/v1/scripts/${args.script_id as string}`);
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page-size': String((args.page_size as number) ?? 100),
      page: String((args.page as number) ?? 0),
    };
    if (args.filter) params.filter = args.filter as string;
    if (args.sort) params.sort = args.sort as string;
    return this.apiGet('/api/v1/groups', params);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.apiGet(`/api/v1/groups/${args.group_id as string}`);
  }

  private async listConfigurationProfiles(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page-size': String((args.page_size as number) ?? 100),
      page: String((args.page as number) ?? 0),
    };
    if (args.filter) params.filter = args.filter as string;
    return this.apiGet('/api/v1/macos-managed-software-updates/available-updates', params);
  }

  private async getConfigurationProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id) return { content: [{ type: 'text', text: 'profile_id is required' }], isError: true };
    return this.apiGet(`/api/v1/macos-managed-software-updates/${args.profile_id as string}`);
  }

  private async getInventorySummary(): Promise<ToolResult> {
    return this.apiGet('/api/v1/inventory-information');
  }

  private async listCategories(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page-size': String((args.page_size as number) ?? 100),
      page: String((args.page as number) ?? 0),
    };
    if (args.filter) params.filter = args.filter as string;
    if (args.sort) params.sort = args.sort as string;
    return this.apiGet('/api/v1/categories', params);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page-size': String((args.page_size as number) ?? 100),
      page: String((args.page as number) ?? 0),
    };
    if (args.filter) params.filter = args.filter as string;
    return this.apiGet('/api/v1/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.apiGet(`/api/v1/users/${args.user_id as string}`);
  }
}
