import { ulid } from 'ulid';
import { sign, verify, getPublicKey as edGetPublicKey, etc } from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

// Provide synchronous sha512 to noble if missing (library expects hashes.sha512Sync)
if (!(etc as any).sha512Sync) {
  // noble/hashes sha512 already returns Uint8Array; pass-through is fine
  (etc as any).sha512Sync = (msg: Uint8Array) => sha512(msg);
}
import fs from 'fs';
import path from 'path';

export interface SessionInfo {
  sessionId: string;
  userId: string;
  casinoId: string;
  expires: number;
  signature: string;
}

const sessions = new Map<string, SessionInfo>();
const SESSIONS_FILE = process.env.SESSIONS_FILE || path.resolve('data/sessions.json');

function ensureStore() {
  try { fs.mkdirSync(path.dirname(SESSIONS_FILE), { recursive: true }); } catch {}
  if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions: [] }, null, 2));
  } else {
    try {
      const raw = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
      if (Array.isArray(raw.sessions)) {
        for (const s of raw.sessions) {
          sessions.set(s.sessionId, s);
        }
      }
    } catch (e) {
      console.warn('[Session] Failed to parse existing sessions file', e);
    }
  }
}

ensureStore();

function persist() {
  const all = Array.from(sessions.values());
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions: all }, null, 2));
}

function serializeForSign(info: SessionInfo) {
  return `${info.sessionId}|${info.userId}|${info.casinoId}|${info.expires}`;
}

function getPrivateKey(): Uint8Array {
  const hex = process.env.SESSION_SIGNING_SECRET?.trim();
  if (!hex || hex.length !== 64) throw new Error('SESSION_SIGNING_SECRET missing or invalid (expected 64 hex chars)');
  return Buffer.from(hex, 'hex');
}

function derivePublicKey(): Uint8Array {
  const hex = process.env.SESSION_PUBLIC_KEY?.trim();
  if (hex && hex.length === 64) return Buffer.from(hex, 'hex');
  return edGetPublicKey(getPrivateKey());
}

export async function createSession(userId: string, casinoId: string, ttlMinutes = 30): Promise<SessionInfo> {
  const sessionId = ulid();
  const expires = Date.now() + ttlMinutes * 60_000;
  const info: SessionInfo = { sessionId, userId, casinoId, expires, signature: '' };
  const payload = serializeForSign(info);
  const priv = getPrivateKey();
  const msgBytes = Buffer.from(payload, 'utf8');
  // Debug logging for troubleshooting signing issues
  if (process.env.DEBUG_SESSION_SIGN === 'true') {
    console.log('[Session] Signing payload:', payload);
    console.log('[Session] Payload bytes length:', msgBytes.length);
    console.log('[Session] Private key length:', priv.length);
  }
  const sigBytes = await sign(msgBytes, priv);
  const signature = Buffer.from(sigBytes).toString('base64');
  info.signature = signature;
  sessions.set(sessionId, info);
  persist();
  return info;
}

// Attempt to reuse existing active session for same user + casino
export async function getOrReuseSession(userId: string, casinoId: string, ttlMinutes = 30): Promise<{ info: SessionInfo; reused: boolean }> {
  let found: SessionInfo | undefined;
  for (const s of sessions.values()) {
    if (s.userId === userId && s.casinoId === casinoId && s.expires > Date.now()) {
      found = s;
      break;
    }
  }
  if (found) return { info: found, reused: true };
  const created = await createSession(userId, casinoId, ttlMinutes);
  return { info: created, reused: false };
}

export function invalidateSession(sessionId: string) {
  sessions.delete(sessionId);
  persist();
}

export function getSession(sessionId: string): SessionInfo | undefined {
  const s = sessions.get(sessionId);
  if (!s) return undefined;
  if (s.expires < Date.now()) {
    sessions.delete(sessionId);
    return undefined;
  }
  return s;
}

export function encodeSessionToken(info: SessionInfo): string {
  // Legacy JSON token retained for backward compatibility
  return JSON.stringify(info);
}

export function encodeSessionTokenB64(info: SessionInfo): string {
  return Buffer.from(JSON.stringify(info), 'utf8').toString('base64');
}

export async function decodePossiblyBase64(token: string): Promise<SessionInfo | null> {
  // Try raw JSON first
  const direct = await verifySessionToken(token);
  if (direct) return direct;
  try {
    const jsonStr = Buffer.from(token, 'base64').toString('utf8');
    return await verifySessionToken(jsonStr);
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string): Promise<SessionInfo | null> {
  try {
    const obj = JSON.parse(token);
    if (!obj.sessionId || !obj.userId || !obj.casinoId || !obj.expires || !obj.signature) return null;
    const payload = `${obj.sessionId}|${obj.userId}|${obj.casinoId}|${obj.expires}`;
    const sig = Buffer.from(obj.signature, 'base64');
    const pub = derivePublicKey();
    const msgBytes = Buffer.from(payload, 'utf8');
    const ok = await verify(sig, msgBytes, pub);
    if (!ok) return null;
    return obj as SessionInfo;
  } catch {
    return null;
  }
}
