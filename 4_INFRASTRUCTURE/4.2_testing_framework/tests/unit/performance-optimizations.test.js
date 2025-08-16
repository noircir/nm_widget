// Unit Tests for Performance Optimizations

// Mock Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// Mock DOM
const mockGetElementById = jest.fn();
global.document = {
  getElementById: mockGetElementById,
  querySelectorAll: jest.fn(() => []),
  createElement: jest.fn(() => ({
    style: {},
    addEventListener: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    remove: jest.fn()
  })),
  body: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn()
    }
  }
};

// Mock Speech Synthesis API
const mockVoices = [
  { name: 'Voice 1', lang: 'en-US', localService: true, default: true, voiceURI: 'voice1' },
  { name: 'Voice 2', lang: 'es-ES', localService: true, default: false, voiceURI: 'voice2' },
  { name: 'Voice 3', lang: 'fr-FR', localService: false, default: false, voiceURI: 'voice3' }
];

global.speechSynthesis = {
  getVoices: jest.fn(() => mockVoices),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  speaking: false,
  paused: false,
  pending: false
};

global.SpeechSynthesisUtterance = jest.fn();

// Mock console methods
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Mock timers
jest.useFakeTimers();

// Mock NativeMimic class (simplified version for testing optimizations)
class MockNativeMimic {
  constructor() {
    this.debugMode = true;
    this.activeTimers = new Set();
    this.domCache = new Map();
    this.voicesCache = null;
  }

  // Debug logging methods
  debugLog(message, ...args) {
    if (this.debugMode) {
      console.log(message, ...args);
    }
  }

  debugError(message, ...args) {
    if (this.debugMode) {
      console.error(message, ...args);
    } else {
      console.error('NativeMimic error occurred');
    }
  }

  debugWarn(message, ...args) {
    if (this.debugMode) {
      console.warn(message, ...args);
    }
  }

  // Timer management
  safeSetTimeout(callback, delay) {
    const timerId = setTimeout(() => {
      this.activeTimers.delete(timerId);
      callback();
    }, delay);
    this.activeTimers.add(timerId);
    return timerId;
  }

  clearAllTimers() {
    this.activeTimers.forEach(timerId => clearTimeout(timerId));
    this.activeTimers.clear();
  }

  // DOM caching
  getCachedElement(id) {
    if (!this.domCache.has(id)) {
      const element = mockGetElementById(id);
      if (element) {
        this.domCache.set(id, element);
      }
      return element;
    }
    return this.domCache.get(id);
  }

  clearDOMCache() {
    this.domCache.clear();
  }

  invalidateElementCache(id) {
    this.domCache.delete(id);
  }

  // Voice caching
  getCachedVoices() {
    if (!this.voicesCache) {
      this.voicesCache = speechSynthesis.getVoices();
    }
    return this.voicesCache;
  }

  // Cleanup method (simulates hideSpeechControls)
  cleanup() {
    this.clearAllTimers();
    this.clearDOMCache();
  }
}

