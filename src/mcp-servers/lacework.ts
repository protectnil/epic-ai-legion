/**
 * Lacework MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Lacework MCP server was found in the lacework GitHub org or the MCP registry.
// Lacework is now branded as Fortinet FortiCNAPP following the 2024 acquisition.
//
// Base URL: https://{account}.lacework.net/api/v2
// Auth: OAuth2-style token exchange — POST /api/v2/access/tokens with keyId + secret → Bearer token
// Docs: https://docs.lacework.net/api/v2/docs/
// Rate limits: 480 API requests per hour per user

import { ToolDefinition, ToolResult } from './types.js';

interface LaceworkConfig {
  account: string;
  keyId: string;
  secret: string;
  baseUrl?: string;
}

export class LaceworkMCPServer {
  private readonly baseUrl: string;
  private readonly keyId: string;
  private readonly secret: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: LaceworkConfig) {
    this.keyId = config.keyId;
    this.secret = config.secret;
    this.baseUrl = config.baseUrl ?? `https://${config.account}.lacework.net/api/v2`;
  }

  static catalog() {
    return {
      name: 'lacework',
      displayName: 'Lacework',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: ['lacework', 'forticnapp', 'cnapp', 'cloud-security', 'alerts', 'vulnerabilities', 'compliance', 'policies', 'containers', 'anomaly'],
      toolNames: [
        'list_alerts', 'get_alert', 'list_alert_channels',
        'search_vulnerabilities_hosts', 'search_vulnerabilities_containers',
        'get_compliance_evaluation', 'list_compliance_frameworks',
        'list_policies', 'get_policy', 'update_policy',
        'list_queries', 'run_query',
        'search_machines', 'search_containers',
        'list_agent_access_tokens', 'list_datasources',
      ],
      description: 'Lacework/FortiCNAPP cloud-native security: query alerts, vulnerabilities, compliance posture, policies, and LQL queries across cloud workloads and containers.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alerts',
        description: 'List Lacework security alerts with optional filters for severity, status, and time range',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: {
              type: 'string',
              description: 'Start time in ISO 8601 format (e.g. "2026-01-01T00:00:00Z")',
            },
            end_time: {
              type: 'string',
              description: 'End time in ISO 8601 format (e.g. "2026-01-31T23:59:59Z")',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: Critical, High, Medium, Low, Info',
            },
            status: {
              type: 'string',
              description: 'Filter by status: Open, Dismissed, Resolved',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of alerts to return (default: 50, max: 5000)',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get full details and investigation data for a specific Lacework alert by ID',
        inputSchema: {
          type: 'object',
          properties: {
            alertId: {
              type: 'string',
              description: 'Lacework alert ID',
            },
            scope: {
              type: 'string',
              description: 'Level of detail to return: Details, Investigation, Events, RelatedAlerts, Integrations, Timeline (default: Details)',
            },
          },
          required: ['alertId'],
        },
      },
      {
        name: 'list_alert_channels',
        description: 'List configured Lacework alert channels (Slack, PagerDuty, email, webhooks, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by alert channel type (e.g. SlackChannel, PagerDutyApiV2, EmailUser)',
            },
          },
        },
      },
      {
        name: 'search_vulnerabilities_hosts',
        description: 'Search Lacework host vulnerability assessments with filters for severity, package, and CVE ID',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: {
              type: 'string',
              description: 'Start time for the search window in ISO 8601 format',
            },
            end_time: {
              type: 'string',
              description: 'End time for the search window in ISO 8601 format',
            },
            cve_id: {
              type: 'string',
              description: 'Filter by CVE ID (e.g. "CVE-2021-44228")',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: Critical, High, Medium, Low, Info',
            },
            status: {
              type: 'string',
              description: 'Filter by fix status: EXCEPTION, FIX_AVAILABLE, NO_FIX, SUPPRESSED',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'search_vulnerabilities_containers',
        description: 'Search Lacework container image vulnerability assessments with CVE, severity, and image filters',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: {
              type: 'string',
              description: 'Start time for the search window in ISO 8601 format',
            },
            end_time: {
              type: 'string',
              description: 'End time for the search window in ISO 8601 format',
            },
            cve_id: {
              type: 'string',
              description: 'Filter by CVE ID',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: Critical, High, Medium, Low, Info',
            },
            image_id: {
              type: 'string',
              description: 'Filter by container image ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_compliance_evaluation',
        description: 'Get the latest compliance evaluation report for a cloud account and compliance framework',
        inputSchema: {
          type: 'object',
          properties: {
            primary_query_id: {
              type: 'string',
              description: 'Compliance framework query ID (e.g. "AWS_CIS_14", "GCP_CIS_12", "AZURE_CIS_14")',
            },
            account_id: {
              type: 'string',
              description: 'Cloud account ID to evaluate compliance for',
            },
          },
          required: ['primary_query_id'],
        },
      },
      {
        name: 'list_compliance_frameworks',
        description: 'List available Lacework compliance evaluation frameworks for AWS, GCP, and Azure',
        inputSchema: {
          type: 'object',
          properties: {
            cloud_provider: {
              type: 'string',
              description: 'Filter by cloud provider: AWS, GCP, Azure (default: all)',
            },
          },
        },
      },
      {
        name: 'list_policies',
        description: 'List Lacework detection policies with optional filters for enabled status and severity',
        inputSchema: {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean',
              description: 'Filter by enabled status (true = active policies only)',
            },
            severity: {
              type: 'string',
              description: 'Filter by policy severity: Critical, High, Medium, Low, Info',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of policies to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_policy',
        description: 'Get the full definition of a specific Lacework detection policy by policy ID',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'Lacework policy ID (e.g. "lacework-global-1")',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'update_policy',
        description: 'Enable, disable, or update the severity of a Lacework detection policy',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'Lacework policy ID to update',
            },
            enabled: {
              type: 'boolean',
              description: 'Set to true to enable or false to disable the policy',
            },
            severity: {
              type: 'string',
              description: 'New severity level: Critical, High, Medium, Low, Info',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'list_queries',
        description: 'List Lacework LQL (Lacework Query Language) queries available in the account',
        inputSchema: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description: 'Filter by query source: Lacework (built-in) or Custom (user-defined)',
            },
          },
        },
      },
      {
        name: 'run_query',
        description: 'Execute a Lacework LQL query with a time range and return matching events',
        inputSchema: {
          type: 'object',
          properties: {
            query_text: {
              type: 'string',
              description: 'LQL query string to execute (e.g. "{ source { LW_HE_FILES } filter { ACTION = \'CREATE\' } return { distinct { FILE_PATH } } }")',
            },
            start_time: {
              type: 'string',
              description: 'Query start time in ISO 8601 format (e.g. "2026-01-01T00:00:00Z")',
            },
            end_time: {
              type: 'string',
              description: 'Query end time in ISO 8601 format (e.g. "2026-01-02T00:00:00Z")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100)',
            },
          },
          required: ['query_text', 'start_time', 'end_time'],
        },
      },
      {
        name: 'search_machines',
        description: 'Search Lacework machine/host inventory with filters for hostname, OS, and active status',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: {
              type: 'string',
              description: 'Start time for the search window in ISO 8601 format',
            },
            end_time: {
              type: 'string',
              description: 'End time for the search window in ISO 8601 format',
            },
            hostname: {
              type: 'string',
              description: 'Filter by hostname (partial match supported)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'search_containers',
        description: 'Search Lacework container inventory with filters for image, namespace, and cluster',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: {
              type: 'string',
              description: 'Start time for the search window in ISO 8601 format',
            },
            end_time: {
              type: 'string',
              description: 'End time for the search window in ISO 8601 format',
            },
            image_repo: {
              type: 'string',
              description: 'Filter by container image repository (e.g. "nginx")',
            },
            namespace: {
              type: 'string',
              description: 'Filter by Kubernetes namespace',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'list_agent_access_tokens',
        description: 'List Lacework agent access tokens used to authorize agent installations',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of tokens to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'list_datasources',
        description: 'List all Lacework LQL datasources available for querying in this account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const token = await this.getOrRefreshToken();
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      switch (name) {
        case 'list_alerts':
          return await this.listAlerts(headers, args);
        case 'get_alert':
          return await this.getAlert(headers, args);
        case 'list_alert_channels':
          return await this.listAlertChannels(headers, args);
        case 'search_vulnerabilities_hosts':
          return await this.searchVulnerabilitiesHosts(headers, args);
        case 'search_vulnerabilities_containers':
          return await this.searchVulnerabilitiesContainers(headers, args);
        case 'get_compliance_evaluation':
          return await this.getComplianceEvaluation(headers, args);
        case 'list_compliance_frameworks':
          return await this.listComplianceFrameworks(headers, args);
        case 'list_policies':
          return await this.listPolicies(headers, args);
        case 'get_policy':
          return await this.getPolicy(headers, args);
        case 'update_policy':
          return await this.updatePolicy(headers, args);
        case 'list_queries':
          return await this.listQueries(headers, args);
        case 'run_query':
          return await this.runQuery(headers, args);
        case 'search_machines':
          return await this.searchMachines(headers, args);
        case 'search_containers':
          return await this.searchContainers(headers, args);
        case 'list_agent_access_tokens':
          return await this.listAgentAccessTokens(headers, args);
        case 'list_datasources':
          return await this.listDatasources(headers);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    const response = await fetch(`${this.baseUrl}/access/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LW-UAKS': this.secret,
      },
      body: JSON.stringify({
        keyId: this.keyId,
        expiryTime: 3600,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework auth failed: ${response.status} ${text}`);
    }

    const data = await response.json() as { data?: { token: string; expiresAt: string } };
    if (!data.data?.token) {
      throw new Error('Lacework auth returned no token');
    }

    this.bearerToken = data.data.token;
    // Refresh 60 seconds early per protocol
    this.tokenExpiry = now + (3600 - 60) * 1000;
    return this.bearerToken;
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private buildTimeFilter(args: Record<string, unknown>): Record<string, unknown> {
    const filters: Record<string, unknown> = {};
    if (args.start_time || args.end_time) {
      filters.timeFilter = {
        startTime: args.start_time ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endTime: args.end_time ?? new Date().toISOString(),
      };
    }
    return filters;
  }

  private async listAlerts(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      ...this.buildTimeFilter(args),
      returns: (args.limit as number) ?? 50,
    };
    const fieldFilters: Array<Record<string, unknown>> = [];
    if (args.severity) fieldFilters.push({ field: 'severity', expression: 'eq', value: args.severity });
    if (args.status) fieldFilters.push({ field: 'status', expression: 'eq', value: args.status });
    if (fieldFilters.length > 0) body.filters = fieldFilters;

    const response = await fetch(`${this.baseUrl}/Alerts/search`, {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error ${response.status}: ${text}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAlert(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const scope = (args.scope as string) ?? 'Details';
    const params = new URLSearchParams({ scope });
    const response = await fetch(
      `${this.baseUrl}/Alerts/${encodeURIComponent(String(args.alertId))}?${params}`,
      { method: 'GET', headers }
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error ${response.status}: ${text}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAlertChannels(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.type) params.set('type', args.type as string);
    const qs = params.toString();
    const response = await fetch(`${this.baseUrl}/AlertChannels${qs ? `?${qs}` : ''}`, { headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error ${response.status}: ${text}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchVulnerabilitiesHosts(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      ...this.buildTimeFilter(args),
      returns: (args.limit as number) ?? 50,
    };
    const fieldFilters: Array<Record<string, unknown>> = [];
    if (args.cve_id) fieldFilters.push({ field: 'vulnId', expression: 'eq', value: args.cve_id });
    if (args.severity) fieldFilters.push({ field: 'severity', expression: 'eq', value: args.severity });
    if (args.status) fieldFilters.push({ field: 'fixInfo.fixAvailable', expression: 'eq', value: args.status });
    if (fieldFilters.length > 0) body.filters = fieldFilters;

    const response = await fetch(`${this.baseUrl}/Vulnerabilities/Hosts/search`, {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error ${response.status}: ${text}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchVulnerabilitiesContainers(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      ...this.buildTimeFilter(args),
      returns: (args.limit as number) ?? 50,
    };
    const fieldFilters: Array<Record<string, unknown>> = [];
    if (args.cve_id) fieldFilters.push({ field: 'vulnId', expression: 'eq', value: args.cve_id });
    if (args.severity) fieldFilters.push({ field: 'severity', expression: 'eq', value: args.severity });
    if (args.image_id) fieldFilters.push({ field: 'imageId', expression: 'eq', value: args.image_id });
    if (fieldFilters.length > 0) body.filters = fieldFilters;

    const response = await fetch(`${this.baseUrl}/Vulnerabilities/Containers/search`, {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error ${response.status}: ${text}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getComplianceEvaluation(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ primaryQueryId: args.primary_query_id as string });
    if (args.account_id) params.set('accountId', args.account_id as string);

    const response = await fetch(`${this.baseUrl}/Configs/ComplianceEvaluations?${params}`, { headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error ${response.status}: ${text}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listComplianceFrameworks(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cloud_provider) params.set('cloudProvider', args.cloud_provider as string);
    const qs = params.toString();
    const response = await fetch(`${this.baseUrl}/Configs/ComplianceEvaluations${qs ? `?${qs}` : ''}`, { headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error ${response.status}: ${text}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listPolicies(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (typeof args.enabled === 'boolean') params.set('enabled', String(args.enabled));
    if (args.severity) params.set('severity', args.severity as string);
    if (args.limit) params.set('limit', String(args.limit));
    const qs = params.toString();

    const response = await fetch(`${this.baseUrl}/Policies${qs ? `?${qs}` : ''}`, { headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error ${response.status}: ${text}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getPolicy(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/Policies/${encodeURIComponent(args.policy_id as string)}`,
      { headers }
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error ${response.status}: ${text}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updatePolicy(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (typeof args.enabled === 'boolean') body.enabled = args.enabled;
    if (args.severity) body.severity = args.severity;

    const response = await fetch(
      `${this.baseUrl}/Policies/${encodeURIComponent(args.policy_id as string)}`,
      { method: 'PATCH', headers, body: JSON.stringify(body) }
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error ${response.status}: ${text}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listQueries(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.source) params.set('querySource', args.source as string);
    const qs = params.toString();

    const response = await fetch(`${this.baseUrl}/Queries${qs ? `?${qs}` : ''}`, { headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error ${response.status}: ${text}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async runQuery(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      query: { queryText: args.query_text },
      arguments: [
        { name: 'StartTimeRange', value: args.start_time },
        { name: 'EndTimeRange', value: args.end_time },
      ],
      options: { limit: (args.limit as number) ?? 100 },
    };

    const response = await fetch(`${this.baseUrl}/Queries/execute`, {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error ${response.status}: ${text}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchMachines(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      ...this.buildTimeFilter(args),
      returns: (args.limit as number) ?? 50,
    };
    if (args.hostname) {
      body.filters = [{ field: 'hostname', expression: 'ilike', value: `%${encodeURIComponent(args.hostname as string)}%` }];
    }

    const response = await fetch(`${this.baseUrl}/Entities/Machines/search`, {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error ${response.status}: ${text}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchContainers(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      ...this.buildTimeFilter(args),
      returns: (args.limit as number) ?? 50,
    };
    const fieldFilters: Array<Record<string, unknown>> = [];
    if (args.image_repo) fieldFilters.push({ field: 'imageRepo', expression: 'ilike', value: `%${encodeURIComponent(args.image_repo as string)}%` });
    if (args.namespace) fieldFilters.push({ field: 'props.NAMESPACE', expression: 'eq', value: args.namespace });
    if (fieldFilters.length > 0) body.filters = fieldFilters;

    const response = await fetch(`${this.baseUrl}/Entities/Containers/search`, {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error ${response.status}: ${text}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAgentAccessTokens(headers: Record<string, string>, args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    const qs = params.toString();

    const response = await fetch(`${this.baseUrl}/AgentAccessTokens${qs ? `?${qs}` : ''}`, { headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error ${response.status}: ${text}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listDatasources(headers: Record<string, string>): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}/Datasources`, { headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error ${response.status}: ${text}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
