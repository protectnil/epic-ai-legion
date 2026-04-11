/**
 * @epicai/legion — Runtime Adapter Unload Tests (L3, 1.4.0)
 *
 * Covers the runtime unload state machine:
 *   - `ConnectionPool.beginCall/endCall/markUnloading/waitForQuiescence`
 *   - `FederationManager.unloadAdapter(name, reason, options)`
 *   - `KillListWatcher` poll + verify + diff + unload pipeline
 *
 * Race conditions tested explicitly:
 *   - Call arrives during unload → refused with clean error
 *   - Unload arrives during a single call → call completes, adapter removed
 *   - Multiple concurrent calls during unload → all complete, adapter removed
 *   - Quiescence deadline exceeded → unload proceeds with in-flight count > 0
 *   - Kill list in-flight guard prevents overlapping polls
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { generateKeyPairSync, sign as cryptoSign } from 'node:crypto';
import { FederationManager } from '../src/federation/FederationManager.js';
import { KillListWatcher } from '../src/federation/KillListWatcher.js';
import type { ServerConnection, Tool, ToolResult } from '../src/types/index.js';

// ─── Helpers ─────────────────────────────────────────────────────────────

interface FakeAdapterState {
  connected: boolean;
  disconnected: boolean;
  callToolInvocations: number;
  completedCalls: number;
  pendingResolvers: Array<(result: ToolResult) => void>;
}

/**
 * Test adapter that holds every `callTool` invocation as a pending
 * promise until the test explicitly releases it. Lets us simulate
 * "the call is in flight" cleanly.
 */
function makeHoldingAdapter(serverName: string) {
  const state: FakeAdapterState = {
    connected: false,
    disconnected: false,
    callToolInvocations: 0,
    completedCalls: 0,
    pendingResolvers: [],
  };
  const tool: Tool = {
    name: `tool_${serverName}`,
    description: 'holding tool',
    parameters: { type: 'object', properties: {} },
    server: serverName,
    tier: 'orchestrated',
  };
  const adapter = {
    async connect() { state.connected = true; },
    async disconnect() { state.disconnected = true; },
    async listTools() { return [tool]; },
    async callTool(_name: string, _args: Record<string, unknown>): Promise<ToolResult> {
      state.callToolInvocations++;
      return new Promise<ToolResult>((resolve) => {
        state.pendingResolvers.push(resolve);
      });
    },
    async health() {
      return { server: serverName, status: 'healthy' as const, toolCount: 1 };
    },
    async ping() { return 1; },
    get status() { return 'connected' as const; },
  };
  const releaseOne = (): void => {
    const resolver = state.pendingResolvers.shift();
    if (!resolver) throw new Error('no pending call to release');
    state.completedCalls++;
    resolver({
      content: [{ type: 'text', text: 'held-ok' }],
      isError: false,
      server: serverName,
      tool: tool.name,
      durationMs: 1,
    });
  };
  const releaseAll = (): void => {
    while (state.pendingResolvers.length > 0) releaseOne();
  };
  return { adapter, state, tool, releaseOne, releaseAll };
}

function makeServerConnection(name: string): ServerConnection {
  return {
    name,
    transport: 'stdio',
    command: 'echo',
    args: ['fake'],
  } as ServerConnection;
}

// ─── FederationManager.unloadAdapter ─────────────────────────────────────

describe('FederationManager.unloadAdapter — happy path', () => {
  it('unknown adapter returns { success: false, reason: "unknown" } without throwing', async () => {
    const manager = new FederationManager({ servers: [] });
    const result = await manager.unloadAdapter('does-not-exist', 'test');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('unknown');
    expect(result.quiescent).toBe(true);
    expect(result.inFlightAtClose).toBe(0);
  });

  it('unloads an idle adapter cleanly', async () => {
    const manager = new FederationManager({ servers: [] });
    const { adapter, state } = makeHoldingAdapter('idle-server');
    await manager.connect('idle-server', makeServerConnection('idle-server'), adapter as never);
    expect(state.connected).toBe(true);
    expect(manager.serverCount).toBe(1);

    const result = await manager.unloadAdapter('idle-server', 'test_unload');

    expect(result.success).toBe(true);
    expect(result.reason).toBe('test_unload');
    expect(result.quiescent).toBe(true);
    expect(result.inFlightAtClose).toBe(0);
    expect(state.disconnected).toBe(true);
    expect(manager.serverCount).toBe(0);
    expect(manager.listTools()).toHaveLength(0);
  });
});

