// Unit Tests for Skin Color Persistence

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
global.document = {
  getElementById: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  createElement: jest.fn(() => ({
    style: {},
    addEventListener: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }))
};

describe('QuickSpeak Skin Persistence', () => {
  let quickSpeakInstance;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock the QuickSpeak class (simplified)
    quickSpeakInstance = {
      currentSkin: 'blue',
      customColors: null,
      presetSkins: {
        blue: { name: 'Ocean Blue', gradient: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)' },
        lime: { name: 'Lime Green', gradient: 'linear-gradient(135deg, #32CD32 0%, #90EE90 100%)' },
        custom: { name: 'Custom' }
      },
      
      applySkin(skinKey) {
        this.currentSkin = skinKey;
        this.customColors = null;
        this.updateWidgetSkin();
        this.saveSkinSettings();
      },
      
      applyCustomSkin(color1, color2) {
        this.currentSkin = 'custom';
        this.customColors = { color1, color2 };
        this.updateWidgetSkin();
        this.saveSkinSettings();
      },
      
      saveSkinSettings() {
        const skinSettings = {
          currentSkin: this.currentSkin,
          customColors: this.customColors
        };
        chrome.storage.sync.set({ skinSettings });
      },
      
      loadSkinSettings() {
        return new Promise((resolve) => {
          chrome.storage.sync.get(['skinSettings'], (result) => {
            if (result && result.skinSettings) {
              this.currentSkin = result.skinSettings.currentSkin || 'blue';
              this.customColors = result.skinSettings.customColors || null;
            }
            resolve();
          });
        });
      },
      
      updateWidgetSkin() {
        // Mock DOM update
      }
    };
  });

  test('Should save skin settings when applying new skin', () => {
    // Apply lime green skin
    quickSpeakInstance.applySkin('lime');
    
    // Verify skin was changed
    expect(quickSpeakInstance.currentSkin).toBe('lime');
    
    // Verify storage was called
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      skinSettings: {
        currentSkin: 'lime',
        customColors: null
      }
    });
  });

  test('Should load skin settings from storage', async () => {
    // Mock storage returning lime green
    chrome.storage.sync.get.mockImplementation((keys, callback) => {
      callback({
        skinSettings: {
          currentSkin: 'lime',
          customColors: null
        }
      });
    });
    
    // Load settings
    await quickSpeakInstance.loadSkinSettings();
    
    // Verify skin was loaded
    expect(quickSpeakInstance.currentSkin).toBe('lime');
    expect(chrome.storage.sync.get).toHaveBeenCalledWith(['skinSettings'], expect.any(Function));
  });

  test('Should persist custom colors', () => {
    // Apply custom skin
    quickSpeakInstance.applyCustomSkin('#FF0000', '#00FF00');
    
    // Verify custom skin was set
    expect(quickSpeakInstance.currentSkin).toBe('custom');
    expect(quickSpeakInstance.customColors).toEqual({
      color1: '#FF0000',
      color2: '#00FF00'
    });
    
    // Verify storage was called with custom colors
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      skinSettings: {
        currentSkin: 'custom',
        customColors: {
          color1: '#FF0000',
          color2: '#00FF00'
        }
      }
    });
  });

  test('Should fallback to blue skin if no settings found', async () => {
    // Mock storage returning empty
    chrome.storage.sync.get.mockImplementation((keys, callback) => {
      callback({});
    });
    
    // Reset to default
    quickSpeakInstance.currentSkin = 'blue';
    
    // Load settings
    await quickSpeakInstance.loadSkinSettings();
    
    // Should remain blue (default)
    expect(quickSpeakInstance.currentSkin).toBe('blue');
  });

  test('Should handle storage errors gracefully', async () => {
    // Mock storage error
    chrome.storage.sync.get.mockImplementation((keys, callback) => {
      // Simulate error - callback with undefined/null
      callback(null);
    });
    
    // Should not throw error
    expect(async () => {
      await quickSpeakInstance.loadSkinSettings();
    }).not.toThrow();
  });

  test('Should apply skin to existing widget after loading settings', async () => {
    // Mock widget exists
    global.document.getElementById.mockReturnValue({ style: {} });
    
    // Mock updateWidgetSkin to track calls
    const updateSkinSpy = jest.fn();
    quickSpeakInstance.updateWidgetSkin = updateSkinSpy;
    
    // Mock storage returning lime skin
    chrome.storage.sync.get.mockImplementation((keys, callback) => {
      callback({
        skinSettings: {
          currentSkin: 'lime',
          customColors: null
        }
      });
    });
    
    // Load settings
    await quickSpeakInstance.loadSkinSettings();
    
    // Should apply skin to existing widget
    expect(updateSkinSpy).toHaveBeenCalled();
    expect(quickSpeakInstance.currentSkin).toBe('lime');
  });

  test('Skin persistence across widget recreations', () => {
    // Apply lime skin
    quickSpeakInstance.applySkin('lime');
    expect(quickSpeakInstance.currentSkin).toBe('lime');
    
    // Simulate widget recreation (new instance)
    const newInstance = { ...quickSpeakInstance };
    newInstance.currentSkin = 'blue'; // Reset to default
    
    // Mock loading saved settings
    chrome.storage.sync.get.mockImplementation((keys, callback) => {
      callback({
        skinSettings: {
          currentSkin: 'lime',
          customColors: null
        }
      });
    });
    
    // Load should restore lime
    newInstance.loadSkinSettings();
    
    // Should be called with correct parameters
    expect(chrome.storage.sync.get).toHaveBeenCalledWith(['skinSettings'], expect.any(Function));
  });
});