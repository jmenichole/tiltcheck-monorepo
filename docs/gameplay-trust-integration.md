# Gameplay Analyzer + Trust Events Integration

## Overview

The Gameplay Analyzer now publishes trust events when detecting fairness anomalies, which are automatically consumed by the identity-core trust scoring system. These trust scores then gate access to CollectClock bonus claims.

## Architecture Flow

```
Gameplay Analyzer (spin data)
    ↓
Anomaly Detection (pump, compression, clustering)
    ↓
Event Router (fairness.* events)
    ↓
Identity-Core (trust signal subscriptions)
    ↓
Trust Score Updates
    ↓
CollectClock (trust-gated claims)
```

## Anomaly Types & Trust Impact

### Pump Detection
- **Event:** `fairness.pump.detected`
- **Trust Impact:** -10% to -60% (severity-weighted)
- **Trigger:** RTP elevation >15% above baseline
- **Weight:** 0.5 (moderate impact on composite score)

### Volatility Compression
- **Event:** `fairness.compression.detected`
- **Trust Impact:** -5% to -30% (severity-weighted)
- **Trigger:** Variance ratio <0.3 (precedes pump)
- **Weight:** 0.3 (lighter impact)

### Win Clustering
- **Event:** `fairness.cluster.detected`
- **Trust Impact:** -10% to -50% (severity-weighted)
- **Trigger:** Abnormal win pattern clustering
- **Weight:** 0.4 (moderate impact)

## Trust Band Claim Limits (CollectClock)

When `COLLECTCLOCK_TRUST_GATING=1`:

| Trust Band | Score Range | Claims/Day | Min Score |
|------------|-------------|------------|-----------|
| RED        | 0-25        | 1          | 30 (blocked) |
| YELLOW     | 26-50       | 2          | 30        |
| GREEN      | 51-75       | 5          | 30        |
| PLATINUM   | 76-100      | 10         | 30        |

## Configuration

### Environment Variables

```bash
# Gameplay Analyzer
GAMEPLAY_ANALYZER_PORT=8111
CASINO_ID=stake-us
EXPECTED_RTP=-0.02
GRADE_INTERVAL=500
RTP_WINDOW_SIZE=400
RTP_DRIFT_THRESHOLD=0.5
DETECTION_WINDOW=100
DETECTION_INTERVAL=200

# CollectClock Trust Gating
COLLECTCLOCK_TRUST_GATING=1
COLLECTCLOCK_MIN_TRUST_SCORE=30
COLLECTCLOCK_LOG_DIR=./logs/collectclock
```

## Health Endpoints

### Gameplay Analyzer
```bash
curl http://localhost:8111/health
# Returns: spins, seedRotations, anomalyEvents, gradingEvents, memory, uptime

curl http://localhost:8111/ready
# Returns: {"ready": true} (200) or {"ready": false} (503)
```

## Example Usage

### 1. Start Gameplay Analyzer
```bash
cd services/gameplay-analyzer
pnpm build
GAMEPLAY_ANALYZER_PORT=8111 node dist/index.js
```

### 2. Ingest Gameplay Data
```bash
node dist/index.js --csv data/stake-spins.csv
```

### 3. Monitor Trust Events
```typescript
import { eventRouter } from '@tiltcheck/event-router';

eventRouter.subscribe('fairness.pump.detected', (evt) => {
  console.log('Pump detected:', evt.data);
  // { userId, casinoId, anomalyType, severity, confidence, metadata, reason }
}, 'monitoring');
```

### 4. Claim Bonus with Trust Gating
```typescript
import { CollectClockService } from '@tiltcheck/collectclock';
import { getProfile, getTrustBand } from '@tiltcheck/identity-core';

const collectclock = new CollectClockService({
  trustGating: { enabled: true, minTrustScore: 30 }
});

collectclock.registerCasino('stake-us', 100);

const profile = getProfile(userId);
const band = getTrustBand(profile.trustScore);

try {
  const claim = collectclock.claimBonus('stake-us', userId, profile.trustScore, band);
  console.log('Claim successful:', claim);
} catch (err) {
  console.error('Claim rejected:', err.message);
  // Possible reasons:
  // - Trust score too low (< 30)
  // - Daily claim limit reached for band
  // - Cooldown active
}
```

## Event Payloads

### fairness.pump.detected
```typescript
{
  userId?: string,
  casinoId: string,
  anomalyType: 'pump',
  severity: 'info' | 'warning' | 'critical',
  confidence: number, // 0-1
  metadata: {
    windowSize: number,
    observedRTP: number,
    baselineRTP: number,
    deviationRatio: number
  },
  reason: string,
  timestamp: number
}
```

### fairness.compression.detected
```typescript
{
  userId?: string,
  casinoId: string,
  anomalyType: 'volatility_compression',
  severity: 'info' | 'warning' | 'critical',
  confidence: number,
  metadata: {
    varianceRatio: number,
    compressionWindow: number,
    comparisonWindow: number
  },
  reason: string,
  timestamp: number
}
```

### fairness.cluster.detected
```typescript
{
  userId?: string,
  casinoId: string,
  anomalyType: 'win_clustering',
  severity: 'info' | 'warning' | 'critical',
  confidence: number,
  metadata: {
    clusterScore: number,
    windowSize: number
  },
  reason: string,
  timestamp: number
}
```

## Testing

Run integration tests:
```bash
pnpm test tests/gameplay-collectclock-integration.test.ts
```

## Future Enhancements

- [ ] User-specific session tracking (map sessionId → userId)
- [ ] Real-time dashboard for anomaly monitoring
- [ ] ML-based anomaly detection (isolation forest)
- [ ] Automated trust recovery for false positives
- [ ] Multi-casino trust correlation
- [ ] On-chain trust score attestation (Solana)

## Troubleshooting

### No trust events firing
- Check `identity-core` subscriptions registered: `grep 'fairness\.' packages/identity-core/dist/events.js`
- Verify event router is running
- Check anomaly detection thresholds not too strict

### Claims always rejected
- Verify `COLLECTCLOCK_TRUST_GATING=1` set
- Check user trust score: `getProfile(userId).trustScore`
- Review trust band limits configuration
- Ensure user has trust history (fresh users start at 50)

### Health endpoint not responding
- Check port conflicts: `lsof -i :8111`
- Review logs for startup errors
- Verify retry/backoff logic engaged

---

**Updated:** November 21, 2025  
**Maintainer:** jmenichole
