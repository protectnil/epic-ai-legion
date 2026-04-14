/**
 * @epicai/legion — Streamable-HTTP Transport
 * Binds a McpServer to a node:http server over the MCP Streamable-HTTP protocol.
 * Pattern taken from src/harness/http/process.ts (proven in integration tests).
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TransportHandle } from '../TransportHandle.js';

/**
 * Bind the server to a Streamable-HTTP MCP transport.
 *
 * Auth: if LEGION_HTTP_TOKEN is set, every request must carry
 * `Authorization: Bearer <token>`. If unset, no auth is enforced —
 * operator's responsibility (bind to loopback or put behind a reverse proxy).
 *
 * tenantId is always the process-configured LEGION_TENANT_ID ?? 'local'.
 * No JWT parsing, no per-request identity derivation.
 *
 * @param server  Pre-configured McpServer with tools already registered.
 * @param port    TCP port to listen on. Pass 0 to bind to a random available port.
 * @returns       TransportHandle with close() and the actual bound port.
 */
export async function bindHttp(server: McpServer, port: number): Promise<TransportHandle> {
  const { StreamableHTTPServerTransport } = await import(
    '@modelcontextprotocol/sdk/server/streamableHttp.js'
  );

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  await server.connect(transport);

  const requiredToken = process.env.LEGION_HTTP_TOKEN;

  const httpServer: Server = createServer(async (req, res) => {
    if (requiredToken) {
      const auth = req.headers['authorization'];
      if (auth !== `Bearer ${requiredToken}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
    }

    if (req.url !== '/mcp') {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    try {
      await transport.handleRequest(req, res);
    } catch {
      if (!res.headersSent) {
        res.writeHead(500);
        res.end('Internal error');
      }
    }
  });

  const boundPort = await new Promise<number>((resolve, reject) => {
    httpServer.listen(port, () => {
      const addr = httpServer.address();
      if (addr && typeof addr === 'object') {
        resolve(addr.port);
      } else {
        reject(new Error('bindHttp: could not determine bound port'));
      }
    });
    httpServer.on('error', reject);
  });

  return {
    port: boundPort,
    close(): Promise<void> {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(); // drain timeout — proceed with exit after 5 s
        }, 5000);
        httpServer.close((err) => {
          clearTimeout(timeout);
          if (err) reject(err); else resolve();
        });
      });
    },
  };
}
