/**
 * Monte Carlo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://docs.getmontecarlo.com/docs/mcp-server — hosted-only at https://integrations.getmontecarlo.com/mcp/. Requires MCP-scoped credentials (not the same as standard API keys). Our adapter uses the standard GraphQL API with x-mcd-id / x-mcd-token authentication, which is the self-hosted / API-key use case.

import { ToolDefinition, ToolResult } from './types.js';

interface MonteCarloConfig {
  mcdId: string;
  mcdToken: string;
  /** Override GraphQL endpoint. Defaults to https://api.getmontecarlo.com/graphql */
  baseUrl?: string;
}

export class MonteCarlOMCPServer {
  private readonly mcdId: string;
  private readonly mcdToken: string;
  private readonly baseUrl: string;

  constructor(config: MonteCarloConfig) {
    this.mcdId = config.mcdId;
    this.mcdToken = config.mcdToken;
    this.baseUrl = config.baseUrl ?? 'https://api.getmontecarlo.com/graphql';
  }

  private async graphql(query: string, variables?: Record<string, unknown>): Promise<Response> {
    return fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'x-mcd-id': this.mcdId,
        'x-mcd-token': this.mcdToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_tables',
        description: 'List tables monitored by Monte Carlo, optionally filtered by warehouse, database, or schema.',
        inputSchema: {
          type: 'object',
          properties: {
            dwId: {
              type: 'string',
              description: 'Data warehouse UUID to filter by (optional)',
            },
            fullTableId: {
              type: 'string',
              description: 'Filter by full table identifier (e.g. "project:dataset.table")',
            },
            first: {
              type: 'number',
              description: 'Number of tables to return (default: 25, max: 1000)',
            },
            after: {
              type: 'string',
              description: 'Cursor for pagination (from a previous response)',
            },
          },
        },
      },
      {
        name: 'get_incidents',
        description: 'Retrieve data incidents detected by Monte Carlo, with optional filters for status and time range.',
        inputSchema: {
          type: 'object',
          properties: {
            startTime: {
              type: 'string',
              description: 'ISO 8601 timestamp — return incidents created after this time',
            },
            endTime: {
              type: 'string',
              description: 'ISO 8601 timestamp — return incidents created before this time',
            },
            status: {
              type: 'string',
              description: 'Filter by incident status: no_action, investigating, fixed, expected, false_positive',
            },
            first: {
              type: 'number',
              description: 'Number of incidents to return (default: 25)',
            },
            after: {
              type: 'string',
              description: 'Cursor for pagination',
            },
          },
        },
      },
      {
        name: 'get_monitors',
        description: 'List data quality monitors configured in Monte Carlo.',
        inputSchema: {
          type: 'object',
          properties: {
            monitorType: {
              type: 'string',
              description: 'Filter by monitor type, e.g. freshness, volume, field_health, dimension_tracking, sql_rule',
            },
            fullTableId: {
              type: 'string',
              description: 'Filter monitors for a specific table',
            },
            first: {
              type: 'number',
              description: 'Number of monitors to return (default: 25)',
            },
            after: {
              type: 'string',
              description: 'Cursor for pagination',
            },
          },
        },
      },
      {
        name: 'get_table_lineage',
        description: 'Retrieve upstream and downstream lineage for a specific table — shows data pipeline dependencies.',
        inputSchema: {
          type: 'object',
          properties: {
            mcon: {
              type: 'string',
              description: 'Monte Carlo Object Name (MCON) for the table — a globally unique identifier in the format mcon://...',
            },
            direction: {
              type: 'string',
              description: 'Lineage direction: upstream, downstream, or both (default: both)',
            },
            hops: {
              type: 'number',
              description: 'Number of lineage hops to traverse (default: 1, max: 5)',
            },
          },
          required: ['mcon'],
        },
      },
      {
        name: 'get_warehouses',
        description: 'List the data warehouses (connections) registered in Monte Carlo.',
        inputSchema: {
          type: 'object',
          properties: {
            first: {
              type: 'number',
              description: 'Number of warehouses to return (default: 25)',
            },
          },
        },
      },
      {
        name: 'run_graphql_query',
        description: 'Execute an arbitrary GraphQL query or mutation against the Monte Carlo API. Use this for advanced operations not covered by the other tools.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'GraphQL query or mutation string',
            },
            variables: {
              type: 'object',
              description: 'Optional variables object for the GraphQL operation',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_tables': {
          const query = `
            query GetTables($first: Int, $after: String, $dwId: UUID, $fullTableId: String) {
              getTables(first: $first, after: $after, dwId: $dwId, fullTableId: $fullTableId) {
                edges {
                  node {
                    mcon
                    fullTableId
                    displayName
                    warehouse {
                      uuid
                      name
                      connectionType
                    }
                    tableStats {
                      lastUpdatedTime
                      rowCount
                    }
                  }
                }
                pageInfo {
                  endCursor
                  hasNextPage
                }
              }
            }
          `;

          const variables: Record<string, unknown> = {};
          if (args.dwId) variables.dwId = args.dwId;
          if (args.fullTableId) variables.fullTableId = args.fullTableId;
          variables.first = (args.first as number) ?? 25;
          if (args.after) variables.after = args.after;

          const response = await this.graphql(query, variables);

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get tables: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Monte Carlo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_incidents': {
          const query = `
            query GetIncidents($first: Int, $after: String, $startTime: DateTime, $endTime: DateTime, $status: String) {
              getIncidents(first: $first, after: $after, startTime: $startTime, endTime: $endTime, status: $status) {
                edges {
                  node {
                    incidentId
                    status
                    incidentType
                    startTime
                    endTime
                    normalizedStatus
                    affectedTables {
                      fullTableId
                      mcon
                    }
                  }
                }
                pageInfo {
                  endCursor
                  hasNextPage
                }
              }
            }
          `;

          const variables: Record<string, unknown> = {};
          variables.first = (args.first as number) ?? 25;
          if (args.after) variables.after = args.after;
          if (args.startTime) variables.startTime = args.startTime;
          if (args.endTime) variables.endTime = args.endTime;
          if (args.status) variables.status = args.status;

          const response = await this.graphql(query, variables);

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get incidents: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Monte Carlo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_monitors': {
          const query = `
            query GetMonitors($first: Int, $after: String, $monitorType: String, $fullTableId: String) {
              getMonitors(first: $first, after: $after, monitorType: $monitorType, fullTableId: $fullTableId) {
                edges {
                  node {
                    uuid
                    monitorType
                    name
                    description
                    status
                    fullTableId
                    createdTime
                    updatedTime
                  }
                }
                pageInfo {
                  endCursor
                  hasNextPage
                }
              }
            }
          `;

          const variables: Record<string, unknown> = {};
          variables.first = (args.first as number) ?? 25;
          if (args.after) variables.after = args.after;
          if (args.monitorType) variables.monitorType = args.monitorType;
          if (args.fullTableId) variables.fullTableId = args.fullTableId;

          const response = await this.graphql(query, variables);

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get monitors: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Monte Carlo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_table_lineage': {
          const mcon = args.mcon as string;
          if (!mcon) {
            return { content: [{ type: 'text', text: 'mcon is required' }], isError: true };
          }

          const direction = (args.direction as string) ?? 'both';
          const hops = (args.hops as number) ?? 1;

          const query = `
            query GetTableLineage($mcon: String!, $direction: String, $hops: Int) {
              getTableLineage(mcon: $mcon, direction: $direction, hops: $hops) {
                nodes {
                  mcon
                  objectType
                  displayName
                  fullTableId
                }
                edges {
                  source
                  destination
                }
              }
            }
          `;

          const response = await this.graphql(query, { mcon, direction, hops });

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get table lineage: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Monte Carlo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_warehouses': {
          const query = `
            query GetWarehouses($first: Int) {
              getWarehouses(first: $first) {
                edges {
                  node {
                    uuid
                    name
                    connectionType
                    createdOn
                    updatedOn
                  }
                }
              }
            }
          `;

          const variables: Record<string, unknown> = {};
          variables.first = (args.first as number) ?? 25;

          const response = await this.graphql(query, variables);

          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get warehouses: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Monte Carlo returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'run_graphql_query': {
          const queryStr = args.query as string;
          if (!queryStr) {
            return { content: [{ type: 'text', text: 'query is required' }], isError: true };
          }

          const variables = args.variables as Record<string, unknown> | undefined;
          const response = await this.graphql(queryStr, variables);

          if (!response.ok) {
            return { content: [{ type: 'text', text: `GraphQL request failed: HTTP ${response.status} ${response.statusText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Monte Carlo returned non-JSON response (HTTP ${response.status})`); }
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
