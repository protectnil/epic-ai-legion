/**
 * HashiCorp Vault MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/hashicorp/vault-mcp-server — 16 tools (actively maintained, covers KV, PKI, and mounts). Build this adapter as a lightweight self-hosted fallback and to cover dynamic credentials not yet in the official server.

import { ToolDefinition, ToolResult } from './types.js';

// Auth: Vault token passed as the X-Vault-Token header.
// Bearer scheme (Authorization: Bearer <token>) is also supported by Vault but X-Vault-Token is canonical.
// Base URL: http(s)://{vaultAddr}/v1  — caller supplies their Vault address.
// KV v2 paths: GET/POST/DELETE /v1/{mount}/data/{path}  (metadata at /v1/{mount}/metadata/{path})
// All API routes are prefixed with /v1/.

interface HashiCorpVaultConfig {
  vaultAddr: string;  // e.g. https://vault.example.com  (no trailing slash)
  token: string;      // Vault token
  namespace?: string; // Vault Enterprise namespace (e.g. admin/team-a)
}

export class HashiCorpVaultMCPServer {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly namespace?: string;

  constructor(config: HashiCorpVaultConfig) {
    this.baseUrl = `${config.vaultAddr.replace(/\/$/, '')}/v1`;
    this.token = config.token;
    this.namespace = config.namespace;
  }

  private buildHeaders(): Record<string, string> {
    const h: Record<string, string> = {
      'X-Vault-Token': this.token,
      'Content-Type': 'application/json',
    };
    if (this.namespace) h['X-Vault-Namespace'] = this.namespace;
    return h;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'health_check',
        description: 'Check the health status of the Vault server (initialized, sealed, standby state).',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'read_secret',
        description: 'Read a secret from a KV v2 secrets engine. Returns the latest version unless version is specified.',
        inputSchema: {
          type: 'object',
          properties: {
            mount: {
              type: 'string',
              description: 'KV v2 mount path (e.g. secret)',
            },
            path: {
              type: 'string',
              description: 'Secret path within the mount (e.g. myapp/database)',
            },
            version: {
              type: 'number',
              description: 'Specific version to read (omit for latest)',
            },
          },
          required: ['mount', 'path'],
        },
      },
      {
        name: 'write_secret',
        description: 'Write (create or update) a secret in a KV v2 secrets engine.',
        inputSchema: {
          type: 'object',
          properties: {
            mount: {
              type: 'string',
              description: 'KV v2 mount path (e.g. secret)',
            },
            path: {
              type: 'string',
              description: 'Secret path within the mount (e.g. myapp/database)',
            },
            data: {
              type: 'object',
              description: 'Key-value pairs to store as the secret data',
            },
          },
          required: ['mount', 'path', 'data'],
        },
      },
      {
        name: 'delete_secret',
        description: 'Soft-delete the latest version (or specified versions) of a KV v2 secret. The data is not permanently destroyed.',
        inputSchema: {
          type: 'object',
          properties: {
            mount: { type: 'string', description: 'KV v2 mount path' },
            path: { type: 'string', description: 'Secret path' },
            versions: {
              type: 'array',
              description: 'Specific version numbers to delete. Omit to delete the latest version.',
              items: { type: 'number' },
            },
          },
          required: ['mount', 'path'],
        },
      },
      {
        name: 'list_secrets',
        description: 'List secret paths at a given location in a KV v2 secrets engine.',
        inputSchema: {
          type: 'object',
          properties: {
            mount: { type: 'string', description: 'KV v2 mount path (e.g. secret)' },
            path: {
              type: 'string',
              description: 'Path prefix to list (use empty string or "/" for the root of the mount)',
            },
          },
          required: ['mount', 'path'],
        },
      },
      {
        name: 'read_secret_metadata',
        description: 'Read metadata for a KV v2 secret including all version history.',
        inputSchema: {
          type: 'object',
          properties: {
            mount: { type: 'string', description: 'KV v2 mount path' },
            path: { type: 'string', description: 'Secret path' },
          },
          required: ['mount', 'path'],
        },
      },
      {
        name: 'list_mounts',
        description: 'List all secrets engine mounts in Vault.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_token',
        description: 'Create a new Vault token with specified policies and TTL.',
        inputSchema: {
          type: 'object',
          properties: {
            policies: {
              type: 'array',
              description: 'List of policy names to attach to the token',
              items: { type: 'string' },
            },
            ttl: {
              type: 'string',
              description: 'Time-to-live for the token (e.g. 1h, 30m, 24h)',
            },
            display_name: {
              type: 'string',
              description: 'Display name for the token (for audit logs)',
            },
            renewable: {
              type: 'boolean',
              description: 'Whether the token can be renewed (default: true)',
            },
            num_uses: {
              type: 'number',
              description: 'Maximum number of uses (0 = unlimited)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers = this.buildHeaders();

      switch (name) {
        case 'health_check': {
          // GET /v1/sys/health — does not require authentication
          const response = await fetch(`${this.baseUrl}/sys/health`, { method: 'GET', headers });
          // Vault returns non-200 codes for sealed/standby states; treat them as data, not errors
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Vault returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'read_secret': {
          const mount = args.mount as string;
          const path = args.path as string;
          if (!mount || !path) return { content: [{ type: 'text', text: 'mount and path are required' }], isError: true };

          let url = `${this.baseUrl}/${mount}/data/${path.replace(/^\//, '')}`;
          if (typeof args.version === 'number') url += `?version=${args.version}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to read secret: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Vault returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'write_secret': {
          const mount = args.mount as string;
          const path = args.path as string;
          const data = args.data;
          if (!mount || !path || !data) return { content: [{ type: 'text', text: 'mount, path, and data are required' }], isError: true };

          const url = `${this.baseUrl}/${mount}/data/${path.replace(/^\//, '')}`;
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ data }),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to write secret: ${response.status} ${response.statusText}` }], isError: true };
          }
          let result: unknown;
          try { result = await response.json(); } catch { throw new Error(`Vault returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: false };
        }

        case 'delete_secret': {
          const mount = args.mount as string;
          const path = args.path as string;
          if (!mount || !path) return { content: [{ type: 'text', text: 'mount and path are required' }], isError: true };

          const versions = args.versions as number[] | undefined;
          let url: string;
          let method: string;
          let body: string | undefined;

          if (Array.isArray(versions) && versions.length > 0) {
            // Delete specific versions via POST to /delete endpoint
            url = `${this.baseUrl}/${mount}/delete/${path.replace(/^\//, '')}`;
            method = 'POST';
            body = JSON.stringify({ versions });
          } else {
            // Soft-delete latest version via DELETE on data path
            url = `${this.baseUrl}/${mount}/data/${path.replace(/^\//, '')}`;
            method = 'DELETE';
          }

          const response = await fetch(url, { method, headers, body });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to delete secret: ${response.status} ${response.statusText}` }], isError: true };
          }
          return { content: [{ type: 'text', text: JSON.stringify({ status: 'success', mount, path }) }], isError: false };
        }

        case 'list_secrets': {
          const mount = args.mount as string;
          const path = (args.path as string) ?? '';
          if (!mount) return { content: [{ type: 'text', text: 'mount is required' }], isError: true };

          const cleanPath = path.replace(/^\//, '');
          const url = `${this.baseUrl}/${mount}/metadata/${cleanPath}?list=true`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list secrets: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Vault returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'read_secret_metadata': {
          const mount = args.mount as string;
          const path = args.path as string;
          if (!mount || !path) return { content: [{ type: 'text', text: 'mount and path are required' }], isError: true };

          const url = `${this.baseUrl}/${mount}/metadata/${path.replace(/^\//, '')}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to read secret metadata: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Vault returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_mounts': {
          const response = await fetch(`${this.baseUrl}/sys/mounts`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list mounts: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Vault returned non-JSON (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_token': {
          const body: Record<string, unknown> = {};
          if (Array.isArray(args.policies)) body.policies = args.policies;
          if (args.ttl) body.ttl = args.ttl;
          if (args.display_name) body.display_name = args.display_name;
          if (typeof args.renewable === 'boolean') body.renewable = args.renewable;
          if (typeof args.num_uses === 'number') body.num_uses = args.num_uses;

          const response = await fetch(`${this.baseUrl}/auth/token/create`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create token: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Vault returned non-JSON (HTTP ${response.status})`); }
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
