// Extension Helper Functions for E2E Tests
import { expect } from '@playwright/test';

/**
 * Load the QuickSpeak extension in the browser context
 * @param {Page} page - Playwright page object
 */
export async function loadExtension(page) {
  // Extension is loaded via launch options in playwright.config.js
  // This function ensures the extension is properly initialized
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Check if extension's content script is loaded
  const extensionLoaded = await page.evaluate(() => {
    // Look for QuickSpeak global variables or DOM elements
    return typeof window.QuickSpeakWidget !== 'undefined' || 
           document.querySelector('script[src*="quickspeak"]') !== null ||
           window.quickSpeakInstance !== undefined;
  });
  
  // If extension isn't loaded via launch options, inject it manually
  if (!extensionLoaded) {
    // Read and inject the content script
    await page.addScriptTag({ 
      path: './mvp/content.js'
    });
    
    // Add the CSS
    await page.addStyleTag({
      path: './mvp/content.css'
    });
    
    // Wait for QuickSpeak to initialize
    await page.waitForFunction(() => {
      return typeof window.QuickSpeakWidget !== 'undefined' ||
             window.quickSpeakInstance !== undefined;
    }, { timeout: 5000 });
  }
  
  // Enable the extension using keyboard shortcut (required for QuickSpeak)
  await page.keyboard.press('Control+Shift+E');
  await page.waitForTimeout(500); // Give time for extension to enable
  
  // Verify extension is enabled
  const isEnabled = await page.evaluate(() => {
    return window.quickSpeakInstance?.enabled === true;
  });
  
  if (!isEnabled) {
    console.warn('Extension may not be enabled properly');
  }
}

/**
 * Select text on the page by element ID
 * @param {Page} page - Playwright page object
 * @param {string} elementId - ID of element to select text from
 */
export async function selectText(page, elementId) {
  await page.evaluate((id) => {
    window.testHelpers.selectText(id);
  }, elementId);
}

/**
 * Wait for the QuickSpeak widget to appear
 * @param {Page} page - Playwright page object
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Locator} Widget locator
 */
export async function waitForWidget(page, timeout = 5000) {
  await page.waitForSelector('#quickspeak-controls', { timeout });
  return page.locator('#quickspeak-controls');
}

/**
 * Clear text selection on the page
 * @param {Page} page - Playwright page object
 */
export async function clearSelection(page) {
  await page.evaluate(() => {
    window.testHelpers.clearSelection();
  });
}

/**
 * Check if extension is enabled
 * @param {Page} page - Playwright page object
 * @returns {boolean} True if extension is enabled
 */
export async function isExtensionEnabled(page) {
  return await page.evaluate(() => {
    return window.quickSpeakInstance?.enabled === true;
  });
}

/**
 * Enable/disable the extension
 * @param {Page} page - Playwright page object
 * @param {boolean} enabled - Whether to enable or disable
 */
export async function setExtensionEnabled(page, enabled) {
  await page.evaluate((enable) => {
    if (window.quickSpeakInstance) {
      if (enable) {
        window.quickSpeakInstance.enableExtension();
      } else {
        window.quickSpeakInstance.disableExtension();
      }
    }
  }, enabled);
}

/**
 * Get current widget position
 * @param {Page} page - Playwright page object
 * @returns {Object} Position object with x, y, width, height
 */
export async function getWidgetPosition(page) {
  return await page.evaluate(() => {
    return window.testHelpers.getWidgetPosition();
  });
}

/**
 * Check if widget is visible
 * @param {Page} page - Playwright page object
 * @returns {boolean} True if widget is visible
 */
export async function isWidgetVisible(page) {
  return await page.evaluate(() => {
    return window.testHelpers.isWidgetVisible();
  });
}

/**
 * Simulate keyboard shortcut
 * @param {Page} page - Playwright page object
 * @param {string} shortcut - Keyboard shortcut (e.g., 'Control+Shift+S')
 */
export async function simulateShortcut(page, shortcut) {
  await page.keyboard.press(shortcut);
}

/**
 * Get extension debug info
 * @param {Page} page - Playwright page object
 * @returns {Object} Debug information
 */
export async function getExtensionDebugInfo(page) {
  return await page.evaluate(() => {
    const instance = window.quickSpeakInstance;
    if (!instance) return { error: 'Extension not loaded' };
    
    return {
      enabled: instance.enabled,
      currentSpeed: instance.currentSpeed,
      isChrome: instance.isChrome,
      chromeVersion: instance.chromeVersion,
      selectedVoice: instance.selectedVoice?.name,
      currentUtterance: instance.currentUtterance !== null,
      speechSynthesisAvailable: typeof speechSynthesis !== 'undefined',
      speechSynthesisState: {
        speaking: speechSynthesis?.speaking,
        paused: speechSynthesis?.paused,
        pending: speechSynthesis?.pending
      }
    };
  });
}

/**
 * Wait for speech synthesis to be ready
 * @param {Page} page - Playwright page object
 */
export async function waitForSpeechSynthesis(page) {
  await page.waitForFunction(() => {
    return typeof speechSynthesis !== 'undefined' && 
           speechSynthesis.getVoices().length > 0;
  }, { timeout: 10000 });
}

/**
 * Mock speech synthesis for testing
 * @param {Page} page - Playwright page object
 */
export async function mockSpeechSynthesis(page) {
  await page.addInitScript(() => {
    // Create mock speech synthesis API
    window.mockSpeechEvents = [];
    
    window.SpeechSynthesisUtterance = class MockUtterance {
      constructor(text) {
        this.text = text;
        this.rate = 1;
        this.pitch = 1;
        this.volume = 1;
        this.voice = null;
        this.onstart = null;
        this.onend = null;
        this.onerror = null;
        this.onpause = null;
        this.onresume = null;
      }
    };
    
    window.speechSynthesis = {
      speaking: false,
      paused: false,
      pending: false,
      
      speak(utterance) {
        this.speaking = true;
        window.mockSpeechEvents.push({ type: 'speak', text: utterance.text });
        
        // Simulate speech start
        setTimeout(() => {
          if (utterance.onstart) utterance.onstart();
        }, 10);
        
        // Simulate speech end
        setTimeout(() => {
          this.speaking = false;
          if (utterance.onend) utterance.onend();
        }, 100);
      },
      
      cancel() {
        this.speaking = false;
        this.paused = false;
        window.mockSpeechEvents.push({ type: 'cancel' });
      },
      
      pause() {
        this.paused = true;
        window.mockSpeechEvents.push({ type: 'pause' });
      },
      
      resume() {
        this.paused = false;
        window.mockSpeechEvents.push({ type: 'resume' });
      },
      
      getVoices() {
        return [
          { name: 'Test Voice 1', lang: 'en-US', localService: true },
          { name: 'Test Voice 2', lang: 'en-GB', localService: false }
        ];
      }
    };
  });
}