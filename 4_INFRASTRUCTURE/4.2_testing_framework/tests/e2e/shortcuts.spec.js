// E2E Tests for QuickSpeak Keyboard Shortcuts
const { test, expect } = require('@playwright/test');

test.describe('QuickSpeak Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForTimeout(1000);
  });

  test('Ctrl+Shift+E enables/disables extension', async ({ page }) => {
    // Initially extension should be disabled (default state)
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    
    // Widget should not appear when disabled
    await page.waitForTimeout(1000);
    const widgetBeforeEnable = page.locator('#quickspeak-controls');
    await expect(widgetBeforeEnable).not.toBeVisible();
    
    // Enable extension with Ctrl+Shift+E
    await page.keyboard.press('Control+Shift+E');
    
    // Now text selection should show widget
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    await page.waitForSelector('#quickspeak-controls', { timeout: 5000 });
    await expect(page.locator('#quickspeak-controls')).toBeVisible();
    
    // Disable extension with Ctrl+Shift+E
    await page.keyboard.press('Control+Shift+E');
    
    // Widget should disappear
    await expect(page.locator('#quickspeak-controls')).not.toBeVisible();
  });

  test('Ctrl+Shift+S speaks selected text', async ({ page }) => {
    // Enable extension first
    await page.keyboard.press('Control+Shift+E');
    
    // Select text
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    
    // Use keyboard shortcut to speak
    await page.keyboard.press('Control+Shift+S');
    
    // Widget should appear
    await page.waitForSelector('#quickspeak-controls');
    await expect(page.locator('#quickspeak-controls')).toBeVisible();
    
    // In working browsers, play button should show pause state
    const browserName = await page.evaluate(() => navigator.userAgent);
    if (!browserName.includes('Chrome') || browserName.includes('Brave')) {
      const playButton = page.locator('#quickspeak-play-pause');
      await expect(playButton).toContainText('⏸️');
    }
  });

  test('Ctrl+Shift+S shows message when no text selected', async ({ page }) => {
    // Enable extension
    await page.keyboard.press('Control+Shift+E');
    
    // Clear any selection
    await page.evaluate(() => {
      window.testHelpers.clearSelection();
    });
    
    // Try to speak with no selection
    await page.keyboard.press('Control+Shift+S');
    
    // Should show message about selecting text first
    await page.waitForSelector('.quickspeak-message', { timeout: 5000 });
    const message = page.locator('.quickspeak-message');
    await expect(message).toContainText('Please select some text first');
  });

  test('Ctrl+Shift+P pauses/resumes speech', async ({ page, browserName }) => {
    if (browserName === 'chrome') {
      test.skip('Chrome has known speechSynthesis issues');
    }
    
    // Enable extension and start speech
    await page.keyboard.press('Control+Shift+E');
    await page.evaluate(() => {
      window.testHelpers.selectText('english-long');
    });
    await page.keyboard.press('Control+Shift+S');
    
    await page.waitForSelector('#quickspeak-controls');
    const playButton = page.locator('#quickspeak-play-pause');
    await expect(playButton).toContainText('⏸️');
    
    // Pause with keyboard
    await page.keyboard.press('Control+Shift+P');
    await expect(playButton).toContainText('▶️');
    
    // Resume with keyboard
    await page.keyboard.press('Control+Shift+P');
    await expect(playButton).toContainText('⏸️');
  });

  test('Ctrl+Shift+P shows message when no speech active', async ({ page }) => {
    // Enable extension
    await page.keyboard.press('Control+Shift+E');
    
    // Try to pause when no speech is active
    await page.keyboard.press('Control+Shift+P');
    
    // Should show message
    await page.waitForSelector('.quickspeak-message', { timeout: 5000 });
    const message = page.locator('.quickspeak-message');
    await expect(message).toContainText('No speech to pause/resume');
  });

  test('Ctrl+Shift+ speed controls work during speech', async ({ page, browserName }) => {
    if (browserName === 'chrome') {
      test.skip('Chrome has known speechSynthesis issues');
    }
    
    // Enable extension and start speech
    await page.keyboard.press('Control+Shift+E');
    await page.evaluate(() => {
      window.testHelpers.selectText('english-long');
    });
    await page.keyboard.press('Control+Shift+S');
    
    await page.waitForSelector('#quickspeak-controls');
    const speedValue = page.locator('#quickspeak-speed-value');
    
    // Initial speed should be 1.0x
    await expect(speedValue).toContainText('1.0x');
    
    // Increase speed with Ctrl+Shift+Plus
    await page.keyboard.press('Control+Shift+Equal');
    
    // Speed should increase and show message
    await page.waitForSelector('.quickspeak-message', { timeout: 3000 });
    const message = page.locator('.quickspeak-message');
    await expect(message).toContainText('Speed: 1.1x');
    
    // Decrease speed with Ctrl+Shift+Minus
    await page.keyboard.press('Control+Shift+Minus');
    
    // Should show decreased speed message
    await page.waitForTimeout(500);
    await expect(page.locator('.quickspeak-message').last()).toContainText('Speed: 1.0x');
  });

  test('Speed shortcuts show message when no speech active', async ({ page }) => {
    // Enable extension
    await page.keyboard.press('Control+Shift+E');
    
    // Try speed control when no speech is active
    await page.keyboard.press('Control+Shift+Equal');
    
    // Should show message
    await page.waitForSelector('.quickspeak-message', { timeout: 5000 });
    const message = page.locator('.quickspeak-message');
    await expect(message).toContainText('Start speaking first to adjust speed');
  });

  test('Shortcuts work in different page contexts', async ({ page }) => {
    // Test shortcuts work in different areas of the page
    const testAreas = [
      { id: 'english-short', desc: 'main content' },
      { id: 'left-column', desc: 'left column' },
      { id: 'right-column', desc: 'right column' }
    ];
    
    // Enable extension
    await page.keyboard.press('Control+Shift+E');
    
    for (const area of testAreas) {
      // Select text in different area
      await page.evaluate((areaId) => {
        window.testHelpers.selectText(areaId);
      }, area.id);
      
      // Shortcut should work
      await page.keyboard.press('Control+Shift+S');
      await page.waitForSelector('#quickspeak-controls');
      await expect(page.locator('#quickspeak-controls')).toBeVisible();
      
      // Close widget for next test
      await page.click('#quickspeak-close');
    }
  });

  test('Shortcuts don\'t conflict with browser defaults', async ({ page }) => {
    // Enable extension
    await page.keyboard.press('Control+Shift+E');
    
    // Test that our shortcuts don't interfere with page functionality
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    
    // Our shortcuts should work
    await page.keyboard.press('Control+Shift+S');
    await page.waitForSelector('#quickspeak-controls');
    
    // Page should still be functional
    const pageTitle = await page.title();
    expect(pageTitle).toBe('QuickSpeak Test Page');
    
    // Regular Ctrl+A should still work
    await page.keyboard.press('Control+a');
    const selection = await page.evaluate(() => window.getSelection().toString());
    expect(selection.length).toBeGreaterThan(100); // Should select page content
  });

  test('Rapid shortcut presses don\'t break functionality', async ({ page }) => {
    // Enable extension
    await page.keyboard.press('Control+Shift+E');
    
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    
    // Rapid shortcut presses
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+Shift+S');
      await page.waitForTimeout(100);
    }
    
    // Widget should still be functional
    await page.waitForSelector('#quickspeak-controls');
    await expect(page.locator('#quickspeak-controls')).toBeVisible();
    
    // Buttons should still work
    const playButton = page.locator('#quickspeak-play-pause');
    await playButton.click();
    // Should not throw error
  });
});