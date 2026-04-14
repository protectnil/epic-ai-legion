# Legion 2.0.0 — Implementation Spec

**Date:** 2026-04-14
**Author:** CC3 (Codebase)
**Status:** Awaiting Codex review
**Target:** `@epicai/legion@2.0.0` — one complete, production-grade release

---

## 0. Scope and non-scope

### In scope

1. **Three known Codex findings** (HIGH, MEDIUM, LOW) from thread `019d89a2-cc5b-76c2-aae3-d24740c78999`
2. **Eight anti-patterns** identified by personal code review of `src/bin/setup.ts`
3. **Multi-transport refactor** — stdio (preserved), Streamable-HTTP (new), REST (new)
4. **Tenant-aware adapter filtering hook** — `getConfiguredAdapters(tenantId)` injection point for Chariot IAM and Praetor
5. **TypeScript 6** — bump `typescript` devDependency from `^5.9.3` to `^6.0.0`
6. **zod patch** — bump from `^3.23.0` to `^3.25.76` (latest v3; v4 migration is a separate session)
7. **Commit the 4 untracked enforcement files** (ci.yml, gitleaks.toml, eslint.config.js, xenova-transformers.d.ts)
8. **Delete leaked internal doc** (`docs/adapter-audit-agent-instructions.md`)
9. **Legion preflight script** — `scripts/preflight.sh` mirroring Chariot's gate
10. **Version: 2.0.0** — breaking change (CLI restructure, new injection API)

### Not in scope

- gRPC transport (deferred until a customer requests it)
- zod v4 migration (breaking changes; separate session)
- `@types/node` bump beyond `^22.0.0` (Node 22 is LTS; Node 25 is unreleased)
- Chariot deeper audit (after Legion 2.0.0 ships)
- JWT parsing or multi-tenant routing in Legion itself — that is Chariot's middleware responsibility
- `FederationManager` tenancy changes (isolation is at the tool boundary, not the federation layer)

---

## 1. Dependency changes

| Package | Current spec | New spec | Reason |
|---|---|---|---|
| `typescript` (dev) | `^5.9.3` | `^6.0.0` | Align with platform |
| `zod` | `^3.23.0` | `^3.25.76` | Latest v3 patch |
| all others | unchanged | unchanged | Already at current |

Legion's `tsconfig.json` must be read before the first TypeScript 6 compile to confirm no flag adjustments are needed (specifically `exactOptionalPropertyTypes`).

---

## 2. Codex finding fixes

### 2.1 HIGH — `eslint.config.js` triggers on existing production code

**File:** `eslint.config.js` (untracked)
**Problem:** `'@typescript-eslint/no-non-null-assertion': 'error'` fails `npm run lint:eslint` on `src/federation/AdaptivePool.ts` lines 221, 225, 241, 242, 312, 314. All six sites use `Map.get(key)!` immediately after logic that proves the key exists. They are safe in context but the rule cannot verify that.

**Fix:** Add inline suppression comments at the six specific sites in `AdaptivePool.ts` only:

```typescript
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
// TODO: replace ! with Map-narrowing pattern (requires AdaptivePool refactor)
const entry = this.connections.get(target)!;
```

Apply the same two-line comment block at all six flagged lines. The global rule in `eslint.config.js` remains `'error'` — it is the correct default for all new code. Suppression is scoped to the six pre-existing sites where the invariant is maintained by surrounding logic.

**Rationale for not weakening the global rule:** A global downgrade to `'warn'` would silently allow new unsafe `!` assertions anywhere in the codebase, defeating the CI gate for all future code.

### 2.2 MEDIUM — `SecretsProvider` force-unwrap on optional config fields

**File:** `src/trust/secrets/SecretsProvider.ts`
**Lines:** 24 (`config.address!`), 32 (`config.vaultName!`)

**Problem:** `hashicorp-vault` and `azure-key-vault` branches force-unwrap fields typed as `?` in `SecretsConfig`. A misconfigured operator crashes with an opaque `TypeError` instead of a clear startup error.

