// Unit Tests for QuickSpeak Core Functionality

// Mock QuickSpeak widget class for testing
class MockQuickSpeakWidget {
  constructor() {
    this.isEnabled = false;
    this.currentSkin = 'default';
    this.currentSpeed = 1.0;
    this.isChrome = false;
    this.chromeVersion = null;
    this.initBrowserDetection();
  }

  initBrowserDetection() {
    const userAgent = navigator.userAgent || '';
    this.isChrome = userAgent.includes('Chrome') && 
                   !userAgent.includes('Brave') && 
                   !global.window?.navigator?.brave;
    
    if (this.isChrome) {
      const match = userAgent.match(/Chrome\/(\d+)/);
      this.chromeVersion = match ? parseInt(match[1]) : null;
    }
  }

  increaseSpeed() {
    if (this.currentSpeed < 3.0) {
      this.currentSpeed = Math.round((this.currentSpeed + 0.1) * 10) / 10;
    }
  }

  decreaseSpeed() {
    if (this.currentSpeed > 0.5) {
      this.currentSpeed = Math.round((this.currentSpeed - 0.1) * 10) / 10;
    }
  }

  processSelectedText(text) {
    return text ? text.trim() : '';
  }

  calculateWidgetPosition(range) {
    const rect = range.getBoundingClientRect();
    let x = rect.left + (rect.width / 2) - 150;
    let y = rect.bottom + 10;
    
    // Keep within viewport
    x = Math.max(10, Math.min(x, window.innerWidth - 310));
    y = Math.max(10, Math.min(y, window.innerHeight - 60));
    
    return { x, y };
  }

  async saveSettings(settings) {
    return chrome.storage.sync.set({ quickspeakSettings: settings });
  }

  async loadSettings() {
    const result = await chrome.storage.sync.get('quickspeakSettings');
    const settings = result.quickspeakSettings || {};
    
    this.currentSkin = settings.skin || 'default';
    this.currentSpeed = settings.speed || 1.0;
  }

  toggleEnabled() {
    this.isEnabled = !this.isEnabled;
  }

  speakTextChrome(text) {
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utterance);
    }
  }

  speakText(text) {
    if (typeof speechSynthesis !== 'undefined') {
      // Primer for non-Chrome browsers
      if (!this.isChrome) {
        const primer = new SpeechSynthesisUtterance('');
        primer.rate = 0.5;
        speechSynthesis.speak(primer);
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utterance);
    }
  }

  cleanup() {
    const widget = document.getElementById('quickspeak-controls');
    if (widget) {
      widget.remove();
    }
  }

  handleKeyboard(event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'e') {
      event.preventDefault();
      event.stopPropagation();
      this.toggleEnabled();
    }
  }

  applySkin(skinName) {
    this.currentSkin = skinName;
  }

  isValidText(text) {
    return !!(text && text.trim().length > 0);
  }

  detectLanguage(text) {
    // Simple language detection
    if (/^[a-zA-Z\s.,!?-]+$/.test(text)) {
      if (text.includes('the ') || text.includes('and ') || text.includes('is ')) {
        return 'en-US';
      }
      if (text.includes('le ') || text.includes('la ') || text.includes('est ')) {
        return 'fr-FR';
      }
    }
    return 'en-US'; // Default
  }

  isValidPage(url) {
    return url && 
           !url.startsWith('chrome://') && 
           !url.startsWith('chrome-extension://') &&
           !url.startsWith('about:');
  }
}

// Create a test environment
function createTestEnvironment() {
  return new MockQuickSpeakWidget();
}

