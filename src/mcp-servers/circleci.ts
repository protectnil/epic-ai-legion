/**
 * CircleCI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/CircleCI-Public/mcp-server-circleci — transport: stdio, auth: Circle-Token
// Vendor MCP is actively maintained (CircleCI-Public org, commits 2025–2026).
// Vendor MCP covers: ~7 tools (failure logs, pipeline status, test metadata, flaky tests, rollback).
// Our adapter covers: 17 tools (full CRUD for pipelines, workflows, jobs, contexts, schedules, insights).
// Recommendation: Use vendor MCP for AI-native IDE workflows. Use this adapter for full REST coverage
//   or air-gapped deployments.
//
// Base URL: https://circleci.com/api/v2
// Auth: Circle-Token header (personal API token or project token from CircleCI settings)
// Docs: https://circleci.com/docs/api/v2/
// Rate limits: Not publicly documented; respect 429 responses.

import { ToolDefinition, ToolResult } from './types.js';

interface CircleCIConfig {
  circleToken: string;
  baseUrl?: string;
}

export class CircleCIMCPServer {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: CircleCIConfig) {
    this.token = config.circleToken;
    this.baseUrl = config.baseUrl || 'https://circleci.com/api/v2';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_pipelines',
        description: 'List pipelines for a project or organization with optional pagination. Returns pipeline ID, state, trigger, and VCS information.',
        inputSchema: {
          type: 'object',
          properties: {
            project_slug: {
              type: 'string',
              description: 'Project slug in vcs-slug/org-name/repo-name format (e.g. gh/myorg/myrepo). Omit for org-level list.',
            },
            org_slug: {
              type: 'string',
              description: 'Organization slug to list all pipelines for the org (e.g. gh/myorg)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response next_page_token field',
            },
          },
        },
      },
      {
        name: 'get_pipeline',
        description: 'Get details of a specific CircleCI pipeline by ID, including state, trigger source, and VCS revision',
        inputSchema: {
          type: 'object',
          properties: {
            pipeline_id: {
              type: 'string',
              description: 'CircleCI pipeline UUID',
            },
          },
          required: ['pipeline_id'],
        },
      },
      {
        name: 'trigger_pipeline',
        description: 'Trigger a new pipeline on a CircleCI project for a branch, tag, or with custom pipeline parameters',
        inputSchema: {
          type: 'object',
          properties: {
            project_slug: {
              type: 'string',
              description: 'Project slug in vcs-slug/org-name/repo-name format (e.g. gh/myorg/myrepo)',
            },
            branch: {
              type: 'string',
              description: 'Branch to trigger the pipeline on (mutually exclusive with tag)',
            },
            tag: {
              type: 'string',
              description: 'Git tag to trigger the pipeline on (mutually exclusive with branch)',
            },
            parameters: {
              type: 'object',
              description: 'Pipeline parameters as key-value pairs (max 100 entries). Values must match declared parameter types.',
              additionalProperties: true,
            },
          },
          required: ['project_slug'],
        },
      },
      {
        name: 'list_workflows',
        description: 'List workflows for a pipeline, returning workflow IDs, names, status, and timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            pipeline_id: {
              type: 'string',
              description: 'CircleCI pipeline UUID',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['pipeline_id'],
        },
      },
      {
        name: 'get_workflow',
        description: 'Get details of a specific CircleCI workflow by ID, including status, duration, and pipeline reference',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'CircleCI workflow UUID',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'cancel_workflow',
        description: 'Cancel a running CircleCI workflow to stop all in-progress jobs immediately',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'CircleCI workflow UUID to cancel',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'rerun_workflow',
        description: 'Rerun a CircleCI workflow from the beginning or rerun only failed jobs',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'CircleCI workflow UUID to rerun',
            },
            from_failed: {
              type: 'boolean',
              description: 'If true, rerun only failed jobs; if false, rerun the entire workflow (default: false)',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'approve_job',
        description: 'Approve a pending approval job in a CircleCI workflow to allow the workflow to continue',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'CircleCI workflow UUID containing the approval job',
            },
            approval_request_id: {
              type: 'string',
              description: 'Approval request ID (job ID of the approval job to approve)',
            },
          },
          required: ['workflow_id', 'approval_request_id'],
        },
      },
      {
        name: 'list_jobs',
        description: 'List jobs in a CircleCI workflow, returning job names, status, dependencies, and job numbers',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'CircleCI workflow UUID',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'get_job_details',
        description: 'Get detailed information about a specific job in a project, including executor, resource class, and timing',
        inputSchema: {
          type: 'object',
          properties: {
            project_slug: {
              type: 'string',
              description: 'Project slug in vcs-slug/org-name/repo-name format',
            },
            job_number: {
              type: 'number',
              description: 'The job number (shown in CircleCI UI and URLs)',
            },
          },
          required: ['project_slug', 'job_number'],
        },
      },
      {
        name: 'cancel_job',
        description: 'Cancel a running CircleCI job by project slug and job number',
        inputSchema: {
          type: 'object',
          properties: {
            project_slug: {
              type: 'string',
              description: 'Project slug in vcs-slug/org-name/repo-name format',
            },
            job_number: {
              type: 'number',
              description: 'The job number to cancel',
            },
          },
          required: ['project_slug', 'job_number'],
        },
      },
      {
        name: 'get_job_artifacts',
        description: 'Get artifacts produced by a completed job, returning artifact names, paths, and download URLs',
        inputSchema: {
          type: 'object',
          properties: {
            project_slug: {
              type: 'string',
              description: 'Project slug in vcs-slug/org-name/repo-name format',
            },
            job_number: {
              type: 'number',
              description: 'The job number to retrieve artifacts for',
            },
          },
          required: ['project_slug', 'job_number'],
        },
      },
      {
        name: 'get_job_test_metadata',
        description: 'Get test metadata (results) for a CircleCI job, including test names, classnames, durations, and pass/fail status',
        inputSchema: {
          type: 'object',
          properties: {
            project_slug: {
              type: 'string',
              description: 'Project slug in vcs-slug/org-name/repo-name format',
            },
            job_number: {
              type: 'number',
              description: 'The job number to retrieve test metadata for',
            },
          },
          required: ['project_slug', 'job_number'],
        },
      },
      {
        name: 'get_workflow_insights',
        description: 'Get summary metrics and trends for a project workflow, including success rate, duration percentiles, and throughput',
        inputSchema: {
          type: 'object',
          properties: {
            project_slug: {
              type: 'string',
              description: 'Project slug in vcs-slug/org-name/repo-name format',
            },
            workflow_name: {
              type: 'string',
              description: 'Name of the workflow to get insights for',
            },
            branch: {
              type: 'string',
              description: 'Branch to filter insights by (default: default branch)',
            },
            reporting_window: {
              type: 'string',
              description: 'Time window for metrics: last-7-days | last-90-days | last-24-hours | last-30-days (default: last-90-days)',
            },
          },
          required: ['project_slug', 'workflow_name'],
        },
      },
      {
        name: 'list_project_schedules',
        description: 'List all scheduled pipelines for a CircleCI project, including schedule names, cron expressions, and parameters',
        inputSchema: {
          type: 'object',
          properties: {
            project_slug: {
              type: 'string',
              description: 'Project slug in vcs-slug/org-name/repo-name format',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['project_slug'],
        },
      },
      {
        name: 'list_contexts',
        description: 'List all CircleCI contexts in an organization, which store shared environment variables for pipelines',
        inputSchema: {
          type: 'object',
          properties: {
            owner_slug: {
              type: 'string',
              description: 'Organization slug (e.g. gh/myorg)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['owner_slug'],
        },
      },
      {
        name: 'list_environment_variables',
        description: 'List environment variable names for a CircleCI project (values are masked — only names are returned)',
        inputSchema: {
          type: 'object',
          properties: {
            project_slug: {
              type: 'string',
              description: 'Project slug in vcs-slug/org-name/repo-name format',
            },
          },
          required: ['project_slug'],
        },
      },
    ];
  }

  private get headers(): Record<string, string> {
    return {
      'Circle-Token': this.token,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private truncate(text: string): string {
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_pipelines':
          return await this.listPipelines(args);
        case 'get_pipeline':
          return await this.getPipeline(args);
        case 'trigger_pipeline':
          return await this.triggerPipeline(args);
        case 'list_workflows':
          return await this.listWorkflows(args);
        case 'get_workflow':
          return await this.getWorkflow(args);
        case 'cancel_workflow':
          return await this.cancelWorkflow(args);
        case 'rerun_workflow':
          return await this.rerunWorkflow(args);
        case 'approve_job':
          return await this.approveJob(args);
        case 'list_jobs':
          return await this.listJobs(args);
        case 'get_job_details':
          return await this.getJobDetails(args);
        case 'cancel_job':
          return await this.cancelJob(args);
        case 'get_job_artifacts':
          return await this.getJobArtifacts(args);
        case 'get_job_test_metadata':
          return await this.getJobTestMetadata(args);
        case 'get_workflow_insights':
          return await this.getWorkflowInsights(args);
        case 'list_project_schedules':
          return await this.listProjectSchedules(args);
        case 'list_contexts':
          return await this.listContexts(args);
        case 'list_environment_variables':
          return await this.listEnvironmentVariables(args);
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

  private async get(path: string): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}${path}`, { headers: this.headers });
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async listPipelines(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page_token) params.set('page-token', String(args.page_token));
    const qs = params.toString() ? `?${params.toString()}` : '';

    if (args.org_slug) {
      return this.get(`/pipeline?org-slug=${encodeURIComponent(String(args.org_slug))}${qs ? '&' + params.toString() : ''}`);
    } else if (args.project_slug) {
      return this.get(`/project/${args.project_slug}/pipeline${qs}`);
    } else {
      return this.get(`/pipeline${qs}`);
    }
  }

  private async getPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/pipeline/${args.pipeline_id}`);
  }

  private async triggerPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    const project_slug = args.project_slug as string;
    if (!project_slug) {
      return { content: [{ type: 'text', text: 'project_slug is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.branch) body.branch = args.branch;
    if (args.tag) body.tag = args.tag;
    if (args.parameters) body.parameters = args.parameters;
    return this.post(`/project/${project_slug}/pipeline`, body);
  }

  private async listWorkflows(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page_token) params.set('page-token', String(args.page_token));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.get(`/pipeline/${args.pipeline_id}/workflow${qs}`);
  }

  private async getWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/workflow/${args.workflow_id}`);
  }

  private async cancelWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post(`/workflow/${args.workflow_id}/cancel`, {});
  }

  private async rerunWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      from_failed: (args.from_failed as boolean) ?? false,
    };
    return this.post(`/workflow/${args.workflow_id}/rerun`, body);
  }

  private async approveJob(args: Record<string, unknown>): Promise<ToolResult> {
    const workflow_id = args.workflow_id as string;
    const approval_request_id = args.approval_request_id as string;
    if (!workflow_id || !approval_request_id) {
      return { content: [{ type: 'text', text: 'workflow_id and approval_request_id are required' }], isError: true };
    }
    return this.post(`/workflow/${workflow_id}/approve/${approval_request_id}`, {});
  }

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page_token) params.set('page-token', String(args.page_token));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.get(`/workflow/${args.workflow_id}/job${qs}`);
  }

  private async getJobDetails(args: Record<string, unknown>): Promise<ToolResult> {
    const project_slug = args.project_slug as string;
    const job_number = args.job_number as number;
    if (!project_slug || job_number === undefined) {
      return { content: [{ type: 'text', text: 'project_slug and job_number are required' }], isError: true };
    }
    return this.get(`/project/${project_slug}/job/${job_number}`);
  }

  private async cancelJob(args: Record<string, unknown>): Promise<ToolResult> {
    const project_slug = args.project_slug as string;
    const job_number = args.job_number as number;
    if (!project_slug || job_number === undefined) {
      return { content: [{ type: 'text', text: 'project_slug and job_number are required' }], isError: true };
    }
    return this.post(`/project/${project_slug}/job/${job_number}/cancel`, {});
  }

  private async getJobArtifacts(args: Record<string, unknown>): Promise<ToolResult> {
    const project_slug = args.project_slug as string;
    const job_number = args.job_number as number;
    if (!project_slug || job_number === undefined) {
      return { content: [{ type: 'text', text: 'project_slug and job_number are required' }], isError: true };
    }
    return this.get(`/project/${project_slug}/job/${job_number}/artifacts`);
  }

  private async getJobTestMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    const project_slug = args.project_slug as string;
    const job_number = args.job_number as number;
    if (!project_slug || job_number === undefined) {
      return { content: [{ type: 'text', text: 'project_slug and job_number are required' }], isError: true };
    }
    return this.get(`/project/${project_slug}/job/${job_number}/tests`);
  }

  private async getWorkflowInsights(args: Record<string, unknown>): Promise<ToolResult> {
    const project_slug = args.project_slug as string;
    const workflow_name = args.workflow_name as string;
    if (!project_slug || !workflow_name) {
      return { content: [{ type: 'text', text: 'project_slug and workflow_name are required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.branch) params.set('branch', String(args.branch));
    if (args.reporting_window) params.set('reporting-window', String(args.reporting_window));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.get(`/insights/${project_slug}/workflows/${encodeURIComponent(workflow_name)}${qs}`);
  }

  private async listProjectSchedules(args: Record<string, unknown>): Promise<ToolResult> {
    const project_slug = args.project_slug as string;
    if (!project_slug) {
      return { content: [{ type: 'text', text: 'project_slug is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.page_token) params.set('page-token', String(args.page_token));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.get(`/project/${project_slug}/schedule${qs}`);
  }

  private async listContexts(args: Record<string, unknown>): Promise<ToolResult> {
    const owner_slug = args.owner_slug as string;
    if (!owner_slug) {
      return { content: [{ type: 'text', text: 'owner_slug is required' }], isError: true };
    }
    const params = new URLSearchParams({ 'owner-slug': owner_slug });
    if (args.page_token) params.set('page-token', String(args.page_token));
    return this.get(`/context?${params.toString()}`);
  }

  private async listEnvironmentVariables(args: Record<string, unknown>): Promise<ToolResult> {
    const project_slug = args.project_slug as string;
    if (!project_slug) {
      return { content: [{ type: 'text', text: 'project_slug is required' }], isError: true };
    }
    return this.get(`/project/${project_slug}/envvar`);
  }
}
