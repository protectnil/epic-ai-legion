/**
 * Aqua Security MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/aquasecurity/trivy-mcp — experimental, Trivy CLI-based (not platform API)
// Note: The official trivy-mcp wraps the Trivy open-source scanner. This adapter targets the
// Aqua Security SaaS platform REST API — covering container images, vulnerability management,
// runtime containers, and assurance policies.
//
// Auth: Two-step token exchange. POST /v2/tokens with API key ID and secret returns a
//   short-lived Bearer token (valid 240 minutes). Credentials generated in Aqua console:
//   Account Management > Settings > API Keys.
//   Verified via: explained.tines.com/en/articles/8503758-aqua-security-authentication-guide,
//   aquasec-api PyPI package source (atav928/aquasec-api).
//
// Regional base URLs (pass via baseUrl config — required for non-US deployments):
//   US (default): https://api.cloudsploit.com
//   EU-1:         https://eu-1.api.cloudsploit.com
//   Asia-1:       https://asia-1.api.cloudsploit.com
//
// Verified endpoints (docs.aqua-cloud.io/documentation/automation/rest-api):
//   POST /v2/tokens          — obtain Bearer token from API key + secret
//   GET  /v2/images          — list scanned container images
//   GET  /v2/images/{registry}/{name}/vulnerabilities — image CVEs
//   GET  /v2/vulnerabilities — cross-resource vulnerability search
//   GET  /v2/containers      — running containers monitored by runtime protection
//   GET  /v2/policies/assurance/image — image assurance policies
//   GET  /v2/risks/explorer  — aggregated risk summary
//   GET  /v2/registries      — integrated container registries

import { ToolDefinition, ToolResult } from './types.js';

interface AquaSecurityConfig {
  aquaKey: string;
  aquaSecret: string;
  baseUrl?: string;
}

export class AquaSecurityMCPServer {
  private readonly aquaKey: string;
  private readonly aquaSecret: string;
  private readonly baseUrl: string;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: AquaSecurityConfig) {
    this.aquaKey = config.aquaKey;
    this.aquaSecret = config.aquaSecret;
    this.baseUrl = config.baseUrl || 'https://api.cloudsploit.com';
  }

  private async getToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    const response = await fetch(`${this.baseUrl}/v2/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: this.aquaKey,
        password: this.aquaSecret,
        validity: 240,
        allowed_endpoints: ['ANY'],
        csp_roles: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`Aqua token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { data?: { token?: string } };
    const token = data?.data?.token;
    if (!token) {
      throw new Error('Aqua Security token response did not contain a token');
    }

    this.cachedToken = token;
    this.tokenExpiry = Date.now() + 230 * 60 * 1000;
    return token;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_images',
        description: 'List container images scanned by Aqua Security with vulnerability counts and compliance status',
        inputSchema: {
          type: 'object',
          properties: {
            registry: {
              type: 'string',
              description: 'Filter by registry name (e.g., docker.io, gcr.io)',
            },
            repository: {
              type: 'string',
              description: 'Filter by repository name',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pagesize: {
              type: 'number',
              description: 'Number of images per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_image_vulnerabilities',
        description: 'Get detailed CVE findings for a specific container image, including severity, CVSS score, and fix version availability',
        inputSchema: {
          type: 'object',
          properties: {
            registry: {
              type: 'string',
              description: 'Registry name containing the image (e.g., docker.io)',
            },
            image_name: {
              type: 'string',
              description: 'Full image name including tag (e.g., nginx:latest)',
            },
          },
          required: ['registry', 'image_name'],
        },
      },
      {
        name: 'search_vulnerabilities',
        description: 'Search across all scanned resources for vulnerabilities by CVE ID, severity, or fix availability',
        inputSchema: {
          type: 'object',
          properties: {
            cve_id: {
              type: 'string',
              description: 'Filter by CVE identifier (e.g., CVE-2021-44228)',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: critical, high, medium, low, negligible',
            },
            fix_available: {
              type: 'boolean',
              description: 'If true, return only vulnerabilities with a known fix',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            pagesize: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'list_running_containers',
        description: 'List containers currently running in the environment and monitored by Aqua runtime protection',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            pagesize: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
            status: {
              type: 'string',
              description: 'Filter by container status: running, stopped',
            },
          },
        },
      },
      {
        name: 'list_image_assurance_policies',
        description: 'List image assurance policies that define pass/fail scan criteria for container images',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_risk_explorer',
        description: 'Retrieve a risk summary for the Aqua-monitored environment — aggregated vulnerability, misconfiguration, and runtime risk scores',
        inputSchema: {
          type: 'object',
          properties: {
            scope: {
              type: 'string',
              description: 'Scope: all, images, containers, functions (default: all)',
            },
          },
        },
      },
      {
        name: 'list_registries',
        description: 'List container registries integrated with Aqua Security for automated scanning',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  private async request(path: string, method: string, body?: unknown): Promise<ToolResult> {
    const token = await this.getToken();
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Aqua Security API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Aqua Security returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_images': {
          const page = (args.page as number) ?? 1;
          const pagesize = (args.pagesize as number) ?? 50;
          let path = `/v2/images?page=${page}&pagesize=${pagesize}`;
          if (args.registry) path += `&registry=${encodeURIComponent(args.registry as string)}`;
          if (args.repository) path += `&repository=${encodeURIComponent(args.repository as string)}`;
          return await this.request(path, 'GET');
        }

        case 'get_image_vulnerabilities': {
          const registry = args.registry as string;
          const imageName = args.image_name as string;
          if (!registry || !imageName) {
            return { content: [{ type: 'text', text: 'registry and image_name are required' }], isError: true };
          }
          return await this.request(
            `/v2/images/${encodeURIComponent(registry)}/${encodeURIComponent(imageName)}/vulnerabilities`,
            'GET',
          );
        }

        case 'search_vulnerabilities': {
          const page = (args.page as number) ?? 1;
          const pagesize = (args.pagesize as number) ?? 50;
          let path = `/v2/vulnerabilities?page=${page}&pagesize=${pagesize}`;
          if (args.cve_id) path += `&cve_id=${encodeURIComponent(args.cve_id as string)}`;
          if (args.severity) path += `&severity=${encodeURIComponent(args.severity as string)}`;
          if (typeof args.fix_available === 'boolean') path += `&fix_available=${args.fix_available}`;
          return await this.request(path, 'GET');
        }

        case 'list_running_containers': {
          const page = (args.page as number) ?? 1;
          const pagesize = (args.pagesize as number) ?? 50;
          let path = `/v2/containers?page=${page}&pagesize=${pagesize}`;
          if (args.status) path += `&status=${encodeURIComponent(args.status as string)}`;
          return await this.request(path, 'GET');
        }

        case 'list_image_assurance_policies': {
          return await this.request('/v2/policies/assurance/image', 'GET');
        }

        case 'get_risk_explorer': {
          const scope = (args.scope as string) || 'all';
          return await this.request(`/v2/risks/explorer?scope=${encodeURIComponent(scope)}`, 'GET');
        }

        case 'list_registries': {
          return await this.request('/v2/registries', 'GET');
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
