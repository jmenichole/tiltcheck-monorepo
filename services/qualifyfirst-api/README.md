# QualifyFirst API Service

Thin Express wrapper exposing QualifyFirst heuristic engine via HTTP.

## Endpoints

- `GET /health` – Service status.
- `GET /qualifyfirst/weights` – Current scoring weights + `weightVersion` + `experimentLabel`.
- `PATCH /qualifyfirst/weights` – Override weights (partial JSON body). Response includes updated `weightVersion` and optional `experimentLabel`.
  Example body:
```json
{ "country": 22, "minScoreThreshold": 28, "experimentLabel": "variant-A" }
```
- `POST /qualifyfirst/match` – Predict single survey match (optional `breakdown`). Emits `survey.match.predicted` event with `{ weightVersion, ts, match }`.
  Body example:
```json
{
  "user": { "id": "u1", "age": 34, "country": "US", "tags": ["engaged"], "completionRate": 82, "hoursActiveLast7d": 7 },
  "survey": { "id": "s123", "requiredTags": ["engaged"], "minAge": 18, "maxAge": 65 },
  "breakdown": true
}
```
- `POST /qualifyfirst/route` – Rank / filter multiple surveys; emits `survey.route.generated` with `{ weightVersion, ts, route }`.
  Body example:
```json
{
  "user": { "id": "u1", "age": 34, "country": "US", "tags": ["engaged"], "completionRate": 82, "hoursActiveLast7d": 7 },
  "surveys": [
    { "id": "sA", "requiredTags": ["engaged"], "minAge": 18, "maxAge": 65 },
    { "id": "sB", "requiredTags": [], "minAge": 21, "maxAge": 70 }
  ],
  "minScoreThreshold": 28
}
```
- `GET /qualifyfirst/metrics` – Aggregate + rolling window metrics.
- `GET /qualifyfirst/metrics/window?size=N` – Custom rolling window metrics (size 1-1000).
- `POST /qualifyfirst/metrics/reset` – Clear all accumulators & rolling window (use for benchmarking segments).

## Dev

```bash
pnpm --filter @tiltcheck/qualifyfirst-api dev
```

## Build & Start

```bash
pnpm --filter @tiltcheck/qualifyfirst-api build
pnpm --filter @tiltcheck/qualifyfirst-api start
```

## Notes
- Relies on `@tiltcheck/qualifyfirst` engine; keep engine weights / logic isolated there.
- Keep this service stateless; persistent tuning done upstream via config system / events.
