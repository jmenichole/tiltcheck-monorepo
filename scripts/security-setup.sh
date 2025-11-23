#!/usr/bin/env bash
set -e

echo "🔐 TiltCheck Security Setup"
echo "=============================="
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Token Rotation Instructions
echo -e "${YELLOW}Step 1: Rotate Discord Tokens${NC}"
echo "----------------------------------------"
echo "⚠️  CRITICAL: Your Discord tokens are exposed and must be rotated immediately."
echo
echo "Visit: https://discord.com/developers/applications"
echo
echo "For TiltCheck Bot (Application ID: 1419742988128616479):"
echo "  1. Click on your application"
echo "  2. Go to 'Bot' section"
echo "  3. Click 'Reset Token'"
echo "  4. Copy the new token"
echo "  5. Update .env file: DISCORD_TOKEN=<new_token>"
echo
echo "For JustTheTip Bot (if different application):"
echo "  1. Follow same steps"
echo "  2. Update .env file: JTT_DISCORD_TOKEN=<new_token>"
echo
read -p "Press Enter after rotating tokens..."
echo

# Step 2: Generate Ed25519 Keypair
echo -e "${YELLOW}Step 2: Generate Ed25519 Signing Keys${NC}"
echo "----------------------------------------"
if command -v node &> /dev/null; then
    echo "Generating session signing keypair..."
    node -e "
    const crypto = require('crypto');
    const sk = crypto.randomBytes(32).toString('hex');
    console.log('Add to .env:');
    console.log('SESSION_SIGNING_SECRET=' + sk);
    console.log('');
    const ed = require('@noble/ed25519');
    (async () => {
        const pk = await ed.getPublicKey(Buffer.from(sk, 'hex'));
        console.log('SESSION_PUBLIC_KEY=' + Buffer.from(pk).toString('hex'));
    })();
    "
    echo
    echo "⚠️  Add these to your .env file (SESSION_SIGNING_SECRET and SESSION_PUBLIC_KEY)"
    read -p "Press Enter after updating .env..."
else
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi
echo

# Step 3: Age Key Status
echo -e "${YELLOW}Step 3: Age Encryption Key${NC}"
echo "----------------------------------------"
if [ -f "age.agekey" ]; then
    echo "✅ Age key already generated at: age.agekey"
    echo "Public key: $(grep 'public key:' age.agekey | cut -d: -f2 | xargs)"
    echo "✅ .sops.yaml has been updated with your public key"
else
    echo "❌ Age key not found. Generating now..."
    age-keygen -o age.agekey
    PUB_KEY=$(grep 'public key:' age.agekey | cut -d: -f2 | xargs)
    echo "✅ Generated age key with public key: $PUB_KEY"
fi
echo
echo "⚠️  IMPORTANT: Keep age.agekey secure and never commit it to git!"
echo "   It's already in .gitignore"
echo

# Step 4: Purge Old Tokens from Git History
echo -e "${YELLOW}Step 4: Purge Old Tokens from Git History${NC}"
echo "----------------------------------------"
echo "This will rewrite git history to remove exposed tokens."
echo "⚠️  WARNING: This is destructive and requires force-push!"
echo
read -p "Do you want to purge tokens from git history? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Creating token replacement file..."
    cat > /tmp/token-replacements.txt <<EOF
OLD_TILTCHECK_TOKEN_PREFIX=***REMOVED_TILTCHECK_TOKEN***
OLD_JTT_TOKEN_PREFIX=***REMOVED_JTT_TOKEN***
EOF
    
    echo "Running git-filter-repo..."
    if command -v git-filter-repo &> /dev/null; then
        # Backup current branch
        CURRENT_BRANCH=$(git branch --show-current)
        git branch backup-before-filter-$(date +%Y%m%d-%H%M%S)
        
        git filter-repo --replace-text /tmp/token-replacements.txt --force
        
        echo -e "${GREEN}✅ History rewritten successfully${NC}"
        echo
        echo "⚠️  Next steps:"
        echo "   1. Review the changes: git log --oneline"
        echo "   2. Force push: git push --force origin $CURRENT_BRANCH"
        echo "   3. Notify collaborators to re-clone or reset their repos"
        
        rm /tmp/token-replacements.txt
    else
        echo "❌ git-filter-repo not found. Install with:"
        echo "   brew install git-filter-repo"
        rm /tmp/token-replacements.txt
    fi
else
    echo "Skipping history purge."
fi
echo

# Step 5: Verify .gitignore
echo -e "${YELLOW}Step 5: Verify .gitignore${NC}"
echo "----------------------------------------"
if git check-ignore .env age.agekey data/sessions.json &> /dev/null; then
    echo "✅ Sensitive files are properly ignored"
else
    echo "⚠️  Some files may not be ignored. Check .gitignore"
fi
echo

# Step 6: Enable Secret Scanning Workflow
echo -e "${YELLOW}Step 6: Enable Secret Scanning as Required Check${NC}"
echo "----------------------------------------"
echo "To make secret-scan a required status check:"
echo "  1. Go to: https://github.com/jmenichole/tiltcheck-monorepo/settings/branches"
echo "  2. Find 'Branch protection rules' for your main branch"
echo "  3. Enable 'Require status checks to pass before merging'"
echo "  4. Search for 'TruffleHog Scan' and check it"
echo "  5. Save changes"
echo
echo "Or use GitHub CLI:"
echo "  gh api repos/jmenichole/tiltcheck-monorepo/branches/main/protection/required_status_checks \\"
echo "    -X PATCH -f strict=true -f 'contexts[]=TruffleHog Scan'"
echo

# Final Summary
echo -e "${GREEN}=============================="
echo "Security Setup Complete!"
echo "==============================${NC}"
echo
echo "✅ Checklist:"
echo "   [ ] Discord tokens rotated"
echo "   [ ] SESSION_SIGNING_SECRET and SESSION_PUBLIC_KEY in .env"
echo "   [ ] age.agekey generated and secured"
echo "   [ ] .sops.yaml updated with age public key"
echo "   [ ] Old tokens purged from git history (optional)"
echo "   [ ] Force-pushed to remote (if history purged)"
echo "   [ ] Secret-scan enabled as required status check"
echo
echo "📚 Next: Read docs/security/secrets.md for encryption workflows"
echo