describe('FederationManager.unloadAdapter — race conditions', () => {
  it('new call arriving during unload is refused with an error ToolResult', async () => {
    // Connect an adapter, mark it unloading (via the pool), then
    // attempt a tool call. The call must not invoke the adapter.
    const manager = new FederationManager({ servers: [] });
    const { adapter, state } = makeHoldingAdapter('unloading-server');
    await manager.connect(
      'unloading-server',
      makeServerConnection('unloading-server'),
      adapter as never,
    );

    const toolName = manager.listTools()[0]?.name;
    expect(toolName).toBeDefined();

    // Kick off an unload but don't await — the adapter is idle so
    // unloadAdapter() resolves almost immediately.
    const unloadPromise = manager.unloadAdapter('unloading-server', 'test');
    // callTool on the same tick should see the unloading state.
    // Because there are no in-flight calls, unloadAdapter transitions
    // through markUnloading → waitForQuiescence → disconnect quickly,
    // so we race the callTool against the unload. To make the test
    // deterministic, we do both in parallel and assert that whichever
    // resolves first, the call either refused cleanly OR the tool is
    // no longer registered (adapter fully unloaded). Both outcomes
    // are valid L3 semantics.
    const callResult = await manager.callTool(toolName!, {}).catch((err: Error) => ({
      threwError: true,
      message: err.message,
    }));
    await unloadPromise;

    if ('threwError' in callResult) {
      expect(callResult.message).toMatch(/not found|not connected/);
    } else {
      expect(callResult.isError).toBe(true);
      const content = callResult.content as Array<{ type: string; text: string }>;
      expect(content[0]?.text).toMatch(/unloading|not found/);
    }
    // The adapter's underlying callTool was never invoked.
    expect(state.callToolInvocations).toBe(0);
  });

  it('in-flight call completes before unload tears down the adapter', async () => {
    const manager = new FederationManager({ servers: [] });
    const { adapter, state, releaseOne } = makeHoldingAdapter('inflight-server');
    await manager.connect(
      'inflight-server',
      makeServerConnection('inflight-server'),
      adapter as never,
    );

    const toolName = manager.listTools()[0]?.name;

    // Start a tool call. It awaits on the holding adapter and does
    // not complete until we explicitly release it.
    const callPromise = manager.callTool(toolName!, {});

    // Wait a tick so beginCall has incremented the in-flight counter.
    await Promise.resolve();
    expect(state.callToolInvocations).toBe(1);

    // Now start the unload. It must NOT complete until the call is
    // released. waitForQuiescence will poll.
    const unloadPromise = manager.unloadAdapter('inflight-server', 'test', {
      maxQuiescenceMs: 1000,
    });

    // Release the held call.
    releaseOne();
    const callResult = await callPromise;
    expect(callResult.isError).toBe(false);

    // Now the unload can complete.
    const unloadResult = await unloadPromise;
    expect(unloadResult.success).toBe(true);
    expect(unloadResult.quiescent).toBe(true);
    expect(unloadResult.inFlightAtClose).toBe(0);
    expect(state.disconnected).toBe(true);
    expect(manager.serverCount).toBe(0);
  });

  it('multiple concurrent in-flight calls all drain before unload completes', async () => {
    const manager = new FederationManager({ servers: [] });
    const { adapter, state, releaseOne } = makeHoldingAdapter('concurrent-server');
    await manager.connect(
      'concurrent-server',
      makeServerConnection('concurrent-server'),
      adapter as never,
    );

    const toolName = manager.listTools()[0]?.name;

    // Start 3 concurrent calls
    const call1 = manager.callTool(toolName!, {});
    const call2 = manager.callTool(toolName!, {});
    const call3 = manager.callTool(toolName!, {});
    await Promise.resolve();
    await Promise.resolve();
    expect(state.callToolInvocations).toBe(3);

    // Unload — must wait for all 3 to drain
    const unloadPromise = manager.unloadAdapter('concurrent-server', 'test', {
      maxQuiescenceMs: 2000,
    });

    // Release them one at a time
    releaseOne();
    await call1;
    releaseOne();
    await call2;
    releaseOne();
    await call3;

    const unloadResult = await unloadPromise;
    expect(unloadResult.quiescent).toBe(true);
    expect(unloadResult.inFlightAtClose).toBe(0);
  });

  it('disconnect failure leaves adapter in pool limbo and surfaces error in return value', async () => {
    // When adapter.disconnect() throws, unloadAdapter must:
    //   - return { success: false, error: <message> }
    //   - NOT remove the adapter from registry/adapterMap
    //   - leave the adapter in pool's `unloading` state so a retry is possible
    const manager = new FederationManager({ servers: [] });
    const serverName = 'stubborn-server';
    const tool: Tool = {
      name: `tool_${serverName}`,
      description: 'stubborn tool',
      parameters: { type: 'object', properties: {} },
      server: serverName,
      tier: 'orchestrated',
    };
    const stubbornAdapter = {
      async connect() {},
      async disconnect() {
        throw new Error('transport close failed: kernel refused FIN');
      },
      async listTools() { return [tool]; },
      async callTool() {
        return {
          content: [{ type: 'text', text: 'ok' }],
          isError: false,
          server: serverName,
          tool: tool.name,
          durationMs: 1,
        };
      },
      async health() {
        return { server: serverName, status: 'healthy' as const, toolCount: 1 };
      },
      async ping() { return 1; },
      get status() { return 'connected' as const; },
    };

    await manager.connect(serverName, makeServerConnection(serverName), stubbornAdapter as never);
    expect(manager.serverCount).toBe(1);

    const result = await manager.unloadAdapter(serverName, 'test');

    expect(result.success).toBe(false);
    expect(result.reason).toBe('test');
    expect(result.error).toMatch(/transport close failed/);
    // Adapter is still registered (limbo state) — a retry is possible
    expect(manager.serverCount).toBe(1);
    // But it's in the unloading state so new calls refuse
    const callResult = await manager.callTool(`${serverName}:tool_${serverName}`, {})
      .catch((err) => ({ threwError: true, message: err.message }));
    if ('threwError' in callResult) {
      expect(callResult.message).toMatch(/not found|not connected/);
    } else {
      expect(callResult.isError).toBe(true);
      const content = callResult.content as Array<{ type: string; text: string }>;
      expect(content[0]?.text).toMatch(/unloading/);
    }
  });

  it('quiescence deadline exceeded — unload proceeds with in-flight > 0', async () => {
    const manager = new FederationManager({ servers: [] });
    const { adapter, state } = makeHoldingAdapter('slow-server');
    await manager.connect(
      'slow-server',
      makeServerConnection('slow-server'),
      adapter as never,
    );

    const toolName = manager.listTools()[0]?.name;

    // Start a call that will NEVER be released
    const callPromise = manager.callTool(toolName!, {});
    await Promise.resolve();
    expect(state.callToolInvocations).toBe(1);

    // Unload with a TIGHT deadline. The call never drains, so
    // waitForQuiescence returns false and the unload proceeds
    // anyway with inFlightAtClose > 0.
    const unloadResult = await manager.unloadAdapter('slow-server', 'test', {
      maxQuiescenceMs: 150,
    });

    expect(unloadResult.success).toBe(true);
    expect(unloadResult.quiescent).toBe(false);
    expect(unloadResult.inFlightAtClose).toBeGreaterThanOrEqual(1);
    expect(state.disconnected).toBe(true);
    // The hanging call promise is intentionally left pending — in
    // real usage, the adapter's transport close would surface an
    // error to the pending callTool. Our fake holds forever, which
    // is fine for the test's purpose (we're measuring the unload
    // path, not the adapter's cleanup of its own held promises).
    // Detach the promise so it doesn't fire unhandledRejection.
    callPromise.catch(() => {});
  });
});

