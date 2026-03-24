/**
 * JFrog Artifactory MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/jfrog/mcp-jfrog — actively maintained, hosted/OAuth-based.
// This adapter serves the self-hosted / access-token (Bearer) use case for air-gapped and on-prem Artifactory deployments.

import { ToolDefinition, ToolResult } from './types.js';

interface JFrogArtifactoryConfig {
  baseUrl: string;
  accessToken: string;
}

export class JFrogArtifactoryMCPServer {
  private readonly baseUrl: string;
  private readonly accessToken: string;

  constructor(config: JFrogArtifactoryConfig) {
    // baseUrl should be the root JFrog Platform URL, e.g. https://mycompany.jfrog.io
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.accessToken = config.accessToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_repositories',
        description: 'List all repositories in Artifactory (local, remote, virtual)',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by repository type: local, remote, virtual, federated (omit for all)',
            },
            packageType: {
              type: 'string',
              description: 'Filter by package type, e.g. maven, npm, docker, pypi, helm',
            },
          },
        },
      },
      {
        name: 'get_repository',
        description: 'Get configuration details for a specific repository',
        inputSchema: {
          type: 'object',
          properties: {
            repoKey: {
              type: 'string',
              description: 'Repository key (name)',
            },
          },
          required: ['repoKey'],
        },
      },
      {
        name: 'get_artifact_info',
        description: 'Get metadata and properties for an artifact by its repository path',
        inputSchema: {
          type: 'object',
          properties: {
            repoKey: {
              type: 'string',
              description: 'Repository key',
            },
            artifactPath: {
              type: 'string',
              description: 'Path to the artifact within the repository, e.g. com/example/app/1.0/app-1.0.jar',
            },
          },
          required: ['repoKey', 'artifactPath'],
        },
      },
      {
        name: 'search_artifacts_aql',
        description: 'Search for artifacts using Artifactory Query Language (AQL). AQL supports complex cross-domain queries across repos, builds, and properties.',
        inputSchema: {
          type: 'object',
          properties: {
            aqlQuery: {
              type: 'string',
              description: 'AQL query string, e.g. items.find({"repo": "libs-release-local", "name": {"$match": "*.jar"}})',
            },
          },
          required: ['aqlQuery'],
        },
      },
      {
        name: 'delete_artifact',
        description: 'Delete an artifact or folder from a repository',
        inputSchema: {
          type: 'object',
          properties: {
            repoKey: {
              type: 'string',
              description: 'Repository key',
            },
            artifactPath: {
              type: 'string',
              description: 'Path to the artifact or folder to delete',
            },
          },
          required: ['repoKey', 'artifactPath'],
        },
      },
      {
        name: 'get_storage_summary',
        description: 'Get a summary of storage usage across all repositories',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_builds',
        description: 'List all build names tracked in Artifactory',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_build_info',
        description: 'Get detailed build information for a specific build name and number',
        inputSchema: {
          type: 'object',
          properties: {
            buildName: {
              type: 'string',
              description: 'Name of the build',
            },
            buildNumber: {
              type: 'string',
              description: 'Build number',
            },
          },
          required: ['buildName', 'buildNumber'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_repositories': {
          let url = `${this.baseUrl}/artifactory/api/repositories`;
          const params: string[] = [];
          if (args.type) params.push(`type=${encodeURIComponent(args.type as string)}`);
          if (args.packageType) params.push(`packageType=${encodeURIComponent(args.packageType as string)}`);
          if (params.length > 0) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list repositories: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Artifactory returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_repository': {
          const repoKey = args.repoKey as string;
          if (!repoKey) {
            return { content: [{ type: 'text', text: 'repoKey is required' }], isError: true };
          }

          const url = `${this.baseUrl}/artifactory/api/repositories/${encodeURIComponent(repoKey)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get repository: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Artifactory returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_artifact_info': {
          const repoKey = args.repoKey as string;
          const artifactPath = args.artifactPath as string;
          if (!repoKey || !artifactPath) {
            return { content: [{ type: 'text', text: 'repoKey and artifactPath are required' }], isError: true };
          }

          const url = `${this.baseUrl}/artifactory/api/storage/${encodeURIComponent(repoKey)}/${artifactPath}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get artifact info: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Artifactory returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_artifacts_aql': {
          const aqlQuery = args.aqlQuery as string;
          if (!aqlQuery) {
            return { content: [{ type: 'text', text: 'aqlQuery is required' }], isError: true };
          }

          const url = `${this.baseUrl}/artifactory/api/search/aql`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'text/plain' },
            body: aqlQuery,
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to execute AQL search: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Artifactory returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_artifact': {
          const repoKey = args.repoKey as string;
          const artifactPath = args.artifactPath as string;
          if (!repoKey || !artifactPath) {
            return { content: [{ type: 'text', text: 'repoKey and artifactPath are required' }], isError: true };
          }

          const url = `${this.baseUrl}/artifactory/${encodeURIComponent(repoKey)}/${artifactPath}`;
          const response = await fetch(url, { method: 'DELETE', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to delete artifact: ${response.status} ${response.statusText}` }], isError: true };
          }
          return { content: [{ type: 'text', text: `Artifact deleted: ${repoKey}/${artifactPath}` }], isError: false };
        }

        case 'get_storage_summary': {
          const url = `${this.baseUrl}/artifactory/api/storageinfo`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get storage summary: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Artifactory returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_builds': {
          const url = `${this.baseUrl}/artifactory/api/build`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list builds: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Artifactory returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_build_info': {
          const buildName = args.buildName as string;
          const buildNumber = args.buildNumber as string;
          if (!buildName || !buildNumber) {
            return { content: [{ type: 'text', text: 'buildName and buildNumber are required' }], isError: true };
          }

          const url = `${this.baseUrl}/artifactory/api/build/${encodeURIComponent(buildName)}/${encodeURIComponent(buildNumber)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get build info: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Artifactory returned non-JSON response (HTTP ${response.status})`); }
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
