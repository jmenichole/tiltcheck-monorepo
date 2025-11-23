# 🔐 Security Setup Complete - Action Summary

Generated: $(date)

## ✅ Completed Tasks

### 1. Age Encryption Setup
- ✅ **Age keypair generated**
  - Private key: `age.agekey` (secured, in .gitignore)
  - Public key: `age13zmr05wtqw0xyftvuqhlgruj6wug3hafpycmzfqvp5rmj6mrc5xsc0elaz`
- ✅ **.sops.yaml updated** with age public key
- ✅ Ready for encrypted secret storage

### 2. Ed25519 Session Signing Keys
- ✅ **Keypair generated** - ADD THESE TO .env:
  ```
  SESSION_SIGNING_SECRET=bb6a52da877bf937828be1ffd86f4fd047055801c1cac9425467c68e6791f897
  SESSION_PUBLIC_KEY=372d43548cb6c825e6813e13bc7b5f4185b65dc84daa90c4be90b432ad1781df
  ```

### 3. Pre-commit Security Hook
- ✅ Installed at `.git/hooks/pre-commit`
- ✅ Blocks commits of:
  - .env files
  - Age private keys
  - Session data
  - Discord token patterns
  - Old compromised tokens

### 4. Documentation Created
- ✅ `docs/security/ROTATION_GUIDE.md` - Step-by-step rotation guide
- ✅ `docs/security/secrets.md` - SOPS encryption workflows
- ✅ `scripts/security-setup.sh` - Automated setup script

### 5. Secret Scanning Workflow
- ✅ `.github/workflows/secret-scan.yml` active
- ✅ TruffleHog scanning on every PR
- ✅ Entropy heuristic checks
- ⏳ **Needs: Enable as required status check** (see below)

---

## ⚠️ IMMEDIATE ACTIONS REQUIRED

### 1. Rotate Discord Tokens (CRITICAL)
Your current tokens are exposed in this conversation and must be rotated immediately:

```bash
# Visit Discord Developer Portal
open https://discord.com/developers/applications/1419742988128616479
```

**Steps:**
1. Click "Bot" → "Reset Token"
2. Copy new DISCORD_TOKEN
3. If JustTheTip uses separate app, repeat for JTT_DISCORD_TOKEN
4. Update `.env` file with new tokens (DO NOT COMMIT)

### 2. Update .env File
Add/update these lines in `.env`:
```bash
# Session signing (copy from above)
SESSION_SIGNING_SECRET=bb6a52da877bf937828be1ffd86f4fd047055801c1cac9425467c68e6791f897
SESSION_PUBLIC_KEY=372d43548cb6c825e6813e13bc7b5f4185b65dc84daa90c4be90b432ad1781df

# Discord tokens (use NEW rotated values)
DISCORD_TOKEN=<YOUR_NEW_TILTCHECK_TOKEN_HERE>
JTT_DISCORD_TOKEN=<YOUR_NEW_JTT_TOKEN_HERE>

# Existing settings (keep as-is)
DISCORD_CLIENT_ID=1419742988128616479
DISCORD_GUILD_ID=1413961128522023024
JTT_DISCORD_CLIENT_ID=1419742988128616479
JTT_GUILD_ID=1413961128522023024
EXPECTED_RTP_BASELINE=0.96
SESSION_PUBLIC_KEY=372d43548cb6c825e6813e13bc7b5f4185b65dc84daa90c4be90b432ad1781df
```

### 3. Test Services with New Credentials
```bash
# Build first
pnpm -F @tiltcheck/discord-bot build
pnpm -F @tiltcheck/gameplay-analyzer build

# Test Discord bot
DISCORD_TOKEN=<new_token> \
DISCORD_CLIENT_ID=1419742988128616479 \
DISCORD_GUILD_ID=1413961128522023024 \
node apps/discord-bot/dist/index.js

# Test gameplay analyzer
EXPECTED_RTP_BASELINE=0.96 \
SESSION_PUBLIC_KEY=372d43548cb6c825e6813e13bc7b5f4185b65dc84daa90c4be90b432ad1781df \
WS_PORT=8083 \
node services/gameplay-analyzer/dist/ws-ingest.js
```

