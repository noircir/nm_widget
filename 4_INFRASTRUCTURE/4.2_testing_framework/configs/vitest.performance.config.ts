/// <reference types="vitest" />
import { defineConfig } from 'vite';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    name: 'Performance Tests',
    include: [
      '../performance_tests/**/*.test.ts',
      '../../../../**/*.performance.test.ts'
    ],
    exclude: [
      ...baseConfig.test?.exclude || [],
      '**/*.unit.test.ts',
      '**/*.integration.test.ts',
      '**/*.e2e.test.ts'
    ],
    // Performance tests need more time
    testTimeout: 60000,
    hookTimeout: 30000,
    // Single thread to get accurate performance measurements
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    setupFiles: [
      '../setup/vitest.setup.ts',
      '../setup/performance.setup.ts'
    ],
    // Disable coverage for performance tests
    coverage: {
      enabled: false
    },
    // Custom performance benchmarking
    benchmark: {
      include: ['**/*.bench.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['node_modules', 'dist', 'coverage'],
      reporters: ['verbose']
    }
  }
});