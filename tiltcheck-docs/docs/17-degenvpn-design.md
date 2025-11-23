# DegenVPN Design Document

**Status:** Concept / Separate Project  
**Created:** November 21, 2025  
**Owner:** jmenichole  

---

## Overview

DegenVPN is a **Solana-signed, identity-aware VPN** that leverages wallet attestation and trust scoring to provide adaptive network access with minimal friction. Users remain "always on" while trust signals and anomaly detection govern access policies.

This is a **standalone project** separate from the TiltCheck monorepo. This document captures the architecture, phased roadmap, and technical patterns for future implementation.

---

## Core Principles

- **Non-custodial identity:** Wallet signature proves ownership; no password/email required.
- **Trust-based access control:** Trust bands (RED/YELLOW/GREEN/PLATINUM) determine quotas and features.
- **Minimal re-auth friction:** Short-lived capability tokens reduce full wallet signing frequency.
- **Scrappy infrastructure:** Free-tier gateways, modular services, event-driven coordination.
- **Privacy-first:** No PII logging; IP hashes and minimal telemetry for anomaly detection.
- **Anti-abuse by design:** Adaptive step-up verification when trust drifts or anomalies detected.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      DegenVPN Client (CLI)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Wallet Auth  │  │ Device Key   │  │ Capability Token │  │
│  │ (Ed25519)    │  │ (Optional)   │  │ Refresh Chain    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
           ┌────────────────────────────────────┐
           │      Gateway Node (WireGuard)      │
           │  ┌──────────────────────────────┐  │
           │  │ Token Verifier (signature)   │  │
           │  │ Trust Policy Enforcer        │  │
           │  │ Traffic Shaper (band quotas) │  │
           │  └──────────────────────────────┘  │
           └────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────┐
        │  Backend Services (Solana + TiltCheck)    │
        │  ┌─────────────┐  ┌─────────────────────┐ │
        │  │ AccessReg   │  │ Trust Score Lookup  │ │
        │  │ (on-chain)  │  │ (identity-core API) │ │
        │  └─────────────┘  └─────────────────────┘ │
        │  ┌─────────────┐  ┌─────────────────────┐ │
        │  │ NodeRegistry│  │ Anomaly Sentinel    │ │
        │  │ (stake/tier)│  │ (heuristics → ML)   │ │
        │  └─────────────┘  └─────────────────────┘ │
        └───────────────────────────────────────────┘