**Fix:** Add explicit validation before construction in each branch:

```typescript
case 'hashicorp-vault': {
  if (!config.address) {
    throw new Error('SecretsProvider: hashicorp-vault requires config.address');
  }
  const { VaultProvider } = await import('./VaultProvider.js');
  return new VaultProvider(config.address, config.token, config.roleId, config.secretId);
}
case 'azure-key-vault': {
  if (!config.vaultName) {
    throw new Error('SecretsProvider: azure-key-vault requires config.vaultName');
  }
  const { AzureKeyVault } = await import('./AzureKeyVault.js');
  return new AzureKeyVault(config.vaultName);
}
```

### 2.3 LOW — `RegistryLoader` type escape hatch

**File:** `src/federation/RegistryLoader.ts`
**Line:** 264 — `(connection as any).env = env`

**Problem:** `ServerConnection` does not have an `env` field, so the code escapes the type system via `as any` to attach environment variables needed by `StdioClientTransport`.

**Fix:** Add `env?: Record<string, string>` to `ServerConnection` in `src/types/index.ts`. Remove the `as any` cast. The field is optional, so existing callers that do not set it are unaffected.

---

## 3. Anti-pattern fixes in `src/bin/setup.ts`

### 3.1 Dead `void loadConfig()` call

**Line:** 392 — `void loadConfig(); // used in subcommands`

**Fix:** Delete the line. The comment is wrong. Subcommands call `loadConfig()` independently. This call has no side effects and its return value is discarded.

### 3.2 Duplicate configured-adapter detection logic

**Locations:** `startMcpServer()` lines 406–415, `cmdQuery()` lines 1155–1164 — identical logic.

**Fix:** Extract into a module-level function used by both call sites:

```typescript
function getConfiguredAdapterIds(
  allAdapters: AdapterEntry[],
  creds: Record<string, string>,
  config: LegionConfig | null,
  state: AdapterState,
): Set<string> {
  const ids = new Set<string>();
  for (const adapter of allAdapters) {
    const hasCredential = adapter.rest?.envKey ? !!creds[adapter.rest.envKey] : false;
    const hasMcpKeys = adapter.mcp?.envKeys?.some(k => !!creds[k]) ?? false;
    const isSelected = config?.selectedAdapters?.includes(adapter.id) ?? false;
    const isInState = !!state.adapters[adapter.id];
    if (hasCredential || hasMcpKeys || isSelected || isInState) {
      ids.add(adapter.id);
    }
  }
  return ids;
}
```

### 3.3 Server version hardcoded

**Line:** 397 — `new McpServer({ name: 'epic-ai-legion', version: '1.0.0' })`

**Fix:** Read version from package.json at module load time:

```typescript
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PKG_VERSION: string = (require('../../../package.json') as { version: string }).version;
```

Use `PKG_VERSION` in the `McpServer` constructor. This automatically reflects the `package.json` version — no separate change needed when the version bumps.

### 3.4 O(n) linear search in tool handler hot path

**Locations:** `legion_query` line 525, `legion_call` line 572 — `allAdapters.find(a => a.id === x)` called in loops over results.

**Fix:** Build a `Map<string, AdapterEntry>` indexed by id once at startup:

```typescript
const adapterById = new Map(allAdapters.map(a => [a.id, a]));
```

Replace all `allAdapters.find(a => a.id === x)` with `adapterById.get(x)`.

### 3.5 MCP client not closed on error — resource leak

**Locations:** stdio path lines 619–643, Streamable-HTTP path lines 650–668 in `legion_call`.

**Problem:** `client.close()` is called sequentially after `client.callTool()` with no `finally` block. If `callTool` throws, the client is never closed.

**Fix:** Wrap both paths in `try/finally`:

```typescript
await client.connect(transport);
try {
  const result = await client.callTool({ name: toolName, arguments: callArgs });
  // ... build response
} finally {
  await client.close();
}
```

### 3.6 `buildToolsForRouting()` defined after first call

**Defined at:** line 886. **First called at:** line 424.

