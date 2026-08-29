#!/usr/bin/env bash
# Netlify zip deploy fallback for nippou-app
# Reason: GitHub webhook is broken (deploy_key_id/installation_id are None on Netlify side).
# Until the GitHub App integration is re-authenticated via Netlify UI,
# use this script to push staging/production builds directly.
#
# Usage:
#   bash scripts/netlify-deploy.sh staging
#   bash scripts/netlify-deploy.sh production
#
# Requires:
#   - 1Password CLI signed in (op whoami works)
#   - Netlify PAT stored at op://GenrinClaw/netlify-pat-genrin/credential
#   - jq, zip, curl

set -euo pipefail

BRANCH="${1:-staging}"
SITE_ID="${NETLIFY_SITE_ID:-}"
if [ -z "$SITE_ID" ]; then
  echo "ERROR: NETLIFY_SITE_ID is not set" >&2
  echo "  Export it before running: export NETLIFY_SITE_ID=<your-site-id>" >&2
  exit 1
fi
ACCOUNT="${OP_ACCOUNT:-executiveboosterinc}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[1/4] Building..."
cd "$REPO_ROOT"
pnpm build > /dev/null

echo "[2/4] Reading Netlify token from 1Password..."
TOKEN_FILE="$(mktemp)"
trap 'rm -f "$TOKEN_FILE" "$ZIP_FILE"' EXIT
umask 077
op --account "$ACCOUNT" read 'op://GenrinClaw/netlify-pat-genrin/credential' > "$TOKEN_FILE"
TOKEN="$(tr -d '\n' < "$TOKEN_FILE")"

echo "[3/4] Packing dist/..."
ZIP_FILE="$(mktemp -t nippou-deploy-XXXXXX).zip"
(cd dist && zip -rq "$ZIP_FILE" .)
echo "    zip size: $(wc -c < "$ZIP_FILE") bytes"

echo "[4/4] Deploying to Netlify (branch=$BRANCH)..."
if [ "$BRANCH" = "production" ] || [ "$BRANCH" = "main" ]; then
  ENDPOINT="https://api.netlify.com/api/v1/sites/$SITE_ID/deploys"
else
  ENDPOINT="https://api.netlify.com/api/v1/sites/$SITE_ID/deploys?branch=$BRANCH"
fi

RESPONSE="$(curl -fsS -X POST "$ENDPOINT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/zip" \
  --data-binary "@$ZIP_FILE")"

DEPLOY_ID="$(echo "$RESPONSE" | jq -r '.id')"
DEPLOY_URL="$(echo "$RESPONSE" | jq -r '.deploy_ssl_url // .ssl_url')"
echo "    deploy_id: $DEPLOY_ID"
echo "    deploy_url: $DEPLOY_URL"

echo "Waiting for deploy to become ready..."
for i in $(seq 1 20); do
  STATE="$(curl -fsS -H "Authorization: Bearer $TOKEN" \
    "https://api.netlify.com/api/v1/deploys/$DEPLOY_ID" | jq -r '.state')"
  echo "  [$i] state=$STATE"
  if [ "$STATE" = "ready" ]; then
    echo "✅ Deployed: $DEPLOY_URL"
    exit 0
  fi
  if [ "$STATE" = "error" ]; then
    echo "❌ Deploy failed"
    exit 1
  fi
  sleep 3
done
echo "⚠️ Timeout waiting for deploy"
exit 1
