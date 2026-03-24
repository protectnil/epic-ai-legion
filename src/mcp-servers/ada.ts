/**
 * Ada MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found

import { ToolDefinition, ToolResult } from './types.js';

interface AdaConfig {
  handle: string;
  apiKey: string;
  baseUrl?: string;
}

export class AdaMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: AdaConfig) {
    // Base URL: https://{handle}.ada.support/api/v2 — confirmed via docs.ada.cx
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || `https://${config.handle}.ada.support/api/v2`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_conversations',
        description: 'List conversations (chat sessions) in Ada',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of conversations to return (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            start_date: {
              type: 'string',
              description: 'ISO 8601 start date filter (e.g. 2026-01-01T00:00:00Z)',
            },
            end_date: {
              type: 'string',
              description: 'ISO 8601 end date filter (e.g. 2026-03-24T23:59:59Z)',
            },
          },
        },
      },
      {
        name: 'get_conversation',
        description: 'Get details of a specific Ada conversation by ID',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Ada conversation ID',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'list_articles',
        description: 'List knowledge base articles in Ada',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of articles to return (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            language: {
              type: 'string',
              description: 'Language code to filter articles (e.g. en, fr)',
            },
          },
        },
      },
      {
        name: 'get_article',
        description: 'Get a specific knowledge base article by ID',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: {
              type: 'string',
              description: 'Ada article ID',
            },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'list_chatter',
        description: 'List chatter (bot response blocks) in the Ada bot',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of chatters to return (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_handoff_transcript',
        description: 'Get the full message transcript for a conversation, useful for agent handoff reviews',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Ada conversation ID',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'list_variables',
        description: 'List all bot variables defined in the Ada bot configuration',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of variables to return (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
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
        case 'list_conversations': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.start_date) params.set('start_date', args.start_date as string);
          if (args.end_date) params.set('end_date', args.end_date as string);
          const url = `${this.baseUrl}/conversations${params.toString() ? '?' + params.toString() : ''}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list conversations: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ada returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_conversation': {
          const conversation_id = args.conversation_id as string;
          if (!conversation_id) {
            return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(conversation_id)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get conversation: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ada returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_articles': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.cursor) params.set('cursor', args.cursor as string);
          if (args.language) params.set('language', args.language as string);
          const url = `${this.baseUrl}/articles${params.toString() ? '?' + params.toString() : ''}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list articles: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ada returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_article': {
          const article_id = args.article_id as string;
          if (!article_id) {
            return { content: [{ type: 'text', text: 'article_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/articles/${encodeURIComponent(article_id)}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get article: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ada returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_chatter': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.cursor) params.set('cursor', args.cursor as string);
          const url = `${this.baseUrl}/chatter${params.toString() ? '?' + params.toString() : ''}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list chatter: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ada returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_handoff_transcript': {
          const conversation_id = args.conversation_id as string;
          if (!conversation_id) {
            return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(conversation_id)}/messages`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get transcript: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ada returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_variables': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.cursor) params.set('cursor', args.cursor as string);
          const url = `${this.baseUrl}/variables${params.toString() ? '?' + params.toString() : ''}`;

          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list variables: ${response.status} ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Ada returned non-JSON response (HTTP ${response.status})`); }
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
