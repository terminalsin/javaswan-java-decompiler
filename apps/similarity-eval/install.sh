#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Building similarity-eval..."
cd "$ROOT_DIR"
bun install
cd "$SCRIPT_DIR"
bun run build

echo "Linking globally..."
npm link

echo ""
echo "Done! 'similarity-eval' is now available globally."
echo "Try: similarity-eval --help"
