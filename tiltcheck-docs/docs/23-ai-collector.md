# 23 - AI-Powered Casino Data Collector

Status: Draft  
Date: 2025-11-20

## Purpose
Automate the continuous collection of publicly available casino data using AI agents (via Vercel AI SDK, OpenAI Agents, or similar) to feed the grading engine. The collector extracts fairness disclosures, provably-fair verification data, player review sentiment, regulatory status, and operational patterns from public sources without requiring manual data entry.

## Key Challenges
| Challenge | AI Solution |
|-----------|-------------|
| Casino websites vary wildly in structure | LLM-based web scraping with natural language instructions ("Find the RTP disclosure section") |
| Fairness policies buried in ToS | Document parsing + semantic extraction (RAG-style retrieval + summarization) |
| No standardized disclosure format | Schema-guided extraction prompts (force JSON output with required fields) |
| Provably-fair verification requires computation | Hybrid: LLM identifies seed locations, deterministic code verifies hashes |
| Player review sentiment across platforms (Reddit, Trustpilot, forums) | Multi-source scraping + sentiment analysis aggregation |
| Bonus event detection from on-chain or public API | Event log parsing with anomaly detection |
| Rate limiting / anti-bot measures | Respectful scraping intervals, user-agent rotation, optional headless browser fallback |

## Architecture

### Components
```
┌─────────────────────────────────────────────────────────┐
│ AI Collector Service (Node.js + AI SDK)                 │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐             │
│  │ Target Registry │  │ Scraping Prompts │             │
│  │ (casinos.json)  │  │ (templates)      │             │
│  └────────┬────────┘  └────────┬─────────┘             │
│           │                     │                        │
│  ┌────────▼─────────────────────▼────────┐              │
│  │    Agent Orchestrator                 │              │
│  │  (Vercel AI SDK / LangChain)          │              │
│  └────────┬──────────────────────────────┘              │
│           │                                              │
│  ┌────────▼──────────────────────────────┐              │
│  │  Extraction Tasks (parallel)          │              │
│  ├───────────────────────────────────────┤              │
│  │ • Disclosure Scraper (fairness page)  │              │
│  │ • Hash Verifier (seed checker)        │              │
│  │ • Review Sentiment (Reddit, TP)       │              │
│  │ • Regulator Lookup (license APIs)     │              │
│  │ • RTP Variant Detector (game metadata)│              │
│  └────────┬──────────────────────────────┘              │
│           │                                              │
│  ┌────────▼──────────────────────────────┐              │
│  │  Data Normalizer & Validator          │              │
│  └────────┬──────────────────────────────┘              │
│           │                                              │
│  ┌────────▼──────────────────────────────┐              │
│  │  Grading Engine Integration           │              │
│  │  (feed CasinoData JSON)               │              │
│  └────────┬──────────────────────────────┘              │
│           │                                              │
│  ┌────────▼──────────────────────────────┐              │
│  │  Event Router: trust.casino.updated   │              │
│  └───────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────┘
```

### Execution Flow
1. **Scheduler** triggers collection job (cron: daily 2AM UTC).
2. **Target Registry** loads casino list with URLs (`stake.us`, `rollbit.com`, etc.).
3. **Agent Orchestrator** spawns parallel extraction tasks per casino.
4. Each task uses LLM-powered scraping:
   - **Disclosure Scraper**: Fetches fairness page HTML → LLM extracts structured JSON.
   - **Hash Verifier**: Finds seed history API or page → deterministic verification.
   - **Sentiment Analyzer**: Searches Reddit/Trustpilot → aggregates sentiment score.
   - **Regulator Lookup**: Queries known license registries (Curacao, Malta, UK).
5. **Normalizer** validates extracted data against `CasinoData` schema (from grading engine).
6. **Grading Engine** runs scoring → emits `trust.casino.updated` event.
7. **Persistence**: Store raw extractions + scores in `data/casino-snapshots/{casino}/{date}.json`.

## AI Agent Implementation (Vercel AI SDK)

