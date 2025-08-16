// Unit Tests for Modular Architecture - Simplified Version
describe('NativeMimic Modular Architecture', () => {
  
  // Mock environment
  beforeAll(() => {
    global.speechSynthesis = {
      getVoices: jest.fn(() => []),
      speak: jest.fn(),
      cancel: jest.fn(),
      addEventListener: jest.fn()
    };
    
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue()
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
  });

  describe('Individual Module Architecture', () => {
    test('should load NativeMimicCore class', () => {
      require('../../mvp/nativemimic-core.js');
      expect(global.window.NativeMimicCore).toBeDefined();
      expect(typeof global.window.NativeMimicCore).toBe('function');
    });

    test('should create NativeMimicCore instance', () => {
      const core = new global.window.NativeMimicCore();
      expect(core).toBeDefined();
      expect(typeof core.init).toBe('function');
      expect(typeof core.debugLog).toBe('function');
      expect(typeof core.getCachedElement).toBe('function');
      expect(typeof core.getCachedVoices).toBe('function');
    });

    test('should load NativeMimicSpeech class', () => {
      require('../../mvp/nativemimic-speech.js');
      expect(global.window.NativeMimicSpeech).toBeDefined();
      expect(typeof global.window.NativeMimicSpeech).toBe('function');
    });

    test('should create NativeMimicSpeech instance with core dependency', () => {
      const core = new global.window.NativeMimicCore();
      const speech = new global.window.NativeMimicSpeech(core);
      expect(speech).toBeDefined();
      expect(speech.core).toBe(core);
      expect(typeof speech.speakText).toBe('function');
      expect(typeof speech.stopSpeech).toBe('function');
    });

    test('should load NativeMimicUI class', () => {
      require('../../mvp/nativemimic-ui.js');
      expect(global.window.NativeMimicUI).toBeDefined();
      expect(typeof global.window.NativeMimicUI).toBe('function');
    });

    test('should create NativeMimicUI instance with dependencies', () => {
      const core = new global.window.NativeMimicCore();
      const speech = new global.window.NativeMimicSpeech(core);
      const ui = new global.window.NativeMimicUI(core, speech);
      expect(ui).toBeDefined();
      expect(ui.core).toBe(core);
      expect(ui.speech).toBe(speech);
      expect(typeof ui.showSpeechControls).toBe('function');
    });

    test('should load NativeMimicRecording class', () => {
      require('../../mvp/nativemimic-recording.js');
      expect(global.window.NativeMimicRecording).toBeDefined();
      expect(typeof global.window.NativeMimicRecording).toBe('function');
    });

    test('should create NativeMimicRecording instance', () => {
      const core = new global.window.NativeMimicCore();
      const recording = new global.window.NativeMimicRecording(core);
      expect(recording).toBeDefined();
      expect(recording.core).toBe(core);
      expect(typeof recording.toggleRecording).toBe('function');
    });

    test('should load NativeMimicUtils class', () => {
      require('../../mvp/nativemimic-utils.js');
      expect(global.window.NativeMimicUtils).toBeDefined();
      expect(typeof global.window.NativeMimicUtils).toBe('function');
    });

    test('should create NativeMimicUtils instance', () => {
      const core = new global.window.NativeMimicCore();
      const utils = new global.window.NativeMimicUtils(core);
      expect(utils).toBeDefined();
      expect(utils.core).toBe(core);
      expect(typeof utils.detectLanguage).toBe('function');
      expect(typeof utils.preprocessTextForSpeech).toBe('function');
    });
  });

  describe('Module Integration', () => {
    let core, speech, ui, recording, utils;

    beforeEach(() => {
      core = new global.window.NativeMimicCore();
      speech = new global.window.NativeMimicSpeech(core);
      ui = new global.window.NativeMimicUI(core, speech);
      recording = new global.window.NativeMimicRecording(core);
      utils = new global.window.NativeMimicUtils(core);
    });

    test('should share core instance across all modules', () => {
      expect(speech.core).toBe(core);
      expect(ui.core).toBe(core);
      expect(recording.core).toBe(core);
      expect(utils.core).toBe(core);
    });

    test('should have proper dependency injection', () => {
      expect(ui.speech).toBe(speech);
      expect(ui.core).toBe(core);
    });

    test('should have all required methods', () => {
      // Core methods
      expect(typeof core.debugLog).toBe('function');
      expect(typeof core.getCachedElement).toBe('function');
      expect(typeof core.safeSetTimeout).toBe('function');
      
      // Speech methods
      expect(typeof speech.speakText).toBe('function');
      expect(typeof speech.toggleSpeech).toBe('function');
      expect(typeof speech.adjustSpeed).toBe('function');
      
      // UI methods
      expect(typeof ui.showSpeechControls).toBe('function');
      expect(typeof ui.hideSpeechControls).toBe('function');
      expect(typeof ui.setupSelectionListener).toBe('function');
      
      // Recording methods
      expect(typeof recording.startRecording).toBe('function');
      expect(typeof recording.stopRecording).toBe('function');
      
      // Utils methods
      expect(typeof utils.detectLanguage).toBe('function');
      expect(typeof utils.formatTextForDisplay).toBe('function');
    });
  });

  describe('Module Functionality', () => {
    test('should handle debug logging correctly', () => {
      const core = new global.window.NativeMimicCore();
      
      // Test debug mode on
      core.debugMode = true;
      core.debugLog('test message');
      expect(global.console.log).toHaveBeenCalledWith('test message');
      
      // Test debug mode off
      global.console.log.mockClear();
      core.debugMode = false;
      core.debugLog('should not appear');
      expect(global.console.log).not.toHaveBeenCalled();
    });

    test('should detect languages correctly', () => {
      const core = new global.window.NativeMimicCore();
      const utils = new global.window.NativeMimicUtils(core);
      
      expect(utils.detectLanguage('Hello world')).toBe('en');
      expect(utils.detectLanguage('Bonjour le monde')).toBe('fr');
      expect(utils.detectLanguage('Hola mundo')).toBe('es');
      expect(utils.detectLanguage('¡Hola!')).toBe('es');
      expect(utils.detectLanguage('')).toBe('en');
    });

    test('should validate text correctly', () => {
      const core = new global.window.NativeMimicCore();
      const utils = new global.window.NativeMimicUtils(core);
      
      expect(utils.isValidText('Hello world')).toBe(true);
      expect(utils.isValidText('')).toBe(false);
      expect(utils.isValidText('   ')).toBe(false);
      expect(utils.isValidText(null)).toBe(false);
      expect(utils.isValidText(undefined)).toBe(false);
    });

    test('should manage timers correctly', () => {
      const core = new global.window.NativeMimicCore();
      
      expect(core.activeTimers.size).toBe(0);
      
      const callback = jest.fn();
      const timerId = core.safeSetTimeout(callback, 100);
      
      expect(core.activeTimers.size).toBe(1);
      expect(core.activeTimers.has(timerId)).toBe(true);
      
      core.clearAllTimers();
      expect(core.activeTimers.size).toBe(0);
    });
  });

  describe('Memory Management', () => {
    test('should provide cleanup methods', () => {
      const core = new global.window.NativeMimicCore();
      
      expect(typeof core.clearAllTimers).toBe('function');
      expect(typeof core.clearDOMCache).toBe('function');
      expect(typeof core.cleanup).toBe('function');
    });

    test('should clean up resources properly', () => {
      const core = new global.window.NativeMimicCore();
      
      // Add some timers and cache
      core.safeSetTimeout(() => {}, 100);
      core.domCache.set('test', { element: true });
      
      expect(core.activeTimers.size).toBe(1);
      expect(core.domCache.size).toBe(1);
      
      core.cleanup();
      
      expect(core.activeTimers.size).toBe(0);
      expect(core.domCache.size).toBe(0);
    });
  });
});