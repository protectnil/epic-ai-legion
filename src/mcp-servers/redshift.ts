/**
 * AWS Redshift MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/awslabs/mcp/tree/main/src/redshift-mcp-server — official AWS Labs
// implementation (Python-based). That server requires a Python runtime and AWS SDK installation.
// This adapter serves the TypeScript/self-hosted use case. Uses the Redshift Data API via HTTP
// with AWS Signature Version 4 signing handled by the caller-supplied pre-signed or SigV4 token.

// Redshift Data API base URL: https://redshift-data.{region}.amazonaws.com
// Auth: AWS Signature Version 4 (SigV4). This adapter accepts a pre-signed Authorization header
//   string so it can integrate with any SigV4 signing library (e.g. @aws-sdk/signature-v4).
//   Alternatively, pass AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY via environment and use the
//   aws4 npm package to sign requests before calling callTool.
// All operations are HTTP POST to the regional endpoint with X-Amz-Target header.
// Ref: https://docs.aws.amazon.com/redshift-data/latest/APIReference/Welcome.html

import { ToolDefinition, ToolResult } from './types.js';

interface RedshiftConfig {
  /** AWS region, e.g. "us-east-1" */
  region: string;
  /**
   * A function that returns signed headers for a given request body and target action.
   * This decouples SigV4 signing from the adapter — callers supply their own signer
   * (e.g. aws4, @aws-sdk/signature-v4, or a pre-signed token for testing).
   */
  signRequest: (target: string, body: string) => Promise<Record<string, string>>;
}

export class RedshiftMCPServer {
  private readonly endpoint: string;
  private readonly signRequest: RedshiftConfig['signRequest'];

  constructor(config: RedshiftConfig) {
    this.endpoint = `https://redshift-data.${config.region}.amazonaws.com`;
    this.signRequest = config.signRequest;
  }

