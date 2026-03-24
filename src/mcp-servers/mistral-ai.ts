/**
 * Mistral AI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no official Mistral AI MCP server exists. Community servers (everaldo/mcp-mistral-ocr, bsmi021/mcp-mistral-codestral) cover narrow single-feature use cases only. This adapter provides the full Mistral REST API surface.

import { ToolDefinition, ToolResult } from './types.js';

interface MistralConfig {
  apiKey: string;
  baseUrl?: string;
}

export class MistralAIMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: MistralConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.mistral.ai/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'chat_completions',
        description: 'Generate a chat completion using a Mistral model. Supports multi-turn conversation, function calling, and JSON mode.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Mistral model ID (e.g. mistral-large-latest, mistral-small-latest, open-mistral-nemo, codestral-latest)',
            },
            messages: {
              type: 'array',
              description: 'Array of message objects with role (system|user|assistant|tool) and content fields.',
              items: { type: 'object' },
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature 0–1 (default: 0.7)',
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum number of tokens to generate',
            },
            top_p: {
              type: 'number',
              description: 'Top-p nucleus sampling value (0–1, default: 1)',
            },
            stop: {
              type: 'array',
              description: 'Array of stop sequences that halt generation when produced.',
              items: { type: 'string' },
            },
            random_seed: {
              type: 'number',
              description: 'Random seed for deterministic outputs',
            },
            response_format: {
              type: 'object',
              description: 'Response format control (e.g. { type: "json_object" } to enable JSON mode)',
            },
            tools: {
              type: 'array',
              description: 'Array of tool definitions for function calling.',
              items: { type: 'object' },
            },
            tool_choice: {
              type: 'string',
              description: 'Tool choice behavior: auto, any, none, or a specific tool object',
            },
          },
          required: ['model', 'messages'],
        },
      },
      {
        name: 'embeddings',
        description: 'Generate text embeddings using the Mistral Embed model.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Embedding model ID (e.g. mistral-embed)',
            },
            inputs: {
              type: 'array',
              description: 'Array of strings to embed',
              items: { type: 'string' },
            },
            encoding_format: {
              type: 'string',
              description: 'Output format: float or base64 (default: float)',
            },
          },
          required: ['model', 'inputs'],
        },
      },
      {
        name: 'fim_completions',
        description: 'Fill-in-the-middle (FIM) completions for code completion tasks using Codestral.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'FIM-capable model ID (e.g. codestral-latest)',
            },
            prompt: {
              type: 'string',
              description: 'Code prefix — the content before the cursor',
            },
            suffix: {
              type: 'string',
              description: 'Code suffix — the content after the cursor',
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature 0–1',
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum number of tokens to generate',
            },
            stop: {
              type: 'array',
              description: 'Stop sequences',
              items: { type: 'string' },
            },
          },
          required: ['model', 'prompt'],
        },
      },
      {
        name: 'list_models',
        description: 'List available Mistral AI models accessible with the configured API key.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_model',
        description: 'Get details for a specific Mistral AI model.',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'string',
              description: 'Model ID (e.g. mistral-large-latest)',
            },
          },
          required: ['model_id'],
        },
      },
      {
        name: 'moderations',
        description: 'Run content moderation on text using the Mistral moderation model.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Moderation model ID (e.g. mistral-moderation-latest)',
            },
            inputs: {
              type: 'array',
              description: 'Array of strings to moderate',
              items: { type: 'string' },
            },
          },
          required: ['model', 'inputs'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'chat_completions': {
          const model = args.model as string;
          const messages = args.messages as unknown[];

          if (!model || !messages) {
            return { content: [{ type: 'text', text: 'model and messages are required' }], isError: true };
          }

          const body: Record<string, unknown> = { model, messages };
          if (typeof args.temperature === 'number') body.temperature = args.temperature;
          if (args.max_tokens) body.max_tokens = args.max_tokens;
          if (typeof args.top_p === 'number') body.top_p = args.top_p;
          if (args.stop) body.stop = args.stop;
          if (typeof args.random_seed === 'number') body.random_seed = args.random_seed;
          if (args.response_format) body.response_format = args.response_format;
          if (args.tools) body.tools = args.tools;
          if (args.tool_choice) body.tool_choice = args.tool_choice;

          const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to complete chat: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mistral AI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'embeddings': {
          const model = args.model as string;
          const inputs = args.inputs as string[];

          if (!model || !inputs) {
            return { content: [{ type: 'text', text: 'model and inputs are required' }], isError: true };
          }

          const body: Record<string, unknown> = { model, inputs };
          if (args.encoding_format) body.encoding_format = args.encoding_format;

          const response = await fetch(`${this.baseUrl}/embeddings`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to generate embeddings: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mistral AI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'fim_completions': {
          const model = args.model as string;
          const prompt = args.prompt as string;

          if (!model || !prompt) {
            return { content: [{ type: 'text', text: 'model and prompt are required' }], isError: true };
          }

          const body: Record<string, unknown> = { model, prompt };
          if (args.suffix) body.suffix = args.suffix;
          if (typeof args.temperature === 'number') body.temperature = args.temperature;
          if (args.max_tokens) body.max_tokens = args.max_tokens;
          if (args.stop) body.stop = args.stop;

          const response = await fetch(`${this.baseUrl}/fim/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to complete FIM: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mistral AI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_models': {
          const response = await fetch(`${this.baseUrl}/models`, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to list models: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mistral AI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_model': {
          const modelId = args.model_id as string;

          if (!modelId) {
            return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/models/${encodeURIComponent(modelId)}`, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to get model: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mistral AI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'moderations': {
          const model = args.model as string;
          const inputs = args.inputs as string[];

          if (!model || !inputs) {
            return { content: [{ type: 'text', text: 'model and inputs are required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/moderations`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ model, inputs }),
          });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to moderate: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Mistral AI returned non-JSON response (HTTP ${response.status})`); }
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
