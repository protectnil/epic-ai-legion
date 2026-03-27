/**
 * Hotjar MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Hotjar MCP server was found on GitHub or the Hotjar developer documentation.
//
// Base URL: https://api.hotjar.com/v1
// Auth: OAuth2 client credentials flow — POST https://api.hotjar.io/v1/oauth/token
//   with grant_type=client_credentials, client_id, client_secret (form-encoded).
//   Returns Bearer access token (expires_in: 3600 seconds).
// Docs: https://help.hotjar.com/hc/en-us/articles/36820005914001-Hotjar-API-Reference
// Rate limits: 3,000 requests/min per source IP (50 req/sec); responds 429 on breach

import { ToolDefinition, ToolResult } from './types.js';

interface HotjarConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  tokenUrl?: string;
}

export class HotjarMCPServer {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: HotjarConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl ?? 'https://api.hotjar.com/v1';
    this.tokenUrl = config.tokenUrl ?? 'https://api.hotjar.io/v1/oauth/token';
  }

  static catalog() {
    return {
      name: 'hotjar',
      displayName: 'Hotjar',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'hotjar', 'heatmap', 'session recording', 'replay', 'survey', 'feedback',
        'funnel', 'behavior analytics', 'ux', 'user research', 'click map',
        'scroll map', 'rage click', 'conversion',
      ],
      toolNames: [
        'list_sites',
        'get_site',
        'list_heatmaps',
        'get_heatmap',
        'create_heatmap',
        'list_recordings',
        'get_recording',
        'list_surveys',
        'get_survey',
        'create_survey',
        'update_survey',
        'list_survey_responses',
        'list_funnels',
        'get_funnel',
        'create_funnel',
        'list_events',
      ],
      description: 'Hotjar behavior analytics: manage heatmaps, session recordings, surveys, funnels, and user feedback across sites.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_sites',
        description: 'List all sites connected to the Hotjar account with tracking status and plan information',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of sites to return (default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Cursor for pagination from a previous response next_cursor field',
            },
          },
        },
      },
      {
        name: 'get_site',
        description: 'Get details for a specific Hotjar site including tracking code status and plan',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'list_heatmaps',
        description: 'List heatmaps for a site with optional status and type filters and date range',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID',
            },
            type: {
              type: 'string',
              description: 'Heatmap type: click, move, scroll, tap (default: all)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: active, paused, finished (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of heatmaps to return (default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Cursor for pagination from a previous response',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_heatmap',
        description: 'Get details and aggregated data for a specific Hotjar heatmap by site and heatmap ID',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID',
            },
            heatmap_id: {
              type: 'number',
              description: 'Numeric heatmap ID',
            },
          },
          required: ['site_id', 'heatmap_id'],
        },
      },
      {
        name: 'create_heatmap',
        description: 'Create a new heatmap for a specific page URL on a Hotjar site',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID to create the heatmap on',
            },
            name: {
              type: 'string',
              description: 'Display name for the heatmap',
            },
            page_url: {
              type: 'string',
              description: 'URL of the page to track (e.g. https://example.com/pricing)',
            },
            type: {
              type: 'string',
              description: 'Heatmap type: click, move, scroll (default: click)',
            },
            device: {
              type: 'string',
              description: 'Device target: desktop, mobile, tablet (default: desktop)',
            },
          },
          required: ['site_id', 'name', 'page_url'],
        },
      },
      {
        name: 'list_recordings',
        description: 'List session recordings for a site with optional filters for duration, device, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID',
            },
            device: {
              type: 'string',
              description: 'Filter by device type: desktop, mobile, tablet (default: all)',
            },
            min_duration: {
              type: 'number',
              description: 'Minimum session duration in seconds to include (default: 0)',
            },
            starred: {
              type: 'boolean',
              description: 'Return only starred recordings (default: false)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of recordings to return (default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Cursor for pagination from a previous response',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_recording',
        description: 'Get metadata for a specific session recording including duration, pages visited, and device info',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID',
            },
            recording_id: {
              type: 'string',
              description: 'Unique identifier of the recording',
            },
          },
          required: ['site_id', 'recording_id'],
        },
      },
      {
        name: 'list_surveys',
        description: 'List surveys for a site with optional status filter — includes on-site widgets and external links',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID',
            },
            status: {
              type: 'string',
              description: 'Filter by status: active, paused, finished (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of surveys to return (default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Cursor for pagination from a previous response',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_survey',
        description: 'Get configuration and statistics for a specific Hotjar survey including question count and response rate',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID',
            },
            survey_id: {
              type: 'number',
              description: 'Numeric survey ID',
            },
          },
          required: ['site_id', 'survey_id'],
        },
      },
      {
        name: 'create_survey',
        description: 'Create a new on-site or external survey for a Hotjar site with a name and optional trigger settings',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID to create the survey on',
            },
            name: {
              type: 'string',
              description: 'Internal name for the survey (not shown to users)',
            },
            type: {
              type: 'string',
              description: 'Survey type: widget (on-site pop-up) or link (external URL) (default: widget)',
            },
            language: {
              type: 'string',
              description: 'Language code for the survey interface (e.g. en, de, fr; default: en)',
            },
          },
          required: ['site_id', 'name'],
        },
      },
      {
        name: 'update_survey',
        description: 'Update the name or status of an existing Hotjar survey',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID',
            },
            survey_id: {
              type: 'number',
              description: 'Numeric survey ID to update',
            },
            name: {
              type: 'string',
              description: 'New internal name for the survey',
            },
            status: {
              type: 'string',
              description: 'New status: active or paused',
            },
          },
          required: ['site_id', 'survey_id'],
        },
      },
      {
        name: 'list_survey_responses',
        description: 'List individual responses for a Hotjar survey with optional date range and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID',
            },
            survey_id: {
              type: 'number',
              description: 'Numeric survey ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of responses to return (default: 50)',
            },
            cursor: {
              type: 'string',
              description: 'Cursor for pagination from a previous response',
            },
            created_after: {
              type: 'string',
              description: 'Return responses created after this ISO 8601 timestamp',
            },
          },
          required: ['site_id', 'survey_id'],
        },
      },
      {
        name: 'list_funnels',
        description: 'List conversion funnels for a Hotjar site with step counts and conversion rates',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of funnels to return (default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Cursor for pagination from a previous response',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_funnel',
        description: 'Get detailed data for a specific Hotjar conversion funnel including per-step drop-off rates',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID',
            },
            funnel_id: {
              type: 'number',
              description: 'Numeric funnel ID',
            },
          },
          required: ['site_id', 'funnel_id'],
        },
      },
      {
        name: 'create_funnel',
        description: 'Create a new conversion funnel for a Hotjar site with a sequence of page URL steps',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID',
            },
            name: {
              type: 'string',
              description: 'Display name for the funnel',
            },
            steps: {
              type: 'array',
              description: 'Ordered array of step objects with url and name fields (minimum 2 steps)',
            },
          },
          required: ['site_id', 'name', 'steps'],
        },
      },
      {
        name: 'list_events',
        description: 'List custom events tracked for a Hotjar site that are used to trigger recordings and surveys',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'number',
              description: 'Numeric Hotjar site ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 50)',
            },
            cursor: {
              type: 'string',
              description: 'Cursor for pagination from a previous response',
            },
          },
          required: ['site_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_sites': return this.listSites(args);
        case 'get_site': return this.getSite(args);
        case 'list_heatmaps': return this.listHeatmaps(args);
        case 'get_heatmap': return this.getHeatmap(args);
        case 'create_heatmap': return this.createHeatmap(args);
        case 'list_recordings': return this.listRecordings(args);
        case 'get_recording': return this.getRecording(args);
        case 'list_surveys': return this.listSurveys(args);
        case 'get_survey': return this.getSurvey(args);
        case 'create_survey': return this.createSurvey(args);
        case 'update_survey': return this.updateSurvey(args);
        case 'list_survey_responses': return this.listSurveyResponses(args);
        case 'list_funnels': return this.listFunnels(args);
        case 'get_funnel': return this.getFunnel(args);
        case 'create_funnel': return this.createFunnel(args);
        case 'list_events': return this.listEvents(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) return this.bearerToken;
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });
    if (!response.ok) throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async apiGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await fetch(`${this.baseUrl}${path}${qs}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSites(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 20) };
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet('/sites', params);
  }

  private async getSite(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    return this.apiGet(`/sites/${encodeURIComponent(args.site_id as string)}`);
  }

  private async listHeatmaps(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 20) };
    if (args.type) params.type = args.type as string;
    if (args.status) params.status = args.status as string;
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet(`/sites/${encodeURIComponent(args.site_id as string)}/heatmaps`, params);
  }

  private async getHeatmap(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.heatmap_id) {
      return { content: [{ type: 'text', text: 'site_id and heatmap_id are required' }], isError: true };
    }
    return this.apiGet(`/sites/${encodeURIComponent(args.site_id as string)}/heatmaps/${encodeURIComponent(args.heatmap_id as string)}`);
  }

  private async createHeatmap(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.name || !args.page_url) {
      return { content: [{ type: 'text', text: 'site_id, name, and page_url are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      page_url: args.page_url,
      type: args.type ?? 'click',
      device: args.device ?? 'desktop',
    };
    return this.apiPost(`/sites/${encodeURIComponent(args.site_id as string)}/heatmaps`, body);
  }

  private async listRecordings(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 20) };
    if (args.device) params.device = args.device as string;
    if (args.min_duration) params.min_duration = String(args.min_duration);
    if (typeof args.starred === 'boolean') params.starred = String(args.starred);
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet(`/sites/${encodeURIComponent(args.site_id as string)}/recordings`, params);
  }

  private async getRecording(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.recording_id) {
      return { content: [{ type: 'text', text: 'site_id and recording_id are required' }], isError: true };
    }
    return this.apiGet(`/sites/${encodeURIComponent(args.site_id as string)}/recordings/${encodeURIComponent(args.recording_id as string)}`);
  }

  private async listSurveys(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 20) };
    if (args.status) params.status = args.status as string;
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet(`/sites/${encodeURIComponent(args.site_id as string)}/surveys`, params);
  }

  private async getSurvey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.survey_id) {
      return { content: [{ type: 'text', text: 'site_id and survey_id are required' }], isError: true };
    }
    return this.apiGet(`/sites/${encodeURIComponent(args.site_id as string)}/surveys/${encodeURIComponent(args.survey_id as string)}`);
  }

  private async createSurvey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.name) {
      return { content: [{ type: 'text', text: 'site_id and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      type: args.type ?? 'widget',
      language: args.language ?? 'en',
    };
    return this.apiPost(`/sites/${encodeURIComponent(args.site_id as string)}/surveys`, body);
  }

  private async updateSurvey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.survey_id) {
      return { content: [{ type: 'text', text: 'site_id and survey_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.status) body.status = args.status;
    return this.apiPatch(`/sites/${encodeURIComponent(args.site_id as string)}/surveys/${encodeURIComponent(args.survey_id as string)}`, body);
  }

  private async listSurveyResponses(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.survey_id) {
      return { content: [{ type: 'text', text: 'site_id and survey_id are required' }], isError: true };
    }
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 50) };
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.created_after) params.created_after = args.created_after as string;
    return this.apiGet(`/sites/${encodeURIComponent(args.site_id as string)}/surveys/${encodeURIComponent(args.survey_id as string)}/responses`, params);
  }

  private async listFunnels(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 20) };
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet(`/sites/${encodeURIComponent(args.site_id as string)}/funnels`, params);
  }

  private async getFunnel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.funnel_id) {
      return { content: [{ type: 'text', text: 'site_id and funnel_id are required' }], isError: true };
    }
    return this.apiGet(`/sites/${encodeURIComponent(args.site_id as string)}/funnels/${encodeURIComponent(args.funnel_id as string)}`);
  }

  private async createFunnel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.name || !args.steps) {
      return { content: [{ type: 'text', text: 'site_id, name, and steps are required' }], isError: true };
    }
    return this.apiPost(`/sites/${encodeURIComponent(args.site_id as string)}/funnels`, { name: args.name, steps: args.steps });
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 50) };
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet(`/sites/${encodeURIComponent(args.site_id as string)}/events`, params);
  }
}
