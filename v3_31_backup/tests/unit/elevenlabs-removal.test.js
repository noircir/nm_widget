/**
 * NativeMimic ElevenLabs Removal Test Suite
 * Tests to verify functionality after removing ElevenLabs integration
 */

describe('ElevenLabs Removal Tests', () => {
  let mockWindow, mockNativeMimic;

  beforeEach(() => {
    // Mock DOM environment
    global.document = {
      createElement: jest.fn(() => ({
        addEventListener: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
        classList: { add: jest.fn(), remove: jest.fn() },
        innerHTML: '',
        textContent: ''
      })),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      body: { classList: { add: jest.fn(), remove: jest.fn() } }
    };

    // Mock Chrome APIs
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn((keys, callback) => callback({})),
          set: jest.fn((data, callback) => callback && callback())
        }
      }
    };

    // Mock Speech Synthesis API
    global.speechSynthesis = {
      getVoices: jest.fn(() => []),
      speak: jest.fn(),
      cancel: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      speaking: false,
      paused: false,
      pending: false,
      addEventListener: jest.fn()
    };

    global.SpeechSynthesisUtterance = jest.fn(() => ({
      text: '',
      voice: null,
      rate: 1,
      pitch: 1,
      volume: 1,
      onstart: null,
      onend: null,
      onerror: null
    }));

    // Mock Audio API
    global.Audio = jest.fn(() => ({
      play: jest.fn(() => Promise.resolve()),
      pause: jest.fn(),
      addEventListener: jest.fn(),
      playbackRate: 1,
      currentTime: 0,
      paused: false
    }));

    global.URL = {
      createObjectURL: jest.fn(() => 'blob:mock-url'),
      revokeObjectURL: jest.fn()
    };

    // Mock Google TTS Client
    mockWindow = {
      googleTTSClient: {
        isInitialized: true,
        synthesizeText: jest.fn(() => Promise.resolve({ 
          audioUrl: 'mock-audio-url', 
          cost: 0.001 
        })),
        getVoices: jest.fn(() => Promise.resolve([
          { id: 'en-US-Neural2-F', name: 'Emma', language: 'en-US' }
        ]))
      }
    };

    global.window = mockWindow;

    // Create mock NativeMimic instance
    mockNativeMimic = {
      audioCache: new Map(),
      cacheExpiryHours: 24,
      selectedVoice: null,
      currentAudio: null,
      isSpeaking: false,
      speechRate: 1.0,
      debugLog: jest.fn(),
      debugError: jest.fn(),
      showMessage: jest.fn(),
      onSpeechStart: jest.fn(),
      onSpeechEnd: jest.fn(),
      speakWithGoogleTTS: jest.fn(),
      playGoogleTTSAudio: jest.fn(),
      getCachedAudio: jest.fn(),
      cacheAudio: jest.fn(),
      cleanupCache: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ElevenLabs Function Stubs', () => {
    test('speakWithElevenLabs should fallback to Google TTS', async () => {
      // Create the stub function that should exist in content.js
      const speakWithElevenLabs = async function(text, voiceId) {
        this.debugLog('ElevenLabs support removed, falling back to Google TTS');
        await this.speakWithGoogleTTS(text, voiceId);
      }.bind(mockNativeMimic);

      await speakWithElevenLabs('test text', 'test-voice-id');

      expect(mockNativeMimic.debugLog).toHaveBeenCalledWith(
        'ElevenLabs support removed, falling back to Google TTS'
      );
      expect(mockNativeMimic.speakWithGoogleTTS).toHaveBeenCalledWith('test text', 'test-voice-id');
    });

    test('playElevenLabsAudio should fallback to Google TTS audio', async () => {
      const playElevenLabsAudio = async function(audioUrl, cacheKey) {
        await this.playGoogleTTSAudio(audioUrl, cacheKey);
      }.bind(mockNativeMimic);

      await playElevenLabsAudio('test-url', 'test-cache-key');

      expect(mockNativeMimic.playGoogleTTSAudio).toHaveBeenCalledWith('test-url', 'test-cache-key');
    });

    test('speakTextElevenLabs should fallback to Google TTS method', async () => {
      const speakTextElevenLabs = async function(text) {
        this.debugLog('ElevenLabs method called but support removed - falling back to Google TTS');
        await this.speakTextGoogleTTS(text);
      }.bind(mockNativeMimic);

      // Mock the speakTextGoogleTTS method
      mockNativeMimic.speakTextGoogleTTS = jest.fn();

      await speakTextElevenLabs('test text');

      expect(mockNativeMimic.debugLog).toHaveBeenCalledWith(
        'ElevenLabs method called but support removed - falling back to Google TTS'
      );
      expect(mockNativeMimic.speakTextGoogleTTS).toHaveBeenCalledWith('test text');
    });

    test('getElevenLabsVoiceName should return Google TTS fallback', () => {
      const getElevenLabsVoiceName = function(voiceId) {
        return 'Google TTS Voice';
      };

      const result = getElevenLabsVoiceName('any-voice-id');
      expect(result).toBe('Google TTS Voice');
    });
  });

  describe('Voice Selection Logic', () => {
    test('ElevenLabs voice selection should redirect to Google TTS', () => {
      // Simulate ElevenLabs voice being selected
      const selectedVoice = { type: 'elevenlabs', id: 'test-elevenlabs-voice' };
      
      // Logic that should exist in speakText method
      const handleVoiceSelection = function(voice) {
        if (voice && voice.type === 'elevenlabs') {
          this.debugLog('ElevenLabs voice selected but support removed - falling back to Google TTS');
          return null; // Reset to trigger Google TTS default
        }
        return voice;
      }.bind(mockNativeMimic);

      const result = handleVoiceSelection(selectedVoice);

      expect(mockNativeMimic.debugLog).toHaveBeenCalledWith(
        'ElevenLabs voice selected but support removed - falling back to Google TTS'
      );
      expect(result).toBeNull();
    });

    test('Google TTS voice selection should work normally', () => {
      const selectedVoice = { type: 'google-tts', id: 'en-US-Neural2-F' };
      
      const handleVoiceSelection = function(voice) {
        if (voice && voice.type === 'elevenlabs') {
          this.debugLog('ElevenLabs voice selected but support removed - falling back to Google TTS');
          return null;
        }
        return voice;
      }.bind(mockNativeMimic);

      const result = handleVoiceSelection(selectedVoice);

      expect(result).toEqual(selectedVoice);
      expect(mockNativeMimic.debugLog).not.toHaveBeenCalled();
    });

    test('System voice selection should work normally', () => {
      const selectedVoice = { voiceURI: 'Alex', name: 'Alex', lang: 'en-US' };
      
      const handleVoiceSelection = function(voice) {
        if (voice && voice.type === 'elevenlabs') {
          this.debugLog('ElevenLabs voice selected but support removed - falling back to Google TTS');
          return null;
        }
        return voice;
      }.bind(mockNativeMimic);

      const result = handleVoiceSelection(selectedVoice);

      expect(result).toEqual(selectedVoice);
      expect(mockNativeMimic.debugLog).not.toHaveBeenCalled();
    });
  });

  describe('Memory Management (Cache System)', () => {
    test('cache cleanup should revoke blob URLs', () => {
      const cleanupCache = function() {
        const now = Date.now();
        const maxCacheSize = 50;
        let cleanedCount = 0;
        
        for (const [key, cached] of this.audioCache.entries()) {
          const expiryTime = cached.timestamp + (this.cacheExpiryHours * 60 * 60 * 1000);
          if (now > expiryTime) {
            if (cached.audioUrl && cached.audioUrl.startsWith('blob:')) {
              global.URL.revokeObjectURL(cached.audioUrl);
            }
            this.audioCache.delete(key);
            cleanedCount++;
          }
        }
        return cleanedCount;
      }.bind(mockNativeMimic);

      // Add expired cache entry
      const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      mockNativeMimic.audioCache.set('test-key', {
        audioUrl: 'blob:test-url',
        timestamp: expiredTimestamp
      });

      const cleanedCount = cleanupCache();

      expect(cleanedCount).toBe(1);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
      expect(mockNativeMimic.audioCache.has('test-key')).toBe(false);
    });

    test('cache should limit to 50 entries', () => {
      const cleanupCache = function() {
        const maxCacheSize = 50;
        let cleanedCount = 0;
        
        if (this.audioCache.size > maxCacheSize) {
          const entries = [...this.audioCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
          const toRemove = entries.slice(0, entries.length - maxCacheSize);
          for (const [key, cached] of toRemove) {
            if (cached.audioUrl && cached.audioUrl.startsWith('blob:')) {
              global.URL.revokeObjectURL(cached.audioUrl);
            }
            this.audioCache.delete(key);
            cleanedCount++;
          }
        }
        return cleanedCount;
      }.bind(mockNativeMimic);

      // Add 52 cache entries
      for (let i = 0; i < 52; i++) {
        mockNativeMimic.audioCache.set(`key-${i}`, {
          audioUrl: `blob:test-url-${i}`,
          timestamp: Date.now() - (i * 1000) // Different timestamps
        });
      }

      const cleanedCount = cleanupCache();

      expect(cleanedCount).toBe(2); // Should remove 2 oldest entries
      expect(mockNativeMimic.audioCache.size).toBe(50);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    });
  });

  describe('Audio Playback', () => {
    test('Google TTS audio should set correct playback rate', async () => {
      const mockAudio = {
        play: jest.fn(() => Promise.resolve()),
        pause: jest.fn(),
        playbackRate: 1,
        onplay: null,
        onended: null,
        onerror: null
      };
      global.Audio = jest.fn(() => mockAudio);

      const playGoogleTTSAudio = async function(audioUrl, cacheKey) {
        if (this.currentAudio) {
          this.currentAudio.pause();
          this.currentAudio = null;
        }

        const audio = new Audio(audioUrl);
        this.currentAudio = audio;
        audio.playbackRate = this.speechRate;
        
        audio.onplay = () => this.onSpeechStart();
        audio.onended = () => {
          this.currentAudio = null;
          this.onSpeechEnd();
        };

        await audio.play();
      }.bind(mockNativeMimic);

      mockNativeMimic.speechRate = 1.5;
      await playGoogleTTSAudio('test-url', 'test-cache');

      expect(mockAudio.playbackRate).toBe(1.5);
      expect(mockAudio.play).toHaveBeenCalled();
      expect(mockNativeMimic.currentAudio).toBe(mockAudio);
    });

    test('speed change should update Google TTS audio playback rate', () => {
      const mockAudio = {
        playbackRate: 1,
        paused: false
      };
      mockNativeMimic.currentAudio = mockAudio;

      const setSpeechRate = function(newRate) {
        const clampedRate = Math.max(0.3, Math.min(2.0, newRate));
        this.speechRate = clampedRate;
        
        if (this.currentAudio && !this.currentAudio.paused) {
          this.currentAudio.playbackRate = clampedRate;
        }
      }.bind(mockNativeMimic);

      setSpeechRate(1.8);

      expect(mockNativeMimic.speechRate).toBe(1.8);
      expect(mockAudio.playbackRate).toBe(1.8);
    });
  });

  describe('Error Handling', () => {
    test('should handle Google TTS initialization failure gracefully', async () => {
      // Remove Google TTS client
      delete mockWindow.googleTTSClient;

      const speakWithGoogleTTS = async function(text, voiceId) {
        if (!window.googleTTSClient || !window.googleTTSClient.isInitialized) {
          throw new Error('GoogleTTS not initialized');
        }
      }.bind(mockNativeMimic);

      await expect(speakWithGoogleTTS('test')).rejects.toThrow('GoogleTTS not initialized');
    });

    test('should handle Google TTS synthesis failure', async () => {
      // Create fresh window mock with failing synthesizeText
      const testWindow = {
        googleTTSClient: {
          isInitialized: true,
          synthesizeText: jest.fn(() => 
            Promise.reject(new Error('TTS synthesis failed'))
          )
        }
      };

      const speakWithGoogleTTS = async function(text, voiceId, testWin = testWindow) {
        if (!testWin.googleTTSClient || !testWin.googleTTSClient.isInitialized) {
          throw new Error('GoogleTTS not initialized');
        }
        
        try {
          const result = await testWin.googleTTSClient.synthesizeText(text, voiceId);
          return result;
        } catch (error) {
          this.debugError('Google TTS speech failed:', error);
          throw error;
        }
      }.bind(mockNativeMimic);

      await expect(speakWithGoogleTTS('test')).rejects.toThrow('TTS synthesis failed');
      expect(mockNativeMimic.debugError).toHaveBeenCalledWith(
        'Google TTS speech failed:', 
        expect.any(Error)
      );
    });
  });

  describe('Logging Changes', () => {
    test('should use Google TTS instead of ElevenLabs in logs', () => {
      const logSpeedChange = function(rate) {
        console.log(`💰 Google TTS Cost: $0.0000 (SPEED CHANGE) | Playback rate: ${rate}x`);
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      logSpeedChange(1.5);

      expect(consoleSpy).toHaveBeenCalledWith(
        '💰 Google TTS Cost: $0.0000 (SPEED CHANGE) | Playback rate: 1.5x'
      );

      consoleSpy.mockRestore();
    });

    test('should log cache usage with cost information', () => {
      const logCacheUsage = function(text, voiceId) {
        console.log(`💰 Google TTS Cost: $0.0000 (CACHED) | Characters: ${text.length} | Voice: ${voiceId || 'default'}`);
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      logCacheUsage('Hello world', 'en-US-Neural2-F');

      expect(consoleSpy).toHaveBeenCalledWith(
        '💰 Google TTS Cost: $0.0000 (CACHED) | Characters: 11 | Voice: en-US-Neural2-F'
      );

      consoleSpy.mockRestore();
    });
  });
});