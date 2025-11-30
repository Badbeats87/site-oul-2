#!/bin/sh

echo "Starting application startup sequence..."

# Seed the database (seed script handles retries and connection issues)
echo "Seeding database with initial data..."
if ! node prisma/seed.js; then
  echo "Warning: Seed script failed, continuing startup anyway..."
fi

echo "Startup complete, starting Express server..."
exec npm start
