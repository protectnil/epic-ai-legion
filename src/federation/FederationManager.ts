/**
 * @epicai/legion — Federation Manager
 * Manages connections to multiple MCP servers, provides unified tool discovery,
 * invocation, and cross-source correlation.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type {
  FederationConfig,
  ServerConnection,
  ConnectionHealth,
  Tool,
  ToolResult,
  CorrelationQuery,
  CorrelationResult,
} from '../types/index.js';
import { ConnectionPool } from './ConnectionPool.js';
import { ToolRegistry } from './ToolRegistry.js';
import { Correlator } from './Correlator.js';
import type { MCPAdapter } from './adapters/base.js';
import type { AdapterCatalog } from './AdapterCatalog.js';
import { createLogger } from '../logger.js';

const log = createLogger('federation.manager');

/**
 * Optional extensions to FederationManager construction. The catalog
 * enables runtime revocation enforcement: when set, the manager refuses
 * to connect to or call tools on adapters whose catalog entries are
 * marked `revoked: true`. If `catalog` is omitted, revocation checks
 * are skipped and behavior matches pre-1.2.0 Legion releases.
 */
export interface FederationManagerOptions {
  /**
   * AdapterCatalog (already loaded) used to look up revocation state
   * at connect time and per-tool-call. Pass the same catalog instance
   * that AdapterCatalog.load() populated; revocations introduced via
   * refreshRevocations() after construction are honored on subsequent
   * calls because the isRevoked check reads live catalog state.
   */
  catalog?: AdapterCatalog;
}

export class FederationManager {
  private readonly pool: ConnectionPool;
  private readonly registry: ToolRegistry;
  private readonly correlator: Correlator;
  private readonly config: FederationConfig;
  private readonly adapterMap = new Map<string, MCPAdapter>();
  private readonly catalog: AdapterCatalog | undefined;

  constructor(config: FederationConfig, options: FederationManagerOptions = {}) {
    this.config = config;
    this.catalog = options.catalog;
    this.pool = new ConnectionPool(
      config.retryPolicy,
      config.healthCheckIntervalMs,
    );
    this.registry = new ToolRegistry();
    this.correlator = new Correlator();
  }

  /**
   * Build a structured ToolResult representing a revoked-adapter refusal.
   * Shared helper so the exact shape stays consistent for every rejection
   * path.
   */
  private buildRevokedToolResult(
    tool: Tool,
    details: { revokedAt?: string; reason?: string } | undefined,
    startedAt: number,
  ): ToolResult {
    const reason = details?.reason ?? 'no reason recorded';
    const message = `Tool "${tool.name}" blocked: adapter "${tool.server}" is revoked in the catalog (${reason}).`;
    log.warn('federation_manager.blocked_revoked_call', {
      adapterId: tool.server,
      toolName: tool.name,
      reason: details?.reason,
      revokedAt: details?.revokedAt,
    });
    return {
      content: [{ type: 'text', text: message }],
      isError: true,
      server: tool.server,
      tool: tool.name,
      durationMs: Date.now() - startedAt,
    } as ToolResult;
  }

  /**
   * Connect to a single MCP server.
   * Discovers tools and registers them in the unified catalog.
   */
  async connect(
    name: string,
    config: ServerConnection,
    adapterOrFactory?: MCPAdapter | ((config: ServerConnection) => MCPAdapter),
  ): Promise<this> {
    // Revocation gate: if a catalog was provided and the adapter is
    // marked revoked, refuse to connect at all. This prevents the
    // adapter from ever entering the adapterMap or the tool registry,
    // which is the strongest runtime containment the federation layer
    // can offer against a compromised or contradicted catalog entry.
    if (this.catalog?.isRevoked(name)) {
      const details = this.catalog.getRevocationDetails(name);
      log.warn('federation_manager.skipped_revoked_connect', {
        adapterId: name,
        reason: details?.reason,
        revokedAt: details?.revokedAt,
      });
      return this;
    }

    const serverConfig = { ...config, name };
    const adapter = await this.pool.connect(serverConfig, adapterOrFactory);

    this.adapterMap.set(name, adapter);

    // Discover and register tools
    const tools = await adapter.listTools();
    this.registry.registerServer(name, tools);

    return this;
  }

  /**
   * Connect to all servers defined in the federation config.
   */
  async connectAll(): Promise<void> {
    const connectPromises = this.config.servers.map(server =>
      this.connect(server.name, server),
    );
    await Promise.allSettled(connectPromises);
  }

