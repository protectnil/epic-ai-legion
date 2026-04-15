# Changelog

All notable changes to `@epicai/legion` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## 2.0.2 — 2026-04-15

### Fixed

- `src/bin/setup.ts`: `createRequire('../../../package.json')` resolved three
  levels above `dist/bin/`, landing at `/opt/` instead of the package root.
  Changed to `../../package.json` (two levels up from `dist/bin/` reaches the
  package root at `/opt/epic-ai-legion/`). This caused `legion serve` to crash
  immediately with `Cannot find module '../../../package.json'` on every
  invocation, making it unusable as an MCP stdio server. The crash-loop under
  pm2 (46 restarts) contributed to an OOM event on the host.

---

## 2.0.0 — 2026-04-14

### Breaking Changes

- **Package version 2.0.0.** Consumers pinned to `^1.x` must update.
- **`zod` peer dependency bumped** `^3.23.0` → `^3.25.76`. If your project resolves an older zod via deduplication, update it.
- **`ServerConnection.env`** field added to the `ServerConnection` interface. Existing consumers are unaffected (additive), but downstream TypeScript code that spreads `ServerConnection` into a known shape may need a type refresh.

### Added

#### Multi-Transport Server

- **Streamable-HTTP transport** (`--http [port]`, env `LEGION_HTTP_PORT`, default 3550) — serves the full MCP tool surface over `POST /mcp` with per-session `Mcp-Session-Id` tracking via `StreamableHTTPServerTransport`. Static bearer token auth via `LEGION_HTTP_TOKEN`.
- **REST transport** (`--rest [port]`, env `LEGION_REST_PORT`, default 3551) — raw JSON API over plain `node:http` with five routes: `POST /v1/tools/query`, `POST /v1/tools/call`, `POST /v1/tools/list`, `GET /v1/health`, `GET /v1/catalog/stats`. Static bearer token auth via `LEGION_REST_TOKEN`. Tool-layer errors return HTTP 200 with an `error` field; input validation errors return HTTP 400.
- **`--stdio` flag** — existing stdio transport is now explicit. Stdio remains the default when neither `--http` nor `--rest` is specified. All three transports can run simultaneously.
- **`src/server/TransportHandle`** — `{ port: number; close(): Promise<void> }` interface returned by both HTTP and REST bind functions. Enables clean shutdown and port-0 testing.
- **`src/server/LegionState`** — shared runtime state module. `loadLegionState()` reads the catalog, credentials, adapter-state, and config once at startup and returns a fully indexed `LegionState` object shared across all transports. Exposes `buildToolsForRouting()` for external consumers (Chariot / Praetor).
- **`src/server/toolHandlers`** — shared handler logic (`handleQuery`, `handleCall`, `handleList`) used by both the MCP and REST paths. All MCP client calls are wrapped in `try/finally { await client.close() }`.
- **`src/server/registerLegionTools`** — pure function that registers `legion_query`, `legion_call`, `legion_list` on any `McpServer` instance. Enables Chariot and Praetor to mount Legion tools on their own server.
- **`src/server/index`** — barrel re-export for all server-module types and functions (`./server` package export).
- **Tenant-aware adapter hook** — `LegionState.getConfiguredAdapters(tenantId: string)` returns the configured adapter set for a given tenant. In Legion OSS the `tenantId` is ignored (`LEGION_TENANT_ID` env, default `'local'`). Chariot injects its own implementation at startup (Shape A tenancy).

#### Praetor Severity Normalization

