// E2E Tests for QuickSpeak Speech Synthesis
const { test, expect } = require('@playwright/test');

test.describe('QuickSpeak Speech Synthesis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForTimeout(1000);
    
    // Enable extension and select text
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    await page.waitForSelector('#quickspeak-controls');
  });

  test('speechSynthesis API is available', async ({ page }) => {
    const hasAPI = await page.evaluate(() => {
      return typeof speechSynthesis !== 'undefined' && 
             typeof SpeechSynthesisUtterance !== 'undefined';
    });
    expect(hasAPI).toBe(true);
  });

  test('Speech synthesis starts successfully in working browsers', async ({ page, browserName }) => {
    if (browserName === 'chrome') {
      test.skip('Chrome has known speechSynthesis issues');
    }
    
    const playButton = page.locator('#quickspeak-play-pause');
    
    // Click play button
    await playButton.click();
    
    // Check if speech started
    const isSpeaking = await page.evaluate(() => speechSynthesis.speaking);
    expect(isSpeaking).toBe(true);
    
    // Button should show pause state
    await expect(playButton).toContainText('⏸️');
  });

  test('Chrome shows appropriate error handling', async ({ page, browserName }) => {
    if (browserName !== 'chrome') {
      test.skip('This test is specific to Chrome issues');
    }
    
    const playButton = page.locator('#quickspeak-play-pause');
    
    // Click play button
    await playButton.click();
    
    // Wait a moment for any error handling
    await page.waitForTimeout(1000);
    
    // Either an error message appears or button resets
    const errorMessage = page.locator('.quickspeak-message');
    const buttonText = await playButton.textContent();
    
    // Should either show error or reset to play state
    const hasError = await errorMessage.isVisible();
    const buttonReset = buttonText === '▶️';
    
    expect(hasError || buttonReset).toBe(true);
  });

  test('Speech rate changes affect synthesis', async ({ page, browserName }) => {
    if (browserName === 'chrome') {
      test.skip('Chrome has known speechSynthesis issues');
    }
    
    const speedSlider = page.locator('#quickspeak-speed');
    const playButton = page.locator('#quickspeak-play-pause');
    
    // Set to slow speed
    await speedSlider.fill('0.5');
    
    // Start speech
    await playButton.click();
    await expect(playButton).toContainText('⏸️');
    
    // Get current utterance rate
    const rate = await page.evaluate(() => {
      // Access the last created utterance
      return window.quickSpeakWidget ? window.quickSpeakWidget.currentRate : null;
    });
    
    // Rate should reflect slider value
    expect(rate).toBe(0.5);
  });

  test('Speech can be paused and resumed', async ({ page, browserName }) => {
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
    
    // Check pause state
    const isPaused = await page.evaluate(() => speechSynthesis.paused);
    expect(isPaused).toBe(true);
    
    // Resume speech
    await playButton.click();
    await expect(playButton).toContainText('⏸️');
  });

  test('Speech stops when widget is closed', async ({ page, browserName }) => {
    if (browserName === 'chrome') {
      test.skip('Chrome has known speechSynthesis issues');
    }
    
    const playButton = page.locator('#quickspeak-play-pause');
    const closeButton = page.locator('#quickspeak-close');
    
    // Start speech
    await playButton.click();
    await expect(playButton).toContainText('⏸️');
    
    const isSpeakingBefore = await page.evaluate(() => speechSynthesis.speaking);
    expect(isSpeakingBefore).toBe(true);
    
    // Close widget
    await closeButton.click();
    
    // Speech should be stopped
    const isSpeakingAfter = await page.evaluate(() => speechSynthesis.speaking);
    expect(isSpeakingAfter).toBe(false);
  });

  test('Multiple rapid speech requests are handled correctly', async ({ page, browserName }) => {
    if (browserName === 'chrome') {
      test.skip('Chrome has known speechSynthesis issues');
    }
    
    const playButton = page.locator('#quickspeak-play-pause');
    
    // Rapid clicks on play button
    for (let i = 0; i < 3; i++) {
      await playButton.click();
      await page.waitForTimeout(100);
    }
    
    // Should not break the speech system
    const isSpeaking = await page.evaluate(() => speechSynthesis.speaking);
    
    // Either speaking or stopped, but no error state
    const buttonText = await playButton.textContent();
    expect(['▶️', '⏸️']).toContain(buttonText);
  });

  test('Voice selection affects speech synthesis', async ({ page, browserName }) => {
    if (browserName === 'chrome') {
      test.skip('Chrome has known speechSynthesis issues');
    }
    
    // Check if voices are available
    const voicesAvailable = await page.evaluate(() => {
      const voices = speechSynthesis.getVoices();
      return voices.length > 0;
    });
    
    if (!voicesAvailable) {
      test.skip('No voices available for testing');
    }
    
    const playButton = page.locator('#quickspeak-play-pause');
    
    // Start speech with default voice
    await playButton.click();
    
    // Should work without errors
    await expect(playButton).toContainText('⏸️');
  });

  test('Speech synthesis handles different text types', async ({ page, browserName }) => {
    if (browserName === 'chrome') {
      test.skip('Chrome has known speechSynthesis issues');
    }
    
    const testTexts = [
      { id: 'english-short', desc: 'short English text' },
      { id: 'english-long', desc: 'long English text' },
      { id: 'special-chars', desc: 'text with special characters' },
      { id: 'punctuation', desc: 'text with punctuation' }
    ];
    
    for (const textType of testTexts) {
      // Select different text
      await page.evaluate((id) => {
        window.testHelpers.selectText(id);
      }, textType.id);
      
      await page.waitForSelector('#quickspeak-controls');
      const playButton = page.locator('#quickspeak-play-pause');
      
      // Should be able to speak each type
      await playButton.click();
      await expect(playButton).toContainText('⏸️');
      
      // Stop speech before next test
      const closeButton = page.locator('#quickspeak-close');
      await closeButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('Speech synthesis primer works correctly', async ({ page, browserName }) => {
    if (browserName === 'chrome') {
      test.skip('Chrome has known speechSynthesis issues');
    }
    
    // Check that primer is executed when starting speech
    const primerExecuted = await page.evaluate(() => {
      // Start fresh speech session
      window.testHelpers.selectText('english-short');
      
      // Monitor speechSynthesis calls
      let primerCalled = false;
      const originalSpeak = speechSynthesis.speak;
      speechSynthesis.speak = function(utterance) {
        if (utterance.text === '' && utterance.rate === 0.5) {
          primerCalled = true;
        }
        return originalSpeak.call(this, utterance);
      };
      
      // Trigger speech
      const playButton = document.getElementById('quickspeak-play-pause');
      if (playButton) {
        playButton.click();
      }
      
      return primerCalled;
    });
    
    // Primer should be executed in non-Chrome browsers
    expect(primerExecuted).toBe(true);
  });

  test('Browser-specific speech handling works', async ({ page, browserName }) => {
    const playButton = page.locator('#quickspeak-play-pause');
    
    // Start speech
    await playButton.click();
    
    if (browserName === 'brave' || browserName === 'firefox' || browserName === 'edge') {
      // Should work normally
      await expect(playButton).toContainText('⏸️');
      
      const isSpeaking = await page.evaluate(() => speechSynthesis.speaking);
      expect(isSpeaking).toBe(true);
    } else if (browserName === 'chrome') {
      // May show error or reset
      await page.waitForTimeout(1000);
      const buttonText = await playButton.textContent();
      
      // Should handle Chrome issues gracefully
      expect(['▶️', '⏸️']).toContain(buttonText);
    }
  });

  test('Speech events are handled correctly', async ({ page, browserName }) => {
    if (browserName === 'chrome') {
      test.skip('Chrome has known speechSynthesis issues');
    }
    
    const playButton = page.locator('#quickspeak-play-pause');
    
    // Start speech
    await playButton.click();
    await expect(playButton).toContainText('⏸️');
    
    // Wait for speech to potentially end
    await page.waitForTimeout(3000);
    
    // Check if speech ended naturally and button reset
    const buttonText = await playButton.textContent();
    const isSpeaking = await page.evaluate(() => speechSynthesis.speaking);
    
    // If speech ended, button should show play
    if (!isSpeaking) {
      expect(buttonText).toBe('▶️');
    }
  });
});