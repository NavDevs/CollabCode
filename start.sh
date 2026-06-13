#!/bin/bash
set -e

echo "🔧 Writing VITE_ environment variables..."
env | grep '^VITE_' > /app/client/.env 2>/dev/null || echo "No VITE_ vars found"
cat /app/client/.env

echo "🏗️  Building client..."
cd /app/client && npm run build

echo "🚀 Starting server..."
cd /app && node server/index.js
