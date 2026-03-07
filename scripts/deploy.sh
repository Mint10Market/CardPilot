#!/usr/bin/env bash
# Deploy Card Pilot to Vercel production.
# One-time: run "npx vercel login" and "npx vercel link --yes" in this directory.
# Optional: set VERCEL_TOKEN (from vercel.com/account/tokens) to deploy without login.
set -e
cd "$(dirname "$0")/.."
if [ -n "$VERCEL_TOKEN" ]; then
  npx vercel --prod --yes --token "$VERCEL_TOKEN"
else
  echo "No VERCEL_TOKEN set. Running: npx vercel --prod"
  npx vercel --prod
fi