- **`AdapterEntry.severityMap`** — new optional field `Record<string, 'info' | 'low' | 'medium' | 'high' | 'critical'>` on every catalog entry. Maps each adapter's native severity vocabulary to Praetor's normalized five-level space `{info, low, medium, high, critical}`. Missing key defaults to `'info'` at coercion time. 35 security / observability / ITSM adapters ship with pre-populated maps in this release: CrowdStrike, CrowdStrike Identity, Splunk, Elastic Security, IBM QRadar, LogRhythm, Exabeam, Securonix, Darktrace, Wiz, Lacework, Fortinet FortiGate, Vectra AI, Microsoft Defender for Endpoint, Carbon Black, SentinelOne, Snyk, Tenable, Qualys, Rapid7, Veracode, Datadog Observability, Datadog Security, Dynatrace, PagerDuty, Opsgenie, Sentry, AWS CloudWatch, Grafana, Mimecast, Proofpoint, Jira, Jira Service Management, ServiceNow ITSM, ServiceNow GRC. Downstream consumers (Praetor `See / Follow / Monitor / Escalate` engagement levels) coerce tool results through a one-line normalization using this field.

#### Dependency & Type Fixes (Codex gate findings)

- **`ServerConnection.env`** (`src/types/index.ts`) — `env?: Record<string, string>` added. Removes the `as any` cast in `RegistryLoader.ts` line 264.
- **`VectorRecord`** exported from `src/federation/ToolPreFilter` — enables `LegionState` and `setup.ts` to import the type cleanly.
- **`AdaptivePool` non-null assertions** — three `Map.get()!` sites annotated with inline `@typescript-eslint/no-non-null-assertion` suppressions and TODO comments.
- **`SecretsProvider` force-unwrap guards** — `hashicorp-vault` and `azure-key-vault` cases now validate required config fields before constructing the provider; throws with a descriptive message on missing `address` / `vaultName`.

#### Tests

- **`tests/transport-http.test.ts`** — smoke test: binds HTTP transport on port 0, connects `StreamableHTTPClientTransport`, calls `legion_list`, verifies JSON shape, closes cleanly.
- **`tests/transport-rest.test.ts`** — smoke test: binds REST transport on port 0, hits all five endpoints, verifies JSON shapes, verifies 400 on missing `query` field, closes cleanly.

#### Operations

- **`scripts/preflight.sh`** — 10-step pre-release gate (semver check, lock-version match, `npm ci --dry-run`, tsc, build, tsc post-build, eslint, vitest, `npm pack --dry-run`, `npm publish --dry-run`). `LEGION_PREFLIGHT_SKIP_TESTS=1` escape hatch. Mirrors `/opt/epic-ai-chariot/scripts/preflight.sh`.
- **`scripts/patch-severity-maps.mjs`** — one-shot catalog patching script used to populate the 35 initial `severityMap` entries. Retained for reference and future catalog updates.

### Changed

- **`src/bin/setup.ts`** refactored: `startMcpServer()` is now a thin orchestrator that delegates to the transport modules. `cmdQuery()` uses `adapterById` Map for O(1) lookup. Help text updated for `--http`, `--rest`, `--stdio` flags. Version string updated to `'2.0'`.
- **`adapter-catalog.json`** re-signed after `severityMap` additions. New `.sig` on disk.

---

## 1.4.0 — 2026-04-11

### Added — Runtime Adapter Unload (closes the L1 TOCTOU boundary)

