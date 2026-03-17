#!/usr/bin/env bash
# Scan git history for any commit that ever added or modified secret env files.
# Run: ./scripts/scan-history-for-secrets.sh
# Exit 0 = nothing found (safe). Exit 1 = secret file found in history (rotate secrets, remove from history).

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FAIL=0

# Files that must never appear in any commit
SECRET_FILES=".env .env.local .env.development.local .env.test.local .env.production.local"

for f in $SECRET_FILES; do
  if git log --all --full-history -- "$f" | grep -q '^commit'; then
    echo "FAIL: '$f' appears in git history. Rotate all secrets and remove from history (e.g. git filter-repo or BFG). See SECURITY.md."
    git log --all --oneline -- "$f"
    FAIL=1
  fi
done

if [ "$FAIL" -eq 1 ]; then
  exit 1
fi

echo "OK: No secret env files (.env, .env.local, etc.) found in any commit."
echo "    .env.example is the only env file tracked (placeholders only)."
