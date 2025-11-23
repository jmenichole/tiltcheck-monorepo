# Token Rotation & History Purge Quick Reference

## 🚨 IMMEDIATE ACTIONS

### 1. Rotate Discord Tokens NOW
```bash
# Visit Discord Developer Portal
open https://discord.com/developers/applications/1419742988128616479

# Steps:
# 1. Click "Bot" → "Reset Token"
# 2. Copy new token
# 3. Update .env locally (DO NOT COMMIT)
```

### 2. Update .env with New Tokens
```bash
# Edit .env and replace:
DISCORD_TOKEN=<NEW_TILTCHECK_TOKEN>
JTT_DISCORD_TOKEN=<NEW_JTT_TOKEN>

# Verify .env is in .gitignore (already done)
git check-ignore .env  # Should output: .env
```

### 3. Generate Session Signing Keys
```bash
node -e "const c=require('crypto');const k=c.randomBytes(32).toString('hex');console.log('SESSION_SIGNING_SECRET='+k);require('@noble/ed25519').getPublicKey(Buffer.from(k,'hex')).then(p=>console.log('SESSION_PUBLIC_KEY='+Buffer.from(p).toString('hex')));"

# Add output to .env
```

## 🧹 PURGE OLD TOKENS FROM GIT HISTORY

### Option 1: Automated Script
```bash
./scripts/security-setup.sh
```

### Option 2: Manual Purge
```bash
# Create replacement file
cat > /tmp/tokens.txt <<EOF
OLD_TOKEN_PREFIX_1=***REMOVED_TOKEN_1***
OLD_TOKEN_PREFIX_2=***REMOVED_TOKEN_2***
EOF

# Backup current branch
git branch backup-before-purge-$(date +%Y%m%d)

# Purge tokens
git filter-repo --replace-text /tmp/tokens.txt --force

# Force push (COORDINATE WITH TEAM FIRST!)
git push --force origin $(git branch --show-current)

# Clean up
rm /tmp/tokens.txt
```

### Notify Collaborators
After force-push, team members must:
```bash
# Save uncommitted work first!
git fetch --all
git reset --hard origin/$(git branch --show-current)
```

## 🔐 AGE ENCRYPTION SETUP

### Status
✅ age.agekey generated: `age13zmr05wtqw0xyftvuqhlgruj6wug3hafpycmzfqvp5rmj6mrc5xsc0elaz`
✅ .sops.yaml updated with public key

### Encrypt .env for Team Sharing
```bash
# Install sops
brew install sops

# Encrypt .env
cp .env .env.secret
sops -e .env.secret > .env.secret.enc

# Commit encrypted version
git add .env.secret.enc
git commit -m "Add encrypted environment template"

# Remove plaintext
rm .env.secret
```

### Decrypt for Team Members
```bash
# Team member needs age.agekey (shared securely via 1Password/encrypted channel)
sops -d .env.secret.enc > .env
```

## 🛡️ GITHUB BRANCH PROTECTION

### Enable Secret Scan as Required Check

#### Option 1: GitHub Web UI
```
1. Go to: Settings → Branches → Branch protection rules
2. Edit rule for 'main' or create new
3. ✅ Require status checks to pass before merging
4. Search: "TruffleHog Scan"
5. ✅ Check it
6. Search: "Entropy Heuristic Pre-Check"  
7. ✅ Check it
8. Save changes
```

#### Option 2: GitHub CLI
```bash
# Install gh if needed
brew install gh
gh auth login

# Enable required checks
gh api repos/jmenichole/tiltcheck-monorepo/branches/main/protection \
  -X PUT \
  -f required_status_checks[strict]=true \
  -f 'required_status_checks[contexts][]=TruffleHog Scan' \
  -f 'required_status_checks[contexts][]=Entropy Heuristic Pre-Check'
```

## ✅ VERIFICATION CHECKLIST

- [ ] Discord tokens rotated in Developer Portal
- [ ] New DISCORD_TOKEN in .env
- [ ] New JTT_DISCORD_TOKEN in .env
- [ ] SESSION_SIGNING_SECRET generated and in .env
- [ ] SESSION_PUBLIC_KEY generated and in .env
- [ ] .env verified in .gitignore
- [ ] age.agekey generated and secured
- [ ] .sops.yaml updated with age public key
- [ ] Old tokens purged from git history (optional but recommended)
- [ ] Force-pushed if history purged
- [ ] Team notified to re-clone if history purged
- [ ] Secret-scan workflow enabled as required check
- [ ] Tested bot startup with new tokens

## 🧪 TEST NEW TOKENS

```bash
# Test TiltCheck bot
DISCORD_TOKEN=<new_token> \
DISCORD_CLIENT_ID=1419742988128616479 \
DISCORD_GUILD_ID=1413961128522023024 \
node apps/discord-bot/dist/index.js

# Test gameplay analyzer WS
EXPECTED_RTP_BASELINE=0.96 \
SESSION_PUBLIC_KEY=<from_env> \
WS_PORT=8083 \
node services/gameplay-analyzer/dist/ws-ingest.js
```

## 🔄 ONGOING SECURITY

### Pre-commit Hook (Optional)
```bash
cat > .git/hooks/pre-commit <<'EOF'
#!/usr/bin/env bash
if git diff --cached --name-only | grep -q '\.env$'; then
  echo "❌ Blocked: .env should never be committed!"
  exit 1
fi
if git diff --cached | grep -E 'OLD_TOKEN_PREFIX_1|OLD_TOKEN_PREFIX_2'; then
  echo "❌ Blocked: Old token string detected!"
  exit 1
fi
exit 0
EOF

chmod +x .git/hooks/pre-commit
```

### Periodic Token Rotation
Set calendar reminder to rotate Discord tokens every 90 days.

---
**Security Contact:** Report vulnerabilities via SECURITY.md