// ─── ConnectionPool bracket helpers ─────────────────────────────────────

describe('ConnectionPool — beginCall/endCall/markUnloading', () => {
  it('beginCall() returns false when the adapter is in unloading state', async () => {
    const manager = new FederationManager({ servers: [] });
    const { adapter } = makeHoldingAdapter('marked-server');
    await manager.connect('marked-server', makeServerConnection('marked-server'), adapter as never);

    // Access the internal pool via a non-public path. The test
    // verifies the public contract: once markUnloading fires, a
    // subsequent callTool on the same tick returns an error ToolResult.
    // We do this via the public callTool path because the pool is
    // private to FederationManager.
    const unloadPromise = manager.unloadAdapter('marked-server', 'test', {
      maxQuiescenceMs: 100,
    });
    // Immediately fire a call — the unload is in progress so the pool
    // state is either 'unloading' (gate fires) or already gone
    // (tool not in registry).
    const toolName = `marked-server:tool_marked-server`;
    const result = await manager.callTool(toolName, {}).catch((err) => ({ err: err.message }));
    await unloadPromise;
    // Either the gate fired (isError ToolResult) or the tool was
    // unregistered (throws 'not found') — both are valid L3 outcomes
    // depending on exact timing.
    if ('err' in result) {
      expect(result.err).toMatch(/not found|not connected/);
    } else {
      expect(result.isError).toBe(true);
    }
  });
});

