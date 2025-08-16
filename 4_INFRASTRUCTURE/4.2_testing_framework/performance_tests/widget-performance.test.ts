/**
 * Widget Performance Tests - NativeMimic v4.0
 * 
 * Performance tests specifically designed to catch regressions
 * that caused the UI failures in v3.16
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PerformanceTestUtils, PERFORMANCE_CONFIG } from '@tests/setup/performance.setup';
import { MainWidget, WidgetConfig } from '@core/1.1_user_interface/widget_overlay/MainWidget';
import { createMockElement } from '@tests/setup/vitest.setup';

const TEST_CONFIG: WidgetConfig = {
  maxTextLength: 5000,
  autoLanguageDetection: true,
  showSpeedControl: true,
  enableRecording: true,
  enableAnalytics: true
};

describe('Widget Performance Tests', () => {
  let widget: MainWidget;

  beforeEach(() => {
    document.body.innerHTML = '';
    widget = new MainWidget(TEST_CONFIG);
  });

  afterEach(() => {
    if (widget) {
      widget.hide();
    }
    document.body.innerHTML = '';
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('Widget Rendering Performance', () => {
    it('should render widget within performance threshold', async () => {
      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        widget.show('Performance test text', { x: 100, y: 100 });
        
        // Wait for DOM to update
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // Verify widget is in DOM
        const widgetElement = document.querySelector('.nativemimic-widget');
        expect(widgetElement).toBeTruthy();
      }, 'widget-render');

      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.maxWidgetRenderTime);
    });

    it('should handle rapid show/hide cycles without performance degradation', async () => {
      const results = await PerformanceTestUtils.stressTest(async () => {
        widget.show(`Test text ${Math.random()}`, { 
          x: Math.random() * 100, 
          y: Math.random() * 100 
        });
        
        // Allow minimal DOM update time
        await new Promise(resolve => setTimeout(resolve, 1));
        
        widget.hide();
      }, 20, 1); // 20 iterations, sequential

      expect(results.avgDuration).toBeLessThan(PERFORMANCE_CONFIG.maxWidgetRenderTime);
      expect(results.maxDuration).toBeLessThan(PERFORMANCE_CONFIG.maxWidgetRenderTime * 2);
      
      // Performance should not degrade significantly over time
      const performanceDegradation = results.maxDuration / results.minDuration;
      expect(performanceDegradation).toBeLessThan(3); // Max 3x slower than fastest
    });

    it('should not leak memory during repeated operations', () => {
      const initialMemory = PerformanceTestUtils.trackMemoryUsage(() => {
        // Baseline measurement
      });

      const afterOperations = PerformanceTestUtils.trackMemoryUsage(() => {
        // Perform 50 show/hide cycles
        for (let i = 0; i < 50; i++) {
          widget.show(`Memory test ${i}`, { x: i, y: i });
          widget.hide();
        }
      });

      const memoryIncrease = afterOperations.after - initialMemory.after;
      expect(memoryIncrease).toBeLessThan(5); // Less than 5MB increase
    });

    it('should handle large text content efficiently', async () => {
      const largeText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100); // ~5000 chars
      
      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        widget.show(largeText, { x: 100, y: 100 });
        await new Promise(resolve => setTimeout(resolve, 0));
      }, 'large-text-render');

      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.maxWidgetRenderTime * 2); // Allow 2x time for large text
      
      // Verify text was properly truncated if needed
      const displayedText = widget['state'].selectedText;
      expect(displayedText.length).toBeLessThanOrEqual(TEST_CONFIG.maxTextLength + 3); // +3 for '...'
    });

    it('should render multiple widgets without performance issues', async () => {
      const widgets: MainWidget[] = [];
      
      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        // Create 5 widgets simultaneously
        for (let i = 0; i < 5; i++) {
          const testWidget = new MainWidget(TEST_CONFIG);
          widgets.push(testWidget);
          testWidget.show(`Widget ${i} text`, { x: i * 50, y: i * 50 });
        }
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }, 'multiple-widgets');

      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.maxWidgetRenderTime * 3);
      
      // Verify all widgets are rendered
      const widgetElements = document.querySelectorAll('.nativemimic-widget');
      expect(widgetElements.length).toBe(5);
      
      // Clean up
      widgets.forEach(w => w.hide());
    });
  });

  describe('DOM Manipulation Performance', () => {
    it('should update UI efficiently during state changes', async () => {
      widget.show('State change test', { x: 100, y: 100 });
      
      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        // Simulate rapid state changes
        widget['state'].isPlaying = true;
        widget['updateUI']();
        
        widget['state'].isRecording = true;
        widget['updateUI']();
        
        widget['state'].isPlaying = false;
        widget['state'].isRecording = false;
        widget['updateUI']();
        
        await new Promise(resolve => setTimeout(resolve, 0));
      }, 'ui-updates');

      expect(duration).toBeLessThan(50); // UI updates should be very fast
    });

    it('should handle DOM node creation/removal efficiently', () => {
      const initialNodeCount = document.querySelectorAll('*').length;
      
      const { duration } = PerformanceTestUtils.measureTime(() => {
        // Create and destroy widget multiple times
        for (let i = 0; i < 10; i++) {
          widget.show(`DOM test ${i}`, { x: i, y: i });
          widget.hide();
        }
      }, 'dom-manipulation').duration;

      const finalNodeCount = document.querySelectorAll('*').length;
      
      expect(duration).toBeLessThan(100); // Should be fast
      expect(finalNodeCount).toBe(initialNodeCount); // No DOM leak
    });

    it('should maintain DOM performance with complex content', async () => {
      // Create complex page structure
      const complexContainer = createMockElement('div', { id: 'complex-container' });
      for (let i = 0; i < 100; i++) {
        const element = createMockElement('div', { 
          class: `element-${i}`,
          'data-test': `value-${i}`
        }, `Content ${i}`);
        complexContainer.appendChild(element);
      }
      document.body.appendChild(complexContainer);

      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        widget.show('Complex DOM test', { x: 100, y: 100 });
        await new Promise(resolve => setTimeout(resolve, 0));
      }, 'complex-dom-render');

      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.maxWidgetRenderTime * 1.5);
    });
  });

  describe('Event Handling Performance', () => {
    it('should handle rapid event firing efficiently', async () => {
      widget.show('Event test text', { x: 100, y: 100 });
      
      const widgetElement = document.querySelector('.nativemimic-widget') as HTMLElement;
      expect(widgetElement).toBeTruthy();

      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        // Fire many events rapidly
        for (let i = 0; i < 50; i++) {
          const clickEvent = new MouseEvent('click', { bubbles: true });
          widgetElement.dispatchEvent(clickEvent);
        }
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }, 'rapid-events');

      expect(duration).toBeLessThan(100); // Should handle events quickly
    });

    it('should not accumulate event listeners', () => {
      const initialListenerCount = (document as any)._eventListeners?.size || 0;

      // Create and destroy widgets multiple times
      for (let i = 0; i < 10; i++) {
        const testWidget = new MainWidget(TEST_CONFIG);
        testWidget.show(`Listener test ${i}`, { x: i, y: i });
        testWidget.hide();
      }

      const finalListenerCount = (document as any)._eventListeners?.size || 0;
      
      // Should not accumulate listeners (allowing some variance for test framework)
      expect(finalListenerCount - initialListenerCount).toBeLessThanOrEqual(2);
    });

    it('should handle keyboard events without lag', async () => {
      widget.show('Keyboard test', { x: 100, y: 100 });

      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        // Simulate rapid keyboard events
        for (const key of ['Escape', 'Enter', 'Space', 'ArrowUp', 'ArrowDown']) {
          const keyEvent = new KeyboardEvent('keydown', { 
            key, 
            bubbles: true 
          });
          document.dispatchEvent(keyEvent);
        }
        
        await new Promise(resolve => setTimeout(resolve, 5));
      }, 'keyboard-events');

      expect(duration).toBeLessThan(50);
    });
  });

  describe('Audio Performance', () => {
    beforeEach(() => {
      // Mock Audio with performance tracking
      const mockAudio = {
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        currentTime: 0,
        duration: 1.5,
        onended: null,
        onerror: null
      };
      
      global.Audio = vi.fn().mockImplementation(() => mockAudio);
    });

    it('should create audio elements efficiently', async () => {
      widget.show('Audio performance test', { x: 100, y: 100 });

      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        // Mock TTS response
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' }))
        });

        await widget.playText();
      }, 'audio-creation');

      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.maxTTSRequestTime);
    });

    it('should handle multiple audio requests without memory leaks', async () => {
      widget.show('Multi-audio test', { x: 100, y: 100 });

      const memoryBefore = PerformanceTestUtils.trackMemoryUsage(() => {});

      // Make multiple audio requests
      for (let i = 0; i < 5; i++) {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          blob: () => Promise.resolve(new Blob([`audio-${i}`], { type: 'audio/mpeg' }))
        });

        await widget.playText();
        widget.stopAudio(); // Clean up
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const memoryAfter = PerformanceTestUtils.trackMemoryUsage(() => {});
      const memoryIncrease = memoryAfter.after - memoryBefore.after;

      expect(memoryIncrease).toBeLessThan(2); // Less than 2MB increase
    });
  });

  describe('Language Detection Performance', () => {
    it('should detect language quickly for various text sizes', async () => {
      const testTexts = [
        'Short English text',
        'Texto en español para la detección de idioma. Esta es una oración más larga.'.repeat(5),
        'Texte français pour la détection de langue automatique. Ceci est un texte plus long pour tester les performances.'.repeat(10)
      ];

      for (const text of testTexts) {
        const { duration } = await PerformanceTestUtils.measureTime(async () => {
          widget.show(text, { x: 100, y: 100 });
          
          // Wait for language detection to complete
          await new Promise(resolve => setTimeout(resolve, 100));
        }, `language-detection-${text.length}`);

        expect(duration).toBeLessThan(200); // Language detection should be fast
        
        widget.hide();
      }
    });

    it('should not block UI during language detection', async () => {
      const longMultilingualText = `
        This is English text mixed with español y también français. 
        The detection should work without blocking the interface.
      `.repeat(20);

      const startTime = performance.now();
      
      widget.show(longMultilingualText, { x: 100, y: 100 });
      
      // UI should be responsive immediately
      const uiRenderTime = performance.now() - startTime;
      expect(uiRenderTime).toBeLessThan(PERFORMANCE_CONFIG.maxWidgetRenderTime);
      
      // Widget should be visible even if language detection is still running
      const widgetElement = document.querySelector('.nativemimic-widget');
      expect(widgetElement).toBeTruthy();
    });
  });

  describe('CSS and Styling Performance', () => {
    it('should apply styles efficiently', async () => {
      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        widget.show('Style test', { x: 100, y: 100 });
        
        // Force style recalculation
        const widgetElement = document.querySelector('.nativemimic-widget') as HTMLElement;
        if (widgetElement) {
          window.getComputedStyle(widgetElement).getPropertyValue('display');
        }
        
        await new Promise(resolve => setTimeout(resolve, 0));
      }, 'css-application');

      expect(duration).toBeLessThan(50);
    });

    it('should handle theme changes efficiently', async () => {
      widget.show('Theme test', { x: 100, y: 100 });
      
      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        // Simulate theme changes
        widget['state'].theme = 'dark';
        widget['updateUI']();
        
        widget['state'].theme = 'light';
        widget['updateUI']();
        
        await new Promise(resolve => setTimeout(resolve, 0));
      }, 'theme-changes');

      expect(duration).toBeLessThan(30);
    });
  });

  describe('Regression Prevention', () => {
    it('should not recreate known v3.16 performance issues', async () => {
      // Simulate the conditions that caused v3.16 failures
      
      // 1. Rapid text selections
      const rapidSelectionResults = await PerformanceTestUtils.stressTest(async () => {
        const text = `Regression test ${Math.random()}`;
        widget.show(text, { x: Math.random() * 500, y: Math.random() * 500 });
        
        // Immediate hide to simulate rapid selection changes
        widget.hide();
      }, 30, 2); // 30 iterations, 2 concurrent

      expect(rapidSelectionResults.p95Duration).toBeLessThan(100);

      // 2. Memory leak prevention
      const memoryTest = PerformanceTestUtils.trackMemoryUsage(() => {
        for (let i = 0; i < 100; i++) {
          widget.show(`Memory regression test ${i}`, { x: i % 10, y: i % 10 });
          
          // Simulate user interactions that caused leaks in v3.16
          const widgetElement = document.querySelector('.nativemimic-widget');
          if (widgetElement) {
            widgetElement.dispatchEvent(new MouseEvent('mouseover'));
            widgetElement.dispatchEvent(new MouseEvent('mouseout'));
          }
          
          widget.hide();
        }
      });

      expect(memoryTest.delta).toBeLessThan(3); // Less than 3MB increase

      // 3. DOM node accumulation prevention
      const initialNodes = document.querySelectorAll('*').length;
      
      for (let i = 0; i < 20; i++) {
        widget.show(`DOM regression test ${i}`, { x: i, y: i });
        
        // Simulate the DOM manipulation that caused issues in v3.16
        const container = widget['container'];
        if (container) {
          container.innerHTML = widget['getWidgetHTML']();
          widget['attachEventListeners']();
        }
        
        widget.hide();
      }
      
      const finalNodes = document.querySelectorAll('*').length;
      expect(finalNodes - initialNodes).toBeLessThanOrEqual(1);
    });

    it('should maintain performance under stress conditions', async () => {
      // Simulate heavy load conditions that triggered v3.16 failures
      const stressConditions = [
        { description: 'Large text', text: 'A'.repeat(4000) },
        { description: 'Special characters', text: '🎵♪♫♪♩🎵 Unicode stress test 中文 العربية 🎵♪♫' },
        { description: 'HTML entities', text: '&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;' },
        { description: 'Long words', text: 'supercalifragilisticexpialidocious'.repeat(50) }
      ];

      for (const condition of stressConditions) {
        const { duration } = await PerformanceTestUtils.measureTime(async () => {
          widget.show(condition.text, { x: 200, y: 200 });
          await new Promise(resolve => setTimeout(resolve, 10));
          widget.hide();
        }, `stress-${condition.description}`);

        expect(duration).toBeLessThan(PERFORMANCE_CONFIG.maxWidgetRenderTime * 2);
      }
    });
  });
});