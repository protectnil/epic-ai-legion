/**
 * LexisNexis MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no official LexisNexis MCP server exists on GitHub as of March 2026.

import { ToolDefinition, ToolResult } from './types.js';

interface LexisNexisConfig {
  /** OAuth2 Bearer access token */
  accessToken: string;
  /**
   * Enterprise base URL — configurable per deployment.
   * LexisNexis API access is credentialed; the exact base URL is provided
   * during onboarding via the LexisNexis Developer Portal (dev.lexisnexis.com).
   * Example: https://api.lexisnexis.com
   */
  baseUrl: string;
}

export class LexisNexisMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: LexisNexisConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_cases',
        description: 'Search LexisNexis legal case law by keyword or citation',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string — supports natural language and Boolean operators (AND, OR, NOT)',
            },
            jurisdiction: {
              type: 'string',
              description: 'Jurisdiction filter, e.g. "US Federal" or "California" (optional)',
            },
            dateFrom: {
              type: 'string',
              description: 'Earliest decision date in YYYY-MM-DD format (optional)',
            },
            dateTo: {
              type: 'string',
              description: 'Latest decision date in YYYY-MM-DD format (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_case',
        description: 'Retrieve the full text and metadata for a specific legal case by its LexisNexis document ID',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: 'LexisNexis document identifier for the case',
            },
          },
          required: ['documentId'],
        },
      },
      {
        name: 'search_statutes',
        description: 'Search statutes, codes, and regulations in the LexisNexis database',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for statute or code text',
            },
            jurisdiction: {
              type: 'string',
              description: 'Jurisdiction, e.g. "US Federal", "Texas", "New York" (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_news',
        description: 'Search news articles and press releases in the LexisNexis news database',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for news content',
            },
            dateFrom: {
              type: 'string',
              description: 'Earliest publication date in YYYY-MM-DD format (optional)',
            },
            dateTo: {
              type: 'string',
              description: 'Latest publication date in YYYY-MM-DD format (optional)',
            },
            sources: {
              type: 'string',
              description: 'Comma-separated list of source names to filter by (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_company',
        description: 'Search LexisNexis company profiles and business intelligence data',
        inputSchema: {
          type: 'object',
          properties: {
            companyName: {
              type: 'string',
              description: 'Name of the company to search for',
            },
            country: {
              type: 'string',
              description: 'Country of incorporation or headquarters (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
          required: ['companyName'],
        },
      },
      {
        name: 'get_shepards_report',
        description: "Retrieve a Shepard's Citations report for a case — shows subsequent history, citing decisions, and validity signals",
        inputSchema: {
          type: 'object',
          properties: {
            citation: {
              type: 'string',
              description: 'Legal citation to Shepardize, e.g. "410 U.S. 113"',
            },
          },
          required: ['citation'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'search_cases': {
          const query = args.query as string;

          if (!query) {
            return {
              content: [{ type: 'text', text: 'query is required' }],
              isError: true,
            };
          }

          const page = (args.page as number) || 1;
          const pageSize = (args.pageSize as number) || 25;

          const body: Record<string, unknown> = { query, page, pageSize };
          if (args.jurisdiction) body.jurisdiction = args.jurisdiction;
          if (args.dateFrom) body.dateFrom = args.dateFrom;
          if (args.dateTo) body.dateTo = args.dateTo;

          const response = await fetch(`${this.baseUrl}/v1/cases/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search cases: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`LexisNexis returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_case': {
          const documentId = args.documentId as string;

          if (!documentId) {
            return {
              content: [{ type: 'text', text: 'documentId is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/v1/cases/${encodeURIComponent(documentId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get case: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`LexisNexis returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_statutes': {
          const query = args.query as string;

          if (!query) {
            return {
              content: [{ type: 'text', text: 'query is required' }],
              isError: true,
            };
          }

          const page = (args.page as number) || 1;
          const pageSize = (args.pageSize as number) || 25;

          const body: Record<string, unknown> = { query, page, pageSize };
          if (args.jurisdiction) body.jurisdiction = args.jurisdiction;

          const response = await fetch(`${this.baseUrl}/v1/statutes/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search statutes: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`LexisNexis returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_news': {
          const query = args.query as string;

          if (!query) {
            return {
              content: [{ type: 'text', text: 'query is required' }],
              isError: true,
            };
          }

          const page = (args.page as number) || 1;
          const pageSize = (args.pageSize as number) || 25;

          const body: Record<string, unknown> = { query, page, pageSize };
          if (args.dateFrom) body.dateFrom = args.dateFrom;
          if (args.dateTo) body.dateTo = args.dateTo;
          if (args.sources) body.sources = args.sources;

          const response = await fetch(`${this.baseUrl}/v1/news/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search news: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`LexisNexis returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_company': {
          const companyName = args.companyName as string;

          if (!companyName) {
            return {
              content: [{ type: 'text', text: 'companyName is required' }],
              isError: true,
            };
          }

          const page = (args.page as number) || 1;
          const pageSize = (args.pageSize as number) || 25;

          const body: Record<string, unknown> = { companyName, page, pageSize };
          if (args.country) body.country = args.country;

          const response = await fetch(`${this.baseUrl}/v1/companies/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search companies: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`LexisNexis returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_shepards_report': {
          const citation = args.citation as string;

          if (!citation) {
            return {
              content: [{ type: 'text', text: 'citation is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/v1/shepards?citation=${encodeURIComponent(citation)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get Shepard's report: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`LexisNexis returned non-JSON response (HTTP ${response.status})`); }
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
