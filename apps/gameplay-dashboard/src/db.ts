/**
 * Gameplay Dashboard Database
 * Stores anomaly reports and human review decisions
 */

import Database from 'better-sqlite3';
import { ulid } from 'ulid';
import path from 'path';
import fs from 'fs';
import type BetterSqlite3 from 'better-sqlite3';
import crypto from 'crypto';

const DB_DIR = process.env.GAMEPLAY_DASHBOARD_DB_DIR || './data/gameplay-dashboard';
const DB_PATH = path.join(DB_DIR, 'dashboard.db');

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db: BetterSqlite3.Database = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS anomaly_reports (
    id TEXT PRIMARY KEY,
    casino_id TEXT NOT NULL,
    user_id TEXT,
    anomaly_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    confidence REAL NOT NULL,
    metadata TEXT,
    reason TEXT NOT NULL,
    detected_at INTEGER NOT NULL,
    review_status TEXT DEFAULT 'pending',
    created_at INTEGER DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS human_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id TEXT NOT NULL,
    reviewer_id TEXT NOT NULL,
    reviewer_name TEXT,
    decision TEXT NOT NULL,
    confidence_override REAL,
    notes TEXT,
    reviewed_at INTEGER DEFAULT (unixepoch() * 1000),
    FOREIGN KEY (report_id) REFERENCES anomaly_reports(id)
  );

  CREATE TABLE IF NOT EXISTS review_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id TEXT NOT NULL,
    requested_by TEXT DEFAULT 'system',
    priority TEXT DEFAULT 'normal',
    reason TEXT,
    requested_at INTEGER DEFAULT (unixepoch() * 1000),
    assigned_to TEXT,
    status TEXT DEFAULT 'open',
    FOREIGN KEY (report_id) REFERENCES anomaly_reports(id)
  );

  CREATE TABLE IF NOT EXISTS dashboard_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    total_anomalies INTEGER DEFAULT 0,
    pending_reviews INTEGER DEFAULT 0,
    approved INTEGER DEFAULT 0,
    rejected INTEGER DEFAULT 0,
    false_positives INTEGER DEFAULT 0,
    updated_at INTEGER DEFAULT (unixepoch() * 1000),
    UNIQUE(date)
  );

  -- Authentication tables
  CREATE TABLE IF NOT EXISTS users (
    discord_id TEXT PRIMARY KEY,
    username TEXT,
    discriminator TEXT,
    avatar TEXT,
    admin INTEGER DEFAULT 0,
    wallet_address TEXT,
    wallet_verified_at INTEGER,
    owner_verified INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'observer',
    created_at INTEGER DEFAULT (unixepoch() * 1000),
    updated_at INTEGER DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS admin_actions (
    id TEXT PRIMARY KEY,
    action_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_tier TEXT NOT NULL,
    payload_json TEXT,
    correlation_id TEXT,
    prev_hash TEXT,
    record_hash TEXT,
    created_at INTEGER DEFAULT (unixepoch() * 1000)
  );
  CREATE TABLE IF NOT EXISTS multi_sig_queue (
    id TEXT PRIMARY KEY,
    action_type TEXT NOT NULL,
    payload_json TEXT,
    required_signers INTEGER NOT NULL,
    collected_signers_json TEXT DEFAULT '[]',
    signatures_json TEXT DEFAULT '[]',
    nonce TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending | complete | executed | expired
    created_at INTEGER DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    discord_id TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch() * 1000),
    last_seen INTEGER DEFAULT (unixepoch() * 1000),
    expires_at INTEGER,
    ip TEXT,
    FOREIGN KEY (discord_id) REFERENCES users(discord_id)
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_discord ON user_sessions(discord_id);

  CREATE INDEX IF NOT EXISTS idx_reports_status ON anomaly_reports(review_status);
  CREATE INDEX IF NOT EXISTS idx_reports_casino ON anomaly_reports(casino_id);
  CREATE INDEX IF NOT EXISTS idx_reports_detected ON anomaly_reports(detected_at);
  CREATE INDEX IF NOT EXISTS idx_requests_status ON review_requests(status);
  CREATE INDEX IF NOT EXISTS idx_requests_priority ON review_requests(priority);
`);

// Attempt to add remediation columns if missing (ignore errors if already exist)
try { db.exec('ALTER TABLE admin_actions ADD COLUMN expected_hash TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE admin_actions ADD COLUMN tampered INTEGER DEFAULT 0'); } catch (e) {}

// Insert anomaly report
export function insertAnomalyReport(report: {
  id: string;
  casinoId: string;
  userId?: string;
  anomalyType: string;
  severity: string;
  confidence: number;
  metadata: any;
  reason: string;
  detectedAt: number;
}) {
  const stmt = db.prepare(`
    INSERT INTO anomaly_reports (id, casino_id, user_id, anomaly_type, severity, confidence, metadata, reason, detected_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  return stmt.run(
    report.id,
    report.casinoId,
    report.userId || null,
    report.anomalyType,
    report.severity,
    report.confidence,
    JSON.stringify(report.metadata),
    report.reason,
    report.detectedAt
  );
}

// Get pending reports for review
export function getPendingReports(limit: number = 50) {
  const stmt = db.prepare(`
    SELECT * FROM anomaly_reports
    WHERE review_status = 'pending'
    ORDER BY detected_at DESC
    LIMIT ?
  `);
  
  return stmt.all(limit).map(parseReport);
}

// Get report by ID
export function getReport(id: string) {
  const stmt = db.prepare('SELECT * FROM anomaly_reports WHERE id = ?');
  const row = stmt.get(id);
  return row ? parseReport(row) : null;
}

// Get reports with filters
export function getReports(filters: {
  casinoId?: string;
  anomalyType?: string;
  severity?: string;
  reviewStatus?: string;
  startDate?: number;
  endDate?: number;
  limit?: number;
}) {
  let query = 'SELECT * FROM anomaly_reports WHERE 1=1';
  const params: any[] = [];
  
  if (filters.casinoId) {
    query += ' AND casino_id = ?';
    params.push(filters.casinoId);
  }
  if (filters.anomalyType) {
    query += ' AND anomaly_type = ?';
    params.push(filters.anomalyType);
  }
  if (filters.severity) {
    query += ' AND severity = ?';
    params.push(filters.severity);
  }
  if (filters.reviewStatus) {
    query += ' AND review_status = ?';
    params.push(filters.reviewStatus);
  }
  if (filters.startDate) {
    query += ' AND detected_at >= ?';
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    query += ' AND detected_at <= ?';
    params.push(filters.endDate);
  }
  
  query += ' ORDER BY detected_at DESC LIMIT ?';
  params.push(filters.limit || 100);
  
  const stmt = db.prepare(query);
  return stmt.all(...params).map(parseReport);
}

// Submit human review
export function submitReview(review: {
  reportId: string;
  reviewerId: string;
  reviewerName?: string;
  decision: 'approve' | 'reject' | 'escalate';
  confidenceOverride?: number;
  notes?: string;
}) {
  const reviewStmt = db.prepare(`
    INSERT INTO human_reviews (report_id, reviewer_id, reviewer_name, decision, confidence_override, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const updateStmt = db.prepare(`
    UPDATE anomaly_reports
    SET review_status = ?
    WHERE id = ?
  `);
  
  const status = review.decision === 'approve' ? 'approved' : 
                 review.decision === 'reject' ? 'rejected' : 'escalated';
  
  const transaction = db.transaction(() => {
    reviewStmt.run(
      review.reportId,
      review.reviewerId,
      review.reviewerName || null,
      review.decision,
      review.confidenceOverride || null,
      review.notes || null
    );
    updateStmt.run(status, review.reportId);
  });
  
  transaction();
}

// Create review request
export function createReviewRequest(request: {
  reportId: string;
  requestedBy?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  reason?: string;
  assignedTo?: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO review_requests (report_id, requested_by, priority, reason, assigned_to)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  return stmt.run(
    request.reportId,
    request.requestedBy || 'system',
    request.priority || 'normal',
    request.reason || null,
    request.assignedTo || null
  );
}

// Get open review requests
export function getOpenReviewRequests(assignedTo?: string) {
  let query = `
    SELECT rr.*, ar.anomaly_type, ar.severity, ar.casino_id, ar.detected_at
    FROM review_requests rr
    JOIN anomaly_reports ar ON rr.report_id = ar.id
    WHERE rr.status = 'open'
  `;
  const params: any[] = [];
  
  if (assignedTo) {
    query += ' AND (rr.assigned_to = ? OR rr.assigned_to IS NULL)';
    params.push(assignedTo);
  }
  
  query += ' ORDER BY CASE rr.priority WHEN "critical" THEN 1 WHEN "high" THEN 2 WHEN "normal" THEN 3 ELSE 4 END, rr.requested_at ASC';
  
  const stmt = db.prepare(query);
  return stmt.all(...params);
}

// Close review request
export function closeReviewRequest(id: number) {
  const stmt = db.prepare('UPDATE review_requests SET status = "closed" WHERE id = ?');
  return stmt.run(id);
}

// Get dashboard statistics
export function getDashboardStats(dateRange: { start: number; end: number }) {
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total_anomalies,
      SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending_reviews,
      SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      COUNT(DISTINCT casino_id) as casinos_monitored,
      anomaly_type,
      severity
    FROM anomaly_reports
    WHERE detected_at >= ? AND detected_at <= ?
    GROUP BY anomaly_type, severity
  `);
  
  return stmt.all(dateRange.start, dateRange.end);
}

// =============================
// Auth Helpers
// =============================

export function upsertUser(user: {
  discord_id: string;
  username?: string;
  discriminator?: string;
  avatar?: string;
  admin?: boolean;
  wallet_address?: string;
  owner_verified?: boolean;
  tier?: string;
}) {
  const existing = db.prepare('SELECT discord_id FROM users WHERE discord_id = ?').get(user.discord_id);
  const now = Date.now();
  if (existing) {
    db.prepare(`UPDATE users SET username = ?, discriminator = ?, avatar = ?, admin = ?, wallet_address = COALESCE(?, wallet_address), owner_verified = COALESCE(?, owner_verified), tier = COALESCE(?, tier), updated_at = ? WHERE discord_id = ?`).run(
      user.username || null,
      user.discriminator || null,
      user.avatar || null,
      user.admin ? 1 : 0,
      user.wallet_address || null,
      typeof user.owner_verified === 'boolean' ? (user.owner_verified ? 1 : 0) : null,
      user.tier || null,
      now,
      user.discord_id
    );
  } else {
    db.prepare(`INSERT INTO users (discord_id, username, discriminator, avatar, admin, wallet_address, owner_verified, tier, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      user.discord_id,
      user.username || null,
      user.discriminator || null,
      user.avatar || null,
      user.admin ? 1 : 0,
      user.wallet_address || null,
      user.owner_verified ? 1 : 0,
      user.tier || 'observer',
      now,
      now
    );
  }
}

export function createSession(discord_id: string, ttlMs: number = 1000 * 60 * 60 * 12, ip?: string) {
  const id = ulid();
  const expires = Date.now() + ttlMs;
  db.prepare(`INSERT INTO user_sessions (id, discord_id, expires_at, ip) VALUES (?, ?, ?, ?)`)
    .run(id, discord_id, expires, ip || null);
  return { id, expires_at: expires, ip: ip || null };
}

export function getSession(sessionId: string) {
  const row: any = db.prepare('SELECT * FROM user_sessions WHERE id = ?').get(sessionId);
  if (!row) return null;
  if (row.expires_at && row.expires_at < Date.now()) {
    db.prepare('DELETE FROM user_sessions WHERE id = ?').run(sessionId);
    return null;
  }
  db.prepare('UPDATE user_sessions SET last_seen = ? WHERE id = ?').run(Date.now(), sessionId);
  return row;
}

export function getUser(discord_id: string) {
  return db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discord_id) as any;
}

export function isAdmin(discord_id: string) {
  const row = getUser(discord_id);
  return !!row && row.admin === 1;
}

export function setWalletVerification(discord_id: string, wallet_address: string, ownerVerified: boolean) {
  const now = Date.now();
  db.prepare(`UPDATE users SET wallet_address = ?, wallet_verified_at = ?, owner_verified = ?, updated_at = ? WHERE discord_id = ?`).run(
    wallet_address,
    now,
    ownerVerified ? 1 : 0,
    now,
    discord_id
  );
}

export function logAdminAction(action: {
  id?: string;
  actionType: string;
  actorId: string;
  actorTier: string;
  payload: any;
  correlationId?: string;
}) {
  const id = action.id || ulid();
  const payloadJson = JSON.stringify(action.payload || {});
  // Fetch previous hash
  let prevHash: string | null = null;
  try {
    const row: any = db.prepare(`SELECT record_hash FROM admin_actions ORDER BY created_at DESC LIMIT 1`).get();
    if (row && row.record_hash) prevHash = row.record_hash;
  } catch {}
  const timestamp = Date.now();
  const baseString = [prevHash || '', action.actionType, action.actorId, action.actorTier, payloadJson, action.correlationId || '', timestamp].join('|');
  const recordHash = crypto.createHash('sha256').update(baseString).digest('hex');
  db.prepare(`INSERT INTO admin_actions (id, action_type, actor_id, actor_tier, payload_json, correlation_id, prev_hash, record_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, action.actionType, action.actorId, action.actorTier, payloadJson, action.correlationId || null, prevHash, recordHash, timestamp);
  return id;
}

export function getRecentAdminActions(limit: number = 100) {
  return db.prepare(`SELECT * FROM admin_actions ORDER BY created_at DESC LIMIT ?`).all(limit).map((r: any) => ({
    ...r,
    payload: r.payload_json ? JSON.parse(r.payload_json) : {}
  }));
}

export function verifyAdminActionChain(limit: number = 5000) {
  const rows: any[] = db.prepare(`SELECT * FROM admin_actions ORDER BY created_at ASC LIMIT ?`).all(limit);
  let prevHash: string | null = null;
  const invalid: Array<{ id: string; expected: string; actual: string }> = [];
  for (const r of rows) {
    const payloadJson = r.payload_json || '{}';
    const baseString = [prevHash || '', r.action_type, r.actor_id, r.actor_tier, payloadJson, r.correlation_id || '', r.created_at].join('|');
    const expected = crypto.createHash('sha256').update(baseString).digest('hex');
    if (expected !== r.record_hash) {
      invalid.push({ id: r.id, expected, actual: r.record_hash });
    }
    prevHash = r.record_hash;
  }
  return { valid: invalid.length === 0, total: rows.length, invalid }; 
}

export function remediateAdminActionChain(limit: number = 5000) {
  const rows: any[] = db.prepare(`SELECT * FROM admin_actions ORDER BY created_at ASC LIMIT ?`).all(limit);
  let prevHash: string | null = null;
  const updated: string[] = [];
  const tampered: string[] = [];
  for (const r of rows) {
    const payloadJson = r.payload_json || '{}';
    const baseString = [prevHash || '', r.action_type, r.actor_id, r.actor_tier, payloadJson, r.correlation_id || '', r.created_at].join('|');
    const expected = crypto.createHash('sha256').update(baseString).digest('hex');
    const isTampered = expected !== r.record_hash;
    if (isTampered) tampered.push(r.id);
    db.prepare(`UPDATE admin_actions SET expected_hash = ?, tampered = ? WHERE id = ?`).run(expected, isTampered ? 1 : 0, r.id);
    prevHash = r.record_hash; // keep original chain reference even if tampered
    updated.push(r.id);
  }
  return { updated: updated.length, tamperedCount: tampered.length, tamperedIds: tampered };
}

// =============================
// Multi-Sig Helpers
// =============================

export function createMultiSigProposal(p: { id?: string; actionType: string; payload: any; requiredSigners: number; nonce: string; initiator: string; signature: string }) {
  const id = p.id || ulid();
  db.prepare(`INSERT INTO multi_sig_queue (id, action_type, payload_json, required_signers, collected_signers_json, signatures_json, nonce, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`)
    .run(id, p.actionType, JSON.stringify(p.payload || {}), p.requiredSigners, JSON.stringify([p.initiator]), JSON.stringify([p.signature]), p.nonce);
  return id;
}

export function getMultiSig(id: string) {
  const row: any = db.prepare(`SELECT * FROM multi_sig_queue WHERE id = ?`).get(id);
  if (!row) return null;
  return {
    ...row,
    payload: row.payload_json ? JSON.parse(row.payload_json) : {},
    collected_signers: row.collected_signers_json ? JSON.parse(row.collected_signers_json) : [],
    signatures: row.signatures_json ? JSON.parse(row.signatures_json) : []
  };
}

export function addMultiSigSignature(id: string, signer: string, signature: string) {
  const ms: any = getMultiSig(id);
  if (!ms) return null;
  if (ms.status !== 'pending') return ms;
  if (ms.collected_signers.includes(signer)) return ms; // already signed
  ms.collected_signers.push(signer);
  ms.signatures.push(signature);
  let status = ms.status;
  if (ms.collected_signers.length >= ms.required_signers) status = 'complete';
  db.prepare(`UPDATE multi_sig_queue SET collected_signers_json = ?, signatures_json = ?, status = ? WHERE id = ?`)
    .run(JSON.stringify(ms.collected_signers), JSON.stringify(ms.signatures), status, id);
  return getMultiSig(id);
}

export function markMultiSigExecuted(id: string) {
  db.prepare(`UPDATE multi_sig_queue SET status = 'executed' WHERE id = ?`).run(id);
}

// Ensure tier column exists for existing DBs (best-effort; ignore if already present)
try {
  const cols: any[] = db.prepare(`PRAGMA table_info(users)`).all() as any[];
  if (!cols.find((c: any) => c.name === 'tier')) {
    db.prepare(`ALTER TABLE users ADD COLUMN tier TEXT DEFAULT 'observer'`).run();
    console.log('[GameplayDashboard DB] Added missing tier column to users');
  }
} catch (e) {
  console.warn('[GameplayDashboard DB] Could not ensure tier column:', (e as any).message);
}

// Legacy Discord owner elevation
export function elevateLegacyDiscordOwners() {
  const raw = process.env.DISCORD_LEGACY_OWNER_IDS;
  if (!raw) return;
  const ids = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (ids.length === 0) return;
  const stmt = db.prepare('UPDATE users SET admin = 1, tier = "owner" WHERE discord_id = ?');
  ids.forEach(id => {
    // Create row if missing
    upsertUser({ discord_id: id, admin: true, tier: 'owner' });
    stmt.run(id);
  });
  console.log('[GameplayDashboard DB] Elevated legacy discord owners:', ids);
}

export function elevateAdminsFromEnv() {
  const raw = process.env.DASHBOARD_ADMIN_IDS;
  if (!raw) return;
  const ids = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (ids.length === 0) return;
  const stmt = db.prepare('UPDATE users SET admin = 1 WHERE discord_id = ?');
  ids.forEach(id => stmt.run(id));
}

// Call once at startup to sync admin flags
try { elevateAdminsFromEnv(); } catch {}

// Get review history for a report
export function getReviewHistory(reportId: string) {
  const stmt = db.prepare(`
    SELECT * FROM human_reviews
    WHERE report_id = ?
    ORDER BY reviewed_at DESC
  `);
  
  return stmt.all(reportId);
}

// Helper to parse metadata JSON
function parseReport(row: any) {
  return {
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : {}
  };
}

console.log('[GameplayDashboard DB] Initialized at', DB_PATH);
