/// <reference types="vitest" />
import { defineConfig } from 'vite';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    name: 'Integration Tests',
    include: [
      '../integration_tests/**/*.test.ts',
      '../../../../**/*.integration.test.ts'
    ],
    exclude: [
      ...baseConfig.test?.exclude || [],
      '**/*.unit.test.ts',
      '**/*.e2e.test.ts',
      '**/*.performance.test.ts'
    ],
    // Integration tests can take longer
    testTimeout: 30000,
    hookTimeout: 10000,
    // Sequential execution for integration tests to avoid conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    // Don't fail fast for integration tests - we want to see all failures
    bail: 0,
    setupFiles: [
      '../setup/vitest.setup.ts',
      '../setup/integration.setup.ts',
      '../mocks/supabase.mock.ts',
      '../mocks/tts-apis.mock.ts'
    ]
  }
});