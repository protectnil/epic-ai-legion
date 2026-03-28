/**
 * Firebase Cloud Messaging (FCM) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Firebase FCM MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 3 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Provider listing: javatpoint.com (x-providerName in APIs.guru catalog)
// Underlying API: Firebase Cloud Messaging API v1 (Google)
// Base URL: https://fcm.googleapis.com/v1
// Auth: OAuth 2.0 Bearer token with scope: https://www.googleapis.com/auth/cloud-platform
//   Obtain via Service Account key (recommended) or user OAuth2 in Firebase Console
// Docs: https://firebase.google.com/docs/cloud-messaging/send-message
// Rate limits: 600,000 messages/minute per project (default); varies by Firebase plan

import { ToolDefinition, ToolResult } from './types.js';

interface JavatpointConfig {
  accessToken: string;
  baseUrl?: string;
}

export class JavatpointMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: JavatpointConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://fcm.googleapis.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_message',
        description: 'Send a Firebase Cloud Messaging (FCM) notification or data message to a specific device token, topic, or condition expression. Supports Android, iOS, and web push targets with per-platform overrides.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Firebase project ID (e.g., "my-firebase-project") — used in the API path as projects/{project_id}',
            },
            token: {
              type: 'string',
              description: 'FCM registration token targeting a single device. Use this OR topic OR condition.',
            },
            topic: {
              type: 'string',
              description: 'Topic name targeting all subscribed devices (e.g., "news"). Do not include /topics/ prefix.',
            },
            condition: {
              type: 'string',
              description: "Condition expression targeting devices matching topic combinations (e.g., \"'TopicA' in topics && 'TopicB' in topics\")",
            },
            notification_title: {
              type: 'string',
              description: 'Notification title displayed to the user',
            },
            notification_body: {
              type: 'string',
              description: 'Notification body text displayed to the user',
            },
            notification_image: {
              type: 'string',
              description: 'URL of an image to display in the notification',
            },
            data: {
              type: 'object',
              description: 'Key-value data payload delivered to the app (not shown as notification — all values must be strings)',
              additionalProperties: { type: 'string' },
            },
            android_priority: {
              type: 'string',
              description: 'Android message delivery priority: normal or high (default: normal)',
            },
            android_ttl: {
              type: 'string',
              description: 'Android time-to-live as duration string (e.g., "3600s" for 1 hour)',
            },
            apns_priority: {
              type: 'string',
              description: 'APNs priority: 5 (conserve power) or 10 (immediate delivery, default)',
            },
            validate_only: {
              type: 'boolean',
              description: 'If true, validates the message without sending — use for testing message structure',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'send_multicast',
        description: 'Send the same FCM message to multiple device registration tokens in a single call (up to 500 tokens). Returns per-token send results including success/failure status.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Firebase project ID',
            },
            tokens: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of FCM device registration tokens (max 500 per call)',
            },
            notification_title: {
              type: 'string',
              description: 'Notification title',
            },
            notification_body: {
              type: 'string',
              description: 'Notification body text',
            },
            data: {
              type: 'object',
              description: 'Key-value data payload (all values must be strings)',
              additionalProperties: { type: 'string' },
            },
            validate_only: {
              type: 'boolean',
              description: 'Dry-run mode — validate structure without sending',
            },
          },
          required: ['project_id', 'tokens'],
        },
      },
      {
        name: 'send_topic_message',
        description: 'Send an FCM message to all devices subscribed to a specific topic. Topics are created automatically when the first device subscribes.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Firebase project ID',
            },
            topic: {
              type: 'string',
              description: 'Topic name (e.g., "breaking-news", "weather-alerts")',
            },
            notification_title: {
              type: 'string',
              description: 'Notification title',
            },
            notification_body: {
              type: 'string',
              description: 'Notification body text',
            },
            data: {
              type: 'object',
              description: 'Key-value data payload (all values must be strings)',
              additionalProperties: { type: 'string' },
            },
            android_priority: {
              type: 'string',
              description: 'Android delivery priority: normal or high',
            },
            validate_only: {
              type: 'boolean',
              description: 'Dry-run mode — validate without sending',
            },
          },
          required: ['project_id', 'topic'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_message':
          return await this.sendMessage(args);
        case 'send_multicast':
          return await this.sendMulticast(args);
        case 'send_topic_message':
          return await this.sendTopicMessage(args);
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

  private async postMessage(projectId: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/v1/projects/${encodeURIComponent(projectId)}/messages:send`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'EpicAI-FCM-MCP/1.0',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `FCM API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`FCM API returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private buildNotification(args: Record<string, unknown>): Record<string, unknown> | undefined {
    const title = args.notification_title as string | undefined;
    const body = args.notification_body as string | undefined;
    const image = args.notification_image as string | undefined;
    if (!title && !body) return undefined;
    const n: Record<string, unknown> = {};
    if (title) n['title'] = title;
    if (body) n['body'] = body;
    if (image) n['image'] = image;
    return n;
  }

  private buildAndroid(args: Record<string, unknown>): Record<string, unknown> | undefined {
    const priority = args.android_priority as string | undefined;
    const ttl = args.android_ttl as string | undefined;
    if (!priority && !ttl) return undefined;
    const a: Record<string, unknown> = {};
    if (priority) a['priority'] = priority.toUpperCase();
    if (ttl) a['ttl'] = ttl;
    return a;
  }

  private buildApns(args: Record<string, unknown>): Record<string, unknown> | undefined {
    const priority = args.apns_priority as string | undefined;
    if (!priority) return undefined;
    return { headers: { 'apns-priority': priority } };
  }

  private async sendMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = args.project_id as string;
    if (!projectId) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };

    const message: Record<string, unknown> = {};
    if (args.token) message['token'] = args.token;
    else if (args.topic) message['topic'] = args.topic;
    else if (args.condition) message['condition'] = args.condition;

    const notification = this.buildNotification(args);
    if (notification) message['notification'] = notification;
    if (args.data) message['data'] = args.data;

    const android = this.buildAndroid(args);
    if (android) message['android'] = android;

    const apns = this.buildApns(args);
    if (apns) message['apns'] = apns;

    const body: Record<string, unknown> = { message };
    if (args.validate_only) body['validate_only'] = true;

    return this.postMessage(projectId, body);
  }

  private async sendMulticast(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = args.project_id as string;
    if (!projectId) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const tokens = args.tokens as string[];
    if (!tokens || tokens.length === 0) {
      return { content: [{ type: 'text', text: 'tokens array is required and must not be empty' }], isError: true };
    }

    // FCM v1 HTTP API sends one message per request; batch up to 500 tokens
    const results: unknown[] = [];
    for (const token of tokens.slice(0, 500)) {
      const message: Record<string, unknown> = { token };
      const notification = this.buildNotification(args);
      if (notification) message['notification'] = notification;
      if (args.data) message['data'] = args.data;

      const body: Record<string, unknown> = { message };
      if (args.validate_only) body['validate_only'] = true;

      const url = `${this.baseUrl}/v1/projects/${encodeURIComponent(projectId)}/messages:send`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'EpicAI-FCM-MCP/1.0',
        },
        body: JSON.stringify(body),
      });
      const ok = response.ok;
      let data: unknown;
      try { data = await response.json(); } catch { data = { status: response.status }; }
      results.push({ token, ok, data });
    }

    const text = JSON.stringify({ results, total: tokens.length }, null, 2);
    const truncated = text.length > 10_000 ? text.slice(0, 10_000) + '\n... [truncated]' : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async sendTopicMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = args.project_id as string;
    if (!projectId) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const topic = args.topic as string;
    if (!topic) return { content: [{ type: 'text', text: 'topic is required' }], isError: true };

    const message: Record<string, unknown> = { topic };
    const notification = this.buildNotification(args);
    if (notification) message['notification'] = notification;
    if (args.data) message['data'] = args.data;
    const android = this.buildAndroid(args);
    if (android) message['android'] = android;

    const body: Record<string, unknown> = { message };
    if (args.validate_only) body['validate_only'] = true;

    return this.postMessage(projectId, body);
  }

  static catalog() {
    return {
      name: 'javatpoint',
      displayName: 'Firebase Cloud Messaging (FCM)',
      version: '1.0.0',
      category: 'education' as const,
      keywords: ['javatpoint', 'firebase', 'fcm', 'push-notification', 'cloud-messaging', 'google'],
      toolNames: ['send_message', 'send_multicast', 'send_topic_message'],
      description: 'Firebase Cloud Messaging adapter for the Epic AI Intelligence Platform — send push notifications to devices, topics, and device groups',
      author: 'protectnil' as const,
    };
  }
}
