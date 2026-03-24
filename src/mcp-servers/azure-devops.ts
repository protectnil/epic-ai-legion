/**
 * Azure DevOps MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/microsoft/azure-devops-mcp — actively maintained, Remote MCP in public preview.
// This adapter is a lightweight self-hosted fallback for air-gapped / PAT-auth deployments.

import { ToolDefinition, ToolResult } from './types.js';

interface AzureDevOpsConfig {
  organization: string;
  personalAccessToken: string;
  baseUrl?: string;
}

export class AzureDevOpsMCPServer {
  private readonly organization: string;
  private readonly pat: string;
  private readonly baseUrl: string;

  constructor(config: AzureDevOpsConfig) {
    this.organization = config.organization;
    this.pat = config.personalAccessToken;
    this.baseUrl = config.baseUrl || 'https://dev.azure.com';
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`:${this.pat}`).toString('base64')}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all team projects in the Azure DevOps organization',
        inputSchema: {
          type: 'object',
          properties: {
            stateFilter: {
              type: 'string',
              description: 'Filter by project state: wellFormed, createPending, deleting, new, unchanged, all (default: wellFormed)',
            },
            top: {
              type: 'number',
              description: 'Maximum number of projects to return',
            },
            skip: {
              type: 'number',
              description: 'Number of projects to skip for pagination',
            },
          },
        },
      },
      {
        name: 'list_repositories',
        description: 'List all Git repositories in an Azure DevOps project',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Team project name or ID',
            },
          },
          required: ['project'],
        },
      },
      {
        name: 'get_work_item',
        description: 'Get a specific work item by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Work item ID',
            },
            project: {
              type: 'string',
              description: 'Team project name (optional, narrows scope)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'query_work_items',
        description: 'Execute a WIQL (Work Item Query Language) query to find work items',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Team project name or ID',
            },
            wiql: {
              type: 'string',
              description: 'WIQL query string, e.g. "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.State] = \'Active\'"',
            },
          },
          required: ['project', 'wiql'],
        },
      },
      {
        name: 'create_work_item',
        description: 'Create a new work item (Task, Bug, User Story, etc.) in a project',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Team project name or ID',
            },
            type: {
              type: 'string',
              description: 'Work item type, e.g. Task, Bug, User Story, Epic',
            },
            title: {
              type: 'string',
              description: 'Title of the work item',
            },
            description: {
              type: 'string',
              description: 'Description / details of the work item (HTML or plain text)',
            },
            assignedTo: {
              type: 'string',
              description: 'Display name or email of the person to assign the work item to',
            },
            priority: {
              type: 'number',
              description: 'Priority value (1=Critical, 2=High, 3=Medium, 4=Low)',
            },
          },
          required: ['project', 'type', 'title'],
        },
      },
      {
        name: 'list_builds',
        description: 'List build runs (pipeline executions) for a project',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Team project name or ID',
            },
            definitionId: {
              type: 'number',
              description: 'Filter by pipeline definition ID',
            },
            statusFilter: {
              type: 'string',
              description: 'Filter by build status: inProgress, completed, cancelling, postponed, notStarted, all',
            },
            top: {
              type: 'number',
              description: 'Maximum number of builds to return (default: 10)',
            },
          },
          required: ['project'],
        },
      },
      {
        name: 'queue_build',
        description: 'Queue (trigger) a new build for a pipeline definition',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Team project name or ID',
            },
            definitionId: {
              type: 'number',
              description: 'Pipeline definition ID to queue a build for',
            },
            sourceBranch: {
              type: 'string',
              description: 'Source branch to build, e.g. refs/heads/main',
            },
          },
          required: ['project', 'definitionId'],
        },
      },
      {
        name: 'list_pipeline_definitions',
        description: 'List all pipeline (build) definitions in a project',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Team project name or ID',
            },
            name: {
              type: 'string',
              description: 'Filter by pipeline name (supports wildcards)',
            },
          },
          required: ['project'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_projects': {
          let url = `${this.baseUrl}/${this.organization}/_apis/projects?api-version=7.1`;
          if (args.stateFilter) url += `&stateFilter=${encodeURIComponent(args.stateFilter as string)}`;
          if (args.top) url += `&$top=${args.top as number}`;
          if (args.skip) url += `&$skip=${args.skip as number}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list projects: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Azure DevOps returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_repositories': {
          const project = args.project as string;
          if (!project) {
            return { content: [{ type: 'text', text: 'project is required' }], isError: true };
          }

          const url = `${this.baseUrl}/${this.organization}/${encodeURIComponent(project)}/_apis/git/repositories?api-version=7.1`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list repositories: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Azure DevOps returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_work_item': {
          const id = args.id as number;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }

          const base = args.project
            ? `${this.baseUrl}/${this.organization}/${encodeURIComponent(args.project as string)}`
            : `${this.baseUrl}/${this.organization}`;
          const url = `${base}/_apis/wit/workitems/${id}?api-version=7.1`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get work item: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Azure DevOps returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'query_work_items': {
          const project = args.project as string;
          const wiql = args.wiql as string;
          if (!project || !wiql) {
            return { content: [{ type: 'text', text: 'project and wiql are required' }], isError: true };
          }

          const url = `${this.baseUrl}/${this.organization}/${encodeURIComponent(project)}/_apis/wit/wiql?api-version=7.1`;
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: wiql }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to query work items: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Azure DevOps returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_work_item': {
          const project = args.project as string;
          const type = args.type as string;
          const title = args.title as string;
          if (!project || !type || !title) {
            return { content: [{ type: 'text', text: 'project, type, and title are required' }], isError: true };
          }

          const patchDoc: Array<{ op: string; path: string; value: unknown }> = [
            { op: 'add', path: '/fields/System.Title', value: title },
          ];
          if (args.description) patchDoc.push({ op: 'add', path: '/fields/System.Description', value: args.description });
          if (args.assignedTo) patchDoc.push({ op: 'add', path: '/fields/System.AssignedTo', value: args.assignedTo });
          if (args.priority) patchDoc.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: args.priority });

          const url = `${this.baseUrl}/${this.organization}/${encodeURIComponent(project)}/_apis/wit/workitems/$${encodeURIComponent(type)}?api-version=7.1`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json-patch+json' },
            body: JSON.stringify(patchDoc),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create work item: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Azure DevOps returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_builds': {
          const project = args.project as string;
          if (!project) {
            return { content: [{ type: 'text', text: 'project is required' }], isError: true };
          }

          const top = (args.top as number) || 10;
          let url = `${this.baseUrl}/${this.organization}/${encodeURIComponent(project)}/_apis/build/builds?api-version=7.1&$top=${top}`;
          if (args.definitionId) url += `&definitions=${args.definitionId as number}`;
          if (args.statusFilter) url += `&statusFilter=${encodeURIComponent(args.statusFilter as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list builds: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Azure DevOps returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'queue_build': {
          const project = args.project as string;
          const definitionId = args.definitionId as number;
          if (!project || !definitionId) {
            return { content: [{ type: 'text', text: 'project and definitionId are required' }], isError: true };
          }

          const body: Record<string, unknown> = { definition: { id: definitionId } };
          if (args.sourceBranch) body.sourceBranch = args.sourceBranch;

          const url = `${this.baseUrl}/${this.organization}/${encodeURIComponent(project)}/_apis/build/builds?api-version=7.1`;
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to queue build: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Azure DevOps returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_pipeline_definitions': {
          const project = args.project as string;
          if (!project) {
            return { content: [{ type: 'text', text: 'project is required' }], isError: true };
          }

          let url = `${this.baseUrl}/${this.organization}/${encodeURIComponent(project)}/_apis/build/definitions?api-version=7.1`;
          if (args.name) url += `&name=${encodeURIComponent(args.name as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list pipeline definitions: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Azure DevOps returned non-JSON response (HTTP ${response.status})`); }
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
