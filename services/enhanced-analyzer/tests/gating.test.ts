import { describe, it, expect } from 'vitest';

describe('enhanced-analyzer gating', () => {
  it('does not create analyzer instance when BUILD_SKIP_LISTEN=1', async () => {
    process.env.BUILD_SKIP_LISTEN = '1';
    const mod = await import('../src/index.ts');
    expect(mod.enhancedAnalyzer).toBeUndefined();
  });
});