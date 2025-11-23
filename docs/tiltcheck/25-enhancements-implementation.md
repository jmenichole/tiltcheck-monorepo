# AI Collector Enhancements - Implementation Complete

## 1. Mock Spin Generator ✅

**File:** `packages/grading-engine/src/utils/mock-data-generator.ts`

**Features:**
- Generates realistic spin outcomes with configurable RTP
- Supports 4 scenarios: fair, rigged, shady, excellent
- Includes bonus rounds, symbol distributions, rotation patterns
- **Usage:**
```typescript
import { generateMockCasinoData } from '@tiltcheck/grading-engine/utils/mock-data-generator';

const data = generateMockCasinoData('fair'); // or 'rigged', 'shady', 'excellent'
const result = gradeEngine(data);
console.log(result.compositeScore); // 0-100
```

**Test immediately:**
```bash
cd packages/grading-engine
pnpm build
node -e "
const { generateMockCasinoData } = require('./dist/utils/mock-data-generator.js');
const { gradeEngine } = require('./dist/index.js');
const data = generateMockCasinoData('rigged');
const result = gradeEngine(data);
console.log('Rigged casino score:', result.compositeScore);
"
```

---

## 2. User-Agent Rotation (Next Implementation)

**Purpose:** Avoid 403 errors from Cloudflare/WAF

**Implementation Location:** `services/ai-collector/src/index.ts`

**Required Changes:**
```typescript
// Add at top of file
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Update all fetch calls
fetch(url, {
  headers: { 
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
  }
});

// Add random delay between requests
await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000)); // 1-3s
```

---

## 3. LLM Extraction Caching (30 Days)

**Purpose:** Save $$$, reduce API calls for unchanged disclosures

**Implementation:**
```typescript
const CACHE_DIR = path.join(process.cwd(), 'data', 'extraction-cache');
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function getCachedExtraction(url, type) {
  const key = crypto.createHash('md5').update(`${url}:${type}`).digest('hex');
  const cachePath = path.join(CACHE_DIR, `${key}.json`);
  
  try {
    const stats = await fs.stat(cachePath);
    const age = Date.now() - stats.mtimeMs;
    
    if (age < CACHE_TTL_MS) {
      return JSON.parse(await fs.readFile(cachePath, 'utf-8'));
    }
    await fs.unlink(cachePath); // Expired
  } catch {}
  return null;
}

async function setCachedExtraction(url, type, data) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const key = crypto.createHash('md5').update(`${url}:${type}`).digest('hex');
  await fs.writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(data));
}

// Use in extractDisclosures
const cached = await getCachedExtraction(casinoUrl, 'disclosures');
if (cached) return cached;

// ... LLM extraction ...
await setCachedExtraction(casinoUrl, 'disclosures', result);
```

**Expected Savings:** ~80% reduction in LLM API costs for repeat collections

---

## 4. Auto-Register Discord Commands on Startup

**File:** `apps/discord-bot/src/index.ts`

**Implementation:**
```typescript
import { REST, Routes } from 'discord.js';
import * as commands from './commands/index.js';

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  
  // Auto-register slash commands
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const commandData = Object.values(commands).map(cmd => cmd.data.toJSON());
  
  try {
    console.log('🔄 Refreshing slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID,
        process.env.DISCORD_GUILD_ID
      ),
      { body: commandData }
    );
    console.log(`✅ Registered ${commandData.length} commands`);
  } catch (error) {
    console.error('❌ Command registration failed:', error);
  }
});
```

**Benefit:** No manual `deploy-commands` script needed; /trust-report works immediately

---

## 5. Browser Gameplay Analysis System (Future Design)

**Concept:** Users play in Discord in-app browser, TiltCheck analyzes screen content

**Architecture:**
```
┌─────────────────┐
│ Discord Message │ /play stake-us
│     Button      │ "Play & Analyze"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Discord In-App │ Opens https://stake.us
│     Browser     │ (isolated session)
└────────┬────────┘
         │ Screen sharing API / Puppeteer
         ▼
┌─────────────────┐
│  TiltCheck Bot  │ Captures gameplay frames
│  Frame Analyzer │ every 2 seconds
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Computer Vision│ Detect symbols, bet, payout
│  + OCR (Tesseract)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Grading Engine │ Build SpinRecord[] in real-time
│  Real-Time RTP  │ Alert if RTP < 90%
└─────────────────┘
```

**Tech Stack:**
- **Puppeteer** (headless Chrome control)
- **Tesseract.js** (OCR for reading bet/payout amounts)
- **TensorFlow.js** (symbol recognition via trained CNN)
- **WebSocket** (stream frames to Discord bot)

**User Flow:**
1. User clicks "Play & Analyze" button in Discord
2. Bot opens casino in isolated browser (Puppeteer)
3. User plays normally via Discord
4. Bot captures frames, extracts spin data
5. After 100 spins → send trust report to user's DM

**Privacy:**
- Only analyze game UI (not player data)
- No recording/storage of gameplay
- User consents via button click

**Advantages Over On-Chain:**
- Works for ANY casino (not just Solana)
- Works for fiat casinos (Stake.us, DraftKings, etc.)
- No smart contract reverse-engineering needed

