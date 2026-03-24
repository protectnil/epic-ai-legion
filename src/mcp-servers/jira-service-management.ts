/**
 * Jira Service Management MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/atlassian/atlassian-mcp-server — hosted-only, requires OAuth2
// and an Atlassian Cloud account. This adapter serves the API-token / Basic-auth self-hosted use
// case, which the official server does not support.

import { ToolDefinition, ToolResult } from './types.js';

interface JiraServiceManagementConfig {
  /** Atlassian account email address */
  email: string;
  /** Atlassian API token (generate at https://id.atlassian.com/manage-profile/security/api-tokens) */
  apiToken: string;
  /** Your Atlassian Cloud domain, e.g. "mycompany.atlassian.net" */
  domain: string;
}

export class JiraServiceManagementMCPServer {
  private readonly email: string;
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: JiraServiceManagementConfig) {
    this.email = config.email;
    this.apiToken = config.apiToken;
    this.baseUrl = `https://${config.domain}`;
  }

  private get authHeader(): string {
    const encoded = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
    return `Basic ${encoded}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_service_desks',
        description: 'List all service desk projects accessible with the current credentials',
        inputSchema: {
          type: 'object',
          properties: {
            start: {
              type: 'number',
              description: 'Index of the first item to return (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of items to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'list_request_types',
        description: 'List all request types available in a specific service desk',
        inputSchema: {
          type: 'object',
          properties: {
            serviceDeskId: {
              type: 'string',
              description: 'The ID of the service desk (required)',
            },
            start: {
              type: 'number',
              description: 'Index of the first item to return (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of items to return (default: 50)',
            },
          },
          required: ['serviceDeskId'],
        },
      },
      {
        name: 'create_request',
        description: 'Create a new customer request (ticket) in a Jira Service Management service desk',
        inputSchema: {
          type: 'object',
          properties: {
            serviceDeskId: {
              type: 'string',
              description: 'The ID of the service desk to create the request in (required)',
            },
            requestTypeId: {
              type: 'string',
              description: 'The ID of the request type (required)',
            },
            summary: {
              type: 'string',
              description: 'Brief summary of the request (required)',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the request',
            },
            raiseOnBehalfOf: {
              type: 'string',
              description: 'Email address of the customer on whose behalf to raise the request',
            },
          },
          required: ['serviceDeskId', 'requestTypeId', 'summary'],
        },
      },
      {
        name: 'get_request',
        description: 'Get details of a specific customer request by its issue ID or key',
        inputSchema: {
          type: 'object',
          properties: {
            issueIdOrKey: {
              type: 'string',
              description: 'Issue ID or key of the request (e.g. IT-123)',
            },
          },
          required: ['issueIdOrKey'],
        },
      },
      {
        name: 'list_requests',
        description: 'List customer requests with optional filtering by service desk, status, or search term',
        inputSchema: {
          type: 'object',
          properties: {
            serviceDeskId: {
              type: 'string',
              description: 'Filter by service desk ID',
            },
            requestStatus: {
              type: 'string',
              description: 'Filter by status category: OPEN_REQUESTS, CLOSED_REQUESTS, or ALL_REQUESTS (default: ALL_REQUESTS)',
            },
            searchTerm: {
              type: 'string',
              description: 'Text to filter requests by summary',
            },
            start: {
              type: 'number',
              description: 'Index of the first item to return (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of items to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'add_comment',
        description: 'Add a comment to an existing customer request',
        inputSchema: {
          type: 'object',
          properties: {
            issueIdOrKey: {
              type: 'string',
              description: 'Issue ID or key of the request (required)',
            },
            body: {
              type: 'string',
              description: 'Comment text (required)',
            },
            public: {
              type: 'boolean',
              description: 'Whether the comment is visible to the customer (default: true)',
            },
          },
          required: ['issueIdOrKey', 'body'],
        },
      },
      {
        name: 'get_request_sla',
        description: 'Retrieve SLA information for a specific customer request',
        inputSchema: {
          type: 'object',
          properties: {
            issueIdOrKey: {
              type: 'string',
              description: 'Issue ID or key of the request (required)',
            },
          },
          required: ['issueIdOrKey'],
        },
      },
      {
        name: 'list_queues',
        description: 'List all queues for a service desk',
        inputSchema: {
          type: 'object',
          properties: {
            serviceDeskId: {
              type: 'string',
              description: 'The ID of the service desk (required)',
            },
            includeCount: {
              type: 'boolean',
              description: 'Include issue count for each queue (default: false)',
            },
            start: {
              type: 'number',
              description: 'Index of the first item to return (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of items to return (default: 50)',
            },
          },
          required: ['serviceDeskId'],
        },
      },
      {
        name: 'get_queue_issues',
        description: 'Retrieve issues from a specific queue in a service desk',
        inputSchema: {
          type: 'object',
          properties: {
            serviceDeskId: {
              type: 'string',
              description: 'The ID of the service desk (required)',
            },
            queueId: {
              type: 'string',
              description: 'The ID of the queue (required)',
            },
            start: {
              type: 'number',
              description: 'Index of the first item to return (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of items to return (default: 50)',
            },
          },
          required: ['serviceDeskId', 'queueId'],
        },
      },
      {
        name: 'transition_request',
        description: 'Transition a customer request to a new workflow status',
        inputSchema: {
          type: 'object',
          properties: {
            issueIdOrKey: {
              type: 'string',
              description: 'Issue ID or key of the request (required)',
            },
            transitionId: {
              type: 'string',
              description: 'The ID of the transition to apply (required). Use get_request to see available transitions.',
            },
            comment: {
              type: 'string',
              description: 'Optional comment to attach to the transition',
            },
          },
          required: ['issueIdOrKey', 'transitionId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_service_desks': {
          const params = new URLSearchParams();
          if (args.start !== undefined) params.set('start', String(args.start));
          if (args.limit !== undefined) params.set('limit', String(args.limit));

          const qs = params.toString();
          const url = `${this.baseUrl}/rest/servicedeskapi/servicedesk${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list service desks: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JSM returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_request_types': {
          const serviceDeskId = args.serviceDeskId as string;
          if (!serviceDeskId) {
            return { content: [{ type: 'text', text: 'serviceDeskId is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (args.start !== undefined) params.set('start', String(args.start));
          if (args.limit !== undefined) params.set('limit', String(args.limit));

          const qs = params.toString();
          const url = `${this.baseUrl}/rest/servicedeskapi/servicedesk/${encodeURIComponent(serviceDeskId)}/requesttype${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list request types: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JSM returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_request': {
          const serviceDeskId = args.serviceDeskId as string;
          const requestTypeId = args.requestTypeId as string;
          const summary = args.summary as string;

          if (!serviceDeskId || !requestTypeId || !summary) {
            return {
              content: [{ type: 'text', text: 'serviceDeskId, requestTypeId, and summary are required' }],
              isError: true,
            };
          }

          const requestFieldValues: Record<string, string> = { summary };
          if (args.description) requestFieldValues.description = args.description as string;

          const body: Record<string, unknown> = {
            serviceDeskId,
            requestTypeId,
            requestFieldValues,
          };
          if (args.raiseOnBehalfOf) body.raiseOnBehalfOf = args.raiseOnBehalfOf;

          const response = await fetch(`${this.baseUrl}/rest/servicedeskapi/request`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create request: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JSM returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_request': {
          const issueIdOrKey = args.issueIdOrKey as string;
          if (!issueIdOrKey) {
            return { content: [{ type: 'text', text: 'issueIdOrKey is required' }], isError: true };
          }

          const url = `${this.baseUrl}/rest/servicedeskapi/request/${encodeURIComponent(issueIdOrKey)}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get request: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JSM returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_requests': {
          const params = new URLSearchParams();
          if (args.serviceDeskId) params.set('serviceDeskId', args.serviceDeskId as string);
          if (args.requestStatus) params.set('requestStatus', args.requestStatus as string);
          if (args.searchTerm) params.set('searchTerm', args.searchTerm as string);
          if (args.start !== undefined) params.set('start', String(args.start));
          if (args.limit !== undefined) params.set('limit', String(args.limit));

          const qs = params.toString();
          const url = `${this.baseUrl}/rest/servicedeskapi/request${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list requests: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JSM returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'add_comment': {
          const issueIdOrKey = args.issueIdOrKey as string;
          const body_text = args.body as string;

          if (!issueIdOrKey || !body_text) {
            return {
              content: [{ type: 'text', text: 'issueIdOrKey and body are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { body: body_text };
          if (typeof args.public === 'boolean') body.public = args.public;

          const url = `${this.baseUrl}/rest/servicedeskapi/request/${encodeURIComponent(issueIdOrKey)}/comment`;
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to add comment: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JSM returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_request_sla': {
          const issueIdOrKey = args.issueIdOrKey as string;
          if (!issueIdOrKey) {
            return { content: [{ type: 'text', text: 'issueIdOrKey is required' }], isError: true };
          }

          const url = `${this.baseUrl}/rest/servicedeskapi/request/${encodeURIComponent(issueIdOrKey)}/sla`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get SLA info: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JSM returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_queues': {
          const serviceDeskId = args.serviceDeskId as string;
          if (!serviceDeskId) {
            return { content: [{ type: 'text', text: 'serviceDeskId is required' }], isError: true };
          }

          const params = new URLSearchParams();
          if (typeof args.includeCount === 'boolean') params.set('includeCount', String(args.includeCount));
          if (args.start !== undefined) params.set('start', String(args.start));
          if (args.limit !== undefined) params.set('limit', String(args.limit));

          const qs = params.toString();
          const url = `${this.baseUrl}/rest/servicedeskapi/servicedesk/${encodeURIComponent(serviceDeskId)}/queue${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list queues: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JSM returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_queue_issues': {
          const serviceDeskId = args.serviceDeskId as string;
          const queueId = args.queueId as string;

          if (!serviceDeskId || !queueId) {
            return {
              content: [{ type: 'text', text: 'serviceDeskId and queueId are required' }],
              isError: true,
            };
          }

          const params = new URLSearchParams();
          if (args.start !== undefined) params.set('start', String(args.start));
          if (args.limit !== undefined) params.set('limit', String(args.limit));

          const qs = params.toString();
          const url = `${this.baseUrl}/rest/servicedeskapi/servicedesk/${encodeURIComponent(serviceDeskId)}/queue/${encodeURIComponent(queueId)}/issue${qs ? '?' + qs : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get queue issues: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`JSM returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'transition_request': {
          const issueIdOrKey = args.issueIdOrKey as string;
          const transitionId = args.transitionId as string;

          if (!issueIdOrKey || !transitionId) {
            return {
              content: [{ type: 'text', text: 'issueIdOrKey and transitionId are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            transition: { id: transitionId },
          };
          if (args.comment) {
            body.update = {
              comment: [{ add: { body: args.comment } }],
            };
          }

          const url = `${this.baseUrl}/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}/transitions`;
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to transition request: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: 'Transition applied successfully' }], isError: false };
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
