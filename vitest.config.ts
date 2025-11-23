import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const r = (p: string) => path.resolve(__dirname, p);
const isCI = process.env.CI === 'true';

export default defineConfig({
  resolve: {
    alias: {
      '@tiltcheck/event-router': r('services/event-router/src/index.ts'),
      '@tiltcheck/types': r('packages/types/src/index.ts'),
      '@tiltcheck/discord-utils': r('packages/discord-utils/src/index.ts'),
      '@tiltcheck/database': r('packages/database/src/index.ts'),
      '@tiltcheck/suslink': r('modules/suslink/src/index.ts'),
      '@tiltcheck/test-utils': r('packages/test-utils/src/index.ts'),
      '@tiltcheck/collectclock': r('modules/collectclock/src/index.ts'),
      '@tiltcheck/pricing-oracle': r('services/pricing-oracle/src/index.ts'),
      '@tiltcheck/identity-core': r('packages/identity-core/dist/index.js'),
    },
  },
  test: {
    include: [
      'tests/**/*.test.{ts,tsx}',
      'apps/**/*.test.{ts,tsx}',
      'modules/**/*.test.{ts,tsx}',
      'services/**/*.test.{ts,tsx}',
      'packages/**/*.test.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      'apps/**/node_modules/**',
      'modules/**/node_modules/**',
      'services/**/node_modules/**',
      'packages/**/node_modules/**',
      '**/dist/**',
      '**/.*/**',
    ],
    environment: 'node',
    env: {
      TRUST_ROLLUP_SNAPSHOT_DIR: r('.test-data'),
    },
    coverage: {
      reporter: ['text', 'html'],
      provider: 'v8',
      reportsDirectory: './coverage',
      include: [
        'apps/**/src/**/*.{ts,tsx}',
        'modules/**/src/**/*.{ts,tsx}',
        'services/**/src/**/*.{ts,tsx}',
        'packages/**/src/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/dist/**',
        '**/src/index.ts',
        '**/src/index.tsx',
        '**/*.d.ts',
        // Exclude placeholder and app code until tests are added (apps only for now)
        'apps/**',
        'packages/database/**',
      ],
      thresholds: isCI
        ? {
            lines: 65,
            statements: 65,
            functions: 55,
            branches: 55,
          }
        : undefined,
    },
    setupFiles: ['packages/test-utils/src/setup.ts']
  },
});
