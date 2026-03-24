/**
 * LaunchDarkly MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/launchdarkly/mcp-server — 20+ tools, v0.6.1, March 2026, actively maintained.
// The official MCP server is the recommended solution for most users.
// This adapter serves as a self-hosted fallback and for deployments requiring direct API-key access
// without the official MCP server runtime dependency. Supports the federal instance via baseUrl override.

import { ToolDefinition, ToolResult } from './types.js';

interface LaunchDarklyConfig {
  /**
   * LaunchDarkly API access token (generated from Authorization page in LaunchDarkly UI).
   * Must have the appropriate roles for the operations you intend to perform.
   */
  apiKey: string;
  /**
   * Base URL for the LaunchDarkly REST API.
   * Defaults to https://app.launchdarkly.com for the standard instance.
   * Use https://app.launchdarkly.us for the federal instance.
   */
  baseUrl?: string;
}

export class LaunchDarklyMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LaunchDarklyConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://app.launchdarkly.com').replace(/\/$/, '');
  }

  private buildHeaders(contentType?: string): Record<string, string> {
    return {
      Authorization: this.apiKey,
      'Content-Type': contentType || 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_feature_flags',
        description: 'List all feature flags in a project with optional environment and summary filtering.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'The project key (e.g. "default").',
            },
            env: {
              type: 'string',
              description: 'Return only configurations for this environment key to reduce payload size.',
            },
            summary: {
              type: 'boolean',
              description: 'If true, returns a summary with fewer fields (default: true).',
            },
            filter: {
              type: 'string',
              description: 'Filter flags by various attributes, e.g. "query:my-flag,tags:beta".',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of flags to return (default: 20, max: 200).',
            },
            offset: {
              type: 'number',
              description: 'Number of flags to skip for pagination.',
            },
          },
          required: ['projectKey'],
        },
      },
      {
        name: 'get_feature_flag',
        description: 'Get a single feature flag by project key and flag key.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'The project key.',
            },
            flagKey: {
              type: 'string',
              description: 'The feature flag key.',
            },
            env: {
              type: 'string',
              description: 'Filter the response to a single environment key.',
            },
          },
          required: ['projectKey', 'flagKey'],
        },
      },
      {
        name: 'create_feature_flag',
        description: 'Create a new feature flag in a project.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'The project key.',
            },
            name: {
              type: 'string',
              description: 'Human-readable name for the flag.',
            },
            key: {
              type: 'string',
              description: 'Unique key for the flag (snake_case or kebab-case, e.g. "my-new-flag").',
            },
            description: {
              type: 'string',
              description: 'Description of the flag purpose.',
            },
            tags: {
              type: 'array',
              description: 'List of tags to apply to the flag.',
              items: { type: 'string' },
            },
            temporary: {
              type: 'boolean',
              description: 'Whether the flag is temporary (default: true). Temporary flags are expected to be removed.',
            },
            variations: {
              type: 'array',
              description: 'Flag variations. For boolean flags this is handled automatically.',
              items: { type: 'object' },
            },
          },
          required: ['projectKey', 'name', 'key'],
        },
      },
      {
        name: 'toggle_flag_targeting',
        description:
          'Turn flag targeting on or off in a specific environment using a semantic patch. This controls whether the flag uses targeting rules or falls back to the off variation.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'The project key.',
            },
            flagKey: {
              type: 'string',
              description: 'The feature flag key.',
            },
            environmentKey: {
              type: 'string',
              description: 'The environment where targeting should be toggled.',
            },
            on: {
              type: 'boolean',
              description: 'Set to true to turn targeting on, false to turn it off.',
            },
            comment: {
              type: 'string',
              description: 'Optional comment explaining the change (recorded in the audit log).',
            },
          },
          required: ['projectKey', 'flagKey', 'environmentKey', 'on'],
        },
      },
      {
        name: 'update_feature_flag',
        description:
          'Update a feature flag using a JSON patch or JSON merge patch. For targeting rule changes, prefer toggle_flag_targeting for on/off.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'The project key.',
            },
            flagKey: {
              type: 'string',
              description: 'The feature flag key to update.',
            },
            patch: {
              type: 'array',
              description:
                'JSON Patch operations array, e.g. [{"op":"replace","path":"/description","value":"New description"}].',
              items: { type: 'object' },
            },
            comment: {
              type: 'string',
              description: 'Optional audit log comment.',
            },
          },
          required: ['projectKey', 'flagKey', 'patch'],
        },
      },
      {
        name: 'delete_feature_flag',
        description: 'Permanently delete a feature flag from a project across all environments.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'The project key.',
            },
            flagKey: {
              type: 'string',
              description: 'The feature flag key to delete.',
            },
          },
          required: ['projectKey', 'flagKey'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all projects in your LaunchDarkly account.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of projects to return (default: 20).',
            },
            offset: {
              type: 'number',
              description: 'Number of projects to skip for pagination.',
            },
          },
        },
      },
      {
        name: 'list_environments',
        description: 'List all environments in a project.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'The project key.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of environments to return.',
            },
          },
          required: ['projectKey'],
        },
      },
      {
        name: 'get_audit_log',
        description: 'Retrieve the audit log of changes made to flags, segments, and other resources.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of audit log entries to return (default: 20, max: 1000).',
            },
            before: {
              type: 'number',
              description: 'Unix millisecond timestamp — return entries before this time.',
            },
            after: {
              type: 'number',
              description: 'Unix millisecond timestamp — return entries after this time.',
            },
            q: {
              type: 'string',
              description: 'Search query to filter audit log entries.',
            },
            spec: {
              type: 'string',
              description: 'Resource specifier filter, e.g. "proj/default:env/production:flag/my-flag".',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers = this.buildHeaders();

      switch (name) {
        case 'list_feature_flags': {
          const projectKey = args.projectKey as string;
          if (!projectKey) {
            return { content: [{ type: 'text', text: 'projectKey is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.env) params.append('env', args.env as string);
          if (typeof args.summary === 'boolean') params.append('summary', String(args.summary));
          if (args.filter) params.append('filter', args.filter as string);
          if (args.limit) params.append('limit', String(args.limit as number));
          if (args.offset) params.append('offset', String(args.offset as number));

          const qs = params.toString();
          const url = `${this.baseUrl}/api/v2/flags/${encodeURIComponent(projectKey)}${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list feature flags: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`LaunchDarkly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_feature_flag': {
          const projectKey = args.projectKey as string;
          const flagKey = args.flagKey as string;

          if (!projectKey || !flagKey) {
            return { content: [{ type: 'text', text: 'projectKey and flagKey are required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.env) params.append('env', args.env as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/api/v2/flags/${encodeURIComponent(projectKey)}/${encodeURIComponent(flagKey)}${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get feature flag: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`LaunchDarkly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_feature_flag': {
          const projectKey = args.projectKey as string;
          if (!projectKey || !args.name || !args.key) {
            return { content: [{ type: 'text', text: 'projectKey, name, and key are required' }], isError: true };
          }

          const body: Record<string, unknown> = {
            name: args.name,
            key: args.key,
          };
          if (args.description) body.description = args.description;
          if (args.tags) body.tags = args.tags;
          if (typeof args.temporary === 'boolean') body.temporary = args.temporary;
          if (args.variations) body.variations = args.variations;

          const response = await fetch(`${this.baseUrl}/api/v2/flags/${encodeURIComponent(projectKey)}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create feature flag: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`LaunchDarkly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'toggle_flag_targeting': {
          const projectKey = args.projectKey as string;
          const flagKey = args.flagKey as string;
          const environmentKey = args.environmentKey as string;

          if (!projectKey || !flagKey || !environmentKey || typeof args.on !== 'boolean') {
            return {
              content: [{ type: 'text', text: 'projectKey, flagKey, environmentKey, and on are required' }],
              isError: true,
            };
          }

          const instruction = args.on ? { kind: 'turnFlagOn' } : { kind: 'turnFlagOff' };
          const body: Record<string, unknown> = {
            environmentKey,
            instructions: [instruction],
          };
          if (args.comment) body.comment = args.comment;

          // Semantic patch requires the domain-model suffix on Content-Type
          const semanticPatchHeaders = {
            ...headers,
            'Content-Type': 'application/json; domain-model=launchdarkly.semanticpatch',
          };

          const response = await fetch(
            `${this.baseUrl}/api/v2/flags/${encodeURIComponent(projectKey)}/${encodeURIComponent(flagKey)}`,
            { method: 'PATCH', headers: semanticPatchHeaders, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to toggle flag targeting: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`LaunchDarkly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_feature_flag': {
          const projectKey = args.projectKey as string;
          const flagKey = args.flagKey as string;
          const patch = args.patch as unknown[];

          if (!projectKey || !flagKey || !patch) {
            return { content: [{ type: 'text', text: 'projectKey, flagKey, and patch are required' }], isError: true };
          }

          const body: Record<string, unknown> = { patch };
          if (args.comment) body.comment = args.comment;

          const jsonPatchHeaders = {
            ...headers,
            'Content-Type': 'application/json',
          };

          const response = await fetch(
            `${this.baseUrl}/api/v2/flags/${encodeURIComponent(projectKey)}/${encodeURIComponent(flagKey)}`,
            { method: 'PATCH', headers: jsonPatchHeaders, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to update feature flag: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`LaunchDarkly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_feature_flag': {
          const projectKey = args.projectKey as string;
          const flagKey = args.flagKey as string;

          if (!projectKey || !flagKey) {
            return { content: [{ type: 'text', text: 'projectKey and flagKey are required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/api/v2/flags/${encodeURIComponent(projectKey)}/${encodeURIComponent(flagKey)}`,
            { method: 'DELETE', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to delete feature flag: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: `Flag ${flagKey} deleted from project ${projectKey}.` }], isError: false };
        }

        case 'list_projects': {
          const params = new URLSearchParams();
          if (args.limit) params.append('limit', String(args.limit as number));
          if (args.offset) params.append('offset', String(args.offset as number));

          const qs = params.toString();
          const url = `${this.baseUrl}/api/v2/projects${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list projects: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`LaunchDarkly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_environments': {
          const projectKey = args.projectKey as string;
          if (!projectKey) {
            return { content: [{ type: 'text', text: 'projectKey is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.limit) params.append('limit', String(args.limit as number));

          const qs = params.toString();
          const url = `${this.baseUrl}/api/v2/projects/${encodeURIComponent(projectKey)}/environments${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list environments: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`LaunchDarkly returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_audit_log': {
          const params = new URLSearchParams();
          if (args.limit) params.append('limit', String(args.limit as number));
          if (args.before) params.append('before', String(args.before as number));
          if (args.after) params.append('after', String(args.after as number));
          if (args.q) params.append('q', args.q as string);
          if (args.spec) params.append('spec', args.spec as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/api/v2/auditlog${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get audit log: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`LaunchDarkly returned non-JSON response (HTTP ${response.status})`); }
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
