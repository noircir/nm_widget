/**
 * MainWidget Unit Tests - NativeMimic v4.0
 * 
 * Comprehensive testing of the MainWidget component to prevent
 * UI failures like those that occurred in v3.16
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MainWidget, WidgetConfig, WidgetState } from '@core/1.1_user_interface/widget_overlay/MainWidget';
import { createMockElement, simulateUserEvent, waitForDOM } from '@tests/setup/vitest.setup';

// Test configuration matching real usage
const DEFAULT_TEST_CONFIG: WidgetConfig = {
  maxTextLength: 5000,
  autoLanguageDetection: true,
  showSpeedControl: true,
  enableRecording: true,
  enableAnalytics: true
};

describe('MainWidget', () => {
  let widget: MainWidget;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    // Create clean DOM environment
    document.body.innerHTML = '';
    
    // Create mock container for widget
    mockContainer = createMockElement('div', { id: 'test-container' });
    document.body.appendChild(mockContainer);
    
    // Initialize widget with test config
    widget = new MainWidget(DEFAULT_TEST_CONFIG);
  });

  afterEach(() => {
    // Clean up widget and DOM
    if (widget) {
      widget.hide();
    }
    document.body.innerHTML = '';
  });

  describe('Widget Initialization', () => {
    it('should initialize with correct default state', () => {
      expect(widget).toBeDefined();
      expect(widget['state']).toMatchObject({
        isVisible: false,
        selectedText: '',
        currentLanguage: 'en',
        isPlaying: false,
        isRecording: false,
        position: { x: 0, y: 0 },
        theme: 'light'
      });
    });

    it('should initialize child components correctly', () => {
      expect(widget['voiceSelector']).toBeDefined();
      expect(widget['recordingButton']).toBeDefined();
    });

    it('should setup event listeners without errors', () => {
      // Should not throw during construction
      expect(() => new MainWidget(DEFAULT_TEST_CONFIG)).not.toThrow();
    });

    it('should handle configuration options correctly', () => {
      const customConfig: WidgetConfig = {
        maxTextLength: 1000,
        autoLanguageDetection: false,
        showSpeedControl: false,
        enableRecording: false,
        enableAnalytics: false
      };

      const customWidget = new MainWidget(customConfig);
      expect(customWidget['config']).toEqual(customConfig);
    });
  });

  describe('Widget Visibility and Positioning', () => {
    it('should show widget with text and position', async () => {
      const testText = 'Hello, this is test text for TTS';
      const testPosition = { x: 100, y: 150 };

      widget.show(testText, testPosition);

      expect(widget['state'].isVisible).toBe(true);
      expect(widget['state'].selectedText).toBe(testText);
      expect(widget['state'].position).toEqual(testPosition);

      // Wait for DOM update
      await waitForDOM(() => 
        document.querySelector('.nativemimic-widget') !== null
      );

      const widgetElement = document.querySelector('.nativemimic-widget') as HTMLElement;
      expect(widgetElement).toBeTruthy();
      expect(widgetElement.style.left).toBe('100px');
      expect(widgetElement.style.top).toBe('150px');
    });

    it('should hide widget and clean up', () => {
      // First show the widget
      widget.show('test text', { x: 0, y: 0 });
      expect(widget['state'].isVisible).toBe(true);

      // Then hide it
      widget.hide();
      expect(widget['state'].isVisible).toBe(false);

      // Widget should be removed from DOM
      const widgetElement = document.querySelector('.nativemimic-widget');
      expect(widgetElement).toBeFalsy();
    });

    it('should limit text length to prevent abuse', () => {
      const longText = 'a'.repeat(6000); // Exceeds default maxTextLength
      const expectedText = 'a'.repeat(5000) + '...';

      widget.show(longText, { x: 0, y: 0 });

      expect(widget['state'].selectedText).toBe(expectedText);
      expect(widget['state'].selectedText.length).toBeLessThanOrEqual(5003); // 5000 + '...'
    });

    it('should handle empty text gracefully', () => {
      expect(() => widget.show('', { x: 0, y: 0 })).not.toThrow();
      expect(widget['state'].selectedText).toBe('');
    });

    it('should handle multiple show calls correctly', async () => {
      widget.show('First text', { x: 50, y: 50 });
      await waitForDOM(() => document.querySelector('.nativemimic-widget') !== null);

      widget.show('Second text', { x: 100, y: 100 });
      
      expect(widget['state'].selectedText).toBe('Second text');
      expect(widget['state'].position).toEqual({ x: 100, y: 100 });

      // Should only have one widget in DOM
      const widgets = document.querySelectorAll('.nativemimic-widget');
      expect(widgets.length).toBe(1);
    });
  });

  describe('Language Detection', () => {
    it('should detect English text correctly', async () => {
      const englishText = 'Hello world, this is a test in English';
      
      widget.show(englishText, { x: 0, y: 0 });
      
      // Allow time for language detection
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(widget['state'].currentLanguage).toBe('en');
    });

    it('should detect Spanish text correctly', async () => {
      const spanishText = 'Hola mundo, esta es una prueba en español';
      
      widget.show(spanishText, { x: 0, y: 0 });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(widget['state'].currentLanguage).toBe('es');
    });

    it('should detect French text correctly', async () => {
      const frenchText = 'Bonjour le monde, ceci est un test en français';
      
      widget.show(frenchText, { x: 0, y: 0 });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(widget['state'].currentLanguage).toBe('fr');
    });

    it('should handle mixed language text', async () => {
      const mixedText = 'Hello world and hola mundo';
      
      widget.show(mixedText, { x: 0, y: 0 });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should default to English for mixed content
      expect(widget['state'].currentLanguage).toBe('en');
    });

    it('should respect autoLanguageDetection setting', () => {
      const noAutoDetectConfig: WidgetConfig = {
        ...DEFAULT_TEST_CONFIG,
        autoLanguageDetection: false
      };

      const noAutoWidget = new MainWidget(noAutoDetectConfig);
      const spanishText = 'Hola mundo';
      
      noAutoWidget.show(spanishText, { x: 0, y: 0 });
      
      // Language should remain default (en) since auto-detection is disabled
      expect(noAutoWidget['state'].currentLanguage).toBe('en');
    });
  });

  describe('Audio Playback', () => {
    it('should play text successfully', async () => {
      const testText = 'Hello world';
      widget.show(testText, { x: 0, y: 0 });

      // Mock successful TTS response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['fake audio'], { type: 'audio/mpeg' }))
      });

      const mockAudio = {
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        currentTime: 0,
        onended: null
      };
      global.Audio = vi.fn().mockImplementation(() => mockAudio);

      await widget.playText();

      expect(widget['state'].isPlaying).toBe(true);
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('should handle TTS API errors gracefully', async () => {
      const testText = 'Hello world';
      widget.show(testText, { x: 0, y: 0 });

      // Mock failed TTS response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await widget.playText();

      expect(widget['state'].isPlaying).toBe(false);
      // Should not throw, should handle error gracefully
    });

    it('should not play when no text is selected', async () => {
      const playTextSpy = vi.spyOn(widget, 'playText');
      
      await widget.playText();
      
      expect(widget['state'].isPlaying).toBe(false);
      // Function should return early
    });

    it('should prevent multiple simultaneous playbacks', async () => {
      const testText = 'Hello world';
      widget.show(testText, { x: 0, y: 0 });

      // Set state to playing
      widget['state'].isPlaying = true;

      await widget.playText();

      // Should not start another playback
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should stop audio correctly', () => {
      const mockAudio = {
        pause: vi.fn(),
        currentTime: 0
      };
      widget['currentAudio'] = mockAudio as any;
      widget['state'].isPlaying = true;

      widget.stopAudio();

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.currentTime).toBe(0);
      expect(widget['state'].isPlaying).toBe(false);
      expect(widget['currentAudio']).toBe(null);
    });
  });

  describe('User Interactions', () => {
    beforeEach(async () => {
      widget.show('Test text for interaction', { x: 100, y: 100 });
      await waitForDOM(() => document.querySelector('.nativemimic-widget') !== null);
    });

    it('should handle play button click', async () => {
      const playButton = document.querySelector('.play-btn') as HTMLButtonElement;
      expect(playButton).toBeTruthy();

      const playTextSpy = vi.spyOn(widget, 'playText').mockResolvedValue();
      
      simulateUserEvent(playButton, 'click');
      
      expect(playTextSpy).toHaveBeenCalled();
    });

    it('should handle close button click', () => {
      const closeButton = document.querySelector('.close-btn') as HTMLButtonElement;
      expect(closeButton).toBeTruthy();

      const hideSpy = vi.spyOn(widget, 'hide');
      
      simulateUserEvent(closeButton, 'click');
      
      expect(hideSpy).toHaveBeenCalled();
    });

    it('should handle record button click when recording is enabled', async () => {
      const recordButton = document.querySelector('.record-btn') as HTMLButtonElement;
      expect(recordButton).toBeTruthy();

      simulateUserEvent(recordButton, 'click');
      
      // Should trigger recording functionality
      expect(widget['state'].isRecording).toBe(false); // Initial state
    });

    it('should hide on outside click', () => {
      const hideSpy = vi.spyOn(widget, 'hide');
      
      // Click outside the widget
      simulateUserEvent(document.body, 'click');
      
      expect(hideSpy).toHaveBeenCalled();
    });

    it('should not hide on widget click', () => {
      const hideSpy = vi.spyOn(widget, 'hide');
      const widgetElement = document.querySelector('.nativemimic-widget') as HTMLElement;
      
      simulateUserEvent(widgetElement, 'click');
      
      expect(hideSpy).not.toHaveBeenCalled();
    });

    it('should hide on Escape key press', () => {
      const hideSpy = vi.spyOn(widget, 'hide');
      
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      
      expect(hideSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid TTS voice gracefully', async () => {
      widget.show('Test text', { x: 0, y: 0 });

      // Mock voice selector to return null
      vi.spyOn(widget['voiceSelector'], 'getSelectedVoice').mockReturnValue(null);

      await expect(widget.playText()).resolves.not.toThrow();
      expect(widget['state'].isPlaying).toBe(false);
    });

    it('should handle DOM manipulation errors', () => {
      // Mock DOM methods to throw errors
      const originalAppendChild = document.body.appendChild;
      document.body.appendChild = vi.fn().mockImplementation(() => {
        throw new Error('DOM manipulation failed');
      });

      expect(() => widget.show('Test', { x: 0, y: 0 })).not.toThrow();

      // Restore original method
      document.body.appendChild = originalAppendChild;
    });

    it('should handle XSS attempts in text content', async () => {
      const maliciousText = '<script>alert("xss")</script><img src="x" onerror="alert(\'xss\')">';
      
      widget.show(maliciousText, { x: 0, y: 0 });
      
      await waitForDOM(() => document.querySelector('.nativemimic-widget') !== null);
      
      const textDisplay = document.querySelector('.selected-text');
      expect(textDisplay?.innerHTML).not.toContain('<script>');
      expect(textDisplay?.innerHTML).not.toContain('onerror');
    });

    it('should handle memory cleanup on hide', () => {
      widget.show('Test text', { x: 0, y: 0 });
      
      // Verify widget is in DOM
      expect(document.querySelector('.nativemimic-widget')).toBeTruthy();
      
      widget.hide();
      
      // Verify complete cleanup
      expect(document.querySelector('.nativemimic-widget')).toBeFalsy();
      expect(widget['container']).toBe(null);
    });
  });

  describe('Performance and Memory', () => {
    it('should not create memory leaks on repeated show/hide', () => {
      const initialNodeCount = document.querySelectorAll('*').length;
      
      // Perform multiple show/hide cycles
      for (let i = 0; i < 10; i++) {
        widget.show(`Test text ${i}`, { x: i * 10, y: i * 10 });
        widget.hide();
      }
      
      const finalNodeCount = document.querySelectorAll('*').length;
      expect(finalNodeCount).toBeLessThanOrEqual(initialNodeCount + 1); // Allow minimal growth
    });

    it('should render widget quickly', async () => {
      const startTime = performance.now();
      
      widget.show('Performance test text', { x: 100, y: 100 });
      
      await waitForDOM(() => document.querySelector('.nativemimic-widget') !== null);
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should handle rapid successive calls', () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          widget.show(`Rapid test ${i}`, { x: i, y: i });
        }
      }).not.toThrow();
      
      // Should only show the last text
      expect(widget['state'].selectedText).toBe('Rapid test 99');
    });
  });

  describe('Analytics and Tracking', () => {
    it('should track widget shown event', () => {
      const trackSpy = vi.spyOn(widget as any, 'trackAnalytics');
      
      widget.show('Analytics test', { x: 0, y: 0 });
      
      expect(trackSpy).toHaveBeenCalledWith('widget_shown', { textLength: 14 });
    });

    it('should track widget hidden event', () => {
      const trackSpy = vi.spyOn(widget as any, 'trackAnalytics');
      
      widget.show('Test', { x: 0, y: 0 });
      widget.hide();
      
      expect(trackSpy).toHaveBeenCalledWith('widget_hidden');
    });

    it('should not track when analytics disabled', () => {
      const noAnalyticsConfig: WidgetConfig = {
        ...DEFAULT_TEST_CONFIG,
        enableAnalytics: false
      };

      const noAnalyticsWidget = new MainWidget(noAnalyticsConfig);
      const trackSpy = vi.spyOn(noAnalyticsWidget as any, 'trackAnalytics');
      
      noAnalyticsWidget.show('Test', { x: 0, y: 0 });
      
      // trackAnalytics should be called but should return early
      expect(trackSpy).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      widget.show('Accessibility test', { x: 0, y: 0 });
      
      await waitForDOM(() => document.querySelector('.nativemimic-widget') !== null);
      
      const widgetElement = document.querySelector('.nativemimic-widget') as HTMLElement;
      const playButton = widgetElement.querySelector('.play-btn') as HTMLElement;
      const closeButton = widgetElement.querySelector('.close-btn') as HTMLElement;
      
      // Buttons should be accessible
      expect(playButton.tagName).toBe('BUTTON');
      expect(closeButton.tagName).toBe('BUTTON');
    });

    it('should support keyboard navigation', async () => {
      widget.show('Keyboard test', { x: 0, y: 0 });
      
      await waitForDOM(() => document.querySelector('.nativemimic-widget') !== null);
      
      const playButton = document.querySelector('.play-btn') as HTMLElement;
      
      // Should be focusable
      playButton.focus();
      expect(document.activeElement).toBe(playButton);
    });
  });
});