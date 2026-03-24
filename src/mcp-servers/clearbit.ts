/**
 * Clearbit (HubSpot Breeze Intelligence) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Clearbit or HubSpot Breeze Intelligence MCP server was found on GitHub or npm as of March 2026.
// HubSpot has an MCP server (https://github.com/HubSpot/mcp-server-hubspot) but it targets CRM operations, not enrichment.
//
// Note: Clearbit was acquired by HubSpot in December 2024 and is now branded as Breeze Intelligence.
// The legacy Clearbit REST API remains operational for existing customers; HubSpot-native enrichment
// uses Breeze Intelligence credits within the HubSpot platform and does not expose a standalone REST API.
// This adapter wraps the legacy Clearbit API, which remains the only available REST enrichment surface.
//
// Base URLs:
//   Person enrichment:  https://person.clearbit.com/v1
//   Company enrichment: https://company.clearbit.com/v1
//   Combined lookup:    https://person.clearbit.com/v2
//   Prospector:         https://prospector.clearbit.com/v1
//   Reveal (IP):        https://reveal.clearbit.com/v1
// Auth: HTTP Basic Auth — API key as username, empty password (Authorization: Basic base64(apiKey:))
// Docs: https://clearbit.com/docs
// Rate limits: Not publicly documented per-plan; 429 on breach; streaming endpoint available for async lookups

import { ToolDefinition, ToolResult } from './types.js';

interface ClearbitConfig {
  apiKey: string;
  personBaseUrl?: string;
  companyBaseUrl?: string;
  prospectorBaseUrl?: string;
  revealBaseUrl?: string;
}

export class ClearbitMCPServer {
  private readonly apiKey: string;
  private readonly personBaseUrl: string;
  private readonly companyBaseUrl: string;
  private readonly prospectorBaseUrl: string;
  private readonly revealBaseUrl: string;

  constructor(config: ClearbitConfig) {
    this.apiKey = config.apiKey;
    this.personBaseUrl = config.personBaseUrl || 'https://person.clearbit.com';
    this.companyBaseUrl = config.companyBaseUrl || 'https://company.clearbit.com';
    this.prospectorBaseUrl = config.prospectorBaseUrl || 'https://prospector.clearbit.com';
    this.revealBaseUrl = config.revealBaseUrl || 'https://reveal.clearbit.com';
  }

  static catalog() {
    return {
      name: 'clearbit',
      displayName: 'Clearbit / HubSpot Breeze Intelligence',
      version: '1.0.0',
      category: 'crm',
      keywords: [
        'clearbit', 'breeze intelligence', 'hubspot', 'enrichment', 'b2b', 'data enrichment',
        'person lookup', 'company lookup', 'firmographic', 'demographic', 'technographic',
        'reveal', 'ip enrichment', 'prospector', 'lead enrichment', 'contact enrichment',
        'domain lookup', 'email lookup', 'intent data',
      ],
      toolNames: [
        'enrich_person', 'enrich_company', 'enrich_combined',
        'find_person_stream', 'lookup_company_by_domain',
        'reveal_company_by_ip', 'search_prospector',
        'lookup_person_by_email', 'find_company_logo',
        'lookup_name_to_domain',
      ],
      description: 'Clearbit/HubSpot Breeze Intelligence B2B data enrichment: look up person and company firmographic data by email or domain, reveal site visitors by IP, and prospect for contacts.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'enrich_person',
        description: 'Enrich a person record by email address returning name, title, company, social profiles, and demographics',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address to enrich (e.g. alex@example.com)',
            },
            webhook_url: {
              type: 'string',
              description: 'Optional webhook URL to receive enrichment data asynchronously if a 202 is returned',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'enrich_company',
        description: 'Enrich a company record by domain returning company name, industry, employee count, funding, and tech stack',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Company domain to enrich (e.g. stripe.com)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'enrich_combined',
        description: 'Enrich both person and company data in one call using an email address — returns person plus company record',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address for combined person + company enrichment',
            },
            webhook_url: {
              type: 'string',
              description: 'Optional webhook URL for async response if 202 is returned',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'find_person_stream',
        description: 'Look up a person by email using the streaming endpoint — holds connection open up to 60s instead of returning 202',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address to stream-enrich (e.g. alex@example.com)',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'lookup_company_by_domain',
        description: 'Look up a company by domain to retrieve firmographic, technographic, and funding information',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Company website domain (e.g. salesforce.com)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'reveal_company_by_ip',
        description: 'Identify the company behind an IP address using Clearbit Reveal — useful for de-anonymizing website visitors',
        inputSchema: {
          type: 'object',
          properties: {
            ip: {
              type: 'string',
              description: 'IPv4 address to identify (e.g. 8.8.8.8)',
            },
          },
          required: ['ip'],
        },
      },
      {
        name: 'search_prospector',
        description: 'Search for person contacts at companies using filters for domain, title, seniority, and department',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Company domain to search contacts at (e.g. stripe.com)',
            },
            title: {
              type: 'string',
              description: 'Job title keyword to filter by (e.g. "VP of Engineering")',
            },
            role: {
              type: 'string',
              description: 'Job role category: ceo, cto, cfo, vp, director, manager, engineer, sales, marketing, finance',
            },
            seniority: {
              type: 'string',
              description: 'Seniority level: executive, director, manager, senior, mid, junior',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Results per page (default: 5, max: 50)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'lookup_person_by_email',
        description: 'Look up a person record directly by email returning social profiles, bio, location, and employment',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address to look up',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'find_company_logo',
        description: 'Retrieve the logo image URL for a company by its domain using the Clearbit Logo API',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Company domain (e.g. google.com)',
            },
            size: {
              type: 'number',
              description: 'Logo size in pixels (default: 128, options: 32, 64, 128, 256)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'lookup_name_to_domain',
        description: 'Convert a company name to its primary web domain using Clearbit NameToDomain API',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Company name to resolve to a domain (e.g. "Apple")',
            },
          },
          required: ['name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'enrich_person':
          return this.enrichPerson(args);
        case 'enrich_company':
          return this.enrichCompany(args);
        case 'enrich_combined':
          return this.enrichCombined(args);
        case 'find_person_stream':
          return this.findPersonStream(args);
        case 'lookup_company_by_domain':
          return this.lookupCompanyByDomain(args);
        case 'reveal_company_by_ip':
          return this.revealCompanyByIp(args);
        case 'search_prospector':
          return this.searchProspector(args);
        case 'lookup_person_by_email':
          return this.lookupPersonByEmail(args);
        case 'find_company_logo':
          return this.findCompanyLogo(args);
        case 'lookup_name_to_domain':
          return this.lookupNameToDomain(args);
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

  private get authHeader(): string {
    // Basic auth: apiKey as username, empty password
    return `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`;
  }

  private get headers(): Record<string, string> {
    return {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async clearbitGet(url: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const fullUrl = `${url}${qs ? '?' + qs : ''}`;
    const response = await fetch(fullUrl, { method: 'GET', headers: this.headers });

    // 202 means async — data not yet available
    if (response.status === 202) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ status: 202, message: 'Enrichment queued — data not yet cached. Use webhook_url to receive result, or retry in a few seconds.' }) }],
        isError: false,
      };
    }
    // 404 means not found in Clearbit database
    if (response.status === 404) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ status: 404, message: 'No record found in Clearbit database for the provided identifier.' }) }],
        isError: false,
      };
    }
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Clearbit returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async enrichPerson(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    const params: Record<string, string> = { email: args.email as string };
    if (args.webhook_url) params.webhook_url = args.webhook_url as string;
    return this.clearbitGet(`${this.personBaseUrl}/v1/people/email/${encodeURIComponent(args.email as string)}`, params);
  }

  private async enrichCompany(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.clearbitGet(`${this.companyBaseUrl}/v1/companies/domain/${encodeURIComponent(args.domain as string)}`);
  }

  private async enrichCombined(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    const params: Record<string, string> = { email: args.email as string };
    if (args.webhook_url) params.webhook_url = args.webhook_url as string;
    return this.clearbitGet(`${this.personBaseUrl}/v2/combined/find`, params);
  }

  private async findPersonStream(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    // Streaming endpoint — holds connection open up to 60s
    return this.clearbitGet(
      `https://person-stream.clearbit.com/v1/people/email/${encodeURIComponent(args.email as string)}`,
    );
  }

  private async lookupCompanyByDomain(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.clearbitGet(`${this.companyBaseUrl}/v1/companies/domain/${encodeURIComponent(args.domain as string)}`);
  }

  private async revealCompanyByIp(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ip) return { content: [{ type: 'text', text: 'ip is required' }], isError: true };
    return this.clearbitGet(`${this.revealBaseUrl}/v1/companies/find`, { ip: args.ip as string });
  }

  private async searchProspector(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    const params: Record<string, string> = {
      domain: args.domain as string,
      page: String((args.page as number) ?? 1),
      page_size: String((args.pageSize as number) ?? 5),
    };
    if (args.title) params.title = args.title as string;
    if (args.role) params.role = args.role as string;
    if (args.seniority) params.seniority = args.seniority as string;
    return this.clearbitGet(`${this.prospectorBaseUrl}/v1/people/search`, params);
  }

  private async lookupPersonByEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    return this.clearbitGet(`${this.personBaseUrl}/v1/people/email/${encodeURIComponent(args.email as string)}`);
  }

  private async findCompanyLogo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    const size = (args.size as number) ?? 128;
    const logoUrl = `https://logo.clearbit.com/${encodeURIComponent(args.domain as string)}?size=${size}`;
    // Logo API returns an image, not JSON — return the URL directly
    return {
      content: [{ type: 'text', text: JSON.stringify({ logo_url: logoUrl, domain: args.domain, size }) }],
      isError: false,
    };
  }

  private async lookupNameToDomain(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.clearbitGet(`${this.companyBaseUrl}/v1/companies/find`, { name: args.name as string });
  }
}
