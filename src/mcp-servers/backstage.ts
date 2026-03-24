/**
 * Backstage MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/backstage/backstage (mcp-actions-backend plugin) — exposes Backstage
// scaffolder actions as MCP tools for AI clients invoking INTO Backstage (not for catalog queries).
// Community catalog-wrapping MCPs exist (iocanel/backstage-mcp, p7ayfu77/backstage-mcp) but none are
// official or feature-complete. This adapter covers the Catalog REST API and is the recommended
// self-hosted solution for catalog queries, entity management, and location registration.

import { ToolDefinition, ToolResult } from './types.js';

interface BackstageConfig {
  /**
   * Base URL of your Backstage backend, e.g. https://backstage.example.com
   * The catalog API will be accessed at {baseUrl}/api/catalog
   */
  baseUrl: string;
  /**
   * Bearer token for authentication (Backstage identity token or static token
   * configured via the backend.auth.dangerouslyDisableDefaultAuthPolicy setting).
   * Optional for Backstage instances with auth disabled.
   */
  token?: string;
}

export class BackstageMCPServer {
  private readonly baseUrl: string;
  private readonly token: string | undefined;

  constructor(config: BackstageConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token;
  }

  private get catalogBase(): string {
    return `${this.baseUrl}/api/catalog`;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_entities',
        description:
          'Query catalog entities with optional filters. Returns components, APIs, systems, groups, users, and other entity kinds registered in Backstage.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description:
                'Comma-separated filter expressions, e.g. "kind=component,metadata.namespace=default". Multiple values for the same key are ORed; multiple keys are ANDed.',
            },
            fields: {
              type: 'string',
              description:
                'Comma-separated list of fields to include in the response, e.g. "metadata.name,kind,spec.type".',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of entities to return (default: 20).',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor obtained from a previous response.',
            },
          },
        },
      },
      {
        name: 'get_entity',
        description: 'Get a single catalog entity by its kind, namespace, and name.',
        inputSchema: {
          type: 'object',
          properties: {
            kind: {
              type: 'string',
              description: 'Entity kind, e.g. Component, API, System, Group, User.',
            },
            namespace: {
              type: 'string',
              description: 'Entity namespace (default: default).',
            },
            name: {
              type: 'string',
              description: 'Entity name.',
            },
          },
          required: ['kind', 'name'],
        },
      },
      {
        name: 'get_entity_facets',
        description:
          'Retrieve aggregated facet counts for catalog entities. Useful for discovering what kinds, namespaces, tags, or lifecycle values exist in the catalog.',
        inputSchema: {
          type: 'object',
          properties: {
            facet: {
              type: 'string',
              description:
                'Comma-separated list of facet fields to aggregate, e.g. "kind,metadata.namespace,spec.lifecycle".',
            },
            filter: {
              type: 'string',
              description: 'Optional filter to scope facet results, same syntax as list_entities.',
            },
          },
          required: ['facet'],
        },
      },
      {
        name: 'list_locations',
        description: 'List all registered catalog locations (where entity descriptors are sourced from).',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_location',
        description:
          'Register a new catalog location (e.g. a GitHub URL to a catalog-info.yaml file). Backstage will ingest entities from this location.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Location type, typically "url".',
            },
            target: {
              type: 'string',
              description:
                'The location target, e.g. https://github.com/org/repo/blob/main/catalog-info.yaml',
            },
            dryRun: {
              type: 'boolean',
              description:
                'If true, validates the location without persisting it (default: false).',
            },
          },
          required: ['type', 'target'],
        },
      },
      {
        name: 'delete_entity',
        description:
          'Delete an entity from the catalog by its UID. Note: if the entity is backed by a registered location, it will be re-ingested on the next refresh cycle.',
        inputSchema: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              description: 'The UID of the entity to delete (metadata.uid field).',
            },
          },
          required: ['uid'],
        },
      },
      {
        name: 'refresh_entity',
        description:
          'Trigger an immediate refresh of a catalog entity, causing Backstage to re-read it from its source location.',
        inputSchema: {
          type: 'object',
          properties: {
            entityRef: {
              type: 'string',
              description:
                'Entity reference in the format kind:namespace/name, e.g. component:default/my-service.',
            },
          },
          required: ['entityRef'],
        },
      },
      {
        name: 'get_entity_ancestors',
        description:
          'Get the ancestry chain for a catalog entity — the chain of entities that own or reference this entity.',
        inputSchema: {
          type: 'object',
          properties: {
            entityRef: {
              type: 'string',
              description:
                'Entity reference in the format kind:namespace/name, e.g. component:default/my-service.',
            },
          },
          required: ['entityRef'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers = this.buildHeaders();

      switch (name) {
        case 'list_entities': {
          const params = new URLSearchParams();
          if (args.filter) params.append('filter', args.filter as string);
          if (args.fields) params.append('fields', args.fields as string);
          if (args.limit) params.append('limit', String(args.limit as number));
          if (args.after) params.append('after', args.after as string);

          const qs = params.toString();
          const url = `${this.catalogBase}/entities${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list entities: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Backstage returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_entity': {
          const kind = args.kind as string;
          const namespace = (args.namespace as string) || 'default';
          const entityName = args.name as string;

          if (!kind || !entityName) {
            return {
              content: [{ type: 'text', text: 'kind and name are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.catalogBase}/entities/by-name/${encodeURIComponent(kind)}/${encodeURIComponent(namespace)}/${encodeURIComponent(entityName)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get entity: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Backstage returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_entity_facets': {
          const facet = args.facet as string;
          if (!facet) {
            return {
              content: [{ type: 'text', text: 'facet is required' }],
              isError: true,
            };
          }

          const params = new URLSearchParams();
          for (const f of facet.split(',')) {
            params.append('facet', f.trim());
          }
          if (args.filter) params.append('filter', args.filter as string);

          const response = await fetch(
            `${this.catalogBase}/entity-facets?${params.toString()}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get entity facets: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Backstage returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_locations': {
          const response = await fetch(`${this.catalogBase}/locations`, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list locations: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Backstage returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_location': {
          const locationType = args.type as string;
          const target = args.target as string;

          if (!locationType || !target) {
            return {
              content: [{ type: 'text', text: 'type and target are required' }],
              isError: true,
            };
          }

          const url = `${this.catalogBase}/locations${args.dryRun ? '?dryRun=true' : ''}`;
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ type: locationType, target }),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create location: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Backstage returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_entity': {
          const uid = args.uid as string;
          if (!uid) {
            return {
              content: [{ type: 'text', text: 'uid is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.catalogBase}/entities/by-uid/${encodeURIComponent(uid)}`,
            { method: 'DELETE', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to delete entity: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: `Entity ${uid} deleted successfully.` }], isError: false };
        }

        case 'refresh_entity': {
          const entityRef = args.entityRef as string;
          if (!entityRef) {
            return {
              content: [{ type: 'text', text: 'entityRef is required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.catalogBase}/refresh`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ entityRef }),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to refresh entity: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: `Refresh triggered for ${entityRef}.` }], isError: false };
        }

        case 'get_entity_ancestors': {
          const entityRef = args.entityRef as string;
          if (!entityRef) {
            return {
              content: [{ type: 'text', text: 'entityRef is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.catalogBase}/entities/by-ref/${encodeURIComponent(entityRef)}/ancestry`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get entity ancestors: ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Backstage returned non-JSON response (HTTP ${response.status})`); }
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
