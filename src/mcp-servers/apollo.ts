/**
 * Apollo.io MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — multiple community repos exist (Chainscore/apollo-io-mcp with 27 tools, edwardchoh/apollo-io-mcp-server, thevgergroup/apollo-io-mcp) but none are officially maintained by Apollo.io.

import { ToolDefinition, ToolResult } from './types.js';

interface ApolloConfig {
  apiKey: string;
  baseUrl?: string;
}

export class ApolloMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ApolloConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.apollo.io/api/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_people',
        description: 'Search Apollo\'s database for people matching demographic filters such as job title, location, seniority, and company. Does not consume credits and does not return emails or phone numbers — use enrich_person for enriched contact data.',
        inputSchema: {
          type: 'object',
          properties: {
            person_titles: {
              type: 'array',
              items: { type: 'string' },
              description: 'Job titles to filter by (e.g. ["VP of Sales", "Account Executive"]).',
            },
            person_locations: {
              type: 'array',
              items: { type: 'string' },
              description: 'Locations to filter by (e.g. ["New York, NY", "San Francisco, CA"]).',
            },
            organization_domains: {
              type: 'array',
              items: { type: 'string' },
              description: 'Company domains to filter by (e.g. ["salesforce.com", "hubspot.com"]).',
            },
            organization_num_employees_ranges: {
              type: 'array',
              items: { type: 'string' },
              description: 'Employee count ranges (e.g. ["1,10", "11,50", "51,200"]).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1, max: 500 pages of 100 records).',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100).',
            },
          },
        },
      },
      {
        name: 'enrich_person',
        description: 'Enrich a single person record by email or name+domain, returning verified contact data including work email, phone number, title, and company details. Consumes credits.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Work email address of the person to enrich.',
            },
            first_name: {
              type: 'string',
              description: 'First name (use with last_name and organization_name when email is unavailable).',
            },
            last_name: {
              type: 'string',
              description: 'Last name.',
            },
            organization_name: {
              type: 'string',
              description: 'Company name (use with first_name and last_name when email is unavailable).',
            },
            domain: {
              type: 'string',
              description: 'Company domain (e.g. "salesforce.com").',
            },
            reveal_personal_emails: {
              type: 'boolean',
              description: 'Whether to return personal email addresses (default: false).',
            },
            reveal_phone_number: {
              type: 'boolean',
              description: 'Whether to return phone numbers (default: false).',
            },
          },
        },
      },
      {
        name: 'enrich_organization',
        description: 'Enrich a company record by domain, returning firmographic data including employee count, revenue, industry, technologies, and funding.',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Company domain to enrich (e.g. "salesforce.com").',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'search_organizations',
        description: 'Search Apollo\'s database for companies matching filters such as industry, employee count, location, and revenue range.',
        inputSchema: {
          type: 'object',
          properties: {
            organization_locations: {
              type: 'array',
              items: { type: 'string' },
              description: 'Company HQ locations to filter by.',
            },
            organization_num_employees_ranges: {
              type: 'array',
              items: { type: 'string' },
              description: 'Employee count ranges (e.g. ["1,10", "51,200"]).',
            },
            organization_industries: {
              type: 'array',
              items: { type: 'string' },
              description: 'Industries to filter by (e.g. ["Software", "Financial Services"]).',
            },
            q_organization_keyword_tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Keyword tags associated with the company.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100).',
            },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Retrieve a saved account (company) record from your Apollo CRM by its Apollo account ID.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Apollo account ID to retrieve.',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_sequences',
        description: 'List email sequences in your Apollo account, including name, status, and step counts.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100).',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      };

      switch (name) {
        case 'search_people': {
          const body: Record<string, unknown> = {};
          if (args.person_titles) body.person_titles = args.person_titles;
          if (args.person_locations) body.person_locations = args.person_locations;
          if (args.organization_domains) body.organization_domains = args.organization_domains;
          if (args.organization_num_employees_ranges) body.organization_num_employees_ranges = args.organization_num_employees_ranges;
          if (args.page) body.page = args.page;
          if (args.per_page) body.per_page = args.per_page;

          const response = await fetch(`${this.baseUrl}/mixed_people/api_search`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search people: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Apollo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'enrich_person': {
          const body: Record<string, unknown> = {};
          if (args.email) body.email = args.email;
          if (args.first_name) body.first_name = args.first_name;
          if (args.last_name) body.last_name = args.last_name;
          if (args.organization_name) body.organization_name = args.organization_name;
          if (args.domain) body.domain = args.domain;
          if (typeof args.reveal_personal_emails === 'boolean') body.reveal_personal_emails = args.reveal_personal_emails;
          if (typeof args.reveal_phone_number === 'boolean') body.reveal_phone_number = args.reveal_phone_number;

          if (!body.email && !(body.first_name && body.last_name)) {
            return {
              content: [{ type: 'text', text: 'Either email or first_name + last_name is required to enrich a person' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/people/match`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to enrich person: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Apollo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'enrich_organization': {
          const domain = args.domain as string;

          if (!domain) {
            return {
              content: [{ type: 'text', text: 'domain is required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/organizations/enrich?domain=${encodeURIComponent(domain)}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to enrich organization: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Apollo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_organizations': {
          const body: Record<string, unknown> = {};
          if (args.organization_locations) body.organization_locations = args.organization_locations;
          if (args.organization_num_employees_ranges) body.organization_num_employees_ranges = args.organization_num_employees_ranges;
          if (args.organization_industries) body.organization_industries = args.organization_industries;
          if (args.q_organization_keyword_tags) body.q_organization_keyword_tags = args.q_organization_keyword_tags;
          if (args.page) body.page = args.page;
          if (args.per_page) body.per_page = args.per_page;

          const response = await fetch(`${this.baseUrl}/mixed_companies/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search organizations: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Apollo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_account': {
          const accountId = args.account_id as string;

          if (!accountId) {
            return {
              content: [{ type: 'text', text: 'account_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/accounts/${encodeURIComponent(accountId)}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get account: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Apollo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_sequences': {
          let url = `${this.baseUrl}/emailer_campaigns`;
          const params: string[] = [];
          if (args.page) params.push(`page=${args.page}`);
          if (args.per_page) params.push(`per_page=${args.per_page}`);
          if (params.length) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list sequences: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Apollo returned non-JSON response (HTTP ${response.status})`); }
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
