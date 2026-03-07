#!/usr/bin/env bash
# Add Git remote and push (run once after creating a GitHub repo).
# Usage: ./scripts/set-remote-and-push.sh https://github.com/YOUR_USERNAME/YOUR_REPO.git
set -e
cd "$(dirname "$0")/.."
if [ -z "$1" ]; then
  echo "Usage: $0 <repo-url>"
  echo "Example: $0 https://github.com/yourusername/card-pilot.git"
  exit 1
fi
if git remote get-url origin 2>/dev/null; then
  echo "Remote 'origin' already exists. To replace: git remote set-url origin $1"
  exit 1
fi
git remote add origin "$1"
git push -u origin main
echo "Done. Push to origin main succeeded."
