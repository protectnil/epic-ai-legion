/**
 * Argo Workflows MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found for Argo Workflows specifically.
// Note: argoproj-labs/mcp-for-argocd is for Argo CD (GitOps), not Argo Workflows (batch/pipeline engine).
// jakkaj/mcp-argo-server is a community Go implementation with minimal tool coverage.
// This adapter provides complete workflow lifecycle management via the Argo Workflows REST API.
// Auth: Bearer token — use "argo auth token" CLI command or a Kubernetes ServiceAccount token.
// Base URL is user-configurable; the Argo Server typically runs on port 2746.

import { ToolDefinition, ToolResult } from './types.js';

interface ArgoWorkflowsConfig {
  /**
   * Base URL of your Argo Workflows server, e.g. https://argo.example.com
   * Defaults to https://localhost:2746 if not provided.
   */
  baseUrl?: string;
  /**
   * Bearer token for authentication. Generate via: argo auth token
   * or use a Kubernetes ServiceAccount token with the appropriate RBAC.
   */
  token: string;
  /**
   * Default Kubernetes namespace for workflow operations (default: argo).
   */
  defaultNamespace?: string;
}

export class ArgoWorkflowsMCPServer {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly defaultNamespace: string;

  constructor(config: ArgoWorkflowsConfig) {
    this.baseUrl = (config.baseUrl || 'https://localhost:2746').replace(/\/$/, '');
    this.token = config.token;
    this.defaultNamespace = config.defaultNamespace || 'argo';
  }

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workflows',
        description: 'List workflows in a Kubernetes namespace with optional field selector and label selector filtering.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace to list workflows from (uses defaultNamespace if omitted).',
            },
            fieldSelector: {
              type: 'string',
              description: 'Kubernetes field selector, e.g. "metadata.namespace=argo,status.phase=Running".',
            },
            labelSelector: {
              type: 'string',
              description: 'Kubernetes label selector, e.g. "app=my-app,env=prod".',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of workflows to return.',
            },
            continueToken: {
              type: 'string',
              description: 'Pagination continue token from a previous response.',
            },
          },
        },
      },
      {
        name: 'get_workflow',
        description: 'Get the full status and spec of a specific workflow by name.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace of the workflow.',
            },
            name: {
              type: 'string',
              description: 'Name of the workflow.',
            },
            getTemplates: {
              type: 'boolean',
              description: 'Whether to include template details in the response (default: false).',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'submit_workflow',
        description:
          'Submit a new workflow from a WorkflowTemplate, ClusterWorkflowTemplate, or CronWorkflow. To submit an ad-hoc workflow manifest, use create_workflow.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace to submit the workflow in.',
            },
            resourceKind: {
              type: 'string',
              description: 'Kind of the resource to submit from: WorkflowTemplate, ClusterWorkflowTemplate, or CronWorkflow.',
            },
            resourceName: {
              type: 'string',
              description: 'Name of the WorkflowTemplate, ClusterWorkflowTemplate, or CronWorkflow to use.',
            },
            entrypoint: {
              type: 'string',
              description: 'Override the entrypoint template name.',
            },
            parameters: {
              type: 'array',
              description: 'List of parameter overrides in "name=value" format.',
              items: { type: 'string' },
            },
            labels: {
              type: 'string',
              description: 'Comma-separated labels to add to the workflow, e.g. "env=prod,team=platform".',
            },
          },
          required: ['resourceKind', 'resourceName'],
        },
      },
      {
        name: 'terminate_workflow',
        description:
          'Terminate a running workflow immediately. All running pods are stopped and no further steps are executed.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace of the workflow.',
            },
            name: {
              type: 'string',
              description: 'Name of the workflow to terminate.',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'stop_workflow',
        description:
          'Stop a running workflow gracefully. Current steps complete, then the workflow stops. Differs from terminate which kills immediately.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace of the workflow.',
            },
            name: {
              type: 'string',
              description: 'Name of the workflow to stop.',
            },
            message: {
              type: 'string',
              description: 'Optional message to record as the reason for stopping.',
            },
            nodeFieldSelector: {
              type: 'string',
              description: 'Field selector to target specific nodes within the workflow to stop.',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'retry_workflow',
        description: 'Retry a failed workflow from the point of failure.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace of the workflow.',
            },
            name: {
              type: 'string',
              description: 'Name of the failed workflow to retry.',
            },
            restartSuccessful: {
              type: 'boolean',
              description: 'Whether to restart successful nodes as well (default: false).',
            },
            nodeFieldSelector: {
              type: 'string',
              description: 'Field selector to retry only specific failed nodes.',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_workflow',
        description: 'Delete a workflow and its associated pods from the cluster.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace of the workflow.',
            },
            name: {
              type: 'string',
              description: 'Name of the workflow to delete.',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_workflow_logs',
        description: 'Stream or retrieve logs from a workflow or a specific pod/container within it.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace of the workflow.',
            },
            name: {
              type: 'string',
              description: 'Name of the workflow.',
            },
            podName: {
              type: 'string',
              description: 'Filter logs to a specific pod name.',
            },
            container: {
              type: 'string',
              description: 'Container name within the pod (default: main).',
            },
            tailLines: {
              type: 'number',
              description: 'Number of log lines to return from the end of the log.',
            },
            grep: {
              type: 'string',
              description: 'Filter log lines matching this string.',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_workflow_templates',
        description: 'List WorkflowTemplates in a namespace.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Kubernetes namespace to list templates in.',
            },
            labelSelector: {
              type: 'string',
              description: 'Kubernetes label selector to filter templates.',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers = this.buildHeaders();
      const ns = (args.namespace as string) || this.defaultNamespace;

      switch (name) {
        case 'list_workflows': {
          const params = new URLSearchParams();
          if (args.fieldSelector) params.append('listOptions.fieldSelector', args.fieldSelector as string);
          if (args.labelSelector) params.append('listOptions.labelSelector', args.labelSelector as string);
          if (args.limit) params.append('listOptions.limit', String(args.limit as number));
          if (args.continueToken) params.append('listOptions.continue', args.continueToken as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list workflows: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Argo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_workflow': {
          const workflowName = args.name as string;
          if (!workflowName) {
            return { content: [{ type: 'text', text: 'name is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.getTemplates) params.append('getTemplates', 'true');

          const qs = params.toString();
          const url = `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}/${encodeURIComponent(workflowName)}${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get workflow: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Argo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'submit_workflow': {
          const resourceKind = args.resourceKind as string;
          const resourceName = args.resourceName as string;

          if (!resourceKind || !resourceName) {
            return { content: [{ type: 'text', text: 'resourceKind and resourceName are required' }], isError: true };
          }

          const body: Record<string, unknown> = {
            namespace: ns,
            resourceKind,
            resourceName,
          };
          if (args.entrypoint) body.entrypoint = args.entrypoint;
          if (args.parameters) body.parameters = args.parameters;
          if (args.labels) body.labels = args.labels;

          const response = await fetch(`${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}/submit`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to submit workflow: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Argo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'terminate_workflow': {
          const workflowName = args.name as string;
          if (!workflowName) {
            return { content: [{ type: 'text', text: 'name is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}/${encodeURIComponent(workflowName)}/terminate`,
            { method: 'PUT', headers, body: JSON.stringify({}) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to terminate workflow: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Argo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'stop_workflow': {
          const workflowName = args.name as string;
          if (!workflowName) {
            return { content: [{ type: 'text', text: 'name is required' }], isError: true };
          }

          const body: Record<string, unknown> = { namespace: ns };
          if (args.message) body.message = args.message;
          if (args.nodeFieldSelector) body.nodeFieldSelector = args.nodeFieldSelector;

          const response = await fetch(
            `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}/${encodeURIComponent(workflowName)}/stop`,
            { method: 'PUT', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to stop workflow: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Argo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'retry_workflow': {
          const workflowName = args.name as string;
          if (!workflowName) {
            return { content: [{ type: 'text', text: 'name is required' }], isError: true };
          }

          const body: Record<string, unknown> = { namespace: ns };
          if (typeof args.restartSuccessful === 'boolean') body.restartSuccessful = args.restartSuccessful;
          if (args.nodeFieldSelector) body.nodeFieldSelector = args.nodeFieldSelector;

          const response = await fetch(
            `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}/${encodeURIComponent(workflowName)}/retry`,
            { method: 'PUT', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to retry workflow: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Argo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_workflow': {
          const workflowName = args.name as string;
          if (!workflowName) {
            return { content: [{ type: 'text', text: 'name is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}/${encodeURIComponent(workflowName)}`,
            { method: 'DELETE', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to delete workflow: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: `Workflow ${workflowName} deleted.` }], isError: false };
        }

        case 'get_workflow_logs': {
          const workflowName = args.name as string;
          if (!workflowName) {
            return { content: [{ type: 'text', text: 'name is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.podName) params.append('podName', args.podName as string);
          if (args.container) params.append('logOptions.container', args.container as string);
          if (args.tailLines) params.append('logOptions.tailLines', String(args.tailLines as number));
          if (args.grep) params.append('grep', args.grep as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(ns)}/${encodeURIComponent(workflowName)}/log${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get workflow logs: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          // Log endpoint returns newline-delimited JSON events; return as text
          const text = await response.text();
          return { content: [{ type: 'text', text: text }], isError: false };
        }

        case 'list_workflow_templates': {
          const params = new URLSearchParams();
          if (args.labelSelector) params.append('listOptions.labelSelector', args.labelSelector as string);

          const qs = params.toString();
          const url = `${this.baseUrl}/api/v1/workflow-templates/${encodeURIComponent(ns)}${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list workflow templates: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Argo returned non-JSON response (HTTP ${response.status})`); }
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
