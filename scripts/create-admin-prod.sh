#!/bin/sh
# Create/reset the admin account on the LIVE site's database.
# Pulls production env vars into a private temp file, runs the normal
# admin:create prompt against them, then deletes the file.
set -e
cd "$(dirname "$0")/.."
ENV_FILE="$(mktemp)"
trap 'rm -f "$ENV_FILE"' EXIT
vercel env pull "$ENV_FILE" --environment=production --yes >/dev/null
set -a; . "$ENV_FILE"; set +a
npx tsx scripts/create-admin.ts
