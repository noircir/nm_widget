import { defineConfig, devices } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Playwright Configuration for NativeMimic v4.0 Browser Extension
 * 
 * Focuses on preventing UI breakages like those in v3.16 by testing:
 * - Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
 * - Browser extension functionality
 * - Real user workflows end-to-end
 * - Regression scenarios from v3.16
 */
export default defineConfig({
  testDir: '../',
  testMatch: [
    '**/e2e/**/*.spec.ts',
    '**/e2e/**/*.test.ts',
    '**/*.e2e.test.ts'
  ],
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 2,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: '../../../../playwright-report' }],
    ['json', { outputFile: '../../../../test-results/results.json' }],
    ['junit', { outputFile: '../../../../test-results/junit.xml' }],
    ['line']
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Browser context options */
    ignoreHTTPSErrors: true,
    
    /* Custom timeout for actions */
    actionTimeout: 10000,
    
    /* Navigation timeout */
    navigationTimeout: 30000
  },

  /* Configure projects for major browsers and extension testing */
  projects: [
    // Setup project for browser extension
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Chrome Extension Testing
    {
      name: 'chrome-extension',
      use: { 
        ...devices['Desktop Chrome'],
        // Chrome extension specific settings
        launchOptions: {
          args: [
            '--disable-extensions-except=../../../../dist',
            '--load-extension=../../../../dist',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        }
      },
      dependencies: ['setup'],
      testMatch: [
        '**/e2e/extension/**/*.spec.ts',
        '**/e2e/chrome/**/*.spec.ts'
      ]
    },

    // Firefox Extension Testing  
    {
      name: 'firefox-extension',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'xpinstall.signatures.required': false,
            'extensions.autoDisableScopes': 0
          }
        }
      },
      dependencies: ['setup'],
      testMatch: [
        '**/e2e/extension/**/*.spec.ts',
        '**/e2e/firefox/**/*.spec.ts'
      ]
    },

    // Safari Testing (limited extension support)
    {
      name: 'safari',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
      testMatch: [
        '**/e2e/web/**/*.spec.ts',
        '**/e2e/safari/**/*.spec.ts'
      ]
    },

    // Edge Extension Testing
    {
      name: 'edge-extension',
      use: { 
        ...devices['Desktop Edge'],
        launchOptions: {
          args: [
            '--disable-extensions-except=../../../../dist',
            '--load-extension=../../../../dist'
          ]
        }
      },
      dependencies: ['setup'],
      testMatch: [
        '**/e2e/extension/**/*.spec.ts',
        '**/e2e/edge/**/*.spec.ts'
      ]
    },

    // Mobile Chrome (for responsive testing)
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
      testMatch: [
        '**/e2e/mobile/**/*.spec.ts'
      ]
    },

    // Cross-browser compatibility tests
    {
      name: 'compatibility',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testMatch: [
        '**/e2e/compatibility/**/*.spec.ts',
        '**/compatibility.spec.ts'
      ]
    },

    // Regression tests for v3.16 issues
    {
      name: 'regression',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testMatch: [
        '**/e2e/regression/**/*.spec.ts',
        '**/regression.spec.ts'
      ]
    },

    // Performance tests
    {
      name: 'performance',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testMatch: [
        '**/e2e/performance/**/*.spec.ts',
        '**/performance.spec.ts'
      ]
    }
  ],

  /* Global setup and teardown */
  globalSetup: resolve(__dirname, '../setup/global.setup.ts'),
  globalTeardown: resolve(__dirname, '../setup/global.teardown.ts'),

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: '../../../../test-results/',

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run setup:test-env',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    }
  ],

  /* Test timeouts */
  timeout: 60000,
  expect: {
    timeout: 10000
  },

  /* Test directories */
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/v3_31_backup/**'
  ]
});