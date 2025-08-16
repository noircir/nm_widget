// Playwright Configuration for QuickSpeak Cross-Browser Testing
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'brave',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome', // Brave uses Chromium engine
        launchOptions: {
          executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', // macOS path
          args: [
            '--disable-extensions-except=./mvp',
            '--load-extension=./mvp',
            '--disable-features=VizDisplayCompositor'
          ]
        }
      },
    },
    
    {
      name: 'chrome',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-extensions-except=./mvp',
            '--load-extension=./mvp',
            '--disable-features=VizDisplayCompositor'
          ]
        }
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'extensions.autoDisableScopes': 0,
            'extensions.enabledScopes': 15,
          }
        }
      },
    },

    {
      name: 'edge',
      use: { 
        ...devices['Desktop Edge'],
        launchOptions: {
          args: [
            '--disable-extensions-except=./mvp',
            '--load-extension=./mvp'
          ]
        }
      },
    },

    {
      name: 'safari',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npx http-server tests/fixtures -p 8080',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
});