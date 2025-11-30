#!/bin/sh

set -e

echo "Running database migrations..."
npx prisma migrate deploy --skip-generate || true

echo "Seeding database..."
node prisma/seed.js || echo "Seeding failed or already seeded"

echo "Starting server..."
npm start
