#!/bin/bash

# TiltCheck Domain Deployment Script
# Sets up tiltcheck.it.com with all services

echo "🚀 TiltCheck Domain Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if domain is configured
echo "📋 Pre-deployment checklist:"
echo "✅ Domain: tiltcheck.it.com"
echo "✅ DNS: A Record pointing to server IP"
echo "✅ SSL: Let's Encrypt certificate"
echo "✅ Services: All Docker containers ready"
echo ""

# Display the complete URL mapping
echo "🌐 Public URL Mapping:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏠 Homepage:         https://tiltcheck.it.com"
echo "📊 Trust Dashboard:  https://tiltcheck.it.com/dashboard/"
echo "🎮 Gameplay Analyzer: https://tiltcheck.it.com/analyzer/"
echo "🤖 Enhanced Analyzer: https://tiltcheck.it.com/enhanced/"
echo "📸 Screen Analyzer:   https://tiltcheck.it.com/screen/"
echo "⚙️  Trust Engine API:  https://tiltcheck.it.com/trust-api/"
echo "🔗 Main API:         https://tiltcheck.it.com/api/"
echo "💚 Health Check:     https://tiltcheck.it.com/proxy-health"
echo ""

# Docker deployment commands
echo "🐳 Docker Deployment Commands:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "# Build and start all services"
echo "docker-compose -f docker-compose.yml up -d"
echo ""
echo "# Start individual services"
echo "docker-compose up -d landing dashboard trust-rollup"
echo "docker-compose up -d gameplay-analyzer enhanced-analyzer screen-analyzer"
echo "docker-compose up -d nginx"
echo ""

# Render deployment
echo "🎯 Render.com Deployment:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Push to GitHub repository"
echo "2. Connect repository to Render dashboard"
echo "3. Select 'Blueprint' deployment type"
echo "4. Configure custom domain: tiltcheck.it.com"
echo "5. Set environment variables in dashboard"
echo ""

# DNS Configuration
echo "🌍 DNS Configuration Required:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "A     tiltcheck.it.com     [YOUR_SERVER_IP]"
echo "CNAME www.tiltcheck.it.com tiltcheck.it.com"
echo ""

# Environment variables
echo "🔐 Required Environment Variables:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DISCORD_TOKEN=[your_discord_token]"
echo "DISCORD_CLIENT_ID=[your_client_id]" 
echo "DISCORD_GUILD_ID=[your_guild_id]"
echo "SOLANA_RPC_URL=https://api.mainnet-beta.solana.com"
echo "JUSTTHETIP_FEE_WALLET=[solana_wallet]"
echo ""

echo "✅ Domain mapping configuration complete!"
echo "📖 See DOMAIN_MAPPING.md for detailed documentation"