- **`FederationManager.unloadAdapter(name, reason, options?)`** — new public method that removes a single adapter from the running federation without restarting the process. Sequence: mark adapter as `unloading` in the pool → wait for in-flight tool calls to drain (bounded by `maxQuiescenceMs`, default 30 s) → close the transport via `ConnectionPool.disconnect()` → remove from `ToolRegistry` and `adapterMap`. Returns `{ success, reason, quiescent, inFlightAtClose, durationMs }`. Unknown adapter names are a no-op, not an error.
- **`FederationManager.serverNames()`** — stable snapshot of currently-connected adapter names. Used by `KillListWatcher` to diff the kill list against live state, and by any operator tool that wants to enumerate adapters without reaching into the pool.
- **`ConnectionPool` runtime state machine** — new public methods `stateOf(name)`, `markUnloading(name)`, `waitForQuiescence(name, maxMs)`, `beginCall(name)`, `endCall(name)`, `inFlightCount(name)`. The pool now tracks per-adapter connection state (`'connected' | 'unloading' | 'disconnected'`) and an in-flight call counter per adapter. `beginCall` atomically checks the state and increments the counter; it returns `false` if the adapter is in the `unloading` state so the caller can refuse the dispatch cleanly. `waitForQuiescence` polls the counter at 50 ms intervals until it reaches 0 or the deadline fires.
- **`KillListWatcher`** — new `src/federation/KillListWatcher.ts`. Polls a signed kill-list URL on a configurable interval (default 5 minutes), Ed25519-verifies the response bytes against the `kill-list-signature` header, diffs the list against `FederationManager.serverNames()`, and calls `unloadAdapter()` for every currently-connected entry in the list. Memoizes already-acted entries by kill-list version so the same list polled twice is a no-op on the second poll. Opt-in — only runs when `url` is configured.
- **Kill-list signing model** — reuses the same Ed25519 public key bundled for the catalog (`LEGION_CATALOG_PUBLIC_KEY_PEM` from `src/keys/legion-catalog-public.ts`) by default. Consumers with a separate kill-list signing key pass `publicKeyPem` in `KillListWatcherOptions`. Consumers who opt out via `verifySignature: false` see a startup warning.

### Changed

- **`FederationManager.callTool()`** now brackets every `adapter.callTool(...)` dispatch in `ConnectionPool.beginCall(name)` / `endCall(name)`. If `beginCall` returns `false` (adapter is `unloading`), the call returns an error `ToolResult` (same shape as the L1 revocation refusal, with "unloading" in the message) and the underlying adapter is never invoked. This closes the TOCTOU window that the 1.2.0 CHANGELOG explicitly documented as a scope limitation: the revocation gate in L1 prevents NEW dispatches but can't cancel an in-flight call. `unloadAdapter()` in L3 closes that window by waiting for in-flight drain before tearing down.
- **`ConnectionPool.disconnect(name)`** now clears the adapter's state tracking and in-flight counter in addition to closing the transport.

### Notes

- **Additive, not breaking.** Consumers that never call `unloadAdapter()` or instantiate `KillListWatcher` see no behavior change. The new bracket around `callTool` is transparent for the happy path — it's a synchronous in-memory state check + counter increment per call.
- **Quiescence timeout semantics.** When `waitForQuiescence` exceeds its deadline, `unloadAdapter` proceeds with the transport close anyway. In-flight calls that were still pending at that moment observe an abort when their own transport shuts down — the federation layer does not attempt to cancel them cooperatively (MCP has no native cancel). The log line `federation_manager.unload.quiescence_timeout` records the in-flight count at close so operators can see the tail.
- **Kill-list lifecycle is opt-in.** The watcher must be constructed and `start()`-ed explicitly. There is no default polling unless a consumer wires it up. This keeps 1.4.0 additive — the feature exists, the mechanism is in place, and consumers adopt it when they're ready. Fabrique's public transparency surface at `submit.epicai.co/killlist` (shipping in F19) is the intended default URL for protectNIL customers.

### Test Coverage

- `tests/federation-unload.test.ts` — 12 new cases covering the happy path (unknown adapter, idle adapter), four race conditions (call arriving during unload, in-flight call before unload, multiple concurrent calls, quiescence deadline exceeded), the pool bracket helpers, and the full `KillListWatcher` pipeline (signed poll + unload, signature mismatch refused, missing header refused, memoization across same-version polls, no-op when url absent).
- Full Legion suite: 874 files, 5935 tests (5922 from 1.3.0 + 13 new in 1.4.0), all passing.

### Migration Reference

1.4.0 is additive. Existing consumers need no changes.

To enable runtime kill-list enforcement against a Fabrique-hosted kill list:

