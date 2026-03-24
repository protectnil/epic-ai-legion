/**
 * Jenkins MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/jenkinsci/mcp-server-plugin — official Jenkins plugin, requires plugin install on the Jenkins controller.
// This adapter is a lightweight self-hosted fallback using the Jenkins REST API with username + API token auth (no CSRF crumb required per Jenkins 2.107+).

import { ToolDefinition, ToolResult } from './types.js';

interface JenkinsConfig {
  baseUrl: string;
  username: string;
  apiToken: string;
}

export class JenkinsMCPServer {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: JenkinsConfig) {
    // baseUrl: Jenkins root URL, e.g. https://jenkins.example.com (no trailing slash)
    // Auth: username + API token — CSRF crumb is NOT required when using API tokens (Jenkins 2.107+ LTS).
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.apiToken}`).toString('base64')}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_jobs',
        description: 'List all jobs (pipelines) on the Jenkins controller',
        inputSchema: {
          type: 'object',
          properties: {
            folderPath: {
              type: 'string',
              description: 'Optional folder path to list jobs within, e.g. MyFolder or MyFolder/SubFolder. Omit for root-level jobs.',
            },
          },
        },
      },
      {
        name: 'get_job_info',
        description: 'Get configuration and recent build history for a Jenkins job',
        inputSchema: {
          type: 'object',
          properties: {
            jobName: {
              type: 'string',
              description: 'Job name. For jobs inside folders use slash-separated path, e.g. MyFolder/MyJob',
            },
          },
          required: ['jobName'],
        },
      },
      {
        name: 'get_build_info',
        description: 'Get details for a specific build of a job',
        inputSchema: {
          type: 'object',
          properties: {
            jobName: {
              type: 'string',
              description: 'Job name (slash-separated path for folder jobs)',
            },
            buildNumber: {
              type: 'number',
              description: 'Build number. Use 0 to get the last completed build (resolved via lastBuild).',
            },
          },
          required: ['jobName', 'buildNumber'],
        },
      },
      {
        name: 'get_build_log',
        description: 'Retrieve the console log output for a specific build',
        inputSchema: {
          type: 'object',
          properties: {
            jobName: {
              type: 'string',
              description: 'Job name (slash-separated path for folder jobs)',
            },
            buildNumber: {
              type: 'number',
              description: 'Build number to retrieve the log for',
            },
          },
          required: ['jobName', 'buildNumber'],
        },
      },
      {
        name: 'trigger_build',
        description: 'Trigger a new build for a job. Optionally pass build parameters.',
        inputSchema: {
          type: 'object',
          properties: {
            jobName: {
              type: 'string',
              description: 'Job name (slash-separated path for folder jobs)',
            },
            parameters: {
              type: 'object',
              description: 'Key-value pairs of build parameters for parameterized builds',
            },
          },
          required: ['jobName'],
        },
      },
      {
        name: 'get_queue',
        description: 'Get the current Jenkins build queue',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_nodes',
        description: 'List all Jenkins nodes (agents / computers)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_last_build_status',
        description: 'Get the result and status of the most recent build for a job',
        inputSchema: {
          type: 'object',
          properties: {
            jobName: {
              type: 'string',
              description: 'Job name (slash-separated path for folder jobs)',
            },
          },
          required: ['jobName'],
        },
      },
    ];
  }

  private jobPath(jobName: string): string {
    // Convert slash-separated folder path to /job/A/job/B/job/C URL format
    return jobName
      .split('/')
      .map((segment) => `job/${encodeURIComponent(segment)}`)
      .join('/');
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_jobs': {
          let url: string;
          if (args.folderPath) {
            url = `${this.baseUrl}/${this.jobPath(args.folderPath as string)}/api/json`;
          } else {
            url = `${this.baseUrl}/api/json`;
          }

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list jobs: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Jenkins returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_job_info': {
          const jobName = args.jobName as string;
          if (!jobName) {
            return { content: [{ type: 'text', text: 'jobName is required' }], isError: true };
          }

          const url = `${this.baseUrl}/${this.jobPath(jobName)}/api/json`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get job info: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Jenkins returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_build_info': {
          const jobName = args.jobName as string;
          const buildNumber = args.buildNumber as number;
          if (!jobName || buildNumber === undefined) {
            return { content: [{ type: 'text', text: 'jobName and buildNumber are required' }], isError: true };
          }

          const url = `${this.baseUrl}/${this.jobPath(jobName)}/${buildNumber}/api/json`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get build info: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Jenkins returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_build_log': {
          const jobName = args.jobName as string;
          const buildNumber = args.buildNumber as number;
          if (!jobName || buildNumber === undefined) {
            return { content: [{ type: 'text', text: 'jobName and buildNumber are required' }], isError: true };
          }

          const url = `${this.baseUrl}/${this.jobPath(jobName)}/${buildNumber}/consoleText`;
          const response = await fetch(url, {
            method: 'GET',
            headers: { Authorization: this.authHeader },
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get build log: ${response.status} ${response.statusText}` }], isError: true };
          }
          const text = await response.text();
          return { content: [{ type: 'text', text }], isError: false };
        }

        case 'trigger_build': {
          const jobName = args.jobName as string;
          if (!jobName) {
            return { content: [{ type: 'text', text: 'jobName is required' }], isError: true };
          }

          const parameters = args.parameters as Record<string, string> | undefined;
          let url: string;
          let body: string | undefined;

          if (parameters && Object.keys(parameters).length > 0) {
            url = `${this.baseUrl}/${this.jobPath(jobName)}/buildWithParameters`;
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(parameters)) {
              params.append(key, String(value));
            }
            body = params.toString();
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
          } else {
            url = `${this.baseUrl}/${this.jobPath(jobName)}/build`;
          }

          const response = await fetch(url, {
            method: 'POST',
            headers,
            body,
          });

          // Jenkins returns 201 Created on successful queue
          if (response.status !== 201 && !response.ok) {
            return { content: [{ type: 'text', text: `Failed to trigger build: ${response.status} ${response.statusText}` }], isError: true };
          }

          const location = response.headers.get('Location');
          return {
            content: [{ type: 'text', text: `Build queued successfully${location ? `. Queue item: ${location}` : ''}` }],
            isError: false,
          };
        }

        case 'get_queue': {
          const url = `${this.baseUrl}/queue/api/json`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get queue: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Jenkins returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_nodes': {
          const url = `${this.baseUrl}/computer/api/json`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list nodes: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Jenkins returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_last_build_status': {
          const jobName = args.jobName as string;
          if (!jobName) {
            return { content: [{ type: 'text', text: 'jobName is required' }], isError: true };
          }

          const url = `${this.baseUrl}/${this.jobPath(jobName)}/lastBuild/api/json`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get last build status: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Jenkins returned non-JSON response (HTTP ${response.status})`); }
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
