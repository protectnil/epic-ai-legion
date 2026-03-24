/**
 * mabl MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://www.mabl.com/mabl-mcp-server — transport: stdio, auth: API key via @mablhq/mabl-cli
// npm: @mablhq/mabl-cli (run: mabl mcp start) — announced August 2025, actively maintained.
// Our adapter covers: 14 tools (plans, deployments, results, executions, environments, applications, labels).
// Recommendation: Use the official mabl MCP (@mablhq/mabl-cli) for IDE-integrated workflows.
// Use this adapter for REST API access, CI/CD pipelines, or air-gapped deployments.
//
// Base URL: https://api.mabl.com
// Auth: Basic auth with literal string "key" as username and API key as password
// Docs: https://api.help.mabl.com/docs/getting-started
// Rate limits: Not publicly documented; workspace-scoped per API key tier.

import { ToolDefinition, ToolResult } from './types.js';

interface MablConfig {
  apiKey: string;
  baseUrl?: string;
}

export class MablMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: MablConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.mabl.com';
  }

  static catalog() {
    return {
      name: 'mabl',
      displayName: 'mabl',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'mabl', 'test automation', 'ai testing', 'end to end testing', 'e2e',
        'ci cd', 'deployment', 'test plan', 'test execution', 'test result',
        'environment', 'application', 'regression', 'browser testing', 'quality',
      ],
      toolNames: [
        'list_plans', 'get_plan',
        'list_environments', 'get_environment', 'create_environment',
        'list_applications', 'get_application',
        'trigger_deployment', 'get_deployment_result',
        'list_executions', 'get_execution',
        'list_labels', 'get_workspace',
        'get_deployment_status',
      ],
      description: 'mabl AI test automation: trigger deployments, retrieve test execution results, manage plans, environments, and applications via the mabl REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_plans',
        description: 'List mabl test plans in the workspace with optional filters for environment and application',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'Filter plans associated with a specific environment ID',
            },
            application_id: {
              type: 'string',
              description: 'Filter plans associated with a specific application ID',
            },
          },
        },
      },
      {
        name: 'get_plan',
        description: 'Get details of a single mabl test plan by plan ID including test configuration and schedule',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: {
              type: 'string',
              description: 'mabl plan ID',
            },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'list_environments',
        description: 'List all test environments defined in the mabl workspace with URL and configuration details',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Filter environments linked to a specific application ID',
            },
          },
        },
      },
      {
        name: 'get_environment',
        description: 'Get details of a single mabl test environment by environment ID including base URL',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'mabl environment ID',
            },
          },
          required: ['environment_id'],
        },
      },
      {
        name: 'create_environment',
        description: 'Create a new test environment in mabl with a name and base URL',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the new environment (e.g. "Staging", "QA")',
            },
            url: {
              type: 'string',
              description: 'Base URL of the environment under test (e.g. "https://staging.example.com")',
            },
            application_id: {
              type: 'string',
              description: 'Application ID to associate this environment with',
            },
          },
          required: ['name', 'url'],
        },
      },
      {
        name: 'list_applications',
        description: 'List mabl applications (the products/services being tested) in the workspace',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_application',
        description: 'Get details of a single mabl application by application ID',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'mabl application ID',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'trigger_deployment',
        description: 'Trigger a mabl deployment event to run test plans matching the given application or environment criteria',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Run tests for this application ID (at least one of application_id or environment_id is required)',
            },
            environment_id: {
              type: 'string',
              description: 'Run tests for this environment ID (at least one of application_id or environment_id is required)',
            },
            plan_labels: {
              type: 'array',
              description: 'Array of label strings to filter which plans execute (e.g. ["smoke", "regression"])',
            },
            revision: {
              type: 'string',
              description: 'Git revision or deploy version being tested (for traceability)',
            },
            preview: {
              type: 'boolean',
              description: 'If true, preview which plans would run without actually executing (default: false)',
            },
          },
        },
      },
      {
        name: 'get_deployment_result',
        description: 'Get the test result summary for a deployment event — shows pass/fail counts and status for all triggered plans',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Deployment event ID returned by trigger_deployment',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'list_executions',
        description: 'List recent test plan executions with optional filters for plan, environment, and result status',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: {
              type: 'string',
              description: 'Filter executions for a specific plan ID',
            },
            environment_id: {
              type: 'string',
              description: 'Filter executions for a specific environment ID',
            },
            status: {
              type: 'string',
              description: 'Filter by result status: passed, failed, skipped (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of executions to return (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_execution',
        description: 'Get detailed results for a single test plan execution including individual test outcomes',
        inputSchema: {
          type: 'object',
          properties: {
            plan_run_id: {
              type: 'string',
              description: 'mabl plan run ID to retrieve execution details for',
            },
          },
          required: ['plan_run_id'],
        },
      },
      {
        name: 'list_labels',
        description: 'List all labels defined in the mabl workspace used for organizing and filtering test plans',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_workspace',
        description: 'Get current workspace information including organization name, plan tier, and usage statistics',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_deployment_status',
        description: 'Poll the status of a triggered deployment event to check if all tests have completed',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Deployment event ID to check status for',
            },
          },
          required: ['event_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_plans':
          return this.listPlans(args);
        case 'get_plan':
          return this.getPlan(args);
        case 'list_environments':
          return this.listEnvironments(args);
        case 'get_environment':
          return this.getEnvironment(args);
        case 'create_environment':
          return this.createEnvironment(args);
        case 'list_applications':
          return this.listApplications();
        case 'get_application':
          return this.getApplication(args);
        case 'trigger_deployment':
          return this.triggerDeployment(args);
        case 'get_deployment_result':
          return this.getDeploymentResult(args);
        case 'list_executions':
          return this.listExecutions(args);
        case 'get_execution':
          return this.getExecution(args);
        case 'list_labels':
          return this.listLabels();
        case 'get_workspace':
          return this.getWorkspace();
        case 'get_deployment_status':
          return this.getDeploymentStatus(args);
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
    // mabl uses Basic auth with "key" as username and the API key as password
    const encoded = btoa(`key:${this.apiKey}`);
    return {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/${path}${qs ? '?' + qs : ''}`;
    const response = await fetch(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/${path}`;
    const response = await fetch(url, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listPlans(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.environment_id) params['environment_id'] = args.environment_id as string;
    if (args.application_id) params['application_id'] = args.application_id as string;
    return this.apiGet('schedule/runpolicies/v1', params);
  }

  private async getPlan(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.plan_id) return { content: [{ type: 'text', text: 'plan_id is required' }], isError: true };
    return this.apiGet(`schedule/runpolicies/v1/${args.plan_id}`);
  }

  private async listEnvironments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.application_id) params['application_id'] = args.application_id as string;
    return this.apiGet('environments/v1', params);
  }

  private async getEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.environment_id) return { content: [{ type: 'text', text: 'environment_id is required' }], isError: true };
    return this.apiGet(`environments/v1/${args.environment_id}`);
  }

  private async createEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.url) return { content: [{ type: 'text', text: 'name and url are required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      url: args.url,
    };
    if (args.application_id) body['application_id'] = args.application_id;
    return this.apiPost('environments/v1', body);
  }

  private async listApplications(): Promise<ToolResult> {
    return this.apiGet('applications/v1');
  }

  private async getApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id) return { content: [{ type: 'text', text: 'application_id is required' }], isError: true };
    return this.apiGet(`applications/v1/${args.application_id}`);
  }

  private async triggerDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id && !args.environment_id) {
      return { content: [{ type: 'text', text: 'At least one of application_id or environment_id is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.application_id) body['application_id'] = args.application_id;
    if (args.environment_id) body['environment_id'] = args.environment_id;
    if (args.plan_labels) body['plan_labels'] = args.plan_labels;
    if (args.revision) body['revision'] = args.revision;

    const preview = args.preview === true;
    const path = preview ? 'events/deployment?preview=true' : 'events/deployment';
    return this.apiPost(path, body);
  }

  private async getDeploymentResult(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    return this.apiGet(`execution/result/event/${args.event_id}`);
  }

  private async listExecutions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
    };
    if (args.plan_id) params['plan_id'] = args.plan_id as string;
    if (args.environment_id) params['environment_id'] = args.environment_id as string;
    if (args.status) params['status'] = args.status as string;
    return this.apiGet('execution/plan/result/v7', params);
  }

  private async getExecution(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.plan_run_id) return { content: [{ type: 'text', text: 'plan_run_id is required' }], isError: true };
    return this.apiGet(`execution/plan/result/v7/${args.plan_run_id}`);
  }

  private async listLabels(): Promise<ToolResult> {
    return this.apiGet('labels/v1');
  }

  private async getWorkspace(): Promise<ToolResult> {
    return this.apiGet('workspace/v1');
  }

  private async getDeploymentStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    return this.apiGet(`execution/result/event/${args.event_id}`);
  }
}
