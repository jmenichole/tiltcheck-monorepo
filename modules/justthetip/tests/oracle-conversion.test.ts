import { describe, it, expect, beforeEach } from 'vitest';
import { pricingOracle } from '@tiltcheck/pricing-oracle';

describe('Pricing Oracle Conversions', () => {
  beforeEach(() => {
    pricingOracle.setUsdPrice('SOL', 200); // deterministic baseline
  });

  it('converts USD to SOL using current SOL price', () => {
    pricingOracle.setUsdPrice('SOL', 250);
    const sol = pricingOracle.convertUsdToSol(25); // 25 / 250 = 0.1
    expect(sol).toBeCloseTo(0.1);
  });

  it('converts SOL to USD using current SOL price', () => {
    pricingOracle.setUsdPrice('SOL', 180);
    const usd = pricingOracle.convertSolToUsd(0.5); // 0.5 * 180 = 90
    expect(usd).toBeCloseTo(90);
  });

  it('returns 0 for conversions when price is missing', () => {
    pricingOracle.setUsdPrice('SOL', 0); // simulate missing price
    expect(pricingOracle.convertUsdToSol(10)).toBe(0);
    expect(pricingOracle.convertSolToUsd(1)).toBe(0);
  });
});