**Challenges:**
- Discord doesn't support browser embedding (would need external web app)
- OCR accuracy on slot symbols (need training data)
- Anti-bot detection (casinos may block Puppeteer)

**MVP Workaround:**
Users manually export session history (CSV) from casino → upload to TiltCheck → grading

---

## 6. Player Seed Submission on RTP Alerts

**Concept:** Crowd-source hash verification when trust-rollup detects drift

**Implementation:**
```typescript
// In trust-rollup/src/index.ts
if (newRTP < 0.90 && casino.previousRTP >= 0.95) {
  // RTP dropped 5%+ → trigger alert
  eventRouter.publish('trust.casino.alert', {
    casinoId,
    severity: 'critical',
    reason: 'RTP drop from 95% to 90%',
    action: 'request_seed_verification'
  });
}

// In discord-bot, subscribe to alerts
eventRouter.subscribe('trust.casino.alert', async (event) => {
  if (event.action === 'request_seed_verification') {
    // Find users who recently played this casino
    const players = await getRecentPlayers(event.casinoId);
    
    for (const player of players) {
      await player.send({
        embeds: [{
          title: '⚠️ Provably Fair Verification Needed',
          description: `We detected unusual RTP on ${event.casinoId}.
          
Please help verify fairness by submitting your last game's seeds:
\`\`\`
/submit-seed ${event.casinoId}
Server Seed: [copy from casino]
Client Seed: [copy from casino]
Nonce: [round number]
\`\`\``,
          color: 0xFF6600
        }]
      });
    }
  }
});

// New command: /submit-seed
export const submitseed = {
  data: new SlashCommandBuilder()
    .setName('submit-seed')
    .addStringOption(opt => opt.setName('casino').setRequired(true))
    .addStringOption(opt => opt.setName('server_seed').setRequired(true))
    .addStringOption(opt => opt.setName('client_seed').setRequired(true))
    .addIntegerOption(opt => opt.setName('nonce').setRequired(true)),
  
  async execute(interaction) {
    const { casino, server_seed, client_seed, nonce } = interaction.options;
    
    // Verify hash against casino's public algorithm
    const verified = await verifyProvablyFairSeed({
      casino,
      serverSeed: server_seed,
      clientSeed: client_seed,
      nonce
    });
    
    if (verified) {
      // Store verified seed in database
      await saveHashVerification(casino, server_seed, true);
      
      await interaction.reply({
        content: '✅ Seed verified! Thank you for contributing to casino transparency.',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: '❌ Seed verification failed. This game may not have been provably fair.',
        ephemeral: true
      });
      
      // Alert trust-rollup of failed verification
      eventRouter.publish('trust.hash.failed', { casino });
    }
  }
};
```

**Database Schema:**
```sql
CREATE TABLE hash_verifications (
  id SERIAL PRIMARY KEY,
  casino_id VARCHAR(50),
  server_seed_hash VARCHAR(128),
  client_seed VARCHAR(64),
  nonce INTEGER,
  verified BOOLEAN,
  submitted_by VARCHAR(50), -- Discord user ID
  submitted_at TIMESTAMP DEFAULT NOW()
);
```

**Grading Engine Integration:**
```typescript
// In packages/grading-engine
export function computeHashVerification(verifications: HashVerificationResult[]): number {
  if (verifications.length === 0) return 100; // No data
  
  const verifiedCount = verifications.filter(v => v.verified).length;
  const rate = verifiedCount / verifications.length;
  
  if (rate === 1.0) return 100;
  if (rate > 0.95) return 90;
  if (rate > 0.90) return 70;
  return Math.max(0, rate * 100 - 30); // Heavy penalty for failed verifications
}
```

**Incentives:**
- Badge system: "Fairness Auditor" role after 10 verified submissions
- Leaderboard: Top contributors displayed in /trust-report
- Airdrops: Monthly raffle for contributors (1 USDC per submission)

---

## Implementation Priority Order

**Today (2 hours):**
1. ✅ Mock spin generator (DONE)
2. 🔄 Test mock generator with grading engine
3. 🔄 Add user-agent rotation to ai-collector

**This Week (8 hours):**
4. Auto-register Discord commands
5. LLM extraction caching (30-day TTL)
6. Docker Compose full test
7. Smart scheduling (track last player activity per casino)

**Next Week (16 hours):**
8. Player seed submission command + database
9. Hash verification algorithm implementations (Stake, Rollbit)
10. Seed verification alerts on RTP drift

**Future (40+ hours):**
11. Browser gameplay analysis system (Puppeteer + OCR)
12. TensorFlow symbol recognition training
13. Real-time RTP monitoring web app

---

## Cost Analysis

**Current:** $6.50/month  
**With Caching:** ~$1.50/month (80% savings)  
**With Browser Analysis:** +$20/month (Puppeteer hosting)  
**With Seed Verification DB:** +$5/month (Supabase free tier)  

**Total Optimized:** ~$27/month at scale (50 casinos, 1000 users)

---

Want me to implement user-agent rotation + caching + auto-register now? These are the highest ROI quick wins.