---

## 🧹 OPTIONAL: Purge Old Tokens from Git History

**WARNING:** This rewrites git history. Coordinate with team before proceeding.

### Automated Method
```bash
./scripts/security-setup.sh
# Follow prompts, select "yes" when asked about history purge
```

### Manual Method
```bash
# Create token list
cat > /tmp/tokens.txt <<EOF
OLD_TOKEN_PREFIX_1=***REMOVED***
OLD_TOKEN_PREFIX_2=***REMOVED***
OLD_TOKEN_PREFIX_3=***REMOVED***
OLD_TOKEN_PREFIX_4=***REMOVED***
EOF

# Backup
git branch backup-$(date +%Y%m%d-%H%M%S)

# Purge
git filter-repo --replace-text /tmp/tokens.txt --force

# Force push (DESTRUCTIVE!)
git push --force origin $(git branch --show-current)

# Cleanup
rm /tmp/tokens.txt
```

### Notify Team After Force Push
Team members must re-sync:
```bash
git fetch --all
git reset --hard origin/$(git branch --show-current)
```

---

## 🛡️ Enable Secret Scanning as Required Check

### Option 1: GitHub Web UI
1. Go to: https://github.com/jmenichole/tiltcheck-monorepo/settings/branches
2. Edit protection rule for your main branch (or create new)
3. ✅ Enable "Require status checks to pass before merging"
4. Search for and check:
   - ✅ **TruffleHog Scan**
   - ✅ **Entropy Heuristic Pre-Check**
5. Save changes

### Option 2: GitHub CLI
```bash
# Install if needed
brew install gh
gh auth login

# Apply protection
gh api repos/jmenichole/tiltcheck-monorepo/branches/main/protection \
  -X PUT \
  -f required_status_checks[strict]=true \
  -f 'required_status_checks[contexts][]=TruffleHog Scan' \
  -f 'required_status_checks[contexts][]=Entropy Heuristic Pre-Check' \
  -f required_pull_request_reviews[required_approving_review_count]=1
```

---

## 📋 Final Checklist

- [ ] Discord tokens rotated in Developer Portal
- [ ] New `DISCORD_TOKEN` added to .env
- [ ] New `JTT_DISCORD_TOKEN` added to .env
- [ ] `SESSION_SIGNING_SECRET` added to .env
- [ ] `SESSION_PUBLIC_KEY` added to .env
- [ ] `.env` file verified NOT in git staging
- [ ] Discord bot tested with new token
- [ ] Gameplay analyzer tested
- [ ] Old tokens purged from git history (optional)
- [ ] Force-pushed if history purged
- [ ] Team notified if history purged
- [ ] Secret-scan enabled as required status check
- [ ] Pre-commit hook tested (`git commit --dry-run`)

---

## 🔄 Ongoing Security Best Practices

1. **Never commit .env** - Pre-commit hook will block
2. **Rotate tokens every 90 days** - Set calendar reminder
3. **Use SOPS for shared secrets** - See `docs/security/secrets.md`
4. **Review secret-scan findings** - Check GitHub Security tab weekly
5. **Keep age.agekey secure** - Backup encrypted, never in git

---

## 📚 Additional Resources

- **Token Rotation Guide:** `docs/security/ROTATION_GUIDE.md`
- **SOPS Encryption:** `docs/security/secrets.md`
- **Setup Script:** `./scripts/security-setup.sh`
- **Secret Scanning Workflow:** `.github/workflows/secret-scan.yml`

---

## 🚨 If Tokens Are Leaked Again

1. Rotate immediately in Discord Developer Portal
2. Run `./scripts/security-setup.sh` and select history purge
3. Review `.git/hooks/pre-commit` - ensure it's active
4. Check GitHub Security alerts
5. Update SECURITY.md incident log

---

**Generated:** $(date)
**Age Public Key:** age13zmr05wtqw0xyftvuqhlgruj6wug3hafpycmzfqvp5rmj6mrc5xsc0elaz
**Status:** ⚠️ PENDING TOKEN ROTATION
