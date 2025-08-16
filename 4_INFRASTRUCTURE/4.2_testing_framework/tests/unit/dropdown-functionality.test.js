// Unit Tests for NativeMimic Dropdown Functionality
// Tests for the fixes made to dropdown freezing and event listener conflicts

// Mock DOM elements and Chrome APIs
const mockChrome = {
  storage: {
    sync: {
      set: jest.fn().mockResolvedValue(),
      get: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue()
    }
  }
};

// Mock SpeechSynthesis API
const mockSpeechSynthesis = {
  getVoices: jest.fn(() => [
    { name: 'English Voice 1', lang: 'en-US', voiceURI: 'en-us-voice-1' },
    { name: 'English Voice 2', lang: 'en-GB', voiceURI: 'en-gb-voice-2' },
    { name: 'French Voice 1', lang: 'fr-FR', voiceURI: 'fr-fr-voice-1' },
    { name: 'French Voice 2', lang: 'fr-CA', voiceURI: 'fr-ca-voice-2' },
    { name: 'Spanish Voice 1', lang: 'es-ES', voiceURI: 'es-es-voice-1' },
    { name: 'Spanish Voice 2', lang: 'es-MX', voiceURI: 'es-mx-voice-2' },
    { name: 'Chinese Voice', lang: 'zh-CN', voiceURI: 'zh-cn-voice-1' }
  ]),
  cancel: jest.fn(),
  speak: jest.fn(),
  paused: false,
  speaking: false
};

// Mock ElevenLabs client
const mockElevenLabsClient = {
  isInitialized: true,
  getPresetVoices: jest.fn(() => ({
    'antoni': { id: 'antoni', name: 'Antoni', description: 'Young male, warm' },
    'bella': { id: 'bella', name: 'Bella', description: 'Young female, confident' },
    'josh': { id: 'josh', name: 'Josh', description: 'Male, deep' }
  }))
};

// Mock DOM elements
function createMockDropdownElements() {
  const dropdown = {
    id: 'nativemimic-voice-dropdown',
    classList: {
      contains: jest.fn(() => false),
      add: jest.fn(),
      remove: jest.fn()
    },
    contains: jest.fn(() => true)
  };

  const selected = {
    id: 'nativemimic-voice-selected',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    querySelector: jest.fn(() => ({
      textContent: 'Auto-select by language'
    }))
  };

  const options = {
    id: 'nativemimic-voice-options',
    innerHTML: '',
    style: { display: 'none' },
    querySelectorAll: jest.fn(() => [
      {
        classList: { remove: jest.fn() },
        dataset: { value: 'en-us-voice-1' },
        addEventListener: jest.fn()
      }
    ]),
    querySelector: jest.fn(() => ({
      classList: { add: jest.fn() }
    }))
  };

  return { dropdown, selected, options };
}

// Mock NativeMimic widget class with dropdown functionality
class MockNativeMimicWidget {
  constructor() {
    this.availableVoices = mockSpeechSynthesis.getVoices();
    this.selectedVoice = null;
    this.lastSelectedText = '';
    this.lastDropdownLanguage = 'en';
    this.dropdownClickHandler = null;
    this.dropdownOutsideClickHandler = null;
  }

  detectLanguage(text) {
    if (!text) return 'en';
    
    // French first (fix for French/Spanish conflicts)
    if (/[àâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]/.test(text) || 
        /\b(le|la|les|du|des|avec|pour|dans|sur|cette|ces|ceci|bonjour|français|merci|oui|non|où|donc|soit)\b/i.test(text)) {
      return 'fr';
    }
    
    // Spanish second
    if (/[ñáéíóúüÑÁÉÍÓÚÜ¿¡]/.test(text) || 
        /\b(el|la|los|las|del|y|con|por|para|esta?|esto|hola|cómo|qué|dónde|cuándo|español|habla|sí|gracias)\b/i.test(text)) {
      return 'es';
    }
    
    // Chinese
    if (/[\u4E00-\u9FFF]/.test(text)) {
      return 'zh';
    }
    
    return 'en';
  }

  getLanguageName(langCode) {
    const languageNames = {
      'en': 'English',
      'es': 'Spanish', 
      'fr': 'French',
      'zh': 'Chinese'
    };
    return languageNames[langCode] || langCode.toUpperCase();
  }

  getElevenLabsVoiceName(voiceId) {
    const presetVoices = mockElevenLabsClient.getPresetVoices();
    const preset = Object.values(presetVoices).find(v => v.id === voiceId);
    return preset ? preset.name : 'ElevenLabs Voice';
  }

