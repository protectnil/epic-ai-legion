/**
 * ClickHouse MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/ClickHouse/mcp-clickhouse — actively maintained official MCP server from ClickHouse Inc. If you are not running air-gapped or need the full official toolset, the official MCP server is the recommended choice. Our adapter is a lightweight self-hosted fallback that uses the HTTP interface directly with X-ClickHouse-User / X-ClickHouse-Key header authentication.

import { ToolDefinition, ToolResult } from './types.js';

interface ClickHouseConfig {
  host: string;
  user: string;
  password: string;
  /** Default database to query. Can be overridden per-call. Defaults to "default". */
  database?: string;
  /** Override the full base URL including port and protocol.
   *  Defaults to http://{host}:8123 for plain HTTP.
   *  Use https://{host}:8443 for TLS. */
  baseUrl?: string;
}

export class ClickHouseMCPServer {
  private readonly user: string;
  private readonly password: string;
  private readonly database: string;
  private readonly baseUrl: string;

  constructor(config: ClickHouseConfig) {
    this.user = config.user;
    this.password = config.password;
    this.database = config.database ?? 'default';
    this.baseUrl = config.baseUrl ?? `http://${config.host}:8123`;
  }

  private async executeQuery(
    query: string,
    database?: string,
    format: string = 'JSONCompact',
  ): Promise<Response> {
    const db = database ?? this.database;
    const url = `${this.baseUrl}/?database=${encodeURIComponent(db)}&default_format=${encodeURIComponent(format)}`;

    return fetch(url, {
      method: 'POST',
      headers: {
        'X-ClickHouse-User': this.user,
        'X-ClickHouse-Key': this.password,
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: query,
    });
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'run_query',
        description: 'Execute a SELECT query against ClickHouse and return results in JSONCompact format.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'SQL SELECT query to execute. Must be a read-only query (SELECT, SHOW, DESCRIBE, EXPLAIN, EXISTS).',
            },
            database: {
              type: 'string',
              description: 'Database to run the query against. Overrides the configured default.',
            },
            max_rows: {
              type: 'number',
              description: 'Append LIMIT to the query if not already present (max rows to return, default: 1000)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_databases',
        description: 'List all databases in the ClickHouse instance.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_tables',
        description: 'List all tables in a database, with column counts and engine types.',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Database name to list tables from. Defaults to the configured default database.',
            },
          },
        },
      },
      {
        name: 'describe_table',
        description: 'Return the schema (column names, types, defaults, compression codecs) for a specific table.',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name to describe',
            },
            database: {
              type: 'string',
              description: 'Database that contains the table. Defaults to the configured default database.',
            },
          },
          required: ['table'],
        },
      },
      {
        name: 'show_create_table',
        description: 'Return the CREATE TABLE DDL statement for a specific table, including engine, partition key, order key, and settings.',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name',
            },
            database: {
              type: 'string',
              description: 'Database that contains the table. Defaults to the configured default database.',
            },
          },
          required: ['table'],
        },
      },
      {
        name: 'get_table_stats',
        description: 'Return row count, compressed size, and uncompressed size for a table from system.parts.',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name',
            },
            database: {
              type: 'string',
              description: 'Database that contains the table. Defaults to the configured default database.',
            },
          },
          required: ['table'],
        },
      },
      {
        name: 'get_running_queries',
        description: 'List currently running queries from system.processes, including elapsed time, memory usage, and query text.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of running queries to return (default: 50)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'run_query': {
          let query = (args.query as string)?.trim();
          if (!query) {
            return { content: [{ type: 'text', text: 'query is required' }], isError: true };
          }

          const upperQuery = query.toUpperCase().replace(/\s+/g, ' ').trimStart();
          const allowedPrefixes = ['SELECT', 'SHOW', 'DESCRIBE', 'DESC ', 'EXPLAIN', 'EXISTS', 'WITH'];
          const isReadOnly = allowedPrefixes.some(prefix => upperQuery.startsWith(prefix));
          if (!isReadOnly) {
            return { content: [{ type: 'text', text: 'Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN, EXISTS) are permitted' }], isError: true };
          }

          const maxRows = (args.max_rows as number) ?? 1000;
          const hasLimit = /\bLIMIT\b/i.test(query);
          if (!hasLimit) {
            query = `${query} LIMIT ${maxRows}`;
          }

          const database = (args.database as string) ?? undefined;
          const response = await this.executeQuery(query, database);

          if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Query failed: HTTP ${response.status} — ${errorText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ClickHouse returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_databases': {
          const response = await this.executeQuery('SHOW DATABASES');

          if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to list databases: HTTP ${response.status} — ${errorText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ClickHouse returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_tables': {
          const database = (args.database as string) ?? this.database;

          const query = `
            SELECT
              name,
              engine,
              total_columns,
              formatReadableSize(total_bytes) AS size_on_disk,
              formatReadableQuantity(total_rows) AS row_count_approx
            FROM system.tables
            WHERE database = '${database.replace(/'/g, "\\'")}'
            ORDER BY name
          `;

          const response = await this.executeQuery(query);

          if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to list tables: HTTP ${response.status} — ${errorText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ClickHouse returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'describe_table': {
          const table = args.table as string;
          if (!table) {
            return { content: [{ type: 'text', text: 'table is required' }], isError: true };
          }

          const database = (args.database as string) ?? this.database;
          const query = `DESCRIBE TABLE \`${database.replace(/`/g, '')}\`.\`${table.replace(/`/g, '')}\``;

          const response = await this.executeQuery(query);

          if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to describe table: HTTP ${response.status} — ${errorText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ClickHouse returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'show_create_table': {
          const table = args.table as string;
          if (!table) {
            return { content: [{ type: 'text', text: 'table is required' }], isError: true };
          }

          const database = (args.database as string) ?? this.database;
          const query = `SHOW CREATE TABLE \`${database.replace(/`/g, '')}\`.\`${table.replace(/`/g, '')}\``;

          const response = await this.executeQuery(query, undefined, 'TabSeparated');

          if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to show create table: HTTP ${response.status} — ${errorText}` }], isError: true };
          }

          const text = await response.text();
          return { content: [{ type: 'text', text: text }], isError: false };
        }

        case 'get_table_stats': {
          const table = args.table as string;
          if (!table) {
            return { content: [{ type: 'text', text: 'table is required' }], isError: true };
          }

          const database = (args.database as string) ?? this.database;

          const query = `
            SELECT
              database,
              table,
              formatReadableQuantity(sum(rows)) AS total_rows,
              formatReadableSize(sum(bytes_on_disk)) AS compressed_size,
              formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed_size,
              count() AS part_count
            FROM system.parts
            WHERE active = 1
              AND database = '${database.replace(/'/g, "\\'")}'
              AND table = '${table.replace(/'/g, "\\'")}'
            GROUP BY database, table
          `;

          const response = await this.executeQuery(query);

          if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to get table stats: HTTP ${response.status} — ${errorText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ClickHouse returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_running_queries': {
          const limit = (args.limit as number) ?? 50;

          const query = `
            SELECT
              query_id,
              user,
              elapsed,
              formatReadableSize(memory_usage) AS memory_usage,
              read_rows,
              read_bytes,
              total_rows_approx,
              query
            FROM system.processes
            ORDER BY elapsed DESC
            LIMIT ${limit}
          `;

          const response = await this.executeQuery(query);

          if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to get running queries: HTTP ${response.status} — ${errorText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`ClickHouse returned non-JSON response (HTTP ${response.status})`); }
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
