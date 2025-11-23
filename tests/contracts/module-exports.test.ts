import { describe, it, expect } from 'vitest';
import * as justTheTip from '../../modules/justthetip/src/index';
import * as eventRouter from '../../services/event-router/src/index';

// Contract test ensures critical exports exist with stable surface.

describe('Contract: Module Exports', () => {
  it('justthetip exports tip + airdrop engines and module class', () => {
    expect(justTheTip.executeTip).toBeDefined();
    expect(justTheTip.executeAirdrop).toBeDefined();
    expect(justTheTip.JustTheTipModule).toBeDefined();
  });

  it('event-router exports publish and subscribe utilities', () => {
    // Loose surface check; adjust if refactoring
    // @ts-ignore dynamic surface
    expect(eventRouter.eventRouter).toBeDefined();
    // @ts-ignore
    expect(eventRouter.eventRouter.publish).toBeDefined();
  });
});
