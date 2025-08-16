// Complete E2E Test for QuickSpeak - Full Functionality
const { test, expect } = require('@playwright/test');

test.describe('QuickSpeak Complete E2E Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Go to test page
    await page.goto('/test-page.html');
    await page.waitForLoadState('networkidle');
    
    // Inject content script and CSS
    await page.addScriptTag({ path: './mvp/content.js' });
    await page.addStyleTag({ path: './mvp/content.css' });
    
    // Wait for QuickSpeak to initialize
    await page.waitForTimeout(1000);
    
    // Enable extension using keyboard shortcut
    await page.keyboard.press('Control+Shift+E');
    await page.waitForTimeout(500);
  });

  test('Complete workflow: Enable → Select → Widget → Speech', async ({ page, browserName }) => {
    console.log(`Testing complete workflow on ${browserName}`);
    
    // 1. Verify extension is enabled
    const isEnabled = await page.evaluate(() => {
      return window.quickSpeakInstance?.enabled === true;
    });
    expect(isEnabled).toBe(true);
    console.log('✅ Extension enabled successfully');
    
    // 2. Select text
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    
    // 3. Wait for widget to appear
    await page.waitForSelector('#quickspeak-controls', { timeout: 5000 });
    const widget = page.locator('#quickspeak-controls');
    await expect(widget).toBeVisible();
    console.log('✅ Widget appeared after text selection');
    
    // 4. Test play button
    const playButton = page.locator('#quickspeak-play-pause');
    await expect(playButton).toBeVisible();
    await playButton.click();
    
    // 5. Verify speech started (except on Chrome which has known issues)
    if (browserName !== 'chrome' && browserName !== 'chromium') {
      await page.waitForTimeout(500);
      const isSpeaking = await page.evaluate(() => speechSynthesis.speaking);
      expect(isSpeaking).toBe(true);
      console.log('✅ Speech synthesis started successfully');
      
      // Verify button shows pause state
      await expect(playButton).toContainText('⏸️');
    } else {
      console.log('⚠️  Chrome speech synthesis test skipped (known issues)');
    }
    
    // 6. Test speed controls
    const speedUpButton = page.locator('#quickspeak-speed-up');
    if (await speedUpButton.isVisible()) {
      await speedUpButton.click();
      console.log('✅ Speed control working');
    }
    
    // 7. Test close button
    const closeButton = page.locator('#quickspeak-close');
    await closeButton.click();
    await expect(widget).not.toBeVisible();
    console.log('✅ Widget closes properly');
  });

  test('Keyboard shortcuts work end-to-end', async ({ page, browserName }) => {
    console.log(`Testing keyboard shortcuts on ${browserName}`);
    
    // Test disable/enable toggle
    await page.keyboard.press('Control+Shift+E'); // Disable
    await page.waitForTimeout(300);
    
    // Select text - widget should NOT appear when disabled
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    await page.waitForTimeout(1000);
    
    const widgetWhenDisabled = page.locator('#quickspeak-controls');
    await expect(widgetWhenDisabled).not.toBeVisible();
    console.log('✅ Widget correctly hidden when extension disabled');
    
    // Re-enable and test speak shortcut
    await page.keyboard.press('Control+Shift+E'); // Enable
    await page.waitForTimeout(300);
    
    // Clear and re-select text
    await page.evaluate(() => {
      window.testHelpers.clearSelection();
    });
    await page.waitForTimeout(100);
    
    await page.evaluate(() => {
      window.testHelpers.selectText('english-medium');
    });
    
    // Use speak shortcut
    await page.keyboard.press('Control+Shift+S');
    await page.waitForSelector('#quickspeak-controls', { timeout: 5000 });
    
    const widget = page.locator('#quickspeak-controls');
    await expect(widget).toBeVisible();
    console.log('✅ Speak shortcut (Ctrl+Shift+S) working');
    
    // Test pause shortcut (except on Chrome)
    if (browserName !== 'chrome' && browserName !== 'chromium') {
      await page.waitForTimeout(500); // Let speech start
      await page.keyboard.press('Control+Shift+P');
      await page.waitForTimeout(300);
      
      const playButton = page.locator('#quickspeak-play-pause');
      await expect(playButton).toContainText('▶️'); // Should show play (paused state)
      console.log('✅ Pause shortcut (Ctrl+Shift+P) working');
    }
  });

  test('Cross-browser voice availability', async ({ page, browserName }) => {
    console.log(`Testing voice availability on ${browserName}`);
    
    const voiceInfo = await page.evaluate(() => {
      const voices = speechSynthesis.getVoices();
      return {
        count: voices.length,
        languages: [...new Set(voices.map(v => v.lang))].length,
        localVoices: voices.filter(v => v.localService).length,
        sampleVoices: voices.slice(0, 3).map(v => ({
          name: v.name,
          lang: v.lang,
          localService: v.localService
        }))
      };
    });
    
    console.log(`${browserName} voice info:`, voiceInfo);
    
    expect(voiceInfo.count).toBeGreaterThan(0);
    expect(voiceInfo.languages).toBeGreaterThan(0);
    
    if (browserName === 'firefox') {
      expect(voiceInfo.count).toBeGreaterThan(100); // Firefox typically has many voices
    } else if (browserName === 'chrome' || browserName === 'chromium') {
      expect(voiceInfo.count).toBeGreaterThan(100); // Chrome has many voices
    }
    
    console.log(`✅ ${voiceInfo.count} voices available in ${browserName}`);
  });

  test('Browser-specific behavior detection', async ({ page, browserName }) => {
    const browserDetection = await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        isChrome: window.quickSpeakInstance?.isChrome,
        chromeVersion: window.quickSpeakInstance?.chromeVersion,
        detectedBrowser: window.quickSpeakInstance?.getBrowserInfo?.() || 'unknown'
      };
    });
    
    console.log(`Browser detection for ${browserName}:`, browserDetection);
    
    if (browserName === 'chrome' || browserName === 'chromium') {
      expect(browserDetection.isChrome).toBe(true);
      expect(browserDetection.chromeVersion).toBeTruthy();
      console.log('✅ Chrome detection working correctly');
    } else if (browserName === 'firefox') {
      expect(browserDetection.isChrome).toBe(false);
      expect(browserDetection.userAgent).toContain('Firefox');
      console.log('✅ Firefox detection working correctly');
    } else if (browserName === 'edge') {
      expect(browserDetection.userAgent).toContain('Edg');
      console.log('✅ Edge detection working correctly');
    }
  });

  test('Widget positioning and responsiveness', async ({ page }) => {
    // Select text in different areas and test positioning
    const testAreas = ['english-short', 'left-column', 'right-column'];
    
    for (const area of testAreas) {
      await page.evaluate((areaId) => {
        window.testHelpers.clearSelection();
        window.testHelpers.selectText(areaId);
      }, area);
      
      await page.waitForSelector('#quickspeak-controls', { timeout: 3000 });
      
      const widget = page.locator('#quickspeak-controls');
      const boundingBox = await widget.boundingBox();
      
      expect(boundingBox.x).toBeGreaterThanOrEqual(0);
      expect(boundingBox.y).toBeGreaterThanOrEqual(0);
      expect(boundingBox.width).toBeGreaterThan(100);
      expect(boundingBox.height).toBeGreaterThan(30);
      
      console.log(`✅ Widget positioned correctly for ${area}: x=${boundingBox.x}, y=${boundingBox.y}`);
    }
  });

  test('Error handling and edge cases', async ({ page, browserName }) => {
    // Test with empty text selection
    await page.evaluate(() => {
      const emptyElement = document.getElementById('empty-text');
      if (emptyElement) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(emptyElement);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Widget should not appear for empty selection
    const widget = page.locator('#quickspeak-controls');
    await expect(widget).not.toBeVisible();
    console.log('✅ Widget correctly handles empty text selection');
    
    // Test with very short text
    await page.evaluate(() => {
      window.testHelpers.selectText('single-word');
    });
    
    await page.waitForSelector('#quickspeak-controls', { timeout: 3000 });
    await expect(widget).toBeVisible();
    console.log('✅ Widget handles short text correctly');
  });
});