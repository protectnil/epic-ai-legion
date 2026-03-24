/**
 * Amazon Bedrock MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/awslabs/mcp — contains bedrock-kb-retrieval-mcp-server (Knowledge Bases retrieval only) and amazon-bedrock-agentcore-mcp-server (AgentCore docs only). Neither covers general Bedrock inference or model management. This adapter provides the full inference + model management surface.

import { ToolDefinition, ToolResult } from './types.js';

interface BedrockConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

// AWS Signature Version 4 signing — required for all Bedrock REST calls (no simple API key alternative).
async function awsSigV4Sign(
  method: string,
  url: string,
  extraHeaders: Record<string, string>,
  body: string,
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
  sessionToken?: string,
): Promise<Record<string, string>> {
  const parsedUrl = new URL(url);
  // Derive service name from hostname prefix (e.g. "bedrock-runtime" or "bedrock").
  const service = parsedUrl.hostname.split('.')[0];

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const allHeaders: Record<string, string> = {
    ...extraHeaders,
    host: parsedUrl.host,
    'x-amz-date': amzDate,
  };
  if (sessionToken) allHeaders['x-amz-security-token'] = sessionToken;

  const sortedKeys = Object.keys(allHeaders).map(k => k.toLowerCase()).sort();
  const canonicalHeaders = sortedKeys
    .map(lk => {
      const origKey = Object.keys(allHeaders).find(k => k.toLowerCase() === lk)!;
      return `${lk}:${allHeaders[origKey].trim()}`;
    })
    .join('\n') + '\n';
  const signedHeadersStr = sortedKeys.join(';');

  const encoder = new TextEncoder();
  const payloadHashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(body));
  const payloadHash = Array.from(new Uint8Array(payloadHashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

  const canonicalRequest = [method, parsedUrl.pathname, parsedUrl.searchParams.toString(), canonicalHeaders, signedHeadersStr, payloadHash].join('\n');

  const crHashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest));
  const crHash = Array.from(new Uint8Array(crHashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crHash}`;

  async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  }

  const kDate = await hmac(encoder.encode(`AWS4${secretAccessKey}`).buffer as ArrayBuffer, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = Array.from(new Uint8Array(await hmac(kSigning, stringToSign))).map(b => b.toString(16).padStart(2, '0')).join('');

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

  const finalHeaders: Record<string, string> = { ...allHeaders };
  delete finalHeaders.host;
  finalHeaders.Authorization = authorization;
  return finalHeaders;
}

export class AmazonBedrockMCPServer {
  private readonly region: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly sessionToken?: string;

  constructor(config: BedrockConfig) {
    this.region = config.region;
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.sessionToken = config.sessionToken;
  }

  private runtimeBase(): string {
    return `https://bedrock-runtime.${this.region}.amazonaws.com`;
  }

  private controlBase(): string {
    return `https://bedrock.${this.region}.amazonaws.com`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'invoke_model',
        description: 'Invoke a Bedrock foundation model synchronously using the model-native request body format. Use converse for a unified cross-model chat interface.',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'string',
              description: 'Model ID, ARN, or cross-region inference profile ID (e.g. amazon.titan-text-express-v1, us.anthropic.claude-3-5-sonnet-20240620-v1:0)',
            },
            body: {
              type: 'object',
              description: 'Model-native request body. Format varies by model — see AWS Bedrock model parameters documentation.',
            },
            accept: {
              type: 'string',
              description: 'Response MIME type (default: application/json). Use image/png for image generation models.',
            },
          },
          required: ['model_id', 'body'],
        },
      },
      {
        name: 'converse',
        description: 'Send messages to any Bedrock model using the unified Converse API. Provides a consistent chat interface that works across all models supporting the messages format.',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'string',
              description: 'Model ID or cross-region inference profile ID (e.g. us.anthropic.claude-3-5-sonnet-20240620-v1:0, amazon.nova-pro-v1:0)',
            },
            messages: {
              type: 'array',
              description: 'Array of message objects with role (user|assistant) and content fields.',
              items: { type: 'object' },
            },
            system: {
              type: 'array',
              description: 'Optional system prompt as an array of content blocks (e.g. [{ text: "You are helpful." }])',
              items: { type: 'object' },
            },
            inference_config: {
              type: 'object',
              description: 'Optional inference config: maxTokens, temperature, topP, stopSequences',
            },
          },
          required: ['model_id', 'messages'],
        },
      },
      {
        name: 'list_foundation_models',
        description: 'List available Amazon Bedrock foundation models with optional filtering by provider, modality, inference type, or customization type.',
        inputSchema: {
          type: 'object',
          properties: {
            by_provider: {
              type: 'string',
              description: 'Filter by model provider (e.g. Amazon, Anthropic, Cohere, Meta, Mistral AI)',
            },
            by_output_modality: {
              type: 'string',
              description: 'Filter by output modality: TEXT, IMAGE, or EMBEDDING',
            },
            by_inference_type: {
              type: 'string',
              description: 'Filter by inference type: ON_DEMAND or PROVISIONED',
            },
            by_customization_type: {
              type: 'string',
              description: 'Filter by customization support: FINE_TUNING, CONTINUED_PRE_TRAINING, or DISTILLATION',
            },
          },
        },
      },
      {
        name: 'get_foundation_model',
        description: 'Get details for a specific Amazon Bedrock foundation model by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'string',
              description: 'Foundation model ID (e.g. amazon.titan-text-express-v1)',
            },
          },
          required: ['model_id'],
        },
      },
      {
        name: 'list_inference_profiles',
        description: 'List cross-region inference profiles available in the account.',
        inputSchema: {
          type: 'object',
          properties: {
            type_equals: {
              type: 'string',
              description: 'Filter by profile type: SYSTEM_DEFINED or APPLICATION',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of results to return',
            },
            next_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'list_custom_models',
        description: 'List custom models (fine-tuned or continued pre-training jobs) in the account.',
        inputSchema: {
          type: 'object',
          properties: {
            name_contains: {
              type: 'string',
              description: 'Filter: return only models whose name contains this string',
            },
            base_model_arn_equals: {
              type: 'string',
              description: 'Filter by base model ARN',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of results to return (max 1000)',
            },
            next_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'invoke_model': {
          const modelId = args.model_id as string;
          const body = args.body as Record<string, unknown>;
          const accept = (args.accept as string) || 'application/json';

          if (!modelId || !body) {
            return { content: [{ type: 'text', text: 'model_id and body are required' }], isError: true };
          }

          const url = `${this.runtimeBase()}/model/${encodeURIComponent(modelId)}/invoke`;
          const bodyStr = JSON.stringify(body);
          const baseHeaders = { 'Content-Type': 'application/json', Accept: accept };
          const signedHeaders = await awsSigV4Sign('POST', url, baseHeaders, bodyStr, this.region, this.accessKeyId, this.secretAccessKey, this.sessionToken);

          const response = await fetch(url, { method: 'POST', headers: signedHeaders, body: bodyStr });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to invoke model: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bedrock returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'converse': {
          const modelId = args.model_id as string;
          const messages = args.messages as unknown[];

          if (!modelId || !messages) {
            return { content: [{ type: 'text', text: 'model_id and messages are required' }], isError: true };
          }

          const url = `${this.runtimeBase()}/model/${encodeURIComponent(modelId)}/converse`;
          const bodyObj: Record<string, unknown> = { messages };
          if (args.system) bodyObj.system = args.system;
          if (args.inference_config) bodyObj.inferenceConfig = args.inference_config;

          const bodyStr = JSON.stringify(bodyObj);
          const baseHeaders = { 'Content-Type': 'application/json' };
          const signedHeaders = await awsSigV4Sign('POST', url, baseHeaders, bodyStr, this.region, this.accessKeyId, this.secretAccessKey, this.sessionToken);

          const response = await fetch(url, { method: 'POST', headers: signedHeaders, body: bodyStr });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to converse: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bedrock returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_foundation_models': {
          let url = `${this.controlBase()}/foundation-models`;
          const params: string[] = [];
          if (args.by_provider) params.push(`byProvider=${encodeURIComponent(args.by_provider as string)}`);
          if (args.by_output_modality) params.push(`byOutputModality=${encodeURIComponent(args.by_output_modality as string)}`);
          if (args.by_inference_type) params.push(`byInferenceType=${encodeURIComponent(args.by_inference_type as string)}`);
          if (args.by_customization_type) params.push(`byCustomizationType=${encodeURIComponent(args.by_customization_type as string)}`);
          if (params.length > 0) url += `?${params.join('&')}`;

          const signedHeaders = await awsSigV4Sign('GET', url, {}, '', this.region, this.accessKeyId, this.secretAccessKey, this.sessionToken);
          const response = await fetch(url, { method: 'GET', headers: signedHeaders });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to list foundation models: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bedrock returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_foundation_model': {
          const modelId = args.model_id as string;

          if (!modelId) {
            return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
          }

          const url = `${this.controlBase()}/foundation-models/${encodeURIComponent(modelId)}`;
          const signedHeaders = await awsSigV4Sign('GET', url, {}, '', this.region, this.accessKeyId, this.secretAccessKey, this.sessionToken);
          const response = await fetch(url, { method: 'GET', headers: signedHeaders });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to get foundation model: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bedrock returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_inference_profiles': {
          let url = `${this.controlBase()}/inference-profiles`;
          const params: string[] = [];
          if (args.type_equals) params.push(`typeEquals=${encodeURIComponent(args.type_equals as string)}`);
          if (args.max_results) params.push(`maxResults=${args.max_results}`);
          if (args.next_token) params.push(`nextToken=${encodeURIComponent(args.next_token as string)}`);
          if (params.length > 0) url += `?${params.join('&')}`;

          const signedHeaders = await awsSigV4Sign('GET', url, {}, '', this.region, this.accessKeyId, this.secretAccessKey, this.sessionToken);
          const response = await fetch(url, { method: 'GET', headers: signedHeaders });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to list inference profiles: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bedrock returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_custom_models': {
          let url = `${this.controlBase()}/custom-models`;
          const params: string[] = [];
          if (args.name_contains) params.push(`nameContains=${encodeURIComponent(args.name_contains as string)}`);
          if (args.base_model_arn_equals) params.push(`baseModelArnEquals=${encodeURIComponent(args.base_model_arn_equals as string)}`);
          if (args.max_results) params.push(`maxResults=${args.max_results}`);
          if (args.next_token) params.push(`nextToken=${encodeURIComponent(args.next_token as string)}`);
          if (params.length > 0) url += `?${params.join('&')}`;

          const signedHeaders = await awsSigV4Sign('GET', url, {}, '', this.region, this.accessKeyId, this.secretAccessKey, this.sessionToken);
          const response = await fetch(url, { method: 'GET', headers: signedHeaders });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { content: [{ type: 'text', text: `Failed to list custom models: ${response.status} ${errText}` }], isError: true };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bedrock returned non-JSON response (HTTP ${response.status})`); }
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
