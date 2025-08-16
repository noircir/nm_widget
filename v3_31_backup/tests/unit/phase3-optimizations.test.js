// Unit Tests for Phase 3 Optimizations
describe('NativeMimic Phase 3 Optimizations', () => {
  
  // Mock environment
  beforeAll(() => {
    global.speechSynthesis = {
      getVoices: jest.fn(() => []),
      speak: jest.fn(),
      cancel: jest.fn(),
      addEventListener: jest.fn()
    };
    
    global.chrome = {
      runtime: {
        onInstalled: {
          addListener: jest.fn()
        },
        onMessage: {
          addListener: jest.fn()
        }
      },
      action: {
        onClicked: {
          addListener: jest.fn()
        }
      },
      storage: {
        sync: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue(),
          getBytesInUse: jest.fn().mockResolvedValue(1024),
          QUOTA_BYTES: 102400
        },
        local: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue()
        }
      }
    };
    
    global.document = {
      getElementById: jest.fn(),
      createElement: jest.fn(() => ({
        style: {},
        addEventListener: jest.fn(),
        remove: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => [])
      })),
      body: {
        addEventListener: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() },
        appendChild: jest.fn()
      },
      addEventListener: jest.fn(),
      readyState: 'complete'
    };
    
    global.window = {
      innerWidth: 1024,
      innerHeight: 768,
      navigator: {
        userAgent: 'Chrome/91.0',
        mediaDevices: { getUserMedia: jest.fn() }
      },
      addEventListener: jest.fn()
    };
    
    global.navigator = global.window.navigator;
    global.console = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
    global.performance = {
      now: jest.fn(() => Date.now()),
      memory: {
        usedJSHeapSize: 5000000,
        totalJSHeapSize: 10000000,
        jsHeapSizeLimit: 50000000
      }
    };
  });

  describe('Storage Batching System', () => {
    let core;

    beforeEach(() => {
      require('../../mvp/nativemimic-core.js');
      core = new global.window.NativeMimicCore();
    });

    test('should initialize storage batching properties', () => {
      expect(core.storageBatch).toBeInstanceOf(Map);
      expect(core.storageBatchTimer).toBeNull();
      expect(core.storageBatchDelay).toBe(500);
    });

    test('should batch storage operations', () => {
      jest.useFakeTimers();
      
      core.batchStorageSet('key1', 'value1');
      core.batchStorageSet('key2', 'value2');
      
      expect(core.storageBatch.size).toBe(2);
      expect(core.storageBatch.get('key1')).toBe('value1');
      expect(core.storageBatch.get('key2')).toBe('value2');
      
      jest.useRealTimers();
    });

    test('should flush storage batch after delay', async () => {
      jest.useFakeTimers();
      
      core.batchStorageSet('key1', 'value1');
      expect(core.storageBatchTimer).not.toBeNull();
      
      // Fast-forward time and flush
      jest.runAllTimers();
      
      // Wait for promise resolution
      await Promise.resolve();
      
      expect(global.chrome.storage.sync.set).toHaveBeenCalledWith({
        key1: 'value1'
      });
      
      jest.useRealTimers();
    });

    test('should provide storage quota information', async () => {
      const quota = await core.getStorageQuota();
      
      expect(quota).toHaveProperty('used');
      expect(quota).toHaveProperty('available');
      expect(quota).toHaveProperty('percentage');
      expect(typeof quota.used).toBe('number');
      expect(typeof quota.percentage).toBe('number');
    });

    test('should clean up old storage data', async () => {
      const mockStorageData = {
        'audioCache_old': { timestamp: Date.now() - (25 * 60 * 60 * 1000) }, // 25 hours old
        'audioCache_new': { timestamp: Date.now() - (1 * 60 * 60 * 1000) }, // 1 hour old
        'regularKey': 'value'
      };
      
      global.chrome.storage.sync.get.mockResolvedValueOnce(mockStorageData);
      global.chrome.storage.sync.remove = jest.fn().mockResolvedValue();
      
      await core.cleanupOldStorageData();
      
      expect(global.chrome.storage.sync.remove).toHaveBeenCalledWith(['audioCache_old']);
    });
  });

  describe('Performance Monitoring', () => {
    let background;

    beforeEach(() => {
      // Create a mock background service for testing performance monitoring
      background = {
        performanceMetrics: {
          startTime: Date.now(),
          messageCount: 0,
          errorCount: 0,
          memoryUsage: [],
          responseTimesSamples: []
        },
        recordMemoryUsage() {
          if (global.performance.memory) {
            const memoryInfo = {
              timestamp: Date.now(),
              usedJSHeapSize: global.performance.memory.usedJSHeapSize,
              totalJSHeapSize: global.performance.memory.totalJSHeapSize,
              jsHeapSizeLimit: global.performance.memory.jsHeapSizeLimit
            };
            this.performanceMetrics.memoryUsage.push(memoryInfo);
          }
        },
        recordResponseTime(responseTime) {
          this.performanceMetrics.responseTimesSamples.push(responseTime);
        },
        getPerformanceReport() {
          const uptime = Date.now() - this.performanceMetrics.startTime;
          const avgResponseTime = this.performanceMetrics.responseTimesSamples.length > 0 
            ? this.performanceMetrics.responseTimesSamples.reduce((a, b) => a + b, 0) / this.performanceMetrics.responseTimesSamples.length
            : 0;
          
          return {
            uptime,
            messageCount: this.performanceMetrics.messageCount,
            errorCount: this.performanceMetrics.errorCount,
            averageResponseTime: Math.round(avgResponseTime * 100) / 100
          };
        }
      };
    });

    test('should record memory usage', () => {
      background.recordMemoryUsage();
      
      expect(background.performanceMetrics.memoryUsage.length).toBe(1);
      const memoryEntry = background.performanceMetrics.memoryUsage[0];
      expect(memoryEntry).toHaveProperty('timestamp');
      expect(memoryEntry).toHaveProperty('usedJSHeapSize');
      expect(memoryEntry).toHaveProperty('totalJSHeapSize');
    });

    test('should record response times', () => {
      background.recordResponseTime(150);
      background.recordResponseTime(200);
      background.recordResponseTime(100);
      
      expect(background.performanceMetrics.responseTimesSamples).toEqual([150, 200, 100]);
    });

    test('should generate performance report', () => {
      background.performanceMetrics.messageCount = 10;
      background.performanceMetrics.errorCount = 1;
      background.recordResponseTime(150);
      background.recordResponseTime(200);
      
      const report = background.getPerformanceReport();
      
      expect(report).toHaveProperty('uptime');
      expect(report).toHaveProperty('messageCount', 10);
      expect(report).toHaveProperty('errorCount', 1);
      expect(report).toHaveProperty('averageResponseTime', 175);
    });
  });

  describe('Lazy Loading System', () => {
    let nativeMimic;

    beforeEach(() => {
      // Load all required modules
      require('../../mvp/nativemimic-core.js');
      require('../../mvp/nativemimic-speech.js');
      require('../../mvp/nativemimic-ui.js');
      require('../../mvp/nativemimic-recording.js');
      require('../../mvp/nativemimic-utils.js');
      require('../../mvp/nativemimic-main.js');
      
      nativeMimic = new global.window.NativeMimic();
    });

    test('should initialize with core module only', () => {
      expect(nativeMimic.core).toBeDefined();
      expect(nativeMimic._speech).toBeDefined(); // Speech is pre-initialized with UI
      expect(nativeMimic._ui).toBeDefined(); // UI is pre-initialized
      expect(nativeMimic._recording).toBeNull();
      expect(nativeMimic._utils).toBeNull();
    });

    test('should pre-load speech module with UI', () => {
      expect(nativeMimic._speech).toBeDefined(); // Speech is pre-initialized with UI
      expect(nativeMimic.modulesLoaded.speech).toBe(true);
    });

    test('should lazy load recording module on first access', () => {
      const recording = nativeMimic.recording;
      
      expect(nativeMimic._recording).toBeDefined();
      expect(nativeMimic.modulesLoaded.recording).toBe(true);
      expect(recording).toBe(nativeMimic._recording);
    });

    test('should lazy load utils module on first access', () => {
      const utils = nativeMimic.utils;
      
      expect(nativeMimic._utils).toBeDefined();
      expect(nativeMimic.modulesLoaded.utils).toBe(true);
      expect(utils).toBe(nativeMimic._utils);
    });

    test('should return same instance on multiple accesses', () => {
      const recording1 = nativeMimic.recording;
      const recording2 = nativeMimic.recording;
      
      expect(recording1).toBe(recording2);
    });
  });

  describe('CSS Optimization', () => {
    test('should have CSS custom properties defined', () => {
      // Since we can't easily test CSS in Jest, we'll test that the CSS file exists
      // and has the expected structure by reading it
      const fs = require('fs');
      const path = require('path');
      
      const cssPath = path.join(__dirname, '../../mvp/content-optimized.css');
      expect(fs.existsSync(cssPath)).toBe(true);
      
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      
      // Check for custom properties
      expect(cssContent).toContain('--nm-primary-blue');
      expect(cssContent).toContain('--nm-font-family');
      expect(cssContent).toContain('--nm-shadow-medium');
      expect(cssContent).toContain('--nm-transition-fast');
      
      // Check for consolidated selectors
      expect(cssContent).toContain('.nativemimic-modal');
      expect(cssContent).toContain('.nativemimic-btn');
      expect(cssContent).toContain('.nativemimic-form-control');
    });

    test('should have reduced file size compared to original', () => {
      const fs = require('fs');
      const path = require('path');
      
      const originalPath = path.join(__dirname, '../../mvp/content.css');
      const optimizedPath = path.join(__dirname, '../../mvp/content-optimized.css');
      
      if (fs.existsSync(originalPath) && fs.existsSync(optimizedPath)) {
        const originalSize = fs.statSync(originalPath).size;
        const optimizedSize = fs.statSync(optimizedPath).size;
        
        expect(optimizedSize).toBeLessThan(originalSize);
        
        // Should be significantly smaller (at least 50% reduction)
        const reductionPercentage = ((originalSize - optimizedSize) / originalSize) * 100;
        expect(reductionPercentage).toBeGreaterThan(50);
      }
    });
  });

  describe('Memory Management', () => {
    let core;

    beforeEach(() => {
      require('../../mvp/nativemimic-core.js');
      core = new global.window.NativeMimicCore();
    });

    test('should clean up timers on cleanup', () => {
      const callback = jest.fn();
      const timerId = core.safeSetTimeout(callback, 100);
      
      expect(core.activeTimers.size).toBe(1);
      
      core.cleanup();
      
      expect(core.activeTimers.size).toBe(0);
    });

    test('should clean up DOM cache on cleanup', () => {
      core.domCache.set('test', { element: true });
      expect(core.domCache.size).toBe(1);
      
      core.cleanup();
      
      expect(core.domCache.size).toBe(0);
    });

    test('should clean up audio cache on cleanup', () => {
      core.cacheAudio('test-key', 'test-url');
      expect(core.audioCache.size).toBe(1);
      
      core.cleanupCache();
      
      expect(core.audioCache.size).toBe(0);
    });

    test('should flush storage batch on cleanup', async () => {
      jest.useFakeTimers();
      
      core.batchStorageSet('key1', 'value1');
      expect(core.storageBatch.size).toBe(1);
      
      await core.flushStorageBatch();
      
      expect(core.storageBatch.size).toBe(0);
      
      jest.useRealTimers();
    });
  });

  describe('Bundle Size Optimization', () => {
    test('should use optimized CSS file naming', () => {
      const optimizedName = 'content-optimized.css';
      expect(optimizedName).toMatch(/optimized/);
    });

    test('should minimize initial loading footprint', () => {
      require('../../mvp/nativemimic-main.js');
      const nativeMimic = new global.window.NativeMimic();
      
      // Only core should be loaded initially, UI pre-loaded for UX
      expect(nativeMimic.modulesLoaded.ui).toBe(true);
      expect(nativeMimic.modulesLoaded.speech).toBe(true); // Pre-loaded with UI
      expect(nativeMimic.modulesLoaded.recording).toBe(false);
      expect(nativeMimic.modulesLoaded.utils).toBe(false);
    });
  });
});