/**
 * ZoomInfo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.zoominfo.com/mcp — hosted-only, requires OAuth 2.0 Dynamic Client Registration.
// This adapter serves the API-key / JWT use case for self-hosted and air-gapped deployments.

import { ToolDefinition, ToolResult } from './types.js';

interface ZoomInfoConfig {
  username: string;
  password: string;
  /**
   * Base URL for the ZoomInfo API.
   * Defaults to https://api.zoominfo.com
   */
  baseUrl?: string;
}

export class ZoomInfoMCPServer {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;
  private jwtToken: string | null = null;
  private jwtExpiresAt: number = 0;

  constructor(config: ZoomInfoConfig) {
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl || 'https://api.zoominfo.com';
  }

  /**
   * Authenticates against POST /authenticate and caches the JWT for up to 55 minutes.
   * ZoomInfo JWTs expire after 60 minutes; we refresh at 55 to avoid races.
   */
  private async getJwt(): Promise<string> {
    if (this.jwtToken && Date.now() < this.jwtExpiresAt) {
      return this.jwtToken;
    }

    const response = await fetch(`${this.baseUrl}/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: this.username, password: this.password }),
    });

    if (!response.ok) {
      throw new Error(`ZoomInfo authentication failed: HTTP ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ZoomInfo /authenticate returned non-JSON (HTTP ${response.status})`); }

    const jwt = (data as Record<string, unknown>).jwt as string;
    if (!jwt) throw new Error('ZoomInfo /authenticate response did not include a jwt field');

    this.jwtToken = jwt;
    this.jwtExpiresAt = Date.now() + 55 * 60 * 1000;
    return jwt;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_contacts',
        description: 'Search ZoomInfo\'s database for contacts using firmographic and demographic filters. Returns professional profiles including job title, company, location, and management level.',
        inputSchema: {
          type: 'object',
          properties: {
            matchPersonInput: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  companyName: { type: 'string' },
                  emailAddress: { type: 'string' },
                },
              },
              description: 'Array of person match criteria objects.',
            },
            jobTitle: {
              type: 'array',
              items: { type: 'string' },
              description: 'Job titles to filter by.',
            },
            managementLevel: {
              type: 'array',
              items: { type: 'string' },
              description: 'Management levels (e.g. ["C-Level", "VP", "Director"]).',
            },
            companyIndustry: {
              type: 'array',
              items: { type: 'string' },
              description: 'Industries to filter by.',
            },
            companyMinEmployees: {
              type: 'number',
              description: 'Minimum employee count at the contact\'s company.',
            },
            companyMaxEmployees: {
              type: 'number',
              description: 'Maximum employee count at the contact\'s company.',
            },
            rpp: {
              type: 'number',
              description: 'Results per page (default: 25, max: 25).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
          },
        },
      },
      {
        name: 'enrich_contact',
        description: 'Enrich a contact record by email or name+company, returning verified professional data from ZoomInfo\'s database.',
        inputSchema: {
          type: 'object',
          properties: {
            matchPersonInput: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  firstName: { type: 'string', description: 'First name.' },
                  lastName: { type: 'string', description: 'Last name.' },
                  companyName: { type: 'string', description: 'Company name.' },
                  emailAddress: { type: 'string', description: 'Work email address.' },
                },
              },
              description: 'Array of person identifiers to enrich (email or name+company).',
            },
            outputFields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific fields to include in the response (e.g. ["firstName", "lastName", "jobTitle", "email", "phone"]).',
            },
          },
          required: ['matchPersonInput'],
        },
      },
      {
        name: 'search_companies',
        description: 'Search ZoomInfo\'s database for companies using filters such as industry, location, employee count, and revenue.',
        inputSchema: {
          type: 'object',
          properties: {
            companyName: {
              type: 'string',
              description: 'Company name to search for.',
            },
            companyIndustry: {
              type: 'array',
              items: { type: 'string' },
              description: 'Industries to filter by.',
            },
            companyCountry: {
              type: 'string',
              description: 'Country for company HQ (e.g. "United States").',
            },
            companyMinEmployees: {
              type: 'number',
              description: 'Minimum employee count.',
            },
            companyMaxEmployees: {
              type: 'number',
              description: 'Maximum employee count.',
            },
            companyType: {
              type: 'string',
              description: 'Company type (e.g. "Private", "Public").',
            },
            rpp: {
              type: 'number',
              description: 'Results per page (default: 25, max: 25).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
          },
        },
      },
      {
        name: 'enrich_company',
        description: 'Enrich a company record by name or domain, returning firmographic data including employee count, revenue, industry, and technographics.',
        inputSchema: {
          type: 'object',
          properties: {
            matchCompanyInput: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  companyName: { type: 'string', description: 'Company name.' },
                  companyWebsite: { type: 'string', description: 'Company website domain (e.g. "salesforce.com").' },
                },
              },
              description: 'Array of company identifiers to enrich.',
            },
            outputFields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific fields to include in the response.',
            },
          },
          required: ['matchCompanyInput'],
        },
      },
      {
        name: 'get_intent_data',
        description: 'Retrieve buying intent signals for companies, showing which topics they are actively researching. Requires Intent data add-on.',
        inputSchema: {
          type: 'object',
          properties: {
            topics: {
              type: 'array',
              items: { type: 'string' },
              description: 'Intent topics to filter by (e.g. ["CRM Software", "Sales Automation"]).',
            },
            companyIndustry: {
              type: 'array',
              items: { type: 'string' },
              description: 'Industries to filter by.',
            },
            companyMinEmployees: {
              type: 'number',
              description: 'Minimum employee count.',
            },
            companyMaxEmployees: {
              type: 'number',
              description: 'Maximum employee count.',
            },
            rpp: {
              type: 'number',
              description: 'Results per page (default: 25).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
          },
          required: ['topics'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      let jwt: string;
      try {
        jwt = await this.getJwt();
      } catch (authError) {
        return {
          content: [{ type: 'text', text: `Authentication failed: ${authError instanceof Error ? authError.message : String(authError)}` }],
          isError: true,
        };
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'search_contacts': {
          const body: Record<string, unknown> = {};
          if (args.matchPersonInput) body.matchPersonInput = args.matchPersonInput;
          if (args.jobTitle) body.jobTitle = args.jobTitle;
          if (args.managementLevel) body.managementLevel = args.managementLevel;
          if (args.companyIndustry) body.companyIndustry = args.companyIndustry;
          if (args.companyMinEmployees) body.companyMinEmployees = args.companyMinEmployees;
          if (args.companyMaxEmployees) body.companyMaxEmployees = args.companyMaxEmployees;
          if (args.rpp) body.rpp = args.rpp;
          if (args.page) body.page = args.page;

          const response = await fetch(`${this.baseUrl}/search/contact`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search contacts: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ZoomInfo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'enrich_contact': {
          if (!args.matchPersonInput) {
            return {
              content: [{ type: 'text', text: 'matchPersonInput is required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { matchPersonInput: args.matchPersonInput };
          if (args.outputFields) body.outputFields = args.outputFields;

          const response = await fetch(`${this.baseUrl}/enrich/contact`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to enrich contact: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ZoomInfo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_companies': {
          const body: Record<string, unknown> = {};
          if (args.companyName) body.companyName = args.companyName;
          if (args.companyIndustry) body.companyIndustry = args.companyIndustry;
          if (args.companyCountry) body.companyCountry = args.companyCountry;
          if (args.companyMinEmployees) body.companyMinEmployees = args.companyMinEmployees;
          if (args.companyMaxEmployees) body.companyMaxEmployees = args.companyMaxEmployees;
          if (args.companyType) body.companyType = args.companyType;
          if (args.rpp) body.rpp = args.rpp;
          if (args.page) body.page = args.page;

          const response = await fetch(`${this.baseUrl}/search/company`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search companies: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ZoomInfo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'enrich_company': {
          if (!args.matchCompanyInput) {
            return {
              content: [{ type: 'text', text: 'matchCompanyInput is required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { matchCompanyInput: args.matchCompanyInput };
          if (args.outputFields) body.outputFields = args.outputFields;

          const response = await fetch(`${this.baseUrl}/enrich/company`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to enrich company: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ZoomInfo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_intent_data': {
          if (!args.topics || (args.topics as string[]).length === 0) {
            return {
              content: [{ type: 'text', text: 'topics is required and must be a non-empty array' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { topics: args.topics };
          if (args.companyIndustry) body.companyIndustry = args.companyIndustry;
          if (args.companyMinEmployees) body.companyMinEmployees = args.companyMinEmployees;
          if (args.companyMaxEmployees) body.companyMaxEmployees = args.companyMaxEmployees;
          if (args.rpp) body.rpp = args.rpp;
          if (args.page) body.page = args.page;

          const response = await fetch(`${this.baseUrl}/search/intent`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get intent data: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ZoomInfo returned non-JSON response (HTTP ${response.status})`); }
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
