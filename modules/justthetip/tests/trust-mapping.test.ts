import { describe, it, expect, beforeEach } from 'vitest';
import { JustTheTipModule } from '../src/justthetip-module';
import { eventRouter } from '@tiltcheck/event-router';

let moduleInstance: JustTheTipModule;

describe('JustTheTip basic tip events', () => {
  beforeEach(() => {
    moduleInstance = new JustTheTipModule();
    eventRouter.clearHistory();
  });

  it('publishes tip.initiated and tip.completed with expected payload fields', async () => {
    await moduleInstance.registerWallet('sender', 'SenderWalletAddress', 'phantom');
    await moduleInstance.registerWallet('recipient', 'RecipientWalletAddress', 'magic');
    const tip = await moduleInstance.initiateTip('sender', 'recipient', 1.00);
    await moduleInstance.completeTip(tip.id, 'TestSignature');
    const initiated = eventRouter.getHistory({ eventType: 'tip.initiated' });
    const completed = eventRouter.getHistory({ eventType: 'tip.completed' });
    expect(initiated[0].data.senderId).toBe('sender');
    expect(initiated[0].data.recipientId).toBe('recipient');
    expect(completed[0].data.signature).toBeDefined();
    expect(completed[0].data.status).toBe('completed');
  });
});