```typescript
import { KillListWatcher } from '@epicai/legion';

const watcher = new KillListWatcher({
  federation: agent.federation, // from EpicAI.create()
  url: process.env.EPIC_AI_KILL_LIST_URL, // e.g. https://submit.epicai.co/killlist
  intervalMs: 5 * 60 * 1000,
  maxQuiescenceMs: 30_000,
});
watcher.start();

// On shutdown:
watcher.stop();
```

To manually unload an adapter (for custom admin tooling):

```typescript
await agent.federation.unloadAdapter('stripe', 'vendor_identity_proof_expired', {
  maxQuiescenceMs: 10_000,
});
```

---

## 1.3.0 — 2026-04-11

> ## ⭐ **BREAKING CHANGE: Signed Catalog Enforcement**
>
> **Legion now verifies the Ed25519 signature of the adapter catalog on every load and every refresh, and this verification is ON BY DEFAULT.**
>
> **Why this protects you.** Before 1.3.0, the adapter catalog (`adapter-catalog.json`) was loaded without any cryptographic check. A tampered catalog — whether from a compromised dependency, a malicious patch, a supply-chain attack against the published npm package, or an attacker who gained write access to a remote registry endpoint — would have been accepted and used for tool routing. An attacker who could modify catalog entries could silently redirect Legion's tool selection to compromised adapters, or surface malicious adapters under well-known vendor names. As of 1.3.0, the catalog must carry a valid Ed25519 signature from a key Legion recognizes, or it refuses to load. This closes one of the last remaining paths by which a compromised upstream artifact could alter Legion's runtime behavior silently.
>
> **What you need to do.**
> - **Default bundled catalog users (most installs):** nothing. The `@epicai/legion` npm package now ships `adapter-catalog.json.sig` alongside `adapter-catalog.json`, and the bundled public key at `src/keys/legion-catalog-public.ts` verifies the signature on every startup. Just upgrade.
> - **Custom catalog users:** sign your catalog with the bundled `scripts/sign-catalog.mjs` and pass your public key via `CatalogSourceConfig.publicKeyPem`. See `DEVELOPER_GUIDE.md` → "Adapter Catalog Provenance" for the exact commands.
> - **Remote registry users:** configure your registry to serve the base64 Ed25519 signature of the response body in the `catalog-signature` HTTP header. The refresh loop verifies the header on every fetch.
> - **Cannot sign right now:** set `verifySignature: false` in `CatalogSourceConfig` to opt out. This emits a loud startup warning on every boot — by design. You should not opt out for production workloads; the warning is there to remind you on every restart that you have disabled a security control.
>
> **Industry context.** Signed catalogs are the best-of-breed pattern for registry distribution. Terraform Registry requires GPG-signed providers. Sigstore/Cosign signs Docker images and npm packages via transparency logs. Debian `apt` has had signed package indexes since 2005. Go modules verify checksums via a public Merkle tree. Legion 1.3.0 brings Legion into line with that industry standard. Earlier versions of Legion documented the trust model but did not enforce it; 1.3.0 makes the documentation match the runtime.

### Added

- **`src/keys/legion-catalog-public.ts`** — bundled default Ed25519 public key (SPKI PEM) that verifies the shipped catalog signature when no custom `publicKeyPem` is supplied. Also exports `LEGION_CATALOG_PUBLIC_KEY_ID` for logging which key was in use on each verification.
- **`adapter-catalog.json.sig`** — detached signature file shipping in every `@epicai/legion` tarball. Signed over the raw UTF-8 bytes of `adapter-catalog.json`.
- **`scripts/sign-catalog.mjs`** — bundled command-line signer. Usage: `node scripts/sign-catalog.mjs --key <pem> --catalog <path>`. Uses `crypto.sign(null, data, privateKey)` — the correct Node.js idiom for raw Ed25519 — and refuses to sign with any key type other than Ed25519. Prints an SPKI fingerprint so operators can verify which key was used without grepping secrets.
- **`startRefresh()` / `stopRefresh()`** wired into `AdapterCatalog` — the `refreshTimer` field existed as dead code in prior versions, and is now implemented. Polls `config.registryUrl` on `config.refreshIntervalMs` (default 1 hour), re-verifies the signature on every poll, updates entries atomically via `buildIndex()` on success, preserves existing entries on failure. In-flight guard prevents overlapping polls. Start/stop are both idempotent. `unref()`'d so the timer does not keep the Node event loop alive.

