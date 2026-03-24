/**
 * Adyen MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/Adyen/adyen-mcp — ~26 tools, Alpha (not production-stable).
// Our adapter provides a stable API-key/bearer-token fallback for air-gapped and production deployments.

import { ToolDefinition, ToolResult } from './types.js';

interface AdyenConfig {
  apiKey: string;
  /**
   * Test base URL: https://checkout-test.adyen.com/v71
   * Live base URL:  https://{prefix}-checkout-live.adyenpayments.com/checkout/v71
   * Get your live prefix from Customer Area → Developers → API URLs → Prefix.
   */
  baseUrl?: string;
  merchantAccount: string;
}

export class AdyenMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly merchantAccount: string;

  constructor(config: AdyenConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://checkout-test.adyen.com/v71';
    this.merchantAccount = config.merchantAccount;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_payment_session',
        description: 'Create a payment session for Drop-in or Components integration. Returns a session ID and session data.',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'object',
              description: 'Payment amount object with value (in minor units) and currency (ISO 4217 code). Example: { value: 1000, currency: "USD" }',
            },
            returnUrl: {
              type: 'string',
              description: 'URL the shopper is redirected to after payment completion',
            },
            reference: {
              type: 'string',
              description: 'Unique reference for this payment (your order ID)',
            },
            countryCode: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code of the shopper (e.g. US, GB)',
            },
            shopperLocale: {
              type: 'string',
              description: 'Locale of the payment page in IETF language tag format (e.g. en-US)',
            },
            shopperEmail: {
              type: 'string',
              description: "Shopper's email address",
            },
            shopperReference: {
              type: 'string',
              description: 'Unique identifier for the shopper in your system',
            },
          },
          required: ['amount', 'returnUrl', 'reference'],
        },
      },
      {
        name: 'get_payment_session_result',
        description: 'Retrieve the result of a payment session by its session ID.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'The session ID returned from create_payment_session',
            },
            sessionResult: {
              type: 'string',
              description: 'The sessionResult query parameter returned in the returnUrl after completion',
            },
          },
          required: ['sessionId', 'sessionResult'],
        },
      },
      {
        name: 'get_payment_methods',
        description: 'Retrieve the list of available payment methods for a given shopper context.',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'object',
              description: 'Amount object with value and currency to filter applicable payment methods',
            },
            countryCode: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code of the shopper',
            },
            channel: {
              type: 'string',
              description: 'Channel: Web, iOS, Android, or ReactNative',
            },
            shopperLocale: {
              type: 'string',
              description: 'Shopper locale in IETF format (e.g. en-US)',
            },
          },
        },
      },
      {
        name: 'create_payment',
        description: 'Submit a payment request directly (server-side flow without Drop-in). Use for card-not-present or tokenized payments.',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'object',
              description: 'Amount object with value (minor units) and currency (ISO 4217)',
            },
            reference: {
              type: 'string',
              description: 'Unique merchant reference for this payment',
            },
            paymentMethod: {
              type: 'object',
              description: 'Payment method object (e.g. { type: "scheme", encryptedCardNumber: "...", encryptedExpiryMonth: "...", encryptedExpiryYear: "...", encryptedSecurityCode: "..." })',
            },
            returnUrl: {
              type: 'string',
              description: 'URL for redirect-based payment methods',
            },
            shopperReference: {
              type: 'string',
              description: 'Shopper ID for tokenization and recurring payments',
            },
          },
          required: ['amount', 'reference', 'paymentMethod', 'returnUrl'],
        },
      },
      {
        name: 'refund_payment',
        description: 'Request a refund for a captured payment. Partial refunds are supported.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentPspReference: {
              type: 'string',
              description: 'The PSP reference (pspReference) of the captured payment to refund',
            },
            amount: {
              type: 'object',
              description: 'Amount to refund with value (minor units) and currency. May be less than the captured amount for partial refunds.',
            },
            reference: {
              type: 'string',
              description: 'Your unique reference for this refund request',
            },
          },
          required: ['paymentPspReference', 'amount', 'reference'],
        },
      },
      {
        name: 'capture_payment',
        description: 'Capture a previously authorised payment. Use when capture is not set to automatic.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentPspReference: {
              type: 'string',
              description: 'The PSP reference of the authorised payment to capture',
            },
            amount: {
              type: 'object',
              description: 'Amount to capture with value (minor units) and currency. Must not exceed the authorised amount.',
            },
            reference: {
              type: 'string',
              description: 'Your unique reference for this capture request',
            },
          },
          required: ['paymentPspReference', 'amount', 'reference'],
        },
      },
      {
        name: 'reverse_payment',
        description: 'Cancel an authorised payment or refund a captured payment in a single call (reversal). Adyen determines the appropriate action.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentPspReference: {
              type: 'string',
              description: 'The PSP reference of the payment to reverse',
            },
            reference: {
              type: 'string',
              description: 'Your unique reference for this reversal request',
            },
          },
          required: ['paymentPspReference', 'reference'],
        },
      },
      {
        name: 'create_payment_link',
        description: 'Create a hosted payment link that you can send to a shopper.',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'object',
              description: 'Amount object with value (minor units) and currency (ISO 4217)',
            },
            reference: {
              type: 'string',
              description: 'Unique merchant reference for the payment link',
            },
            returnUrl: {
              type: 'string',
              description: 'URL the shopper is redirected to after payment',
            },
            description: {
              type: 'string',
              description: 'Description shown on the payment page',
            },
            expiresAt: {
              type: 'string',
              description: 'ISO 8601 datetime when the link expires (e.g. 2026-12-31T23:59:59Z)',
            },
            shopperEmail: {
              type: 'string',
              description: "Shopper's email address for pre-population",
            },
          },
          required: ['amount', 'reference'],
        },
      },
      {
        name: 'get_payment_link',
        description: 'Retrieve the status and details of a previously created payment link.',
        inputSchema: {
          type: 'object',
          properties: {
            linkId: {
              type: 'string',
              description: 'The ID of the payment link (id field from create_payment_link response)',
            },
          },
          required: ['linkId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'create_payment_session': {
          const body: Record<string, unknown> = {
            merchantAccount: this.merchantAccount,
            amount: args.amount,
            returnUrl: args.returnUrl,
            reference: args.reference,
          };
          if (args.countryCode) body.countryCode = args.countryCode;
          if (args.shopperLocale) body.shopperLocale = args.shopperLocale;
          if (args.shopperEmail) body.shopperEmail = args.shopperEmail;
          if (args.shopperReference) body.shopperReference = args.shopperReference;

          const response = await fetch(`${this.baseUrl}/sessions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to create payment session (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Adyen returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_payment_session_result': {
          const sessionId = args.sessionId as string;
          const sessionResult = args.sessionResult as string;

          if (!sessionId || !sessionResult) {
            return {
              content: [{ type: 'text', text: 'sessionId and sessionResult are required' }],
              isError: true,
            };
          }

          const url = `${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}?sessionResult=${encodeURIComponent(sessionResult)}`;
          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to get session result (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Adyen returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_payment_methods': {
          const body: Record<string, unknown> = {
            merchantAccount: this.merchantAccount,
          };
          if (args.amount) body.amount = args.amount;
          if (args.countryCode) body.countryCode = args.countryCode;
          if (args.channel) body.channel = args.channel;
          if (args.shopperLocale) body.shopperLocale = args.shopperLocale;

          const response = await fetch(`${this.baseUrl}/paymentMethods`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to get payment methods (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Adyen returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_payment': {
          if (!args.amount || !args.reference || !args.paymentMethod || !args.returnUrl) {
            return {
              content: [{ type: 'text', text: 'amount, reference, paymentMethod, and returnUrl are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            merchantAccount: this.merchantAccount,
            amount: args.amount,
            reference: args.reference,
            paymentMethod: args.paymentMethod,
            returnUrl: args.returnUrl,
          };
          if (args.shopperReference) body.shopperReference = args.shopperReference;

          const response = await fetch(`${this.baseUrl}/payments`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to create payment (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Adyen returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'refund_payment': {
          const paymentPspReference = args.paymentPspReference as string;
          if (!paymentPspReference || !args.amount || !args.reference) {
            return {
              content: [{ type: 'text', text: 'paymentPspReference, amount, and reference are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            merchantAccount: this.merchantAccount,
            amount: args.amount,
            reference: args.reference,
          };

          const response = await fetch(
            `${this.baseUrl}/payments/${encodeURIComponent(paymentPspReference)}/refunds`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to refund payment (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Adyen returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'capture_payment': {
          const paymentPspReference = args.paymentPspReference as string;
          if (!paymentPspReference || !args.amount || !args.reference) {
            return {
              content: [{ type: 'text', text: 'paymentPspReference, amount, and reference are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            merchantAccount: this.merchantAccount,
            amount: args.amount,
            reference: args.reference,
          };

          const response = await fetch(
            `${this.baseUrl}/payments/${encodeURIComponent(paymentPspReference)}/captures`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to capture payment (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Adyen returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'reverse_payment': {
          const paymentPspReference = args.paymentPspReference as string;
          if (!paymentPspReference || !args.reference) {
            return {
              content: [{ type: 'text', text: 'paymentPspReference and reference are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            merchantAccount: this.merchantAccount,
            reference: args.reference,
          };

          const response = await fetch(
            `${this.baseUrl}/payments/${encodeURIComponent(paymentPspReference)}/reversals`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to reverse payment (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Adyen returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_payment_link': {
          if (!args.amount || !args.reference) {
            return {
              content: [{ type: 'text', text: 'amount and reference are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = {
            merchantAccount: this.merchantAccount,
            amount: args.amount,
            reference: args.reference,
          };
          if (args.returnUrl) body.returnUrl = args.returnUrl;
          if (args.description) body.description = args.description;
          if (args.expiresAt) body.expiresAt = args.expiresAt;
          if (args.shopperEmail) body.shopperEmail = args.shopperEmail;

          const response = await fetch(`${this.baseUrl}/paymentLinks`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to create payment link (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Adyen returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_payment_link': {
          const linkId = args.linkId as string;
          if (!linkId) {
            return {
              content: [{ type: 'text', text: 'linkId is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/paymentLinks/${encodeURIComponent(linkId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            const errText = await response.text();
            return {
              content: [{ type: 'text', text: `Failed to get payment link (HTTP ${response.status}): ${errText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Adyen returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
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