### Tools Setup
```typescript
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const DisclosureSchema = z.object({
  rtpVersionPublished: z.boolean(),
  auditReportPresent: z.boolean(),
  fairnessPolicyURL: z.string().optional(),
  regulatorLicense: z.string().optional(),
  rtpRange: z.string().optional(),
});

async function extractDisclosures(casinoURL: string) {
  const html = await fetchPage(`${casinoURL}/fairness`);
  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: DisclosureSchema,
    prompt: `Extract fairness disclosure information from this casino webpage HTML. Look for:
    - RTP version numbers or ranges mentioned
    - Links to external audit reports (e.g., eCOGRA, iTech Labs)
    - License information (Curacao, Malta, UK Gambling Commission)
    - Provably fair explanations
    
    HTML:
    ${html.slice(0, 50000)}
    
    Return structured JSON matching the schema.`,
  });
  return object;
}
```

### Sentiment Analysis
```typescript
const SentimentSchema = z.object({
  overallScore: z.number().min(-1).max(1), // -1 very negative, +1 very positive
  sampleSize: z.number(),
  topComplaints: z.array(z.string()).max(3),
});

async function analyzeSentiment(casinoName: string) {
  const redditPosts = await searchReddit(`${casinoName} casino scam OR fair OR rigged`, limit: 50);
  const trustpilotReviews = await fetchTrustpilot(casinoName);
  
  const combined = [...redditPosts, ...trustpilotReviews].join('\n---\n');
  
  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: SentimentSchema,
    prompt: `Analyze player sentiment about ${casinoName} from these reviews and forum posts. Focus on fairness concerns (RTP, rigging accusations, withdrawal issues). Summarize overall sentiment score and top 3 complaint themes.\n\nContent:\n${combined.slice(0, 100000)}`,
  });
  return object;
}
```

### Hash Verification (Hybrid)
```typescript
async function verifyHashes(casinoURL: string): Promise<HashVerificationResult[]> {
  // Step 1: LLM finds seed verification endpoint or page
  const html = await fetchPage(`${casinoURL}/provably-fair`);
  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: z.object({
      seedHistoryURL: z.string().optional(),
      verificationMethod: z.string(),
    }),
    prompt: `Find the provably fair seed verification location on this page. Return the API endpoint or page URL where seed history is published, and describe the verification method.\n\nHTML:\n${html.slice(0, 30000)}`,
  });
  
  if (!object.seedHistoryURL) return [];
  
  // Step 2: Deterministic verification (fetch seeds, recompute hashes)
  const seeds = await fetchJSON(object.seedHistoryURL);
  const results: HashVerificationResult[] = [];
  for (const seed of seeds.slice(0, 10)) { // verify last 10
    const expectedHash = crypto.createHash('sha256').update(seed.serverSeed).digest('hex');
    const verified = expectedHash === seed.hash;
    results.push({ verified, ts: seed.timestamp });
  }
  return results;
}
```

## Target Registry Schema
```json
{
  "casinos": [
    {
      "id": "stake-us",
      "name": "Stake.us",
      "baseURL": "https://stake.us",
      "endpoints": {
        "fairness": "/fairness",
        "provablyFair": "/provably-fair",
        "games": "/api/games"
      },
      "platforms": {
        "reddit": "r/Stake",
        "trustpilot": "stake.us"
      },
      "regulator": "Curacao",
      "enabled": true,
      "lastCollected": "2025-11-19T02:00:00Z"
    }
  ]
}
```

## Scheduling & Persistence

### Cron Job (weekly collection - every Sunday 2 AM UTC))
```typescript
import cron from 'node-cron';

cron.schedule('0 2 * * 0', async () => {
  console.log('[AI Collector] Starting weekly casino data collection...');
  const registry = loadRegistry('data/casinos.json');
  for (const casino of registry.casinos.filter(c => c.enabled)) {
    try {
      const data = await collectCasinoData(casino);
      const grade = gradeEngine(data);
      await persistSnapshot(casino.id, data, grade);
      await eventRouter.publish('trust.casino.updated', 'ai-collector', {
        casinoId: casino.id,
        score: grade.compositeScore,
        categories: grade.categories,
      });
    } catch (err) {
      console.error(`[AI Collector] Failed for ${casino.id}:`, err);
    }
  }
});
```

### Snapshot Storage
```
data/
  casino-snapshots/
    stake-us/
      2025-11-20.json
      2025-11-19.json
    rollbit/
      2025-11-20.json
```

