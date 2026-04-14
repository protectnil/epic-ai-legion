/**
 * @epicai/legion — REST JSON API Transport
 * Plain node:http server exposing legion_query, legion_call, legion_list
 * as REST endpoints. Returns raw JSON — no MCP framing.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { createServer } from 'node:http';
import type { Server, IncomingMessage, ServerResponse } from 'node:http';
import type { LegionState } from '../LegionState.js';
import type { TransportHandle } from '../TransportHandle.js';
import { handleQuery, handleCall, handleList } from '../toolHandlers.js';

// =============================================================================
// Internal helpers
// =============================================================================

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

// =============================================================================
// bindRest
// =============================================================================

/**
 * Bind a plain REST JSON API.
 *
 * Auth: if LEGION_REST_TOKEN is set, every request must carry
 * `Authorization: Bearer <token>`. Separate from LEGION_HTTP_TOKEN so
 * the two transports can have different tokens when run simultaneously.
 *
 * Tool-layer errors (isError:true) are returned with HTTP 200.
 * HTTP 4xx/5xx indicates transport-level failure (bad request, auth, crash).
 *
 * Response shape: raw JSON — NOT wrapped in MCP content envelope.
 *
 * @param state        Shared LegionState.
 * @param port         TCP port. Pass 0 for a random available port.
 * @param getTenantId  Process-lifetime constant; never from request body.
 */
export async function bindRest(
  state: LegionState,
  port: number,
  getTenantId: () => string,
): Promise<TransportHandle> {
  const requiredToken = process.env.LEGION_REST_TOKEN;

  const httpServer: Server = createServer(async (req, res) => {
    // Auth check
    if (requiredToken) {
      const auth = req.headers['authorization'];
      if (auth !== `Bearer ${requiredToken}`) {
        send(res, 401, { error: 'Unauthorized' });
        return;
      }
    }

    // GET /v1/health
    if (req.method === 'GET' && req.url === '/v1/health') {
      const { createRequire } = await import('node:module');
      const { fileURLToPath } = await import('node:url');
      const require = createRequire(fileURLToPath(import.meta.url));
      const pkg = require('../../../package.json') as { version: string };
      send(res, 200, { status: 'ok', version: pkg.version, transport: 'rest' });
      return;
    }

    // GET /v1/catalog/stats
    if (req.method === 'GET' && req.url === '/v1/catalog/stats') {
      send(res, 200, {
        totalAdapters: state.allAdapters.length,
        configuredAdapters: state.configuredAdapterIds.size,
        loadedAt: state.loadedAt,
      });
      return;
    }

    // Only POST for tool endpoints
    if (req.method !== 'POST') {
      send(res, 404, { error: 'Not found' });
      return;
    }

    let bodyStr: string;
    try {
      bodyStr = await readBody(req);
    } catch {
      send(res, 400, { error: 'Failed to read request body' });
      return;
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(bodyStr) as Record<string, unknown>;
    } catch {
      send(res, 400, { error: 'Invalid JSON body' });
      return;
    }

    // Tenant identity is always process-configured — never from body
    void getTenantId();

    try {
      if (req.url === '/v1/tools/query') {
        if (typeof body['query'] !== 'string') {
          send(res, 400, { error: 'query field (string) is required' });
          return;
        }
        const result = await handleQuery({
          query: body['query'] as string,
          detail: body['detail'] as 'full' | 'summary' | undefined,
          discover: body['discover'] as boolean | undefined,
        }, state);
        send(res, 200, result);
        return;
      }

      if (req.url === '/v1/tools/call') {
        if (typeof body['adapter'] !== 'string' || typeof body['tool'] !== 'string') {
          send(res, 400, { error: 'adapter (string) and tool (string) fields are required' });
          return;
        }
        const result = await handleCall({
          adapter: body['adapter'] as string,
          tool: body['tool'] as string,
          args: body['args'] as Record<string, unknown> | undefined,
        }, state);
        send(res, 200, result);
        return;
      }

      if (req.url === '/v1/tools/list') {
        const result = await handleList({
          category: body['category'] as string | undefined,
          search: body['search'] as string | undefined,
        }, state);
        send(res, 200, result);
        return;
      }

      send(res, 404, { error: 'Not found' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      send(res, 500, { error: msg });
    }
  });

  const boundPort = await new Promise<number>((resolve, reject) => {
    httpServer.listen(port, () => {
      const addr = httpServer.address();
      if (addr && typeof addr === 'object') {
        resolve(addr.port);
      } else {
        reject(new Error('bindRest: could not determine bound port'));
      }
    });
    httpServer.on('error', reject);
  });

  return {
    port: boundPort,
    close(): Promise<void> {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(); // drain timeout
        }, 5000);
        httpServer.close((err) => {
          clearTimeout(timeout);
          if (err) reject(err); else resolve();
        });
      });
    },
  };
}
