/**
 * CollectClock Registry
 * Maintains per-casino trust score aggregates sourced from gameplay analyzer events.
 * MVP implementation: in-memory with periodic JSON persistence under data/collect-clock/registry.json
 */
import fs from 'fs/promises';
import path from 'path';

export interface CasinoTrustMetrics {
  casinoId: string;
  firstSeen: number;
  lastUpdated: number;
  updateCount: number;
  latestTrustScore: number | null;
  avgTrustScore: number | null;
  alerts: number;
  criticalAlerts: number;
  lastSnapshot?: {
    ts: number;
    trustScore: number | null;
    grading?: any; // raw grading metadata for rationale display
  };
}

interface RegistryState {
  casinos: Record<string, CasinoTrustMetrics>;
  pendingAddRequests: Array<{ casinoId: string; requestedBy: string; ts: number; count: number; provisionalSessions: number }>; // user-submitted additions accumulation + provisional usage
  archived: Record<string, CasinoTrustMetrics>; // archived (pruned) casinos
}

const REGISTRY_PATH = path.resolve('../../data/collect-clock/registry.json');
let state: RegistryState = { casinos: {}, pendingAddRequests: [], archived: {} };
// Rate limiting for requests (per user)
const REQ_LIMIT = parseInt(process.env.COLLECT_CLOCK_REQUEST_LIMIT || '5');
const REQ_WINDOW_MS = parseInt(process.env.COLLECT_CLOCK_REQUEST_WINDOW_MS || (60 * 60 * 1000).toString());
const requestRate = new Map<string, { count: number; windowStart: number }>();

function canRequest(userId: string) {
  const now = Date.now();
  const entry = requestRate.get(userId);
  if (!entry) { requestRate.set(userId, { count: 1, windowStart: now }); return { ok: true }; }
  if (now - entry.windowStart > REQ_WINDOW_MS) { requestRate.set(userId, { count: 1, windowStart: now }); return { ok: true }; }
  if (entry.count >= REQ_LIMIT) return { ok: false, retryIn: (entry.windowStart + REQ_WINDOW_MS) - now };
  entry.count++;
  return { ok: true };
}
let dirty = false;

async function ensureLoaded() {
  try {
    const raw = await fs.readFile(REGISTRY_PATH, 'utf-8');
    state = JSON.parse(raw);
  } catch (_) {
    // create directory if needed
    await fs.mkdir(path.dirname(REGISTRY_PATH), { recursive: true });
    await persist();
  }
}

export async function initCollectClock() {
  await ensureLoaded();
  // periodic flush every 30s
  setInterval(() => { if (dirty) void persist(); }, 30_000).unref();
}

async function persist() {
  try {
    await fs.writeFile(REGISTRY_PATH, JSON.stringify(state, null, 2));
    dirty = false;
  } catch (e) {
    console.error('[CollectClock] Persist error', (e as any).message);
  }
}

export function ingestTrustUpdate(casinoId: string, trustScore?: number, grading?: any) {
  const now = Date.now();
  let entry = state.casinos[casinoId];
  if (!entry) {
    entry = {
      casinoId,
      firstSeen: now,
      lastUpdated: now,
      updateCount: 0,
      latestTrustScore: null,
      avgTrustScore: null,
      alerts: 0,
      criticalAlerts: 0,
      lastSnapshot: undefined
    };
    state.casinos[casinoId] = entry;
  }
  entry.updateCount++;
  entry.lastUpdated = now;
  if (typeof trustScore === 'number') {
    entry.latestTrustScore = trustScore;
    if (entry.avgTrustScore === null) entry.avgTrustScore = trustScore;
    else entry.avgTrustScore = (entry.avgTrustScore * (entry.updateCount - 1) + trustScore) / entry.updateCount;
    entry.lastSnapshot = { ts: now, trustScore, grading };
  }
  dirty = true;
}

export function ingestAlert(casinoId: string, severity: string) {
  const now = Date.now();
  let entry = state.casinos[casinoId];
  if (!entry) {
    entry = {
      casinoId,
      firstSeen: now,
      lastUpdated: now,
      updateCount: 0,
      latestTrustScore: null,
      avgTrustScore: null,
      alerts: 0,
      criticalAlerts: 0,
      lastSnapshot: undefined
    };
    state.casinos[casinoId] = entry;
  }
  entry.alerts++;
  if (severity === 'critical') entry.criticalAlerts++;
  entry.lastUpdated = now;
  dirty = true;
}

