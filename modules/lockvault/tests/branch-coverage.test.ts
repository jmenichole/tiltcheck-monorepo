import { describe, it, expect } from 'vitest';
import { lockVault, unlockVault, extendVault, getVaultStatus, vaultManager } from '../src/vault-manager';

describe('LockVault branch coverage', () => {
  const userId = 'lvUser';

  it('rejects invalid duration format', () => {
    expect(() => lockVault({ userId, amountRaw: '5', durationRaw: '10x' })).toThrow(/Invalid duration/);
  });

  it('rejects duration below minimum', () => {
    expect(() => lockVault({ userId, amountRaw: '5', durationRaw: '5m' })).toThrow(/Minimum lock/);
  });

  it('rejects duration above maximum', () => {
    expect(() => lockVault({ userId, amountRaw: '5', durationRaw: '40d' })).toThrow(/Maximum lock/);
  });

  it('locks then prevents early unlock until unlockAt passed', () => {
    const record = lockVault({ userId, amountRaw: '10', durationRaw: '10m' });
    expect(record.status).toBe('locked');
    expect(() => unlockVault(userId, record.id)).toThrow(/Cannot unlock yet/);
  });

  it('extend updates unlockAt and status', () => {
    const record = lockVault({ userId, amountRaw: '3', durationRaw: '10m' });
    const prevUnlock = record.unlockAt;
    const extended = extendVault(userId, record.id, '10m');
    expect(extended.unlockAt).toBeGreaterThan(prevUnlock);
    expect(extended.status).toBe('extended');
  });

  it('cannot extend after unlocked', () => {
    const record = lockVault({ userId, amountRaw: '1', durationRaw: '10m' });
    // Force unlock by manipulating internal state
    record.unlockAt = Date.now() - 1000; // cheat for test
    const unlocked = unlockVault(userId, record.id);
    expect(unlocked.status).toBe('unlocked');
    expect(() => extendVault(userId, record.id, '10m')).toThrow(/Cannot extend/);
  });

  it('status lists user vaults ordered by unlockAt', () => {
    vaultManager.clearAll();
    const r1 = lockVault({ userId, amountRaw: '2', durationRaw: '10m' });
    const r2 = lockVault({ userId, amountRaw: '3', durationRaw: '12m' });
    const list = getVaultStatus(userId);
    expect(list.length).toBe(2);
    expect(list[0].unlockAt).toBeLessThan(list[1].unlockAt);
  });
});
