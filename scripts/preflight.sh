#!/usr/bin/env bash
# @epicai/legion — Pre-release preflight gate
# Mirrors /opt/epic-ai-chariot/scripts/preflight.sh adapted for Legion.
# Exit 0 = all checks passed, safe to commit and push.
# Exit 1 = at least one failure.
#
# Skip tests: LEGION_PREFLIGHT_SKIP_TESTS=1 ./scripts/preflight.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

step() {
  echo ""
  echo "──────────────────────────────────────────────"
  echo "  Step $1: $2"
  echo "──────────────────────────────────────────────"
}

ok() {
  echo -e "  ${GREEN}✓${NC} $1"
  PASS=$((PASS + 1))
}

fail() {
  echo -e "  ${RED}✗${NC} $1"
  FAIL=$((FAIL + 1))
}

warn() {
  echo -e "  ${YELLOW}!${NC} $1"
}

# ── Step 1: package.json version is well-formed semver ─────────────────

step 1 "package.json version is well-formed semver"
PKG_VERSION="$(node -e "console.log(require('./package.json').version)")"
if echo "${PKG_VERSION}" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$'; then
  ok "version = ${PKG_VERSION}"
else
  fail "version '${PKG_VERSION}' is not valid semver"
fi

# ── Step 2: package-lock.json top-level version matches package.json ───

step 2 "package-lock.json version matches package.json"
LOCK_VERSION="$(node -e "console.log(require('./package-lock.json').version)")"
if [ "${PKG_VERSION}" = "${LOCK_VERSION}" ]; then
  ok "both = ${PKG_VERSION}"
else
  fail "package.json=${PKG_VERSION} vs package-lock.json=${LOCK_VERSION}"
fi

# ── Step 3: npm ci --dry-run ────────────────────────────────────────────

step 3 "npm ci --dry-run"
if npm ci --dry-run 2>&1 | tail -3; then
  ok "npm ci dry-run passed"
else
  fail "npm ci dry-run failed"
fi

# ── Step 4: tsc --noEmit ────────────────────────────────────────────────

step 4 "tsc --noEmit"
if npm run lint 2>&1; then
  ok "typecheck passed"
else
  fail "typecheck failed"
fi

# ── Step 5: npm run build ───────────────────────────────────────────────

step 5 "npm run build"
if npm run build 2>&1; then
  ok "build passed"
else
  fail "build failed"
fi

# ── Step 6: npm run lint (tsc --noEmit alias) ───────────────────────────

step 6 "tsc --noEmit (post-build re-check)"
if npm run lint 2>&1; then
  ok "lint passed"
else
  fail "lint failed"
fi

# ── Step 7: npm run lint:eslint ─────────────────────────────────────────

step 7 "eslint"
if npm run lint:eslint 2>&1; then
  ok "eslint passed"
else
  fail "eslint failed"
fi

# ── Step 8: npm test ────────────────────────────────────────────────────

step 8 "npm test (vitest run — pretest: tsc)"
if [ "${LEGION_PREFLIGHT_SKIP_TESTS:-0}" = "1" ]; then
  warn "LEGION_PREFLIGHT_SKIP_TESTS=1 — skipping"
else
  if npm test 2>&1; then
    ok "all tests passed"
  else
    fail "tests failed"
  fi
fi

# ── Step 9: npm pack --dry-run ──────────────────────────────────────────

step 9 "npm pack --dry-run"
if npm pack --dry-run 2>&1; then
  ok "pack dry-run passed"
else
  fail "pack dry-run failed"
fi

# ── Step 10: npm publish --dry-run ──────────────────────────────────────

step 10 "npm publish --dry-run"
if npm publish --dry-run --ignore-scripts --access public 2>&1; then
  ok "publish dry-run passed"
else
  fail "publish dry-run failed"
fi

# ── Summary ─────────────────────────────────────────────────────────────

echo ""
echo "══════════════════════════════════════════════"
if [ "${FAIL}" -eq 0 ]; then
  echo -e "  ${GREEN}PREFLIGHT PASSED${NC}  ${PASS} checks, 0 failures"
  echo "  Safe to commit and push."
else
  echo -e "  ${RED}PREFLIGHT FAILED${NC}  ${PASS} passed, ${FAIL} failed"
  echo "  Fix the failures above before committing."
fi
echo "══════════════════════════════════════════════"
echo ""

[ "${FAIL}" -eq 0 ]