**Fix:** Move the function definition to before `startMcpServer()`. Function hoisting makes this work today, but it obscures the dependency order and is a style anti-pattern.

### 3.7 Double unsafe cast in tool description builder

**Line:** 889 — `(adapter.mcp as Record<string, unknown>)?.toolNames as string[] | undefined`

**Problem:** Casts to `Record<string, unknown>` discard the existing type, then re-asserts `string[] | undefined` with no runtime check.

**Fix:** Add `toolNames?: string[]` to the `mcp` sub-interface on `AdapterEntry`. Access `adapter.mcp?.toolNames` directly with no casts.

### 3.8 `startMcpServer()` monolith

**Current:** One 343-line function mixing state loading, adapter indexing, vector index loading, three tool registrations, and transport binding.

**Fix:** Decompose into the module structure in Section 4. This is the structural prerequisite for adding HTTP and REST transports.

---

## 4. Multi-transport refactor

### 4.1 New module structure

The module structure and the exact function signatures for all exported functions:

```
src/
├── server/
│   ├── LegionState.ts
│   │     export async function loadLegionState(): Promise<LegionState>
│   ├── registerLegionTools.ts
│   │     export function registerLegionTools(
│   │       server: McpServer,
│   │       state: LegionState,
│   │       getTenantId: () => string,
│   │     ): void
│   ├── transports/
│   │   ├── stdio.ts
│   │   │     export async function bindStdio(server: McpServer): Promise<void>
│   │   ├── http.ts
│   │   │     export async function bindHttp(
│   │   │       server: McpServer,
│   │   │       port: number,
│   │   │     ): Promise<TransportHandle>
│   │   └── rest.ts
│   │         export async function bindRest(
│   │           state: LegionState,
│   │           port: number,
│   │           getTenantId: () => string,
│   │         ): Promise<TransportHandle>
│   └── index.ts  — re-exports all of the above
└── bin/
    └── setup.ts  — CLI wiring
```

`TransportHandle` is a minimal shared interface:

```typescript
export interface TransportHandle {
  close(): Promise<void>;
}
```

`bindStdio` does not return a `TransportHandle`. stdio is torn down implicitly when the process exits. Only HTTP and REST bindings produce handles.

### 4.2 `LegionState` contract

```typescript
export interface LegionState {
  /** All adapters from the catalog */
  allAdapters: AdapterEntry[];
  /** Indexed by adapter id for O(1) lookup */
  adapterById: Map<string, AdapterEntry>;
  /** BM25 pre-filter over configured adapters (default search scope) */
  toolPreFilter: ToolPreFilter;
  /** BM25 pre-filter over full catalog (discover mode) */
  fullCatalogFilter: ToolPreFilter;
  /** ISO timestamp of when the catalog was last loaded */
  loadedAt: string;
  /**
   * Returns adapters the given tenant is authorized to search and call.
   *
   * In Legion 2.0.0 OSS: the tenantId parameter is ignored. The function
   * always returns the globally-configured adapter set built from
   * ~/.epic-ai/.env at startup. All callers see the same set.
   *
   * This interface is the injection point for Chariot's enterprise build,
   * which replaces this function with an IAM credential-store lookup keyed
   * on tenantId. Legion 2.0.0 ships only the OSS implementation.
   */
  getConfiguredAdapters(tenantId: string): AdapterEntry[];
  /** Adapter IDs that are configured in the OSS single-user build */
  configuredAdapterIds: Set<string>;
}
```

`loadLegionState()` reads the adapter catalog, credentials, config, and adapter state; builds both ToolPreFilter indexes; loads the vector index if present; builds `adapterById`; builds `configuredAdapterIds`; stamps `loadedAt`; and returns the `LegionState`. It has no side effects on transport or server objects.

### 4.3 `registerLegionTools` contract

```typescript
export function registerLegionTools(
  server: McpServer,
  state: LegionState,
  getTenantId: () => string,
): void
```

Pure function. Registers `legion_query`, `legion_call`, `legion_list` on `server`. No I/O, no transport binding.

