# Browser Gameplay Analysis System

## Goal
Enable real-time capture of slot / game outcomes while a user plays inside the Discord in-app browser (or any sandboxed browser session) without requiring on‑chain data access or internal casino APIs.

## Core Principles
- Zero custody / zero credential interception
- User‑consented capture (explicit start/stop)
- Privacy-preserving (no chat, wallet, PII frames retained)
- Lightweight (symbol + bet + payout extraction only)

## Data Flow
```
[Discord Slash Command /play-analyze <casino>]
          ↓ (bot returns signed session token)
[User opens analyzer URL: https://tiltcheck.gg/analyze?session=TOKEN&casino=stake-us]
          ↓
[Analyzer Page loads casino URL in iframe/WebView sandbox]*
          ↓ (MutationObserver + Canvas OCR + Element heuristics)
[Captured SpinEvents → WebSocket → gameplay-analyzer service]
          ↓
[Buffer -> Normalize -> SpinRecord[]]
          ↓
[gradeEngine( spins + disclosures + sentiment )]
          ↓
[eventRouter.publish('trust.casino.updated')]
          ↓
[Discord /trust-report reflects live drift]
```
*If casino forbids iframe embedding (likely): fallback to user running a lightweight browser extension or headless remote mirror (Puppeteer proxy).

## Spin Extraction Techniques
| Target      | Technique                               | Fallback                |
|-------------|------------------------------------------|-------------------------|
| Bet amount  | DOM query selectors (common labels)      | OCR numeric pattern     |
| Payout      | MutationObserver on balance delta        | OCR '+' flash region    |
| Symbols     | Canvas pixel hashing per reel segment    | Pre-trained CNN (tf.js) |
| Bonus flag  | Detect presence of free-spin counter     | Pattern match keywords  |
| Timestamp   | Client clock (ms)                        | Server time via WS sync |

## Minimal MVP (Phase 1)
1. User manually pastes exported session CSV (Stake provides game history)
2. Parser converts CSV → SpinRecord[]
3. gradeEngine runs locally
4. Result DM sent back to user

## Phase 2 (Automated Capture)
1. Analyzer web app with drag‑and‑drop screenshot batch parsing
2. Basic OCR (Tesseract.js) for payout + bet
3. Heuristic symbol inference (map emoji / image alt text)

## Phase 3 (Real-Time)
1. Headless Puppeteer sidecar launched per session
2. Frame diff every 500ms → extraction modules
3. RTP drift streaming (payoutDrift metric updates after every N spins)
4. Alerts: /seed-request if RTP deviation > threshold

## Security & Ethics
- No keystroke logging
- No wallet address capture
- All raw frames discarded after numeric extraction
- User can request immediate purge (`/analyze-stop <sessionId>`)

## Session Token Structure
```json
{
  "sessionId": "ulid",
  "casinoId": "stake-us",
  "userId": "discord-123",
  "expires": 1732147200000,
  "signature": "ed25519_hex"
}
```

## Required New Components
- `services/gameplay-analyzer` (WS + REST ingest)
- `apps/discord-bot`: commands `/play-analyze`, `/analyze-stop`, `/submit-seed`
- Frontend (later): `apps/analyzer-web` (not yet implemented)

## Publishing Spin Data
```typescript
interface RawSpinEvent {
  ts: number; // ms
  bet: number; // base currency minor units
  payout: number; // minor units
  symbols?: string[];
  bonus?: boolean;
}
```
Normalized into existing `SpinRecord`:
```typescript
const spinRecord: SpinRecord = {
  ts: raw.ts,
  netWin: raw.payout - raw.bet,
  symbolFreq: aggregateSymbols(raw.symbols),
  featureTriggered: raw.bonus,
};
```

## Drift Alert Flow
1. gameplay-analyzer accumulates last 200 spins
2. Recompute observed RTP every spin
3. If observedRTP < statedRTP - DRIFT_THRESHOLD (e.g. 5%) for >= MIN_SPINS (e.g. 150):
   - Publish `trust.casino.alert` with action `request_seed_verification`
   - Discord bot DM: prompts `/submit-seed`

## Seed Verification MVP
User supplies server seed (revealed after rotation), client seed, nonce → we hash & compare expected outcome placeholder (later real algorithm per game).

## Roadmap
| Phase | Deliverable | Effort |
|-------|-------------|--------|
| 1 | CSV import parser | 0.5d |
| 2 | Screenshot batch OCR | 2d |
| 3 | Real-time Puppeteer capture | 4d |
| 4 | Symbol CNN training | 3d |
| 5 | Multi-casino adapter library | 2d |

## Open Questions
- How often do casinos rotate server seeds? (Adjust detection cadence)
- Best universal symbol hashing approach across themed slots?
- Provide anonymized aggregated RTP statistics publicly?

## Next Actions
1. Scaffold gameplay-analyzer service (HTTP + WS ingest)
2. Add `/submit-seed` command (stores verifications)
3. Implement CSV import endpoint to seed SpinRecord[]
4. Wire grading output to trust.casino.updated events

---
Status: Design approved — proceeding with scaffolding.
