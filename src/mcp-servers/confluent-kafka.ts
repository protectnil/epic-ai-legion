/**
 * Confluent MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/confluentinc/mcp-confluent — 24 tools, actively maintained,
// self-hostable via npx, API key auth for HTTP/SSE transports.
// This adapter serves as a lightweight self-hosted fallback for air-gapped deployments and
// environments requiring direct REST API access without the mcp-confluent Node.js runtime.

import { ToolDefinition, ToolResult } from './types.js';

interface ConfluentConfig {
  /**
   * Confluent Cloud API key ID. Used as the username for HTTP Basic auth.
   * This is a Cloud-level API key (not a Kafka resource-level key).
   * Create at: Confluent Cloud Console → API Keys → Cloud resource API key.
   */
  apiKey: string;
  /**
   * Confluent Cloud API key secret. Used as the password for HTTP Basic auth.
   */
  apiSecret: string;
  /**
   * Confluent Cloud control plane base URL.
   * Defaults to https://api.confluent.cloud
   */
  baseUrl?: string;
  /**
   * Per-cluster Kafka REST Proxy endpoint for data-plane topic operations.
   * Format: https://<cluster-id>.<region>.<cloud>.confluent.cloud:443
   * Required for list_topics, produce_records, and consume_records tools.
   * Find this in: Confluent Cloud Console → Cluster → Cluster Settings → Endpoints.
   */
  kafkaRestEndpoint?: string;
  /**
   * Kafka cluster ID. Required for topic operations via the Kafka REST Proxy.
   * Format: lkc-xxxxxx. Find in: Confluent Cloud Console → Cluster → Cluster Settings.
   */
  kafkaClusterId?: string;
  /**
   * Kafka resource-scoped API key for authenticating to the Kafka REST Proxy.
   * This must be a resource-specific key for the target Kafka cluster,
   * NOT the Cloud-level API key used for control plane operations.
   */
  kafkaApiKey?: string;
  /**
   * Kafka resource-scoped API secret for the Kafka REST Proxy.
   */
  kafkaApiSecret?: string;
}

export class ConfluentKafkaMCPServer {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;
  private readonly kafkaRestEndpoint: string | undefined;
  private readonly kafkaClusterId: string | undefined;
  private readonly kafkaApiKey: string | undefined;
  private readonly kafkaApiSecret: string | undefined;

  constructor(config: ConfluentConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = (config.baseUrl || 'https://api.confluent.cloud').replace(/\/$/, '');
    this.kafkaRestEndpoint = config.kafkaRestEndpoint?.replace(/\/$/, '');
    this.kafkaClusterId = config.kafkaClusterId;
    this.kafkaApiKey = config.kafkaApiKey;
    this.kafkaApiSecret = config.kafkaApiSecret;
  }

