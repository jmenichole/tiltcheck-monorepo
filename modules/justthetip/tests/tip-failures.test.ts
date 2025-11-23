import { describe, it, expect, beforeEach } from 'vitest';
import { JustTheTipModule } from '../src/justthetip-module';
import { eventRouter } from '@tiltcheck/event-router';

let moduleInstance: JustTheTipModule;

describe('JustTheTipModule - Failure & Pending Tip Paths', () => {
  beforeEach(() => {
    moduleInstance = new JustTheTipModule();
    eventRouter.clearHistory();
    // Register only sender wallet initially
    moduleInstance.registerWallet('senderFail', 'SenderWalletAddr', 'phantom');
  });

  it('rejects initiation below minimum USD amount', async () => {
    await expect(moduleInstance.initiateTip('senderFail', 'recipientFail', 0.05, 'USD'))
      .rejects.toThrow(/Amount must be between/);
  });

  it('creates pending tip when recipient has no wallet and resolves after wallet registration', async () => {
    const tip = await moduleInstance.initiateTip('senderFail', 'recipientNoWallet', 1, 'USD');
    expect(tip.status).toBe('pending');
    expect(tip.recipientWallet).toBeUndefined();
    const pendingBefore = moduleInstance.getPendingTipsForUser('recipientNoWallet');
    expect(pendingBefore.find(t => t.id === tip.id)).toBeDefined();

    // Register recipient wallet → should emit tip.pending.resolved
    await moduleInstance.registerWallet('recipientNoWallet', 'RecipientWalletAddr', 'magic');
    const resolvedEvents = eventRouter.getHistory({ eventType: 'tip.pending.resolved' });
    expect(resolvedEvents.length).toBe(1);
    expect(resolvedEvents[0].data.count).toBeGreaterThanOrEqual(1);
    const pendingAfter = moduleInstance.getPendingTipsForUser('recipientNoWallet');
    expect(pendingAfter.length).toBe(0);
  });

  it('completeTip with unknown id throws Tip not found', async () => {
    await expect(moduleInstance.completeTip('non-existent', 'fake-signature')).rejects.toThrow(/Tip not found/);
  });

  it('executeSwap throws when sender wallet missing', async () => {
    // Create a fresh instance without registering sender wallet
    const noSenderInstance = new JustTheTipModule();
    eventRouter.clearHistory();
    // Register only recipient wallet
    noSenderInstance.registerWallet('recipientSwapOnly', 'RecipientWalletSwap', 'phantom');
    await expect(noSenderInstance.initiateTokenTip('missingSender', 'recipientSwapOnly', 5, 'USDC'))
      .rejects.toThrow(/Sender wallet not registered/);
  });

  it('produces swap.failed when slippage tolerance lower than simulated loss', async () => {
    moduleInstance.registerWallet('recipientSwap', 'RecipientSwapWallet', 'magic');
    const { quote } = await moduleInstance.initiateTokenTip('senderFail', 'recipientSwap', 3, 'USDC', { slippageBps: 10 });
    const result = await moduleInstance.executeSwap('senderFail', quote.id);
    expect(result.status).toBe('failed');
    const failedEvents = eventRouter.getHistory({ eventType: 'swap.failed' });
    expect(failedEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('does not emit anomaly events for standard flows (placeholder until anomaly implemented)', async () => {
    moduleInstance.registerWallet('recipientAnom', 'RecipientAnomalyWallet', 'magic');
    const tip = await moduleInstance.initiateTip('senderFail', 'recipientAnom', 2, 'USD');
    expect(tip.status).toBe('pending');
    const history = eventRouter.getHistory();
    const anomalyEvents = history.filter(h => h.type.startsWith('tip.anomaly'));
    expect(anomalyEvents.length).toBe(0);
  });
});
