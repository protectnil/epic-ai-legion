/**
 * SonarQube MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/SonarSource/sonarqube-mcp-server — actively maintained, requires SonarQube Cloud or container.
// This adapter is a lightweight self-hosted fallback for on-prem SonarQube Server deployments using user/project analysis tokens.

import { ToolDefinition, ToolResult } from './types.js';

interface SonarQubeConfig {
  baseUrl: string;
  token: string;
}

export class SonarQubeMCPServer {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: SonarQubeConfig) {
    // baseUrl: e.g. https://sonarqube.example.com (no trailing slash)
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'Search and list projects in SonarQube',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to filter projects by name or key',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (max 500, default: 100)',
            },
          },
        },
      },
      {
        name: 'get_project_measures',
        description: 'Get code quality metrics for a project component (e.g. bugs, vulnerabilities, code smells, coverage, duplications)',
        inputSchema: {
          type: 'object',
          properties: {
            component: {
              type: 'string',
              description: 'Project key, e.g. my_project',
            },
            metricKeys: {
              type: 'string',
              description: 'Comma-separated list of metric keys, e.g. bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,ncloc,sqale_rating,reliability_rating,security_rating',
            },
          },
          required: ['component', 'metricKeys'],
        },
      },
      {
        name: 'list_issues',
        description: 'Search for code issues (bugs, vulnerabilities, code smells) in a project',
        inputSchema: {
          type: 'object',
          properties: {
            componentKeys: {
              type: 'string',
              description: 'Comma-separated project or component keys to filter by',
            },
            types: {
              type: 'string',
              description: 'Comma-separated issue types: BUG, VULNERABILITY, CODE_SMELL',
            },
            severities: {
              type: 'string',
              description: 'Comma-separated severities: BLOCKER, CRITICAL, MAJOR, MINOR, INFO',
            },
            statuses: {
              type: 'string',
              description: 'Comma-separated statuses: OPEN, CONFIRMED, REOPENED, RESOLVED, CLOSED',
            },
            resolved: {
              type: 'boolean',
              description: 'Filter to resolved (true) or unresolved (false) issues',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of issues per page (max 500, default: 100)',
            },
          },
        },
      },
      {
        name: 'list_rules',
        description: 'Search for quality rules in the SonarQube rules repository',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for rule name or description',
            },
            languages: {
              type: 'string',
              description: 'Comma-separated language keys, e.g. java,js,py',
            },
            types: {
              type: 'string',
              description: 'Comma-separated rule types: BUG, VULNERABILITY, CODE_SMELL, SECURITY_HOTSPOT',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of rules per page (max 500, default: 100)',
            },
          },
        },
      },
      {
        name: 'list_quality_gates',
        description: 'List all quality gates defined in SonarQube',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_quality_gate_status',
        description: 'Get the quality gate status (pass/fail) for a specific project',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'Project key to check the quality gate status for',
            },
          },
          required: ['projectKey'],
        },
      },
      {
        name: 'search_hotspots',
        description: 'Search for security hotspots in a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'Project key to search hotspots in',
            },
            status: {
              type: 'string',
              description: 'Filter by hotspot status: TO_REVIEW, REVIEWED',
            },
            resolution: {
              type: 'string',
              description: 'Filter by resolution when status is REVIEWED: FIXED, SAFE, ACKNOWLEDGED',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of hotspots per page (max 500, default: 100)',
            },
          },
          required: ['projectKey'],
        },
      },
      {
        name: 'get_system_health',
        description: 'Get the health status of the SonarQube server',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_projects': {
          const page = (args.page as number) || 1;
          const pageSize = (args.pageSize as number) || 100;
          let url = `${this.baseUrl}/api/projects/search?p=${page}&ps=${pageSize}`;
          if (args.query) url += `&q=${encodeURIComponent(args.query as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list projects: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`SonarQube returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_project_measures': {
          const component = args.component as string;
          const metricKeys = args.metricKeys as string;
          if (!component || !metricKeys) {
            return { content: [{ type: 'text', text: 'component and metricKeys are required' }], isError: true };
          }

          const url = `${this.baseUrl}/api/measures/component?component=${encodeURIComponent(component)}&metricKeys=${encodeURIComponent(metricKeys)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get project measures: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`SonarQube returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_issues': {
          const page = (args.page as number) || 1;
          const pageSize = (args.pageSize as number) || 100;
          let url = `${this.baseUrl}/api/issues/search?p=${page}&ps=${pageSize}`;
          if (args.componentKeys) url += `&componentKeys=${encodeURIComponent(args.componentKeys as string)}`;
          if (args.types) url += `&types=${encodeURIComponent(args.types as string)}`;
          if (args.severities) url += `&severities=${encodeURIComponent(args.severities as string)}`;
          if (args.statuses) url += `&statuses=${encodeURIComponent(args.statuses as string)}`;
          if (typeof args.resolved === 'boolean') url += `&resolved=${args.resolved}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list issues: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`SonarQube returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_rules': {
          const page = (args.page as number) || 1;
          const pageSize = (args.pageSize as number) || 100;
          let url = `${this.baseUrl}/api/rules/search?p=${page}&ps=${pageSize}`;
          if (args.query) url += `&q=${encodeURIComponent(args.query as string)}`;
          if (args.languages) url += `&languages=${encodeURIComponent(args.languages as string)}`;
          if (args.types) url += `&types=${encodeURIComponent(args.types as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list rules: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`SonarQube returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_quality_gates': {
          const url = `${this.baseUrl}/api/qualitygates/list`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list quality gates: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`SonarQube returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_quality_gate_status': {
          const projectKey = args.projectKey as string;
          if (!projectKey) {
            return { content: [{ type: 'text', text: 'projectKey is required' }], isError: true };
          }

          const url = `${this.baseUrl}/api/qualitygates/project_status?projectKey=${encodeURIComponent(projectKey)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get quality gate status: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`SonarQube returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_hotspots': {
          const projectKey = args.projectKey as string;
          if (!projectKey) {
            return { content: [{ type: 'text', text: 'projectKey is required' }], isError: true };
          }

          const page = (args.page as number) || 1;
          const pageSize = (args.pageSize as number) || 100;
          let url = `${this.baseUrl}/api/hotspots/search?projectKey=${encodeURIComponent(projectKey)}&p=${page}&ps=${pageSize}`;
          if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;
          if (args.resolution) url += `&resolution=${encodeURIComponent(args.resolution as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to search hotspots: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`SonarQube returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_system_health': {
          const url = `${this.baseUrl}/api/system/health`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get system health: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`SonarQube returned non-JSON response (HTTP ${response.status})`); }
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
