#!/usr/bin/env bash
# Builds each Lambda function into a self-contained zip:
#   index.js + shared node_modules → backend/.lambda_build/<name>.zip
# Run this before `terraform plan` or `terraform apply`.

set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$BACKEND_DIR/.lambda_build"
FUNCTIONS_DIR="$BACKEND_DIR/functions"

# ── 1. Install production dependencies ──────────────────────────────────────
echo "Installing backend dependencies..."
cd "$BACKEND_DIR"
npm ci --omit=dev
echo "  node_modules ready ($(du -sh node_modules 2>/dev/null | cut -f1))"

mkdir -p "$BUILD_DIR"

# ── 2. Zip each function with bundled node_modules ──────────────────────────
echo ""
echo "Building Lambda zips..."

for func_dir in "$FUNCTIONS_DIR"/*/; do
  name=$(basename "$func_dir")

  # Staging area: index.js + node_modules
  stage=$(mktemp -d)
  cp "$func_dir/index.js" "$stage/"
  cp -r "$BACKEND_DIR/node_modules" "$stage/"

  # Create zip from the staging dir root so Lambda finds index.js at top level
  (cd "$stage" && zip -qr "$BUILD_DIR/$name.zip" .)

  rm -rf "$stage"

  size=$(du -sh "$BUILD_DIR/$name.zip" | cut -f1)
  echo "  $name.zip  ($size)"
done

echo ""
echo "Build complete. Zips are in backend/.lambda_build/"
