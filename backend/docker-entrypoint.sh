#!/bin/sh
set -e

npx prisma migrate deploy

if [ "$SEED_DEMO_DATA" = "true" ]; then
  node dist/scripts/seed.js
fi

exec "$@"