`getTenantId` is called inside each tool handler to obtain the tenant identity for the current invocation. It is provided by the CLI at startup and is a constant function for the entire process lifetime in the OSS build.

**`getTenantId` implementation for all Legion 2.0.0 OSS transports:**

```typescript
const getTenantId = (): string => process.env.LEGION_TENANT_ID ?? 'local';
```

This is the same constant function used for stdio, HTTP, and REST. The function is defined once in the CLI entrypoint and passed to every `registerLegionTools` call.

**Security invariant:** `tenantId` is never accepted from tool call arguments, HTTP request bodies, or any caller-controlled input. It is always the process-configured value. Multi-tenant routing based on per-request identity (e.g., JWT claims) is Chariot's responsibility, implemented by Chariot injecting a different `getConfiguredAdapters` implementation at Chariot startup. Legion 2.0.0 does not perform JWT parsing, session-based auth, or per-request identity derivation.

**Tool schemas:** The three tool schemas (`legion_query`, `legion_call`, `legion_list`) do not include a `tenantId` field. No schema changes from 1.x for these tools. The tenantId flows through `getTenantId()` inside the handler, invisible to tool callers.

### 4.4 Stdio transport

**File:** `src/server/transports/stdio.ts`

```typescript
export async function bindStdio(server: McpServer): Promise<void> {
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio runs until the parent process closes stdin — no handle needed
}
```

Extracted from the tail of the current `startMcpServer()`. Default behavior for `legion serve` with no flags — identical to 1.x. No change for Claude Desktop, Cursor, Cline, or any other stdio MCP client.

### 4.5 Streamable-HTTP transport

**File:** `src/server/transports/http.ts`

Pattern is taken directly from the proven `src/harness/http/process.ts`.

```typescript
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TransportHandle } from './TransportHandle.js';

export async function bindHttp(
  server: McpServer,
  port: number,
): Promise<TransportHandle> {
  const { StreamableHTTPServerTransport } = await import(
    '@modelcontextprotocol/sdk/server/streamableHttp.js'
  );
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  await server.connect(transport);

  // Optional static bearer token guard. If LEGION_HTTP_TOKEN is set,
  // every request must carry Authorization: Bearer <token> matching it.
  // If LEGION_HTTP_TOKEN is not set, no auth is enforced — operator
  // responsibility (e.g., bind to loopback or put behind a reverse proxy).
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

  await new Promise<void>((resolve, reject) => {
    httpServer.listen(port, () => resolve());
    httpServer.on('error', reject);
  });

  return {
    close(): Promise<void> {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(); // drain timeout — proceed with exit
        }, 5000);
        httpServer.close((err) => {
          clearTimeout(timeout);
          if (err) reject(err); else resolve();
        });
      });
    },
  };
}
```

**Auth model:** Static bearer token via `LEGION_HTTP_TOKEN` env var. Not set → no auth enforced. Set → every request must match. No JWT parsing. No session-based identity. tenantId is always the process-configured `LEGION_TENANT_ID ?? 'local'`, regardless of which token was presented.

### 4.6 REST transport

**File:** `src/server/transports/rest.ts`

```typescript
export async function bindRest(
  state: LegionState,
  port: number,
  getTenantId: () => string,
): Promise<TransportHandle>
```

Plain `node:http` server. No MCP framing. Maps routes directly to the three tool semantics. Uses the same static bearer token guard as the HTTP transport, keyed on `LEGION_REST_TOKEN` env var (separate from `LEGION_HTTP_TOKEN` so the two transports can have different tokens when run simultaneously).

**Endpoints:**

