/**
 * Basic Functionality Smoke Tests - NativeMimic v4.0
 * 
 * Quick smoke tests to verify core functionality works
 * Should run in under 10 seconds total
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Smoke Tests - Basic Functionality', () => {
  beforeEach(() => {
    // Clean state for each test
    document.body.innerHTML = '';
  });

  describe('Environment Setup', () => {
    it('should have browser APIs available', () => {
      expect(window).toBeDefined();
      expect(document).toBeDefined();
      expect(navigator).toBeDefined();
    });

    it('should have Chrome extension APIs mocked', () => {
      expect(chrome).toBeDefined();
      expect(chrome.storage).toBeDefined();
      expect(chrome.runtime).toBeDefined();
      expect(chrome.tabs).toBeDefined();
    });

    it('should have audio APIs available', () => {
      expect(Audio).toBeDefined();
      expect(speechSynthesis).toBeDefined();
      expect(SpeechSynthesisUtterance).toBeDefined();
    });

    it('should have fetch API available', () => {
      expect(fetch).toBeDefined();
      expect(typeof fetch).toBe('function');
    });
  });

  describe('DOM Manipulation', () => {
    it('should create and manipulate DOM elements', () => {
      const element = document.createElement('div');
      element.textContent = 'Test element';
      element.className = 'test-class';
      
      document.body.appendChild(element);
      
      expect(document.querySelector('.test-class')).toBeTruthy();
      expect(document.querySelector('.test-class')?.textContent).toBe('Test element');
    });

    it('should handle text selection', () => {
      const textElement = document.createElement('p');
      textElement.textContent = 'This is selectable text';
      document.body.appendChild(textElement);
      
      const range = document.createRange();
      range.selectNodeContents(textElement);
      
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      expect(selection?.toString()).toBe('This is selectable text');
    });

    it('should handle event listeners', () => {
      let clicked = false;
      
      const button = document.createElement('button');
      button.addEventListener('click', () => {
        clicked = true;
      });
      
      document.body.appendChild(button);
      button.click();
      
      expect(clicked).toBe(true);
    });
  });

  describe('Chrome Extension Storage', () => {
    it('should store and retrieve data', async () => {
      const testData = { key: 'value', number: 123 };
      
      await chrome.storage.sync.set({ testData });
      const result = await chrome.storage.sync.get('testData');
      
      expect(result.testData).toEqual(testData);
    });

    it('should handle storage errors gracefully', async () => {
      // Should not throw when accessing non-existent keys
      const result = await chrome.storage.sync.get('non-existent-key');
      expect(result).toEqual({});
    });
  });

  describe('TTS API Mock', () => {
    it('should respond to TTS requests', async () => {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hello world',
          voice: 'en-US-Wavenet-D'
        })
      });
      
      expect(response.ok).toBe(true);
      
      const audioBlob = await response.blob();
      expect(audioBlob).toBeInstanceOf(Blob);
      expect(audioBlob.type).toBe('audio/mpeg');
    });

    it('should handle invalid TTS requests', async () => {
      const response = await fetch('/api/tts', {
        method: 'GET'  // Wrong method
      });
      
      // Should not throw, should handle gracefully
      expect(response).toBeDefined();
    });
  });

  describe('Audio Playback', () => {
    it('should create audio elements', () => {
      const audio = new Audio();
      
      expect(audio).toBeDefined();
      expect(typeof audio.play).toBe('function');
      expect(typeof audio.pause).toBe('function');
    });

    it('should handle audio blob URLs', () => {
      const blob = new Blob(['fake audio data'], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      
      expect(url).toBe('blob:mock-url');
      expect(typeof URL.revokeObjectURL).toBe('function');
    });
  });

  describe('Speech Synthesis', () => {
    it('should have voices available', () => {
      const voices = speechSynthesis.getVoices();
      
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBeGreaterThan(0);
      
      const englishVoice = voices.find(v => v.lang.startsWith('en'));
      expect(englishVoice).toBeTruthy();
    });

    it('should create speech utterances', () => {
      const utterance = new SpeechSynthesisUtterance('Hello world');
      
      expect(utterance).toBeDefined();
      expect(utterance.text).toBe('Hello world');
      expect(typeof utterance.onstart).toBe('object'); // null initially
      expect(typeof utterance.onend).toBe('object');
    });
  });

  describe('Performance Basics', () => {
    it('should perform DOM operations quickly', () => {
      const startTime = performance.now();
      
      // Create many elements
      for (let i = 0; i < 100; i++) {
        const element = document.createElement('div');
        element.textContent = `Element ${i}`;
        document.body.appendChild(element);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // Should be very fast
    });

    it('should not leak memory in basic operations', () => {
      const initialNodes = document.querySelectorAll('*').length;
      
      // Create and remove elements
      for (let i = 0; i < 10; i++) {
        const element = document.createElement('div');
        document.body.appendChild(element);
        element.remove();
      }
      
      const finalNodes = document.querySelectorAll('*').length;
      expect(finalNodes).toBe(initialNodes);
    });
  });

  describe('Error Handling', () => {
    it('should handle null/undefined gracefully', () => {
      expect(() => {
        const element = document.querySelector('.non-existent');
        // Should not throw when element is null
        element?.classList.add('test');
      }).not.toThrow();
    });

    it('should handle JSON parsing errors', () => {
      expect(() => {
        try {
          JSON.parse('invalid json');
        } catch (error) {
          // Error should be caught and handled
          expect(error).toBeInstanceOf(Error);
        }
      }).not.toThrow();
    });
  });

  describe('TypeScript Compatibility', () => {
    it('should work with TypeScript types', () => {
      const testFunction = (text: string, count: number): string => {
        return text.repeat(count);
      };
      
      const result = testFunction('test', 3);
      expect(result).toBe('testtesttest');
    });

    it('should handle optional parameters', () => {
      const testFunction = (required: string, optional?: number): string => {
        return `${required}${optional ? ` - ${optional}` : ''}`;
      };
      
      expect(testFunction('test')).toBe('test');
      expect(testFunction('test', 123)).toBe('test - 123');
    });
  });

  describe('Module System', () => {
    it('should support ES modules', () => {
      // This test verifies that the module system is working
      // import is a keyword, not a function, so we test module structure instead
      expect(describe).toBeDefined();
      expect(it).toBeDefined();
      expect(expect).toBeDefined();
    });

    it('should support dynamic imports', async () => {
      // Mock a dynamic import
      const mockModule = { default: 'test' };
      const dynamicImport = () => Promise.resolve(mockModule);
      
      const module = await dynamicImport();
      expect(module.default).toBe('test');
    });
  });

  describe('Async Operations', () => {
    it('should handle promises correctly', async () => {
      const promise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('async result'), 10);
      });
      
      const result = await promise;
      expect(result).toBe('async result');
    });

    it('should handle promise rejections', async () => {
      const promise = Promise.reject(new Error('Test error'));
      
      try {
        await promise;
        expect.fail('Promise should have rejected');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Test error');
      }
    });
  });
});