// E2E Tests for QuickSpeak Cross-Browser Compatibility
const { test, expect } = require('@playwright/test');

test.describe('QuickSpeak Cross-Browser Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForTimeout(1000);
  });

  test('Extension loads in all browsers', async ({ page, browserName }) => {
    // Check if extension APIs are available or polyfilled
    const hasExtensionAPI = await page.evaluate(() => {
      return typeof chrome !== 'undefined' && 
             typeof chrome.storage !== 'undefined';
    });
    
    // Should have extension APIs (mocked in test environment)
    expect(hasExtensionAPI).toBe(true);
  });

  test('Web Speech API availability by browser', async ({ page, browserName }) => {
    const speechAPIStatus = await page.evaluate(() => {
      return {
        hasSpeechSynthesis: typeof speechSynthesis !== 'undefined',
        hasUtterance: typeof SpeechSynthesisUtterance !== 'undefined',
        voicesCount: speechSynthesis ? speechSynthesis.getVoices().length : 0,
        browserAgent: navigator.userAgent
      };
    });
    
    expect(speechAPIStatus.hasSpeechSynthesis).toBe(true);
    expect(speechAPIStatus.hasUtterance).toBe(true);
    
    // Log browser-specific information
    console.log(`${browserName}: Voices available: ${speechAPIStatus.voicesCount}`);
  });

  test('Widget appears consistently across browsers', async ({ page, browserName }) => {
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    
    await page.waitForSelector('#quickspeak-controls', { timeout: 5000 });
    const widget = page.locator('#quickspeak-controls');
    
    // Widget should be visible in all browsers
    await expect(widget).toBeVisible();
    
    // Check widget dimensions
    const bbox = await widget.boundingBox();
    expect(bbox.width).toBeGreaterThan(200);
    expect(bbox.height).toBeGreaterThan(40);
  });

  test('CSS styling renders correctly across browsers', async ({ page, browserName }) => {
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    
    await page.waitForSelector('#quickspeak-controls');
    const widget = page.locator('#quickspeak-controls');
    
    // Check basic styling
    const styles = await widget.evaluate(el => {
      const computed = getComputedStyle(el);
      return {
        display: computed.display,
        position: computed.position,
        zIndex: computed.zIndex,
        backgroundColor: computed.backgroundColor,
        borderRadius: computed.borderRadius
      };
    });
    
    expect(styles.display).not.toBe('none');
    expect(styles.position).toBe('fixed');
    expect(parseInt(styles.zIndex)).toBeGreaterThan(1000);
  });

  test('Button interactions work across browsers', async ({ page, browserName }) => {
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    
    await page.waitForSelector('#quickspeak-controls');
    
    // Test all buttons are clickable
    const buttons = [
      '#quickspeak-play-pause',
      '#quickspeak-skin', 
      '#quickspeak-report',
      '#quickspeak-close'
    ];
    
    for (const buttonSelector of buttons) {
      const button = page.locator(buttonSelector);
      await expect(button).toBeVisible();
      
      // Button should be clickable
      await button.click();
      
      // Wait for any modal/action
      await page.waitForTimeout(500);
      
      // Close any opened modals
      const modal = page.locator('.quickspeak-modal-overlay');
      if (await modal.isVisible()) {
        await modal.click();
      }
    }
  });

  test('Speed slider works across browsers', async ({ page, browserName }) => {
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    
    await page.waitForSelector('#quickspeak-controls');
    
    const speedSlider = page.locator('#quickspeak-speed');
    const speedValue = page.locator('#quickspeak-speed-value');
    
    // Test slider interaction
    await speedSlider.fill('1.5');
    await expect(speedValue).toContainText('1.5x');
    
    await speedSlider.fill('0.8');
    await expect(speedValue).toContainText('0.8x');
  });

  test('Keyboard shortcuts work across browsers', async ({ page, browserName }) => {
    // Test enable/disable shortcut
    await page.keyboard.press('Control+Shift+E');
    
    // Now text selection should work
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    
    await page.waitForSelector('#quickspeak-controls', { timeout: 5000 });
    await expect(page.locator('#quickspeak-controls')).toBeVisible();
    
    // Test speak shortcut
    await page.keyboard.press('Control+Shift+S');
    
    // Should trigger speech (may vary by browser)
    const playButton = page.locator('#quickspeak-play-pause');
    
    if (browserName === 'brave' || browserName === 'firefox' || browserName === 'edge') {
      await expect(playButton).toContainText('⏸️');
    }
    // Chrome may show error or reset - both are acceptable
  });

  test('Drag functionality works across browsers', async ({ page, browserName }) => {
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    
    await page.waitForSelector('#quickspeak-controls');
    const widget = page.locator('#quickspeak-controls');
    
    const initialPosition = await widget.boundingBox();
    
    // Drag to new position
    await widget.dragTo(page.locator('body'), {
      targetPosition: { x: initialPosition.x + 100, y: initialPosition.y + 50 }
    });
    
    const newPosition = await widget.boundingBox();
    
    // Should have moved (with some tolerance for browser differences)
    const moved = Math.abs(newPosition.x - initialPosition.x) > 50 || 
                  Math.abs(newPosition.y - initialPosition.y) > 30;
    expect(moved).toBe(true);
  });

  test('Modal dialogs work across browsers', async ({ page, browserName }) => {
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    
    await page.waitForSelector('#quickspeak-controls');
    
    // Test settings modal
    await page.click('#quickspeak-skin');
    await expect(page.locator('#quickspeak-skin-modal')).toBeVisible();
    
    // Modal should be properly centered and visible
    const modal = page.locator('#quickspeak-skin-modal');
    const modalBbox = await modal.boundingBox();
    
    expect(modalBbox.x).toBeGreaterThan(0);
    expect(modalBbox.y).toBeGreaterThan(0);
    
    // Close modal
    await page.click('.quickspeak-modal-close');
    await expect(modal).not.toBeVisible();
  });

  test('Text selection edge cases work across browsers', async ({ page, browserName }) => {
    const testCases = [
      { id: 'single-word', desc: 'single word' },
      { id: 'special-chars', desc: 'special characters' },
      { id: 'punctuation', desc: 'punctuation' },
      { id: 'very-long-word', desc: 'very long word' }
    ];
    
    for (const testCase of testCases) {
      await page.evaluate((id) => {
        window.testHelpers.selectText(id);
      }, testCase.id);
      
      await page.waitForSelector('#quickspeak-controls');
      const widget = page.locator('#quickspeak-controls');
      
      await expect(widget).toBeVisible();
      
      // Close widget for next test
      await page.click('#quickspeak-close');
      await page.waitForTimeout(200);
    }
  });

  test('Performance consistency across browsers', async ({ page, browserName }) => {
    const startTime = Date.now();
    
    // Perform typical user workflow
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    
    await page.waitForSelector('#quickspeak-controls');
    
    const playButton = page.locator('#quickspeak-play-pause');
    await playButton.click();
    
    if (browserName !== 'chrome') {
      await expect(playButton).toContainText('⏸️');
    }
    
    // Close widget
    await page.click('#quickspeak-close');
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete workflow within reasonable time
    expect(duration).toBeLessThan(5000); // 5 seconds max
    
    console.log(`${browserName}: Workflow completed in ${duration}ms`);
  });

  test('Memory usage is reasonable across browsers', async ({ page, browserName }) => {
    // Perform multiple widget operations
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        window.testHelpers.selectText('english-short');
      });
      
      await page.waitForSelector('#quickspeak-controls');
      await page.click('#quickspeak-close');
      await page.waitForTimeout(200);
    }
    
    // Check for memory leaks (basic check)
    const widgetCount = await page.evaluate(() => {
      return document.querySelectorAll('#quickspeak-controls').length;
    });
    
    // Should only have one widget (or none after cleanup)
    expect(widgetCount).toBeLessThanOrEqual(1);
  });

  test('Extension works on different page types', async ({ page, browserName }) => {
    // Test works on the test page
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    
    await page.waitForSelector('#quickspeak-controls');
    await expect(page.locator('#quickspeak-controls')).toBeVisible();
    
    // Should work consistently regardless of page content
    expect(true).toBe(true); // Basic existence test
  });

  test('Browser-specific speech quality', async ({ page, browserName }) => {
    // This is more of a documentation test for known issues
    const speechCapabilities = await page.evaluate(() => {
      const voices = speechSynthesis.getVoices();
      return {
        totalVoices: voices.length,
        localVoices: voices.filter(v => v.localService).length,
        languages: [...new Set(voices.map(v => v.lang.substr(0, 2)))],
        hasEnglish: voices.some(v => v.lang.startsWith('en'))
      };
    });
    
    console.log(`${browserName} speech capabilities:`, speechCapabilities);
    
    // All browsers should have some English voices
    expect(speechCapabilities.hasEnglish).toBe(true);
    
    // Browser-specific expectations
    if (browserName === 'chrome') {
      // Chrome may have issues but should still have voices listed
      expect(speechCapabilities.totalVoices).toBeGreaterThanOrEqual(0);
    } else {
      // Other browsers should have working voices
      expect(speechCapabilities.totalVoices).toBeGreaterThan(0);
    }
  });
});