```
POST /v1/tools/query
  Body:       { query: string, detail?: 'full' | 'summary', discover?: boolean }
  Response:   The JSON object that legion_query serializes into content[0].text,
              returned directly as the HTTP response body — NOT wrapped in the
              MCP content envelope.
  HTTP 200:   Successful dispatch, including tool-layer isError:true results.
  HTTP 400:   Malformed or missing required body fields.
  HTTP 401:   Missing or incorrect Authorization header (only when LEGION_REST_TOKEN is set).
  HTTP 500:   Unexpected server error.

POST /v1/tools/call
  Body:       { adapter: string, tool: string, args?: Record<string, unknown> }
  Response:   { content: string, isError: boolean }
              content is the raw text from the adapter response.
  HTTP 200:   Successful dispatch, including tool-layer errors.
  HTTP 400:   Malformed body or missing adapter/tool.
  HTTP 401:   Auth failure.
  HTTP 500:   Unexpected server error.

POST /v1/tools/list
  Body:       { category?: string, search?: string }
  Response:   The JSON object that legion_list serializes into content[0].text.
  HTTP 200/400/401/500: same conventions as above.

GET /v1/health
  Response:   { status: 'ok', version: string, transport: 'rest' }
  HTTP 200:   Always.

GET /v1/catalog/stats
  Response:   { totalAdapters: number, configuredAdapters: number, loadedAt: string }
  HTTP 200:   Always.
```

**Response envelope rule:** The REST transport always returns raw JSON. It never uses MCP's `{ content: [{ type: 'text', text: '...' }] }` wrapper. The REST layer calls the same internal tool logic as the MCP path and unwraps `content[0].text` before returning.

**Tool-layer errors vs. transport errors:** A tool result with `isError: true` (e.g., adapter not found, adapter call failed) is returned with HTTP 200 — it is a valid response from the tool layer. HTTP 4xx/5xx indicates transport-level failure (bad request, auth, server crash).

**`close()` contract:** Same `TransportHandle` shape as `bindHttp`. 5-second drain timeout.

### 4.7 Transport startup and shutdown

**Startup sequence when multiple transports are active:**

```
1. loadLegionState()       — shared across all transports.
2. const getTenantId = (): string => process.env.LEGION_TENANT_ID ?? 'local';
3. For each active transport (order: stdio, http, rest):
   a. Create McpServer instance (stdio and http each get their own;
      REST does not use McpServer — it calls tool logic directly via state).
   b. For stdio and http: registerLegionTools(server, state, getTenantId).
   c. bind(server or state, port) → returns void (stdio) or TransportHandle (http, rest).
4. On bind failure at step c: all previously-obtained TransportHandles are
   closed in reverse order before the error propagates. The process exits
   non-zero. No transports remain partially bound.
```

**Signal handling (CLI entrypoint owns this — transport functions do not register signals):**

```typescript
const handles: TransportHandle[] = [];

// ... bind loop populates handles ...

const shutdown = async (): Promise<void> => {
  for (const h of handles.reverse()) await h.close();
  process.exit(0);
};

process.on('SIGTERM', () => { void shutdown(); });
process.on('SIGINT',  () => { void shutdown(); });
```

**stdio-only mode:** When only stdio is active (`legion serve` with no flags), no `TransportHandle` is created. The process runs until stdin is closed by the parent. No signal handler registration is needed.

### 4.8 CLI changes

**Default behavior: unchanged for all existing users.**

```bash
legion serve                    # stdio only — identical to 1.x
```

**New flags:**

```bash
legion serve --http [port]      # Streamable-HTTP MCP (default port 3550)
legion serve --rest [port]      # REST JSON API       (default port 3551)
legion serve --stdio            # explicit stdio flag (equivalent to default)
legion serve --stdio --http --rest  # all three simultaneously
```

`--http` and `--rest` without a port value use their respective defaults. `--http 3560` overrides. `--stdio` is a no-op flag for explicitness in scripts.

Port defaults: `3550` for HTTP, `3551` for REST. Both overridable by env vars `LEGION_HTTP_PORT` and `LEGION_REST_PORT` (CLI flags take precedence over env vars).

### 4.9 Backward-compatibility guarantee

- `legion serve` with no flags: **identical behavior to 1.x.** Existing MCP clients are unaffected.
- Three tools (`legion_query`, `legion_call`, `legion_list`): **no schema changes.** Tool args are unchanged from 1.x. There is no `tenantId` field in any tool schema.
- New exports `LegionState`, `loadLegionState`, `registerLegionTools`, `TransportHandle`, `bindStdio`, `bindHttp`, `bindRest` are additive. No existing public exports are removed or renamed.

