#!/bin/bash
# JustTheTip Bot Startup Script

echo "💸 Starting JustTheTip Discord Bot..."
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "❌ .env file not found!"
  echo "Please create a .env file with JTT_DISCORD_TOKEN and JTT_DISCORD_CLIENT_ID"
  exit 1
fi

# Check if built
if [ ! -d "apps/justthetip-bot/dist" ]; then
  echo "⚠️  Bot not built. Building now..."
  pnpm -F @tiltcheck/justthetip-bot build
fi

echo "🚀 Launching JustTheTip bot..."
echo ""

# Export environment variables and run
set -a
source .env
set +a

node apps/justthetip-bot/dist/index.js
