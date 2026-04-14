/**
 * @epicai/legion — stdio Transport
 * Binds a McpServer to stdio (StdioServerTransport).
 * Default transport — identical behavior to Legion 1.x.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Connect the server to stdio.
 * The process remains alive until the parent closes stdin — no handle is returned.
 */
export async function bindStdio(server: McpServer): Promise<void> {
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