describe('QuickSpeak Widget Core Functionality', () => {
  let widget;

  beforeEach(() => {
    jest.clearAllMocks();
    widget = createTestEnvironment();
  });

  test('Widget initializes correctly', () => {
    expect(widget).toBeDefined();
    expect(widget.isEnabled).toBe(false); // Default disabled state
    expect(widget.currentSkin).toBe('default');
    expect(widget.currentSpeed).toBe(1.0);
  });

  test('Browser detection works correctly', () => {
    // Test Chrome detection
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
    });
    
    const chromeWidget = createTestEnvironment();
    expect(chromeWidget.isChrome).toBe(true);
    expect(chromeWidget.chromeVersion).toBe(130);

    // Test Brave detection
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Brave/1.0'
    });
    global.window.navigator = { brave: {} };
    
    const braveWidget = createTestEnvironment();
    expect(braveWidget.isChrome).toBe(false);
  });

  test('Speed control functions work', () => {
    widget.currentSpeed = 1.0;
    
    // Test increase speed
    widget.increaseSpeed();
    expect(widget.currentSpeed).toBe(1.1);
    
    // Test decrease speed
    widget.decreaseSpeed();
    expect(widget.currentSpeed).toBe(1.0);
    
    // Test boundaries
    widget.currentSpeed = 3.0;
    widget.increaseSpeed();
    expect(widget.currentSpeed).toBe(3.0); // Should not exceed max
    
    widget.currentSpeed = 0.5;
    widget.decreaseSpeed();
    expect(widget.currentSpeed).toBe(0.5); // Should not go below min
  });

  test('Text selection processing works', () => {
    const testText = '  Hello world!  ';
    const processed = widget.processSelectedText(testText);
    
    expect(processed).toBe('Hello world!'); // Should trim whitespace
    expect(processed.length).toBeGreaterThan(0);
  });

  test('Widget positioning calculations work', () => {
    const mockRange = {
      getBoundingClientRect: () => ({
        top: 100,
        left: 200,
        bottom: 120,
        right: 300,
        width: 100,
        height: 20
      })
    };
    
    const position = widget.calculateWidgetPosition(mockRange);
    
    expect(position.x).toBeGreaterThanOrEqual(0);
    expect(position.y).toBeGreaterThanOrEqual(0);
    expect(position.x).toBeLessThan(window.innerWidth);
    expect(position.y).toBeLessThan(window.innerHeight);
  });

  test('Settings persistence works', async () => {
    const testSettings = {
      skin: 'sunflower',
      speed: 1.5,
      position: { x: 100, y: 200 }
    };
    
    // Mock chrome.storage.sync.set to resolve
    chrome.storage.sync.set.mockResolvedValue();
    
    await widget.saveSettings(testSettings);
    
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      quickspeakSettings: testSettings
    });
  });

  test('Settings loading works', async () => {
    const savedSettings = {
      skin: 'ocean',
      speed: 1.8,
      position: { x: 150, y: 250 }
    };
    
    chrome.storage.sync.get.mockResolvedValue({
      quickspeakSettings: savedSettings
    });
    
    await widget.loadSettings();
    
    expect(widget.currentSkin).toBe('ocean');
    expect(widget.currentSpeed).toBe(1.8);
  });

  test('Enable/disable functionality works', () => {
    // Initially disabled
    expect(widget.isEnabled).toBe(false);
    
    // Enable widget
    widget.toggleEnabled();
    expect(widget.isEnabled).toBe(true);
    
    // Disable widget
    widget.toggleEnabled();
    expect(widget.isEnabled).toBe(false);
  });

  test('Chrome-specific speech handling', () => {
    // Create Chrome environment
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Chrome/130.0.0.0'
    });
    
    const chromeWidget = createTestEnvironment();
    chromeWidget.isChrome = true;
    chromeWidget.chromeVersion = 130;
    
    // Mock speechSynthesis
    global.speechSynthesis.cancel = jest.fn();
    global.speechSynthesis.speak = jest.fn();
    
    const testText = 'Hello world';
    chromeWidget.speakTextChrome(testText);
    
    // Should call cancel before speak (Chrome autoplay policy)
    expect(speechSynthesis.cancel).toHaveBeenCalled();
    expect(speechSynthesis.speak).toHaveBeenCalled();
  });

  test('Non-Chrome speech handling with primer', () => {
    // Create non-Chrome environment
    const nonChromeWidget = createTestEnvironment();
    nonChromeWidget.isChrome = false;
    
    global.speechSynthesis.speak = jest.fn();
    
    const testText = 'Hello world';
    nonChromeWidget.speakText(testText);
    
    // Should call speak at least twice (primer + actual text)
    expect(speechSynthesis.speak).toHaveBeenCalledTimes(2);
  });

  test('Error handling for missing APIs', () => {
    // Remove speechSynthesis
    delete global.speechSynthesis;
    
    const noAPIWidget = createTestEnvironment();
    
    // Should not throw error
    expect(() => {
      noAPIWidget.speakText('test');
    }).not.toThrow();
  });

  test('Widget cleanup on removal', () => {
    const mockElement = {
      remove: jest.fn(),
      removeEventListener: jest.fn()
    };
    
    document.getElementById = jest.fn().mockReturnValue(mockElement);
    
    widget.cleanup();
    
    expect(mockElement.remove).toHaveBeenCalled();
  });

  test('Keyboard shortcuts handling', () => {
    const mockEvent = {
      key: 'e',
      ctrlKey: true,
      shiftKey: true,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };
    
    widget.handleKeyboard(mockEvent);
    
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(widget.isEnabled).toBe(true); // Should toggle enabled state
  });

  test('Skin application works', () => {
    const mockWidget = {
      style: {},
      querySelector: jest.fn(() => ({ style: {} })),
      querySelectorAll: jest.fn(() => [{ style: {} }])
    };
    
    document.getElementById = jest.fn().mockReturnValue(mockWidget);
    
    widget.applySkin('sunflower');
    
    expect(widget.currentSkin).toBe('sunflower');
  });
});

describe('QuickSpeak Utility Functions', () => {
  test('Text validation works', () => {
    const widget = createTestEnvironment();
    
    expect(widget.isValidText('')).toBe(false);
    expect(widget.isValidText('   ')).toBe(false);
    expect(widget.isValidText('Hello')).toBe(true);
  });

  test('Language detection works', () => {
    const englishText = 'Hello world the test';
    const frenchText = 'Bonjour le monde';
    
    const widget = createTestEnvironment();
    
    expect(widget.detectLanguage(englishText)).toMatch(/en/);
    expect(widget.detectLanguage(frenchText)).toMatch(/fr/);
  });

  test('URL validation works', () => {
    const widget = createTestEnvironment();
    
    expect(widget.isValidPage('https://example.com')).toBe(true);
    expect(widget.isValidPage('chrome://extensions')).toBe(false);
    expect(widget.isValidPage('chrome-extension://')).toBe(false);
  });
});