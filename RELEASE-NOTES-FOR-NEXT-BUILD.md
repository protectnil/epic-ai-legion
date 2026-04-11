# Release Notes for the Next Legion Build

**Audience:** The next Claude (or human) who runs a Legion release from Agent Native on macOS.
**Author:** Claude Opus 4.6 — the L2 (1.3.0) signed-catalog release.
**Date:** 2026-04-11

This file is a handoff note for the multi-platform Legion build that runs on macOS. It documents one specific thing you need to do when you cut the next Legion release.

## TL;DR

**1.3.0 ships with a DEVELOPMENT Ed25519 signing key.** The public key is committed at `src/keys/legion-catalog-public.ts`. The private key lives at `/opt/epic-ai/secrets/legion-catalog-dev.private.pem` on the Linux development host. The bundled `adapter-catalog.json.sig` was signed with that dev key for the 1.3.0 release.

**Your job on the next release: rotate to the production key.**

## Why this matters

Legion 1.3.0 turns on signature verification by default for the adapter catalog. The published package ships a detached `adapter-catalog.json.sig` that Legion verifies at every startup against the public key in `src/keys/legion-catalog-public.ts`. Three things must stay consistent:

1. The private key used to sign the catalog.
2. The public key committed to the repo.
3. The signature file shipped in the npm tarball.

If any of these drift, verification fails and Legion refuses to start. The same dependency applies to Agent Native's next release — you'll be rebuilding and re-signing, and the key material must match.

## Exact steps for the next release

1. **Decide which key to use.** Either reuse the existing dev key at `/opt/epic-ai/secrets/legion-catalog-dev.private.pem` (fine for continued internal releases), or generate a new production key:
   ```bash
   openssl genpkey -algorithm Ed25519 -out legion-catalog-prod.private.pem
   openssl pkey -in legion-catalog-prod.private.pem -pubout -out legion-catalog-prod.public.pem
   ```
   Store the private key in whatever the production secrets location is on Agent Native. It must never be committed to the Legion repo.

2. **Update `src/keys/legion-catalog-public.ts`** with the new public key PEM. The file is a plain TypeScript module that exports the PEM string and a key ID. Replace both:
   - `LEGION_CATALOG_PUBLIC_KEY_PEM` — the SPKI PEM of the new public key.
   - `LEGION_CATALOG_PUBLIC_KEY_ID` — a stable identifier for log output, e.g. `legion-catalog-prod-2026-05-01`.

3. **Re-sign the bundled catalog.** The signing script is bundled at `scripts/sign-catalog.mjs`. Run it against the current `adapter-catalog.json`:
   ```bash
   node scripts/sign-catalog.mjs \
     --key /path/to/production.private.pem \
     --catalog adapter-catalog.json
   ```
   This overwrites `adapter-catalog.json.sig` with a signature from the new key. The script prints an SPKI fingerprint; sanity-check it matches your key.

4. **Build and test.** `npm run build && npm test` must both pass. The signature tests in `tests/federation-catalog-signature.test.ts` load the bundled catalog with the bundled public key, so they'll catch a mismatch immediately.

5. **Publish.** `npm publish --access public` as `ceo`.

## What the mechanism does

- `AdapterCatalog` reads `adapter-catalog.json.sig` on every `load()` and verifies it against `LEGION_CATALOG_PUBLIC_KEY_PEM` from `src/keys/legion-catalog-public.ts`. No config needed — it's the default path.
- Consumers who want to use a different key pass `publicKeyPem` in their `CatalogSourceConfig`. They're completely unaffected by our key rotation.
- Consumers who run a custom catalog sign it with their own private key and pass their own public key. Same story.
- Consumers who explicitly opt out via `verifySignature: false` see a loud startup warning on every boot. They're unaffected too.

## What you should NOT do

- **Do not commit the private key.** Ever. Anywhere. Not in the Legion repo, not in `/opt/epic-ai-legion/`, not in a dot-file. The private key lives in the secrets directory on the release host and never enters version control.

- **Do not skip step 3.** If you update the public key but forget to re-sign the catalog, the next `npm publish` will ship a broken tarball. The test suite catches this — `tests/federation-catalog-signature.test.ts` will fail — but it's better to run the signer explicitly than to rely on the test.

- **Do not change `sign-catalog.mjs` to use `createSign('ed25519')`.** The direct `crypto.sign(null, data, privateKey)` form is the correct Node.js idiom for raw Ed25519. The `createSign` form has produced interop bugs. The matching verifier in `AdapterCatalog.ts` uses `crypto.verify(null, ...)` — they must stay in sync.

- **Do not sign a re-pretty-printed catalog.** The signature is over the raw on-disk bytes. If a linter or formatter reformats `adapter-catalog.json` between signing and shipping, verification will fail at load time. The signer and the Legion tarball must ship the exact same bytes.

## Questions

If anything in this note is unclear or contradicts something you see in the current codebase, the Fabrique spec at `/opt/epic-ai/docs/FABRIQUE-SPEC.md` and the 1.3.0 CHANGELOG entry are the authoritative references. The design is also documented in `DEVELOPER_GUIDE.md` → "Adapter Catalog Provenance". If those still don't answer your question, check with Michael.

## Cleanup after rotation

Once you've rotated to a production key in a later release, you can:

1. Delete this file. It's a one-time handoff note, not living documentation.
2. Delete the dev key at `/opt/epic-ai/secrets/legion-catalog-dev.private.pem` on the Linux host. It has no further purpose.
3. Note in the CHANGELOG for the rotation release that the dev key has been retired and the production key is now in effect.

Thanks for reading. 1.3.0 is your baseline to build on.