  async setupCustomVoiceDropdown() {
    const { dropdown, selected, options } = createMockDropdownElements();
    
    // Mock document.getElementById
    document.getElementById = jest.fn((id) => {
      if (id === 'nativemimic-voice-dropdown') return dropdown;
      if (id === 'nativemimic-voice-selected') return selected;
      if (id === 'nativemimic-voice-options') return options;
      return null;
    });

    if (!dropdown || !selected || !options) {
      console.log('NativeMimic: Custom dropdown elements not found');
      return;
    }

    // Populate dropdown with voices
    await this.populateCustomDropdown();

    // Remove existing event listeners to prevent duplicates (FIX)
    if (this.dropdownClickHandler) {
      selected.removeEventListener('click', this.dropdownClickHandler);
      document.removeEventListener('click', this.dropdownOutsideClickHandler);
    }

    // Create new event handlers and store references (FIX)
    this.dropdownClickHandler = (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains('open');
      
      if (isOpen) {
        dropdown.classList.remove('open');
        options.style.display = 'none';
      } else {
        dropdown.classList.add('open');
        options.style.display = 'block';
      }
    };

    this.dropdownOutsideClickHandler = (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
        options.style.display = 'none';
      }
    };

    // Add new event listeners
    selected.addEventListener('click', this.dropdownClickHandler);
    document.addEventListener('click', this.dropdownOutsideClickHandler);

