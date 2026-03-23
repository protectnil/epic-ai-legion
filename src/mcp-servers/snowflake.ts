/**
 * Snowflake MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface SnowflakeConfig {
  account: string;
  token: string;
  warehouse?: string;
  database?: string;
  schema?: string;
  role?: string;
}

/**
 * Sanitize a LIKE pattern: allow alphanumerics, underscores, hyphens, dots,
 * and the SQL wildcard characters % and _. All other characters are stripped.
 * This prevents injection via the LIKE clause in SHOW commands.
 */
function sanitizeLike(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[^A-Za-z0-9_%.\-]/g, '');
}

/**
 * Sanitize a Snowflake object identifier (database, schema, table name).
 * Snowflake unquoted identifiers are alphanumeric + underscore. Strip everything
 * else so the value is safe to embed inside double-quoted SQL identifiers.
 */
function sanitizeIdentifier(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[^A-Za-z0-9_]/g, '');
}

/**
 * Sanitize a Snowflake statement handle, which is a UUID.
 * Allow only hex digits and hyphens.
 */
function sanitizeHandle(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[^A-Fa-f0-9\-]/g, '');
}

export class SnowflakeMCPServer {
  private config: SnowflakeConfig;
  private baseUrl: string;

  constructor(config: SnowflakeConfig) {
    this.config = config;
    this.baseUrl = `https://${config.account}.snowflakecomputing.com/api/v2`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'execute_statement',
        description: 'Execute a SQL statement in Snowflake',
        inputSchema: {
          type: 'object',
          properties: {
            statement: { type: 'string', description: 'SQL statement to execute' },
            timeout: { type: 'number', description: 'Execution timeout in seconds' },
            warehouse: { type: 'string', description: 'Warehouse to use' },
            database: { type: 'string', description: 'Database context' },
            schema: { type: 'string', description: 'Schema context' },
            role: { type: 'string', description: 'Role to use' },
          },
          required: ['statement'],
        },
      },
      {
        name: 'get_statement_status',
        description: 'Get the status of an asynchronous statement execution',
        inputSchema: {
          type: 'object',
          properties: {
            statementHandle: { type: 'string', description: 'Statement handle from execute_statement' },
          },
          required: ['statementHandle'],
        },
      },
      {
        name: 'list_databases',
        description: 'List all databases accessible to the current role',
        inputSchema: {
          type: 'object',
          properties: {
            like: { type: 'string', description: 'Filter databases by name pattern' },
          },
        },
      },
      {
        name: 'list_schemas',
        description: 'List schemas within a database',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            like: { type: 'string', description: 'Filter schemas by name pattern' },
          },
          required: ['database'],
        },
      },
      {
        name: 'list_tables',
        description: 'List tables within a database and schema',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Schema name' },
            like: { type: 'string', description: 'Filter tables by name pattern' },
          },
          required: ['database', 'schema'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
      'X-Snowflake-Authorization-Token-Type': 'OAUTH',
      'Accept': 'application/json',
    };

    try {
      let url: string;
      let method: string;
      let body: unknown;

      switch (name) {
        case 'execute_statement': {
          url = `${this.baseUrl}/statements`;
          method = 'POST';
          body = {
            statement: args.statement,
            timeout: args.timeout ?? 60,
            warehouse: args.warehouse ?? this.config.warehouse,
            database: args.database ?? this.config.database,
            schema: args.schema ?? this.config.schema,
            role: args.role ?? this.config.role,
          };
          break;
        }
        case 'get_statement_status': {
          const handle = sanitizeHandle(args.statementHandle);
          url = `${this.baseUrl}/statements/${handle}`;
          method = 'GET';
          break;
        }
        case 'list_databases': {
          const like = sanitizeLike(args.like);
          const statement = like
            ? `SHOW DATABASES LIKE '${like}'`
            : 'SHOW DATABASES';
          url = `${this.baseUrl}/statements`;
          method = 'POST';
          body = { statement, timeout: 30 };
          break;
        }
        case 'list_schemas': {
          const like = sanitizeLike(args.like);
          const db = sanitizeIdentifier(args.database);
          const statement = like
            ? `SHOW SCHEMAS LIKE '${like}' IN DATABASE "${db}"`
            : `SHOW SCHEMAS IN DATABASE "${db}"`;
          url = `${this.baseUrl}/statements`;
          method = 'POST';
          body = { statement, timeout: 30, database: db };
          break;
        }
        case 'list_tables': {
          const like = sanitizeLike(args.like);
          const db = sanitizeIdentifier(args.database);
          const sc = sanitizeIdentifier(args.schema);
          const statement = like
            ? `SHOW TABLES LIKE '${like}' IN SCHEMA "${db}"."${sc}"`
            : `SHOW TABLES IN SCHEMA "${db}"."${sc}"`;
          url = `${this.baseUrl}/statements`;
          method = 'POST';
          body = { statement, timeout: 30, database: db, schema: sc };
          break;
        }
        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
            isError: true,
          };
      }

      const response = await fetch(url!, {
        method: method!,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = { status: response.status, statusText: response.statusText };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        isError: !response.ok,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }],
        isError: true,
      };
    }
  }
}