describe('Performance Optimizations', () => {
  let nativeMimic;

  beforeEach(() => {
    nativeMimic = new MockNativeMimic();
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockGetElementById.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Debug Logging System', () => {
    test('debugLog outputs when debugMode is true', () => {
      nativeMimic.debugMode = true;
      nativeMimic.debugLog('test message', 'arg1', 'arg2');
      
      expect(console.log).toHaveBeenCalledWith('test message', 'arg1', 'arg2');
    });

    test('debugLog is silent when debugMode is false', () => {
      nativeMimic.debugMode = false;
      nativeMimic.debugLog('test message');
      
      expect(console.log).not.toHaveBeenCalled();
    });

    test('debugError outputs details in debug mode', () => {
      nativeMimic.debugMode = true;
      nativeMimic.debugError('error message', 'details');
      
      expect(console.error).toHaveBeenCalledWith('error message', 'details');
    });

    test('debugError outputs generic message in production mode', () => {
      nativeMimic.debugMode = false;
      nativeMimic.debugError('detailed error message');
      
      expect(console.error).toHaveBeenCalledWith('NativeMimic error occurred');
    });

    test('debugWarn outputs when debugMode is true', () => {
      nativeMimic.debugMode = true;
      nativeMimic.debugWarn('warning message');
      
      expect(console.warn).toHaveBeenCalledWith('warning message');
    });

    test('debugWarn is silent when debugMode is false', () => {
      nativeMimic.debugMode = false;
      nativeMimic.debugWarn('warning message');
      
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('Timer Management', () => {
    test('safeSetTimeout tracks timers', () => {
      expect(nativeMimic.activeTimers.size).toBe(0);
      
      const callback = jest.fn();
      nativeMimic.safeSetTimeout(callback, 100);
      
      expect(nativeMimic.activeTimers.size).toBe(1);
    });

    test('safeSetTimeout removes timer from tracking when executed', () => {
      const callback = jest.fn();
      nativeMimic.safeSetTimeout(callback, 100);
      
      expect(nativeMimic.activeTimers.size).toBe(1);
      
      jest.advanceTimersByTime(100);
      
      expect(callback).toHaveBeenCalled();
      expect(nativeMimic.activeTimers.size).toBe(0);
    });

    test('clearAllTimers clears all tracked timers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      nativeMimic.safeSetTimeout(callback1, 100);
      nativeMimic.safeSetTimeout(callback2, 200);
      
      expect(nativeMimic.activeTimers.size).toBe(2);
      
      nativeMimic.clearAllTimers();
      
      expect(nativeMimic.activeTimers.size).toBe(0);
      
      // Advance time to ensure callbacks don't execute
      jest.advanceTimersByTime(300);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    test('multiple timers are tracked independently', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();
      
      nativeMimic.safeSetTimeout(callback1, 50);
      nativeMimic.safeSetTimeout(callback2, 100);
      nativeMimic.safeSetTimeout(callback3, 150);
      
      expect(nativeMimic.activeTimers.size).toBe(3);
      
      jest.advanceTimersByTime(75);
      expect(callback1).toHaveBeenCalled();
      expect(nativeMimic.activeTimers.size).toBe(2);
      
      jest.advanceTimersByTime(50);
      expect(callback2).toHaveBeenCalled();
      expect(nativeMimic.activeTimers.size).toBe(1);
    });
  });

  describe('DOM Element Caching', () => {
    test('getCachedElement returns element from DOM on first call', () => {
      const mockElement = { id: 'test-element' };
      mockGetElementById.mockReturnValue(mockElement);
      
      const result = nativeMimic.getCachedElement('test-element');
      
      expect(mockGetElementById).toHaveBeenCalledWith('test-element');
      expect(result).toBe(mockElement);
    });

    test('getCachedElement returns cached element on subsequent calls', () => {
      const mockElement = { id: 'test-element' };
      mockGetElementById.mockReturnValue(mockElement);
      
      // First call
      const result1 = nativeMimic.getCachedElement('test-element');
      // Second call
      const result2 = nativeMimic.getCachedElement('test-element');
      
      expect(mockGetElementById).toHaveBeenCalledTimes(1);
      expect(result1).toBe(mockElement);
      expect(result2).toBe(mockElement);
    });

    test('getCachedElement handles null elements gracefully', () => {
      mockGetElementById.mockReturnValue(null);
      
      const result = nativeMimic.getCachedElement('nonexistent-element');
      
      expect(result).toBeNull();
      expect(nativeMimic.domCache.has('nonexistent-element')).toBe(false);
    });

    test('clearDOMCache clears all cached elements', () => {
      const mockElement1 = { id: 'element1' };
      const mockElement2 = { id: 'element2' };
      
      mockGetElementById
        .mockReturnValueOnce(mockElement1)
        .mockReturnValueOnce(mockElement2);
      
      nativeMimic.getCachedElement('element1');
      nativeMimic.getCachedElement('element2');
      
      expect(nativeMimic.domCache.size).toBe(2);
      
      nativeMimic.clearDOMCache();
      
      expect(nativeMimic.domCache.size).toBe(0);
    });

    test('invalidateElementCache removes specific element from cache', () => {
      const mockElement = { id: 'test-element' };
      mockGetElementById.mockReturnValue(mockElement);
      
      nativeMimic.getCachedElement('test-element');
      expect(nativeMimic.domCache.has('test-element')).toBe(true);
      
      nativeMimic.invalidateElementCache('test-element');
      expect(nativeMimic.domCache.has('test-element')).toBe(false);
    });
  });

  describe('Voice Caching', () => {
    test('getCachedVoices calls speechSynthesis.getVoices on first call', () => {
      const voices = nativeMimic.getCachedVoices();
      
      expect(speechSynthesis.getVoices).toHaveBeenCalledTimes(1);
      expect(voices).toBe(mockVoices);
    });

    test('getCachedVoices returns cached voices on subsequent calls', () => {
      // First call
      const voices1 = nativeMimic.getCachedVoices();
      // Second call
      const voices2 = nativeMimic.getCachedVoices();
      
      expect(speechSynthesis.getVoices).toHaveBeenCalledTimes(1);
      expect(voices1).toBe(mockVoices);
      expect(voices2).toBe(mockVoices);
      expect(voices1).toBe(voices2); // Same cached instance
    });

    test('voice cache can be invalidated', () => {
      nativeMimic.getCachedVoices();
      expect(speechSynthesis.getVoices).toHaveBeenCalledTimes(1);
      
      // Invalidate cache
      nativeMimic.voicesCache = null;
      
      nativeMimic.getCachedVoices();
      expect(speechSynthesis.getVoices).toHaveBeenCalledTimes(2);
    });

    test('voice cache returns consistent data structure', () => {
      const voices = nativeMimic.getCachedVoices();
      
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBe(3);
      expect(voices[0]).toHaveProperty('name');
      expect(voices[0]).toHaveProperty('lang');
      expect(voices[0]).toHaveProperty('voiceURI');
    });
  });

  describe('Memory Management and Cleanup', () => {
    test('cleanup method clears all resources', () => {
      // Set up some cached data and timers
      const mockElement = { id: 'test' };
      mockGetElementById.mockReturnValue(mockElement);
      
      nativeMimic.getCachedElement('test');
      nativeMimic.getCachedVoices();
      nativeMimic.safeSetTimeout(() => {}, 100);
      
      expect(nativeMimic.domCache.size).toBe(1);
      expect(nativeMimic.voicesCache).not.toBeNull();
      expect(nativeMimic.activeTimers.size).toBe(1);
      
      nativeMimic.cleanup();
      
      expect(nativeMimic.domCache.size).toBe(0);
      expect(nativeMimic.activeTimers.size).toBe(0);
    });

    test('no memory leaks after multiple operations', () => {
      // Simulate multiple widget creations and destructions
      for (let i = 0; i < 5; i++) {
        const mockElement = { id: `element-${i}` };
        mockGetElementById.mockReturnValue(mockElement);
        
        nativeMimic.getCachedElement(`element-${i}`);
        nativeMimic.safeSetTimeout(() => {}, 50);
        
        if (i % 2 === 0) {
          nativeMimic.cleanup();
        }
      }
      
      // Final cleanup
      nativeMimic.cleanup();
      
      expect(nativeMimic.domCache.size).toBe(0);
      expect(nativeMimic.activeTimers.size).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    test('optimizations work together without conflicts', () => {
      // Enable debug mode
      nativeMimic.debugMode = true;
      
      // Use all optimization features together
      const mockElement = { id: 'widget-control' };
      mockGetElementById.mockReturnValue(mockElement);
      
      // Cache DOM element
      const element1 = nativeMimic.getCachedElement('widget-control');
      const element2 = nativeMimic.getCachedElement('widget-control');
      
      // Cache voices
      const voices1 = nativeMimic.getCachedVoices();
      const voices2 = nativeMimic.getCachedVoices();
      
      // Create managed timer
      const callback = jest.fn();
      nativeMimic.safeSetTimeout(callback, 100);
      
      // Log debug message
      nativeMimic.debugLog('Integration test message');
      
      // Verify all systems working
      expect(element1).toBe(element2);
      expect(voices1).toBe(voices2);
      expect(mockGetElementById).toHaveBeenCalledTimes(1);
      expect(speechSynthesis.getVoices).toHaveBeenCalledTimes(1);
      expect(nativeMimic.activeTimers.size).toBe(1);
      expect(console.log).toHaveBeenCalledWith('Integration test message');
      
      // Execute timer
      jest.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalled();
      expect(nativeMimic.activeTimers.size).toBe(0);
    });

    test('production mode disables debug logging but preserves functionality', () => {
      nativeMimic.debugMode = false;
      
      const mockElement = { id: 'test' };
      mockGetElementById.mockReturnValue(mockElement);
      
      // All functionality should work
      const element = nativeMimic.getCachedElement('test');
      const voices = nativeMimic.getCachedVoices();
      const callback = jest.fn();
      nativeMimic.safeSetTimeout(callback, 50);
      
      // But logging should be silent
      nativeMimic.debugLog('This should not appear');
      nativeMimic.debugWarn('This should not appear either');
      
      expect(element).toBe(mockElement);
      expect(voices).toBe(mockVoices);
      expect(console.log).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(50);
      expect(callback).toHaveBeenCalled();
    });
  });
});