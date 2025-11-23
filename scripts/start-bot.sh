#!/usr/bin/env bash
# Start TiltCheck Discord Bot with environment variables from .env

set -e

cd "$(dirname "$0")/.."

echo "🤖 Starting TiltCheck Discord Bot..."
echo

# Load environment variables
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "   Please create .env with required variables:"
    echo "   - DISCORD_TOKEN"
    echo "   - DISCORD_CLIENT_ID"
    echo "   - DISCORD_GUILD_ID"
    exit 1
fi

# Check if bot is built
if [ ! -f "apps/discord-bot/dist/index.js" ]; then
    echo "⚠️  Bot not built. Building now..."
    pnpm -F @tiltcheck/discord-bot build
    echo
fi

# Export environment variables
set -a
source .env
set +a

# Start bot
echo "🚀 Launching bot..."
node apps/discord-bot/dist/index.js
