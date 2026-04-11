# Changelog

All notable changes to `@epicai/legion` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
