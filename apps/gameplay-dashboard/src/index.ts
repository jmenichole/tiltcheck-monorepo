/**
 * Gameplay Analysis Dashboard
 * Human review system for provable fairness decisions
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { eventRouter } from '@tiltcheck/event-router';
import type { GameplayAnomalyEvent } from '@tiltcheck/types';
import * as DB from './db.js';
import * as DbModule from './db.js';
import { ulid } from 'ulid';
import http from 'http';
import {
  upsertUser,
  createSession,
  getSession,
  getUser,
  isAdmin,
  setWalletVerification,
  elevateLegacyDiscordOwners,
  logAdminAction,
  getRecentAdminActions,
  createMultiSigProposal,
  addMultiSigSignature,
  markMultiSigExecuted,
  getMultiSig
} from './db.js';
import { Connection, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const app = express();
app.use(cors());
app.use(express.json());

// Simple cookie parser
function parseCookies(cookieHeader?: string): Record<string,string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, part) => {
    const [k,v] = part.split('=').map(s => s.trim());
    if (k) acc[k] = decodeURIComponent(v || '');
    return acc;
  }, {} as Record<string,string>);
}

// Auth middleware
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies['tc_session'];
  if (!sessionId) return res.status(401).json({ error: 'Not authenticated' });
  const session = getSession(sessionId);
  if (!session) return res.status(401).json({ error: 'Invalid or expired session' });
  const user = getUser(session.discord_id);
  if (!user) return res.status(401).json({ error: 'User not found' });
  (req as any).auth = { session, user };
  next();
}

// Generic tier guard
function requireTier(allowed: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!(req as any).auth) return res.status(401).json({ error: 'Not authenticated' });
    const { user } = (req as any).auth;
    const tier = user.tier || (user.admin ? 'owner' : 'observer');
    if (!allowed.includes(tier)) return res.status(403).json({ error: 'Insufficient tier', required: allowed, have: tier });
    next();
  };
}

// Discord OAuth removed: wallet-only authentication

// Solana connection (lazy)
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const solanaConnection = new Connection(SOLANA_RPC_URL, 'confirmed');
const OWNER_NFT_MINTS = (process.env.OWNER_NFT_MINTS || '').split(',').map(s => s.trim()).filter(Boolean);

// Wallet challenge store (in-memory; could be Redis later)
const walletChallenges = new Map<string, { nonce: string; message: string; created: number }>();
// Action signature challenges (per privileged action before submit)
const actionChallenges = new Map<string, { nonce: string; actorId: string; actionType: string; payloadHash: string; created: number }>();

const ENFORCE_ACTION_SIGNATURES = process.env.ENFORCE_ACTION_SIGNATURES === '1';

// Public wallet challenge request (no prior auth). Client supplies walletAddress
app.post('/auth/wallet/challenge', (req, res) => {
  const { walletAddress } = req.body || {};
  if (!walletAddress) return res.status(400).json({ error: 'walletAddress required' });
  let pubKey: PublicKey;
  try { pubKey = new PublicKey(walletAddress); } catch { return res.status(400).json({ error: 'Invalid wallet address' }); }
  const nonce = ulid();
  const message = `TiltCheck Ownership Verification\nWallet:${pubKey.toBase58()}\nNonce:${nonce}`;
  walletChallenges.set(walletAddress, { nonce, message, created: Date.now() });
  res.json({ message });
});

// Verify wallet signature & NFT ownership
app.post('/auth/wallet/verify', async (req, res) => {
  try {
    const { walletAddress, signature } = req.body || {};
    if (!walletAddress || !signature) return res.status(400).json({ error: 'walletAddress and signature required' });
    const challenge = walletChallenges.get(walletAddress);
    if (!challenge) return res.status(400).json({ error: 'No active challenge for wallet. Request one first.' });
    if (Date.now() - challenge.created > 5 * 60 * 1000) { // 5 min expiry
      walletChallenges.delete(walletAddress);
      return res.status(400).json({ error: 'Challenge expired' });
    }
    // Verify signature
    let pubKey: PublicKey;
    try { pubKey = new PublicKey(walletAddress); } catch { return res.status(400).json({ error: 'Invalid wallet address' }); }
    let sigBytes: Uint8Array;
    try { sigBytes = bs58.decode(signature); } catch { return res.status(400).json({ error: 'Invalid signature encoding' }); }
    const msgBytes = new TextEncoder().encode(challenge.message);
    if (!nacl.sign.detached.verify(msgBytes, sigBytes, pubKey.toBytes())) {
      return res.status(400).json({ error: 'Signature verification failed' });
    }
    // Check NFT ownership (any of the configured mints)
    let ownerVerified = false;
    if (OWNER_NFT_MINTS.length === 0) {
      return res.status(500).json({ error: 'OWNER_NFT_MINTS not configured' });
    }
    for (const mintStr of OWNER_NFT_MINTS) {
      try {
        const mintKey = new PublicKey(mintStr);
        const tokenAccounts = await solanaConnection.getTokenAccountsByOwner(pubKey, { mint: mintKey });
        if (tokenAccounts.value.length > 0) { ownerVerified = true; break; }
      } catch (e) {
        console.warn('[WalletVerify] Mint check failed', mintStr, (e as any).message);
      }
    }
    if (!ownerVerified) {
      return res.status(403).json({ error: 'Required NFT not held' });
    }
    // Persist verification
    // Create or update local user; we repurpose discord_id column as generic identity key
    const identityKey = walletAddress;
    upsertUser({ discord_id: identityKey, wallet_address: walletAddress, owner_verified: true, admin: false });
    setWalletVerification(identityKey, walletAddress, true);
    const autoElevate = process.env.OWNER_VERIFIED_ELEVATE_ADMIN === '1';
    if (autoElevate) {
      upsertUser({ discord_id: identityKey, admin: true, wallet_address: walletAddress, owner_verified: true });
    }
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const session = createSession(identityKey, undefined, Array.isArray(ip) ? ip[0] : ip);
    walletChallenges.delete(walletAddress);
    res.setHeader('Set-Cookie', `tc_session=${session.id}; HttpOnly; Path=/; SameSite=Lax`);
    res.json({ success: true, ownerVerified: true, admin: isAdmin(identityKey) });
  } catch (e: any) {
    res.status(500).json({ error: 'Wallet verification error', detail: e.message });
  }
});

// (Discord OAuth endpoints removed)

app.post('/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'tc_session=deleted; Path=/; Max-Age=0');
  res.json({ success: true });
});

// Track metrics
let anomalyEventsReceived = 0;
let reviewsSubmitted = 0;
let autoEscalations = 0;

// ============================================
// Event Subscriptions (Auto-Capture Anomalies)
// ============================================

function subscribeToAnomalyEvents() {
  const anomalyTypes: Array<'fairness.pump.detected' | 'fairness.compression.detected' | 'fairness.cluster.detected'> = 
    ['fairness.pump.detected', 'fairness.compression.detected', 'fairness.cluster.detected'];
  
  anomalyTypes.forEach(eventType => {
    eventRouter.subscribe(eventType, (evt) => {
      try {
        const data = evt.data as GameplayAnomalyEvent;
        const reportId = ulid();
        
        // Store in database
        DB.insertAnomalyReport({
          id: reportId,
          casinoId: data.casinoId,
          userId: data.userId,
          anomalyType: data.anomalyType,
          severity: data.severity,
          confidence: data.confidence,
          metadata: data.metadata,
          reason: data.reason,
          detectedAt: data.timestamp
        });
        
        anomalyEventsReceived++;
        
        // Auto-escalate critical anomalies for human review
        if (data.severity === 'critical' || data.confidence > 0.85) {
          DB.createReviewRequest({
            reportId,
            requestedBy: 'system',
            priority: data.severity === 'critical' ? 'critical' : 'high',
            reason: `Auto-escalated: ${data.severity} severity, ${(data.confidence * 100).toFixed(0)}% confidence`
          });
          autoEscalations++;
          console.log(`[Dashboard] Auto-escalated report ${reportId} for human review`);
        }
        
        console.log(`[Dashboard] Captured ${eventType}: ${reportId}`);
      } catch (err) {
        console.error('[Dashboard] Error capturing anomaly event:', err);
      }
    }, 'gameplay-dashboard');
  });
  
  console.log('[Dashboard] Subscribed to anomaly events');
}

// ============================================
// API Endpoints
// ============================================

// Auth me endpoint (tier + capabilities exposition)
app.get('/api/auth/me', authMiddleware, (req, res) => {
  try {
    const { user } = (req as any).auth;
    const rawMap = process.env.TILT_TIER_MAP || '';
    const mapEntries = rawMap.split(',').map(s => s.trim()).filter(Boolean).map(pair => {
      const [tier, caps] = pair.split(':');
      return { tier, capabilities: (caps || '').split('|').filter(Boolean) };
    });
    res.json({
      user: {
        id: user.discord_id,
        wallet: user.wallet_address || null,
        tier: user.tier,
        admin: !!user.admin,
        ownerVerified: !!user.owner_verified
      },
      tierMap: mapEntries
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Generate action signature challenge
app.post('/api/admin/action-challenge', authMiddleware, (req, res) => {
  try {
    const { actionType, payload } = req.body || {};
    if (!actionType) return res.status(400).json({ error: 'actionType required' });
    const { user } = (req as any).auth;
    const nonce = ulid();
    const canonical = JSON.stringify(payload || {});
    // simple hash substitute: base58 of first 16 bytes of sha256
    const digest = bs58.encode(nacl.hash(new TextEncoder().encode(canonical)).slice(0,16));
    actionChallenges.set(nonce, { nonce, actorId: user.discord_id, actionType, payloadHash: digest, created: Date.now() });
    const message = `TiltCheck Action\nType:${actionType}\nActor:${user.discord_id}\nPayloadHash:${digest}\nNonce:${nonce}`;
    res.json({ nonce, message });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

function verifyActionSignature(actorWallet: string, signature: string, nonce: string) {
  const challenge = actionChallenges.get(nonce);
  if (!challenge) return { ok: false, error: 'Unknown nonce' };
  if (challenge.actorId !== actorWallet) return { ok: false, error: 'Actor mismatch' };
  if (Date.now() - challenge.created > 5 * 60 * 1000) { // 5 min expiry
    actionChallenges.delete(nonce);
    return { ok: false, error: 'Challenge expired' };
  }
  const message = `TiltCheck Action\nType:${challenge.actionType}\nActor:${challenge.actorId}\nPayloadHash:${challenge.payloadHash}\nNonce:${challenge.nonce}`;
  let sigBytes: Uint8Array;
  try { sigBytes = bs58.decode(signature); } catch { return { ok: false, error: 'Bad signature encoding' }; }
  try {
    const pk = new PublicKey(actorWallet);
    const msgBytes = new TextEncoder().encode(message);
    const ok = nacl.sign.detached.verify(msgBytes, sigBytes, pk.toBytes());
    if (!ok) return { ok: false, error: 'Signature invalid' };
    return { ok: true, challenge };
  } catch { return { ok: false, error: 'Invalid wallet address' }; }
}

// Get all pending reports
app.get('/api/reports/pending', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const reports = DB.getPendingReports(limit);
    res.json({ reports, count: reports.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get reports with filters
app.get('/api/reports', authMiddleware, requireTier(['analyst','operator','owner']), (req, res) => {
  try {
    const filters = {
      casinoId: req.query.casinoId as string,
      anomalyType: req.query.anomalyType as string,
      severity: req.query.severity as string,
      reviewStatus: req.query.reviewStatus as string,
      startDate: req.query.startDate ? parseInt(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? parseInt(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100
    };
    
    const reports = DB.getReports(filters);
    res.json({ reports, count: reports.length, filters });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific report
app.get('/api/reports/:id', authMiddleware, requireTier(['analyst','operator','owner']), (req, res) => {
  try {
    const report = DB.getReport(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const history = DB.getReviewHistory(req.params.id);
    return res.json({ report, reviewHistory: history });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Submit human review
app.post('/api/reviews', authMiddleware, requireTier(['analyst','operator','owner']), (req, res) => {
  try {
    const { reportId, reviewerId, reviewerName, decision, confidenceOverride, notes, nonce, signature } = req.body;
    if (ENFORCE_ACTION_SIGNATURES) {
      const wallet = (req as any).auth.user.discord_id; // wallet-based identity
      const sv = verifyActionSignature(wallet, signature, nonce);
      if (!sv.ok) return res.status(401).json({ error: 'Signature required', detail: sv.error });
      actionChallenges.delete(nonce);
    }
    
    if (!reportId || !reviewerId || !decision) {
      return res.status(400).json({ error: 'Missing required fields: reportId, reviewerId, decision' });
    }
    
    if (!['approve', 'reject', 'escalate'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision. Must be: approve, reject, or escalate' });
    }
    
    // Verify report exists
    const report = DB.getReport(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Submit review
    DB.submitReview({
      reportId,
      reviewerId,
      reviewerName,
      decision,
      confidenceOverride,
      notes
    });
    
    reviewsSubmitted++;
    
    // Publish trust event based on decision
    if (decision === 'approve' && report.user_id) {
      eventRouter.publish('trust.human.verified', 'gameplay-dashboard', {
        userId: report.user_id,
        casinoId: report.casino_id,
        anomalyType: report.anomaly_type,
        verified: true,
        reviewerId,
        notes
      });
    } else if (decision === 'reject') {
      eventRouter.publish('trust.false.positive', 'gameplay-dashboard', {
        userId: report.user_id,
        casinoId: report.casino_id,
        anomalyType: report.anomaly_type,
        falsePositive: true,
        reviewerId,
        notes
      });
    }
    
    // Audit log
    try { logAdminAction({ actionType: 'review.submit', actorId: reviewerId, actorTier: (req as any).auth.user.tier, payload: { reportId, decision } }); } catch {}
    return res.json({ success: true, reportId, decision });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get open review requests
app.get('/api/review-requests', authMiddleware, requireTier(['analyst','operator','owner']), (req, res) => {
  try {
    const assignedTo = req.query.assignedTo as string;
    const requests = DB.getOpenReviewRequests(assignedTo);
    res.json({ requests, count: requests.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create review request
app.post('/api/review-requests', authMiddleware, requireTier(['analyst','operator','owner']), (req, res) => {
  try {
    const { reportId, requestedBy, priority, reason, assignedTo, nonce, signature } = req.body;
    if (ENFORCE_ACTION_SIGNATURES) {
      const wallet = (req as any).auth.user.discord_id;
      const sv = verifyActionSignature(wallet, signature, nonce);
      if (!sv.ok) return res.status(401).json({ error: 'Signature required', detail: sv.error });
      actionChallenges.delete(nonce);
    }
    
    if (!reportId) {
      return res.status(400).json({ error: 'Missing reportId' });
    }
    
    const result = DB.createReviewRequest({
      reportId,
      requestedBy,
      priority,
      reason,
      assignedTo
    });
    
    try { logAdminAction({ actionType: 'review.request.create', actorId: requestedBy || (req as any).auth.user.discord_id, actorTier: (req as any).auth.user.tier, payload: { reportId, priority, reason, assignedTo } }); } catch {}
    return res.json({ success: true, requestId: result.lastInsertRowid });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Close review request
app.post('/api/review-requests/:id/close', authMiddleware, requireTier(['analyst','operator','owner']), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nonce, signature } = req.body || {};
    if (ENFORCE_ACTION_SIGNATURES) {
      const wallet = (req as any).auth.user.discord_id;
      const sv = verifyActionSignature(wallet, signature, nonce);
      if (!sv.ok) return res.status(401).json({ error: 'Signature required', detail: sv.error });
      actionChallenges.delete(nonce);
    }
    DB.closeReviewRequest(id);
    try { logAdminAction({ actionType: 'review.request.close', actorId: (req as any).auth.user.discord_id, actorTier: (req as any).auth.user.tier, payload: { requestId: id } }); } catch {}
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get dashboard statistics
app.get('/api/stats', authMiddleware, requireTier(['observer','analyst','operator','owner']), (req, res) => {
  try {
    const defaultStart = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
    const startDate = req.query.startDate ? parseInt(req.query.startDate as string) : defaultStart;
    const endDate = req.query.endDate ? parseInt(req.query.endDate as string) : Date.now();
    
    const stats = DB.getDashboardStats({ start: startDate, end: endDate });
    const pending = DB.getPendingReports(1000);
    const openRequests = DB.getOpenReviewRequests();
    
    res.json({
      stats,
      summary: {
        pendingReviews: pending.length,
        openRequests: openRequests.length,
        anomalyEventsReceived,
        reviewsSubmitted,
        autoEscalations
      },
      dateRange: { start: startDate, end: endDate }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Pending CollectClock requests (exposes request count + provisional sessions)
app.get('/api/collectclock/pending', authMiddleware, requireTier(['observer','analyst','operator','owner']), async (req, res) => {
  try {
    // Attempt to read registry from shared data path
    const paths = [
      path.join(process.cwd(), 'data/collect-clock/registry.json'),
      path.resolve(__dirname, '../../../data/collect-clock/registry.json')
    ];
    let raw: string | null = null;
    for (const p of paths) {
      try { raw = await fs.promises.readFile(p, 'utf-8'); break; } catch (_) {}
    }
    if (!raw) return res.json({ pending: [], count: 0, source: 'none' });
    const parsed = JSON.parse(raw);
    const pending = (parsed.pendingAddRequests || []).map((r: any) => ({
      casinoId: r.casinoId,
      requestedBy: r.requestedBy,
      ts: r.ts,
      requestCount: r.count,
      provisionalSessions: r.provisionalSessions || 0
    }));
    res.json({ pending, count: pending.length, source: 'registry' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// =============================
// Admin Router (grouped routes)
// =============================

const adminRouter = express.Router();
// All admin routes require auth
adminRouter.use(authMiddleware);
// General operator/owner guard at router level
adminRouter.use((req, res, next) => requireTier(['operator','owner'])(req, res, next));

// Rate limiting (in-memory) for multisig proposals
const MULTISIG_PROPOSE_LIMIT = parseInt(process.env.MULTISIG_PROPOSE_LIMIT || '5');
const MULTISIG_PROPOSE_WINDOW_MS = parseInt(process.env.MULTISIG_PROPOSE_WINDOW_MS || (5 * 60 * 1000).toString()); // default 5 min
const proposeRate = new Map<string, { count: number; windowStart: number }>();

function checkProposeRate(actorId: string) {
  const now = Date.now();
  const entry = proposeRate.get(actorId);
  if (!entry) {
    proposeRate.set(actorId, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (now - entry.windowStart > MULTISIG_PROPOSE_WINDOW_MS) {
    proposeRate.set(actorId, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (entry.count >= MULTISIG_PROPOSE_LIMIT) {
    return { ok: false, retryIn: (entry.windowStart + MULTISIG_PROPOSE_WINDOW_MS) - now };
  }
  entry.count++;
  return { ok: true };
}

// Recent audit actions (operator/owner)
adminRouter.get('/actions', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const actions = getRecentAdminActions(limit);
    res.json({ actions, count: actions.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Hash chain verification endpoint
adminRouter.get('/actions/hash-verify', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5000;
    const result = DbModule.verifyAdminActionChain(limit);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Multi-sig propose
adminRouter.post('/multisig/propose', (req, res) => {
  try {
    const { actionType, payload, requiredSigners, signature, nonce } = req.body || {};
    if (!actionType || !requiredSigners || !signature || !nonce) return res.status(400).json({ error: 'actionType, requiredSigners, signature, nonce required' });
    const actorWallet = (req as any).auth.user.discord_id;
    const rate = checkProposeRate(actorWallet);
    if (!rate.ok) return res.status(429).json({ error: 'Rate limit exceeded', retryInMs: rate.retryIn });
    if (ENFORCE_ACTION_SIGNATURES) {
      const sv = verifyActionSignature(actorWallet, signature, nonce);
      if (!sv.ok) return res.status(401).json({ error: 'Signature invalid', detail: sv.error });
      actionChallenges.delete(nonce);
    }
    const msId = createMultiSigProposal({ actionType, payload, requiredSigners, nonce, initiator: actorWallet, signature });
    logAdminAction({ actionType: 'multisig.propose', actorId: actorWallet, actorTier: (req as any).auth.user.tier, payload: { msId, actionType, requiredSigners } });
    res.json({ success: true, id: msId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Multi-sig sign
adminRouter.post('/multisig/sign', (req, res) => {
  try {
    const { id, signature, nonce } = req.body || {};
    if (!id || !signature || !nonce) return res.status(400).json({ error: 'id, signature, nonce required' });
    const actorWallet = (req as any).auth.user.discord_id;
    if (ENFORCE_ACTION_SIGNATURES) {
      const sv = verifyActionSignature(actorWallet, signature, nonce);
      if (!sv.ok) return res.status(401).json({ error: 'Signature invalid', detail: sv.error });
      actionChallenges.delete(nonce);
    }
    const updated = addMultiSigSignature(id, actorWallet, signature);
    if (!updated) return res.status(404).json({ error: 'Multi-sig not found' });
    logAdminAction({ actionType: 'multisig.sign', actorId: actorWallet, actorTier: (req as any).auth.user.tier, payload: { id } });
    res.json({ success: true, status: updated.status, collected: updated.collected_signers.length, required: updated.required_signers });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Multi-sig execute (owner only)
adminRouter.post('/multisig/execute', (req, res, next) => requireTier(['owner'])(req, res, next), (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id required' });
    const ms = getMultiSig(id);
    if (!ms) return res.status(404).json({ error: 'Not found' });
    if (ms.status !== 'complete') return res.status(400).json({ error: 'Not complete' });
    markMultiSigExecuted(id);
    logAdminAction({ actionType: 'multisig.execute', actorId: (req as any).auth.user.discord_id, actorTier: (req as any).auth.user.tier, payload: { id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.use('/api/admin', adminRouter);

// Export app for test harness usage
export { app };

// Simple HTML dashboard (for quick access without separate frontend)
app.get('/', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies['tc_session'];
  const session = sessionId ? getSession(sessionId) : null;
  const user = session ? getUser(session.discord_id) : null;
  const isAuthed = !!user;
  const isAdminUser = user ? isAdmin(user.discord_id) : false;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>TiltCheck Gameplay Analysis Dashboard</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
          background: #0a0a0a; 
          color: #e0e0e0; 
          padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 { color: #00ff88; margin-bottom: 10px; font-size: 28px; }
        .subtitle { color: #888; margin-bottom: 30px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .stat-card { 
          background: #1a1a1a; 
          border: 1px solid #333; 
          border-radius: 8px; 
          padding: 20px;
          transition: border-color 0.2s;
        }
        .stat-card:hover { border-color: #00ff88; }
        .stat-label { color: #888; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; }
        .stat-value { color: #00ff88; font-size: 32px; font-weight: bold; }
        .section { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .section-title { color: #00ff88; margin-bottom: 15px; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; }
        th { 
          text-align: left; 
          padding: 12px; 
          border-bottom: 2px solid #333; 
          color: #888; 
          font-size: 12px; 
          text-transform: uppercase;
        }
        td { padding: 12px; border-bottom: 1px solid #222; }
        tr:hover { background: #0f0f0f; }
        .badge { 
          display: inline-block; 
          padding: 4px 8px; 
          border-radius: 4px; 
          font-size: 11px; 
          font-weight: bold;
          text-transform: uppercase;
        }
        .badge-critical { background: #ff0055; color: white; }
        .badge-warning { background: #ffaa00; color: black; }
        .badge-info { background: #0088ff; color: white; }
        .badge-pending { background: #666; color: white; }
        .badge-approved { background: #00ff88; color: black; }
        .badge-rejected { background: #ff4444; color: white; }
        .btn { 
          padding: 8px 16px; 
          background: #00ff88; 
          color: #000; 
          border: none; 
          border-radius: 4px; 
          cursor: pointer; 
          font-weight: bold;
          text-decoration: none;
          display: inline-block;
        }
        .btn:hover { background: #00cc6a; }
        .btn-secondary { background: #333; color: #fff; }
        .btn-secondary:hover { background: #444; }
        .loading { text-align: center; padding: 40px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎰 Gameplay Analysis Dashboard</h1>
        <div class="subtitle">Human review system for provable fairness decisions</div>
        <div style="margin: 10px 0 25px;">
          ${isAuthed ? `<span style="color:#00ff88;">Wallet Authenticated${isAdminUser ? ' (admin)' : ''}</span> <button id="logoutBtn" class="btn-secondary" style="margin-left:12px;">Logout</button>` : `
          <div style="display:flex;gap:8px;flex-direction:column;max-width:420px;">
            <input id="walletAddress" placeholder="Enter wallet address" style="padding:8px;border:1px solid #333;background:#111;color:#eee;border-radius:4px;" />
            <button id="requestChallenge" class="btn">Request Challenge</button>
            <textarea id="challengeMsg" readonly style="min-height:90px;padding:8px;background:#111;color:#aaa;font-size:12px;border:1px solid #333;border-radius:4px;"></textarea>
            <input id="signatureInput" placeholder="Paste base58 signature" style="padding:8px;border:1px solid #333;background:#111;color:#eee;border-radius:4px;" />
            <button id="verifyWallet" class="btn-secondary">Verify & Login</button>
            <div id="walletStatus" style="font-size:12px;color:#888;"></div>
          </div>`}
        </div>
        
        <div class="stats" id="stats" ${!isAuthed ? 'style="filter:blur(4px);pointer-events:none;"' : ''}>
          <div class="stat-card">
            <div class="stat-label">Pending Reviews</div>
            <div class="stat-value" id="stat-pending">-</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Open Requests</div>
            <div class="stat-value" id="stat-requests">-</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Reviews Submitted</div>
            <div class="stat-value" id="stat-submitted">-</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Auto Escalations</div>
            <div class="stat-value" id="stat-escalations">-</div>
          </div>
        </div>

        <div class="section" ${!isAdminUser ? 'style="filter:blur(4px);pointer-events:none;"' : ''}>
          <div class="section-title">⚠️ Pending Reports</div>
          <div id="pending-reports" class="loading">Loading...</div>
        </div>

        <div class="section" ${!isAdminUser ? 'style="filter:blur(4px);pointer-events:none;"' : ''}>
          <div class="section-title">📋 Open Review Requests</div>
          <div id="review-requests" class="loading">Loading...</div>
        </div>
      </div>

      <script>
        async function loadStats() {
          if (!${isAuthed}) return;
          const res = await fetch('/api/stats');
          const data = await res.json();
          document.getElementById('stat-pending').textContent = data.summary.pendingReviews;
          document.getElementById('stat-requests').textContent = data.summary.openRequests;
          document.getElementById('stat-submitted').textContent = data.summary.reviewsSubmitted;
          document.getElementById('stat-escalations').textContent = data.summary.autoEscalations;
        }

        async function loadPendingReports() {
          if (!${isAdminUser}) return;
          const res = await fetch('/api/reports/pending?limit=20');
          const data = await res.json();
          
          if (data.reports.length === 0) {
            document.getElementById('pending-reports').innerHTML = '<p style="color:#666">No pending reports</p>';
            return;
          }

          const html = \`
            <table>
              <thead>
                <tr>
                  <th>Detected</th>
                  <th>Casino</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Confidence</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                \${data.reports.map(r => \`
                  <tr>
                    <td>\${new Date(r.detected_at).toLocaleString()}</td>
                    <td>\${r.casino_id}</td>
                    <td>\${r.anomaly_type}</td>
                    <td><span class="badge badge-\${r.severity}">\${r.severity}</span></td>
                    <td>\${(r.confidence * 100).toFixed(0)}%</td>
                    <td>\${r.reason}</td>
                    <td><a href="/review/\${r.id}" class="btn">Review</a></td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          \`;
          document.getElementById('pending-reports').innerHTML = html;
        }

        async function loadReviewRequests() {
          if (!${isAdminUser}) return;
          const res = await fetch('/api/review-requests');
          const data = await res.json();
          
          if (data.requests.length === 0) {
            document.getElementById('review-requests').innerHTML = '<p style="color:#666">No open requests</p>';
            return;
          }

          const html = \`
            <table>
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Casino</th>
                  <th>Anomaly</th>
                  <th>Severity</th>
                  <th>Requested</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                \${data.requests.map(r => \`
                  <tr>
                    <td><span class="badge badge-\${r.priority === 'critical' ? 'critical' : r.priority === 'high' ? 'warning' : 'info'}">\${r.priority}</span></td>
                    <td>\${r.casino_id}</td>
                    <td>\${r.anomaly_type}</td>
                    <td><span class="badge badge-\${r.severity}">\${r.severity}</span></td>
                    <td>\${new Date(r.requested_at).toLocaleString()}</td>
                    <td>\${r.reason || '-'}</td>
                    <td><a href="/review/\${r.report_id}" class="btn">Review</a></td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          \`;
          document.getElementById('review-requests').innerHTML = html;
        }

        // Initial load
        loadStats();
        loadPendingReports();
        loadReviewRequests();

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', async () => {
            await fetch('/auth/logout', { method: 'POST' });
            location.reload();
          });
        }

        // Refresh every 30 seconds
        setInterval(() => {
          loadStats();
          loadPendingReports();
          loadReviewRequests();
        }, 30000);

        // Wallet auth interactions
        const requestBtn = document.getElementById('requestChallenge');
        const verifyBtn = document.getElementById('verifyWallet');
        const walletInput = document.getElementById('walletAddress');
        const challengeMsg = document.getElementById('challengeMsg');
        const signatureInput = document.getElementById('signatureInput');
        const walletStatus = document.getElementById('walletStatus');
        if (requestBtn) {
          requestBtn.addEventListener('click', async () => {
            const wa = (walletInput as any).value.trim();
            walletStatus!.textContent = 'Requesting challenge...';
            const res = await fetch('/auth/wallet/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ walletAddress: wa }) });
            const data = await res.json();
            if (data.message) { (challengeMsg as any).value = data.message; walletStatus!.textContent = 'Challenge received. Sign it with your wallet.'; }
            else { walletStatus!.textContent = 'Error: ' + (data.error || 'unknown'); }
          });
        }
        if (verifyBtn) {
          verifyBtn.addEventListener('click', async () => {
            const wa = (walletInput as any).value.trim();
            const sig = (signatureInput as any).value.trim();
            walletStatus!.textContent = 'Verifying signature & NFT...';
            const res = await fetch('/auth/wallet/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ walletAddress: wa, signature: sig }) });
            const data = await res.json();
            if (data.success) { walletStatus!.textContent = 'Logged in. Reloading...'; setTimeout(() => location.reload(), 1200); }
            else { walletStatus!.textContent = 'Error: ' + (data.error || 'unknown'); }
          });
        }
      </script>
    </body>
    </html>
  `);
});

// ============================================
// Health & Metrics
// ============================================

app.get('/health', (_req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    service: 'gameplay-dashboard',
    status: 'healthy',
    anomalyEventsReceived,
    reviewsSubmitted,
    autoEscalations,
    memory: {
      rssMB: (memUsage.rss / 1024 / 1024).toFixed(2),
      heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2)
    },
    uptimeSeconds: Math.floor(process.uptime())
  });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true });
});

// ============================================
// Server Startup
// ============================================

function startServer() {
  const portChain = [
    process.env.GAMEPLAY_DASHBOARD_PORT,
    process.env.DASHBOARD_PORT,
    '8112'
  ].filter(Boolean);

  let serverStarted = false;
  let retryCount = 0;

  const tryPort = (portIndex: number) => {
    if (portIndex >= portChain.length || serverStarted) {
      if (!serverStarted) {
        console.error('[Dashboard] All ports exhausted');
        process.exit(1);
      }
      return;
    }

    const port = portChain[portIndex];
    const server = http.createServer(app);

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        retryCount++;
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        console.warn(`[Dashboard] Port ${port} in use, trying next port after ${backoffMs}ms...`);
        setTimeout(() => tryPort(portIndex + 1), backoffMs);
      } else {
        console.error('[Dashboard] Server error:', err);
      }
    });

    server.listen(Number(port), () => {
      serverStarted = true;
      console.log(`[Dashboard] Running: http://localhost:${port}`);
      console.log(`[Dashboard] API: http://localhost:${port}/api/reports/pending`);
    });
  };

  tryPort(0);
}

// Start everything
// Elevate legacy discord owners (grandfathered admin access)
try { elevateLegacyDiscordOwners(); } catch {}

subscribeToAnomalyEvents();
startServer();
