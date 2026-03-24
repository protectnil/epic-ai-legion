/**
 * Harness CI/CD MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Harness MCP server was found on GitHub or npm.
//
// Base URL: https://app.harness.io/v1
// Auth: API key in x-api-key header and account ID in Harness-Account header.
//       Generate API tokens in Harness Platform → My Profile → My API Keys.
// Docs: https://apidocs.harness.io/
//       Getting started: https://developer.harness.io/docs/platform/automation/api/api-quickstart/
// Rate limits: Not publicly documented per-endpoint. Subject to account plan limits.
//              Include Harness-Account header on every request.

import { ToolDefinition, ToolResult } from './types.js';

interface HarnessCICDConfig {
  apiKey: string;
  accountId: string;
  baseUrl?: string;
}

export class HarnessCICDMCPServer {
  private readonly apiKey: string;
  private readonly accountId: string;
  private readonly baseUrl: string;

  constructor(config: HarnessCICDConfig) {
    this.apiKey = config.apiKey;
    this.accountId = config.accountId;
    this.baseUrl = config.baseUrl || 'https://app.harness.io/v1';
  }

  static catalog() {
    return {
      name: 'harness-cicd',
      displayName: 'Harness CI/CD',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'harness', 'cicd', 'pipeline', 'deployment', 'ci', 'cd', 'build', 'artifact',
        'connector', 'secret', 'environment', 'service', 'infrastructure', 'execution',
      ],
      toolNames: [
        'list_pipelines',
        'get_pipeline',
        'execute_pipeline',
        'list_executions',
        'get_execution',
        'retry_execution',
        'abort_execution',
        'list_projects',
        'get_project',
        'list_connectors',
        'get_connector',
        'list_secrets',
        'get_secret',
        'list_environments',
        'get_environment',
        'list_services',
        'get_service',
      ],
      description: 'Harness AI-powered CI/CD: manage pipelines, trigger deployments, inspect executions, and query connectors, secrets, environments, and services.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_pipelines',
        description: 'List CI/CD pipelines in a project with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization identifier (slug) where the project lives',
            },
            project: {
              type: 'string',
              description: 'Project identifier (slug) to list pipelines for',
            },
            search_term: {
              type: 'string',
              description: 'Filter pipelines by name (partial match)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Number of pipelines per page (default: 25, max: 100)',
            },
          },
          required: ['org', 'project'],
        },
      },
      {
        name: 'get_pipeline',
        description: 'Retrieve a single pipeline by identifier including YAML definition and stage configuration',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization identifier',
            },
            project: {
              type: 'string',
              description: 'Project identifier',
            },
            pipeline: {
              type: 'string',
              description: 'Pipeline identifier (slug)',
            },
          },
          required: ['org', 'project', 'pipeline'],
        },
      },
      {
        name: 'execute_pipeline',
        description: 'Trigger a pipeline execution with optional runtime input variables and branch override',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization identifier',
            },
            project: {
              type: 'string',
              description: 'Project identifier',
            },
            pipeline: {
              type: 'string',
              description: 'Pipeline identifier to execute',
            },
            branch_name: {
              type: 'string',
              description: 'Git branch name for the pipeline source (overrides default)',
            },
            module: {
              type: 'string',
              description: 'Harness module context: cd, ci, sto, etc.',
            },
            notes: {
              type: 'string',
              description: 'Optional execution notes visible in the run history',
            },
            input_set_refs: {
              type: 'string',
              description: 'Comma-separated input set identifiers to use as runtime inputs',
            },
          },
          required: ['org', 'project', 'pipeline'],
        },
      },
      {
        name: 'list_executions',
        description: 'List pipeline execution history with optional filters for status, branch, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization identifier',
            },
            project: {
              type: 'string',
              description: 'Project identifier',
            },
            pipeline: {
              type: 'string',
              description: 'Filter executions for a specific pipeline identifier',
            },
            status: {
              type: 'string',
              description: 'Filter by status: Running, Success, Failed, Aborted, Expired, Queued',
            },
            branch_name: {
              type: 'string',
              description: 'Filter executions triggered from a specific branch',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Number of executions per page (default: 25, max: 100)',
            },
          },
          required: ['org', 'project'],
        },
      },
      {
        name: 'get_execution',
        description: 'Retrieve details of a single pipeline execution by plan execution ID including stage statuses and logs URL',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization identifier',
            },
            project: {
              type: 'string',
              description: 'Project identifier',
            },
            execution_id: {
              type: 'string',
              description: 'Plan execution ID (returned by execute_pipeline or list_executions)',
            },
          },
          required: ['org', 'project', 'execution_id'],
        },
      },
      {
        name: 'retry_execution',
        description: 'Retry a failed pipeline execution from a specific failed stage or from the beginning',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization identifier',
            },
            project: {
              type: 'string',
              description: 'Project identifier',
            },
            pipeline: {
              type: 'string',
              description: 'Pipeline identifier',
            },
            execution_id: {
              type: 'string',
              description: 'Plan execution ID of the failed execution to retry',
            },
            retry_stages: {
              type: 'string',
              description: 'Comma-separated stage identifiers to retry from (empty = retry from beginning)',
            },
            run_all_stages: {
              type: 'boolean',
              description: 'If true, run all stages; if false, run only failed and subsequent stages (default: false)',
            },
          },
          required: ['org', 'project', 'pipeline', 'execution_id'],
        },
      },
      {
        name: 'abort_execution',
        description: 'Abort a running or queued pipeline execution by plan execution ID',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization identifier',
            },
            project: {
              type: 'string',
              description: 'Project identifier',
            },
            pipeline: {
              type: 'string',
              description: 'Pipeline identifier',
            },
            execution_id: {
              type: 'string',
              description: 'Plan execution ID of the running execution to abort',
            },
          },
          required: ['org', 'project', 'pipeline', 'execution_id'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all projects in an organization with optional search filter',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization identifier to list projects for',
            },
            search_term: {
              type: 'string',
              description: 'Filter projects by name (partial match)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Number of projects per page (default: 25, max: 100)',
            },
          },
          required: ['org'],
        },
      },
      {
        name: 'get_project',
        description: 'Retrieve details for a single project by identifier including modules and description',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization identifier',
            },
            project: {
              type: 'string',
              description: 'Project identifier',
            },
          },
          required: ['org', 'project'],
        },
      },
      {
        name: 'list_connectors',
        description: 'List project-scoped connectors with optional type and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization identifier',
            },
            project: {
              type: 'string',
              description: 'Project identifier',
            },
            type: {
              type: 'string',
              description: 'Filter by connector type (e.g. K8sCluster, Github, DockerRegistry, Artifactory)',
            },
            search_term: {
              type: 'string',
              description: 'Filter connectors by name',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Number of connectors per page (default: 25, max: 100)',
            },
          },
          required: ['org', 'project'],
        },
      },
      {
        name: 'get_connector',
        description: 'Retrieve details for a specific connector by identifier including type and connection status',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization identifier',
            },
            project: {
              type: 'string',
              description: 'Project identifier',
            },
            connector: {
              type: 'string',
              description: 'Connector identifier',
            },
          },
          required: ['org', 'project', 'connector'],
        },
      },
      {
        name: 'list_secrets',
        description: 'List project-scoped secrets with optional type filter — returns metadata only, not secret values',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization identifier',
            },
            project: {
              type: 'string',
              description: 'Project identifier',
            },
            type: {
              type: 'string',
              description: 'Filter by secret type: SecretText, SecretFile, SSHKey, WinRmCredentials',
            },
            search_term: {
              type: 'string',
              description: 'Filter secrets by name',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Number of secrets per page (default: 25, max: 100)',
            },
          },
          required: ['org', 'project'],
        },
      },
      {
        name: 'get_secret',
        description: 'Retrieve metadata for a specific secret by identifier — returns type and reference info only, never the secret value',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization identifier',
            },
            project: {
              type: 'string',
              description: 'Project identifier',
            },
            secret: {
              type: 'string',
              description: 'Secret identifier',
            },
          },
          required: ['org', 'project', 'secret'],
        },
      },
      {
        name: 'list_environments',
        description: 'List deployment environments in a project with optional type filter (Production, PreProduction)',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization identifier',
            },
            project: {
              type: 'string',
              description: 'Project identifier',
            },
            type: {
              type: 'string',
              description: 'Filter by environment type: Production or PreProduction',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Number of environments per page (default: 25, max: 100)',
            },
          },
          required: ['org', 'project'],
        },
      },
      {
        name: 'get_environment',
        description: 'Retrieve details for a specific deployment environment by identifier',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization identifier',
            },
            project: {
              type: 'string',
              description: 'Project identifier',
            },
            environment: {
              type: 'string',
              description: 'Environment identifier',
            },
          },
          required: ['org', 'project', 'environment'],
        },
      },
      {
        name: 'list_services',
        description: 'List deployable services in a project — services represent the applications being deployed',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization identifier',
            },
            project: {
              type: 'string',
              description: 'Project identifier',
            },
            search_term: {
              type: 'string',
              description: 'Filter services by name',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Number of services per page (default: 25, max: 100)',
            },
          },
          required: ['org', 'project'],
        },
      },
      {
        name: 'get_service',
        description: 'Retrieve details for a specific deployable service by identifier including manifest and artifact sources',
        inputSchema: {
          type: 'object',
          properties: {
            org: {
              type: 'string',
              description: 'Organization identifier',
            },
            project: {
              type: 'string',
              description: 'Project identifier',
            },
            service: {
              type: 'string',
              description: 'Service identifier',
            },
          },
          required: ['org', 'project', 'service'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_pipelines':
          return this.listPipelines(args);
        case 'get_pipeline':
          return this.getPipeline(args);
        case 'execute_pipeline':
          return this.executePipeline(args);
        case 'list_executions':
          return this.listExecutions(args);
        case 'get_execution':
          return this.getExecution(args);
        case 'retry_execution':
          return this.retryExecution(args);
        case 'abort_execution':
          return this.abortExecution(args);
        case 'list_projects':
          return this.listProjects(args);
        case 'get_project':
          return this.getProject(args);
        case 'list_connectors':
          return this.listConnectors(args);
        case 'get_connector':
          return this.getConnector(args);
        case 'list_secrets':
          return this.listSecrets(args);
        case 'get_secret':
          return this.getSecret(args);
        case 'list_environments':
          return this.listEnvironments(args);
        case 'get_environment':
          return this.getEnvironment(args);
        case 'list_services':
          return this.listServices(args);
        case 'get_service':
          return this.getService(args);
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
      'x-api-key': this.apiKey,
      'Harness-Account': this.accountId,
      'Content-Type': 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async harnessGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await fetch(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async harnessPost(path: string, body: Record<string, unknown> = {}, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildPageParams(args: Record<string, unknown>): Record<string, string> {
    return {
      page: String((args.page as number) ?? 0),
      limit: String((args.limit as number) || 25),
    };
  }

  private async listPipelines(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org || !args.project) return { content: [{ type: 'text', text: 'org and project are required' }], isError: true };
    const params = this.buildPageParams(args);
    if (args.search_term) params['searchTerm'] = args.search_term as string;
    return this.harnessGet(`/orgs/${args.org}/projects/${args.project}/pipelines`, params);
  }

  private async getPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org || !args.project || !args.pipeline) {
      return { content: [{ type: 'text', text: 'org, project, and pipeline are required' }], isError: true };
    }
    return this.harnessGet(`/orgs/${args.org}/projects/${args.project}/pipelines/${args.pipeline}`);
  }

  private async executePipeline(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org || !args.project || !args.pipeline) {
      return { content: [{ type: 'text', text: 'org, project, and pipeline are required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.module) params['module'] = args.module as string;
    if (args.branch_name) params['branch_name'] = args.branch_name as string;
    if (args.notes) params['notes'] = args.notes as string;

    const body: Record<string, unknown> = {};
    if (args.input_set_refs) {
      body.inputSetRefs = (args.input_set_refs as string).split(',').map(s => s.trim());
    }

    return this.harnessPost(
      `/orgs/${args.org}/projects/${args.project}/pipelines/${args.pipeline}/execute`,
      body,
      params,
    );
  }

  private async listExecutions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org || !args.project) return { content: [{ type: 'text', text: 'org and project are required' }], isError: true };
    const params = this.buildPageParams(args);
    if (args.pipeline) params['pipelineIdentifier'] = args.pipeline as string;
    if (args.status) params['status'] = args.status as string;
    if (args.branch_name) params['branch'] = args.branch_name as string;
    return this.harnessGet(`/orgs/${args.org}/projects/${args.project}/pipeline-executions`, params);
  }

  private async getExecution(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org || !args.project || !args.execution_id) {
      return { content: [{ type: 'text', text: 'org, project, and execution_id are required' }], isError: true };
    }
    return this.harnessGet(`/orgs/${args.org}/projects/${args.project}/pipeline-executions/${args.execution_id}`);
  }

  private async retryExecution(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org || !args.project || !args.pipeline || !args.execution_id) {
      return { content: [{ type: 'text', text: 'org, project, pipeline, and execution_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      runAllStages: (args.run_all_stages as boolean) ?? false,
    };
    if (args.retry_stages) {
      body.retryStages = (args.retry_stages as string).split(',').map(s => s.trim());
    }
    return this.harnessPost(
      `/orgs/${args.org}/projects/${args.project}/pipelines/${args.pipeline}/execute/retry/${args.execution_id}`,
      body,
    );
  }

  private async abortExecution(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org || !args.project || !args.pipeline || !args.execution_id) {
      return { content: [{ type: 'text', text: 'org, project, pipeline, and execution_id are required' }], isError: true };
    }
    return this.harnessPost(
      `/orgs/${args.org}/projects/${args.project}/pipelines/${args.pipeline}/execute/interrupt/${args.execution_id}`,
      { interruptType: 'AbortAll' },
    );
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org) return { content: [{ type: 'text', text: 'org is required' }], isError: true };
    const params = this.buildPageParams(args);
    if (args.search_term) params['searchTerm'] = args.search_term as string;
    return this.harnessGet(`/orgs/${args.org}/projects`, params);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org || !args.project) return { content: [{ type: 'text', text: 'org and project are required' }], isError: true };
    return this.harnessGet(`/orgs/${args.org}/projects/${args.project}`);
  }

  private async listConnectors(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org || !args.project) return { content: [{ type: 'text', text: 'org and project are required' }], isError: true };
    const params = this.buildPageParams(args);
    if (args.type) params['type'] = args.type as string;
    if (args.search_term) params['searchTerm'] = args.search_term as string;
    return this.harnessGet(`/orgs/${args.org}/projects/${args.project}/connectors`, params);
  }

  private async getConnector(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org || !args.project || !args.connector) {
      return { content: [{ type: 'text', text: 'org, project, and connector are required' }], isError: true };
    }
    return this.harnessGet(`/orgs/${args.org}/projects/${args.project}/connectors/${args.connector}`);
  }

  private async listSecrets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org || !args.project) return { content: [{ type: 'text', text: 'org and project are required' }], isError: true };
    const params = this.buildPageParams(args);
    if (args.type) params['type'] = args.type as string;
    if (args.search_term) params['searchTerm'] = args.search_term as string;
    return this.harnessGet(`/orgs/${args.org}/projects/${args.project}/secrets`, params);
  }

  private async getSecret(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org || !args.project || !args.secret) {
      return { content: [{ type: 'text', text: 'org, project, and secret are required' }], isError: true };
    }
    return this.harnessGet(`/orgs/${args.org}/projects/${args.project}/secrets/${args.secret}`);
  }

  private async listEnvironments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org || !args.project) return { content: [{ type: 'text', text: 'org and project are required' }], isError: true };
    const params = this.buildPageParams(args);
    if (args.type) params['type'] = args.type as string;
    return this.harnessGet(`/orgs/${args.org}/projects/${args.project}/environments`, params);
  }

  private async getEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org || !args.project || !args.environment) {
      return { content: [{ type: 'text', text: 'org, project, and environment are required' }], isError: true };
    }
    return this.harnessGet(`/orgs/${args.org}/projects/${args.project}/environments/${args.environment}`);
  }

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org || !args.project) return { content: [{ type: 'text', text: 'org and project are required' }], isError: true };
    const params = this.buildPageParams(args);
    if (args.search_term) params['searchTerm'] = args.search_term as string;
    return this.harnessGet(`/orgs/${args.org}/projects/${args.project}/services`, params);
  }

  private async getService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org || !args.project || !args.service) {
      return { content: [{ type: 'text', text: 'org, project, and service are required' }], isError: true };
    }
    return this.harnessGet(`/orgs/${args.org}/projects/${args.project}/services/${args.service}`);
  }
}
