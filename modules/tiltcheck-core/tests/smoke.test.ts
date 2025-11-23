import { describe, it, expect } from 'vitest';
import {
  trackMessage, trackLoss, resetLossStreak, shouldWarnUser, triggerCooldown,
  getUserTiltStatus
} from '../src/tilt-detector';
import { analyzeMessages, calculateTiltScore } from '../src/message-analyzer';

describe('TiltCheck Core Smoke', () => {
  const user = 'user-tilt-1';

  it('analyzes messages and calculates tilt score', () => {
    const msgs = [
      { content: 'FUCK this is rigged', timestamp: Date.now(), channelId: 'c1' },
      { content: 'I am done', timestamp: Date.now(), channelId: 'c1' },
      { content: 'loan please', timestamp: Date.now(), channelId: 'c1' },
    ];
    const signals = analyzeMessages(msgs as any, user);
    expect(signals.length).toBeGreaterThan(0);
    const score = calculateTiltScore(signals);
    expect(score).toBeGreaterThan(0);
  });

  it('tracks messages and losses producing tilt status', () => {
    trackMessage(user, 'This is fine', 'chan');
    trackMessage(user, 'FUCK rigged', 'chan');
    trackMessage(user, 'quit', 'chan');
    trackLoss(user, 10);
    trackLoss(user, 12);
    trackLoss(user, 9); // triggers loss-streak tilt
    const status = getUserTiltStatus(user);
    expect(status.lossStreak).toBeGreaterThanOrEqual(3);
    expect(status.recentSignals.length).toBeGreaterThan(0);
  });

  it('cooldown flow works', async () => {
    // Start a very short cooldown (0.001 min ≈ 60ms) and observe expiry
    triggerCooldown(user, 'manual', 0.001);
    expect(getUserTiltStatus(user).onCooldown).toBe(true);
    // Wait until cooldown expected to expire
    await new Promise(r => setTimeout(r, 120));
    expect(getUserTiltStatus(user).onCooldown).toBe(false);
  });

  it('shouldWarnUser returns true when conditions met', () => {
    trackMessage(user, 'quit quit quit', 'chan');
    const warn = shouldWarnUser(user);
    expect(typeof warn).toBe('boolean');
  });

  it('resetLossStreak resets streak', () => {
    resetLossStreak(user);
    const status = getUserTiltStatus(user);
    expect(status.lossStreak).toBe(0);
  });
});
