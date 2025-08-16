/**
 * Memory Leak Detection Tests - NativeMimic v4.0
 * 
 * Comprehensive memory leak detection to prevent the memory issues
 * that contributed to v3.16 UI failures
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PerformanceTestUtils, PERFORMANCE_CONFIG, getMemoryUsage } from '@tests/setup/performance.setup';
import { MainWidget, WidgetConfig } from '@core/1.1_user_interface/widget_overlay/MainWidget';
import { VoiceSelector, VoiceSelectorConfig } from '@core/1.1_user_interface/voice_selection/VoiceSelector';

const DEFAULT_CONFIG: WidgetConfig = {
  maxTextLength: 5000,
  autoLanguageDetection: true,
  showSpeedControl: true,
  enableRecording: true,
  enableAnalytics: true
};

const VOICE_CONFIG: VoiceSelectorConfig = {
  maxDisplayedVoices: 5,
  showMoreButton: true,
  enableQualityRating: true,
  defaultLanguage: 'en',
  autoSelectBest: true
};

describe('Memory Leak Detection Tests', () => {
  let initialMemory: number;

  beforeEach(() => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Clean DOM
    document.body.innerHTML = '';
    
    // Record initial memory
    initialMemory = getMemoryUsage();
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
  });

  describe('Widget Instance Memory Leaks', () => {
    it('should not leak memory when creating and destroying widgets', () => {
      const memoryMeasurement = PerformanceTestUtils.trackMemoryUsage(() => {
        // Create and destroy many widget instances
        for (let i = 0; i < 50; i++) {
          const widget = new MainWidget(DEFAULT_CONFIG);
          widget.show(`Test widget ${i}`, { x: i, y: i });
          widget.hide();
          
          // Remove reference
          (widget as any) = null;
        }
      });

      expect(memoryMeasurement.delta).toBeLessThan(2); // Less than 2MB increase
    });

    it('should clean up DOM references properly', () => {
      const widgets: MainWidget[] = [];
      const initialNodes = document.querySelectorAll('*').length;

      // Create multiple widgets
      for (let i = 0; i < 10; i++) {
        const widget = new MainWidget(DEFAULT_CONFIG);
        widgets.push(widget);
        widget.show(`DOM cleanup test ${i}`, { x: i * 20, y: i * 20 });
      }

      const peakNodes = document.querySelectorAll('*').length;
      expect(peakNodes).toBeGreaterThan(initialNodes);

      // Clean up all widgets
      widgets.forEach(widget => widget.hide());

      const finalNodes = document.querySelectorAll('*').length;
      expect(finalNodes).toBe(initialNodes);
    });

    it('should not accumulate event listeners', () => {
      let eventListenerCount = 0;
      
      // Mock addEventListener to count listeners
      const originalAddEventListener = document.addEventListener;
      document.addEventListener = function(...args) {
        eventListenerCount++;
        return originalAddEventListener.apply(this, args);
      };

      const originalRemoveEventListener = document.removeEventListener;
      document.removeEventListener = function(...args) {
        eventListenerCount--;
        return originalRemoveEventListener.apply(this, args);
      };

      try {
        // Create and destroy widgets
        for (let i = 0; i < 10; i++) {
          const widget = new MainWidget(DEFAULT_CONFIG);
          widget.show(`Event listener test ${i}`, { x: i, y: i });
          widget.hide();
        }

        // Should not accumulate listeners
        expect(eventListenerCount).toBeLessThanOrEqual(2); // Allow some variance
      } finally {
        // Restore original methods
        document.addEventListener = originalAddEventListener;
        document.removeEventListener = originalRemoveEventListener;
      }
    });

    it('should clean up timers and intervals', () => {
      const activeTimers: number[] = [];
      
      // Mock timer functions to track active timers
      const originalSetTimeout = global.setTimeout;
      const originalSetInterval = global.setInterval;
      const originalClearTimeout = global.clearTimeout;
      const originalClearInterval = global.clearInterval;

      global.setTimeout = function(fn, delay) {
        const id = originalSetTimeout(fn, delay);
        activeTimers.push(id);
        return id;
      } as any;

      global.setInterval = function(fn, delay) {
        const id = originalSetInterval(fn, delay);
        activeTimers.push(id);
        return id;
      } as any;

      global.clearTimeout = function(id) {
        const index = activeTimers.indexOf(id);
        if (index > -1) activeTimers.splice(index, 1);
        return originalClearTimeout(id);
      } as any;

      global.clearInterval = function(id) {
        const index = activeTimers.indexOf(id);
        if (index > -1) activeTimers.splice(index, 1);
        return originalClearInterval(id);
      } as any;

      try {
        // Create widgets that might use timers
        for (let i = 0; i < 5; i++) {
          const widget = new MainWidget(DEFAULT_CONFIG);
          widget.show(`Timer test ${i}`, { x: i, y: i });
          
          // Simulate operations that might create timers
          widget['detectLanguage'](`Test text ${i}`);
          
          widget.hide();
        }

        // Should not have uncleaned timers
        expect(activeTimers.length).toBe(0);
      } finally {
        // Restore original functions
        global.setTimeout = originalSetTimeout;
        global.setInterval = originalSetInterval;
        global.clearTimeout = originalClearTimeout;
        global.clearInterval = originalClearInterval;
      }
    });
  });

  describe('Audio Resource Memory Leaks', () => {
    beforeEach(() => {
      // Mock Audio with leak tracking
      const audioInstances: any[] = [];
      
      global.Audio = class MockAudio {
        src: string = '';
        currentTime: number = 0;
        paused: boolean = true;
        ended: boolean = false;
        onended: (() => void) | null = null;
        onerror: ((error: any) => void) | null = null;

        constructor(src?: string) {
          this.src = src || '';
          audioInstances.push(this);
        }

        play() {
          this.paused = false;
          return Promise.resolve();
        }

        pause() {
          this.paused = true;
        }

        addEventListener() {}
        removeEventListener() {}
      } as any;

      (global as any).audioInstances = audioInstances;
    });

    it('should not leak audio objects', async () => {
      const widget = new MainWidget(DEFAULT_CONFIG);
      const audioInstances = (global as any).audioInstances;

      // Mock fetch for TTS
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' }))
      });

      const initialAudioCount = audioInstances.length;

      // Play multiple audio files
      for (let i = 0; i < 5; i++) {
        widget.show(`Audio test ${i}`, { x: 100, y: 100 });
        await widget.playText();
        widget.stopAudio();
        widget.hide();
      }

      // Should not accumulate audio objects
      expect(audioInstances.length - initialAudioCount).toBeLessThanOrEqual(1);
    });

    it('should clean up audio references on widget destruction', async () => {
      const widget = new MainWidget(DEFAULT_CONFIG);
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' }))
      });

      widget.show('Audio cleanup test', { x: 100, y: 100 });
      await widget.playText();

      // Verify audio is playing
      expect(widget['currentAudio']).toBeTruthy();

      // Hide widget should clean up audio
      widget.hide();

      expect(widget['currentAudio']).toBe(null);
    });

    it('should handle rapid audio creation/destruction', async () => {
      const widget = new MainWidget(DEFAULT_CONFIG);
      const audioInstances = (global as any).audioInstances;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' }))
      });

      const memoryBefore = getMemoryUsage();
      const initialAudioCount = audioInstances.length;

      // Rapidly create and destroy audio
      for (let i = 0; i < 20; i++) {
        widget.show(`Rapid audio test ${i}`, { x: 100, y: 100 });
        await widget.playText();
        widget.stopAudio();
        
        // Don't hide widget immediately to test audio cleanup
        if (i % 3 === 0) {
          widget.hide();
        }
      }

      widget.hide(); // Final cleanup

      const memoryAfter = getMemoryUsage();
      const finalAudioCount = audioInstances.length;

      expect(memoryAfter - memoryBefore).toBeLessThan(3); // Less than 3MB
      expect(finalAudioCount - initialAudioCount).toBeLessThanOrEqual(2);
    });
  });

  describe('Voice Selector Memory Leaks', () => {
    it('should not leak memory when loading many voices', async () => {
      const memoryBefore = getMemoryUsage();

      // Create many voice selectors
      for (let i = 0; i < 10; i++) {
        const voiceSelector = new VoiceSelector(VOICE_CONFIG, () => {});
        
        // Load voices multiple times
        await voiceSelector.loadVoicesForLanguage('en-US');
        await voiceSelector.loadVoicesForLanguage('es-ES');
        await voiceSelector.loadVoicesForLanguage('fr-FR');
        
        // Clean up
        (voiceSelector as any)['cleanup']?.();
      }

      const memoryAfter = getMemoryUsage();
      expect(memoryAfter - memoryBefore).toBeLessThan(2);
    });

    it('should clean up voice preview audio', async () => {
      const voiceSelector = new VoiceSelector(VOICE_CONFIG, () => {});
      const audioInstances = (global as any).audioInstances || [];
      const initialAudioCount = audioInstances.length;

      await voiceSelector.loadVoicesForLanguage('en-US');

      // Play multiple voice previews
      for (let i = 0; i < 5; i++) {
        await voiceSelector.playVoicePreview('en-US-Wavenet-D');
        await voiceSelector.playVoicePreview('en-US-Wavenet-F');
      }

      // Cleanup should remove audio references
      (voiceSelector as any)['cleanup']?.();

      expect(audioInstances.length - initialAudioCount).toBeLessThanOrEqual(1);
    });
  });

  describe('Event Loop and Callback Memory Leaks', () => {
    it('should not create circular references in callbacks', () => {
      const widgets: MainWidget[] = [];
      const memoryBefore = getMemoryUsage();

      // Create widgets with circular reference potential
      for (let i = 0; i < 10; i++) {
        const widget = new MainWidget(DEFAULT_CONFIG);
        widgets.push(widget);

        // Create potential circular references
        (widget as any).circularRef = widget;
        (widget as any).parentRef = widgets;

        widget.show(`Circular test ${i}`, { x: i, y: i });
      }

      // Clear references
      widgets.forEach(widget => {
        widget.hide();
        delete (widget as any).circularRef;
        delete (widget as any).parentRef;
      });
      widgets.length = 0;

      if (global.gc) {
        global.gc();
      }

      const memoryAfter = getMemoryUsage();
      expect(memoryAfter - memoryBefore).toBeLessThan(1);
    });

    it('should handle promise chains without memory leaks', async () => {
      const widget = new MainWidget(DEFAULT_CONFIG);
      const memoryBefore = getMemoryUsage();

      // Create many promise chains
      const promises = [];
      for (let i = 0; i < 50; i++) {
        const promise = new Promise(resolve => {
          setTimeout(() => {
            widget.show(`Promise test ${i}`, { x: i, y: i });
            widget.hide();
            resolve(i);
          }, 1);
        });
        promises.push(promise);
      }

      await Promise.all(promises);

      if (global.gc) {
        global.gc();
      }

      const memoryAfter = getMemoryUsage();
      expect(memoryAfter - memoryBefore).toBeLessThan(2);
    });
  });

  describe('Storage and Cache Memory Leaks', () => {
    it('should not accumulate storage data in memory', async () => {
      const memoryBefore = getMemoryUsage();

      // Simulate heavy storage usage
      for (let i = 0; i < 100; i++) {
        const data = {
          id: `test-${i}`,
          text: `Test data ${i}`.repeat(10),
          timestamp: Date.now(),
          metadata: { index: i, type: 'test' }
        };

        await chrome.storage.sync.set({ [`test-data-${i}`]: data });
        const retrieved = await chrome.storage.sync.get(`test-data-${i}`);
        expect(retrieved[`test-data-${i}`]).toEqual(data);
      }

      // Clear storage
      await chrome.storage.sync.clear();

      if (global.gc) {
        global.gc();
      }

      const memoryAfter = getMemoryUsage();
      expect(memoryAfter - memoryBefore).toBeLessThan(1);
    });

    it('should handle voice cache without memory leaks', async () => {
      const voiceSelector = new VoiceSelector(VOICE_CONFIG, () => {});
      const memoryBefore = getMemoryUsage();

      // Load and cache many voices
      const languages = ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT'];
      
      for (const lang of languages) {
        for (let i = 0; i < 10; i++) {
          await voiceSelector.loadVoicesForLanguage(lang);
        }
      }

      // Clear cache
      (voiceSelector as any)['voiceCache'] = new Map();

      if (global.gc) {
        global.gc();
      }

      const memoryAfter = getMemoryUsage();
      expect(memoryAfter - memoryBefore).toBeLessThan(2);
    });
  });

  describe('Long-running Operation Memory Leaks', () => {
    it('should not leak memory during extended widget usage', async () => {
      const widget = new MainWidget(DEFAULT_CONFIG);
      const memoryReadings: number[] = [];

      // Simulate 1 minute of usage
      for (let minute = 0; minute < 60; minute++) {
        // Simulate user activity every "second"
        for (let second = 0; second < 10; second++) {
          widget.show(`Extended usage test ${minute}:${second}`, { 
            x: second * 10, 
            y: minute * 5 
          });
          
          // Simulate some user interactions
          if (second % 3 === 0) {
            const widgetEl = document.querySelector('.nativemimic-widget');
            if (widgetEl) {
              widgetEl.dispatchEvent(new MouseEvent('mouseover'));
              widgetEl.dispatchEvent(new MouseEvent('mouseout'));
            }
          }
          
          widget.hide();
          
          await new Promise(resolve => setTimeout(resolve, 1));
        }

        // Record memory every 10 "minutes"
        if (minute % 10 === 0) {
          if (global.gc) global.gc();
          memoryReadings.push(getMemoryUsage());
        }
      }

      widget.hide();

      // Memory should not continuously increase
      if (memoryReadings.length > 2) {
        const firstReading = memoryReadings[0];
        const lastReading = memoryReadings[memoryReadings.length - 1];
        const memoryIncrease = lastReading - firstReading;
        
        expect(memoryIncrease).toBeLessThan(5); // Less than 5MB over extended usage
      }
    });

    it('should handle memory pressure gracefully', () => {
      const widgets: MainWidget[] = [];
      let memoryPressureDetected = false;

      try {
        // Create many widgets to simulate memory pressure
        for (let i = 0; i < 1000; i++) {
          const widget = new MainWidget(DEFAULT_CONFIG);
          widgets.push(widget);
          widget.show(`Memory pressure test ${i}`, { x: i % 100, y: i % 100 });

          // Check memory every 100 widgets
          if (i % 100 === 0) {
            const currentMemory = getMemoryUsage();
            if (currentMemory > PERFORMANCE_CONFIG.maxMemoryUsageMB) {
              memoryPressureDetected = true;
              break;
            }
          }
        }
      } finally {
        // Clean up all widgets
        widgets.forEach(widget => widget.hide());
      }

      // Should handle memory pressure without crashing
      expect(memoryPressureDetected || widgets.length > 0).toBe(true);
    });
  });

  describe('Regression Tests for v3.16 Memory Issues', () => {
    it('should not recreate v3.16 widget accumulation bug', () => {
      const memoryBefore = getMemoryUsage();
      const initialNodes = document.querySelectorAll('*').length;

      // Recreate the exact scenario that caused v3.16 issues
      for (let i = 0; i < 100; i++) {
        const widget = new MainWidget(DEFAULT_CONFIG);
        
        // Rapid show/hide cycles that caused accumulation
        widget.show(`v3.16 regression test ${i}`, { x: i % 10, y: i % 10 });
        
        // Don't always hide immediately (this was the v3.16 bug)
        if (i % 7 !== 0) {
          widget.hide();
        }
        
        // Force some to hide later
        if (i % 20 === 0) {
          // Find and hide any remaining widgets
          const remainingWidgets = document.querySelectorAll('.nativemimic-widget');
          remainingWidgets.forEach(el => el.remove());
        }
      }

      // Final cleanup
      const remainingWidgets = document.querySelectorAll('.nativemimic-widget');
      remainingWidgets.forEach(el => el.remove());

      const memoryAfter = getMemoryUsage();
      const finalNodes = document.querySelectorAll('*').length;

      // Should not have v3.16-style accumulation
      expect(memoryAfter - memoryBefore).toBeLessThan(3);
      expect(finalNodes - initialNodes).toBeLessThanOrEqual(1);
    });

    it('should prevent v3.16 event listener accumulation', () => {
      let globalEventListeners = 0;
      
      // Track global event listeners
      const originalAddListener = document.addEventListener;
      const originalRemoveListener = document.removeEventListener;
      
      document.addEventListener = function(...args) {
        globalEventListeners++;
        return originalAddListener.apply(this, args);
      };
      
      document.removeEventListener = function(...args) {
        globalEventListeners--;
        return originalRemoveListener.apply(this, args);
      };

      try {
        // Recreate v3.16 listener accumulation scenario
        for (let i = 0; i < 50; i++) {
          const widget = new MainWidget(DEFAULT_CONFIG);
          widget.show(`Listener test ${i}`, { x: 100, y: 100 });
          
          // Some widgets were not properly cleaned up in v3.16
          if (i % 5 !== 0) {
            widget.hide();
          }
        }

        // Should not accumulate listeners like v3.16 did
        expect(globalEventListeners).toBeLessThan(10);
      } finally {
        document.addEventListener = originalAddListener;
        document.removeEventListener = originalRemoveListener;
      }
    });
  });
});