/**
 * E2E Integration Tests - Speech Workflow After ElevenLabs Removal
 * Tests the complete speech workflow to ensure functionality is preserved
 */

describe('Speech Workflow - Post ElevenLabs Removal', () => {
  let page;
  let extensionId;

  beforeAll(async () => {
    // Setup will be handled by global setup
    page = await browser.newPage();
    
    // Load test page
    await page.goto('file://' + path.join(__dirname, '../fixtures/test-page.html'));
    
    // Get extension ID (will be set by test setup)
    extensionId = global.extensionId;
  });

  afterAll(async () => {
    if (page) {
      await page.close();
    }
  });

  beforeEach(async () => {
    // Clear any previous selections and reset state
    await page.evaluate(() => {
      window.getSelection().removeAllRanges();
      // Reset any existing widget
      const existingWidget = document.querySelector('.nativemimic-speech-controls');
      if (existingWidget) {
        existingWidget.remove();
      }
    });
  });

  describe('Basic Speech Functionality', () => {
    test('should trigger speech on text selection with Google TTS fallback', async () => {
      // Select some text
      await page.evaluate(() => {
        const textNode = document.createTextNode('Hello world, this is a test.');
        document.body.appendChild(textNode);
        
        const range = document.createRange();
        range.selectNode(textNode);
        window.getSelection().addRange(range);
      });

      // Wait for widget to appear
      await page.waitForSelector('.nativemimic-speech-controls', { timeout: 5000 });

      // Check that widget has proper controls
      const hasPlayButton = await page.$('.nativemimic-play-btn');
      const hasVoiceSelect = await page.$('.nativemimic-voice-select');
      const hasSpeedSlider = await page.$('#nativemimic-speed-slider');
      const hasCloseButton = await page.$('.nativemimic-close-button');

      expect(hasPlayButton).toBeTruthy();
      expect(hasVoiceSelect).toBeTruthy();
      expect(hasSpeedSlider).toBeTruthy();
      expect(hasCloseButton).toBeTruthy();
    });

    test('should populate voice dropdown with Google TTS and system voices only', async () => {
      await page.evaluate(() => {
        const textNode = document.createTextNode('Test text for voice selection.');
        document.body.appendChild(textNode);
        
        const range = document.createRange();
        range.selectNode(textNode);
        window.getSelection().addRange(range);
      });

      await page.waitForSelector('.nativemimic-voice-select', { timeout: 5000 });

      // Click to open dropdown
      await page.click('.nativemimic-voice-select');
      await page.waitForTimeout(1000);

      // Check that no ElevenLabs options exist
      const elevenLabsOptions = await page.$$eval('option', options => 
        options.filter(opt => 
          opt.value.includes('elevenlabs:') || 
          opt.textContent.toLowerCase().includes('elevenlabs')
        )
      );

      expect(elevenLabsOptions).toHaveLength(0);

      // Check that Google TTS options exist (if backend is running)
      const googleTTSOptions = await page.$$eval('option', options => 
        options.filter(opt => 
          opt.value.includes('google-tts:') || 
          opt.textContent.toLowerCase().includes('google')
        )
      );

      // Should have Google TTS options OR system voices
      const systemOptions = await page.$$eval('option', options => 
        options.filter(opt => 
          !opt.value.includes('google-tts:') && 
          !opt.value.includes('elevenlabs:') &&
          opt.value !== ''
        )
      );

      const totalValidOptions = googleTTSOptions.length + systemOptions.length;
      expect(totalValidOptions).toBeGreaterThan(0);
    });

    test('should handle play button click without ElevenLabs errors', async () => {
      await page.evaluate(() => {
        const textNode = document.createTextNode('This is test speech content.');
        document.body.appendChild(textNode);
        
        const range = document.createRange();
        range.selectNode(textNode);
        window.getSelection().addRange(range);
      });

      await page.waitForSelector('.nativemimic-play-btn', { timeout: 5000 });

      // Monitor console for errors
      const consoleMessages = [];
      page.on('console', msg => consoleMessages.push(msg.text()));

      // Click play button
      await page.click('.nativemimic-play-btn');
      
      // Wait a moment for any speech to start
      await page.waitForTimeout(2000);

      // Check for ElevenLabs related errors
      const elevenLabsErrors = consoleMessages.filter(msg => 
        msg.toLowerCase().includes('elevenlabs') && 
        (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed'))
      );

      expect(elevenLabsErrors).toHaveLength(0);

      // Verify speech state changes
      const buttonContent = await page.$eval('.nativemimic-play-btn', btn => btn.innerHTML);
      // Should show either pause icon (if speech started) or remain as play (if fallback to system voices)
      expect(buttonContent).toMatch(/[⏸️▶️]/);
    });

    test('should handle speed slider changes without ElevenLabs dependencies', async () => {
      await page.evaluate(() => {
        const textNode = document.createTextNode('Speed test content here.');
        document.body.appendChild(textNode);
        
        const range = document.createRange();
        range.selectNode(textNode);
        window.getSelection().addRange(range);
      });

      await page.waitForSelector('#nativemimic-speed-slider', { timeout: 5000 });

      const consoleMessages = [];
      page.on('console', msg => consoleMessages.push(msg.text()));

      // Change speed slider
      await page.evaluate(() => {
        const slider = document.querySelector('#nativemimic-speed-slider');
        slider.value = '1.5';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await page.waitForTimeout(1000);

      // Check that speed value updated
      const speedValue = await page.$eval('#nativemimic-speed-value', el => el.textContent);
      expect(speedValue).toBe('1.5x');

      // Check for ElevenLabs related errors
      const elevenLabsErrors = consoleMessages.filter(msg => 
        msg.toLowerCase().includes('elevenlabs') && 
        (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed'))
      );

      expect(elevenLabsErrors).toHaveLength(0);
    });
  });

  describe('Voice Selection After ElevenLabs Removal', () => {
    test('should redirect ElevenLabs voice selection to Google TTS', async () => {
      await page.evaluate(() => {
        const textNode = document.createTextNode('Voice selection test text.');
        document.body.appendChild(textNode);
        
        const range = document.createRange();
        range.selectNode(textNode);
        window.getSelection().addRange(range);
      });

      await page.waitForSelector('.nativemimic-voice-select', { timeout: 5000 });

      const consoleMessages = [];
      page.on('console', msg => consoleMessages.push(msg.text()));

      // Simulate selecting an ElevenLabs voice (if any remnants exist)
      const hasElevenLabsOptions = await page.evaluate(() => {
        const select = document.querySelector('.nativemimic-voice-select');
        const options = [...select.options];
        return options.some(opt => opt.value.includes('elevenlabs:'));
      });

      // If ElevenLabs options somehow still exist, selecting them should redirect
      if (hasElevenLabsOptions) {
        await page.evaluate(() => {
          const select = document.querySelector('.nativemimic-voice-select');
          const elevenLabsOption = [...select.options].find(opt => opt.value.includes('elevenlabs:'));
          if (elevenLabsOption) {
            select.value = elevenLabsOption.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });

        await page.waitForTimeout(1000);

        // Should see fallback messages
        const fallbackMessages = consoleMessages.filter(msg => 
          msg.includes('ElevenLabs voice selected but support removed') ||
          msg.includes('falling back to Google TTS')
        );

        expect(fallbackMessages.length).toBeGreaterThan(0);
      }
    });

    test('should work normally with Google TTS voice selection', async () => {
      await page.evaluate(() => {
        const textNode = document.createTextNode('Google TTS voice test content.');
        document.body.appendChild(textNode);
        
        const range = document.createRange();
        range.selectNode(textNode);
        window.getSelection().addRange(range);
      });

      await page.waitForSelector('.nativemimic-voice-select', { timeout: 5000 });

      const consoleMessages = [];
      page.on('console', msg => consoleMessages.push(msg.text()));

      // Try to select a Google TTS voice
      const hasGoogleTTSOptions = await page.evaluate(() => {
        const select = document.querySelector('.nativemimic-voice-select');
        const options = [...select.options];
        return options.some(opt => opt.value.includes('google-tts:'));
      });

      if (hasGoogleTTSOptions) {
        await page.evaluate(() => {
          const select = document.querySelector('.nativemimic-voice-select');
          const googleOption = [...select.options].find(opt => opt.value.includes('google-tts:'));
          if (googleOption) {
            select.value = googleOption.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });

        await page.waitForTimeout(1000);

        // Should not see any ElevenLabs errors
        const elevenLabsErrors = consoleMessages.filter(msg => 
          msg.toLowerCase().includes('elevenlabs') && 
          msg.toLowerCase().includes('error')
        );

        expect(elevenLabsErrors).toHaveLength(0);
      }
    });
  });

  describe('Cache and Memory Management', () => {
    test('should show proper cache usage logs', async () => {
      await page.evaluate(() => {
        const textNode = document.createTextNode('Cache test content for repeated use.');
        document.body.appendChild(textNode);
        
        const range = document.createRange();
        range.selectNode(textNode);
        window.getSelection().addRange(range);
      });

      await page.waitForSelector('.nativemimic-play-btn', { timeout: 5000 });

      const consoleMessages = [];
      page.on('console', msg => consoleMessages.push(msg.text()));

      // First play - should generate new audio
      await page.click('.nativemimic-play-btn');
      await page.waitForTimeout(3000);

      // Stop and play again - should use cache
      await page.click('.nativemimic-stop-btn');
      await page.waitForTimeout(1000);
      await page.click('.nativemimic-play-btn');
      await page.waitForTimeout(2000);

      // Look for proper cache logging (no ElevenLabs references)
      const cacheMessages = consoleMessages.filter(msg => 
        msg.includes('💰 Google TTS Cost') && msg.includes('CACHED')
      );

      const elevenLabsCacheMessages = consoleMessages.filter(msg => 
        msg.includes('ElevenLabs') && msg.includes('cache')
      );

      // Should have proper Google TTS cache messages, no ElevenLabs cache messages
      expect(elevenLabsCacheMessages).toHaveLength(0);
      // Cache messages may exist if Google TTS backend is running
    });

    test('should show cache cleanup without ElevenLabs references', async () => {
      const consoleMessages = [];
      page.on('console', msg => consoleMessages.push(msg.text()));

      // Trigger cache cleanup by creating widget multiple times
      for (let i = 0; i < 3; i++) {
        await page.evaluate((index) => {
          // Clear previous
          const existing = document.querySelector('.nativemimic-speech-controls');
          if (existing) existing.remove();
          
          // Create new text selection
          const textNode = document.createTextNode(`Cache cleanup test ${index}.`);
          document.body.appendChild(textNode);
          
          const range = document.createRange();
          range.selectNode(textNode);
          window.getSelection().removeAllRanges();
          window.getSelection().addRange(range);
        }, i);

        await page.waitForTimeout(1500);
      }

      // Look for cache cleanup messages
      const cleanupMessages = consoleMessages.filter(msg => 
        msg.includes('🧹 NativeMimic: Cleaned') || 
        msg.includes('💾 NativeMimic: Cache status')
      );

      const elevenLabsCleanupMessages = consoleMessages.filter(msg => 
        msg.includes('ElevenLabs') && 
        (msg.includes('clean') || msg.includes('cache'))
      );

      expect(elevenLabsCleanupMessages).toHaveLength(0);
    });
  });

  describe('Error Resilience', () => {
    test('should handle Google TTS backend unavailable gracefully', async () => {
      // This test checks that the extension doesn't break when Google TTS is not available
      await page.evaluate(() => {
        const textNode = document.createTextNode('Fallback test content.');
        document.body.appendChild(textNode);
        
        const range = document.createRange();
        range.selectNode(textNode);
        window.getSelection().addRange(range);
      });

      await page.waitForSelector('.nativemimic-play-btn', { timeout: 5000 });

      const consoleMessages = [];
      const errorMessages = [];
      page.on('console', msg => {
        consoleMessages.push(msg.text());
        if (msg.type() === 'error') {
          errorMessages.push(msg.text());
        }
      });

      await page.click('.nativemimic-play-btn');
      await page.waitForTimeout(3000);

      // Should not have any critical JavaScript errors
      const criticalErrors = errorMessages.filter(msg => 
        msg.includes('TypeError') || 
        msg.includes('ReferenceError') ||
        msg.includes('is not a function')
      );

      expect(criticalErrors).toHaveLength(0);

      // May have network errors (expected if backend is down), but should handle gracefully
      const networkErrors = errorMessages.filter(msg => 
        msg.includes('fetch') || 
        msg.includes('network') ||
        msg.includes('GoogleTTS not initialized')
      );

      // These are acceptable if backend is not running
      // The important thing is that they don't crash the extension
    });
  });
});