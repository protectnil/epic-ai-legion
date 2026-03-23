/** Datadog Security MCP Adapter / Built on the Epic AI® Intelligence Platform / Copyright 2026 protectNIL Inc. Apache-2.0 */
import { ToolDefinition, ToolResult } from './types.js';

export class DatadogSecurityMCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: {
    apiKey: string;
    applicationKey: string;
    site?: string;
  }) {
    this.baseUrl = `https://api.${config.site || 'datadoghq.com'}`;
    this.headers = {
      'DD-API-KEY': config.apiKey,
      'DD-APPLICATION-KEY': config.applicationKey,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_security_signals',
        description: 'List security signals from Datadog',
        inputSchema: {
          type: 'object',
          properties: {
            filter_query: {
              type: 'string',
              description: 'Filter query expression (e.g., "status:high severity:critical")',
            },
            filter_from: {
              type: 'number',
              description: 'Start timestamp in milliseconds (Unix epoch)',
            },
            filter_to: {
              type: 'number',
              description: 'End timestamp in milliseconds (Unix epoch)',
            },
            page_limit: {
              type: 'number',
              description: 'Number of signals to return per page (default: 50, max: 1000)',
            },
            page_cursor: {
              type: 'string',
              description: 'Cursor for pagination returned from a previous response',
            },
            sort: {
              type: 'string',
              description: 'Sort order: "timestamp" (ascending) or "-timestamp" (descending, default)',
            },
          },
        },
      },
      {
        name: 'get_signal',
        description: 'Get details of a specific security signal',
        inputSchema: {
          type: 'object',
          properties: {
            signal_id: {
              type: 'string',
              description: 'The security signal ID',
            },
          },
          required: ['signal_id'],
        },
      },
      {
        name: 'list_monitors',
        description: 'List monitors configured in Datadog, optionally filtered by tags or name',
        inputSchema: {
          type: 'object',
          properties: {
            monitor_tags: {
              type: 'string',
              description: 'Comma-separated list of monitor tags to filter by (e.g., "env:prod,team:security"). Tags must be assigned to the monitor via the API tags field.',
            },
            name: {
              type: 'string',
              description: 'Filter monitors whose name contains this string (case-insensitive substring match)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (0-indexed, default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of monitors to return per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_cloud_security_findings',
        description: 'Retrieve cloud security posture findings and compliance issues (misconfigurations and identity risks)',
        inputSchema: {
          type: 'object',
          properties: {
            filter_tags: {
              type: 'string',
              description: 'Filter findings by tag (repeatable; e.g., "cloud_provider:aws")',
            },
            filter_status: {
              type: 'string',
              description: 'Filter by finding status. Allowed values: critical, high, medium, low, info',
            },
            filter_evaluation: {
              type: 'string',
              description: 'Filter by evaluation result: pass or fail',
            },
            filter_resource_type: {
              type: 'string',
              description: 'Filter by resource type (e.g., "aws_s3_bucket")',
            },
            filter_vulnerability_type: {
              type: 'string',
              description: 'Filter by vulnerability type. Allowed values: misconfiguration, attack_path, identity_risk, api_security',
            },
            page_limit: {
              type: 'number',
              description: 'Maximum findings to return (default: 100, max: 1000)',
            },
            page_cursor: {
              type: 'string',
              description: 'Cursor for pagination returned from a previous response',
            },
          },
        },
      },
    ];
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_security_signals':
          return await this.listSecuritySignals(
            args.filter_query as string | undefined,
            args.filter_from as number | undefined,
            args.filter_to as number | undefined,
            args.page_limit as number | undefined,
            args.page_cursor as string | undefined,
            args.sort as string | undefined
          );
        case 'get_signal':
          return await this.getSignal(args.signal_id as string);
        case 'list_monitors':
          return await this.listMonitors(
            args.monitor_tags as string | undefined,
            args.name as string | undefined,
            args.page as number | undefined,
            args.page_size as number | undefined
          );
        case 'get_cloud_security_findings':
          return await this.getCloudSecurityFindings(
            args.filter_tags as string | undefined,
            args.filter_status as string | undefined,
            args.filter_evaluation as string | undefined,
            args.filter_resource_type as string | undefined,
            args.filter_vulnerability_type as string | undefined,
            args.page_limit as number | undefined,
            args.page_cursor as string | undefined
          );
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error instanceof Error ? error.message : String(error)) }],
        isError: true,
      };
    }
  }

  private async listSecuritySignals(
    filterQuery?: string,
    filterFrom?: number,
    filterTo?: number,
    pageLimit?: number,
    pageCursor?: string,
    sort?: string
  ): Promise<ToolResult> {
    const now = Date.now();
    const params = new URLSearchParams();

    if (filterQuery) {
      params.append('filter[query]', filterQuery);
    }
    params.append('filter[from]', String(filterFrom ?? now - 24 * 60 * 60 * 1000));
    params.append('filter[to]', String(filterTo ?? now));
    params.append('page[limit]', String(pageLimit ?? 50));
    if (pageCursor) {
      params.append('page[cursor]', pageCursor);
    }
    params.append('sort', sort ?? '-timestamp');

    const response = await fetch(
      `${this.baseUrl}/api/v2/security_monitoring/signals?${params}`,
      {
        method: 'GET',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Datadog API error: ${response.status} ${response.statusText}`
      );
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Datadog returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getSignal(signalId: string): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/api/v2/security_monitoring/signals/${signalId}`,
      {
        method: 'GET',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Datadog API error: ${response.status} ${response.statusText}`
      );
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Datadog returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listMonitors(
    monitorTags?: string,
    name?: string,
    page?: number,
    pageSize?: number
  ): Promise<ToolResult> {
    const params = new URLSearchParams();

    // Valid GET /api/v1/monitor query params: monitor_tags, name, page, page_size, group_states
    if (monitorTags) {
      params.append('monitor_tags', monitorTags);
    }
    if (name) {
      params.append('name', name);
    }
    params.append('page', String(page ?? 0));
    params.append('page_size', String(pageSize ?? 100));

    const response = await fetch(
      `${this.baseUrl}/api/v1/monitor?${params}`,
      {
        method: 'GET',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Datadog API error: ${response.status} ${response.statusText}`
      );
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Datadog returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getCloudSecurityFindings(
    filterTags?: string,
    filterStatus?: string,
    filterEvaluation?: string,
    filterResourceType?: string,
    filterVulnerabilityType?: string,
    pageLimit?: number,
    pageCursor?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();

    // Valid GET /api/v2/security_monitoring/findings query params use bracket notation
    if (filterTags) {
      params.append('filter[tags]', filterTags);
    }
    if (filterStatus) {
      params.append('filter[status]', filterStatus);
    }
    if (filterEvaluation) {
      params.append('filter[evaluation]', filterEvaluation);
    }
    if (filterResourceType) {
      params.append('filter[resource_type]', filterResourceType);
    }
    if (filterVulnerabilityType) {
      params.append('filter[vulnerability_type]', filterVulnerabilityType);
    }
    params.append('page[limit]', String(pageLimit ?? 100));
    if (pageCursor) {
      params.append('page[cursor]', pageCursor);
    }

    const response = await fetch(
      `${this.baseUrl}/api/v2/security_monitoring/findings?${params}`,
      {
        method: 'GET',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Datadog API error: ${response.status} ${response.statusText}`
      );
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Datadog returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
