/**
 * VoiceSelector Unit Tests - NativeMimic v4.0
 * 
 * Testing voice selection component to ensure reliable voice management
 * and prevent voice-related failures from v3.16
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoiceSelector, Voice, VoiceSelectorConfig } from '@core/1.1_user_interface/voice_selection/VoiceSelector';
import { mockTTSEdgeFunction, mockVoices } from '@tests/mocks/tts-apis.mock';
import { createMockElement, simulateUserEvent } from '@tests/setup/vitest.setup';

// Mock voice data for testing
const MOCK_VOICES: Voice[] = [
  {
    id: 'en-US-Wavenet-D',
    name: 'English (US) - Male',
    language: 'en-US',
    gender: 'male',
    quality: 'premium',
    previewUrl: 'https://example.com/preview/en-us-male.mp3'
  },
  {
    id: 'en-US-Wavenet-F',
    name: 'English (US) - Female',
    language: 'en-US',
    gender: 'female',
    quality: 'premium',
    previewUrl: 'https://example.com/preview/en-us-female.mp3'
  },
  {
    id: 'es-ES-Wavenet-B',
    name: 'Spanish (Spain) - Male',
    language: 'es-ES',
    gender: 'male',
    quality: 'premium',
    previewUrl: 'https://example.com/preview/es-es-male.mp3'
  },
  {
    id: 'fr-FR-Standard-A',
    name: 'French (France) - Female',
    language: 'fr-FR',
    gender: 'female',
    quality: 'standard',
    previewUrl: 'https://example.com/preview/fr-fr-female.mp3'
  }
];

const DEFAULT_CONFIG: VoiceSelectorConfig = {
  maxDisplayedVoices: 5,
  showMoreButton: true,
  enableQualityRating: true,
  defaultLanguage: 'en',
  autoSelectBest: true
};

describe('VoiceSelector', () => {
  let voiceSelector: VoiceSelector;
  let mockContainer: HTMLElement;
  let onVoiceChangedCallback: vi.Mock;

  beforeEach(() => {
    // Clean DOM
    document.body.innerHTML = '';
    
    // Create container
    mockContainer = createMockElement('div', { id: 'voice-selector-container' });
    document.body.appendChild(mockContainer);
    
    // Create callback mock
    onVoiceChangedCallback = vi.fn();
    
    // Mock voice loading
    vi.spyOn(VoiceSelector.prototype as any, 'loadAvailableVoices')
      .mockResolvedValue(MOCK_VOICES);
    
    // Initialize voice selector
    voiceSelector = new VoiceSelector(DEFAULT_CONFIG, onVoiceChangedCallback);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(voiceSelector).toBeDefined();
      expect(voiceSelector['config']).toEqual(DEFAULT_CONFIG);
      expect(voiceSelector['onVoiceChanged']).toBe(onVoiceChangedCallback);
    });

    it('should load voices on initialization', async () => {
      const loadVoicesSpy = vi.spyOn(voiceSelector as any, 'loadAvailableVoices');
      
      await voiceSelector['loadVoicesForLanguage']('en');
      
      expect(loadVoicesSpy).toHaveBeenCalled();
    });

    it('should set default voice correctly', async () => {
      await voiceSelector.loadVoicesForLanguage('en-US');
      
      const selectedVoice = voiceSelector.getSelectedVoice();
      expect(selectedVoice).toBeTruthy();
      expect(selectedVoice?.language).toBe('en-US');
    });

    it('should handle configuration with disabled features', () => {
      const minimalConfig: VoiceSelectorConfig = {
        maxDisplayedVoices: 3,
        showMoreButton: false,
        enableQualityRating: false,
        defaultLanguage: 'es',
        autoSelectBest: false
      };

      const minimalSelector = new VoiceSelector(minimalConfig, onVoiceChangedCallback);
      expect(minimalSelector['config']).toEqual(minimalConfig);
    });
  });

  describe('Voice Loading and Management', () => {
    it('should load voices for specific language', async () => {
      await voiceSelector.loadVoicesForLanguage('en-US');
      
      const voices = voiceSelector['availableVoices'];
      const englishVoices = voices.filter(v => v.language === 'en-US');
      
      expect(englishVoices.length).toBeGreaterThan(0);
      expect(englishVoices.every(v => v.language === 'en-US')).toBe(true);
    });

    it('should cache loaded voices', async () => {
      const loadSpy = vi.spyOn(voiceSelector as any, 'loadAvailableVoices');
      
      // Load voices twice
      await voiceSelector.loadVoicesForLanguage('en-US');
      await voiceSelector.loadVoicesForLanguage('en-US');
      
      // Should only call load once due to caching
      expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle voice loading errors gracefully', async () => {
      vi.spyOn(voiceSelector as any, 'loadAvailableVoices')
        .mockRejectedValue(new Error('Network error'));
      
      await expect(voiceSelector.loadVoicesForLanguage('en-US')).resolves.not.toThrow();
      
      // Should fall back to empty array
      expect(voiceSelector['availableVoices']).toEqual([]);
    });

    it('should filter voices by quality when enabled', async () => {
      await voiceSelector.loadVoicesForLanguage('en-US');
      
      const premiumVoices = voiceSelector['getFilteredVoices']('premium');
      const standardVoices = voiceSelector['getFilteredVoices']('standard');
      
      expect(premiumVoices.every(v => v.quality === 'premium')).toBe(true);
      expect(standardVoices.every(v => v.quality === 'standard')).toBe(true);
    });

    it('should auto-select best voice when enabled', async () => {
      await voiceSelector.loadVoicesForLanguage('en-US');
      
      const selectedVoice = voiceSelector.getSelectedVoice();
      
      expect(selectedVoice).toBeTruthy();
      expect(selectedVoice?.quality).toBe('premium'); // Should prefer premium
    });

    it('should not auto-select when disabled', async () => {
      const noAutoConfig = { ...DEFAULT_CONFIG, autoSelectBest: false };
      const noAutoSelector = new VoiceSelector(noAutoConfig, onVoiceChangedCallback);
      
      await noAutoSelector.loadVoicesForLanguage('en-US');
      
      expect(noAutoSelector.getSelectedVoice()).toBe(null);
    });
  });

  describe('Voice Selection', () => {
    beforeEach(async () => {
      await voiceSelector.loadVoicesForLanguage('en-US');
    });

    it('should select voice by ID', () => {
      const targetVoice = MOCK_VOICES.find(v => v.id === 'en-US-Wavenet-F');
      
      voiceSelector.selectVoice('en-US-Wavenet-F');
      
      const selectedVoice = voiceSelector.getSelectedVoice();
      expect(selectedVoice).toEqual(targetVoice);
    });

    it('should call callback when voice changes', () => {
      voiceSelector.selectVoice('en-US-Wavenet-F');
      
      expect(onVoiceChangedCallback).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'en-US-Wavenet-F' })
      );
    });

    it('should handle invalid voice ID gracefully', () => {
      const invalidId = 'invalid-voice-id';
      
      expect(() => voiceSelector.selectVoice(invalidId)).not.toThrow();
      
      // Should not change selection
      const selectedVoice = voiceSelector.getSelectedVoice();
      expect(selectedVoice?.id).not.toBe(invalidId);
    });

    it('should get voice by ID', () => {
      const voice = voiceSelector.getVoiceById('en-US-Wavenet-D');
      
      expect(voice).toBeTruthy();
      expect(voice?.id).toBe('en-US-Wavenet-D');
    });

    it('should return null for non-existent voice ID', () => {
      const voice = voiceSelector.getVoiceById('non-existent-id');
      
      expect(voice).toBe(null);
    });
  });

  describe('UI Rendering', () => {
    beforeEach(async () => {
      await voiceSelector.loadVoicesForLanguage('en-US');
    });

    it('should render main selector element', () => {
      const selectorElement = voiceSelector.renderMainSelector();
      
      expect(selectorElement).toBeInstanceOf(HTMLElement);
      expect(selectorElement.classList.contains('voice-selector')).toBe(true);
    });

    it('should render voice options', () => {
      const selectorElement = voiceSelector.renderMainSelector();
      mockContainer.appendChild(selectorElement);
      
      const voiceOptions = selectorElement.querySelectorAll('.voice-option');
      expect(voiceOptions.length).toBeGreaterThan(0);
      expect(voiceOptions.length).toBeLessThanOrEqual(DEFAULT_CONFIG.maxDisplayedVoices);
    });

    it('should show "Show More" button when there are many voices', async () => {
      // Load more voices than maxDisplayedVoices
      const manyVoices = [...MOCK_VOICES, ...MOCK_VOICES.map(v => ({ ...v, id: v.id + '-extra' }))];
      vi.spyOn(voiceSelector as any, 'loadAvailableVoices').mockResolvedValue(manyVoices);
      
      await voiceSelector.loadVoicesForLanguage('en-US');
      const selectorElement = voiceSelector.renderMainSelector();
      mockContainer.appendChild(selectorElement);
      
      const showMoreButton = selectorElement.querySelector('.show-more-btn');
      expect(showMoreButton).toBeTruthy();
    });

    it('should not show "Show More" button when disabled', async () => {
      const noMoreConfig = { ...DEFAULT_CONFIG, showMoreButton: false };
      const noMoreSelector = new VoiceSelector(noMoreConfig, onVoiceChangedCallback);
      
      await noMoreSelector.loadVoicesForLanguage('en-US');
      const selectorElement = noMoreSelector.renderMainSelector();
      
      const showMoreButton = selectorElement.querySelector('.show-more-btn');
      expect(showMoreButton).toBeFalsy();
    });

    it('should render quality indicators when enabled', () => {
      const selectorElement = voiceSelector.renderMainSelector();
      mockContainer.appendChild(selectorElement);
      
      const qualityIndicators = selectorElement.querySelectorAll('.quality-indicator');
      expect(qualityIndicators.length).toBeGreaterThan(0);
    });

    it('should not render quality indicators when disabled', () => {
      const noQualityConfig = { ...DEFAULT_CONFIG, enableQualityRating: false };
      const noQualitySelector = new VoiceSelector(noQualityConfig, onVoiceChangedCallback);
      
      const selectorElement = noQualitySelector.renderMainSelector();
      
      const qualityIndicators = selectorElement.querySelectorAll('.quality-indicator');
      expect(qualityIndicators.length).toBe(0);
    });

    it('should highlight selected voice in UI', () => {
      voiceSelector.selectVoice('en-US-Wavenet-F');
      
      const selectorElement = voiceSelector.renderMainSelector();
      mockContainer.appendChild(selectorElement);
      
      const selectedOption = selectorElement.querySelector('.voice-option.selected');
      expect(selectedOption).toBeTruthy();
      expect(selectedOption?.getAttribute('data-voice-id')).toBe('en-US-Wavenet-F');
    });
  });

  describe('User Interactions', () => {
    let selectorElement: HTMLElement;

    beforeEach(async () => {
      await voiceSelector.loadVoicesForLanguage('en-US');
      selectorElement = voiceSelector.renderMainSelector();
      mockContainer.appendChild(selectorElement);
    });

    it('should handle voice option click', () => {
      const voiceOption = selectorElement.querySelector('[data-voice-id="en-US-Wavenet-F"]') as HTMLElement;
      expect(voiceOption).toBeTruthy();
      
      simulateUserEvent(voiceOption, 'click');
      
      expect(onVoiceChangedCallback).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'en-US-Wavenet-F' })
      );
    });

    it('should handle "Show More" button click', () => {
      const showMoreButton = selectorElement.querySelector('.show-more-btn') as HTMLElement;
      
      if (showMoreButton) {
        const expandSpy = vi.spyOn(voiceSelector as any, 'expandVoiceList');
        
        simulateUserEvent(showMoreButton, 'click');
        
        expect(expandSpy).toHaveBeenCalled();
      }
    });

    it('should handle voice preview play', async () => {
      const previewButton = selectorElement.querySelector('.preview-btn') as HTMLElement;
      
      if (previewButton) {
        const mockAudio = {
          play: vi.fn().mockResolvedValue(undefined),
          pause: vi.fn()
        };
        global.Audio = vi.fn().mockImplementation(() => mockAudio);
        
        simulateUserEvent(previewButton, 'click');
        
        // Allow time for async operations
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(mockAudio.play).toHaveBeenCalled();
      }
    });

    it('should handle keyboard navigation', () => {
      const firstOption = selectorElement.querySelector('.voice-option') as HTMLElement;
      firstOption.focus();
      
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      firstOption.dispatchEvent(enterEvent);
      
      expect(onVoiceChangedCallback).toHaveBeenCalled();
    });

    it('should handle arrow key navigation', () => {
      const firstOption = selectorElement.querySelector('.voice-option') as HTMLElement;
      firstOption.focus();
      
      const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      firstOption.dispatchEvent(arrowDownEvent);
      
      // Should move focus to next option
      const secondOption = selectorElement.querySelectorAll('.voice-option')[1] as HTMLElement;
      expect(document.activeElement).toBe(secondOption);
    });
  });

  describe('Voice Preview', () => {
    beforeEach(async () => {
      await voiceSelector.loadVoicesForLanguage('en-US');
    });

    it('should play voice preview', async () => {
      const mockAudio = {
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        onended: null,
        onerror: null
      };
      global.Audio = vi.fn().mockImplementation(() => mockAudio);
      
      await voiceSelector.playVoicePreview('en-US-Wavenet-D');
      
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('should handle preview errors gracefully', async () => {
      const mockAudio = {
        play: vi.fn().mockRejectedValue(new Error('Audio play failed')),
        pause: vi.fn(),
        onended: null,
        onerror: null
      };
      global.Audio = vi.fn().mockImplementation(() => mockAudio);
      
      await expect(voiceSelector.playVoicePreview('en-US-Wavenet-D')).resolves.not.toThrow();
    });

    it('should stop previous preview when playing new one', async () => {
      const mockAudio1 = {
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        onended: null,
        onerror: null
      };
      const mockAudio2 = {
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        onended: null,
        onerror: null
      };
      
      global.Audio = vi.fn()
        .mockImplementationOnce(() => mockAudio1)
        .mockImplementationOnce(() => mockAudio2);
      
      await voiceSelector.playVoicePreview('en-US-Wavenet-D');
      await voiceSelector.playVoicePreview('en-US-Wavenet-F');
      
      expect(mockAudio1.pause).toHaveBeenCalled();
      expect(mockAudio2.play).toHaveBeenCalled();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large numbers of voices efficiently', async () => {
      const manyVoices = Array.from({ length: 100 }, (_, i) => ({
        id: `voice-${i}`,
        name: `Voice ${i}`,
        language: 'en-US',
        gender: i % 2 === 0 ? 'male' : 'female',
        quality: i % 3 === 0 ? 'premium' : 'standard',
        previewUrl: `https://example.com/preview/voice-${i}.mp3`
      }));
      
      vi.spyOn(voiceSelector as any, 'loadAvailableVoices').mockResolvedValue(manyVoices);
      
      const startTime = performance.now();
      await voiceSelector.loadVoicesForLanguage('en-US');
      const loadTime = performance.now() - startTime;
      
      expect(loadTime).toBeLessThan(100); // Should load quickly
      expect(voiceSelector['availableVoices'].length).toBe(100);
    });

    it('should handle rapid voice selection changes', () => {
      const voiceIds = ['en-US-Wavenet-D', 'en-US-Wavenet-F', 'es-ES-Wavenet-B'];
      
      expect(() => {
        voiceIds.forEach(id => voiceSelector.selectVoice(id));
      }).not.toThrow();
      
      expect(voiceSelector.getSelectedVoice()?.id).toBe('es-ES-Wavenet-B');
    });

    it('should clean up audio resources', () => {
      const mockAudio = {
        play: vi.fn(),
        pause: vi.fn(),
        src: '',
        onended: null,
        onerror: null
      };
      
      voiceSelector['currentPreviewAudio'] = mockAudio as any;
      
      voiceSelector['cleanup']();
      
      expect(mockAudio.pause).toHaveBeenCalled();
      expect(voiceSelector['currentPreviewAudio']).toBe(null);
    });

    it('should handle null/undefined voice data', () => {
      expect(() => voiceSelector.selectVoice(null as any)).not.toThrow();
      expect(() => voiceSelector.selectVoice(undefined as any)).not.toThrow();
      expect(() => voiceSelector.getVoiceById(null as any)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    let selectorElement: HTMLElement;

    beforeEach(async () => {
      await voiceSelector.loadVoicesForLanguage('en-US');
      selectorElement = voiceSelector.renderMainSelector();
      mockContainer.appendChild(selectorElement);
    });

    it('should have proper ARIA attributes', () => {
      expect(selectorElement.getAttribute('role')).toBe('listbox');
      expect(selectorElement.getAttribute('aria-label')).toBeTruthy();
      
      const voiceOptions = selectorElement.querySelectorAll('.voice-option');
      voiceOptions.forEach(option => {
        expect(option.getAttribute('role')).toBe('option');
        expect(option.getAttribute('tabindex')).toBe('0');
      });
    });

    it('should support screen reader announcements', () => {
      const selectedOption = selectorElement.querySelector('.voice-option.selected');
      
      if (selectedOption) {
        expect(selectedOption.getAttribute('aria-selected')).toBe('true');
      }
    });

    it('should be keyboard navigable', () => {
      const firstOption = selectorElement.querySelector('.voice-option') as HTMLElement;
      
      expect(firstOption.tabIndex).toBe(0);
      
      firstOption.focus();
      expect(document.activeElement).toBe(firstOption);
    });
  });
});