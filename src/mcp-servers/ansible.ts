/**
 * Ansible Automation Platform MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/ansible/aap-mcp-server — OpenAPI-generated toolset (tool count varies by AAP version/config; actively maintained)

import { ToolDefinition, ToolResult } from './types.js';

interface AnsibleConfig {
  baseUrl: string;
  token: string;
}

export class AnsibleMCPServer {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: AnsibleConfig) {
    // baseUrl is the controller host, e.g. https://controller.example.com
    // The API is always mounted at /api/v2 on that host
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_job_templates',
        description: 'List all job templates on the Ansible Automation Platform controller',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20)',
            },
            search: {
              type: 'string',
              description: 'Search term to filter job templates by name',
            },
          },
        },
      },
      {
        name: 'launch_job_template',
        description: 'Launch a job template by its numeric ID. Optionally override inventory, extra_vars, limit, or job_tags.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric ID of the job template to launch',
            },
            extra_vars: {
              type: 'string',
              description: 'JSON or YAML string of extra variables to pass to the playbook',
            },
            limit: {
              type: 'string',
              description: 'Comma-separated list of hosts or groups to limit the run to',
            },
            job_tags: {
              type: 'string',
              description: 'Comma-separated list of playbook tags to run',
            },
            inventory: {
              type: 'number',
              description: 'Numeric ID of an inventory to override the template default',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_job',
        description: 'Retrieve the status and details of a specific job by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric ID of the job to retrieve',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_jobs',
        description: 'List recent jobs with optional filtering by status or job template',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by job status: new, pending, waiting, running, successful, failed, error, canceled',
            },
            job_template: {
              type: 'number',
              description: 'Filter by numeric job template ID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'list_inventories',
        description: 'List all inventories on the controller',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20)',
            },
            search: {
              type: 'string',
              description: 'Search term to filter inventories by name',
            },
          },
        },
      },
      {
        name: 'list_hosts',
        description: 'List hosts, optionally scoped to a specific inventory',
        inputSchema: {
          type: 'object',
          properties: {
            inventory_id: {
              type: 'number',
              description: 'Numeric inventory ID to scope the host list. Omit to list all hosts.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20)',
            },
            search: {
              type: 'string',
              description: 'Search term to filter hosts by name',
            },
          },
        },
      },
      {
        name: 'list_projects',
        description: 'List all projects configured on the controller',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20)',
            },
            search: {
              type: 'string',
              description: 'Search term to filter projects by name',
            },
          },
        },
      },
      {
        name: 'sync_project',
        description: 'Trigger an SCM update (sync) for a project by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Numeric ID of the project to sync',
            },
          },
          required: ['id'],
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
        case 'list_job_templates': {
          const page = (args.page as number) || 1;
          const pageSize = (args.page_size as number) || 20;
          let url = `${this.baseUrl}/api/v2/job_templates/?page=${page}&page_size=${pageSize}`;
          if (args.search) url += `&search=${encodeURIComponent(args.search as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list job templates: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`AAP returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'launch_job_template': {
          const id = args.id as number;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }
          const body: Record<string, unknown> = {};
          if (args.extra_vars) body.extra_vars = args.extra_vars;
          if (args.limit) body.limit = args.limit;
          if (args.job_tags) body.job_tags = args.job_tags;
          if (args.inventory) body.inventory = args.inventory;

          const response = await fetch(`${this.baseUrl}/api/v2/job_templates/${id}/launch/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to launch job template ${id}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`AAP returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_job': {
          const id = args.id as number;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/api/v2/jobs/${id}/`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get job ${id}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`AAP returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_jobs': {
          const page = (args.page as number) || 1;
          const pageSize = (args.page_size as number) || 20;
          let url = `${this.baseUrl}/api/v2/jobs/?page=${page}&page_size=${pageSize}`;
          if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;
          if (args.job_template) url += `&job_template=${args.job_template}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list jobs: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`AAP returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_inventories': {
          const page = (args.page as number) || 1;
          const pageSize = (args.page_size as number) || 20;
          let url = `${this.baseUrl}/api/v2/inventories/?page=${page}&page_size=${pageSize}`;
          if (args.search) url += `&search=${encodeURIComponent(args.search as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list inventories: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`AAP returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_hosts': {
          const page = (args.page as number) || 1;
          const pageSize = (args.page_size as number) || 20;
          let url: string;
          if (args.inventory_id) {
            url = `${this.baseUrl}/api/v2/inventories/${args.inventory_id}/hosts/?page=${page}&page_size=${pageSize}`;
          } else {
            url = `${this.baseUrl}/api/v2/hosts/?page=${page}&page_size=${pageSize}`;
          }
          if (args.search) url += `&search=${encodeURIComponent(args.search as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list hosts: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`AAP returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_projects': {
          const page = (args.page as number) || 1;
          const pageSize = (args.page_size as number) || 20;
          let url = `${this.baseUrl}/api/v2/projects/?page=${page}&page_size=${pageSize}`;
          if (args.search) url += `&search=${encodeURIComponent(args.search as string)}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list projects: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`AAP returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'sync_project': {
          const id = args.id as number;
          if (!id) {
            return { content: [{ type: 'text', text: 'id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/api/v2/projects/${id}/update/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({}),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to sync project ${id}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown = { message: `Project ${id} sync triggered successfully` };
          if (response.status !== 204) {
            try { data = await response.json(); } catch { /* 204 No Content or non-JSON — use default message */ }
          }
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
