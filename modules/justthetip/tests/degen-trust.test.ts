import { describe, it, expect, beforeEach } from 'vitest';
import { JustTheTipModule } from '../src/justthetip-module';
import { eventRouter } from '@tiltcheck/event-router';

let moduleInstance: JustTheTipModule;

describe('JustTheTip tip lifecycle events', () => {
  beforeEach(() => {
    moduleInstance = new JustTheTipModule();
    eventRouter.clearHistory();
  });

  it('emits tip.initiated and tip.completed on successful tip flow', async () => {
    await moduleInstance.registerWallet('senderDegen', 'SenderWalletAddr', 'phantom');
    await moduleInstance.registerWallet('recipientDegen', 'RecipientWalletAddr', 'magic');
    const tip = await moduleInstance.initiateTip('senderDegen', 'recipientDegen', 2.00);
    await moduleInstance.completeTip(tip.id, 'SigDegen');
    const initiated = eventRouter.getHistory({ eventType: 'tip.initiated' });
    const completed = eventRouter.getHistory({ eventType: 'tip.completed' });
    expect(initiated.length).toBeGreaterThanOrEqual(1);
    expect(completed.length).toBeGreaterThanOrEqual(1);
    expect(completed[0].data.status).toBe('completed');
  });
});
