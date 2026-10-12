#!/usr/bin/env bash
# HYPERREEL — static GitHub Pages export.
#
# Moves src/app/api out of the way (API routes cannot be statically
# exported), runs `NEXT_OUTPUT=export next build`, restores the API,
# then adds Pages niceties (public/.nojekyll + a 404.html copy of index).
#
# Usage: bash scripts/hyperreel-build-pages.sh
# One-time repo step: enable Pages → "Deploy from branch" → branch gh-pages
# (or push out/ to the gh-pages branch with ghp-import / git subtree).

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

API_SRC="src/app/api"
API_TMP=".pages-build-tmp/api"

echo "[h[hyperreel-pages] building static export (basePath /hyperreel)…"

# 1. stash API routes (no server code in a static export)
mkdir -p .pages-build-tmp
if [ -d "$API_SRC" ]; then
  rm -rf "$API_TMP"
  mv "$API_SRC" "$API_TMP"
fi

restore_api() {
  if [ -d "$API_TMP" ]; then
    rm -rf "$API_SRC"
    mkdir -p "$(dirname "$API_SRC")"
    mv "$API_TMP" "$API_SRC"
  fi
  rmdir .pages-build-tmp 2>/dev/null || true
}
trap restore_api EXIT

# 2. static export build
NEXT_OUTPUT=export bunx next build

# 3. Pages niceties
touch out/.nojekyll
cp out/index.html out/404.html

# 4. sanity: basePath present in the export
if rg -q "hyperreel" out/index.html 2>/dev/null || grep -q "hyperreel" out/index.html 2>/dev/null; then
  echo "[h[hyperreel-pages] basePath wiring verified in out/index.html"
else
  echo "[h[hyperreel-pages] NOTE: /hyperreel basePath not found in index.html — check next.config.ts"
fi

echo "PAGES EXPORT READY: out/"
