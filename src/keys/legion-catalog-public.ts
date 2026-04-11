/**
 * @epicai/legion — Bundled Ed25519 Public Key for Adapter Catalog Signing
 *
 * This module exports the public key that Legion uses by default to
 * verify the signature on the bundled `adapter-catalog.json`. It is
 * imported at runtime by `AdapterCatalog` when `verifySignature: true`
 * (the 1.3.0 default) and no custom `publicKeyPem` is supplied by the
 * caller.
 *
 * ## Key Provenance
 *
 * This is currently the **DEVELOPMENT key**. It was generated via
 * `openssl genpkey -algorithm Ed25519` on 2026-04-11 for the 1.3.0
 * signed-catalog release. The matching private key lives at
 * `/opt/epic-ai/secrets/legion-catalog-dev.private.pem` on the release
 * host and is never committed to this repository.
 *
 * The production key rotation is tracked separately. When the
 * production key is generated and signed by the Agent Native release
 * pipeline, this file will be updated in a dedicated PR that:
 *   1. Generates or uses an existing production Ed25519 key pair.
 *   2. Replaces the PEM below with the production public key.
 *   3. Re-signs the bundled `adapter-catalog.json` with the production
 *      private key via `scripts/sign-catalog.mjs`.
 *   4. Publishes a new Legion version as the "production-signed"
 *      release and retires this development key.
 *
 * Consumers who override `publicKeyPem` in their `CatalogSourceConfig`
 * do not use this key at all — their custom key verifies their custom
 * catalog. This bundled key only matters for the default
 * (bundled-catalog) path.
 *
 * ## Format
 *
 * Ed25519 public key in SPKI PEM format. Single contiguous string so
 * the module is importable from both ESM and CJS without any file-IO
 * side effects at import time.
 */

export const LEGION_CATALOG_PUBLIC_KEY_PEM =
  '-----BEGIN PUBLIC KEY-----\n' +
  'MCowBQYDK2VwAyEAzIzQzJmeMEbu9A75VtqAbP2DbWlFvAWQzlQMPZSzOFs=\n' +
  '-----END PUBLIC KEY-----\n';

/**
 * Short stable identifier for this key. Logged on every signature
 * verification so operators can tell from a log line which key was in
 * use. Bump when the key rotates.
 */
export const LEGION_CATALOG_PUBLIC_KEY_ID = 'legion-catalog-dev-2026-04-11';
