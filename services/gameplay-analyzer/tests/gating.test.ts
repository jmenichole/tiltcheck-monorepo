import { describe, it, expect } from 'vitest';

describe('gameplay-analyzer gating', () => {
  it('skips network/server startup when BUILD_SKIP_LISTEN=1', async () => {
    process.env.BUILD_SKIP_LISTEN = '1';
    const start = Date.now();
    await import('../src/index.ts');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000); // should initialize quickly
  });
});