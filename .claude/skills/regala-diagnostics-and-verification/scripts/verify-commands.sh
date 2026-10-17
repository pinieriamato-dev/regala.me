#!/usr/bin/env bash
# verify-commands.sh — the cheap, deterministic "is the code green?" gate.
# Run from the monorepo root: /home/user/regala.me
# Read-only: installs deps and runs tests/typechecks. It does not touch git, the DB, or .env.
#
# EXPECTED (verified 2026-07-12):
#   * pnpm --filter shared test      -> 13 tests pass, 1 file (vitest run)
#   * pnpm --filter shared typecheck -> clean (tsc --noEmit, no output)
#   * pnpm --filter web typecheck    -> clean
#   * pnpm --filter mobile typecheck -> clean
# A fresh container has NO node_modules, so `pnpm install` must run first or everything fails
# with "cannot find module". There is NO root `test` script; tests live only in `shared`.

set -euo pipefail
cd "$(dirname "$0")/../../../.." # -> monorepo root regardless of where this is invoked from
echo "== cwd: $(pwd) =="

echo "== pnpm install =="
pnpm install

echo "== shared: unit tests (expect 13 passing) =="
pnpm --filter shared test

echo "== shared: typecheck =="
pnpm --filter shared typecheck

echo "== web: typecheck =="
pnpm --filter web typecheck

echo "== mobile: typecheck =="
pnpm --filter mobile typecheck

echo "== ALL GREEN =="
