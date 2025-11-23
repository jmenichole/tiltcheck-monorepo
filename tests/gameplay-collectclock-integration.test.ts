/**
 * Integration test: Gameplay Analyzer → Trust Events → CollectClock
 * Verifies that anomaly detection impacts trust scoring and bonus claims
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { eventRouter } from '@tiltcheck/event-router';
import { CollectClockService } from '@tiltcheck/collectclock';
import { addTrustSignal, getProfile } from '@tiltcheck/identity-core';
import type { GameplayAnomalyEvent } from '@tiltcheck/types';

describe('Gameplay Analyzer + CollectClock Integration', () => {
  let collectclock: CollectClockService;
  const testUserId = 'test-user-123';
  const testCasino = 'test-casino';

  beforeEach(() => {
    // Reset collectclock with trust gating enabled
    collectclock = new CollectClockService({
      trustGating: {
        enabled: true,
        minTrustScore: 30,
        trustBandLimits: {
          RED: 1,
          YELLOW: 2,
          GREEN: 5,
          PLATINUM: 10
        }
      }
    });
    
    collectclock.registerCasino(testCasino, 100);
  });

  it('should allow bonus claim for user with elevated trust score', () => {
    // Ensure trust score elevated (handle persisted previous negative signals)
    addTrustSignal(testUserId, 'tip', 'tip_activity', 0.8, 1.0);
    let profile = getProfile(testUserId);
    if (profile.trustScore <= 50) {
      // Add additional positive signal to exceed baseline
      addTrustSignal(testUserId, 'tip', 'tip_activity', 0.9, 1.0);
      profile = getProfile(testUserId);
    }
    expect(profile.trustScore).toBeGreaterThan(50);
    const claim = collectclock.claimBonus(testCasino, testUserId);
    expect(claim.userId).toBe(testUserId);
    expect(claim.amount).toBe(100);
  });

  it('should reject second bonus claim within cooldown window', () => {
    // First claim succeeds
    collectclock.claimBonus(testCasino, testUserId);
    // Immediate second claim should fail due to cooldown
    expect(() => {
      collectclock.claimBonus(testCasino, testUserId);
    }).toThrow(/Cooldown active/);
  });

  it('should record pump anomaly trust signal (may reduce score unless saturated)', () => {
    const initialProfile = getProfile(testUserId);
    const initialScore = initialProfile.trustScore;
    const initialSignalCount = initialProfile.signals.length;
    // Simulate pump detection event from gameplay analyzer
    const pumpEvent: GameplayAnomalyEvent = {
      userId: testUserId,
      casinoId: 'stake-us',
      anomalyType: 'pump',
      severity: 'critical',
      confidence: 0.9,
      metadata: {
        observedRTP: 1.15,
        baselineRTP: 0.96,
        deviationRatio: 0.198,
        windowSize: 100
      },
      reason: 'RTP elevated 19.8% above baseline in 100-spin window',
      timestamp: Date.now()
    };
    
    // Publish event (identity-core should auto-subscribe and reduce trust)
    eventRouter.publish('fairness.pump.detected', 'gameplay-analyzer', pumpEvent);
    
    // Wait for event processing
    const updatedProfile = getProfile(testUserId);
    // Ensure a new signal appended
    expect(updatedProfile.signals.length).toBeGreaterThan(initialSignalCount);
    // Find anomaly signal
    const pumpSignal = updatedProfile.signals.find((s: any) => s.metric === 'pump_detected');
    expect(pumpSignal).toBeDefined();
    // Score should be <= initial (may remain saturated at 100)
    expect(updatedProfile.trustScore).toBeLessThanOrEqual(initialScore);
  });

  it('should enforce cooldown (claim then immediate second claim fails)', () => {
    const claim1 = collectclock.claimBonus(testCasino, testUserId);
    expect(claim1.userId).toBe(testUserId);
    expect(() => collectclock.claimBonus(testCasino, testUserId)).toThrow(/Cooldown active/);
  });

  it('should publish trust.casino.updated when bonus nerf detected', async () => {
    const nerfPromise = new Promise<void>((resolve) => {
      eventRouter.subscribe('trust.casino.updated', (evt) => {
        if (evt.source === 'collectclock' && evt.data.reason?.includes('Bonus nerf')) {
          expect(evt.data.severity).toBeGreaterThan(0);
          resolve();
        }
      }, 'test-suite');
    });
    collectclock.updateBonus(testCasino, 100);
    collectclock.updateBonus(testCasino, 80);
    await nerfPromise;
  });

  it('should record win clustering anomaly signal (may reduce score unless saturated)', () => {
    const initialProfile = getProfile(testUserId);
    const initialScore = initialProfile.trustScore;
    const initialSignalCount = initialProfile.signals.length;
    // Simulate win clustering anomaly
    const clusterEvent: GameplayAnomalyEvent = {
      userId: testUserId,
      casinoId: 'stake-us',
      anomalyType: 'win_clustering',
      severity: 'warning',
      confidence: 0.75,
      metadata: {
        clusterScore: 0.82,
        windowSize: 100
      },
      reason: 'Abnormal win clustering detected',
      timestamp: Date.now()
    };
    
    eventRouter.publish('fairness.cluster.detected', 'gameplay-analyzer', clusterEvent);
    
    const updatedProfile = getProfile(testUserId);
    expect(updatedProfile.signals.length).toBeGreaterThan(initialSignalCount);
    const clusterSignal = updatedProfile.signals.find((s: any) => s.metric === 'cluster_detected');
    expect(clusterSignal).toBeDefined();
    expect(updatedProfile.trustScore).toBeLessThanOrEqual(initialScore);
  });
});
