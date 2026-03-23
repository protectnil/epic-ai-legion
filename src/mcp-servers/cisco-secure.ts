/**
 * Cisco Secure Endpoint MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

/**
 * Regional base URLs for Cisco Secure Endpoint v3 API.
 * Docs: https://developer.cisco.com/docs/secure-endpoint/
 */
const SECURE_ENDPOINT_BASE: Record<string, string> = {
  'na':   'https://api.amp.cisco.com',
  'apjc': 'https://api.apjc.amp.cisco.com',
  'eu':   'https://api.eu.amp.cisco.com',
};

/**
 * OAuth2 client_credentials token endpoints (XDR/IROH) per region.
 * Docs: https://developer.cisco.com/docs/secure-endpoint/authentication/
 */
const OAUTH2_TOKEN_ENDPOINT: Record<string, string> = {
  'na':   'https://visibility.amp.cisco.com/iroh/oauth2/token',
  'apjc': 'https://visibility.apjc.amp.cisco.com/iroh/oauth2/token',
  'eu':   'https://visibility.eu.amp.cisco.com/iroh/oauth2/token',
};

/**
 * Umbrella Reporting v2 base URL and OAuth2 token endpoint.
 * Docs: https://developer.cisco.com/docs/legacy-umbrella-api/reporting-v2-getting-started/
 */
const UMBRELLA_BASE_URL = 'https://api.umbrella.com';
const UMBRELLA_TOKEN_ENDPOINT = 'https://api.umbrella.com/auth/v2/oauth2/token';

interface OAuthToken {
  access_token: string;
  expires_at: number; // epoch ms
}

export class CiscoSecureMCPServer {
  private readonly region: string;
  private readonly secureEndpointBaseUrl: string;
  private readonly tokenEndpoint: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  private readonly umbrellaClientId: string | null;
  private readonly umbrellaClientSecret: string | null;

  private secureEndpointToken: OAuthToken | null = null;
  private umbrellaToken: OAuthToken | null = null;