### Changed — BREAKING

- **`CatalogSourceConfig.verifySignature` default flipped from `false` to `true`.** Consumers running against a custom catalog or registry without a valid signature must either sign the catalog (see above) or explicitly set `verifySignature: false` to opt out. Opting out emits a loud startup warning via the logger on every construction.
- **`AdapterCatalog.loadFromBundle()` now reads the raw catalog bytes via `readFileSync`** instead of via dynamic JSON import. The signature is verified against the exact on-disk bytes, so any pretty-printer, linter, or minifier that reformats the catalog JSON between signing and loading will break verification. The signer and verifier must agree on the exact bytes.
- **`AdapterCatalog.loadFromRegistry()` now uses `crypto.verify(null, ...)`** instead of `createVerify('ed25519')`. The direct form is the correct Node.js idiom for raw Ed25519 signatures and matches `sign-catalog.mjs`. The `createVerify` path was non-idiomatic and has been the source of interop bugs.

### Notes

- **Development key.** This release ships with a DEVELOPMENT Ed25519 key pair. The public key is committed at `src/keys/legion-catalog-public.ts`; the private key lives at `/opt/epic-ai/secrets/legion-catalog-dev.private.pem` on the development release host. **Agent Native's next Legion release (built on macOS) should rotate to the production key:** (1) generate or use an existing production Ed25519 key, (2) replace the PEM in `src/keys/legion-catalog-public.ts`, (3) re-sign the bundled catalog via `scripts/sign-catalog.mjs`, (4) publish. The mechanism is in place and tested; only the key material needs to swap out. See `RELEASE-NOTES-FOR-NEXT-BUILD.md` for the full handoff note.
- **Refresh loop opt-in.** The refresh loop only runs when `EPIC_AI_SIGNED_CATALOG_URL` is set (via `CatalogSourceConfig.registryUrl`) AND `startRefresh()` is called explicitly. Consumers that use the default bundled catalog get verification on every startup but no background polling — the catalog is static until the next `npm upgrade`. Consumers that point Legion at a remote registry get continuous verification on every refresh tick.
- **TOCTOU / race condition note.** A catalog refresh that happens mid-tool-call does not cancel in-flight invocations. L1's revocation TOCTOU boundary (documented in 1.2.0) still applies — the revocation gate prevents NEW dispatch but cannot retroactively cancel an already-awaiting call. L3 (runtime adapter unload, shipping in 1.4.0) closes that window.

### Test Coverage

- `tests/federation-catalog-signature.test.ts` — 13 new cases covering the bundled happy path, the "missing .sig" failure, the explicit opt-out, the startup warning, the registry signed-path, the tampered-body rejection, the missing-header rejection, the explicit registry opt-out, and the refresh loop (polls on interval, preserves entries on failure, idempotent start/stop, no-op when source !== 'registry').
- Full Legion test suite: 872 files, 5922 tests, all passing (5909 from 1.2.0 + 13 new in 1.3.0).

### Migration Reference

Three failure modes you might hit after upgrading, and the fix for each:

| Error | Cause | Fix |
|---|---|---|
| `adapter-catalog.json.sig not found alongside adapter-catalog.json` | Bundled .sig file is missing | Reinstall `@epicai/legion` — the tarball ships with a signed .sig |
| `adapter-catalog.json signature verification failed` | Catalog bytes do not match the signature | Either the catalog was tampered with, or your linter/formatter re-pretty-printed it. Do not proceed without investigating. If you edited the catalog on purpose, re-sign via `scripts/sign-catalog.mjs`. |
| `Registry at {url} did not return a "catalog-signature" header` | Remote registry doesn't serve signatures | Configure your registry to serve base64 Ed25519 signatures in the `catalog-signature` header, or set `verifySignature: false` to opt out. |

