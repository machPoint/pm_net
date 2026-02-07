#!/bin/sh
set -e

echo "=== OPAL Server Startup ==="

# Ensure data directory exists and has correct permissions
echo "Setting up data directory..."
mkdir -p /data
chmod -R 755 /data

# Check if database file exists
if [ -f "$DB_FILE" ]; then
    echo "Database file exists at $DB_FILE"
else
    echo "Creating new database at $DB_FILE"
fi

# Set NODE_ENV for migrations
export NODE_ENV="${NODE_ENV:-production}"
echo "Environment: $NODE_ENV"

echo "Running database migrations..."
# Run migrations with proper error handling
if npx knex migrate:latest --env "$NODE_ENV"; then
    echo "✓ Migrations completed successfully"
else
    echo "⚠ Migration warning - database might already be up to date"
fi

# Only run seeds in development mode
if [ "$NODE_ENV" = "development" ]; then
    echo "Running database seeds (development mode)..."
    if npx knex seed:run --env "$NODE_ENV"; then
        echo "✓ Seeds completed successfully"
    else
        echo "⚠ Seeding warning - data might already exist"
    fi
else
    echo "Skipping seeds (production mode)"
fi

echo "=== Starting OPAL Server ==="
echo "Port: $MCP_PORT"
echo "Database: $DB_FILE"
echo "Mode: $OPAL_MODE"
echo "=========================="

# Start the server (using compiled TypeScript from dist/)
exec node dist/src/server.js
