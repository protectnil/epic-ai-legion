/** GitLab MCP Adapter / Built on the Epic AI® Intelligence Platform / Copyright 2026 protectNIL Inc. Apache-2.0 */

import { ToolDefinition, ToolResult } from './types.js';

interface GitLabConfig {
  privateToken: string;
  baseUrl?: string;
}

export class GitLabMCPServer {
  private readonly privateToken: string;
  private readonly baseUrl: string;

  constructor(config: GitLabConfig) {
    this.privateToken = config.privateToken;
    this.baseUrl = config.baseUrl || 'https://gitlab.com/api/v4';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List GitLab projects accessible to the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Filter projects by name or path',
            },
            owned: {
              type: 'boolean',
              description: 'Limit results to projects owned by the current user',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 100, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get details of a specific GitLab project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/project path',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_merge_requests',
        description: 'List merge requests for a project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/project path',
            },
            state: {
              type: 'string',
              description: 'Merge request state: opened, closed, locked, merged, all (default: opened)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 100, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_issue',
        description: 'Create a new issue in a GitLab project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/project path',
            },
            title: {
              type: 'string',
              description: 'Issue title',
            },
            description: {
              type: 'string',
              description: 'Issue description (Markdown supported)',
            },
            labels: {
              type: 'string',
              description: 'Comma-separated list of label names',
            },
            assignee_ids: {
              type: 'array',
              description: 'Array of user IDs to assign',
            },
          },
          required: ['project_id', 'title'],
        },
      },
      {
        name: 'list_pipelines',
        description: 'List CI/CD pipelines for a project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/project path',
            },
            status: {
              type: 'string',
              description: 'Pipeline status: created, waiting_for_resource, preparing, pending, running, success, failed, canceled, skipped, manual, scheduled',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 100, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_issues',
        description: 'List issues for a GitLab project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/project path',
            },
            state: {
              type: 'string',
              description: 'Issue state: opened, closed, all (default: opened)',
            },
            labels: {
              type: 'string',
              description: 'Comma-separated list of label names to filter by',
            },
            assignee_id: {
              type: 'number',
              description: 'Filter by assignee user ID',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 100, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_merge_request',
        description: 'Get details of a specific merge request',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/project path',
            },
            merge_request_iid: {
              type: 'number',
              description: 'The internal ID of the merge request within the project',
            },
          },
          required: ['project_id', 'merge_request_iid'],
        },
      },
      {
        name: 'get_file',
        description: 'Get the contents of a file from a GitLab repository. Content is returned Base64-encoded.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/project path',
            },
            file_path: {
              type: 'string',
              description: 'URL-encoded full path of the file (e.g., "src%2Findex.ts")',
            },
            ref: {
              type: 'string',
              description: 'Branch name, tag, or commit SHA (default: HEAD)',
            },
          },
          required: ['project_id', 'file_path', 'ref'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        'PRIVATE-TOKEN': this.privateToken,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_projects': {
          const perPage = (args.per_page as number) || 20;
          const page = (args.page as number) || 1;

          let url = `${this.baseUrl}/projects?per_page=${perPage}&page=${page}`;
          if (args.search) url += `&search=${encodeURIComponent(args.search as string)}`;
          if (args.owned) url += `&owned=true`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list projects: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`GitLab returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_project': {
          const projectId = args.project_id as string;

          if (!projectId) {
            return {
              content: [{ type: 'text', text: 'project_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/projects/${encodeURIComponent(projectId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get project: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`GitLab returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_merge_requests': {
          const projectId = args.project_id as string;

          if (!projectId) {
            return {
              content: [{ type: 'text', text: 'project_id is required' }],
              isError: true,
            };
          }

          const state = (args.state as string) || 'opened';
          const perPage = (args.per_page as number) || 20;
          const page = (args.page as number) || 1;

          const response = await fetch(
            `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/merge_requests?state=${state}&per_page=${perPage}&page=${page}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list merge requests: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`GitLab returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_issue': {
          const projectId = args.project_id as string;
          const title = args.title as string;

          if (!projectId || !title) {
            return {
              content: [{ type: 'text', text: 'project_id and title are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { title };
          if (args.description) body.description = args.description;
          if (args.labels) body.labels = args.labels;
          if (args.assignee_ids) body.assignee_ids = args.assignee_ids;

          const response = await fetch(
            `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/issues`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create issue: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`GitLab returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_pipelines': {
          const projectId = args.project_id as string;

          if (!projectId) {
            return {
              content: [{ type: 'text', text: 'project_id is required' }],
              isError: true,
            };
          }

          const perPage = (args.per_page as number) || 20;
          const page = (args.page as number) || 1;

          let url = `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/pipelines?per_page=${perPage}&page=${page}`;
          if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list pipelines: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`GitLab returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_issues': {
          const projectId = args.project_id as string;

          if (!projectId) {
            return {
              content: [{ type: 'text', text: 'project_id is required' }],
              isError: true,
            };
          }

          const state = (args.state as string) || 'opened';
          const perPage = (args.per_page as number) || 20;
          const page = (args.page as number) || 1;

          let url = `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/issues?state=${state}&per_page=${perPage}&page=${page}`;
          if (args.labels) url += `&labels=${encodeURIComponent(args.labels as string)}`;
          if (args.assignee_id) url += `&assignee_id=${args.assignee_id as number}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list issues: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`GitLab returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_merge_request': {
          const projectId = args.project_id as string;
          const mergeRequestIid = args.merge_request_iid as number;

          if (!projectId || !mergeRequestIid) {
            return {
              content: [{ type: 'text', text: 'project_id and merge_request_iid are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get merge request: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`GitLab returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_file': {
          const projectId = args.project_id as string;
          const filePath = args.file_path as string;
          const ref = args.ref as string;

          if (!projectId || !filePath || !ref) {
            return {
              content: [{ type: 'text', text: 'project_id, file_path, and ref are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/repository/files/${filePath}?ref=${encodeURIComponent(ref)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get file: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`GitLab returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

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
}