  private async post(target: string, body: Record<string, unknown>): Promise<ToolResult> {
    const bodyStr = JSON.stringify(body);
    const sigHeaders = await this.signRequest(target, bodyStr);

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': target,
      Accept: 'application/json',
      ...sigHeaders,
    };

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: bodyStr,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Redshift Data API error: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Redshift returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_databases',
        description: 'List the databases in a Redshift cluster or serverless workgroup.',
        inputSchema: {
          type: 'object',
          properties: {
            ClusterIdentifier: {
              type: 'string',
              description: 'Provisioned cluster identifier. Provide either this or WorkgroupName.',
            },
            WorkgroupName: {
              type: 'string',
              description: 'Serverless workgroup name. Provide either this or ClusterIdentifier.',
            },
            Database: {
              type: 'string',
              description: 'Name of the database to connect to when listing.',
            },
            SecretArn: {
              type: 'string',
              description: 'ARN of the Secrets Manager secret containing database credentials.',
            },
            DbUser: {
              type: 'string',
              description: 'Database user name (used with temporary credentials, not SecretArn).',
            },
            MaxResults: {
              type: 'number',
              description: 'Maximum number of databases to return.',
            },
            NextToken: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
        },
      },
      {
        name: 'list_schemas',
        description: 'List the schemas in a Redshift database.',
        inputSchema: {
          type: 'object',
          properties: {
            ClusterIdentifier: {
              type: 'string',
              description: 'Provisioned cluster identifier. Provide either this or WorkgroupName.',
            },
            WorkgroupName: {
              type: 'string',
              description: 'Serverless workgroup name. Provide either this or ClusterIdentifier.',
            },
            Database: {
              type: 'string',
              description: 'Name of the database whose schemas to list.',
            },
            SecretArn: {
              type: 'string',
              description: 'ARN of the Secrets Manager secret.',
            },
            DbUser: {
              type: 'string',
              description: 'Database user name for temporary credentials.',
            },
            SchemaPattern: {
              type: 'string',
              description: 'Filter pattern for schema names (SQL LIKE syntax).',
            },
            MaxResults: {
              type: 'number',
              description: 'Maximum number of schemas to return.',
            },
            NextToken: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
          required: ['Database'],
        },
      },
      {
        name: 'list_tables',
        description: 'List tables in a Redshift database and schema.',
        inputSchema: {
          type: 'object',
          properties: {
            ClusterIdentifier: {
              type: 'string',
              description: 'Provisioned cluster identifier. Provide either this or WorkgroupName.',
            },
            WorkgroupName: {
              type: 'string',
              description: 'Serverless workgroup name. Provide either this or ClusterIdentifier.',
            },
            Database: {
              type: 'string',
              description: 'Name of the database.',
            },
            SchemaPattern: {
              type: 'string',
              description: 'Filter pattern for schema names.',
            },
            TablePattern: {
              type: 'string',
              description: 'Filter pattern for table names (SQL LIKE syntax).',
            },
            SecretArn: {
              type: 'string',
              description: 'ARN of the Secrets Manager secret.',
            },
            DbUser: {
              type: 'string',
              description: 'Database user name for temporary credentials.',
            },
            MaxResults: {
              type: 'number',
              description: 'Maximum number of tables to return.',
            },
            NextToken: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
          required: ['Database'],
        },
      },
      {
        name: 'execute_statement',
        description: 'Execute a SQL statement against a Redshift cluster or serverless workgroup. Returns a statement ID — use describe_statement and get_statement_result to retrieve results.',
        inputSchema: {
          type: 'object',
          properties: {
            ClusterIdentifier: {
              type: 'string',
              description: 'Provisioned cluster identifier. Provide either this or WorkgroupName.',
            },
            WorkgroupName: {
              type: 'string',
              description: 'Serverless workgroup name. Provide either this or ClusterIdentifier.',
            },
            Database: {
              type: 'string',
              description: 'Name of the database to run the statement against.',
            },
            Sql: {
              type: 'string',
              description: 'SQL statement to execute.',
            },
            SecretArn: {
              type: 'string',
              description: 'ARN of the Secrets Manager secret for credentials.',
            },
            DbUser: {
              type: 'string',
              description: 'Database user name for temporary credentials.',
            },
            StatementName: {
              type: 'string',
              description: 'Optional label for the statement to aid identification.',
            },
            WithEvent: {
              type: 'boolean',
              description: 'If true, send an event to EventBridge when the statement finishes.',
            },
          },
          required: ['Database', 'Sql'],
        },
      },
      {
        name: 'describe_statement',
        description: 'Retrieve the metadata and execution status of a previously submitted SQL statement.',
        inputSchema: {
          type: 'object',
          properties: {
            Id: {
              type: 'string',
              description: 'Statement ID returned by execute_statement.',
            },
          },
          required: ['Id'],
        },
      },
      {
        name: 'get_statement_result',
        description: 'Fetch the result rows of a completed SQL statement execution.',
        inputSchema: {
          type: 'object',
          properties: {
            Id: {
              type: 'string',
              description: 'Statement ID of the completed execution.',
            },
            NextToken: {
              type: 'string',
              description: 'Pagination token to retrieve the next page of results.',
            },
          },
          required: ['Id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_databases': {
          const body: Record<string, unknown> = {};
          if (args.ClusterIdentifier) body.ClusterIdentifier = args.ClusterIdentifier;
          if (args.WorkgroupName) body.WorkgroupName = args.WorkgroupName;
          if (args.Database) body.Database = args.Database;
          if (args.SecretArn) body.SecretArn = args.SecretArn;
          if (args.DbUser) body.DbUser = args.DbUser;
          if (args.MaxResults) body.MaxResults = args.MaxResults;
          if (args.NextToken) body.NextToken = args.NextToken;

          return this.post('RedshiftData.ListDatabases', body);
        }

        case 'list_schemas': {
          const database = args.Database as string;
          if (!database) {
            return { content: [{ type: 'text', text: 'Database is required' }], isError: true };
          }

          const body: Record<string, unknown> = { Database: database };
          if (args.ClusterIdentifier) body.ClusterIdentifier = args.ClusterIdentifier;
          if (args.WorkgroupName) body.WorkgroupName = args.WorkgroupName;
          if (args.SecretArn) body.SecretArn = args.SecretArn;
          if (args.DbUser) body.DbUser = args.DbUser;
          if (args.SchemaPattern) body.SchemaPattern = args.SchemaPattern;
          if (args.MaxResults) body.MaxResults = args.MaxResults;
          if (args.NextToken) body.NextToken = args.NextToken;

          return this.post('RedshiftData.ListSchemas', body);
        }

        case 'list_tables': {
          const database = args.Database as string;
          if (!database) {
            return { content: [{ type: 'text', text: 'Database is required' }], isError: true };
          }

          const body: Record<string, unknown> = { Database: database };
          if (args.ClusterIdentifier) body.ClusterIdentifier = args.ClusterIdentifier;
          if (args.WorkgroupName) body.WorkgroupName = args.WorkgroupName;
          if (args.SecretArn) body.SecretArn = args.SecretArn;
          if (args.DbUser) body.DbUser = args.DbUser;
          if (args.SchemaPattern) body.SchemaPattern = args.SchemaPattern;
          if (args.TablePattern) body.TablePattern = args.TablePattern;
          if (args.MaxResults) body.MaxResults = args.MaxResults;
          if (args.NextToken) body.NextToken = args.NextToken;

          return this.post('RedshiftData.ListTables', body);
        }

        case 'execute_statement': {
          const database = args.Database as string;
          const sql = args.Sql as string;
          if (!database || !sql) {
            return { content: [{ type: 'text', text: 'Database and Sql are required' }], isError: true };
          }

          const body: Record<string, unknown> = { Database: database, Sql: sql };
          if (args.ClusterIdentifier) body.ClusterIdentifier = args.ClusterIdentifier;
          if (args.WorkgroupName) body.WorkgroupName = args.WorkgroupName;
          if (args.SecretArn) body.SecretArn = args.SecretArn;
          if (args.DbUser) body.DbUser = args.DbUser;
          if (args.StatementName) body.StatementName = args.StatementName;
          if (typeof args.WithEvent === 'boolean') body.WithEvent = args.WithEvent;

          return this.post('RedshiftData.ExecuteStatement', body);
        }

        case 'describe_statement': {
          const id = args.Id as string;
          if (!id) {
            return { content: [{ type: 'text', text: 'Id is required' }], isError: true };
          }
          return this.post('RedshiftData.DescribeStatement', { Id: id });
        }

        case 'get_statement_result': {
          const id = args.Id as string;
          if (!id) {
            return { content: [{ type: 'text', text: 'Id is required' }], isError: true };
          }
          const body: Record<string, unknown> = { Id: id };
          if (args.NextToken) body.NextToken = args.NextToken;
          return this.post('RedshiftData.GetStatementResult', body);
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
