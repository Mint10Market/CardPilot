#!/usr/bin/env bash
# Card Pilot: add remote + push + deploy in one go.
# Usage:
#   ./scripts/do-it-all.sh [REPO_URL]
#   REPO_URL = optional GitHub repo (e.g. https://github.com/user/card-pilot.git)
# Requires one of:
#   - Vercel: run "npx vercel login" once, or set VERCEL_TOKEN
#   - Git: create repo on GitHub first, or set GITHUB_TOKEN to create via API (repo name from package.json)
set -e
cd "$(dirname "$0")/.."
ROOT="$PWD"
REPO_URL="$1"

# ---- 1. Git remote + push (if repo URL given or we can create one) ----
if [ -z "$(git remote get-url origin 2>/dev/null)" ]; then
  if [ -n "$REPO_URL" ]; then
    echo "Adding remote origin and pushing..."
    git remote add origin "$REPO_URL"
    git push -u origin main
    echo "Push done."
  elif [ -n "$GITHUB_TOKEN" ]; then
    REPO_NAME=$(node -p "require('./package.json').name" 2>/dev/null || echo "card-pilot")
    REPO_NAME="${REPO_NAME// /-}"
    echo "Creating GitHub repo $REPO_NAME and pushing..."
    CREATED=$(curl -s -X POST -H "Authorization: token $GITHUB_TOKEN" -H "Accept: application/vnd.github.v3+json" \
      "https://api.github.com/user/repos" -d "{\"name\":\"$REPO_NAME\",\"private\":false}" 2>/dev/null || true)
    if echo "$CREATED" | grep -q '"clone_url"'; then
      URL=$(echo "$CREATED" | node -e "try { const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.clone_url||''); } catch(e){ process.exit(1); }")
      if [ -n "$URL" ]; then
        git remote add origin "$URL"
        git push -u origin main
        echo "Push done. Repo: $URL"
      fi
    else
      echo "Could not create GitHub repo (check GITHUB_TOKEN or create repo manually)."
      echo "Then run: ./scripts/set-remote-and-push.sh https://github.com/YOUR_USER/YOUR_REPO.git"
    fi
  else
    echo "No Git remote and no REPO_URL or GITHUB_TOKEN. Create a repo and run:"
    echo "  ./scripts/set-remote-and-push.sh https://github.com/YOUR_USER/YOUR_REPO.git"
  fi
else
  echo "Remote origin already set. Pushing..."
  git push -u origin main 2>/dev/null || git push
  echo "Push done."
fi

# ---- 2. Vercel link if needed ----
if [ ! -d ".vercel" ]; then
  echo "Linking to Vercel..."
  if [ -n "$VERCEL_TOKEN" ]; then
    npx vercel link --yes --token "$VERCEL_TOKEN"
  else
    if ! npx vercel link --yes 2>/dev/null; then
      echo "Vercel link failed (no credentials). Run once: npx vercel login"
      echo "Then run this script again, or set VERCEL_TOKEN from vercel.com/account/tokens"
      exit 1
    fi
  fi
fi

# ---- 3. Deploy ----
echo "Deploying to Vercel production..."
if [ -n "$VERCEL_TOKEN" ]; then
  npx vercel --prod --yes --token "$VERCEL_TOKEN"
else
  if ! npx vercel --prod --yes 2>/dev/null; then
    echo "Deploy failed. Run: npx vercel login"
    echo "Or set VERCEL_TOKEN from vercel.com/account/tokens and run this script again."
    exit 1
  fi
fi
echo "Done. Check the URL above for your live app."
