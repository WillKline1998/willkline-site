#!/bin/sh
# Vercel build. Only production deploys migrate the (shared) Neon database;
# preview deploys must never change its schema.
set -e
if [ "$VERCEL_ENV" = "production" ]; then npx prisma migrate deploy; fi
npx next build
