/**
 * Pulumi MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/pulumi/mcp-server — hosted at mcp.ai.pulumi.com, uses OAuth.
// The official MCP is the recommended solution for users who can use the hosted, OAuth-based server.
// This adapter serves deployments requiring direct API token access without OAuth, self-hosted
// Pulumi Cloud, or air-gapped environments. Auth: "Authorization: token {token}" (not Bearer).
// Base URL is configurable for self-hosted Pulumi Cloud instances.

import { ToolDefinition, ToolResult } from './types.js';

interface PulumiConfig {
  /**
   * Pulumi Cloud access token. Generate at: app.pulumi.com > Settings > Access Tokens.
   * The Authorization header format is "token {accessToken}" (not "Bearer").
   */
  accessToken: string;
  /**
   * Base URL for the Pulumi Cloud REST API.
   * Defaults to https://api.pulumi.com for managed Pulumi Cloud.
   * For self-hosted Pulumi Cloud, use your configured API endpoint.
   */
  baseUrl?: string;
}

export class PulumiMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: PulumiConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl || 'https://api.pulumi.com').replace(/\/$/, '');
  }

  private buildHeaders(): Record<string, string> {
    return {
      // Pulumi uses "token {value}" format, not "Bearer {value}"
      Authorization: `token ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.pulumi+8',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_stacks',
        description:
          'List stacks accessible to the authenticated user, with optional filtering by organization, project, or tag.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: {
              type: 'string',
              description: 'Filter stacks by organization name.',
            },
            project: {
              type: 'string',
              description: 'Filter stacks by project name.',
            },
            tagName: {
              type: 'string',
              description: 'Filter stacks by a tag name.',
            },
            tagValue: {
              type: 'string',
              description: 'Filter stacks by a tag value (requires tagName).',
            },
            continuationToken: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
        },
      },
      {
        name: 'get_stack',
        description: 'Get details and metadata for a specific Pulumi stack.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: {
              type: 'string',
              description: 'The organization name that owns the stack.',
            },
            project: {
              type: 'string',
              description: 'The project name.',
            },
            stack: {
              type: 'string',
              description: 'The stack name.',
            },
          },
          required: ['organization', 'project', 'stack'],
        },
      },
      {
        name: 'create_stack',
        description: 'Create a new stack in a Pulumi Cloud project.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: {
              type: 'string',
              description: 'The organization name.',
            },
            project: {
              type: 'string',
              description: 'The project name.',
            },
            stackName: {
              type: 'string',
              description: 'The name for the new stack (e.g. "dev", "prod", "staging").',
            },
          },
          required: ['organization', 'project', 'stackName'],
        },
      },
      {
        name: 'delete_stack',
        description: 'Delete a Pulumi stack. The stack must have no resources or force must be true.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: {
              type: 'string',
              description: 'The organization name.',
            },
            project: {
              type: 'string',
              description: 'The project name.',
            },
            stack: {
              type: 'string',
              description: 'The stack name to delete.',
            },
            force: {
              type: 'boolean',
              description: 'If true, delete even if the stack has existing resources (default: false).',
            },
          },
          required: ['organization', 'project', 'stack'],
        },
      },
      {
        name: 'list_stack_updates',
        description: 'List the update history for a stack (deploys, previews, destroys, refreshes).',
        inputSchema: {
          type: 'object',
          properties: {
            organization: {
              type: 'string',
              description: 'The organization name.',
            },
            project: {
              type: 'string',
              description: 'The project name.',
            },
            stack: {
              type: 'string',
              description: 'The stack name.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            pageSize: {
              type: 'number',
              description: 'Number of updates per page (default: 10).',
            },
          },
          required: ['organization', 'project', 'stack'],
        },
      },
      {
        name: 'get_stack_state',
        description:
          'Export the current state (checkpoint) for a stack. Returns the full Pulumi state file including all resource URNs, properties, and dependencies.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: {
              type: 'string',
              description: 'The organization name.',
            },
            project: {
              type: 'string',
              description: 'The project name.',
            },
            stack: {
              type: 'string',
              description: 'The stack name.',
            },
          },
          required: ['organization', 'project', 'stack'],
        },
      },
      {
        name: 'get_stack_config',
        description: 'Get the configuration (non-secret) for a stack.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: {
              type: 'string',
              description: 'The organization name.',
            },
            project: {
              type: 'string',
              description: 'The project name.',
            },
            stack: {
              type: 'string',
              description: 'The stack name.',
            },
          },
          required: ['organization', 'project', 'stack'],
        },
      },
      {
        name: 'list_organization_members',
        description: 'List members of a Pulumi Cloud organization.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: {
              type: 'string',
              description: 'The organization name.',
            },
          },
          required: ['organization'],
        },
      },
      {
        name: 'get_current_user',
        description: 'Get information about the currently authenticated user and their organizations.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_deployments',
        description: 'List Pulumi Deployments (managed remote execution) for an organization.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: {
              type: 'string',
              description: 'The organization name.',
            },
            continuationToken: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
          required: ['organization'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers = this.buildHeaders();

      switch (name) {
        case 'list_stacks': {
          const params = new URLSearchParams();
          if (args.organization) params.append('organization', args.organization as string);
          if (args.project) params.append('project', args.project as string);
          if (args.tagName) params.append('tagName', args.tagName as string);
          if (args.tagValue) params.append('tagValue', args.tagValue as string);
          if (args.continuationToken) params.append('continuationToken', args.continuationToken as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/api/user/stacks${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list stacks: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Pulumi returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_stack': {
          const org = args.organization as string;
          const proj = args.project as string;
          const stack = args.stack as string;

          if (!org || !proj || !stack) {
            return { content: [{ type: 'text', text: 'organization, project, and stack are required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(proj)}/${encodeURIComponent(stack)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get stack: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Pulumi returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_stack': {
          const org = args.organization as string;
          const proj = args.project as string;
          const stackName = args.stackName as string;

          if (!org || !proj || !stackName) {
            return { content: [{ type: 'text', text: 'organization, project, and stackName are required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(proj)}`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({ stackName }),
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create stack: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Pulumi returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_stack': {
          const org = args.organization as string;
          const proj = args.project as string;
          const stack = args.stack as string;

          if (!org || !proj || !stack) {
            return { content: [{ type: 'text', text: 'organization, project, and stack are required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.force) params.append('force', 'true');

          const qs = params.toString();
          const url = `${this.baseUrl}/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(proj)}/${encodeURIComponent(stack)}${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'DELETE', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to delete stack: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: `Stack ${org}/${proj}/${stack} deleted.` }], isError: false };
        }

        case 'list_stack_updates': {
          const org = args.organization as string;
          const proj = args.project as string;
          const stack = args.stack as string;

          if (!org || !proj || !stack) {
            return { content: [{ type: 'text', text: 'organization, project, and stack are required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.page) params.append('page', String(args.page as number));
          if (args.pageSize) params.append('pageSize', String(args.pageSize as number));

          const qs = params.toString();
          const url = `${this.baseUrl}/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(proj)}/${encodeURIComponent(stack)}/updates${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list stack updates: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Pulumi returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_stack_state': {
          const org = args.organization as string;
          const proj = args.project as string;
          const stack = args.stack as string;

          if (!org || !proj || !stack) {
            return { content: [{ type: 'text', text: 'organization, project, and stack are required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(proj)}/${encodeURIComponent(stack)}/export`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get stack state: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Pulumi returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_stack_config': {
          const org = args.organization as string;
          const proj = args.project as string;
          const stack = args.stack as string;

          if (!org || !proj || !stack) {
            return { content: [{ type: 'text', text: 'organization, project, and stack are required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(proj)}/${encodeURIComponent(stack)}/config`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get stack config: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Pulumi returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_organization_members': {
          const org = args.organization as string;
          if (!org) {
            return { content: [{ type: 'text', text: 'organization is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/api/orgs/${encodeURIComponent(org)}/members`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list organization members: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Pulumi returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_current_user': {
          const response = await fetch(`${this.baseUrl}/api/user`, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get current user: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Pulumi returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_deployments': {
          const org = args.organization as string;
          if (!org) {
            return { content: [{ type: 'text', text: 'organization is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.continuationToken) params.append('continuationToken', args.continuationToken as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/api/orgs/${encodeURIComponent(org)}/deployments${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list deployments: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Pulumi returned non-JSON response (HTTP ${response.status})`); }
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
