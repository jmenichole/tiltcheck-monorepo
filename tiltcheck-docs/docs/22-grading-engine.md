# 22 - Casino Grading Engine Spec

Status: Draft
Date: 2025-11-20

## Purpose
Unify TiltCheck's quantitative anomaly metrics (scripted heuristics) with qualitative category scoring (narrative fairness evaluation) into a neutral, reproducible grading system. The engine produces: (1) per-category scores, (2) underlying metric values, (3) composite trust grade, and (4) transparent rationale text. All outputs are advisory, never accusatory.

## Fairness Categories (5)
| Category | Intent | Data Inputs | Primary Metrics | Notes |
|----------|--------|------------|-----------------|-------|
| RNG Integrity | Verify randomness not tampered post-generation | Published server/client seed, nonce, hash algorithm | hash recomputation pass rate, seed rotation regularity | Typically high for provably-fair sites; score only drops if verifications fail or rotations are opaque. |
| RTP Transparency | Detect undisclosed RTP version or drift | Large-sample outcome returns, published paytable, session EV trajectory | rtpDriftScore, distributionChi, variantPlateauSeparation | Penalize absence of per-session RTP disclosure; reward explicit RTP version metadata. |
| Volatility Consistency | Stability of variance vs stated game profile | Spin netWin series, feature trigger intervals, symbol frequencies | volatilityShift, bonusLatency, featureIntervalVariance | High shifts post-big-win lower score; excessive drought clustering flagged. |
| Session-Level Behavior | Potential behavioral tuning (timing, segmentation) | Time-of-day payout curve, streak clustering, post-bonus slope, seed boundary correlations | seedRotationCorrelation, streakClusterZ, postBonusSlopeScore | Focus on exploitative patterns without alleging rigging; uses anomaly confidence bands. |
| Transparency & Ethics | External disclosure & audit posture | Regulator data, audit reports, version metadata, public commitments | disclosureCompletenessIndex, auditPresenceFlag, policyClarityScore | Heavily qualitative; enumerated checklist converted to score. |

## Metric Mapping
Existing script metrics integrate as:
| Script Metric | Category | Description | Scaling (0–1 anomaly) |
|---------------|----------|-------------|-----------------------|
| payoutDrift | RTP Transparency | Frequency divergence vs baseline paytable | chi-normalized (already scaled) |
| volatilityShift | Volatility Consistency | Variance regime change magnitude | min(1, Δvar / maxVar) |
| seedRotationCorrelation | Session-Level Behavior | Alignment of rotation epochs with payout shifts | heuristic correlation dampened /5 |
| bonusLatency | Volatility Consistency | Bonus interval slower than expected | ratio penalty (only >1) |

New metrics to add:
| Proposed Metric | Category | Method |
|-----------------|----------|--------|
| rtpDriftScore | RTP Transparency | Rolling EV vs theoretical RTP; absolute deviation mean normalized |
| distributionChi | RTP Transparency | Full symbol chi-square p-value → anomaly = 1 - p |
| variantPlateauSeparation | RTP Transparency | Cluster session EV plateaus; inter-centroid distance normalized |
| featureIntervalVariance | Volatility Consistency | Variance of intervals between feature triggers vs Poisson expectation |
| streakClusterZ | Session-Level Behavior | Identify losing/winning streak clusters; z-score of run length vs expected |
| postBonusSlopeScore | Session-Level Behavior | Linear regression slope on netWin after bonus; penalize sustained negative slope |
| disclosureCompletenessIndex | Transparency & Ethics | Fraction of checklist items satisfied |
| auditPresenceFlag | Transparency & Ethics | 0 or 1 (3rd party audit present); weight converts to partial score |
| policyClarityScore | Transparency & Ethics | NLP clarity scoring of fairness disclosures (readability + specificity) |

## Data Ingestion Layers
1. Raw Spin Stream: `{ ts, netWin, symbols:{freq map}, featureTriggered:boolean }`
2. Declared Metadata: paytable, stated RTP (if any), volatility descriptor.
3. Rotations: `{ ts }` boundaries.
4. Bonus Events: `{ ts, type }` markers.
5. Public Disclosures: structured extraction of fairness policy docs.
6. External Registries: regulator / audit presence.

## Scoring Pipeline
1. Normalize raw data (time-sort, prune malformed spins).  
2. Compute base quantitative metrics (current script + new additions).  
3. Derive category score = 100 - Σ(weight_i * anomaly_i) - disclosure penalties.  
4. Apply confidence attenuation: if sample size below threshold for a metric, reduce its effective weight proportionally.  
5. Compose narrative rationale template pulling top 2 anomaly drivers per category.  
6. Output JSON & human-readable summary.

