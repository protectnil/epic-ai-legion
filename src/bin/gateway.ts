#!/usr/bin/env node
/**
 * @epicai/core — Gateway CLI
 * `npx epic-ai-gateway` — starts the Inference Gateway.
 * This is the ONLY file that calls http.createServer.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import http from 'node:http';
import { InferenceGateway } from '../gateway/InferenceGateway.js';
import { BackendRegistry } from '../gateway/BackendRegistry.js';
import { ControlPlane } from '../gateway/ControlPlane.js';
import { Router } from '../gateway/Router.js';
import { DEFAULT_GATEWAY_CONFIG } from '../gateway/types.js';
import type { GatewayConfig } from '../gateway/types.js';

function parseArgs(argv: string[]): Partial<GatewayConfig> {
  const config: Partial<GatewayConfig> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--port':
        config.port = parseInt(argv[++i], 10);
        break;
      case '--redis-url':
        config.redisUrl = argv[++i];
        break;
      case '--no-auto-discover':
        config.autoDiscover = false;
        break;
      case '--no-ollama-shim':
        config.ollamaShim = { ...DEFAULT_GATEWAY_CONFIG.ollamaShim, enabled: false };
        break;
    }
  }

  return config;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const config: GatewayConfig = { ...DEFAULT_GATEWAY_CONFIG, ...args };

  const controlPlane = new ControlPlane(config.redisUrl);
  const registry = new BackendRegistry(controlPlane, config);
  const router = new Router(registry, controlPlane, config);
  const gateway = new InferenceGateway(registry, controlPlane, router, config);

  await gateway.start();

  const server = http.createServer((req, res) => {
    gateway.handleRequest(req, res).catch(err => {
      console.error('Unhandled gateway error:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal gateway error' }));
      }
    });
  });

  server.listen(config.port, () => {
    const backends = registry.backends();
    console.log('');
    console.log('  Epic AI\u00AE Inference Gateway');
    console.log('  ============================');
    console.log(`  Port:          ${config.port}`);
    console.log(`  Control plane: ${controlPlane.controlPlaneStatus}`);
    console.log(`  Auto-discover: ${config.autoDiscover}`);
    console.log(`  Ollama shim:   ${config.ollamaShim.enabled ? 'enabled (deprecated)' : 'disabled'}`);
    console.log('');
    backends.then(bs => {
      if (bs.length === 0) {
        console.log('  No backends discovered. Start an inference server and restart the gateway.');
      } else {
        for (const b of bs) {
          console.log(`  Backend: ${b.url} [${b.type}] ${b.status} (${b.modelIds.join(', ') || 'no models'})`);
        }
      }
      console.log('');
    });
  });

  const shutdown = async () => {
    console.log('\n  Shutting down...');
    server.close();
    await gateway.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('Gateway startup failed:', err);
  process.exit(1);
});
