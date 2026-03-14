#!/usr/bin/env bash
# Use local disk for node_modules when the project lives in OneDrive (or other
# cloud storage) to avoid ETIMEDOUT during npm run lint / npm run build.
# .next stays in the project — symlinking it breaks Next.js module resolution.
# Run once from project root: ./scripts/setup-local-symlinks.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CACHE_NAME="card-pilot"
LOCAL_ROOT="${LOCAL_DEV_ROOT:-$HOME/.local-dev}/$CACHE_NAME"

cd "$PROJECT_ROOT"

mkdir -p "$LOCAL_ROOT/node_modules"

# If .next was previously symlinked, remove it so Next uses a real .next in the project
if [ -L ".next" ]; then
  echo "Removing .next symlink so Next.js build works (build output stays in project)..."
  rm -f .next
fi

# node_modules: symlink to local disk (don't move — can timeout from OneDrive)
if [ -L "node_modules" ]; then
  echo "node_modules is already a symlink -> $(readlink node_modules)"
elif [ -d "node_modules" ]; then
  echo "Removing existing node_modules (from OneDrive this may take a minute)..."
  rm -rf node_modules
  ln -s "$LOCAL_ROOT/node_modules" node_modules
  echo "Symlinked node_modules -> $LOCAL_ROOT/node_modules"
  echo "Run: npm install"
else
  ln -sf "$LOCAL_ROOT/node_modules" node_modules
  echo "Symlinked node_modules -> $LOCAL_ROOT/node_modules (run npm install)"
fi

echo ""
echo "Done. Run: npm install && npm run lint && npm run build"
