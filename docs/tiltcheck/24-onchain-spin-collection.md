# On-Chain Spin Data Collection

## Purpose
Extract real-time spin outcomes from on-chain casino programs (Solana) to populate grading engine with actual volatility/RTP data instead of placeholders.

## Architecture

### Data Sources
1. **Solana Program Logs**: Monitor casino smart contracts for bet/outcome events
2. **WebSocket Subscriptions**: Real-time log streaming via Solana RPC
3. **Historical Indexing**: Backfill past N days of spins via getProgramAccounts

### Event Schema (Example: Stake-style casino)
```typescript
interface SpinEventLog {
  signature: string; // transaction signature
  timestamp: number;
  player: string; // wallet pubkey
  casinoProgram: string;
  gameId: string; // slot ID, dice, etc.
  betAmount: number; // lamports
  payout: number; // lamports
  netWin: number; // payout - betAmount
  symbols?: string[]; // slot reel outcomes if available
  provablyFairSeed?: { server: string; client: string; nonce: number };
}
```

### Implementation Plan

#### Phase 1: Solana Log Parser (MVP)
- Subscribe to known casino program IDs (Stake, Rollbit, etc.)
- Parse transaction logs for bet/payout instruction data
- Store raw events in `data/on-chain-spins/{casino}/{date}.jsonl`

#### Phase 2: Aggregation Pipeline
- Batch process JSONL files hourly
- Compute:
  - RTP observed (total payout / total bet)
  - Symbol frequency distributions
  - Bonus trigger intervals
  - Volatility (stdDev of netWin)
- Feed into `CasinoData.spins` for grading engine

#### Phase 3: Real-Time Integration
- WebSocket stream → in-memory buffer (last 1000 spins per casino)
- Continuous grading updates every 100 spins
- Emit `trust.casino.updated` when RTP drift exceeds threshold

## Environment Variables
```bash
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WS_URL=wss://api.mainnet-beta.solana.com

# Known casino program IDs (Solana mainnet)
CASINO_PROGRAMS=StakeProgram111...,RollbitProgram111...
```

## Privacy & Ethics
- Collect only on-chain public data (no player PII beyond wallet addresses)
- Aggregate player activity; never report individual sessions
- Casino program IDs are public; no reverse engineering required

## Cost Estimate
- Solana RPC calls: ~$50/month (Helius/Quicknode paid tier for reliable WS)
- Storage: ~10GB/month JSONL (compressible to ~2GB)

## Integration Points
1. **AI Collector**: Replace placeholder spin data with real on-chain spins
2. **Grading Engine**: Populate `CasinoData.spins` array
3. **Trust Rollup**: Subscribe to RTP drift events for real-time alerts

## Roadmap
- [ ] Identify Stake/Rollbit program IDs and instruction schemas
- [ ] Build Solana log parser service
- [ ] Add JSONL storage layer
- [ ] Wire aggregation pipeline into AI collector
- [ ] Add RTP drift alerts (threshold: >5% deviation from stated RTP)

## Notes
This component is **not yet implemented**. Current grading uses empty spin arrays (all volatility/RTP metrics score 100 due to lack of data). Implementing on-chain collection is the next major priority for actionable fairness analysis.
