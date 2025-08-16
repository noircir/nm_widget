/// <reference types="vitest" />
import { defineConfig } from 'vite';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    name: 'Unit Tests',
    include: [
      '**/1_CORE_PRODUCT/**/*.test.ts',
      '**/4_INFRASTRUCTURE/4.2_testing_framework/unit_tests/**/*.test.ts'
    ],
    exclude: [
      ...baseConfig.test?.exclude || [],
      '**/*.integration.test.ts',
      '**/*.e2e.test.ts',
      '**/*.performance.test.ts'
    ],
    // Unit tests should be fast - target under 30 seconds total
    testTimeout: 5000,
    hookTimeout: 3000,
    // Run in parallel for speed
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 2
      }
    }
  }
});