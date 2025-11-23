import { describe, it, expect } from 'vitest';
import { eventRouter } from '../../services/event-router/src/index';

// Basic schema contract check for a few critical event types.

describe('Contract: Event Schemas', () => {
  it('publishes swap.quote with required fields', () => {
    const data = { id: 'q1', estimatedOutputAmount: 1.23, finalOutputAfterFees: 1.10 };
    void eventRouter.publish('swap.quote', 'justthetip', data);
    const history = eventRouter.getHistory({ eventType: 'swap.quote' });
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].data.estimatedOutputAmount).toBeDefined();
    expect(history[0].data.finalOutputAfterFees).toBeDefined();
  });

  it('publishes tip.initiated with sender/recipient ids', () => {
    const data = { tipId: 't1', senderId: 'alice', recipientId: 'bob', amount: 0.5 };
    void eventRouter.publish('tip.initiated', 'justthetip', data);
    const history = eventRouter.getHistory({ eventType: 'tip.initiated' });
    expect(history[0].data.senderId).toBe('alice');
    expect(history[0].data.recipientId).toBe('bob');
  });
});
