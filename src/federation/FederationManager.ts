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

    // L3 (1.4.0) runtime unload gate. beginCall() atomically checks
    // that the adapter is in the `connected` state and increments the
    // in-flight counter. If the adapter has been marked `unloading`
    // between tool resolution and dispatch, beginCall returns false
    // and we return an error ToolResult instead of dispatching.
    //
    // This gate closes the TOCTOU window that L1 documented as a
    // scope limitation. Combined with `unloadAdapter()` below, a
    // revocation can now both (a) prevent new dispatches AND (b)
    // wait for in-flight calls to drain before closing the transport.
    if (!this.pool.beginCall(tool.server)) {
      return this.buildUnloadingToolResult(tool, startedAt);
    }

    try {
      // Use the original tool name (without server prefix) for the MCP call
      const originalName = name.includes(':') ? name.split(':').slice(1).join(':') : name;
      return await adapter.callTool(originalName, args);
    } finally {
      this.pool.endCall(tool.server);
    }
  }

  /**
   * Runtime adapter unload — L3 (1.4.0).
   *
   * Removes a single adapter from the federation without restarting
   * the process. The sequence is:
   *
   *   1. Mark the adapter as `unloading` in the pool. New dispatches
   *      via `callTool()` will now return an error ToolResult instead
   *      of routing to the adapter.
   *   2. Wait for in-flight calls to drain, bounded by
   *      `maxQuiescenceMs` (default 30s). Calls that started before
   *      step 1 run to completion — the federation layer does not
   *      cancel them.
   *   3. Close the transport via `ConnectionPool.disconnect()`,
   *      remove from `ToolRegistry`, remove from `adapterMap`.
   *
   * Returns a result object describing the outcome so the caller
   * (kill-list watcher, manual API, or a tool-layer admin call) can
   * log it.
   *
   * Unknown adapter names are a no-op — returns
   * `{ success: false, reason: 'unknown' }` without throwing.
   */
  async unloadAdapter(
    name: string,
    reason: string,
    options: { maxQuiescenceMs?: number } = {},
  ): Promise<{
    success: boolean;
    reason: string;
    quiescent: boolean;
    inFlightAtClose: number;
    durationMs: number;
    /**
     * When success is false AND the adapter was known, this carries
     * the underlying error message so operator tooling can surface
     * the reason (usually a transport close failure on the MCP
     * adapter's side). Undefined on success or when the adapter
     * was unknown.
     */
    error?: string;
  }> {
    const startedAt = Date.now();
    const maxQuiescenceMs = options.maxQuiescenceMs ?? 30_000;

    if (!this.adapterMap.has(name)) {
      return {
        success: false,
        reason: 'unknown',
        quiescent: true,
        inFlightAtClose: 0,
        durationMs: Date.now() - startedAt,
      };
    }

    log.info('federation_manager.unload.begin', { adapterId: name, reason });

    // Step 1: flip state so new dispatches are refused
    this.pool.markUnloading(name);

    // Step 2: wait for in-flight calls to drain
    const quiescent = await this.pool.waitForQuiescence(name, maxQuiescenceMs);
    const inFlightAtClose = this.pool.inFlightCount(name);

    if (!quiescent) {
      log.warn('federation_manager.unload.quiescence_timeout', {
        adapterId: name,
        maxQuiescenceMs,
        inFlightAtClose,
        note:
          'proceeding with transport close; in-flight calls will observe abort when their own adapter transport shuts down',
      });
    }

    // Step 3: tear down the registry + pool entries for this adapter.
    //
    // Order matters. We disconnect the transport FIRST so that any
    // failure surfaces as a caller-visible error on this function's
    // return value — if disconnect throws, the pool is left with the
    // adapter still in its map in the `unloading` state, which is
    // the recoverable failure state. Only after a clean disconnect
    // do we unregister from the registry and adapterMap. If we
    // unregistered first and disconnect then threw, we'd have a
    // tool-registry-clean-but-pool-stale inconsistency that no
    // caller could observe.
    let disconnectError: string | undefined;
    try {
      await this.pool.disconnect(name);
    } catch (err) {
      disconnectError = err instanceof Error ? err.message : String(err);
      log.error('federation_manager.unload.disconnect_failed', {
        adapterId: name,
        error: disconnectError,
        note: 'adapter remains in pool in unloading state; retry unload after investigating',
      });
    }

    if (disconnectError) {
      // Failed unload — do NOT remove from the registry or adapterMap.
      // The adapter is in a limbo state where new dispatches are
      // refused (pool.markUnloading is set) but the transport is
      // still present. A subsequent unloadAdapter call can retry.
      const durationMs = Date.now() - startedAt;
      return {
        success: false,
        reason,
        quiescent,
        inFlightAtClose,
        durationMs,
        error: disconnectError,
      };
    }

    // Clean disconnect — remove registry + map entries
    this.registry.unregisterServer(name);
    this.adapterMap.delete(name);

    const durationMs = Date.now() - startedAt;
    log.info('federation_manager.unload.complete', {
      adapterId: name,
      reason,
      quiescent,
      inFlightAtClose,
      durationMs,
    });

    return {
      success: true,
      reason,
      quiescent,
      inFlightAtClose,
      durationMs,
    };
  }

  /**
   * Build an error ToolResult for a call that arrived during an
   * active unload. Same shape as the revocation refusal — callers
   * handling errors should not need to distinguish the two cases.
   */
  private buildUnloadingToolResult(tool: Tool, startedAt: number): ToolResult {
    const message = `Tool "${tool.name}" blocked: adapter "${tool.server}" is currently unloading from the federation. Retry after the unload completes, or resolve the underlying revocation.`;
    log.warn('federation_manager.blocked_unloading_call', {
      adapterId: tool.server,
      toolName: tool.name,
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
   * List the names of all currently-connected adapters. Used by
   * KillListWatcher (L3, 1.4.0) to diff against an incoming kill
   * list. Stable snapshot — mutations to the pool after this call
   * do not affect the returned array.
   */
  serverNames(): string[] {
    return this.pool.serverNames();
  }

  /**
   * Total number of discovered tools.
   */
  get toolCount(): number {
    return this.registry.size;
  }
}
