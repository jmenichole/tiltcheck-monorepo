# QualifyFirst Module (Phase 1)

Deterministic survey pre-screening & routing heuristics for TiltCheck.

## Goals
- Predict likelihood a user completes a survey BEFORE redirect.
- Reduce screen-outs & wasted clicks.
- Provide transparent reasons and risk flags (non-custodial, no suppression of legitimate exclusion criteria).

## Non-Goals
- Bypassing legitimate compliance checks.
- Guaranteeing completion or payout.
- Storing sensitive user PII (keep profiles minimal).

## API (Internal Functions)
```ts
attachPublisher(p: EventPublisher)
publishRouteResult(route: RouteResult)
publishMatch(result: MatchProbability)
```

- Runtime-adjustable weights (see `setWeights`, `overrideWeights`)
- Detailed breakdown available via `predictSurveyMatch(user, survey, true)`
## Types
```ts
interface UserProfile { id: string; country?: string; age?: number; tags?: string[]; hoursActiveLast7d?: number; completionRate?: number; }
import { predictSurveyMatch, routeSurveys, attachPublisher, setWeights, getWeights } from '@tiltcheck/qualifyfirst';
interface MatchProbability { surveyId: string; userId: string; probability: number; score: number; reasons: string[]; riskFlags: string[]; }
interface RouteResult { userId: string; generatedAt: number; matches: MatchProbability[]; }
```

## Event Model
// Optional detailed breakdown
const match = predictSurveyMatch(userProfile, surveyMeta, true);
console.log(match.breakdown);
// Events are tagged with a monotonic `weightVersion` for experiment analysis.
// Publish payloads:
// survey.match.predicted => { weightVersion, ts, match }
// survey.route.generated => { weightVersion, ts, route }

## Heuristic Weighting (Initial)
| Factor | Weight | Notes |
// Adjust weights at runtime (e.g., after monitoring performance)
setWeights({ minScoreThreshold: 25 });
console.log('Active weights:', getWeights());
|--------|--------|-------|
| Country match | 20 | +full if match/unspecified |
| Age range | 10 | + if within range |
| Required tags | 30 | proportional coverage |
| Completion rate | 25 | scaled by % |
| Engagement (hours last 7d) | 15 | capped at 20h |
| Screen-out penalty | 35 | multiplicative reduction |

## Expansion Ideas (Phase 2+)
- Adaptive weights based on historical accuracy.
- Integrate trust signals (consistency, false report rate).
- Survey clustering to suggest alternates when top choice fails.

## Anti-Abuse Safeguards
- All reasons and risk flags exposed (no silent filtering).
- High screen-out flagged, not hidden.
- No attempts to spoof required qualifications; low coverage flagged.

## Usage Example
```ts
import { predictSurveyMatch, routeSurveys, getMetrics, getRollingMetrics, currentWeightVersion } from '@tiltcheck/qualifyfirst';
const user = { id: 'u1', country: 'US', age: 29, tags: ['crypto','gaming'], completionRate: 72, hoursActiveLast7d: 8 };
const surveys = [ { id: 's1', country: 'US', requiredTags: ['gaming'], screenOutRate: 0.4 }, { id: 's2', requiredTags: ['finance'], screenOutRate: 0.7 } ];
const route = routeSurveys(user, surveys);
console.log(route.matches);
console.log('Weight version', currentWeightVersion());
console.log('Aggregate metrics', getMetrics());
console.log('Rolling window metrics', getRollingMetrics());
```

## Build
```bash
pnpm --filter @tiltcheck/qualifyfirst build
```

## Status
Phase 1 heuristic engine scaffolded. Not yet wired into an external service. Ready for integration & test harness.
