// Simple E2E Test for QuickSpeak Core Functionality
const { test, expect } = require('@playwright/test');

test.describe('QuickSpeak Core Functionality Test', () => {
  test.beforeEach(async ({ page }) => {
    // Go to test page
    await page.goto('/test-page.html');
    await page.waitForLoadState('networkidle');
    
    // Inject content script and CSS manually
    await page.addScriptTag({ path: './mvp/content.js' });
    await page.addStyleTag({ path: './mvp/content.css' });
    
    // Wait for QuickSpeak to initialize
    await page.waitForTimeout(1000);
  });

  test('Content script loads successfully', async ({ page }) => {
    // Check that QuickSpeak objects exist
    const quickSpeakLoaded = await page.evaluate(() => {
      return typeof window.QuickSpeakWidget !== 'undefined' ||
             typeof window.quickSpeakInstance !== 'undefined';
    });
    
    expect(quickSpeakLoaded).toBe(true);
  });

  test('Text selection triggers widget (when enabled)', async ({ page }) => {
    // First select text (before enabling)
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    
    // Enable extension using keyboard shortcut (Ctrl+Shift+E)
    await page.keyboard.press('Control+Shift+E');
    await page.waitForTimeout(500); // Give time for extension to enable
    
    // Verify extension is enabled
    const isEnabled = await page.evaluate(() => {
      return window.quickSpeakInstance?.enabled === true;
    });
    
    console.log('Extension enabled:', isEnabled);
    
    // Re-select text AFTER enabling the extension
    await page.evaluate(() => {
      window.testHelpers.clearSelection(); // Clear first
    });
    await page.waitForTimeout(100);
    
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short'); // Re-select
    });
    
    // Check if widget appears
    try {
      await page.waitForSelector('#quickspeak-controls', { timeout: 5000 });
      const widget = page.locator('#quickspeak-controls');
      await expect(widget).toBeVisible();
      console.log('✅ Widget appeared successfully after enabling extension');
    } catch (error) {
      // If widget doesn't appear, log the current state for debugging
      const debugInfo = await page.evaluate(() => {
        return {
          extensionEnabled: window.quickSpeakInstance?.enabled,
          quickSpeakInstance: typeof window.quickSpeakInstance,
          selectedText: window.getSelection().toString(),
          widgets: Array.from(document.querySelectorAll('[id*="quickspeak"]')).map(el => ({
            id: el.id,
            className: el.className,
            visible: el.style.display !== 'none',
            innerHTML: el.innerHTML.substring(0, 100)
          })),
          eventListeners: window.quickSpeakInstance?.hasSelectionListeners || false
        };
      });
      
      console.log('Debug info:', debugInfo);
      throw error;
    }
  });

  test('Speech synthesis API is available', async ({ page }) => {
    const speechAvailable = await page.evaluate(() => {
      return typeof speechSynthesis !== 'undefined' && 
             typeof SpeechSynthesisUtterance !== 'undefined';
    });
    
    expect(speechAvailable).toBe(true);
  });

  test('Voices are available in browser', async ({ page }) => {
    const voices = await page.evaluate(() => {
      if (typeof speechSynthesis === 'undefined') return [];
      return speechSynthesis.getVoices().map(voice => ({
        name: voice.name,
        lang: voice.lang,
        localService: voice.localService
      }));
    });
    
    console.log(`Found ${voices.length} voices:`, voices.slice(0, 3));
    expect(voices.length).toBeGreaterThan(0);
  });

  test('Browser detection works correctly', async ({ page, browserName }) => {
    const detectionInfo = await page.evaluate(() => {
      const userAgent = navigator.userAgent;
      const isChrome = userAgent.includes('Chrome') && 
                      !userAgent.includes('Brave') && 
                      !window.navigator.brave;
      
      return {
        userAgent: userAgent,
        isChrome: isChrome,
        isBrave: userAgent.includes('Brave') || !!window.navigator.brave,
        isFirefox: userAgent.includes('Firefox'),
        isEdge: userAgent.includes('Edge')
      };
    });
    
    console.log(`Browser detection for ${browserName}:`, detectionInfo);
    
    // Verify detection is working
    if (browserName === 'chrome') {
      expect(detectionInfo.isChrome).toBe(true);
    } else if (browserName === 'firefox') {
      expect(detectionInfo.isFirefox).toBe(true);
    }
  });
});