---

## 1.2.0 — 2026-04-11

> Version note: versions 1.1.0 and 1.1.1 were published to npm on
> 2026-04-04, unpublished shortly afterward, and are permanently
> unavailable as release numbers per npm registry rules. This release
> skips past them directly to 1.2.0.


### Added — Runtime Revocation Enforcement

- **`FederationManager` revocation gate.** The constructor now accepts
  an optional `{ catalog }` option. When a loaded `AdapterCatalog` is
  passed, the manager enforces the catalog's `revoked` flag at both
  connect time and call time:
  - `connect(name, config, adapter)` refuses to connect adapters
    whose catalog entry is marked revoked. The adapter is never added
    to the internal adapter map or tool registry; the refusal is
    logged as `federation_manager.skipped_revoked_connect`.
  - `callTool(name, args)` re-checks revocation on every invocation
    (defense in depth — the catalog can be refreshed between connect
    and call). Revoked calls return an `isError: true` `ToolResult`
    with the revocation reason in the content text; the underlying
    adapter's `callTool` is never invoked. Logged as
    `federation_manager.blocked_revoked_call`.
- **`RegistryLoader` revocation gate.** `RegistryLoaderOptions.catalog`
  is a new optional field. When provided, `load()` skips any registry
  entry whose `id` is marked revoked in the catalog. Skipped entries
  appear in `RegistryLoadResult.skipped` with reason `"revoked in
  catalog: <reason>"`. Backward-compatible — omit `catalog` and
  behavior matches pre-1.2.0.
- **`AdapterCatalog.getRevocationDetails(name)`** — new public method
  returning the full revocation metadata (`revoked`, `revokedAt`,
  `reason`) for a single entry, or undefined if not revoked. Used by
  the federation layer to surface the specific rejection reason.
- **`AdapterCatalog.setEntries(entries)`** — new public method that
  replaces the full catalog atomically and rebuilds every index.
  Exists so consumers that build the catalog programmatically (or
  refresh it after construction from a signed source — see L2) reuse
  the same index-building code path as `load()`.

### Changed — Opt-In, Backward-Compatible

- Callers that do NOT pass an `AdapterCatalog` to `FederationManager`
  or `RegistryLoader` see **no behavior change**. The revocation gate
  is opt-in in 1.2.0. Consumers wanting enforcement pass a loaded
  catalog explicitly. Full default enforcement, including the signed
  catalog refresh loop, is planned for a later release (L2 in the
  upstream Fabrique integration roadmap).
- `AdapterCatalogEntry.revoked` is now enforced at runtime when a
  catalog is wired into the federation layer. Prior versions recorded
  the field but never consulted it outside the catalog's internal
  `byKeywords` filter. Catalogs that previously contained `revoked:
  true` entries will now refuse those adapters at connect and call
  time whenever a consumer opts in to enforcement.

### Notes

- This is the runtime refusal layer. A revoked adapter is prevented
  from receiving new tool calls and from entering fresh connection
  pools, but an adapter that is ALREADY connected when a catalog
  refresh marks it revoked will remain connected in memory until the
  next process restart. Full runtime unload (per-adapter disconnect
  without bouncing the process) is planned for 1.3.0 as part of L3.
- **TOCTOU boundary.** The revocation gate in `FederationManager.callTool`
  runs BEFORE the dispatch. A tool call that is already awaiting on
  `adapter.callTool(...)` when the catalog flips to revoked completes
  normally — the vendor has already received the request and the
  federation layer cannot retroactively cancel it. The gate prevents
  NEW dispatch to revoked adapters but does not cancel in-flight
  invocations. Users concerned about the in-flight window should keep
  revocation refresh intervals short and set tight client-side timeouts
  so an in-flight call on a just-revoked adapter does not linger. In-
  flight cooperative cancellation is a 1.3.0 (L3) concern.

