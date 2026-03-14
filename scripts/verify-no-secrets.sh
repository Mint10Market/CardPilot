#!/usr/bin/env bash
# Ensure .env.local is ignored, not tracked, and not staged.
# Run before push or in CI: npm run verify:secrets

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FAIL=0

# 1. .env.local must be ignored by .gitignore
if ! git check-ignore -v .env.local &>/dev/null; then
  echo "FAIL: .env.local is not ignored by .gitignore"
  FAIL=1
fi

# 2. .env.local must not be tracked
if [ -n "$(git ls-files .env.local 2>/dev/null)" ]; then
  echo "FAIL: .env.local is tracked by git (remove it: git rm --cached .env.local)"
  FAIL=1
fi

# 3. .env.local must not be staged for commit
if git diff --cached --name-only | grep -q '^\.env\.local$'; then
  echo "FAIL: .env.local is staged for commit. Unstage it: git reset HEAD .env.local"
  FAIL=1
fi

if [ "$FAIL" -eq 1 ]; then
  echo "Run: git check-ignore -v .env.local  and  git ls-files .env.local  to double-check."
  exit 1
fi

echo "OK: .env.local is ignored and not tracked or staged."
