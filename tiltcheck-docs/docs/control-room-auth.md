# TiltCheck Control Room Auth & Privileged Actions

This document defines the emerging privileged action model ("Control Room") for TiltCheck.

## Goals
- Cryptographically signed actions (no silent backdoors).
- Tier-based capability gating (observer < analyst < operator < owner).
- Multi-sig for critical / destructive commands.
- Backwards compatibility toggles so existing tests are not broken during rollout.

## Current Implementation (MVP)
- Wallet-based identity (Discord optional / legacy elevation via `DISCORD_LEGACY_OWNER_IDS`).
- Session cookie (`tc_session`) after wallet signature + NFT verification.
- `users.tier` column with default `observer`.
- Tier guards via `requireTier([...])` middleware.
- Audit log table: `admin_actions` with JSON payload + actor tier.
- Multi-sig queue table: `multi_sig_queue` (status: pending | complete | executed | expired).
- Action signature challenges:
  - Request: `POST /api/admin/action-challenge { actionType, payload }` -> returns `{ nonce, message }`.
  - Sign client-side: user signs `message` with wallet.
  - Submit action including `nonce` + `signature` (enforced if `ENFORCE_ACTION_SIGNATURES=1`).

## Environment Flags
- `ENFORCE_ACTION_SIGNATURES` (0|1): If 1, all mutating endpoints require valid wallet signature challenge.
- `MULTISIG_CRITICAL_ACTIONS`: Comma list of action types expected to use multi-sig proposal path.
- `TILT_TIER_MAP`: Comma entries: `tier:cap1|cap2|cap3` (capabilities are descriptive only at MVP stage).

## Endpoints Summary
| Endpoint | Method | Tier | Signature Required (when flag=1) | Description |
|----------|--------|------|----------------------------------|-------------|
| `/api/auth/me` | GET | any authenticated | no | Returns user + tier map |
| `/api/admin/action-challenge` | POST | any authenticated | no | Issues signing challenge for an upcoming action |
| `/api/reviews` | POST | analyst+ | yes* | Submit human review |
| `/api/review-requests` | POST | analyst+ | yes* | Create review request |
| `/api/review-requests/:id/close` | POST | analyst+ | yes* | Close review request |
| `/api/admin/multisig/propose` | POST | operator+ | yes* | Create multi-sig proposal |
| `/api/admin/multisig/sign` | POST | operator+ | yes* | Add signature to proposal |
| `/api/admin/multisig/execute` | POST | owner | no (proposal already signed) | Execute completed proposal |
| `/api/admin/actions` | GET | operator+ | no | List recent audit log entries |

*Signature required only if `ENFORCE_ACTION_SIGNATURES=1`.

## Signing Format
```
TiltCheck Action
Type:<ACTION_TYPE>
Actor:<WALLET_ADDRESS>
PayloadHash:<BASE58_16BYTE_HASH>
Nonce:<NONCE_ULID>
```
- Client signs entire message (UTF-8) using wallet private key.
- Server verifies detached signature against wallet public key.
- `PayloadHash`: first 16 bytes of `sha256(JSON.stringify(payload))` (encoded base58) acts as a short commitment.
- Challenge expires in 5 minutes.

## Multi-Sig Flow
1. Operator/Owner calls `/api/admin/action-challenge` with `actionType` + payload.
2. Signs challenge, submits `/api/admin/multisig/propose` including signature + nonce.
3. Other required signers each:
   - Fetch challenge (repeat step 1 with identical payload or cached message).
   - Sign + POST `/api/admin/multisig/sign` with signature + nonce.
4. When collected signatures >= `required_signers`, status becomes `complete`.
5. Owner executes: `POST /api/admin/multisig/execute { id }`.
6. Audit entries logged for propose/sign/execute phases.

## Future Expansion (Placeholders)
- Capability enforcement per tier beyond simple endpoint gating.
- On-chain anchoring of admin_actions hash chain (integrity proofs).
- Expiry + auto-prune of stale multi-sig proposals.
- Adaptive required signers (e.g. critical action triggers dynamic escalation).
- NFT attribute-based automatic tier upgrade (read metadata field `tier`).
- Signed batch actions / atomic composite operations.
- Frontend real-time feed of pending multi-sig items.

## Backwards Compatibility
- Signature enforcement disabled by default (`ENFORCE_ACTION_SIGNATURES=0`).
- Existing tests using review endpoints continue functioning without nonce/signature until flag flipped.
- Multi-sig endpoints isolated; no existing logic depends on them.

## Security Considerations
- Replay protection: nonce invalidated after successful action or expiry.
- Short hash used only for commitment; for critical payloads consider full hash inclusion or Merkle transcript.
- Rate limiting recommended for `/api/admin/action-challenge` (future middleware).
- Multi-sig execute restricted to `owner` tier.

## Open Questions
- How to rotate signing keys (wallet migration) while retaining audit trust chain?
- Do we require a second factor (e.g. time-lock) for detector disable actions?
- Should `owner` tier modifications themselves use multi-sig? (meta-governance).

---
MVP ready; flip `ENFORCE_ACTION_SIGNATURES=1` after client integration to harden privileged pathways.