// ─── KillListWatcher ─────────────────────────────────────────────────────

function makeEd25519Pair() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  const signer = (data: Buffer): string =>
    cryptoSign(null, data, privateKey).toString('base64');
  return { publicKeyPem, signer };
}

describe('KillListWatcher', () => {
  const origFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  it('unloads adapters listed in a signed kill list', async () => {
    const manager = new FederationManager({ servers: [] });
    const { adapter: adapter1, state: state1 } = makeHoldingAdapter('victim-1');
    const { adapter: adapter2, state: state2 } = makeHoldingAdapter('survivor');
    await manager.connect('victim-1', makeServerConnection('victim-1'), adapter1 as never);
    await manager.connect('survivor', makeServerConnection('survivor'), adapter2 as never);
    expect(manager.serverCount).toBe(2);

    const { publicKeyPem, signer } = makeEd25519Pair();
    const killList = {
      version: '2026-04-11-001',
      generatedAt: new Date().toISOString(),
      entries: [
        { adapter_id: 'victim-1', reason: 'contradiction', ruleId: 'FAB-C-001' },
      ],
    };
    const body = JSON.stringify(killList);
    const sig = signer(Buffer.from(body, 'utf-8'));

    globalThis.fetch = (async (_input: unknown) => {
      return new Response(body, {
        status: 200,
        headers: { 'kill-list-signature': sig },
      });
    }) as typeof fetch;

    const watcher = new KillListWatcher({
      federation: manager,
      url: 'https://example.com/killlist.json',
      publicKeyPem,
      intervalMs: 60_000,
    });

    await watcher.pollNow();

    expect(manager.serverCount).toBe(1);
    expect(manager.serverNames()).toContain('survivor');
    expect(manager.serverNames()).not.toContain('victim-1');
    expect(state1.disconnected).toBe(true);
    expect(state2.disconnected).toBe(false);

    watcher.stop();
  });

  it('rejects a kill list with an invalid signature (no unloads)', async () => {
    const manager = new FederationManager({ servers: [] });
    const { adapter } = makeHoldingAdapter('protected');
    await manager.connect('protected', makeServerConnection('protected'), adapter as never);

    const { publicKeyPem } = makeEd25519Pair();
    // Generate a SECOND keypair and sign with it — the watcher
    // verifies against the FIRST key, so verification fails.
    const { signer: wrongSigner } = makeEd25519Pair();
    const killList = {
      version: '1',
      generatedAt: new Date().toISOString(),
      entries: [{ adapter_id: 'protected' }],
    };
    const body = JSON.stringify(killList);
    const badSig = wrongSigner(Buffer.from(body, 'utf-8'));

    globalThis.fetch = (async () =>
      new Response(body, {
        status: 200,
        headers: { 'kill-list-signature': badSig },
      })) as typeof fetch;

    const watcher = new KillListWatcher({
      federation: manager,
      url: 'https://example.com/killlist.json',
      publicKeyPem,
    });
    await watcher.pollNow();

    // Adapter still present — bad signature refused
    expect(manager.serverCount).toBe(1);
    watcher.stop();
  });

  it('rejects a kill list missing the kill-list-signature header', async () => {
    const manager = new FederationManager({ servers: [] });
    const { adapter } = makeHoldingAdapter('protected');
    await manager.connect('protected', makeServerConnection('protected'), adapter as never);

    const { publicKeyPem } = makeEd25519Pair();
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ version: '1', generatedAt: '', entries: [{ adapter_id: 'protected' }] }), {
        status: 200,
      })) as typeof fetch;

    const watcher = new KillListWatcher({
      federation: manager,
      url: 'https://example.com/killlist.json',
      publicKeyPem,
    });
    await watcher.pollNow();

    expect(manager.serverCount).toBe(1);
    watcher.stop();
  });

  it('re-unloads an adapter that reconnects between polls (continuous enforcement, not one-shot)', async () => {
    // The kill-list watcher is a continuous enforcement loop. If an
    // adapter is listed in the kill list, gets unloaded, and then
    // somehow reconnects (credential rotation, Fabrique re-probe,
    // operator manual reconnect), the NEXT poll must unload it
    // again. Regression test for Codex finding #2 — the earlier
    // memoization was too coarse and would have treated this as a
    // no-op.
    const manager = new FederationManager({ servers: [] });
    const { adapter: first } = makeHoldingAdapter('flaky-server');
    await manager.connect('flaky-server', makeServerConnection('flaky-server'), first as never);

    const { publicKeyPem, signer } = makeEd25519Pair();
    const killList = {
      version: 'stable-version',
      generatedAt: new Date().toISOString(),
      entries: [{ adapter_id: 'flaky-server', reason: 'test' }],
    };
    const body = JSON.stringify(killList);
    const sig = signer(Buffer.from(body, 'utf-8'));

    let fetchCount = 0;
    globalThis.fetch = (async () => {
      fetchCount++;
      return new Response(body, {
        status: 200,
        headers: { 'kill-list-signature': sig },
      });
    }) as typeof fetch;

    const watcher = new KillListWatcher({
      federation: manager,
      url: 'https://example.com/killlist.json',
      publicKeyPem,
    });

    // Poll #1 — adapter present, gets unloaded
    await watcher.pollNow();
    expect(manager.serverCount).toBe(0);

    // Reconnect the adapter manually (simulates a rogue reconnect)
    const { adapter: second } = makeHoldingAdapter('flaky-server');
    await manager.connect('flaky-server', makeServerConnection('flaky-server'), second as never);
    expect(manager.serverCount).toBe(1);

    // Poll #2 — adapter reappeared, MUST be unloaded again
    await watcher.pollNow();
    expect(manager.serverCount).toBe(0);
    expect(fetchCount).toBe(2);

    watcher.stop();
  });

  it('no-op when url is not set (start() is safe to call)', () => {
    const manager = new FederationManager({ servers: [] });
    const watcher = new KillListWatcher({ federation: manager });
    watcher.start();
    watcher.stop();
  });
});