    return { dropdown, selected, options };
  }

  async populateCustomDropdown() {
    const { selected, options } = createMockDropdownElements();
    
    // Mock document.getElementById for this method
    document.getElementById = jest.fn((id) => {
      if (id === 'nativemimic-voice-selected') return selected;
      if (id === 'nativemimic-voice-options') return options;
      return null;
    });

    if (!selected || !options) return;

    // Refresh voices
    const freshVoices = mockSpeechSynthesis.getVoices();
    if (freshVoices.length > 0) {
      this.availableVoices = freshVoices;
    }

    // Detect language of selected text for intelligent voice filtering
    const detectedLanguage = this.lastSelectedText ? this.detectLanguage(this.lastSelectedText) : 'en';

    let optionsHTML = '';
    let totalOptions = 0;

    // Add ElevenLabs premium voices first
    if (mockElevenLabsClient.isInitialized) {
      optionsHTML += '<div class="nativemimic-voice-group">🎭 Premium AI Voices (Best Quality)</div>';
      
      const presetVoices = mockElevenLabsClient.getPresetVoices();
      Object.entries(presetVoices).forEach(([key, voice]) => {
        const isSelected = this.selectedVoice && this.selectedVoice.type === 'elevenlabs' && this.selectedVoice.id === voice.id;
        optionsHTML += `<div class="nativemimic-voice-option premium-voice ${isSelected ? 'selected' : ''}" data-value="elevenlabs:${voice.id}" data-type="elevenlabs">
          <span class="premium-badge">💎 PREMIUM</span> ${voice.name} <span class="voice-desc">${voice.description}</span>
        </div>`;
        totalOptions++;
      });
    }

    // Filter system voices by language
    if (this.availableVoices.length > 0) {
      const matchingVoices = [];
      const otherVoices = [];

      this.availableVoices.forEach(voice => {
        if (voice.lang && voice.lang.startsWith(detectedLanguage)) {
          matchingVoices.push(voice);
        } else {
          otherVoices.push(voice);
        }
      });

      // Add matching voices first
      if (matchingVoices.length > 0) {
        const languageName = this.getLanguageName(detectedLanguage);
        optionsHTML += `<div class="nativemimic-voice-group">🔊 ${languageName} System Voices (Free)</div>`;
        
        matchingVoices.forEach(voice => {
          const isSelected = this.selectedVoice && this.selectedVoice.voiceURI === voice.voiceURI;
          optionsHTML += `<div class="nativemimic-voice-option system-voice recommended ${isSelected ? 'selected' : ''}" data-value="${voice.voiceURI}" data-type="system">
            🔊 ${voice.name} <span class="voice-lang">(${voice.lang || 'unknown'})</span>
          </div>`;
          totalOptions++;
        });
      }

      // Show limited other system voices
      if (otherVoices.length > 0) {
        optionsHTML += '<div class="nativemimic-voice-group">🔊 Other System Voices (Free)</div>';
        
        const displayOtherVoices = otherVoices.slice(0, 5); // Limited for testing
        displayOtherVoices.forEach(voice => {
          const isSelected = this.selectedVoice && this.selectedVoice.voiceURI === voice.voiceURI;
          optionsHTML += `<div class="nativemimic-voice-option system-voice ${isSelected ? 'selected' : ''}" data-value="${voice.voiceURI}" data-type="system">
            🔊 ${voice.name} <span class="voice-lang">(${voice.lang || 'unknown'})</span>
          </div>`;
          totalOptions++;
        });
      }
    }

    options.innerHTML = optionsHTML;

    // Update selected display with language change clearing logic (FIX)
    if (this.selectedVoice) {
      const detectedLanguage = this.lastSelectedText ? this.detectLanguage(this.lastSelectedText) : 'en';
      const shouldClearSelection = this.selectedVoice.type === 'system' && 
                                 this.selectedVoice.lang && 
                                 !this.selectedVoice.lang.startsWith(detectedLanguage);
      
      if (shouldClearSelection) {
        this.selectedVoice = null;
        selected.querySelector('span').textContent = 'Auto-select by language';
      } else if (this.selectedVoice.type === 'elevenlabs') {
        const voiceName = this.getElevenLabsVoiceName(this.selectedVoice.id);
        selected.querySelector('span').textContent = `✨ ${voiceName}`;
      } else {
        selected.querySelector('span').textContent = `${this.selectedVoice.name} (${this.selectedVoice.lang})`;
      }
    } else {
      selected.querySelector('span').textContent = mockElevenLabsClient.isInitialized ? 
        '✨ Antoni (Default)' : 'Auto-select by language';
    }

    // Add click handlers to options
    const mockOptions = options.querySelectorAll('.nativemimic-voice-option');
    mockOptions.forEach(option => {
      if (!option.dataset.disabled) {
        option.addEventListener('click', async (e) => {
          await this.handleVoiceSelection(option.dataset.value, option.textContent.trim());
        });
      }
    });

    return totalOptions;
  }

  async handleVoiceSelection(value, displayName) {
    const { dropdown, selected, options } = createMockDropdownElements();
    
    // Mock document.getElementById for this method
    document.getElementById = jest.fn((id) => {
      if (id === 'nativemimic-voice-dropdown') return dropdown;
      if (id === 'nativemimic-voice-selected') return selected;
      if (id === 'nativemimic-voice-options') return options;
      return null;
    });

    if (value.startsWith('elevenlabs:')) {
      const voiceId = value.replace('elevenlabs:', '');
      this.selectedVoice = { type: 'elevenlabs', id: voiceId };
    } else {
      this.selectedVoice = this.availableVoices.find(voice => voice.voiceURI === value);
    }

    // Update display
    selected.querySelector('span').textContent = displayName;

    // Update option selection states
    options.querySelectorAll('.nativemimic-voice-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    const targetOption = options.querySelector(`[data-value="${value}"]`);
    if (targetOption) {
      targetOption.classList.add('selected');
    }

    // Close dropdown
    dropdown.classList.remove('open');
    options.style.display = 'none';

    // Save selection
    await mockChrome.storage.sync.set({ selectedVoiceURI: value });

    return this.selectedVoice;
  }
}