```

---

## Authentication Flow

### Phase 0: Wallet-Only (Minimal Viable)

1. **User runs CLI:** `degenvpn auth --wallet <pubkey>`
2. **CLI generates challenge:** Random nonce + timestamp
3. **User signs challenge** with wallet (Phantom / Solflare / CLI keypair)
4. **Backend verifies signature** and looks up trust score
5. **Backend issues session token** (short TTL, e.g., 1 hour)
6. **CLI connects to gateway** presenting session token
7. **Gateway validates token** and applies trust-band policy

**Pros:** Simple, no device coupling, reuses TiltCheck trust scoring.  
**Cons:** Requires wallet re-sign every hour; potential replay if token stolen.

---

### Phase 1: Capability Token Chain (Reduced Re-Auth)

1. **Initial wallet auth** (same as Phase 0) issues **root capability token** (e.g., 24h TTL)
2. **CLI auto-refreshes** short-lived capability tokens (5–15 min TTL) by chaining hash of previous token
3. **Root token refresh** requires wallet re-sign (daily or when trust drifts)
4. **Step-up auth triggers:**
   - Anomaly detected (burst traffic, trust band drop, suspicious IP change)
   - Trust score drops below threshold
   - Manual revocation event

**Pros:** User signs wallet once per day; seamless background refresh.  
**Cons:** Requires secure storage of root token; chain validation overhead.

---

### Phase 2: Device Attestation (Optional Opt-In)

1. **User enrolls device:** `degenvpn attest --device-name "MacBook Pro"`
2. **CLI generates device keypair** (stored in keychain/secure enclave)
3. **Wallet signs device public key** → on-chain or backend registry
4. **Device key signs session tokens** (no wallet required for refresh)
5. **Revocation:** Wallet signs device key removal message

**Pros:** Zero wallet friction after enrollment; per-device access control.  
**Cons:** Key management UX; lost device = revocation ceremony required.

---

## Trust Integration

DegenVPN **consumes trust scores** from TiltCheck identity-core (or standalone trust API).

### Trust Band → Access Policy Mapping

| Trust Band | Max Daily Bandwidth | Multi-Hop Allowed | Session Duration | Step-Up Trigger Threshold |
|------------|---------------------|-------------------|------------------|---------------------------|
| **RED**    | 500 MB              | No                | 30 min           | Any anomaly               |
| **YELLOW** | 5 GB                | No                | 2 hours          | 2 anomalies/day           |
| **GREEN**  | 50 GB               | Yes (1 hop)       | 12 hours         | 5 anomalies/day           |
| **PLATINUM** | Unlimited         | Yes (3 hops)      | 24 hours         | Manual only               |

### Trust Signals Affecting VPN Access

- **Positive signals:**
  - Consistent usage patterns (no sudden spikes)
  - Valid on-chain tipping activity (from TiltCheck)
  - Low reported abuse incidents
  - Staked SOL in AccessRegistry (future)

- **Negative signals:**
  - Sudden bandwidth bursts (potential scraping/DDoS)
  - Trust score drop from other TiltCheck modules
  - IP geolocation mismatches (if travel not declared)
  - Failed step-up verification attempts

---

## Anomaly Detection

### Phase 1: Heuristic Rules

Simple anomaly flags trigger step-up wallet re-auth:

```typescript
interface AnomalySignal {
  type: 'burst_traffic' | 'trust_drift' | 'ip_change' | 'protocol_violation';
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  metadata: {
    bandwidthMB?: number;
    trustScoreDelta?: number;
    previousIPHash?: string;
    currentIPHash?: string;
  };
}

// Example heuristic
function detectBurst(user: User, windowMinutes: number = 5): boolean {
  const recentBytes = getUserBandwidth(user.pubkey, windowMinutes);
  const avgBytes = getUserAvgBandwidth(user.pubkey, 60); // 1 hour avg
  const burstFactor = recentBytes / avgBytes;
  
  return burstFactor > 10; // 10x spike = anomaly
}
```

### Phase 2: ML-Based Sentinel

Train isolation forest or autoencoder on:
- Time-series bandwidth usage
- Connection duration patterns
- Protocol distribution (HTTPS vs torrent vs SSH)
- Trust score trajectory
- Geographic mobility features (if user opts in)

**Trigger step-up when:**
- Anomaly score > threshold (e.g., 0.85)
- Trust band drops mid-session
- Manual flag from abuse report

---

## Smart Contract Components (Solana)

### AccessRegistry

Tracks user access tiers, stake, and revocations.

```rust
pub struct AccessRecord {
    pub wallet: Pubkey,
    pub tier: u8, // 0=basic, 1=staked, 2=premium
    pub stake_amount: u64, // lamports
    pub enrolled_at: i64,
    pub revoked: bool,
    pub device_keys: Vec<Pubkey>, // Phase 2
}
```

**Instructions:**
- `enroll(wallet, stake_amount)` → create access record
- `revoke(wallet)` → disable access (admin or self)
- `add_device(wallet, device_pubkey, signature)` → Phase 2
- `remove_device(wallet, device_pubkey, signature)` → Phase 2

---

### NodeRegistry

Tracks gateway nodes, reputation, stake slashing.

```rust
pub struct GatewayNode {
    pub operator: Pubkey,
    pub endpoint: String, // e.g., "wg://gateway1.degenvpn.io:51820"
    pub stake_amount: u64,
    pub uptime_score: u8, // 0-100
    pub reputation: i16, // can go negative
    pub region: String, // "us-west", "eu-central"
    pub max_capacity_mbps: u32,
}
```

**Instructions:**
- `register_node(operator, endpoint, stake)` → add gateway
- `report_downtime(node_pubkey, timestamp)` → slash uptime
- `slash_reputation(node_pubkey, reason)` → penalize abuse
- `claim_rewards(node_pubkey)` → future incentive model

---

## Data Logging (Anomaly Training)

### Minimal Telemetry Schema

Store in append-only event log (JSON or Parquet):

```typescript
interface VPNSessionEvent {
  eventType: 'session.start' | 'session.refresh' | 'session.end' | 'anomaly.detected';
  timestamp: number; // Unix ms
  userPubkey: string; // Solana public key
  trustBand: 'RED' | 'YELLOW' | 'GREEN' | 'PLATINUM';
  ipHash: string; // SHA256(ip + salt) for privacy
  gatewayId: string; // which node served request
  bandwidthMB?: number; // only on session.end
  durationSeconds?: number;
  anomalyType?: string; // if eventType = anomaly.detected
  stepUpRequired?: boolean;
}
```

**Privacy guarantees:**
- No raw IPs stored (only hashes)
- No PII (email, name) collected
- User can request full purge via `/privacy/purge` endpoint

**Retention policy:**
- Session events: 90 days
- Anomaly signals: 180 days (training data)
- Aggregated stats: indefinite (anonymized)

---

## CLI Tool Design

### Commands

```bash
# Auth & enrollment
degenvpn auth --wallet <pubkey>
degenvpn attest --device-name "MacBook Pro"  # Phase 2
degenvpn revoke-device --device-id <id>       # Phase 2

