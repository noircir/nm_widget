// E2E Tests for QuickSpeak Button Controls
const { test, expect } = require('@playwright/test');

test.describe('QuickSpeak Button Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForTimeout(1000);
    
    // Enable extension and select text
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    await page.waitForSelector('#quickspeak-controls');
  });

  test('Play button triggers speech synthesis', async ({ page, browserName }) => {
    const playButton = page.locator('#quickspeak-play-pause');
    
    // Initial state should be play
    await expect(playButton).toContainText('▶️');
    
    // Click play button
    await playButton.click();
    
    if (browserName === 'brave' || browserName === 'firefox' || browserName === 'edge') {
      // For working browsers, button should change to pause
      await expect(playButton).toContainText('⏸️');
      
      // Check if speechSynthesis is active
      const isSpeaking = await page.evaluate(() => speechSynthesis.speaking);
      expect(isSpeaking).toBe(true);
    } else if (browserName === 'chrome') {
      // Chrome may show error message due to known issues
      const errorMessage = page.locator('.quickspeak-message');
      // Error message should appear or button should reset
      await page.waitForTimeout(1000);
      // Don't assert speech works in Chrome due to known issues
    }
  });

  test('Pause/resume state transitions work', async ({ page, browserName }) => {
    if (browserName === 'chrome') {
      test.skip('Chrome has known speechSynthesis issues');
    }
    
    const playButton = page.locator('#quickspeak-play-pause');
    
    // Start speech
    await playButton.click();
    await expect(playButton).toContainText('⏸️');
    
    // Pause speech
    await playButton.click();
    await expect(playButton).toContainText('▶️');
    
    // Resume speech
    await playButton.click();
    await expect(playButton).toContainText('⏸️');
  });

  test('Speed slider changes rate', async ({ page }) => {
    const speedSlider = page.locator('#quickspeak-speed');
    const speedValue = page.locator('#quickspeak-speed-value');
    
    // Change speed to 1.5x
    await speedSlider.fill('1.5');
    await expect(speedValue).toContainText('1.5x');
    
    // Change speed to 0.5x
    await speedSlider.fill('0.5');
    await expect(speedValue).toContainText('0.5x');
    
    // Change speed to 2.0x
    await speedSlider.fill('2.0');
    await expect(speedValue).toContainText('2.0x');
  });

  test('Speed slider affects active speech', async ({ page, browserName }) => {
    if (browserName === 'chrome') {
      test.skip('Chrome has known speechSynthesis issues');
    }
    
    const playButton = page.locator('#quickspeak-play-pause');
    const speedSlider = page.locator('#quickspeak-speed');
    
    // Start speech
    await playButton.click();
    await expect(playButton).toContainText('⏸️');
    
    // Change speed during speech
    await speedSlider.fill('1.8');
    
    // Speech should continue (button still shows pause)
    await expect(playButton).toContainText('⏸️');
  });

  test('Settings modal opens and closes', async ({ page }) => {
    const settingsButton = page.locator('#quickspeak-skin');
    
    // Open settings modal
    await settingsButton.click();
    await expect(page.locator('#quickspeak-skin-modal')).toBeVisible();
    
    // Close with X button
    await page.click('.quickspeak-modal-close');
    await expect(page.locator('#quickspeak-skin-modal')).not.toBeVisible();
  });

  test('Settings modal closes on overlay click', async ({ page }) => {
    const settingsButton = page.locator('#quickspeak-skin');
    
    // Open settings modal
    await settingsButton.click();
    await expect(page.locator('#quickspeak-skin-modal')).toBeVisible();
    
    // Click overlay to close
    await page.click('.quickspeak-modal-overlay');
    await expect(page.locator('#quickspeak-skin-modal')).not.toBeVisible();
  });

  test('Pronunciation report modal opens', async ({ page }) => {
    const reportButton = page.locator('#quickspeak-report');
    
    // Open pronunciation report modal
    await reportButton.click();
    await expect(page.locator('#quickspeak-pronunciation-modal')).toBeVisible();
    
    // Check if selected text is displayed
    const selectedText = page.locator('.quickspeak-selected-text');
    await expect(selectedText).toContainText('The central hub for editors');
  });

  test('Skin selection works', async ({ page }) => {
    const settingsButton = page.locator('#quickspeak-skin');
    
    // Open settings modal
    await settingsButton.click();
    await page.waitForSelector('#quickspeak-skin-modal');
    
    // Select a different skin
    await page.click('[data-skin="sunflower"]');
    
    // Modal should close
    await expect(page.locator('#quickspeak-skin-modal')).not.toBeVisible();
    
    // Widget should have new skin applied
    const widget = page.locator('#quickspeak-controls');
    const bgColor = await widget.evaluate(el => getComputedStyle(el).background);
    expect(bgColor).toContain('linear-gradient');
  });

  test('Close button stops speech and hides widget', async ({ page, browserName }) => {
    const playButton = page.locator('#quickspeak-play-pause');
    const closeButton = page.locator('#quickspeak-close');
    
    if (browserName !== 'chrome') {
      // Start speech
      await playButton.click();
      await expect(playButton).toContainText('⏸️');
    }
    
    // Close widget
    await closeButton.click();
    
    // Widget should be hidden
    await expect(page.locator('#quickspeak-controls')).not.toBeVisible();
    
    if (browserName !== 'chrome') {
      // Speech should be stopped
      const isSpeaking = await page.evaluate(() => speechSynthesis.speaking);
      expect(isSpeaking).toBe(false);
    }
  });

  test('Buttons remain responsive during speech', async ({ page, browserName }) => {
    if (browserName === 'chrome') {
      test.skip('Chrome has known speechSynthesis issues');
    }
    
    const playButton = page.locator('#quickspeak-play-pause');
    const speedSlider = page.locator('#quickspeak-speed');
    const settingsButton = page.locator('#quickspeak-skin');
    
    // Start speech
    await playButton.click();
    await expect(playButton).toContainText('⏸️');
    
    // All buttons should remain clickable
    await speedSlider.fill('1.2');
    await settingsButton.click();
    await expect(page.locator('#quickspeak-skin-modal')).toBeVisible();
    
    // Close modal
    await page.click('.quickspeak-modal-close');
    
    // Play button should still show pause state
    await expect(playButton).toContainText('⏸️');
  });
});