---

## 5. Enforcement files — commit decisions

| File | Action | Reason |
|---|---|---|
| `.github/workflows/ci.yml` | **Commit as-is** | Structurally correct per Codex. `pretest: tsc` in `package.json` handles build-before-test requirement. |
| `.gitleaks.toml` | **Commit as-is** | Not known to be buggy. |
| `eslint.config.js` | **Commit as-is** | Global rule stays `'error'`. The 6 AdaptivePool sites are suppressed inline per §2.1. No change to the config file itself beyond what §2.1 requires in `AdaptivePool.ts`. |
| `src/types/xenova-transformers.d.ts` | **Commit as-is** | Fixes typecheck failure when optional peer dep absent. |
| `docs/adapter-audit-agent-instructions.md` | **Delete** | Internal Claude/Codex instructions leaked into public repo. |

---

## 6. Legion preflight script

**File:** `scripts/preflight.sh` — mirrors `/opt/epic-ai-chariot/scripts/preflight.sh` adapted for Legion.

Legion has no native binary matrix. Its preflight steps:

```
1.  package.json version is well-formed semver
2.  package-lock.json top-level version matches package.json
3.  npm ci --dry-run
4.  tsc --noEmit
5.  npm run build
6.  npm run lint          (tsc --noEmit alias)
7.  npm run lint:eslint
8.  npm test              (pretest: tsc runs first, then vitest run)
9.  npm pack --dry-run
10. npm publish --dry-run --ignore-scripts --access public
```

Exit code 0 = all passed, safe to commit and push. Exit code 1 = at least one failure.

Env escape hatch: `LEGION_PREFLIGHT_SKIP_TESTS=1` skips step 8, same pattern as Chariot's `CHARIOT_PREFLIGHT_SKIP_TESTS=1`.

---

## 7. Test requirements

All of the following must pass before the commit leaves the machine:

1. **Existing vitest suite** — all passing under TypeScript 6 and zod 3.25.76.
2. **`npm run lint:eslint`** — zero errors. The 6 AdaptivePool suppression sites produce no output.
3. **`npm run typecheck`** — zero errors.
4. **HTTP transport smoke test** — new vitest test: starts `bindHttp` on a random port (port 0), connects via `StreamableHTTPClientTransport`, calls `legion_list` tool, verifies a valid JSON response, calls `handle.close()`.
5. **REST transport smoke test** — new vitest test: starts `bindRest` on a random port (port 0), `POST /v1/tools/list` with `fetch`, verifies a valid JSON response, calls `handle.close()`.
6. **`scripts/preflight.sh` exits 0** before `git commit`.

---

## 8. Release

- **`package.json` version field:** change from `"1.4.0"` to `"2.0.0"`. This is an explicit required code edit.
- **`package-lock.json`:** regenerated after the version bump and dependency changes.
- **McpServer version string:** automatically reflects `package.json` via the §3.3 fix — no separate change needed.
- **Tag:** `v2.0.0` — created only after Codex approves the commit SHA.
- **Commit:** single clean commit. Author `Michael Jabara <michael@protectNIL.com>`. No Co-Authored-By trailers.
- **Codex gate order:** (1) this spec, (2) code SHA, (3) release artifacts. Each gate completes before the next step begins.
- **Deprecation:** no deprecation of 1.x versions unless a security finding surfaces during implementation.
- **CHANGELOG:** new `## 2.0.0` section covering multi-transport, tenant hook, TypeScript 6, all fixes, CLI changes, and migration notes for 1.x users.

---

## 9. Decisions locked

All architectural decisions confirmed by MASTER:

- Shape A tenancy with `getConfiguredAdapters` injection hook
- No gRPC
- Version 2.0.0
- TypeScript 6, zod 3.25.76
- One clean commit, one release

---

**END OF SPEC**