# Connection management
degenvpn up                    # Connect to best gateway
degenvpn up --region us-west   # Specific region
degenvpn down                  # Disconnect
degenvpn status                # Show trust band, quota, session TTL

# Trust & privacy
degenvpn trust                 # Show current trust score & band
degenvpn privacy purge         # Request full data deletion
degenvpn sessions              # List active sessions (if multi-device)

# Advanced
degenvpn gateway list          # Show available gateways
degenvpn logs --tail 50        # Local connection logs
```

### Config File (`~/.degenvpn/config.toml`)

```toml
[auth]
wallet_pubkey = "8xT9..."
session_token_path = "~/.degenvpn/session.jwt"
root_capability_path = "~/.degenvpn/root_cap.jwt"  # Phase 1

[device]  # Phase 2
device_id = "macbook-pro-2024"
device_key_path = "~/.degenvpn/device.key"

[gateway]
preferred_region = "us-west"
auto_reconnect = true
fallback_gateways = ["gateway2.degenvpn.io", "gateway3.degenvpn.io"]

[privacy]
ip_hashing_enabled = true
telemetry_opt_out = false  # Anomaly training data
```

---

## Phased Roadmap

### Phase 0: Wallet-Only MVP (2-4 weeks)
- [ ] CLI tool: auth, up, down, status
- [ ] Single WireGuard gateway node (DigitalOcean/Hetzner)
- [ ] Backend: session token issuer (Ed25519 signing)
- [ ] Trust score lookup (integrate TiltCheck identity-core API)
- [ ] Basic policy enforcement (trust band → bandwidth cap)
- [ ] Health/metrics endpoint on gateway

**Deliverable:** Users can connect via wallet signature, trust band determines quota.

---

### Phase 1: Capability Tokens & Heuristic Anomaly (4-6 weeks)
- [ ] Root + chained capability token implementation
- [ ] Auto-refresh logic in CLI (background daemon)
- [ ] Heuristic anomaly detection (burst_traffic, trust_drift, ip_change)
- [ ] Step-up wallet re-auth flow
- [ ] Event logging (session events → JSON/Parquet)
- [ ] Multi-gateway support (load balancing)

**Deliverable:** Daily wallet signing; anomalies trigger step-up; multiple gateways.

---

### Phase 2: Device Attestation & On-Chain Registry (8-12 weeks)
- [ ] Device keypair generation & secure storage (keychain/enclave)
- [ ] Wallet-signed device enrollment
- [ ] AccessRegistry smart contract (Solana)
- [ ] On-chain device key registry
- [ ] CLI device management (attest, revoke)
- [ ] NodeRegistry smart contract (gateway staking)
- [ ] Gateway reputation/slashing logic

**Deliverable:** Zero wallet friction after device enrollment; on-chain access control.

---

### Phase 3: ML Anomaly Sentinel & Advanced Features (12+ weeks)
- [ ] Feature engineering pipeline (bandwidth time-series, protocol distribution)
- [ ] Isolation forest or autoencoder training
- [ ] Real-time anomaly scoring endpoint
- [ ] Multi-hop routing (trust band gating)
- [ ] Usage proofs (Merkle tree aggregation)
- [ ] Settlement contract (gateway rewards)
- [ ] Privacy-preserving analytics dashboard

**Deliverable:** ML-powered anomaly detection; multi-hop; gateway incentive model.

---

## Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **CLI** | TypeScript (Node.js) / Rust | Reuse TiltCheck signing patterns; Rust for performance-critical path |
| **Gateway** | WireGuard + Node.js control plane | Industry-standard VPN; scriptable policy enforcement |
| **Backend** | Node.js (Express) + PostgreSQL | Fast iteration; existing TiltCheck stack compatibility |
| **Smart Contracts** | Anchor (Solana) | Non-custodial access registry; composable with Solana ecosystem |
| **Anomaly Detection** | Python (scikit-learn / PyTorch) | Rich ML libraries; isolated microservice |
| **Event Storage** | Parquet (S3/R2) or ClickHouse | Efficient time-series; cheap cloud storage |
| **Monitoring** | Prometheus + Grafana | Gateway health, bandwidth, session metrics |

---

## Security Considerations

### Threat Model

| Threat | Mitigation |
|--------|------------|
| **Session token theft** | Short TTL (1 hour); IP hash binding (optional); step-up on anomaly |
| **Replay attack** | Nonce in challenge; timestamp validation; token revocation list |
| **Sybil attack (free quota farming)** | Trust score gating; on-chain stake requirement (Phase 2) |
| **Gateway operator abuse** | Reputation slashing; multi-gateway fallback; user reports |
| **Privacy leak (IP logging)** | Hash IPs with salt; no PII; user-controlled purge |
| **DDoS on gateway** | Rate limiting per trust band; Cloudflare proxy; adaptive quotas |

### Cryptographic Primitives

- **Wallet signatures:** Ed25519 (Solana standard)
- **Session tokens:** JWT with Ed25519 signature (reuse TiltCheck session.ts pattern)
- **Capability tokens:** HMAC-SHA256 or hash-chained Ed25519 mini-signatures
- **IP hashing:** SHA256(ip + per-user-salt)
- **Device keys:** Ed25519 keypair (Phase 2)

---

## Future Extensions

### Multi-Hop Onion Routing
- Trust band PLATINUM allows routing through 3 gateways (entry → relay → exit)
- Each hop receives encrypted next-hop instruction
- Final exit node doesn't know original user (privacy++)

### Bandwidth Marketplace
- Users stake SOL to "buy" excess bandwidth from PLATINUM users
- Smart contract escrow + usage proof settlement
- Incentivizes high-trust users to share quota

### DAO Governance
- Gateway operators vote on:
  - Trust band policy changes
  - Slashing thresholds
  - New region deployments
- Weighted by stake + reputation score

### Cross-Chain Trust Interop
- Bridge TiltCheck trust scores to other chains (EVM, Cosmos)
- Unified identity layer for multi-chain degens
- Attestation NFTs (Solana NFT representing trust band)

---

## Open Questions

1. **Gateway incentive model:** Fixed fee per GB? Subscription? Stake rewards?
2. **Trust score cold-start problem:** How do new users with no TiltCheck history get access?
3. **Legal jurisdictions:** Which countries to avoid for gateway nodes?
4. **Mobile support:** iOS/Android VPN profiles; keychain integration complexity?
5. **Backup gateway strategy:** Auto-failover vs manual selection vs round-robin?

---

## References & Prior Art

- **Orchid VPN:** Probabilistic nanopayments on Ethereum; complex UX
- **Mysterium Network:** Decentralized VPN; token economics heavy
- **WireGuard:** Modern VPN protocol; fast, simple, auditable
- **Solana SPL Token Gating:** Proven pattern for access control
- **TiltCheck Trust Engine:** Foundation for identity/scoring layer

---

## Contact & Contributions

**Project Lead:** jmenichole  
**Status:** Design phase; separate repo to be created  
**License:** TBD (likely MIT or Apache 2.0)  

When ready to implement, create new repo: `jmenichole/degenvpn`

---

**End of Design Document**
