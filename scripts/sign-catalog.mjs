#!/usr/bin/env node
/**
 * @epicai/legion — Catalog Signer
 *
 * Signs `adapter-catalog.json` (or any JSON file passed via --catalog)
 * with an Ed25519 private key and writes the detached signature to a
 * `.sig` file alongside the catalog. The signature is the base64-
 * encoded Ed25519 signature over the RAW UTF-8 BYTES of the catalog
 * file as-is on disk — no whitespace normalization, no
 * canonicalization, no re-serialization. The verifier (`AdapterCatalog
 * .loadFromBundle` in 1.3.0+) reads the same bytes and verifies them
 * directly, so byte-for-byte reproducibility is a hard requirement for
 * a valid signature.
 *
 * ## Usage
 *
 *   # Sign the bundled catalog with the dev key (CI / local)
 *   node scripts/sign-catalog.mjs \
 *     --key /opt/epic-ai/secrets/legion-catalog-dev.private.pem \
 *     --catalog adapter-catalog.json
 *
 *   # Sign a custom catalog with an arbitrary key
 *   node scripts/sign-catalog.mjs \
 *     --key /path/to/key.private.pem \
 *     --catalog /path/to/custom-catalog.json \
 *     --out /path/to/custom-catalog.json.sig
 *
 * Output file defaults to `<catalog>.sig`. Exits 0 on success, non-zero
 * on any failure (missing arguments, unreadable files, signing error).
 *
 * ## Design Notes
 *
 * - Uses `sign(null, data, privateKey)` — the correct Node.js idiom
 *   for raw Ed25519, NOT `createSign('ed25519')`. The two forms have
 *   produced interop bugs in the past; this script standardizes on the
 *   direct form to match the verifier.
 * - Signs the RAW FILE BYTES, not a parsed-and-reserialized JSON tree.
 *   A signed catalog that gets re-pretty-printed or sorted by a linter
 *   will fail verification. The signer and verifier must agree on the
 *   exact bytes.
 * - Prints the key's SPKI fingerprint so the operator can sanity-check
 *   which key was used without grepping secrets.
 */

import { createPrivateKey, createPublicKey, sign, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

// ─── Argument parsing ────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { key: null, catalog: null, out: null };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--key') args.key = argv[++i];
    else if (arg === '--catalog') args.catalog = argv[++i];
    else if (arg === '--out') args.out = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
      process.exit(1);
    }
  }
  return args;
}

function usage() {
  console.error(
    'Usage: node scripts/sign-catalog.mjs --key <pem> --catalog <path> [--out <path>]',
  );
  console.error('  --key       Path to Ed25519 private key in PEM format');
  console.error('  --catalog   Path to JSON catalog file to sign');
  console.error('  --out       Output signature path (default: <catalog>.sig)');
}

// ─── Main ────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv);

  if (!args.key || !args.catalog) {
    usage();
    process.exit(1);
  }

  const keyPath = resolve(ROOT, args.key);
  const catalogPath = resolve(ROOT, args.catalog);
  const outPath = args.out
    ? resolve(ROOT, args.out)
    : `${catalogPath}.sig`;

  if (!existsSync(keyPath)) {
    console.error(`Private key not found: ${keyPath}`);
    process.exit(1);
  }
  if (!existsSync(catalogPath)) {
    console.error(`Catalog not found: ${catalogPath}`);
    process.exit(1);
  }

  // Load the private key
  let privateKey;
  try {
    const keyPem = readFileSync(keyPath, 'utf-8');
    privateKey = createPrivateKey(keyPem);
  } catch (err) {
    console.error(`Failed to load private key: ${err.message}`);
    process.exit(1);
  }

  // Assert the key is Ed25519. Other algorithms use a different
  // signing path and their signatures are NOT compatible with the
  // Legion verifier.
  if (privateKey.asymmetricKeyType !== 'ed25519') {
    console.error(
      `Unsupported key type "${privateKey.asymmetricKeyType}". ` +
        'Legion catalog signing requires an Ed25519 private key. ' +
        'Generate one with: openssl genpkey -algorithm Ed25519',
    );
    process.exit(1);
  }

  // Sign the raw bytes
  const catalogBytes = readFileSync(catalogPath);
  const signature = sign(null, catalogBytes, privateKey);
  const signatureB64 = signature.toString('base64');

  // Write the detached signature
  writeFileSync(outPath, signatureB64 + '\n', 'utf-8');

  // Compute a short fingerprint of the public key so the operator can
  // verify which key signed this catalog. The fingerprint is the
  // first 16 hex chars of SHA-256 over the SPKI DER encoding.
  const publicKey = createPublicKey(privateKey);
  const spkiDer = publicKey.export({ type: 'spki', format: 'der' });
  const fingerprint = createHash('sha256').update(spkiDer).digest('hex').slice(0, 16);

  // Report
  console.log('Legion catalog signed');
  console.log(`  catalog     ${catalogPath}`);
  console.log(`  signature   ${outPath}`);
  console.log(`  bytes       ${catalogBytes.length}`);
  console.log(`  key type    ed25519`);
  console.log(`  key sha256  ${fingerprint}`);
  console.log(`  sig length  ${signatureB64.length} base64 chars`);
}

main();
