/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: 'NativeMimic v4.0 Unit Tests',
    environment: 'happy-dom',
    setupFiles: [
      '4_INFRASTRUCTURE/4.2_testing_framework/setup/vitest.setup.ts',
      '4_INFRASTRUCTURE/4.2_testing_framework/mocks/browser-apis.mock.ts',
      '4_INFRASTRUCTURE/4.2_testing_framework/mocks/chrome-extension.mock.ts'
    ],
    include: [
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'artifacts', 
      'coverage',
      'v3_31_backup',
      '**/*.e2e.test.ts',
      '**/*.integration.test.ts',
      '**/*.performance.test.ts'
    ],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        'artifacts/',
        'v3_31_backup/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/*.test.{js,ts}',
        '**/mocks/**',
        '**/fixtures/**'
      ],
      all: true,
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95
      },
      skipFull: false
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    watchExclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'artifacts/**'
    ],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true
      }
    },
    logHeapUsage: true,
    sequence: {
      concurrent: true
    },
    // Fail fast on first test failure to prevent cascading issues
    bail: 1,
    // Custom reporters for better debugging
    reporters: [
      'verbose',
      'json',
      'html'
    ],
    outputFile: {
      json: './coverage/test-results.json',
      html: './coverage/test-results.html'
    }
  },
  resolve: {
    alias: {
      '@': resolve(process.cwd(), 'src'),
      '@core': resolve(process.cwd(), '1_CORE_PRODUCT'),
      '@platform': resolve(process.cwd(), '2_PLATFORM_INTEGRATION'),
      '@data': resolve(process.cwd(), '3_DATA_INTELLIGENCE'),
      '@infra': resolve(process.cwd(), '4_INFRASTRUCTURE'),
      '@future': resolve(process.cwd(), '5_FUTURE_EXTENSIBILITY'),
      '@tests': resolve(process.cwd(), '4_INFRASTRUCTURE/4.2_testing_framework'),
      '@mocks': resolve(process.cwd(), '4_INFRASTRUCTURE/4.2_testing_framework/mocks'),
      '@utils': resolve(process.cwd(), '4_INFRASTRUCTURE/4.2_testing_framework/utils')
    }
  },
  esbuild: {
    target: 'node18'
  }
});