  constructor(config: {
    /** ISO region key: 'na' | 'apjc' | 'eu'. Defaults to 'na'. */
    region?: string;
    /** OAuth2 client_id for Secure Endpoint (registered in Cisco XDR). */
    clientId: string;
    /** OAuth2 client_secret (client_password) for Secure Endpoint. */
    clientSecret: string;
    /** OAuth2 client_id for Umbrella Reporting v2 API (optional). */
    umbrellaClientId?: string;
    /** OAuth2 client_secret for Umbrella Reporting v2 API (optional). */
    umbrellaClientSecret?: string;
  }) {
    if (!config.clientId || !config.clientSecret) {
      throw new Error(
        'CiscoSecureMCPServer: clientId and clientSecret are required (OAuth2 client credentials)'
      );
    }

    this.region = config.region ?? 'na';
    this.secureEndpointBaseUrl =
      SECURE_ENDPOINT_BASE[this.region] ?? SECURE_ENDPOINT_BASE['na'];
    this.tokenEndpoint =
      OAUTH2_TOKEN_ENDPOINT[this.region] ?? OAUTH2_TOKEN_ENDPOINT['na'];
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.umbrellaClientId = config.umbrellaClientId ?? null;
    this.umbrellaClientSecret = config.umbrellaClientSecret ?? null;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_threats',
        description: 'List security events (threats and malware detections) from Cisco Secure Endpoint v1/events',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default 50)',
            },
            offset: {
              type: 'number',
              description: 'Zero-based start offset for pagination',
            },
            event_type: {
              type: 'number',
              description: 'Filter by numeric event type ID',
            },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Get a specific Secure Endpoint audit log entry by ID',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'The audit log event ID to retrieve',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'list_computers',
        description: 'List computers (endpoints) registered in Cisco Secure Endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of computers to return (default 50)',
            },
            offset: {
              type: 'number',
              description: 'Zero-based start offset for pagination',
            },
            hostname: {
              type: 'string',
              description: 'Filter by hostname (partial match)',
            },
          },
        },
      },
      {
        name: 'query_umbrella_dns',
        description: 'Query Cisco Umbrella Reporting v2 DNS activity logs',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: {
              type: 'string',
              description: 'Start time as Unix epoch seconds',
            },
            end_time: {
              type: 'string',
              description: 'End time as Unix epoch seconds',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records to return (default 100)',
            },
          },
        },
      },
      {
        name: 'get_amp_events',
        description: 'Get AMP (Advanced Malware Protection) events from Cisco Secure Endpoint /v1/events',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default 50)',
            },
            offset: {
              type: 'number',
              description: 'Zero-based start offset for pagination',
            },
            event_type: {
              type: 'string',
              description: 'Filter by event type (numeric ID or comma-separated list)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_threats':
          return await this.listThreats(args);
        case 'get_event':
          return await this.getEvent(args);
        case 'list_computers':
          return await this.listComputers(args);
        case 'query_umbrella_dns':
          return await this.queryUmbrellaDns(args);
        case 'get_amp_events':
          return await this.getAmpEvents(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error instanceof Error ? error.message : 'Unknown error') }],
        isError: true,
      };
    }
  }

  /**
   * Obtain a Bearer token for Cisco Secure Endpoint via OAuth2 client_credentials.
   * Token endpoint: https://visibility.amp.cisco.com/iroh/oauth2/token (NA)
   * Auth: HTTP Basic (clientId:clientSecret), body: grant_type=client_credentials
   */
  private async getSecureEndpointToken(): Promise<string> {
    const now = Date.now();
    if (this.secureEndpointToken && this.secureEndpointToken.expires_at > now + 30_000) {
      return this.secureEndpointToken.access_token;
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(
        `Cisco Secure Endpoint OAuth2 token request failed: ${response.status} ${response.statusText}`
      );
    }

    let tokenData: unknown;
    try {
      tokenData = await response.json();
    } catch {
      throw new Error('Cisco Secure Endpoint OAuth2 token endpoint returned non-JSON response');
    }

    const data = tokenData as Record<string, unknown>;
    const accessToken = data['access_token'] as string;
    const expiresIn = (data['expires_in'] as number) ?? 600;

    this.secureEndpointToken = {
      access_token: accessToken,
      expires_at: now + expiresIn * 1000,
    };

    return accessToken;
  }

  /**
   * Obtain a Bearer token for Cisco Umbrella Reporting v2 via OAuth2 client_credentials.
   * Token endpoint: https://api.umbrella.com/auth/v2/oauth2/token
   */
  private async getUmbrellaToken(): Promise<string> {
    if (!this.umbrellaClientId || !this.umbrellaClientSecret) {
      throw new Error(
        'Umbrella DNS query requires umbrellaClientId and umbrellaClientSecret in config'
      );
    }

    const now = Date.now();
    if (this.umbrellaToken && this.umbrellaToken.expires_at > now + 30_000) {
      return this.umbrellaToken.access_token;
    }

    const credentials = Buffer.from(
      `${this.umbrellaClientId}:${this.umbrellaClientSecret}`
    ).toString('base64');

    const response = await fetch(UMBRELLA_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(
        `Cisco Umbrella OAuth2 token request failed: ${response.status} ${response.statusText}`
      );
    }

    let tokenData: unknown;
    try {
      tokenData = await response.json();
    } catch {
      throw new Error('Cisco Umbrella OAuth2 token endpoint returned non-JSON response');
    }

    const data = tokenData as Record<string, unknown>;
    const accessToken = data['access_token'] as string;
    const expiresIn = (data['expires_in'] as number) ?? 3600;

    this.umbrellaToken = {
      access_token: accessToken,
      expires_at: now + expiresIn * 1000,
    };

    return accessToken;
  }

  private async secureEndpointGet(path: string): Promise<unknown> {
    const token = await this.getSecureEndpointToken();
    const url = `${this.secureEndpointBaseUrl}${path}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Cisco Secure Endpoint API error: ${response.status} ${response.statusText}`);
    }

    try {
      return await response.json();
    } catch {
      throw new Error(`Cisco Secure Endpoint returned non-JSON response (HTTP ${response.status})`);
    }
  }

  /**
   * List security events via GET /v1/events.
   * Docs: https://developer.cisco.com/docs/secure-endpoint/
   */
  private async listThreats(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    const eventType = args.event_type as number | undefined;

    let path = `/v1/events?limit=${limit}&offset=${offset}`;
    if (eventType !== undefined) {
      path += `&event_type[]=${eventType}`;
    }

    const data = await this.secureEndpointGet(path);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  /**
   * Get a specific audit log entry via GET /v1/audit_logs.
   * Secure Endpoint v1 does not expose a single-event-by-ID endpoint;
   * audit logs are filtered by audit log ID.
   */
  private async getEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const eventId = args.event_id as string;
    const path = `/v1/audit_logs?audit_log_id=${encodeURIComponent(eventId)}&limit=1`;
    const data = await this.secureEndpointGet(path);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  /**
   * List computers (endpoints) via GET /v1/computers.
   * Replaces the FMC-style /api/v1/access-policies — Secure Endpoint v3 has
   * no equivalent access-policy list; computer inventory is the appropriate resource.
   */
  private async listComputers(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    const hostname = args.hostname as string | undefined;

    let path = `/v1/computers?limit=${limit}&offset=${offset}`;
    if (hostname) {
      path += `&hostname=${encodeURIComponent(hostname)}`;
    }

    const data = await this.secureEndpointGet(path);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  /**
   * Query Umbrella DNS activity via GET /reports/v2/activity/dns.
   * Base: https://api.umbrella.com (separate domain from Secure Endpoint).
   * Auth: separate OAuth2 token from api.umbrella.com/auth/v2/oauth2/token.
   */
  private async queryUmbrellaDns(args: Record<string, unknown>): Promise<ToolResult> {
    const startTime = args.start_time as string | undefined;
    const endTime = args.end_time as string | undefined;
    const limit = (args.limit as number) || 100;

    const token = await this.getUmbrellaToken();

    let url = `${UMBRELLA_BASE_URL}/reports/v2/activity/dns?limit=${limit}`;
    if (startTime) {
      url += `&from=${encodeURIComponent(startTime)}`;
    }
    if (endTime) {
      url += `&to=${encodeURIComponent(endTime)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Cisco Umbrella Reporting API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Cisco Umbrella returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  /**
   * Get AMP (Advanced Malware Protection) events via GET /v1/events with optional type filter.
   */
  private async getAmpEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    const eventType = args.event_type as string | undefined;

    let path = `/v1/events?limit=${limit}&offset=${offset}`;
    if (eventType) {
      // event_type may be a single ID or comma-separated list; map to repeated params
      for (const et of eventType.split(',')) {
        const trimmed = et.trim();
        if (trimmed) {
          path += `&event_type[]=${encodeURIComponent(trimmed)}`;
        }
      }
    }

    const data = await this.secureEndpointGet(path);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
