/**
 * Netskope SASE/CASB MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Netskope MCP server was found on GitHub or npm.
//
// Base URL: https://<tenant-name>.goskope.com — tenant hostname required, set via baseUrl config
// Auth: API token in Netskope-Api-Token header (generate in Settings > Administration > Administrators & Roles)
// Docs: https://docs.netskope.com/en/rest-api-v2-overview-312207/
//       https://docs.netskope.com/en/rest-api/
// Rate limits: Not publicly documented for REST API v2; Next Gen API Data Protection has per-endpoint limits

import { ToolDefinition, ToolResult } from './types.js';

interface NetskopeConfig {
  apiToken: string;
  baseUrl: string;  // required: https://<tenant>.goskope.com
}

export class NetskopeMCPServer {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: NetskopeConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'netskope',
      displayName: 'Netskope',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: [
        'netskope', 'sase', 'casb', 'cloud security', 'dlp', 'ztna', 'zero trust',
        'shadow it', 'web gateway', 'swg', 'cloud access', 'policy', 'alert', 'events',
        'infrastructure', 'network security', 'user behavior',
      ],
      toolNames: [
        'list_alerts', 'get_alert',
        'list_events', 'list_page_events', 'list_network_events', 'list_audit_events',
        'list_application_events', 'list_infrastructure_events',
        'list_users', 'get_user',
        'list_clients',
        'list_applications',
        'list_policies',
        'search_events',
      ],
      description: 'Netskope SASE/CASB security: query alerts, events (page, network, audit, application), users, clients, cloud app inventory, and security policies.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alerts',
        description: 'List Netskope security alerts with optional type, severity, and time range filters',
        inputSchema: {
          type: 'object',
          properties: {
            alert_type: {
              type: 'string',
              description: 'Filter by alert type: policy, malware, malsite, dlp, uba, compromisedcredential, ctep, watchlist, quarantine, remediation, securityassessment',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: low, medium, high, critical',
            },
            start_time: {
              type: 'number',
              description: 'Start of time range as Unix timestamp (epoch seconds)',
            },
            end_time: {
              type: 'number',
              description: 'End of time range as Unix timestamp (epoch seconds)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of alerts to return (default: 100, max: 5000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get details for a single Netskope alert by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'Netskope alert ID',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'list_events',
        description: 'List Netskope events across all event types with optional time range and limit',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: {
              type: 'number',
              description: 'Start of time range as Unix timestamp (epoch seconds)',
            },
            end_time: {
              type: 'number',
              description: 'End of time range as Unix timestamp (epoch seconds)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 100, max: 5000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_page_events',
        description: 'List Netskope web page visit events with optional user, app, and time filters',
        inputSchema: {
          type: 'object',
          properties: {
            user: {
              type: 'string',
              description: 'Filter by user email or username',
            },
            app: {
              type: 'string',
              description: 'Filter by application name',
            },
            start_time: {
              type: 'number',
              description: 'Start of time range as Unix timestamp (epoch seconds)',
            },
            end_time: {
              type: 'number',
              description: 'End of time range as Unix timestamp (epoch seconds)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 100, max: 5000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_network_events',
        description: 'List Netskope network traffic events including private access and cloud firewall activity',
        inputSchema: {
          type: 'object',
          properties: {
            user: {
              type: 'string',
              description: 'Filter by user email or username',
            },
            start_time: {
              type: 'number',
              description: 'Start of time range as Unix timestamp (epoch seconds)',
            },
            end_time: {
              type: 'number',
              description: 'End of time range as Unix timestamp (epoch seconds)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 100, max: 5000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_audit_events',
        description: 'List Netskope admin audit log events for tracking administrative actions and configuration changes',
        inputSchema: {
          type: 'object',
          properties: {
            admin: {
              type: 'string',
              description: 'Filter by administrator email',
            },
            start_time: {
              type: 'number',
              description: 'Start of time range as Unix timestamp (epoch seconds)',
            },
            end_time: {
              type: 'number',
              description: 'End of time range as Unix timestamp (epoch seconds)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of audit events to return (default: 100, max: 5000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_application_events',
        description: 'List Netskope cloud application activity events with optional user and app filters',
        inputSchema: {
          type: 'object',
          properties: {
            user: {
              type: 'string',
              description: 'Filter by user email or username',
            },
            app: {
              type: 'string',
              description: 'Filter by application name (e.g. Salesforce, OneDrive)',
            },
            activity: {
              type: 'string',
              description: 'Filter by activity type: upload, download, login, logout, delete, share',
            },
            start_time: {
              type: 'number',
              description: 'Start of time range as Unix timestamp (epoch seconds)',
            },
            end_time: {
              type: 'number',
              description: 'End of time range as Unix timestamp (epoch seconds)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 100, max: 5000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_infrastructure_events',
        description: 'List Netskope infrastructure events for network and endpoint connectivity monitoring',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: {
              type: 'number',
              description: 'Start of time range as Unix timestamp (epoch seconds)',
            },
            end_time: {
              type: 'number',
              description: 'End of time range as Unix timestamp (epoch seconds)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 100, max: 5000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_users',
        description: 'List users in the Netskope tenant with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            filter: {
              type: 'string',
              description: 'SCIM filter expression (e.g. userName eq "user@example.com")',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get details for a single Netskope user by their SCIM user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'SCIM user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_clients',
        description: 'List Netskope client endpoints with connection status and version information',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of clients to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_applications',
        description: 'List discovered cloud applications in the Netskope Cloud Confidence Index with risk scores',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Filter by app category (e.g. Cloud Storage, Collaboration)',
            },
            ccl: {
              type: 'string',
              description: 'Filter by Cloud Confidence Level: excellent, high, medium, low, poor',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of applications to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_policies',
        description: 'List Netskope real-time protection policies with action, category, and user scope details',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of policies to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'search_events',
        description: 'Search Netskope events using a query string across all event types with time range',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string to match against event fields',
            },
            event_type: {
              type: 'string',
              description: 'Event type to search: application, page, network, audit, infrastructure, alert',
            },
            start_time: {
              type: 'number',
              description: 'Start of time range as Unix timestamp (epoch seconds)',
            },
            end_time: {
              type: 'number',
              description: 'End of time range as Unix timestamp (epoch seconds)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 100, max: 5000)',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_alerts':
          return this.listAlerts(args);
        case 'get_alert':
          return this.getAlert(args);
        case 'list_events':
          return this.listEvents(args);
        case 'list_page_events':
          return this.listPageEvents(args);
        case 'list_network_events':
          return this.listNetworkEvents(args);
        case 'list_audit_events':
          return this.listAuditEvents(args);
        case 'list_application_events':
          return this.listApplicationEvents(args);
        case 'list_infrastructure_events':
          return this.listInfrastructureEvents(args);
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'list_clients':
          return this.listClients(args);
        case 'list_applications':
          return this.listApplications(args);
        case 'list_policies':
          return this.listPolicies(args);
        case 'search_events':
          return this.searchEvents(args);
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

  private get headers(): Record<string, string> {
    return {
      'Netskope-Api-Token': this.apiToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async nsGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await fetch(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private timeRangeParams(args: Record<string, unknown>): Record<string, string> {
    const params: Record<string, string> = {};
    if (args.start_time) params.starttime = String(args.start_time);
    if (args.end_time) params.endtime = String(args.end_time);
    if (args.limit) params.limit = String(args.limit);
    if (args.skip) params.skip = String(args.skip);
    return params;
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.timeRangeParams(args);
    if (args.alert_type) params.type = args.alert_type as string;
    if (args.severity) params.severity = args.severity as string;
    return this.nsGet('/api/v2/alerts/data/alert', params);
  }

  private async getAlert(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.alert_id) return { content: [{ type: 'text', text: 'alert_id is required' }], isError: true };
    return this.nsGet(`/api/v2/alerts/data/alert`, { id: args.alert_id as string });
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.timeRangeParams(args);
    return this.nsGet('/api/v2/events/data/events', params);
  }

  private async listPageEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.timeRangeParams(args);
    if (args.user) params.user = args.user as string;
    if (args.app) params.app = args.app as string;
    return this.nsGet('/api/v2/events/data/page', params);
  }

  private async listNetworkEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.timeRangeParams(args);
    if (args.user) params.user = args.user as string;
    return this.nsGet('/api/v2/events/data/network', params);
  }

  private async listAuditEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.timeRangeParams(args);
    if (args.admin) params.admin = args.admin as string;
    return this.nsGet('/api/v2/events/data/audit', params);
  }

  private async listApplicationEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.timeRangeParams(args);
    if (args.user) params.user = args.user as string;
    if (args.app) params.app = args.app as string;
    if (args.activity) params.activity = args.activity as string;
    return this.nsGet('/api/v2/events/data/application', params);
  }

  private async listInfrastructureEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.timeRangeParams(args);
    return this.nsGet('/api/v2/events/data/infrastructure', params);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params.count = String(args.limit);
    if (args.skip) params.startIndex = String((args.skip as number) + 1);
    if (args.filter) params.filter = args.filter as string;
    return this.nsGet('/api/v2/scim/Users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.nsGet(`/api/v2/scim/Users/${args.user_id}`);
  }

  private async listClients(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params.limit = String(args.limit);
    if (args.skip) params.skip = String(args.skip);
    return this.nsGet('/api/v2/clients', params);
  }

  private async listApplications(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.category) params.category = args.category as string;
    if (args.ccl) params.ccl = args.ccl as string;
    if (args.limit) params.limit = String(args.limit);
    if (args.skip) params.skip = String(args.skip);
    return this.nsGet('/api/v2/discovery/apps', params);
  }

  private async listPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params.limit = String(args.limit);
    if (args.skip) params.skip = String(args.skip);
    return this.nsGet('/api/v2/policy/nspolicies', params);
  }

  private async searchEvents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params = this.timeRangeParams(args);
    params.query = args.query as string;
    const eventPath = args.event_type
      ? `/api/v2/events/data/${args.event_type}`
      : '/api/v2/events/data/events';
    return this.nsGet(eventPath, params);
  }
}
