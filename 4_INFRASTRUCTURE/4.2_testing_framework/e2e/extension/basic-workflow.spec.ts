/**
 * Basic Extension Workflow E2E Tests - NativeMimic v4.0
 * 
 * End-to-end tests for core extension functionality
 * Prevents workflow failures like those in v3.16
 */

import { test, expect, chromium } from '@playwright/test';
import { ExtensionTestHelper, ExtensionTestUtils } from '@tests/utils/extension-test-helpers';

test.describe('Extension Basic Workflow', () => {
  let extensionHelper: ExtensionTestHelper;

  test.beforeEach(async () => {
    extensionHelper = new ExtensionTestHelper({
      browser: 'chrome',
      headless: false,
      timeout: 30000
    });
  });

  test.afterEach(async () => {
    await extensionHelper.cleanup();
  });

  test('should load extension and navigate to test page', async ({ browser }) => {
    // Launch browser with extension
    const { page } = await extensionHelper.launchWithExtension(browser);
    
    // Navigate to test page
    const pageInfo = await extensionHelper.navigateToTestPage();
    
    expect(pageInfo.ready).toBe(true);
    expect(pageInfo.url).toContain('localhost:3000');
    
    // Verify extension is loaded
    const extensionInfo = extensionHelper.getExtensionInfo();
    expect(extensionInfo).toBeTruthy();
    expect(extensionInfo?.name).toContain('NativeMimic');
  });

  test('should detect text selection and show widget', async ({ browser }) => {
    const { page } = await extensionHelper.launchWithExtension(browser);
    await extensionHelper.navigateToTestPage();

    // Create test page with selectable content
    await ExtensionTestUtils.createTestPage(page, {
      title: 'Text Selection Test',
      selectableText: 'This is a test sentence for TTS functionality.',
      multipleElements: false
    });

    // Select text and trigger widget
    await extensionHelper.selectTextAndTriggerWidget('[data-testid="main-text"]');

    // Wait for widget to appear
    const widgetAppeared = await extensionHelper.waitForWidget(5000);
    expect(widgetAppeared).toBe(true);

    // Verify widget state
    const widgetState = await extensionHelper.getWidgetState();
    expect(widgetState.visible).toBe(true);
    expect(widgetState.selectedText).toContain('test sentence');
  });

  test('should play TTS audio when play button clicked', async ({ browser }) => {
    const { page } = await extensionHelper.launchWithExtension(browser);
    await extensionHelper.navigateToTestPage();

    // Create test content
    await ExtensionTestUtils.createTestPage(page, {
      selectableText: 'Hello world, this is a TTS test.'
    });

    // Select text and show widget
    await extensionHelper.selectTextAndTriggerWidget('[data-testid="main-text"]');
    await extensionHelper.waitForWidget();

    // Mock audio for testing
    await page.addInitScript(() => {
      let audioPlayCalled = false;
      const originalAudio = window.Audio;
      window.Audio = class extends originalAudio {
        constructor(src?: string) {
          super(src);
          this.play = async () => {
            audioPlayCalled = true;
            (window as any).testAudioPlayed = true;
            return Promise.resolve();
          };
        }
      };
    });

    // Click play button
    await extensionHelper.clickWidgetButton('play');

    // Verify audio playback was initiated
    const audioPlayed = await page.evaluate(() => (window as any).testAudioPlayed);
    expect(audioPlayed).toBe(true);

    // Verify widget shows playing state
    const widgetState = await extensionHelper.getWidgetState();
    expect(widgetState.playing).toBe(true);
  });

  test('should close widget when close button clicked', async ({ browser }) => {
    const { page } = await extensionHelper.launchWithExtension(browser);
    await extensionHelper.navigateToTestPage();

    // Show widget
    await ExtensionTestUtils.createTestPage(page, {
      selectableText: 'Test text for closing widget.'
    });
    
    await extensionHelper.selectTextAndTriggerWidget('[data-testid="main-text"]');
    await extensionHelper.waitForWidget();

    // Verify widget is visible
    let widgetState = await extensionHelper.getWidgetState();
    expect(widgetState.visible).toBe(true);

    // Click close button
    await extensionHelper.clickWidgetButton('close');

    // Verify widget is hidden
    widgetState = await extensionHelper.getWidgetState();
    expect(widgetState.visible).toBe(false);
  });

  test('should handle multiple text selections', async ({ browser }) => {
    const { page } = await extensionHelper.launchWithExtension(browser);
    await extensionHelper.navigateToTestPage();

    // Create page with multiple selectable elements
    await ExtensionTestUtils.createTestPage(page, {
      selectableText: 'First selectable text',
      multipleElements: true
    });

    // Select first text
    await extensionHelper.selectTextAndTriggerWidget('[data-testid="main-text"]');
    await extensionHelper.waitForWidget();

    let widgetState = await extensionHelper.getWidgetState();
    expect(widgetState.selectedText).toContain('First selectable');

    // Select second text
    await extensionHelper.selectTextAndTriggerWidget('[data-testid="secondary-text"]');

    // Widget should update with new text
    widgetState = await extensionHelper.getWidgetState();
    expect(widgetState.selectedText).toContain('Secondary selectable');
  });

  test('should persist settings across page loads', async ({ browser }) => {
    const { page } = await extensionHelper.launchWithExtension(browser);
    await extensionHelper.navigateToTestPage();

    // Test storage operations
    const storageTest = await extensionHelper.testStorageOperations();
    expect(storageTest.canStore).toBe(true);
    expect(storageTest.canRetrieve).toBe(true);

    // Store test settings
    await page.evaluate(() => {
      chrome.storage.sync.set({
        'nativemimic-settings': {
          theme: 'dark',
          language: 'es',
          voiceId: 'es-ES-Wavenet-B'
        }
      });
    });

    // Navigate to new page
    await page.reload();
    await extensionHelper.waitForExtensionReady();

    // Verify settings persisted
    const settings = await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.sync.get('nativemimic-settings', (result) => {
          resolve(result['nativemimic-settings']);
        });
      });
    });

    expect(settings).toMatchObject({
      theme: 'dark',
      language: 'es',
      voiceId: 'es-ES-Wavenet-B'
    });
  });

  test('should handle background-content script communication', async ({ browser }) => {
    const { page } = await extensionHelper.launchWithExtension(browser);
    await extensionHelper.navigateToTestPage();

    // Test message passing
    const messagingTest = await extensionHelper.testMessagePassing();
    expect(messagingTest.canSendToBackground).toBe(true);
    expect(messagingTest.canReceiveFromBackground).toBe(true);

    // Test specific extension messages
    const response = await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'GET_EXTENSION_INFO' },
          (response) => resolve(response)
        );
      });
    });

    expect(response).toHaveProperty('success', true);
    expect(response).toHaveProperty('extensionId');
  });

  test('should handle errors gracefully', async ({ browser }) => {
    const { page } = await extensionHelper.launchWithExtension(browser);
    await extensionHelper.navigateToTestPage();

    // Test with invalid text selection
    await page.evaluate(() => {
      // Clear any existing selection
      window.getSelection()?.removeAllRanges();
    });

    // Try to trigger widget without selection
    await page.evaluate(() => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    // Widget should not appear for empty selection
    const widgetAppeared = await extensionHelper.waitForWidget(2000);
    expect(widgetAppeared).toBe(false);

    // Test with network error simulation
    await page.route('**/api/tts', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    // Select text and try to play
    await ExtensionTestUtils.createTestPage(page, {
      selectableText: 'Text that will fail TTS'
    });

    await extensionHelper.selectTextAndTriggerWidget('[data-testid="main-text"]');
    await extensionHelper.waitForWidget();
    await extensionHelper.clickWidgetButton('play');

    // Should handle error gracefully without crashing
    const widgetState = await extensionHelper.getWidgetState();
    expect(widgetState.visible).toBe(true); // Widget should remain visible
  });

  test('should work across different page types', async ({ browser }) => {
    const { page } = await extensionHelper.launchWithExtension(browser);

    // Test on different content types
    const testPages = [
      {
        name: 'Simple HTML',
        content: '<p>Simple paragraph text</p>'
      },
      {
        name: 'Complex Layout',
        content: `
          <div style="column-count: 2;">
            <h1>Article Title</h1>
            <p>This is a complex layout with multiple columns and formatting.</p>
            <blockquote>This is a quote within the article.</blockquote>
            <p>More paragraph content after the quote.</p>
          </div>
        `
      },
      {
        name: 'Dynamic Content',
        content: `
          <div id="dynamic-content">Loading...</div>
          <script>
            setTimeout(() => {
              document.getElementById('dynamic-content').innerHTML = 
                '<p>Dynamically loaded content for testing.</p>';
            }, 100);
          </script>
        `
      }
    ];

    for (const testPage of testPages) {
      // Set page content
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head><title>${testPage.name}</title></head>
        <body>
          ${testPage.content}
          <script>document.body.setAttribute('data-test-page-ready', 'true');</script>
        </body>
        </html>
      `);

      await page.waitForLoadState('domcontentloaded');
      await extensionHelper.waitForExtensionReady();

      // Wait for dynamic content if needed
      if (testPage.name === 'Dynamic Content') {
        await page.waitForFunction(() => 
          document.getElementById('dynamic-content')?.textContent !== 'Loading...'
        );
      }

      // Test text selection on this page type
      const textElement = await page.locator('p').first();
      if (await textElement.count() > 0) {
        await textElement.click();
        await page.keyboard.down('Shift');
        await page.keyboard.press('End');
        await page.keyboard.up('Shift');

        // Check if widget appears
        const widgetAppeared = await extensionHelper.waitForWidget(3000);
        
        // Should work on all page types
        expect(widgetAppeared).toBe(true);

        // Close widget for next test
        if (widgetAppeared) {
          await extensionHelper.clickWidgetButton('close');
        }
      }
    }
  });

  test('should maintain performance standards', async ({ browser }) => {
    const { page } = await extensionHelper.launchWithExtension(browser);
    await extensionHelper.navigateToTestPage();

    // Monitor performance during typical usage
    const performanceMetrics = await extensionHelper.monitorPerformance(5000);

    // Performance assertions
    expect(performanceMetrics.errors.length).toBe(0); // No console errors
    expect(performanceMetrics.memoryUsage).toBeLessThan(50); // Less than 50MB
    expect(performanceMetrics.renderTime).toBeLessThan(5000); // Reasonable render time

    // Test rapid interactions don't cause performance issues
    await ExtensionTestUtils.createTestPage(page, {
      selectableText: 'Performance test text',
      multipleElements: true
    });

    const startTime = Date.now();

    // Rapidly select different text elements
    for (let i = 0; i < 5; i++) {
      const selector = `[data-testid="${i === 0 ? 'main' : i === 1 ? 'secondary' : 'tertiary'}-text"]`;
      await extensionHelper.selectTextAndTriggerWidget(selector);
      await new Promise(resolve => setTimeout(resolve, 200)); // Brief pause
    }

    const rapidInteractionTime = Date.now() - startTime;
    expect(rapidInteractionTime).toBeLessThan(3000); // Should handle rapid interactions quickly
  });
});

test.describe('Extension Compatibility', () => {
  let extensionHelper: ExtensionTestHelper;

  test.beforeEach(async () => {
    extensionHelper = new ExtensionTestHelper();
  });

  test.afterEach(async () => {
    await extensionHelper.cleanup();
  });

  test('should verify browser compatibility', async ({ browser }) => {
    const { page } = await extensionHelper.launchWithExtension(browser);
    await extensionHelper.navigateToTestPage();

    const compatibility = await extensionHelper.testCompatibility();

    expect(compatibility.extensionSupported).toBe(true);
    expect(compatibility.featuresSupported.storage).toBe(true);
    expect(compatibility.featuresSupported.messaging).toBe(true);
    expect(compatibility.featuresSupported.contentScripts).toBe(true);

    // Log browser info for debugging
    console.log('Browser compatibility:', compatibility.browserInfo);
  });

  test('should verify extension security', async ({ browser }) => {
    const { page } = await extensionHelper.launchWithExtension(browser);
    await extensionHelper.navigateToTestPage();

    const security = await ExtensionTestUtils.verifyExtensionSecurity(page);

    expect(security.cspCompliant).toBe(true);
    expect(security.noInlineScripts).toBe(true);
    expect(security.errors.length).toBe(0);

    // Security errors should be logged
    if (security.errors.length > 0) {
      console.warn('Security issues detected:', security.errors);
    }
  });
});