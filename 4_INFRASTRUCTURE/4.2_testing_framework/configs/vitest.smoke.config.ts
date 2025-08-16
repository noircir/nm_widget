/// <reference types="vitest" />
import { defineConfig } from 'vite';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    name: 'Smoke Tests',
    include: [
      '../smoke_tests/**/*.test.ts',
      '../../../../**/*.smoke.test.ts'
    ],
    exclude: [
      ...baseConfig.test?.exclude || [],
      '**/*.unit.test.ts',
      '**/*.integration.test.ts',
      '**/*.e2e.test.ts',
      '**/*.performance.test.ts'
    ],
    // Smoke tests should be very fast - under 10 seconds total
    testTimeout: 3000,
    hookTimeout: 2000,
    // Run smoke tests in sequence for reliability
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    // Minimal coverage for smoke tests
    coverage: {
      enabled: false
    },
    // Fail fast on any smoke test failure
    bail: 1,
    // Only show failures and summary for smoke tests
    reporters: ['basic'],
    setupFiles: [
      '../setup/vitest.setup.ts'
    ]
  }
});