/**
 * Railway MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/railwayapp/railway-mcp-server — actively maintained, wraps Railway GraphQL API

import { ToolDefinition, ToolResult } from './types.js';

interface RailwayConfig {
  token: string;
  baseUrl?: string;
}

// Railway's public API is GraphQL — all calls are POST to the single endpoint
export class RailwayMCPServer {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: RailwayConfig) {
    this.token = config.token;
    this.baseUrl = config.baseUrl || 'https://backboard.railway.com/graphql/v2';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all Railway projects accessible to the authenticated token',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_project',
        description: 'Get details for a specific Railway project by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'UUID of the Railway project',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_services',
        description: 'List all services in a Railway project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'UUID of the Railway project',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'redeploy_service',
        description: 'Trigger a redeploy of a Railway service instance in a specific environment',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'UUID of the Railway service to redeploy',
            },
            environment_id: {
              type: 'string',
              description: 'UUID of the environment in which to redeploy the service',
            },
          },
          required: ['service_id', 'environment_id'],
        },
      },
      {
        name: 'upsert_variables',
        description: 'Create or update environment variables for a Railway service in a specific environment',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'UUID of the Railway project',
            },
            environment_id: {
              type: 'string',
              description: 'UUID of the environment to set variables in',
            },
            service_id: {
              type: 'string',
              description: 'UUID of the service these variables apply to',
            },
            variables: {
              type: 'object',
              description: 'Key-value pairs of variables to upsert (e.g. {"PORT": "3000", "NODE_ENV": "production"})',
            },
          },
          required: ['project_id', 'environment_id', 'service_id', 'variables'],
        },
      },
      {
        name: 'list_deployments',
        description: 'List recent deployments for a Railway service in a specific environment',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'UUID of the Railway service',
            },
            environment_id: {
              type: 'string',
              description: 'UUID of the environment',
            },
          },
          required: ['service_id', 'environment_id'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new Railway project',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new project',
            },
            description: {
              type: 'string',
              description: 'Optional description for the project',
            },
            default_environment_name: {
              type: 'string',
              description: 'Name for the default environment (default: production)',
            },
          },
          required: ['name'],
        },
      },
    ];
  }

  private async gql(query: string, variables: Record<string, unknown>): Promise<Response> {
    return fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects': {
          const response = await this.gql(
            `query { projects { edges { node { id name description createdAt updatedAt } } } }`,
            {}
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list projects: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_project': {
          const projectId = args.project_id as string;
          if (!projectId) {
            return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
          }
          const response = await this.gql(
            `query project($id: String!) {
              project(id: $id) {
                id name description createdAt updatedAt
                environments { edges { node { id name } } }
                services { edges { node { id name } } }
              }
            }`,
            { id: projectId }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get project ${projectId}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_services': {
          const projectId = args.project_id as string;
          if (!projectId) {
            return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
          }
          const response = await this.gql(
            `query services($projectId: String!) {
              project(id: $projectId) {
                services { edges { node { id name createdAt updatedAt } } }
              }
            }`,
            { projectId }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list services for project ${projectId}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'redeploy_service': {
          const serviceId = args.service_id as string;
          const environmentId = args.environment_id as string;
          if (!serviceId || !environmentId) {
            return { content: [{ type: 'text', text: 'service_id and environment_id are required' }], isError: true };
          }
          const response = await this.gql(
            `mutation serviceInstanceRedeploy($serviceId: String!, $environmentId: String!) {
              serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
            }`,
            { serviceId, environmentId }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to redeploy service ${serviceId}: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'upsert_variables': {
          const projectId = args.project_id as string;
          const environmentId = args.environment_id as string;
          const serviceId = args.service_id as string;
          const variables = args.variables as Record<string, string>;
          if (!projectId || !environmentId || !serviceId || !variables) {
            return { content: [{ type: 'text', text: 'project_id, environment_id, service_id, and variables are required' }], isError: true };
          }
          const response = await this.gql(
            `mutation variableCollectionUpsert($input: VariableCollectionUpsertInput!) {
              variableCollectionUpsert(input: $input)
            }`,
            { input: { projectId, environmentId, serviceId, variables } }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to upsert variables: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_deployments': {
          const serviceId = args.service_id as string;
          const environmentId = args.environment_id as string;
          if (!serviceId || !environmentId) {
            return { content: [{ type: 'text', text: 'service_id and environment_id are required' }], isError: true };
          }
          const response = await this.gql(
            `query deployments($serviceId: String!, $environmentId: String!) {
              deployments(input: { serviceId: $serviceId, environmentId: $environmentId }) {
                edges { node { id status createdAt updatedAt url } }
              }
            }`,
            { serviceId, environmentId }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list deployments: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_project': {
          const projectName = args.name as string;
          if (!projectName) {
            return { content: [{ type: 'text', text: 'name is required' }], isError: true };
          }
          const input: Record<string, unknown> = { name: projectName };
          if (args.description) input.description = args.description;
          if (args.default_environment_name) input.defaultEnvironmentName = args.default_environment_name;

          const response = await this.gql(
            `mutation projectCreate($input: ProjectCreateInput!) {
              projectCreate(input: $input) { id name description }
            }`,
            { input }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create project: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Railway returned non-JSON response (HTTP ${response.status})`); }
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