export function getCasinoMetrics(casinoId: string): CasinoTrustMetrics | null {
  return state.casinos[casinoId] || null;
}

export function listCasinos(limit = 25): CasinoTrustMetrics[] {
  return Object.values(state.casinos)
    .sort((a,b) => (b.latestTrustScore ?? -1) - (a.latestTrustScore ?? -1))
    .slice(0, limit);
}

export function requestAddition(casinoId: string, userId: string) {
  const rate = canRequest(userId);
  if (!rate.ok) return { ok: false, rateLimited: true, retryInMs: rate.retryIn };
  const existing = state.pendingAddRequests.find(r => r.casinoId === casinoId);
  if (existing) { existing.count++; dirty = true; return { ok: true, duplicate: true }; }
  state.pendingAddRequests.push({ casinoId, requestedBy: userId, ts: Date.now(), count: 1, provisionalSessions: 0 });
  dirty = true;
  return { ok: true, duplicate: false };
}

export function getPendingRequests() {
  return state.pendingAddRequests.slice();
}

export function incrementProvisionalSession(casinoId: string) {
  const entry = state.pendingAddRequests.find(r => r.casinoId === casinoId);
  if (entry) { entry.provisionalSessions++; dirty = true; }
}

// Provisional session daily limit tracking (in-memory)
const PROVISIONAL_LIMIT = parseInt(process.env.COLLECT_CLOCK_PROVISIONAL_DAILY_LIMIT || '3');
const provisionalUserDayCounts = new Map<string, { date: string; count: number }>();

function todayKey() { return new Date().toISOString().slice(0,10); }

export function checkProvisionalAllowed(userId: string) {
  const key = userId;
  const today = todayKey();
  const entry = provisionalUserDayCounts.get(key);
  if (!entry || entry.date !== today) {
    provisionalUserDayCounts.set(key, { date: today, count: 0 });
    return { ok: true, remaining: PROVISIONAL_LIMIT };
  }
  if (entry.count >= PROVISIONAL_LIMIT) {
    return { ok: false, remaining: 0 };
  }
  return { ok: true, remaining: PROVISIONAL_LIMIT - entry.count };
}

export function recordProvisional(userId: string) {
  const today = todayKey();
  const entry = provisionalUserDayCounts.get(userId);
  if (!entry || entry.date !== today) {
    provisionalUserDayCounts.set(userId, { date: today, count: 1 });
  } else {
    entry.count++;
  }
}

export function getPendingWithCounts() {
  return state.pendingAddRequests.map(r => ({
    casinoId: r.casinoId,
    requestedBy: r.requestedBy,
    ts: r.ts,
    requestCount: r.count,
    provisionalSessions: r.provisionalSessions
  }));
}

export function approvePending(casinoId: string) {
  const idx = state.pendingAddRequests.findIndex(r => r.casinoId === casinoId);
  if (idx === -1) return { ok: false, error: 'Not pending' };
  // create empty casino metrics if not present
  if (!state.casinos[casinoId]) {
    const now = Date.now();
    state.casinos[casinoId] = {
      casinoId,
      firstSeen: now,
      lastUpdated: now,
      updateCount: 0,
      latestTrustScore: null,
      avgTrustScore: null,
      alerts: 0,
      criticalAlerts: 0,
      lastSnapshot: undefined
    };
  }
  state.pendingAddRequests.splice(idx, 1);
  dirty = true;
  return { ok: true };
}

export function pruneOld(maxAgeMs: number) {
  const now = Date.now();
  const toArchive: string[] = [];
  for (const [id, entry] of Object.entries(state.casinos)) {
    if (now - entry.lastUpdated > maxAgeMs) toArchive.push(id);
  }
  for (const id of toArchive) {
    state.archived[id] = state.casinos[id];
    delete state.casinos[id];
  }
  if (toArchive.length) dirty = true;
  return toArchive;
}

// periodic pruning (default 30 days)
const PRUNE_INTERVAL_MS = parseInt(process.env.COLLECT_CLOCK_PRUNE_INTERVAL_MS || (6 * 60 * 60 * 1000).toString()); // every 6h
const MAX_AGE_MS = parseInt(process.env.COLLECT_CLOCK_MAX_AGE_MS || (30 * 24 * 60 * 60 * 1000).toString());
setInterval(() => { const archived = pruneOld(MAX_AGE_MS); if (archived.length) console.log('[CollectClock] Archived old casinos:', archived); }, PRUNE_INTERVAL_MS).unref();