## Weighting (Initial Draft)
| Category | Base Weight in Composite | Internal Metric Weights (sum) |
|----------|--------------------------|-------------------------------|
| RNG Integrity | 15 | hashVerification (10), rotationRegularity (5) |
| RTP Transparency | 25 | payoutDrift (8), rtpDriftScore (8), variantPlateauSeparation (5), distributionChi (4) |
| Volatility Consistency | 20 | volatilityShift (8), bonusLatency (6), featureIntervalVariance (6) |
| Session-Level Behavior | 20 | seedRotationCorrelation (6), streakClusterZ (7), postBonusSlopeScore (7) |
| Transparency & Ethics | 20 | disclosureCompletenessIndex (10), auditPresenceFlag (5), policyClarityScore (5) |

Composite Score = Σ(categoryScore * (categoryBaseWeight/100)). Round to nearest integer.

Category Score Calculation Example:
```
categoryScore = 100 - Σ(metricWeight_i * anomaly_i) - penaltyDisclosure
// anomaly_i ∈ [0,1]
// penaltyDisclosure applies only in RTP Transparency & Transparency & Ethics when missing mandatory items
```

## Confidence & Sample Size Handling
| Metric | Minimum Sample | Degradation Rule |
|--------|----------------|------------------|
| payoutDrift | 5,000 symbol counts | weight *= sqrt(n / min) capped at 1 |
| volatilityShift | 300 spins | same scaling |
| bonusLatency | ≥3 bonus events | else weight=0 |
| streakClusterZ | 500 spins | scaling |
| variantPlateauSeparation | ≥3 clusters detected | else weight=0 |

## JSON Output Shape
```json
{
  "casino": "stake.us",
  "categories": {
    "rngIntegrity": { "score": 95, "metrics": { "hashVerification": 0, "rotationRegularity": 0.3 }, "rationale": ["Regular rotations disclosed", "Minor irregular interval"] },
    "rtpTransparency": { "score": 62, "metrics": { "payoutDrift": 0.41, "rtpDriftScore": 0.28, "distributionChi": 0.35 }, "rationale": ["Observed RTP plateau deviations", "No per-session RTP version tag"] },
    "volatilityConsistency": { "score": 58, "metrics": { "volatilityShift": 0.52, "bonusLatency": 0.19 }, "rationale": ["Variance spike after large bonus", "Slower-than-expected bonus intervals"] },
    "sessionBehavior": { "score": 55, "metrics": { "seedRotationCorrelation": 0.33, "streakClusterZ": 0.44 }, "rationale": ["Rotation boundary correlates with payout dip", "Extended loss streak cluster"] },
    "transparencyEthics": { "score": 40, "metrics": { "disclosureCompletenessIndex": 0.65, "auditPresenceFlag": 1 }, "rationale": ["No external audit report", "Missing RTP version publication"] }
  },
  "compositeScore": 62,
  "disclaimer": "Advisory, data-driven anomaly-based grading. High anomaly values indicate statistical deviations requiring cautious interpretation, not definitive misconduct.",
  "version": "0.1.0"
}
```

## Rationale Generation Template
For each category pick top 2 metrics by (anomaly * weight). Sentence fragments:
| Metric | Fragment Example |
|--------|------------------|
| payoutDrift | "Outcome distribution diverges from listed paytable over sample." |
| volatilityShift | "Net variance spikes after large win beyond stable range." |
| seedRotationCorrelation | "Payout pattern shifts near seed rotation boundaries." |
| bonusLatency | "Bonus intervals slower than expected baseline model." |
| rtpDriftScore | "Observed RTP average below theoretical variant range." |

## Narrative Output (Stake Example)
```
Strong provably-fair RNG (A). Transparency gaps around RTP versions produce measurable drift plateaus. Volatility behavior shows post-bonus downturn and variance spikes. Session patterns (loss streak clustering, rotation-aligned dips) raise behavioral tuning concerns. Limited disclosure/audit leaves ethics score low. Composite fairness experience: 6.2/10 (high RNG integrity, weak RTP transparency).
```

## Implementation Plan
1. Extend existing `grade-casino.js` into `grading-engine.ts` (TypeScript) with modular metric calculators.  
2. Add data validator ensuring minimum sample warnings.  
3. Introduce disclosure checklist loader (JSON config per casino).  
4. Implement rationale selection + template rendering.  
5. Add CLI flags: `--format json|text`, `--min-sample-warn`, `--explain`.  
6. Version outputs and keep deterministic ordering.  

## Open Questions
- How to source public disclosure metadata reliably (manual ingestion vs scraping)?
- Should weights be player-adjustable (e.g., emphasize volatility)?
- Do we snapshot paytable baselines or fetch dynamically via provider APIs? 

## Non-Accusatory Safeguards
- All anomaly scores carry confidence annotation.
- Narratives avoid words: "rigged", "cheating"; prefer "deviation", "variance spike", "transparency gap".
- Hard cap on composite penalty from any single category to prevent over-weighting one noisy metric.

## Next Steps
- Implement new metrics (rtpDriftScore, streakClusterZ).  
- Refactor script with category scoring.  
- Add tests using synthetic controlled datasets (known RTP variant toggles, seeded volatility regime shifts).  

---
Update this document as new metrics (rotation correlation refinement, policy clarity NLP) ship.
