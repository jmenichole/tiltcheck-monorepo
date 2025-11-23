import { describe, it, expect, beforeEach } from 'vitest';
import { JustTheTipModule } from '../src/index';
import { pricingOracle } from '@tiltcheck/pricing-oracle';
import { expectEvent } from '@tiltcheck/test-utils';

let mod: JustTheTipModule;

describe('JustTheTip Swap Hardening', () => {
  beforeEach(() => {
    mod = new JustTheTipModule();
    // events auto-reset via global setup
    // Ensure deterministic prices
    pricingOracle.setUsdPrice('SOL', 200);
    pricingOracle.setUsdPrice('USDC', 1);
    mod.registerWallet('senderHard', 'senderWalletHard', 'phantom');
    mod.registerWallet('recipientHard', 'recipientWalletHard', 'magic');
  });

  it('produces extended quote fields with fees and slippage data', async () => {
    const { quote } = await mod.initiateTokenTip('senderHard', 'recipientHard', 10, 'USDC', {
      slippageBps: 50,
      platformFeeBps: 25,
      networkFeeLamports: 5000,
    });

    // Basic structure
    expect(quote.inputMint).toBe('USDC');
    expect(quote.outputMint).toBe('SOL');
    expect(quote.estimatedOutputAmount).toBeGreaterThan(0);

    // Hardened fields
    expect(quote.minOutputAmount).toBeLessThan(quote.estimatedOutputAmount);
    expect(quote.platformFeeBps).toBe(25);
    expect(quote.slippageBps).toBe(50);
    expect(quote.networkFeeLamports).toBe(5000);
    expect(quote.finalOutputAfterFees).toBeLessThan(quote.estimatedOutputAmount);

    // Event published
    expectEvent('swap.quote', e => e.data.minOutputAmount !== undefined);
  });

  it('completes swap with recalculated fee deductions', async () => {
    const { quote } = await mod.initiateTokenTip('senderHard', 'recipientHard', 10, 'USDC', {
      slippageBps: 50,
      platformFeeBps: 25,
      networkFeeLamports: 5000,
    });
    const execution = await mod.executeSwap('senderHard', quote.id);

    expect(execution.status).toBe('completed');
    expect(execution.realizedOutput).toBeLessThanOrEqual(quote.estimatedOutputAmount);
    expect(execution.finalOutputAfterFees).toBeLessThan(execution.realizedOutput);

    expectEvent('swap.completed', e => e.data.finalOutputAfterFees !== undefined);
  });

  it('emits swap.failed when slippage exceeds tolerance', async () => {
    // Choose slippage tolerance (25 bps) low enough to trigger failure with 0.5% simulated loss
    const { quote } = await mod.initiateTokenTip('senderHard', 'recipientHard', 10, 'USDC', {
      slippageBps: 25,
      platformFeeBps: 25,
      networkFeeLamports: 5000,
    });
    const result = await mod.executeSwap('senderHard', quote.id);

    if (result.status === 'completed') {
      // If not failed (unexpected), force a test failure
      throw new Error('Expected swap to fail due to slippage breach');
    }
    expect(result.status).toBe('failed');
    expectEvent('swap.failed', e => e.data.reason === 'Slippage exceeded tolerance');
  });
});