  /**
   * Build HTTP Basic auth header.
   * Confluent Cloud REST API authenticates with API key ID as username
   * and API key secret as password, base64-encoded.
   */
  private basicAuth(key: string, secret: string): string {
    return `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_environments',
        description: 'List all Confluent Cloud environments in the organization',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Maximum number of environments per page (max 100, default: 10)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'list_kafka_clusters',
        description: 'List Kafka clusters in a Confluent Cloud environment',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'The environment ID (e.g. env-xxxxx) to list clusters for',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of clusters per page (max 100, default: 10)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['environment_id'],
        },
      },
      {
        name: 'get_kafka_cluster',
        description: 'Get details of a specific Kafka cluster by ID',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'The Kafka cluster ID (e.g. lkc-xxxxxx)',
            },
            environment_id: {
              type: 'string',
              description: 'The environment ID containing the cluster',
            },
          },
          required: ['cluster_id', 'environment_id'],
        },
      },
      {
        name: 'list_topics',
        description: 'List Kafka topics in a cluster via the Kafka REST Proxy. Requires kafkaRestEndpoint and kafkaClusterId config.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_topic',
        description: 'Create a new Kafka topic in the configured cluster via the Kafka REST Proxy. Requires kafkaRestEndpoint and kafkaClusterId config.',
        inputSchema: {
          type: 'object',
          properties: {
            topic_name: {
              type: 'string',
              description: 'Name of the topic to create',
            },
            partitions_count: {
              type: 'number',
              description: 'Number of partitions (default: 6)',
            },
            replication_factor: {
              type: 'number',
              description: 'Replication factor (default: 3 for Confluent Cloud)',
            },
            configs: {
              type: 'array',
              description: 'Array of topic config objects, e.g. [{"name": "retention.ms", "value": "604800000"}]',
            },
          },
          required: ['topic_name'],
        },
      },
      {
        name: 'delete_topic',
        description: 'Delete a Kafka topic from the configured cluster via the Kafka REST Proxy. Requires kafkaRestEndpoint and kafkaClusterId config.',
        inputSchema: {
          type: 'object',
          properties: {
            topic_name: {
              type: 'string',
              description: 'Name of the topic to delete',
            },
          },
          required: ['topic_name'],
        },
      },
      {
        name: 'list_connectors',
        description: 'List connectors in a Confluent Cloud environment and cluster',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'The environment ID (e.g. env-xxxxx)',
            },
            cluster_id: {
              type: 'string',
              description: 'The Kafka cluster ID (e.g. lkc-xxxxxx)',
            },
          },
          required: ['environment_id', 'cluster_id'],
        },
      },
      {
        name: 'get_connector',
        description: 'Get details and status of a specific connector',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'The environment ID (e.g. env-xxxxx)',
            },
            cluster_id: {
              type: 'string',
              description: 'The Kafka cluster ID (e.g. lkc-xxxxxx)',
            },
            connector_name: {
              type: 'string',
              description: 'The connector name',
            },
          },
          required: ['environment_id', 'cluster_id', 'connector_name'],
        },
      },
      {
        name: 'pause_connector',
        description: 'Pause a running connector',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'The environment ID (e.g. env-xxxxx)',
            },
            cluster_id: {
              type: 'string',
              description: 'The Kafka cluster ID (e.g. lkc-xxxxxx)',
            },
            connector_name: {
              type: 'string',
              description: 'The connector name to pause',
            },
          },
          required: ['environment_id', 'cluster_id', 'connector_name'],
        },
      },
      {
        name: 'resume_connector',
        description: 'Resume a paused connector',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'The environment ID (e.g. env-xxxxx)',
            },
            cluster_id: {
              type: 'string',
              description: 'The Kafka cluster ID (e.g. lkc-xxxxxx)',
            },
            connector_name: {
              type: 'string',
              description: 'The connector name to resume',
            },
          },
          required: ['environment_id', 'cluster_id', 'connector_name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const controlPlaneHeaders: Record<string, string> = {
        Authorization: this.basicAuth(this.apiKey, this.apiSecret),
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_environments': {
          const pageSize = (args.page_size as number) || 10;
          let url = `${this.baseUrl}/org/v2/environments?page_size=${pageSize}`;
          if (args.page_token) url += `&page_token=${encodeURIComponent(args.page_token as string)}`;

          const response = await fetch(url, { method: 'GET', headers: controlPlaneHeaders });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list environments: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Confluent returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_kafka_clusters': {
          const environmentId = args.environment_id as string;

          if (!environmentId) {
            return {
              content: [{ type: 'text', text: 'environment_id is required' }],
              isError: true,
            };
          }

          const pageSize = (args.page_size as number) || 10;
          let url = `${this.baseUrl}/cmk/v2/clusters?environment=${encodeURIComponent(environmentId)}&page_size=${pageSize}`;
          if (args.page_token) url += `&page_token=${encodeURIComponent(args.page_token as string)}`;

          const response = await fetch(url, { method: 'GET', headers: controlPlaneHeaders });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list Kafka clusters: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Confluent returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_kafka_cluster': {
          const clusterId = args.cluster_id as string;
          const environmentId = args.environment_id as string;

          if (!clusterId || !environmentId) {
            return {
              content: [{ type: 'text', text: 'cluster_id and environment_id are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/cmk/v2/clusters/${encodeURIComponent(clusterId)}?environment=${encodeURIComponent(environmentId)}`,
            { method: 'GET', headers: controlPlaneHeaders }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get Kafka cluster: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Confluent returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_topics': {
          if (!this.kafkaRestEndpoint || !this.kafkaClusterId) {
            return {
              content: [{ type: 'text', text: 'kafkaRestEndpoint and kafkaClusterId must be set in config for topic operations' }],
              isError: true,
            };
          }

          const kafkaKey = this.kafkaApiKey || this.apiKey;
          const kafkaSecret = this.kafkaApiSecret || this.apiSecret;
          const kafkaHeaders: Record<string, string> = {
            Authorization: this.basicAuth(kafkaKey, kafkaSecret),
            'Content-Type': 'application/json',
          };

          const response = await fetch(
            `${this.kafkaRestEndpoint}/kafka/v3/clusters/${encodeURIComponent(this.kafkaClusterId)}/topics`,
            { method: 'GET', headers: kafkaHeaders }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list topics: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Confluent returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_topic': {
          if (!this.kafkaRestEndpoint || !this.kafkaClusterId) {
            return {
              content: [{ type: 'text', text: 'kafkaRestEndpoint and kafkaClusterId must be set in config for topic operations' }],
              isError: true,
            };
          }

          const topicName = args.topic_name as string;

          if (!topicName) {
            return {
              content: [{ type: 'text', text: 'topic_name is required' }],
              isError: true,
            };
          }

          const kafkaKey = this.kafkaApiKey || this.apiKey;
          const kafkaSecret = this.kafkaApiSecret || this.apiSecret;
          const kafkaHeaders: Record<string, string> = {
            Authorization: this.basicAuth(kafkaKey, kafkaSecret),
            'Content-Type': 'application/json',
          };

          const body: Record<string, unknown> = {
            topic_name: topicName,
            partitions_count: (args.partitions_count as number) || 6,
            replication_factor: (args.replication_factor as number) || 3,
          };
          if (args.configs) body.configs = args.configs;

          const response = await fetch(
            `${this.kafkaRestEndpoint}/kafka/v3/clusters/${encodeURIComponent(this.kafkaClusterId)}/topics`,
            { method: 'POST', headers: kafkaHeaders, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create topic: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Confluent returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'delete_topic': {
          if (!this.kafkaRestEndpoint || !this.kafkaClusterId) {
            return {
              content: [{ type: 'text', text: 'kafkaRestEndpoint and kafkaClusterId must be set in config for topic operations' }],
              isError: true,
            };
          }

          const topicName = args.topic_name as string;

          if (!topicName) {
            return {
              content: [{ type: 'text', text: 'topic_name is required' }],
              isError: true,
            };
          }

          const kafkaKey = this.kafkaApiKey || this.apiKey;
          const kafkaSecret = this.kafkaApiSecret || this.apiSecret;
          const kafkaHeaders: Record<string, string> = {
            Authorization: this.basicAuth(kafkaKey, kafkaSecret),
            'Content-Type': 'application/json',
          };

          const response = await fetch(
            `${this.kafkaRestEndpoint}/kafka/v3/clusters/${encodeURIComponent(this.kafkaClusterId)}/topics/${encodeURIComponent(topicName)}`,
            { method: 'DELETE', headers: kafkaHeaders }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to delete topic: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return {
            content: [{ type: 'text', text: `Topic "${topicName}" deleted successfully (HTTP ${response.status})` }],
            isError: false,
          };
        }

        case 'list_connectors': {
          const environmentId = args.environment_id as string;
          const clusterId = args.cluster_id as string;

          if (!environmentId || !clusterId) {
            return {
              content: [{ type: 'text', text: 'environment_id and cluster_id are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/connect/v1/environments/${encodeURIComponent(environmentId)}/clusters/${encodeURIComponent(clusterId)}/connectors`,
            { method: 'GET', headers: controlPlaneHeaders }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list connectors: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Confluent returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_connector': {
          const environmentId = args.environment_id as string;
          const clusterId = args.cluster_id as string;
          const connectorName = args.connector_name as string;

          if (!environmentId || !clusterId || !connectorName) {
            return {
              content: [{ type: 'text', text: 'environment_id, cluster_id, and connector_name are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/connect/v1/environments/${encodeURIComponent(environmentId)}/clusters/${encodeURIComponent(clusterId)}/connectors/${encodeURIComponent(connectorName)}/status`,
            { method: 'GET', headers: controlPlaneHeaders }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get connector: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Confluent returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'pause_connector': {
          const environmentId = args.environment_id as string;
          const clusterId = args.cluster_id as string;
          const connectorName = args.connector_name as string;

          if (!environmentId || !clusterId || !connectorName) {
            return {
              content: [{ type: 'text', text: 'environment_id, cluster_id, and connector_name are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/connect/v1/environments/${encodeURIComponent(environmentId)}/clusters/${encodeURIComponent(clusterId)}/connectors/${encodeURIComponent(connectorName)}/pause`,
            { method: 'PUT', headers: controlPlaneHeaders }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to pause connector: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return {
            content: [{ type: 'text', text: `Connector "${connectorName}" paused successfully (HTTP ${response.status})` }],
            isError: false,
          };
        }

        case 'resume_connector': {
          const environmentId = args.environment_id as string;
          const clusterId = args.cluster_id as string;
          const connectorName = args.connector_name as string;

          if (!environmentId || !clusterId || !connectorName) {
            return {
              content: [{ type: 'text', text: 'environment_id, cluster_id, and connector_name are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/connect/v1/environments/${encodeURIComponent(environmentId)}/clusters/${encodeURIComponent(clusterId)}/connectors/${encodeURIComponent(connectorName)}/resume`,
            { method: 'PUT', headers: controlPlaneHeaders }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to resume connector: HTTP ${response.status} ${response.statusText}` }],
              isError: true,
            };
          }

          return {
            content: [{ type: 'text', text: `Connector "${connectorName}" resumed successfully (HTTP ${response.status})` }],
            isError: false,
          };
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
