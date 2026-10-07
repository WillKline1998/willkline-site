#!/bin/sh
# Create/reset the admin account on the LIVE site's database.
# Pulls production env vars into a private temp file, runs the normal
# admin:create prompt against them, then deletes the file.
set -e
cd "$(dirname "$0")/.."
ENV_FILE="$(mktemp)"
trap 'rm -f "$ENV_FILE"' EXIT
echo "Connecting to the live site (a few seconds)..."
vercel env pull "$ENV_FILE" --environment=production --yes >/dev/null 2>&1 || {
  echo "Couldn't reach Vercel. Are you logged in? Try: vercel login"; exit 1; }
set -a; . "$ENV_FILE"; set +a
echo "Connected. Setting up the admin login for willkline.net:"
echo
npx --no-install tsx scripts/create-admin.ts
