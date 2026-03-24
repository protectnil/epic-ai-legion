/**
 * Snyk MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/snyk/studio-mcp — 11 tools, officially maintained by Snyk (v1.7.0, March 2026). Requires Snyk CLI installation and runs CLI-backed scans. This adapter uses the Snyk REST API directly for programmatic access to org data, projects, and issues without requiring the CLI.

import { ToolDefinition, ToolResult } from './types.js';

// Auth: Authorization: token {API_TOKEN} header.
// Base URL: https://api.snyk.io (default, SNYK-US-01 region).
// Other regions: https://api.eu.snyk.io (SNYK-EU-01), https://api.au.snyk.io (SNYK-AU-01).
// REST API path prefix: /rest — version param (e.g. ?version=2024-10-15) required on all REST calls.
// Recommended stable version: 2024-10-15

interface SnykConfig {
  apiToken: string;
  baseUrl?: string;
  apiVersion?: string;
}

export class SnykMCPServer {
  private readonly apiToken: string;
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor(config: SnykConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.snyk.io';
    this.apiVersion = config.apiVersion || '2024-10-15';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_orgs',
        description: 'List all Snyk organizations accessible with the current API token',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of organizations to return (default: 100)',
            },
            starting_after: {
              type: 'string',
              description: 'Cursor for forward pagination (from previous response)',
            },
          },
        },
      },
      {
        name: 'list_projects',
        description: 'List all projects within a Snyk organization',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of projects to return (default: 100)',
            },
            starting_after: {
              type: 'string',
              description: 'Cursor for forward pagination (from previous response)',
            },
            type: {
              type: 'string',
              description: 'Filter by project type (e.g. npm, maven, dockerfile)',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'list_issues',
        description: 'List security issues (vulnerabilities and license issues) for a Snyk organization',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of issues to return (default: 100)',
            },
            starting_after: {
              type: 'string',
              description: 'Cursor for forward pagination',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: critical, high, medium, low (comma-separated)',
            },
            type: {
              type: 'string',
              description: 'Filter by issue type: package_vulnerability, license',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'get_issue',
        description: 'Retrieve full details for a specific Snyk issue by ID within an organization',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            issue_id: {
              type: 'string',
              description: 'The Snyk issue ID',
            },
          },
          required: ['org_id', 'issue_id'],
        },
      },
      {
        name: 'list_targets',
        description: 'List import targets (repositories, containers, or other sources) in a Snyk organization',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of targets to return (default: 100)',
            },
            starting_after: {
              type: 'string',
              description: 'Cursor for forward pagination',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'list_package_issues',
        description: 'List known vulnerabilities for a specific package version using its PURL (Package URL)',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            purl: {
              type: 'string',
              description: 'Package URL (PURL) — e.g. pkg:npm/lodash@4.17.20',
            },
          },
          required: ['org_id', 'purl'],
        },
      },
      {
        name: 'get_project',
        description: 'Retrieve details for a specific Snyk project by project ID',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'The Snyk organization ID',
            },
            project_id: {
              type: 'string',
              description: 'The Snyk project ID',
            },
          },
          required: ['org_id', 'project_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `token ${this.apiToken}`,
        'Content-Type': 'application/vnd.api+json',
      };
      const v = `version=${encodeURIComponent(this.apiVersion)}`;

      switch (name) {
        case 'list_orgs': {
          const params = new URLSearchParams({ version: this.apiVersion });
          if (args.limit) params.set('limit', String(args.limit));
          if (args.starting_after) params.set('starting_after', args.starting_after as string);

          const response = await fetch(`${this.baseUrl}/rest/orgs?${params.toString()}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to list orgs (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Snyk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_projects': {
          const orgId = args.org_id as string;
          if (!orgId) {
            return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
          }

          const params = new URLSearchParams({ version: this.apiVersion });
          if (args.limit) params.set('limit', String(args.limit));
          if (args.starting_after) params.set('starting_after', args.starting_after as string);
          if (args.type) params.set('type', args.type as string);

          const response = await fetch(
            `${this.baseUrl}/rest/orgs/${encodeURIComponent(orgId)}/projects?${params.toString()}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to list projects (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Snyk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_issues': {
          const orgId = args.org_id as string;
          if (!orgId) {
            return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
          }

          const params = new URLSearchParams({ version: this.apiVersion });
          if (args.limit) params.set('limit', String(args.limit));
          if (args.starting_after) params.set('starting_after', args.starting_after as string);
          if (args.severity) params.set('severity', args.severity as string);
          if (args.type) params.set('type', args.type as string);

          const response = await fetch(
            `${this.baseUrl}/rest/orgs/${encodeURIComponent(orgId)}/issues?${params.toString()}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to list issues (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Snyk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_issue': {
          const orgId = args.org_id as string;
          const issueId = args.issue_id as string;
          if (!orgId || !issueId) {
            return { content: [{ type: 'text', text: 'org_id and issue_id are required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/rest/orgs/${encodeURIComponent(orgId)}/issues/${encodeURIComponent(issueId)}?${v}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to get issue (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Snyk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_targets': {
          const orgId = args.org_id as string;
          if (!orgId) {
            return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
          }

          const params = new URLSearchParams({ version: this.apiVersion });
          if (args.limit) params.set('limit', String(args.limit));
          if (args.starting_after) params.set('starting_after', args.starting_after as string);

          const response = await fetch(
            `${this.baseUrl}/rest/orgs/${encodeURIComponent(orgId)}/targets?${params.toString()}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to list targets (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Snyk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_package_issues': {
          const orgId = args.org_id as string;
          const purl = args.purl as string;
          if (!orgId || !purl) {
            return { content: [{ type: 'text', text: 'org_id and purl are required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/rest/orgs/${encodeURIComponent(orgId)}/packages/${encodeURIComponent(purl)}/issues?${v}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to list package issues (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Snyk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_project': {
          const orgId = args.org_id as string;
          const projectId = args.project_id as string;
          if (!orgId || !projectId) {
            return { content: [{ type: 'text', text: 'org_id and project_id are required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/rest/orgs/${encodeURIComponent(orgId)}/projects/${encodeURIComponent(projectId)}?${v}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            const errText = await response.text();
            return { content: [{ type: 'text', text: `Failed to get project (HTTP ${response.status}): ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Snyk returned non-JSON response (HTTP ${response.status})`); }
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
