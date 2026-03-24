/**
 * Google Cloud Translation MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Google Cloud Translation MCP server was found on GitHub or npm.
//
// Base URL: https://translate.googleapis.com/v3
// Auth: Bearer token (OAuth2 access token or service account token via Application Default Credentials)
//       The v3 Advanced API does NOT support API keys — requires OAuth2 or ADC.
//       Pass an OAuth2 access token obtained via the Google token endpoint or gcloud CLI.
// Docs: https://cloud.google.com/translate/docs/reference/rest
// Rate limits: 600 requests/min per project (translateText); batch operations are async and quota-based

import { ToolDefinition, ToolResult } from './types.js';

interface GoogleTranslateConfig {
  accessToken: string;
  projectId: string;
  baseUrl?: string;
}

export class GoogleTranslateMCPServer {
  private readonly accessToken: string;
  private readonly projectId: string;
  private readonly baseUrl: string;

  constructor(config: GoogleTranslateConfig) {
    this.accessToken = config.accessToken;
    this.projectId = config.projectId;
    this.baseUrl = config.baseUrl || 'https://translate.googleapis.com/v3';
  }

  static catalog() {
    return {
      name: 'google-translate',
      displayName: 'Google Cloud Translation',
      version: '1.0.0',
      category: 'ai-ml',
      keywords: [
        'google', 'translate', 'translation', 'language', 'detect', 'localization',
        'multilingual', 'nlp', 'cloud-translate', 'glossary', 'batch-translate',
      ],
      toolNames: [
        'translate_text',
        'detect_language',
        'list_supported_languages',
        'batch_translate_text',
        'create_glossary',
        'get_glossary',
        'list_glossaries',
        'delete_glossary',
      ],
      description: 'Google Cloud Translation v3: translate text, detect languages, manage glossaries, and batch-translate documents across 100+ languages.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'translate_text',
        description: 'Translate one or more text strings to a target language, with optional source language and glossary override',
        inputSchema: {
          type: 'object',
          properties: {
            contents: {
              type: 'string',
              description: 'Text to translate. For multiple strings, separate with a pipe | character. Max 30,000 codepoints per request.',
            },
            target_language_code: {
              type: 'string',
              description: 'BCP-47 language code of the target language (e.g. en, es, fr, zh-CN, ja)',
            },
            source_language_code: {
              type: 'string',
              description: 'BCP-47 language code of the source language (optional — auto-detected if omitted)',
            },
            mime_type: {
              type: 'string',
              description: 'MIME type of the source text: text/plain (default) or text/html',
            },
            glossary_id: {
              type: 'string',
              description: 'Glossary resource name to use for translation (e.g. my-glossary)',
            },
            location: {
              type: 'string',
              description: 'GCP location for the request (default: global). Use a region like us-central1 for EU data residency.',
            },
          },
          required: ['contents', 'target_language_code'],
        },
      },
      {
        name: 'detect_language',
        description: 'Detect the language of one or more text strings and return BCP-47 language codes with confidence scores',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Text string to detect the language of',
            },
            mime_type: {
              type: 'string',
              description: 'MIME type of the text: text/plain (default) or text/html',
            },
            location: {
              type: 'string',
              description: 'GCP location for the request (default: global)',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'list_supported_languages',
        description: 'List all languages supported by Cloud Translation v3 with optional display names in a given language',
        inputSchema: {
          type: 'object',
          properties: {
            display_language_code: {
              type: 'string',
              description: 'BCP-47 language code for localizing language display names (e.g. en returns "French", fr returns "Français")',
            },
            location: {
              type: 'string',
              description: 'GCP location for the request (default: global)',
            },
          },
        },
      },
      {
        name: 'batch_translate_text',
        description: 'Start an async batch translation job for large volumes of text stored in GCS. Returns a long-running operation name.',
        inputSchema: {
          type: 'object',
          properties: {
            source_language_code: {
              type: 'string',
              description: 'BCP-47 language code of the source documents (required for batch operations)',
            },
            target_language_codes: {
              type: 'string',
              description: 'Comma-separated BCP-47 target language codes (e.g. es,fr,de)',
            },
            input_gcs_uri: {
              type: 'string',
              description: 'GCS URI of the input file or folder (e.g. gs://my-bucket/input.txt)',
            },
            output_gcs_uri: {
              type: 'string',
              description: 'GCS URI prefix for output files (e.g. gs://my-bucket/output/)',
            },
            location: {
              type: 'string',
              description: 'GCP region for the batch job (default: us-central1 — global is not supported for batch)',
            },
          },
          required: ['source_language_code', 'target_language_codes', 'input_gcs_uri', 'output_gcs_uri'],
        },
      },
      {
        name: 'create_glossary',
        description: 'Create a custom translation glossary for domain-specific terminology from a GCS CSV or TSV file',
        inputSchema: {
          type: 'object',
          properties: {
            glossary_id: {
              type: 'string',
              description: 'Unique ID for the glossary (alphanumeric, hyphens allowed)',
            },
            input_gcs_uri: {
              type: 'string',
              description: 'GCS URI of the glossary file (CSV or TSV format, e.g. gs://my-bucket/glossary.csv)',
            },
            language_pair_source: {
              type: 'string',
              description: 'Source language BCP-47 code for a language-pair glossary (e.g. en)',
            },
            language_pair_target: {
              type: 'string',
              description: 'Target language BCP-47 code for a language-pair glossary (e.g. es)',
            },
            location: {
              type: 'string',
              description: 'GCP region for the glossary (default: us-central1)',
            },
          },
          required: ['glossary_id', 'input_gcs_uri', 'language_pair_source', 'language_pair_target'],
        },
      },
      {
        name: 'get_glossary',
        description: 'Retrieve metadata for a specific translation glossary by ID including language pair and entry count',
        inputSchema: {
          type: 'object',
          properties: {
            glossary_id: {
              type: 'string',
              description: 'ID of the glossary to retrieve',
            },
            location: {
              type: 'string',
              description: 'GCP region where the glossary was created (default: us-central1)',
            },
          },
          required: ['glossary_id'],
        },
      },
      {
        name: 'list_glossaries',
        description: 'List all translation glossaries in the project with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Maximum number of glossaries to return per page (default: 50, max: 100)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous list response',
            },
            filter: {
              type: 'string',
              description: 'Filter expression for glossary name (e.g. name:my-glossary)',
            },
            location: {
              type: 'string',
              description: 'GCP region to list glossaries from (default: us-central1)',
            },
          },
        },
      },
      {
        name: 'delete_glossary',
        description: 'Delete a translation glossary by ID. Returns a long-running operation name.',
        inputSchema: {
          type: 'object',
          properties: {
            glossary_id: {
              type: 'string',
              description: 'ID of the glossary to delete',
            },
            location: {
              type: 'string',
              description: 'GCP region where the glossary exists (default: us-central1)',
            },
          },
          required: ['glossary_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'translate_text':
          return this.translateText(args);
        case 'detect_language':
          return this.detectLanguage(args);
        case 'list_supported_languages':
          return this.listSupportedLanguages(args);
        case 'batch_translate_text':
          return this.batchTranslateText(args);
        case 'create_glossary':
          return this.createGlossary(args);
        case 'get_glossary':
          return this.getGlossary(args);
        case 'list_glossaries':
          return this.listGlossaries(args);
        case 'delete_glossary':
          return this.deleteGlossary(args);
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

  private get authHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private parentPath(location = 'global'): string {
    return `projects/${this.projectId}/locations/${location}`;
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async translateText(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contents || !args.target_language_code) {
      return { content: [{ type: 'text', text: 'contents and target_language_code are required' }], isError: true };
    }

    const location = (args.location as string) || 'global';
    const parent = this.parentPath(location);
    const rawContents = args.contents as string;
    const contents = rawContents.includes('|') ? rawContents.split('|').map(s => s.trim()) : [rawContents];

    const body: Record<string, unknown> = {
      contents,
      targetLanguageCode: args.target_language_code,
      mimeType: (args.mime_type as string) || 'text/plain',
    };

    if (args.source_language_code) body.sourceLanguageCode = args.source_language_code;

    if (args.glossary_id) {
      body.glossaryConfig = {
        glossary: `${parent}/glossaries/${args.glossary_id}`,
      };
    }

    const response = await fetch(`${this.baseUrl}/${parent}:translateText`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async detectLanguage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.content) {
      return { content: [{ type: 'text', text: 'content is required' }], isError: true };
    }

    const location = (args.location as string) || 'global';
    const parent = this.parentPath(location);

    const body: Record<string, unknown> = {
      content: args.content,
      mimeType: (args.mime_type as string) || 'text/plain',
    };

    const response = await fetch(`${this.baseUrl}/${parent}:detectLanguage`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSupportedLanguages(args: Record<string, unknown>): Promise<ToolResult> {
    const location = (args.location as string) || 'global';
    const parent = this.parentPath(location);

    const params = new URLSearchParams();
    if (args.display_language_code) params.set('displayLanguageCode', args.display_language_code as string);

    const qs = params.toString();
    const url = `${this.baseUrl}/${parent}/supportedLanguages${qs ? '?' + qs : ''}`;

    const response = await fetch(url, { method: 'GET', headers: this.authHeaders });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async batchTranslateText(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.source_language_code || !args.target_language_codes || !args.input_gcs_uri || !args.output_gcs_uri) {
      return { content: [{ type: 'text', text: 'source_language_code, target_language_codes, input_gcs_uri, and output_gcs_uri are required' }], isError: true };
    }

    const location = (args.location as string) || 'us-central1';
    const parent = this.parentPath(location);

    const targetCodes = (args.target_language_codes as string).split(',').map(s => s.trim());

    const body = {
      sourceLanguageCode: args.source_language_code,
      targetLanguageCodes: targetCodes,
      inputConfigs: [
        {
          gcsSource: { inputUri: args.input_gcs_uri },
        },
      ],
      outputConfig: {
        gcsDestination: { outputUriPrefix: args.output_gcs_uri },
      },
    };

    const response = await fetch(`${this.baseUrl}/${parent}:batchTranslateText`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createGlossary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.glossary_id || !args.input_gcs_uri || !args.language_pair_source || !args.language_pair_target) {
      return { content: [{ type: 'text', text: 'glossary_id, input_gcs_uri, language_pair_source, and language_pair_target are required' }], isError: true };
    }

    const location = (args.location as string) || 'us-central1';
    const parent = this.parentPath(location);

    const body = {
      name: `${parent}/glossaries/${args.glossary_id}`,
      languagePair: {
        sourceLanguageCode: args.language_pair_source,
        targetLanguageCode: args.language_pair_target,
      },
      inputConfig: {
        gcsSource: { inputUri: args.input_gcs_uri },
      },
    };

    const response = await fetch(`${this.baseUrl}/${parent}/glossaries`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getGlossary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.glossary_id) {
      return { content: [{ type: 'text', text: 'glossary_id is required' }], isError: true };
    }

    const location = (args.location as string) || 'us-central1';
    const parent = this.parentPath(location);
    const url = `${this.baseUrl}/${parent}/glossaries/${args.glossary_id}`;

    const response = await fetch(url, { method: 'GET', headers: this.authHeaders });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listGlossaries(args: Record<string, unknown>): Promise<ToolResult> {
    const location = (args.location as string) || 'us-central1';
    const parent = this.parentPath(location);

    const params = new URLSearchParams();
    params.set('pageSize', String((args.page_size as number) || 50));
    if (args.page_token) params.set('pageToken', args.page_token as string);
    if (args.filter) params.set('filter', args.filter as string);

    const url = `${this.baseUrl}/${parent}/glossaries?${params.toString()}`;
    const response = await fetch(url, { method: 'GET', headers: this.authHeaders });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteGlossary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.glossary_id) {
      return { content: [{ type: 'text', text: 'glossary_id is required' }], isError: true };
    }

    const location = (args.location as string) || 'us-central1';
    const parent = this.parentPath(location);
    const url = `${this.baseUrl}/${parent}/glossaries/${args.glossary_id}`;

    const response = await fetch(url, { method: 'DELETE', headers: this.authHeaders });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