## Cost Management
| Provider | Model | Cost (per collection) | Notes |
|----------|-------|----------------------|-------|
| OpenAI | gpt-4o | ~$0.15 per casino | Disclosure + sentiment extraction |
| OpenAI | gpt-4o-mini | ~$0.02 per casino | Hash endpoint discovery |
| Vercel AI SDK | Built-in caching | Reduces repeat extractions | Cache HTML fetches 24h |
| Headless browser (Playwright) | Free (self-hosted) | Fallback for JS-heavy sites | Only when needed |

**Weekly cost estimate (10 casinos)**: ~$1.70/week = ~$7.40/month.

## Rate Limiting & Ethics
- Respect `robots.txt` (skip disallowed paths).
- User-Agent: `TiltCheckBot/0.1 (+https://tiltcheck.it/bot)`.
- Max 1 request per 5 seconds per domain.
- Cache fetched pages 24h (avoid redundant hits).
- Provide opt-out mechanism (casinos can request removal from registry).

## Data Quality Safeguards
| Issue | Mitigation |
|-------|-----------|
| LLM hallucination | Schema validation (zod); flag low-confidence extractions |
| Stale data | Timestamp all extractions; compare delta vs prior snapshot |
| Missing disclosures | Default to "not found" = penalty in transparency score |
| API changes breaking scraper | Fallback to manual review queue; alert on persistent failures |

## Integration with Grading Engine
```typescript
async function collectAndGrade(casino: CasinoRegistryEntry): Promise<GradingOutput> {
  const disclosures = await extractDisclosures(casino.baseURL);
  const hashVerifications = await verifyHashes(casino.baseURL);
  const sentiment = await analyzeSentiment(casino.name);
  
  // Mock spin data (replace with on-chain or API ingestion later)
  const spins = await fetchRecentSpins(casino); // placeholder
  
  const casinoData: CasinoData = {
    casino: casino.id,
    spins,
    disclosures,
    hashVerifications,
    paytableBaseline: {}, // extract from game metadata if available
    expectedBonusPerSpins: 100, // placeholder
  };
  
  const grade = gradeEngine(casinoData);
  return grade;
}
```

## Roadmap Enhancements
1. **On-chain event ingestion**: Monitor Solana programs for casino tx patterns (bonus emissions, large payouts).
2. **Player-submitted data**: Allow users to upload spin logs via Discord (`/submit-spins <casino> <file>`).
3. **Real-time alerts**: If composite score drops >10 pts in 24h, emit `trust.casino.alert` event.
4. **Multi-agent coordination**: Separate agents for scraping, verification, sentiment; orchestrator manages workflow.
5. **Audit trail**: Store LLM prompts + responses for transparency (debug hallucinations).

## Example Output (Weekly Snapshot)
```json
{
  "casinoId": "stake-us",
  "collectedAt": "2025-11-20T02:00:00Z",
  "sources": {
    "disclosures": { "url": "https://stake.us/fairness", "extractedAt": "2025-11-20T02:01:34Z" },
    "hashVerifications": { "count": 10, "allPassed": true },
    "sentiment": { "redditPosts": 45, "trustpilotReviews": 120, "overallScore": -0.15 }
  },
  "grading": {
    "compositeScore": 62,
    "categories": { "rngIntegrity": 95, "rtpTransparency": 58, "volatilityConsistency": 60, "sessionBehavior": 55, "transparencyEthics": 40 }
  }
}
```

## Open Questions
- Use Vercel AI SDK vs LangChain vs raw OpenAI API?  
  → **Recommendation**: Vercel AI SDK for structured extraction (zod schemas), LangChain if complex multi-step workflows needed.
- How to handle paywalled or login-required data?  
  → Exclude for MVP; future: optional authenticated scraping with user-provided credentials (risky).
- Should sentiment analysis weight into composite score?  
  → Yes, as modifier to Transparency & Ethics category (+/- 5 pts based on extreme sentiment).

## Non-Custodial Data Principle
- Collector NEVER accesses player accounts or private data.
- Only public disclosures, on-chain events, and aggregated reviews.
- No PII collection; sentiment analysis is casino-level aggregate only.

---
Update this document as AI collector service ships and integrates with trust-rollup scheduler.
