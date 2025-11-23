#!/bin/bash

# Start TiltCheck services in production
echo "🚀 Starting TiltCheck Production Services..."

# Create data directories
mkdir -p /app/data
mkdir -p /app/logs

# Start services in background
echo "📱 Starting Landing Web Server..."
cd /app/services/landing && node server.js &

echo "🤖 Starting Main Discord Bot..."
cd /app/apps/discord-bot && npx tsx src/index.ts &

echo "💰 Starting JustTheTip Bot..."
cd /app/apps/justthetip-bot && npx tsx src/index.ts &

echo "✅ All services started!"

# Keep container running
wait