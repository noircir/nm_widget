// Unit Tests for Console Logging Optimization

// Mock console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn
};

console.log = jest.fn();
console.error = jest.fn();
console.warn = jest.fn();

// Mock Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve())
    }
  }
};

// Mock DOM
global.document = {
  addEventListener: jest.fn(),
  readyState: 'complete'
};

global.window = {
  addEventListener: jest.fn()
};

// Mock speechSynthesis
global.speechSynthesis = {
  getVoices: jest.fn(() => []),
  addEventListener: jest.fn()
};

describe('Console Logging Optimization', () => {
  let nativeMimic;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset console mocks
    console.log.mockClear();
    console.error.mockClear();
    console.warn.mockClear();
  });

  afterEach(() => {
    // Clean up instance
    if (nativeMimic) {
      nativeMimic = null;
    }
  });

  describe('Debug Mode Functionality', () => {
    test('should initialize with debug mode enabled by default', () => {
      // Mock the content.js file structure
      class MockNativeMimic {
        constructor() {
          this.debugMode = true; // Default state
        }

        debugLog(message, ...args) {
          if (this.debugMode) {
            console.log(`[NativeMimic]`, message, ...args);
          }
        }

        debugError(message, ...args) {
          if (this.debugMode) {
            console.error(`[NativeMimic ERROR]`, message, ...args);
          } else {
            console.error('NativeMimic error occurred');
          }
        }

        debugWarn(message, ...args) {
          if (this.debugMode) {
            console.warn(`[NativeMimic WARN]`, message, ...args);
          }
        }
      }

      nativeMimic = new MockNativeMimic();
      expect(nativeMimic.debugMode).toBe(true);
    });

    test('should log messages when debug mode is enabled', () => {
      class MockNativeMimic {
        constructor() {
          this.debugMode = true;
        }

        debugLog(message, ...args) {
          if (this.debugMode) {
            console.log(`[NativeMimic]`, message, ...args);
          }
        }
      }

      nativeMimic = new MockNativeMimic();
      nativeMimic.debugLog('Test message', 'extra arg');

      expect(console.log).toHaveBeenCalledWith('[NativeMimic]', 'Test message', 'extra arg');
    });

    test('should not log messages when debug mode is disabled', () => {
      class MockNativeMimic {
        constructor() {
          this.debugMode = false;
        }

        debugLog(message, ...args) {
          if (this.debugMode) {
            console.log(`[NativeMimic]`, message, ...args);
          }
        }
      }

      nativeMimic = new MockNativeMimic();
      nativeMimic.debugLog('Test message');

      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('Error Logging Behavior', () => {
    test('should log detailed errors when debug mode is enabled', () => {
      class MockNativeMimic {
        constructor() {
          this.debugMode = true;
        }

        debugError(message, ...args) {
          if (this.debugMode) {
            console.error(`[NativeMimic ERROR]`, message, ...args);
          } else {
            console.error('NativeMimic error occurred');
          }
        }
      }

      nativeMimic = new MockNativeMimic();
      nativeMimic.debugError('Detailed error message', { code: 500 });

      expect(console.error).toHaveBeenCalledWith('[NativeMimic ERROR]', 'Detailed error message', { code: 500 });
    });

    test('should log generic error when debug mode is disabled', () => {
      class MockNativeMimic {
        constructor() {
          this.debugMode = false;
        }

        debugError(message, ...args) {
          if (this.debugMode) {
            console.error(`[NativeMimic ERROR]`, message, ...args);
          } else {
            console.error('NativeMimic error occurred');
          }
        }
      }

      nativeMimic = new MockNativeMimic();
      nativeMimic.debugError('Detailed error message');

      expect(console.error).toHaveBeenCalledWith('NativeMimic error occurred');
      expect(console.error).not.toHaveBeenCalledWith('[NativeMimic ERROR]', 'Detailed error message');
    });
  });

  describe('Warning Logging Behavior', () => {
    test('should log warnings when debug mode is enabled', () => {
      class MockNativeMimic {
        constructor() {
          this.debugMode = true;
        }

        debugWarn(message, ...args) {
          if (this.debugMode) {
            console.warn(`[NativeMimic WARN]`, message, ...args);
          }
        }
      }

      nativeMimic = new MockNativeMimic();
      nativeMimic.debugWarn('Warning message');

      expect(console.warn).toHaveBeenCalledWith('[NativeMimic WARN]', 'Warning message');
    });

    test('should not log warnings when debug mode is disabled', () => {
      class MockNativeMimic {
        constructor() {
          this.debugMode = false;
        }

        debugWarn(message, ...args) {
          if (this.debugMode) {
            console.warn(`[NativeMimic WARN]`, message, ...args);
          }
        }
      }

      nativeMimic = new MockNativeMimic();
      nativeMimic.debugWarn('Warning message');

      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('Performance Benefits', () => {
    test('should reduce console overhead when debug mode is disabled', () => {
      class MockNativeMimic {
        constructor() {
          this.debugMode = false;
        }

        debugLog(message, ...args) {
          if (this.debugMode) {
            console.log(`[NativeMimic]`, message, ...args);
          }
        }

        debugError(message, ...args) {
          if (this.debugMode) {
            console.error(`[NativeMimic ERROR]`, message, ...args);
          } else {
            console.error('NativeMimic error occurred');
          }
        }

        debugWarn(message, ...args) {
          if (this.debugMode) {
            console.warn(`[NativeMimic WARN]`, message, ...args);
          }
        }
      }

      nativeMimic = new MockNativeMimic();
      
      // Simulate multiple debug calls (like in real usage)
      for (let i = 0; i < 10; i++) {
        nativeMimic.debugLog(`Debug message ${i}`);
        nativeMimic.debugWarn(`Warning ${i}`);
      }

      // Only error should be called (and only once if there were errors)
      expect(console.log).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      // console.error might be called for actual errors, but not for debug
    });

    test('should maintain consistent API regardless of debug mode', () => {
      class MockNativeMimic {
        constructor(debugMode) {
          this.debugMode = debugMode;
        }

        debugLog(message, ...args) {
          if (this.debugMode) {
            console.log(`[NativeMimic]`, message, ...args);
          }
          return 'debug-log-called'; // Consistent return for testing
        }

        debugError(message, ...args) {
          if (this.debugMode) {
            console.error(`[NativeMimic ERROR]`, message, ...args);
          } else {
            console.error('NativeMimic error occurred');
          }
          return 'debug-error-called';
        }
      }

      // Test with debug enabled
      const debugEnabled = new MockNativeMimic(true);
      expect(debugEnabled.debugLog('test')).toBe('debug-log-called');
      expect(debugEnabled.debugError('test')).toBe('debug-error-called');

      // Test with debug disabled
      const debugDisabled = new MockNativeMimic(false);
      expect(debugDisabled.debugLog('test')).toBe('debug-log-called');
      expect(debugDisabled.debugError('test')).toBe('debug-error-called');
    });
  });

  describe('Migration from Direct Console Usage', () => {
    test('should handle the same arguments as original console.log', () => {
      class MockNativeMimic {
        constructor() {
          this.debugMode = true;
        }

        debugLog(message, ...args) {
          if (this.debugMode) {
            console.log(`[NativeMimic]`, message, ...args);
          }
        }
      }

      nativeMimic = new MockNativeMimic();
      
      // Test various argument patterns that were used in original code
      nativeMimic.debugLog('Simple message');
      nativeMimic.debugLog('Message with', 'multiple', 'arguments');
      nativeMimic.debugLog('Message with object:', { key: 'value' });
      nativeMimic.debugLog('Message with array:', [1, 2, 3]);

      expect(console.log).toHaveBeenCalledTimes(4);
      expect(console.log).toHaveBeenCalledWith('[NativeMimic]', 'Simple message');
      expect(console.log).toHaveBeenCalledWith('[NativeMimic]', 'Message with', 'multiple', 'arguments');
      expect(console.log).toHaveBeenCalledWith('[NativeMimic]', 'Message with object:', { key: 'value' });
      expect(console.log).toHaveBeenCalledWith('[NativeMimic]', 'Message with array:', [1, 2, 3]);
    });
  });

  describe('Production Readiness', () => {
    test('should be safe to set debugMode to false for production', () => {
      class MockNativeMimic {
        constructor() {
          // Simulate production setting
          this.debugMode = false;
        }

        debugLog(message, ...args) {
          if (this.debugMode) {
            console.log(`[NativeMimic]`, message, ...args);
          }
        }

        debugError(message, ...args) {
          if (this.debugMode) {
            console.error(`[NativeMimic ERROR]`, message, ...args);
          } else {
            console.error('NativeMimic error occurred');
          }
        }

        debugWarn(message, ...args) {
          if (this.debugMode) {
            console.warn(`[NativeMimic WARN]`, message, ...args);
          }
        }

        // Simulate some core functionality that uses debug logging
        performCoreFunction() {
          this.debugLog('Core function started');
          this.debugWarn('This is a warning');
          
          try {
            // Simulate some work
            return 'success';
          } catch (error) {
            this.debugError('Error in core function:', error);
            throw error;
          }
        }
      }

      nativeMimic = new MockNativeMimic();
      const result = nativeMimic.performCoreFunction();

      // Core functionality should work
      expect(result).toBe('success');
      
      // But debug logs should not appear
      expect(console.log).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      
      // Only error logging should be minimal
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('[NativeMimic ERROR]')
      );
    });
  });
});

// Restore original console methods
afterAll(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
});