### Test Coverage

- `tests/federation-revocation.test.ts` — 10 new cases covering the
  `AdapterCatalog.getRevocationDetails` API, the `RegistryLoader` skip
  path with and without a catalog (backward-compat regression test),
  the `FederationManager` connect-time skip, the call-time refusal
  (including a mid-session catalog mutation simulating a signed
  catalog refresh that marks an entry revoked after the adapter is
  already connected), and the happy paths for non-revoked adapters.
- Full Legion test suite still passes (872 files, 5906 tests).

---

## 1.0.12 — 2026-04-11

### Documentation
- **DEVELOPER_GUIDE.md** — new "Adapter Catalog Provenance" section explaining that the shipped catalog is generated upstream and refreshed on release cadence, that runtime integrity is verified via `artifactDigest` + Sigstore, and that signed-catalog refresh will enable revocation-without-republish in a future release.
- **ADAPTER-DEVELOPMENT-PROTOCOL.md** — appended note clarifying that the protocol applies identically to hand-written and upstream-materialized adapters, and that adapter additions to `src/mcp-servers/` are not accepted via pull request.

### Behavior
- No runtime behavior changes. Docs-only release.

---

## 1.0.6 — 2026-04-08

### Fixed
- **adapter-catalog.json** and **mcp-registry.json** restored to full 4,135 integrations. A build script was regenerating the catalog from a partial source, dropping 2,952 MCP server entries. The postbuild catalog generator has been removed to prevent recurrence.

---

## 1.1.1 — 2026-04-04

### Fixed
- **312 REST adapter class name mismatches** in adapter-catalog.json — all 870 REST adapters now load correctly. Fabrique-generated catalog entries used inconsistent casing (e.g. `UsptoMCPServer` vs actual export `USPTOMCPServer`).

---

## 1.1.0 — 2026-04-04

### Added
- **4,135 integrations** (624 REST-only, 3,242 MCP-only, 246 dual REST+MCP, 23 REST candidates) exposing **35,835 tools**
- **870 REST adapters** across cybersecurity, DevOps, cloud, healthcare, finance, hospitality, construction, manufacturing, commerce, travel, observability, and more
- **3,479 MCP connections** — stdio (3,004), streamable-HTTP (456), SSE (18), HTTP (1)
- **Setup wizard** — auto-detects 11 MCP clients (Claude Code, Cursor, Windsurf, VS Code, Codex, Gemini, Cline, Continue, Goose, Roo Code, Claude Desktop), writes MCP config with permission
- **Curated zero-credential adapters** — PubMed, Govbase, Searchcode, Robtex configured by default, routing demo proves intelligence
- **CLI commands** — `legion query`, `legion list`, `legion search`, `legion configure`, `legion add`, `legion remove`, `legion health`, `legion help`, `legion serve`
- **MCP server mode** (`legion serve`) — exposes `legion_query`, `legion_call`, `legion_list` tools
- **Two-tier tool resolution** — BM25 + miniCOIL relevance scoring, then model-assisted classification — full catalog never reaches the LLM. Context window cost: 469 tokens.
- **Tiered autonomy governance** — auto / escalate / approve with per-adapter and per-operation configuration
- **SHA-256 hash-chained audit trail** — tamper-evident, append-only, exportable
- **Inference Gateway** (`legion-gateway`) — OpenAI-compatible router for llama.cpp, mlx-lm, and vLLM
- **Secrets providers** — HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, environment variables
- **Test harness** — 45 assertions across stdio, HTTP, and API transport profiles
- **71 zero-credential integrations** verified to return real data without credentials
- Apache License 2.0 (SDK framework) + Elastic License 2.0 (adapters and registry)
