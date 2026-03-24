/**
 * Google Vertex AI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — community-only implementations exist (shariqriazz/vertex-ai-mcp-server, GoogleCloudPlatform/vertex-ai-creative-studio experiments); no official Google-maintained general-purpose Vertex AI MCP server.

import { ToolDefinition, ToolResult } from './types.js';

interface VertexAIConfig {
  projectId: string;
  accessToken: string;
  location?: string;
  baseUrl?: string;
}

export class GoogleVertexAIMCPServer {
  private readonly projectId: string;
  private readonly accessToken: string;
  private readonly location: string;
  private readonly baseUrl: string;

  constructor(config: VertexAIConfig) {
    this.projectId = config.projectId;
    this.accessToken = config.accessToken;
    this.location = config.location || 'us-central1';
    // Allow full baseUrl override; otherwise derive from location per Google's regional endpoint pattern.
    this.baseUrl = config.baseUrl || `https://${this.location}-aiplatform.googleapis.com`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'generate_content',
        description: 'Generate content using a Gemini model on Vertex AI. Accepts text, image, and multimodal prompts.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Gemini model ID (e.g. gemini-2.0-flash-001, gemini-1.5-pro-002)',
            },
            contents: {
              type: 'array',
              description: 'Array of content objects with role and parts. Each part may be { text } or { inline_data }.',
              items: { type: 'object' },
            },
            system_instruction: {
              type: 'object',
              description: 'Optional system instruction with a parts array (e.g. { parts: [{ text: "You are helpful." }] })',
            },
            generation_config: {
              type: 'object',
              description: 'Optional generation config: temperature, maxOutputTokens, topP, topK, candidateCount, stopSequences',
            },
            publisher: {
              type: 'string',
              description: 'Model publisher (default: google)',
            },
          },
          required: ['model', 'contents'],
        },
      },
      {
        name: 'predict',
        description: 'Call a deployed Vertex AI online endpoint for prediction (non-Gemini models, custom models, AutoML).',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id: {
              type: 'string',
              description: 'Deployed endpoint resource ID (numeric string)',
            },
            instances: {
              type: 'array',
              description: 'Array of prediction input instances. Format depends on the deployed model.',
              items: { type: 'object' },
            },
            parameters: {
              type: 'object',
              description: 'Optional prediction parameters (model-specific)',
            },
          },
          required: ['endpoint_id', 'instances'],
        },
      },
      {
        name: 'list_models',
        description: 'List models in the Vertex AI Model Registry for the configured project and location.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'AIP-160 filter expression (e.g. display_name=my-model)',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of models to return (default: 100)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'list_endpoints',
        description: 'List deployed online prediction endpoints in the configured project and location.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'AIP-160 filter expression',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of endpoints to return (default: 100)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_model',
        description: 'Get details for a specific model in the Vertex AI Model Registry.',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'string',
              description: 'Model resource ID (numeric string)',
            },
          },
          required: ['model_id'],
        },
      },
      {
        name: 'count_tokens',
        description: 'Count the number of tokens a prompt would consume for a given Gemini model.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Gemini model ID (e.g. gemini-2.0-flash-001)',
            },
            contents: {
              type: 'array',
              description: 'Array of content objects identical in structure to generate_content contents.',
              items: { type: 'object' },
            },
            publisher: {
              type: 'string',
              description: 'Model publisher (default: google)',
            },
          },
          required: ['model', 'contents'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'generate_content': {
          const model = args.model as string;
          const contents = args.contents as unknown[];

          if (!model || !contents) {
            return { content: [{ type: 'text', text: 'model and contents are required' }], isError: true };
          }

          const publisher = (args.publisher as string) || 'google';
          const url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/publishers/${publisher}/models/${model}:generateContent`;

          const body: Record<string, unknown> = { contents };
          if (args.system_instruction) body.systemInstruction = args.system_instruction;
          if (args.generation_config) body.generationConfig = args.generation_config;

          const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to generate content: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Vertex AI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'predict': {
          const endpointId = args.endpoint_id as string;
          const instances = args.instances as unknown[];

          if (!endpointId || !instances) {
            return { content: [{ type: 'text', text: 'endpoint_id and instances are required' }], isError: true };
          }

          const url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/endpoints/${endpointId}:predict`;

          const body: Record<string, unknown> = { instances };
          if (args.parameters) body.parameters = args.parameters;

          const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to predict: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Vertex AI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_models': {
          let url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/models`;
          const params: string[] = [];
          if (args.filter) params.push(`filter=${encodeURIComponent(args.filter as string)}`);
          if (args.page_size) params.push(`pageSize=${args.page_size}`);
          if (args.page_token) params.push(`pageToken=${encodeURIComponent(args.page_token as string)}`);
          if (params.length > 0) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to list models: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Vertex AI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_endpoints': {
          let url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/endpoints`;
          const params: string[] = [];
          if (args.filter) params.push(`filter=${encodeURIComponent(args.filter as string)}`);
          if (args.page_size) params.push(`pageSize=${args.page_size}`);
          if (args.page_token) params.push(`pageToken=${encodeURIComponent(args.page_token as string)}`);
          if (params.length > 0) url += `?${params.join('&')}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to list endpoints: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Vertex AI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_model': {
          const modelId = args.model_id as string;

          if (!modelId) {
            return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
          }

          const url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/models/${modelId}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to get model: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Vertex AI returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'count_tokens': {
          const model = args.model as string;
          const contents = args.contents as unknown[];

          if (!model || !contents) {
            return { content: [{ type: 'text', text: 'model and contents are required' }], isError: true };
          }

          const publisher = (args.publisher as string) || 'google';
          const url = `${this.baseUrl}/v1/projects/${this.projectId}/locations/${this.location}/publishers/${publisher}/models/${model}:countTokens`;

          const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ contents }) });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to count tokens: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Vertex AI returned non-JSON response (HTTP ${response.status})`); }
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
