/** Anthropic Claude API MCP Adapter / Built on the Epic AI® Intelligence Platform / Copyright 2026 protectNIL Inc. Apache-2.0 */

import { ToolDefinition, ToolResult } from './types.js';

interface AnthropicConfig {
  apiKey: string;
  baseUrl?: string;
}

export class AnthropicMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: AnthropicConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.anthropic.com/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_message',
        description: 'Create a message using the Anthropic Messages API (POST /v1/messages)',
        inputSchema: {
          type: 'object',
          properties: {
            model: { type: 'string', description: 'Model ID (e.g. claude-opus-4-6)' },
            messages: { type: 'array', description: 'Array of message objects' },
            max_tokens: { type: 'number', description: 'Maximum tokens to generate' },
            system: { type: 'string', description: 'System prompt' },
          },
          required: ['model', 'messages', 'max_tokens'],
        },
      },
      {
        name: 'list_models',
        description: 'List available Anthropic models (GET /v1/models)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'count_tokens',
        description: 'Count tokens for a given prompt without creating a message (POST /v1/messages/count_tokens)',
        inputSchema: {
          type: 'object',
          properties: {
            model: { type: 'string', description: 'Model ID' },
            messages: { type: 'array', description: 'Array of message objects' },
            system: { type: 'string', description: 'System prompt' },
          },
          required: ['model', 'messages'],
        },
      },
      {
        name: 'create_message_batch',
        description: 'Create a message batch for async processing of multiple requests (POST /v1/messages/batches)',
        inputSchema: {
          type: 'object',
          properties: {
            requests: {
              type: 'array',
              description: 'Array of batch request objects, each with a custom_id and params (model, messages, max_tokens, etc.)',
            },
          },
          required: ['requests'],
        },
      },
      {
        name: 'list_message_batches',
        description: 'List message batches (GET /v1/messages/batches)',
        inputSchema: {
          type: 'object',
          properties: {
            before_id: { type: 'string', description: 'Cursor for pagination — return batches before this ID' },
            limit: { type: 'number', description: 'Number of batches to return (1–100)' },
          },
          required: [],
        },
      },
      {
        name: 'get_message_batch',
        description: 'Retrieve a single message batch by ID (GET /v1/messages/batches/{batch_id})',
        inputSchema: {
          type: 'object',
          properties: {
            batch_id: { type: 'string', description: 'ID of the message batch to retrieve' },
          },
          required: ['batch_id'],
        },
      },
      {
        name: 'cancel_message_batch',
        description: 'Cancel an in-progress message batch (DELETE /v1/messages/batches/{batch_id})',
        inputSchema: {
          type: 'object',
          properties: {
            batch_id: { type: 'string', description: 'ID of the message batch to cancel' },
          },
          required: ['batch_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    };

    try {
      let response: Response;

      switch (name) {
        case 'create_message': {
          response = await fetch(`${this.baseUrl}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: args.model,
              messages: args.messages,
              max_tokens: args.max_tokens,
              ...(args.system !== undefined && { system: args.system }),
            }),
          });
          break;
        }
        case 'list_models': {
          response = await fetch(`${this.baseUrl}/models`, { headers });
          break;
        }
        case 'count_tokens': {
          response = await fetch(`${this.baseUrl}/messages/count_tokens`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: args.model,
              messages: args.messages,
              ...(args.system !== undefined && { system: args.system }),
            }),
          });
          break;
        }
        case 'create_message_batch': {
          response = await fetch(`${this.baseUrl}/messages/batches`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ requests: args.requests }),
          });
          break;
        }
        case 'list_message_batches': {
          const params = new URLSearchParams();
          if (args.before_id !== undefined) params.set('before_id', String(args.before_id));
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          const qs = params.toString();
          response = await fetch(`${this.baseUrl}/messages/batches${qs ? `?${qs}` : ''}`, { headers });
          break;
        }
        case 'get_message_batch': {
          response = await fetch(`${this.baseUrl}/messages/batches/${String(args.batch_id)}`, { headers });
          break;
        }
        case 'cancel_message_batch': {
          response = await fetch(`${this.baseUrl}/messages/batches/${String(args.batch_id)}`, {
            method: 'DELETE',
            headers,
          });
          break;
        }
        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
            isError: true,
          };
      }

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new Error(`Non-JSON response (HTTP ${response.status})`);
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        isError: false,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }],
        isError: true,
      };
    }
  }
}
