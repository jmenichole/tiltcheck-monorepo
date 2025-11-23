import { describe, it, expect, beforeEach } from 'vitest';
import { JustTheTipModule } from '../src/justthetip-module';
import { eventRouter } from '@tiltcheck/event-router';

// Reinstantiate module for isolation (avoid state bleed from singleton in this test file)
let moduleInstance: JustTheTipModule;

describe('JustTheTipModule - Jupiter Swap Integration (Stub)', () => {
  beforeEach(() => {
    moduleInstance = new JustTheTipModule();
    eventRouter.clearHistory();
    // Register sender & recipient wallets
    moduleInstance.registerWallet('senderSwap', 'senderWalletAddress', 'phantom');
    moduleInstance.registerWallet('recipientSwap', 'recipientWalletAddress', 'magic');
  });

  it('generates a swap quote and publishes swap.quote event', async () => {
    const { quote } = await moduleInstance.initiateTokenTip('senderSwap', 'recipientSwap', 10, 'USDC');
    expect(quote.inputMint).toBe('USDC');
    expect(quote.outputMint).toBe('SOL');
    expect(quote.amountUsd).toBe(10);
    expect(quote.estimatedOutputAmount).toBeGreaterThan(0);
    const history = eventRouter.getHistory({ eventType: 'swap.quote' });
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].data.inputMint).toBe('USDC');
  });

  it('creates a token tip storing usd and sol amounts', async () => {
    const { tip } = await moduleInstance.initiateTokenTip('senderSwap', 'recipientSwap', 5, 'USDC');
    expect(tip.usdAmount).toBe(5);
    expect(tip.solAmount).toBeGreaterThan(0);
    const stored = moduleInstance.getTipsForUser('senderSwap');
    expect(stored.find(t => t.id === tip.id)).toBeDefined();
  });

  it('executes a swap and publishes swap.completed event', async () => {
    const { quote } = await moduleInstance.initiateTokenTip('senderSwap', 'recipientSwap', 2, 'USDC');
    const result = await moduleInstance.executeSwap('senderSwap', quote.id);
    expect(result.status).toBe('completed');
    const completedEvents = eventRouter.getHistory({ eventType: 'swap.completed' });
    expect(completedEvents.length).toBeGreaterThanOrEqual(1);
    expect(completedEvents[0].data.id).toBe(quote.id);
  });

  it('swap failure emits swap.failed when simulated slippage exceeds tolerance', async () => {
    // Force failure by using custom opts with very low slippage tolerance
    const { quote } = await moduleInstance.initiateTokenTip('senderSwap', 'recipientSwap', 2, 'USDC', { slippageBps: 10 });
    // executeSwap applies a fixed simulatedLossBps=50, so with slippageBps=10 it should fail
    const result = await moduleInstance.executeSwap('senderSwap', quote.id);
    expect(result.status).toBe('failed');
    const failedEvents = eventRouter.getHistory({ eventType: 'swap.failed' });
    expect(failedEvents.length).toBeGreaterThanOrEqual(1);
    expect(failedEvents[0].data.reason).toMatch(/Slippage/);
  });
});
