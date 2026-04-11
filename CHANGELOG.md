# Changelog

All notable changes to `@epicai/legion` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