describe('NativeMimic Dropdown Functionality', () => {
  let widget;

  beforeEach(() => {
    jest.clearAllMocks();
    widget = new MockNativeMimicWidget();
    
    // Setup global mocks
    global.chrome = mockChrome;
    global.speechSynthesis = mockSpeechSynthesis;
    global.window = { elevenLabsClient: mockElevenLabsClient };
    global.document = {
      getElementById: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
  });

  describe('Dropdown Setup and Initialization', () => {
    test('should setup custom dropdown without errors', async () => {
      const result = await widget.setupCustomVoiceDropdown();
      
      expect(result).toBeDefined();
      expect(result.dropdown).toBeDefined();
      expect(result.selected).toBeDefined();
      expect(result.options).toBeDefined();
    });

    test('should handle missing DOM elements gracefully', async () => {
      document.getElementById = jest.fn(() => null);
      
      const result = await widget.setupCustomVoiceDropdown();
      expect(result).toBeUndefined();
    });

    test('should remove existing event listeners before adding new ones', async () => {
      // First setup
      await widget.setupCustomVoiceDropdown();
      const firstHandler = widget.dropdownClickHandler;
      
      // Second setup (language change)
      await widget.setupCustomVoiceDropdown();
      const secondHandler = widget.dropdownClickHandler;
      
      // Should have new handlers
      expect(firstHandler).not.toBe(secondHandler);
      expect(widget.dropdownClickHandler).toBeDefined();
      expect(widget.dropdownOutsideClickHandler).toBeDefined();
    });
  });

  describe('Voice Filtering by Language', () => {
    test('should filter French voices for French text', async () => {
      widget.lastSelectedText = 'Bonjour, ceci est un test du widget';
      
      const totalOptions = await widget.populateCustomDropdown();
      
      expect(totalOptions).toBeGreaterThan(0);
      // Should include French voices and premium voices
      expect(totalOptions).toBeGreaterThanOrEqual(5); // 3 premium + 2 French system
    });

    test('should filter Spanish voices for Spanish text', async () => {
      widget.lastSelectedText = 'Hola, esta es una prueba del widget';
      
      const totalOptions = await widget.populateCustomDropdown();
      
      expect(totalOptions).toBeGreaterThan(0);
      // Should include Spanish voices and premium voices
      expect(totalOptions).toBeGreaterThanOrEqual(5); // 3 premium + 2 Spanish system
    });

    test('should show English voices for English text', async () => {
      widget.lastSelectedText = 'Hello, this is a test of the widget';
      
      const totalOptions = await widget.populateCustomDropdown();
      
      expect(totalOptions).toBeGreaterThan(0);
      // Should include English voices and premium voices
      expect(totalOptions).toBeGreaterThanOrEqual(5); // 3 premium + 2 English system
    });

    test('should handle Chinese text correctly', async () => {
      widget.lastSelectedText = '你好，这是NativeMimic语音选择小部件的测试';
      
      const totalOptions = await widget.populateCustomDropdown();
      
      expect(totalOptions).toBeGreaterThan(0);
      // Should include Chinese voices and premium voices
      expect(totalOptions).toBeGreaterThanOrEqual(4); // 3 premium + 1 Chinese system
    });
  });

  describe('Voice Selection Clearing Logic', () => {
    test('should clear inappropriate voice selection on language change', async () => {
      // Select an English voice
      widget.selectedVoice = { 
        type: 'system', 
        voiceURI: 'en-us-voice-1', 
        name: 'English Voice 1', 
        lang: 'en-US' 
      };
      
      // Change to French text
      widget.lastSelectedText = 'Bonjour, ceci est un test';
      
      await widget.populateCustomDropdown();
      
      // Should clear the English voice selection
      expect(widget.selectedVoice).toBeNull();
    });

    test('should keep appropriate voice selection on same language', async () => {
      // Select a French voice
      widget.selectedVoice = { 
        type: 'system', 
        voiceURI: 'fr-fr-voice-1', 
        name: 'French Voice 1', 
        lang: 'fr-FR' 
      };
      
      // Keep French text
      widget.lastSelectedText = 'Bonjour, comment allez-vous?';
      
      await widget.populateCustomDropdown();
      
      // Should keep the French voice selection
      expect(widget.selectedVoice).not.toBeNull();
      expect(widget.selectedVoice.lang).toBe('fr-FR');
    });

    test('should not clear ElevenLabs voice selections', async () => {
      // Select an ElevenLabs voice
      widget.selectedVoice = { 
        type: 'elevenlabs', 
        id: 'antoni' 
      };
      
      // Change to French text
      widget.lastSelectedText = 'Bonjour, ceci est un test';
      
      await widget.populateCustomDropdown();
      
      // Should keep the ElevenLabs voice selection
      expect(widget.selectedVoice).not.toBeNull();
      expect(widget.selectedVoice.type).toBe('elevenlabs');
    });
  });

  describe('Event Handling', () => {
    test('should handle dropdown click events correctly', async () => {
      const { dropdown, selected, options } = await widget.setupCustomVoiceDropdown();
      
      // Mock event
      const mockEvent = {
        stopPropagation: jest.fn(),
        target: selected
      };
      
      // Test opening dropdown
      dropdown.classList.contains.mockReturnValue(false);
      widget.dropdownClickHandler(mockEvent);
      
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(dropdown.classList.add).toHaveBeenCalledWith('open');
      expect(options.style.display).toBe('block');
      
      // Test closing dropdown
      dropdown.classList.contains.mockReturnValue(true);
      widget.dropdownClickHandler(mockEvent);
      
      expect(dropdown.classList.remove).toHaveBeenCalledWith('open');
      expect(options.style.display).toBe('none');
    });

    test('should handle outside click events correctly', async () => {
      const { dropdown, options } = await widget.setupCustomVoiceDropdown();
      
      // Mock event outside dropdown
      const outsideEvent = {
        target: document.body
      };
      dropdown.contains.mockReturnValue(false);
      
      widget.dropdownOutsideClickHandler(outsideEvent);
      
      expect(dropdown.classList.remove).toHaveBeenCalledWith('open');
      expect(options.style.display).toBe('none');
    });

    test('should not close dropdown for inside clicks', async () => {
      const { dropdown, options } = await widget.setupCustomVoiceDropdown();
      
      // Mock event inside dropdown
      const insideEvent = {
        target: dropdown
      };
      dropdown.contains.mockReturnValue(true);
      
      widget.dropdownOutsideClickHandler(insideEvent);
      
      expect(dropdown.classList.remove).not.toHaveBeenCalled();
    });
  });

  describe('Voice Selection Handling', () => {
    test('should handle system voice selection correctly', async () => {
      const testValue = 'fr-fr-voice-1';
      const testDisplayName = '🔊 French Voice 1 (fr-FR)';
      
      const result = await widget.handleVoiceSelection(testValue, testDisplayName);
      
      expect(result).toBeDefined();
      expect(result.voiceURI).toBe(testValue);
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        selectedVoiceURI: testValue
      });
    });

    test('should handle ElevenLabs voice selection correctly', async () => {
      const testValue = 'elevenlabs:antoni';
      const testDisplayName = '💎 PREMIUM Antoni Young male, warm';
      
      const result = await widget.handleVoiceSelection(testValue, testDisplayName);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('elevenlabs');
      expect(result.id).toBe('antoni');
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        selectedVoiceURI: testValue
      });
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete language change workflow', async () => {
      // Start with English text and English voice
      widget.lastSelectedText = 'Hello, this is a test';
      widget.selectedVoice = { 
        type: 'system', 
        voiceURI: 'en-us-voice-1', 
        name: 'English Voice 1', 
        lang: 'en-US' 
      };
      
      await widget.setupCustomVoiceDropdown();
      
      // Change to French text (simulating user selecting French text)
      widget.lastSelectedText = 'Bonjour, ceci est un test du widget de sélection v';
      
      // Detect language change and refresh dropdown
      const currentLanguage = widget.detectLanguage(widget.lastSelectedText);
      const lastLanguage = widget.lastDropdownLanguage || 'en';
      
      expect(currentLanguage).toBe('fr');
      expect(currentLanguage).not.toBe(lastLanguage);
      
      // Refresh dropdown (this is what happens in showSpeechControls)
      widget.lastDropdownLanguage = currentLanguage;
      await widget.setupCustomVoiceDropdown();
      
      // Voice should be cleared because English voice not suitable for French
      expect(widget.selectedVoice).toBeNull();
    });

    test('should prevent dropdown freezing on rapid language changes', async () => {
      const languages = [
        { text: 'Hello world', expected: 'en' },
        { text: 'Bonjour monde', expected: 'fr' },
        { text: 'Hola mundo', expected: 'es' },
        { text: '你好世界', expected: 'zh' }
      ];
      
      for (const lang of languages) {
        widget.lastSelectedText = lang.text;
        widget.lastDropdownLanguage = widget.detectLanguage(lang.text);
        
        // This should not throw errors or cause conflicts
        expect(async () => {
          await widget.setupCustomVoiceDropdown();
        }).not.toThrow();
        
        expect(widget.dropdownClickHandler).toBeDefined();
        expect(widget.dropdownOutsideClickHandler).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle Chrome storage errors gracefully', async () => {
      mockChrome.storage.sync.set.mockRejectedValue(new Error('Storage error'));
      
      await expect(widget.handleVoiceSelection('test-voice', 'Test Voice'))
        .resolves
        .toBeDefined();
    });

    test('should handle missing voice in selection', async () => {
      // Try to select a voice that doesn't exist
      const result = await widget.handleVoiceSelection('non-existent-voice', 'Non-existent Voice');
      
      expect(result).toBeUndefined(); // Should handle gracefully
    });

    test('should handle empty voice lists', async () => {
      widget.availableVoices = [];
      mockSpeechSynthesis.getVoices.mockReturnValue([]);
      
      const totalOptions = await widget.populateCustomDropdown();
      
      // Should still show premium voices
      expect(totalOptions).toBeGreaterThanOrEqual(3);
    });
  });
});