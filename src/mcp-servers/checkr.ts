/**
 * Checkr MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://docs.checkr.com/mcp/ — hosted-only cloud bridge at mcp.checkr.com. This adapter serves the self-hosted API-key use case with full endpoint coverage.

import { ToolDefinition, ToolResult } from './types.js';

interface CheckrConfig {
  apiKey: string;
  baseUrl?: string;
}

export class CheckrMCPServer {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: CheckrConfig) {
    // Checkr Basic auth: API key as username, empty password
    const credentials = Buffer.from(`${config.apiKey}:`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
    this.baseUrl = config.baseUrl || 'https://api.checkr.com/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_candidate',
        description: 'Create a new candidate in Checkr to begin the background check process',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'Candidate first name',
            },
            last_name: {
              type: 'string',
              description: 'Candidate last name',
            },
            email: {
              type: 'string',
              description: 'Candidate email address',
            },
            phone: {
              type: 'string',
              description: 'Candidate phone number',
            },
            zipcode: {
              type: 'string',
              description: 'Candidate zip/postal code',
            },
            driver_license_number: {
              type: 'string',
              description: 'Candidate driver license number (required for MVR screenings)',
            },
            driver_license_state: {
              type: 'string',
              description: 'Two-letter state code for the driver license',
            },
            work_locations: {
              type: 'array',
              description: 'Array of work location objects with country, state, and city',
              items: { type: 'object' },
            },
          },
          required: ['first_name', 'last_name', 'email'],
        },
      },
      {
        name: 'get_candidate',
        description: 'Retrieve details for a specific candidate by their Checkr candidate ID',
        inputSchema: {
          type: 'object',
          properties: {
            candidate_id: {
              type: 'string',
              description: 'The Checkr candidate ID',
            },
          },
          required: ['candidate_id'],
        },
      },
      {
        name: 'list_candidates',
        description: 'List all candidates in the account with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max: 100, default: 25)',
            },
            email: {
              type: 'string',
              description: 'Filter candidates by email address',
            },
          },
        },
      },
      {
        name: 'create_report',
        description: 'Create a background check report for a candidate using a specified package',
        inputSchema: {
          type: 'object',
          properties: {
            candidate_id: {
              type: 'string',
              description: 'The Checkr candidate ID',
            },
            package: {
              type: 'string',
              description: 'The background check package slug (e.g. tasker_standard, driver_pro)',
            },
            node: {
              type: 'string',
              description: 'The node (work location) custom ID for the report',
            },
          },
          required: ['candidate_id', 'package'],
        },
      },
      {
        name: 'get_report',
        description: 'Retrieve the status and results of a specific background check report',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'The Checkr report ID',
            },
          },
          required: ['report_id'],
        },
      },
      {
        name: 'list_reports',
        description: 'List background check reports with optional filtering by candidate or status',
        inputSchema: {
          type: 'object',
          properties: {
            candidate_id: {
              type: 'string',
              description: 'Filter reports by candidate ID',
            },
            status: {
              type: 'string',
              description: 'Filter by report status: pending, complete, suspended, dispute, pre_adverse_action, post_adverse_action',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max: 100, default: 25)',
            },
          },
        },
      },
      {
        name: 'list_packages',
        description: 'List all background check packages available in the account',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'create_invitation',
        description: 'Create a candidate invitation so the candidate can submit their own information for a background check',
        inputSchema: {
          type: 'object',
          properties: {
            candidate_id: {
              type: 'string',
              description: 'The Checkr candidate ID',
            },
            package: {
              type: 'string',
              description: 'The background check package slug',
            },
          },
          required: ['candidate_id', 'package'],
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
        case 'create_candidate': {
          if (!args.first_name || !args.last_name || !args.email) {
            return {
              content: [{ type: 'text', text: 'first_name, last_name, and email are required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/candidates`, {
            method: 'POST',
            headers,
            body: JSON.stringify(args),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create candidate: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Checkr returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_candidate': {
          const candidateId = args.candidate_id as string;
          if (!candidateId) {
            return { content: [{ type: 'text', text: 'candidate_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/candidates/${encodeURIComponent(candidateId)}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get candidate: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Checkr returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_candidates': {
          const params = new URLSearchParams();
          if (args.page) params.set('page', String(args.page));
          if (args.per_page) params.set('per_page', String(args.per_page));
          if (args.email) params.set('email', args.email as string);
          const qs = params.toString();
          const url = `${this.baseUrl}/candidates${qs ? `?${qs}` : ''}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list candidates: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Checkr returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_report': {
          const candidateId = args.candidate_id as string;
          const pkg = args.package as string;
          if (!candidateId || !pkg) {
            return {
              content: [{ type: 'text', text: 'candidate_id and package are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { candidate_id: candidateId, package: pkg };
          if (args.node) body.node = args.node;

          const response = await fetch(`${this.baseUrl}/reports`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create report: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Checkr returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_report': {
          const reportId = args.report_id as string;
          if (!reportId) {
            return { content: [{ type: 'text', text: 'report_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/reports/${encodeURIComponent(reportId)}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get report: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Checkr returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_reports': {
          const params = new URLSearchParams();
          if (args.candidate_id) params.set('candidate_id', args.candidate_id as string);
          if (args.status) params.set('status', args.status as string);
          if (args.page) params.set('page', String(args.page));
          if (args.per_page) params.set('per_page', String(args.per_page));
          const qs = params.toString();
          const url = `${this.baseUrl}/reports${qs ? `?${qs}` : ''}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list reports: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Checkr returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_packages': {
          const params = new URLSearchParams();
          if (args.page) params.set('page', String(args.page));
          if (args.per_page) params.set('per_page', String(args.per_page));
          const qs = params.toString();
          const url = `${this.baseUrl}/packages${qs ? `?${qs}` : ''}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list packages: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Checkr returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_invitation': {
          const candidateId = args.candidate_id as string;
          const pkg = args.package as string;
          if (!candidateId || !pkg) {
            return {
              content: [{ type: 'text', text: 'candidate_id and package are required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/invitations`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ candidate_id: candidateId, package: pkg }),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create invitation: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Checkr returned non-JSON response (HTTP ${response.status})`); }
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