  /**
   * Disconnect from a specific server.
   */
  async disconnect(name: string): Promise<this> {
    this.registry.unregisterServer(name);
    this.adapterMap.delete(name);
    await this.pool.disconnect(name);
    return this;
  }

  /**
   * Disconnect from all servers.
   */
  async disconnectAll(): Promise<void> {
    this.registry.clear();
    this.adapterMap.clear();
    await this.pool.disconnectAll();
  }

  /**
   * List all discovered tools across all connected servers (all tiers).
   */
  listTools(): Tool[] {
    return this.registry.listAll();
  }

  /**
   * List only orchestrated tools (eligible for SLM selection via pre-filter).
   */
  listOrchestratedTools(): Tool[] {
    return this.registry.listOrchestrated();
  }

  /**
   * List only direct tools (callable by explicit name, not sent to SLM).
   */
  listDirectTools(): Tool[] {
    return this.registry.listDirect();
  }

  /**
   * List tools from a specific server.
   */
  listToolsByServer(server: string): Tool[] {
    return this.registry.listByServer(server);
  }

  /**
   * Call a tool by name. Automatically routes to the correct server.
   * Validates required fields from the tool's parameters schema before dispatch.
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const startedAt = Date.now();
    const tool = this.registry.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found in any connected server`);
    }

    // Revocation gate (defense in depth — connect() already skips revoked
    // adapters, but the catalog can be updated between connect time and
    // call time via a catalog refresh, so every call re-checks live
    // catalog state before dispatch).
    //
    // SCOPE LIMITATION (TOCTOU): This check runs BEFORE the dispatch.
    // Between the moment `this.catalog.isRevoked(tool.server)` returns
    // false and the moment the awaited `adapter.callTool(...)` below
    // completes, the catalog can be mutated by an async refresh. A
    // tool call that was already in flight at the moment of revocation
    // will complete normally — the vendor has already received the
    // request; the federation layer cannot retroactively cancel it.
    //
    // This is the intentional 1.1.0 boundary. The revocation gate in
    // 1.2.0 prevents NEW dispatch to revoked adapters; it does not
    // cancel in-flight invocations. Cooperative per-call cancellation
    // is planned for 1.2.0 as part of the runtime adapter unload work
    // (L3 in the upstream Fabrique integration roadmap). Until then,
    // users concerned about the in-flight window should (a) keep
    // revocation refresh intervals short and (b) ensure tool calls
    // have tight client-side timeouts so an in-flight call on a
    // just-revoked adapter does not linger past the refresh cadence.
    if (this.catalog?.isRevoked(tool.server)) {
      return this.buildRevokedToolResult(
        tool,
        this.catalog.getRevocationDetails(tool.server),
        startedAt,
      );
    }

    // Basic JSON Schema required-field type checking
    const schema = tool.parameters as { required?: string[]; properties?: Record<string, { type?: string }> };
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in args)) {
          throw new Error(`Tool "${name}" missing required argument: "${field}"`);
        }
        const propSchema = schema.properties?.[field];
        if (propSchema?.type) {
          const actualType = Array.isArray(args[field]) ? 'array' : typeof args[field];
          if (actualType !== propSchema.type) {
            throw new Error(`Tool "${name}" argument "${field}" expected type "${propSchema.type}", got "${actualType}"`);
          }
        }
      }
    }

    const adapter = this.adapterMap.get(tool.server);
    if (!adapter) {
      throw new Error(`Server "${tool.server}" for tool "${name}" is not connected`);
    }

    // Use the original tool name (without server prefix) for the MCP call
    const originalName = name.includes(':') ? name.split(':').slice(1).join(':') : name;
    return adapter.callTool(originalName, args);
  }

  /**
   * Correlate entities and events across connected servers.
   */
  async correlate(query: CorrelationQuery): Promise<CorrelationResult> {
    return this.correlator.correlate(query, this.adapterMap);
  }

  /**
   * Get health status of all connections.
   */
  async health(): Promise<ConnectionHealth[]> {
    return this.pool.health();
  }

  /**
   * Register a callback for health status changes.
   */
  onHealthChange(callback: (health: ConnectionHealth) => void): void {
    this.pool.onHealthChange(callback);
  }

  /**
   * Start periodic health monitoring.
   */
  startHealthCheck(): void {
    this.pool.startHealthCheck();
  }

  /**
   * Stop periodic health monitoring.
   */
  stopHealthCheck(): void {
    this.pool.stopHealthCheck();
  }

  /**
   * Number of connected servers.
   */
  get serverCount(): number {
    return this.pool.size;
  }

  /**
   * Total number of discovered tools.
   */
  get toolCount(): number {
    return this.registry.size;
  }
}
