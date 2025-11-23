# 17 - LockVault Module Spec

Disposable Magic-style wallets used as *intentional friction* devices to prevent tilt-driven bankroll nuking. IMPORTANT: The system NEVER locks a player's existing primary wallet or forcibly restricts their assets. In the current MVP no funds are programmatically moved or frozen; a "lock" is a voluntary advisory record (cool-down commitment) the user chooses to honor.

## Rationale
Tilt moments drive impulsive, high-risk actions. By encouraging players to proactively time-lock a portion of their assets, we reduce harm without custodial control. Vault wallets are generated per lock (Keypair for MVP; Magic integration later) and never reused.

## Core Principles
- Non-custodial: TiltCheck never holds or freezes user assets. Any cooldown wallet is user-generated and user-controlled.
- Advisory timers: `unlockAt` is a recommended earliest withdrawal target, not a protocol-level lock. User can disregard (we log adherence rates later, but never block transactions).
- Simple mental model: "Parking funds until Future Me is calmer.".
- Event-driven: all actions create auditable, transparency-focused events.
- Cheap infra: JSON persistence; no DB requirement initially.
- Irreversible freeze prevention: No code path will be added that can immobilize a user's primary wallet or intercept their outbound transfers.

## Commands (Discord)
Primary wording uses "cooldown" (legacy alias: `lock`).
```
/vault cooldown amount:<"5 SOL"|"$100"|"all"> duration:<"24h"|"3d"|"90m"> reason:<optional>
/vault status
/vault extend id:<vaultId> additional:<duration>
/vault unlock id:<vaultId>
```

## Event Types (proposed)
- vault.locked
- vault.extended
- vault.unlocked
(For now cast as `any` until types package updated.)

## Data Model
```
LockVaultRecord {
  id: string;                // unique vault id
  userId: string;            // Discord user
  vaultAddress: string;      // ephemeral wallet public key
  createdAt: number;
  unlockAt: number;          // ms epoch
  lockedAmountSOL: number;   // normalized SOL (0 => ALL snapshot)
  originalInput: string;     // raw amount input
  status: 'locked' | 'extended' | 'unlock-requested' | 'unlocked' | 'emergency-unlocked';
  reason?: string;           // user-provided rationale
  extendedCount: number;     // how many times extended
  history: { ts: number; action: string; note?: string }[];
}
```

## Duration Parsing
MVP supports shorthand: `30m`, `12h`, `3d`. Min 10m, Max 30d.

## Amount Parsing
Natural language via existing parser. USD treated 1:1 to SOL until oracle integration. `all` stores `0` as sentinel.

## Persistence Strategy
- JSON file at `data/lockvault.json` (override via `LOCKVAULT_STORE_PATH`).
- Debounced writes (250ms) after mutating operations.
- On startup load existing vault records.

## Security / Trust Considerations
- No private key persistence of generated cooldown wallets in MVP.
- No ability to freeze / custody user funds—design intentionally excludes any signing abstraction that could revoke user control.
- Real SOL self-transfer (optional future) MUST remain a user-initiated signed transaction directly from their wallet; LockVault will never gain authority over funds.
- Early unlock penalty will be reputational / analytic only (no asset gating).
- Emergency unlock concept, if added, will still be user-driven and never require platform approval.

## Roadmap Enhancements
1. USD/SOL conversion via pricing oracle.
2. Optional self-transfer helper UI (user signs to move funds to their own cooldown wallet; still no platform custody or freeze powers).
3. Multi-user consensus encouragement (group cooldown commitments; still advisory records only).
4. Automated tilt triggers (suggest advisory locks based on behavior).
5. Analytics: average cooldown duration, extension frequency, adherence vs early exit rate.
6. "Soft lock" integration: internally suppress high-risk commands while advisory lock active—never blocking direct user wallet usage elsewhere.

## Anti-Patterns Avoided
- No custodial balance ledger.
- No hidden override mechanism (because nothing is actually frozen).
- No capability to intercept or veto a user's transactions.
- No reliance on centralized session state.

## Integration Points
- Discord bot commands (added in `/apps/discord-bot/src/commands/lockvault.ts`).
- EventRouter event emissions for telemetry & daily rollup inclusion.
- Natural language parser for user-friendly amounts/durations.

## Future Type Integration
Add new event types to `@tiltcheck/types` and remove `as any` casts.
