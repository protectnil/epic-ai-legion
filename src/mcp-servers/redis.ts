/**
 * Redis (Upstash REST API) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface RedisConfig {
  endpoint: string;
  token: string;
}

export class RedisMCPServer {
  private config: RedisConfig;
  private baseUrl: string;

  constructor(config: RedisConfig) {
    this.config = config;
    this.baseUrl = `https://${config.endpoint}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get',
        description: 'Get the value of a key',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Key to retrieve' },
          },
          required: ['key'],
        },
      },
      {
        name: 'set',
        description: 'Set the value of a key with optional expiry',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Key to set' },
            value: { type: 'string', description: 'Value to store' },
            ex: { type: 'number', description: 'Expiry in seconds' },
            px: { type: 'number', description: 'Expiry in milliseconds' },
            nx: { type: 'boolean', description: 'Only set if key does not exist' },
            xx: { type: 'boolean', description: 'Only set if key already exists' },
          },
          required: ['key', 'value'],
        },
      },
      {
        name: 'del',
        description: 'Delete one or more keys',
        inputSchema: {
          type: 'object',
          properties: {
            keys: { type: 'array', description: 'Keys to delete', items: { type: 'string' } },
          },
          required: ['keys'],
        },
      },
      {
        name: 'scan',
        description: 'Incrementally iterate keys matching a pattern using SCAN (non-blocking)',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: { type: 'number', description: 'Cursor position; start at 0' },
            match: { type: 'string', description: 'Glob-style pattern (e.g. user:*)' },
            count: { type: 'number', description: 'Hint for number of elements to return per call' },
          },
          required: ['cursor'],
        },
      },
      {
        name: 'hgetall',
        description: 'Get all fields and values of a hash',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Hash key' },
          },
          required: ['key'],
        },
      },
      {
        name: 'hset',
        description: 'Set one or more fields on a hash',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Hash key' },
            fields: {
              type: 'object',
              description: 'Field-value pairs to set',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['key', 'fields'],
        },
      },
      {
        name: 'exists',
        description: 'Check whether one or more keys exist',
        inputSchema: {
          type: 'object',
          properties: {
            keys: { type: 'array', description: 'Keys to check', items: { type: 'string' } },
          },
          required: ['keys'],
        },
      },
      {
        name: 'expire',
        description: 'Set a timeout (TTL) on a key in seconds',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Key to set TTL on' },
            seconds: { type: 'number', description: 'Time-to-live in seconds' },
          },
          required: ['key', 'seconds'],
        },
      },
      {
        name: 'ttl',
        description: 'Get the remaining time-to-live for a key in seconds',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Key to check TTL for' },
          },
          required: ['key'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
    };

    try {
      let command: unknown[];

      switch (name) {
        case 'get': {
          command = ['GET', args.key];
          break;
        }
        case 'set': {
          command = ['SET', args.key, args.value];
          if (args.ex) command.push('EX', args.ex);
          if (args.px) command.push('PX', args.px);
          if (args.nx) command.push('NX');
          if (args.xx) command.push('XX');
          break;
        }
        case 'del': {
          command = ['DEL', ...(args.keys as string[])];
          break;
        }
        case 'scan': {
          command = ['SCAN', args.cursor ?? 0];
          if (args.match) command.push('MATCH', args.match);
          if (args.count) command.push('COUNT', args.count);
          break;
        }
        case 'hgetall': {
          command = ['HGETALL', args.key];
          break;
        }
        case 'hset': {
          const fields = args.fields as Record<string, string>;
          command = ['HSET', args.key];
          for (const [field, value] of Object.entries(fields)) {
            command.push(field, value);
          }
          break;
        }
        case 'exists': {
          command = ['EXISTS', ...(args.keys as string[])];
          break;
        }
        case 'expire': {
          command = ['EXPIRE', args.key, args.seconds];
          break;
        }
        case 'ttl': {
          command = ['TTL', args.key];
          break;
        }
        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
            isError: true,
          };
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(command),
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
