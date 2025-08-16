/**
 * AudioManager.test.ts
 * Comprehensive unit tests for AudioManager component
 * 
 * Tests cover:
 * - Component initialization and configuration validation
 * - Audio playback lifecycle management
 * - Cross-browser compatibility handling
 * - Memory management and cache operations
 * - Error handling and recovery mechanisms
 * - Performance optimization features
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { AudioManager, type AudioConfig, type AudioMetadata, type AudioPlaybackState } from '@core/1.2_voice_engine/audio_processing/AudioManager';

// Mock browser APIs
global.Audio = vi.fn(() => ({
  play: vi.fn(),
  pause: vi.fn(),
  load: vi.fn(),
  canPlayType: vi.fn(() => 'probably'),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  volume: 1,
  playbackRate: 1,
  currentTime: 0,
  duration: 10,
  paused: false,
  ended: false,
  readyState: 4,
  networkState: 1,
  buffered: { length: 0, start: vi.fn(), end: vi.fn() },
  error: null,
  src: '',
  crossOrigin: null,
  autoplay: false,
  preload: 'metadata'
})) as any;

global.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn()
} as any;

global.AudioContext = vi.fn(() => ({
  createGain: vi.fn(() => ({
    gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), value: 1 },
    connect: vi.fn()
  })),
  destination: {},
  currentTime: 0,
  state: 'running',
  close: vi.fn()
})) as any;

global.performance = {
  now: vi.fn(() => Date.now())
} as any;

describe('AudioManager', () => {
  let audioManager: AudioManager;
  let mockAudioElement: any;
  let mockAudioContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset global mocks to their default state
    global.AudioContext = vi.fn(() => ({
      createGain: vi.fn(() => ({
        gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), value: 1 },
        connect: vi.fn()
      })),
      destination: {},
      currentTime: 0,
      state: 'running',
      close: vi.fn()
    })) as any;
    
    // Set up fresh mocks for each test
    mockAudioElement = new Audio();
    mockAudioContext = new AudioContext();
    
    // Default test configuration
    const testConfig: Partial<AudioConfig> = {
      preferredFormat: 'mp3',
      maxCacheSize: 5,
      maxCacheSizeBytes: 1024 * 1024, // 1MB
      volume: 0.8,
      enableWebAudioAPI: true,
      autoplay: false
    };
    
    audioManager = new AudioManager(testConfig);
  });

  afterEach(() => {
    if (audioManager) {
      audioManager.destroy();
    }
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultManager = new AudioManager();
      expect(defaultManager).toBeDefined();
      expect(defaultManager.getBestSupportedFormat()).toBe('audio/mp3');
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig: Partial<AudioConfig> = {
        volume: 0.5,
        playbackRate: 1.5,
        maxCacheSize: 20
      };
      
      const manager = new AudioManager(customConfig);
      const state = manager.getPlaybackState();
      expect(state.volume).toBe(0.5);
      expect(state.playbackRate).toBe(1.5);
      
      manager.destroy();
    });

    it('should validate configuration parameters', () => {
      expect(() => new AudioManager({ volume: -0.5 })).toThrow('Volume must be between 0 and 1');
      expect(() => new AudioManager({ volume: 1.5 })).toThrow('Volume must be between 0 and 1');
      expect(() => new AudioManager({ playbackRate: 0.1 })).toThrow('Playback rate must be between 0.25 and 4');
      expect(() => new AudioManager({ playbackRate: 5 })).toThrow('Playback rate must be between 0.25 and 4');
      expect(() => new AudioManager({ maxCacheSize: 0 })).toThrow('Max cache size must be at least 1');
      expect(() => new AudioManager({ maxCacheSizeBytes: 100 })).toThrow('Max cache size bytes must be at least 1024');
    });

    it('should handle Web Audio API initialization failure gracefully', () => {
      // Save original AudioContext mock
      const originalAudioContext = global.AudioContext;
      
      // Mock AudioContext to throw error
      global.AudioContext = vi.fn(() => {
        throw new Error('AudioContext not supported');
      }) as any;
      
      expect(() => new AudioManager({ enableWebAudioAPI: true })).not.toThrow();
      
      // Restore original mock
      global.AudioContext = originalAudioContext;
    });
  });

  describe('Audio Format Support', () => {
    it('should detect supported audio formats', () => {
      expect(audioManager.supportsAudioFormat('audio/mp3')).toBe(true);
      expect(audioManager.supportsAudioFormat('audio/wav')).toBe(true);
    });

    it('should return best supported format', () => {
      const format = audioManager.getBestSupportedFormat();
      expect(format).toBe('audio/mp3');
    });

    it('should get list of all supported formats', () => {
      const formats = AudioManager.getSupportedFormats();
      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);
    });

    it('should handle unsupported format detection', () => {
      // Save original mock
      const originalCanPlayType = mockAudioElement.canPlayType;
      
      // Mock canPlayType to return empty string (no support)
      mockAudioElement.canPlayType = vi.fn(() => '');
      
      // Temporarily replace global Audio constructor
      const originalAudio = global.Audio;
      global.Audio = vi.fn(() => mockAudioElement) as any;
      
      expect(audioManager.supportsAudioFormat('audio/xyz')).toBe(false);
      
      // Restore mocks
      global.Audio = originalAudio;
      mockAudioElement.canPlayType = originalCanPlayType;
    });
  });

  describe('Audio Playback', () => {
    let testBlob: Blob;

    beforeEach(() => {
      testBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
    });

    it('should play audio successfully', async () => {
      const playPromise = Promise.resolve();
      mockAudioElement.play.mockReturnValue(playPromise);
      
      await expect(audioManager.playAudio(testBlob)).resolves.not.toThrow();
      expect(mockAudioElement.play).toHaveBeenCalled();
    });

    it('should handle playback with onEnded callback', async () => {
      const onEndedCallback = vi.fn();
      const playPromise = Promise.resolve();
      mockAudioElement.play.mockReturnValue(playPromise);
      
      await audioManager.playAudio(testBlob, onEndedCallback);
      
      // Simulate audio ending
      const endedListener = mockAudioElement.addEventListener.mock.calls.find(
        call => call[0] === 'ended'
      )?.[1];
      if (endedListener) {
        endedListener();
        expect(onEndedCallback).toHaveBeenCalled();
      }
    });

    it('should reject invalid audio blob', async () => {
      const emptyBlob = new Blob([], { type: 'audio/mp3' });
      await expect(audioManager.playAudio(emptyBlob)).rejects.toThrow('Invalid audio blob provided');
    });

    it('should stop current audio before playing new audio', async () => {
      const playPromise = Promise.resolve();
      mockAudioElement.play.mockReturnValue(playPromise);
      
      // Play first audio
      await audioManager.playAudio(testBlob);
      
      // Play second audio
      await audioManager.playAudio(testBlob);
      
      expect(mockAudioElement.pause).toHaveBeenCalled();
    });

    it('should retry playback on failure', async () => {
      let callCount = 0;
      mockAudioElement.play.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Playback failed'));
        }
        return Promise.resolve();
      });
      
      await expect(audioManager.playAudio(testBlob)).resolves.not.toThrow();
      expect(mockAudioElement.play).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      mockAudioElement.play.mockRejectedValue(new Error('Persistent playback failure'));
      
      await expect(audioManager.playAudio(testBlob)).rejects.toThrow('Persistent playback failure');
    });
  });

  describe('Audio Control Operations', () => {
    let testBlob: Blob;

    beforeEach(async () => {
      testBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
      mockAudioElement.play.mockResolvedValue(undefined);
      await audioManager.playAudio(testBlob);
    });

    it('should pause audio', () => {
      mockAudioElement.paused = false;
      audioManager.pauseAudio();
      expect(mockAudioElement.pause).toHaveBeenCalled();
    });

    it('should resume paused audio', async () => {
      mockAudioElement.paused = true;
      mockAudioElement.ended = false;
      mockAudioElement.play.mockResolvedValue(undefined);
      
      await audioManager.resumeAudio();
      expect(mockAudioElement.play).toHaveBeenCalled();
    });

    it('should stop audio', async () => {
      await audioManager.stopAudio();
      expect(mockAudioElement.pause).toHaveBeenCalled();
      expect(mockAudioElement.currentTime).toBe(0);
    });

    it('should set volume', () => {
      audioManager.setVolume(0.5);
      expect(mockAudioElement.volume).toBe(0.5);
    });

    it('should clamp volume to valid range', () => {
      audioManager.setVolume(-0.5);
      expect(mockAudioElement.volume).toBe(0);
      
      audioManager.setVolume(1.5);
      expect(mockAudioElement.volume).toBe(1);
    });

    it('should set playback rate', () => {
      audioManager.setPlaybackRate(1.5);
      expect(mockAudioElement.playbackRate).toBe(1.5);
    });

    it('should clamp playback rate to valid range', () => {
      audioManager.setPlaybackRate(0.1);
      expect(mockAudioElement.playbackRate).toBe(0.25);
      
      audioManager.setPlaybackRate(5);
      expect(mockAudioElement.playbackRate).toBe(4);
    });

    it('should seek to specific time', () => {
      mockAudioElement.duration = 100;
      audioManager.seekTo(50);
      expect(mockAudioElement.currentTime).toBe(50);
    });

    it('should clamp seek time to audio duration', () => {
      mockAudioElement.duration = 100;
      audioManager.seekTo(150);
      expect(mockAudioElement.currentTime).toBe(100);
      
      audioManager.seekTo(-10);
      expect(mockAudioElement.currentTime).toBe(0);
    });
  });

  describe('Audio State Management', () => {
    it('should return default state when no audio is loaded', () => {
      const state = audioManager.getPlaybackState();
      expect(state.isPlaying).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
    });

    it('should return comprehensive playback state', async () => {
      const testBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
      mockAudioElement.play.mockResolvedValue(undefined);
      mockAudioElement.paused = false;
      mockAudioElement.ended = false;
      mockAudioElement.currentTime = 5;
      mockAudioElement.duration = 10;
      mockAudioElement.volume = 0.8;
      mockAudioElement.playbackRate = 1.2;
      mockAudioElement.readyState = 4;
      mockAudioElement.networkState = 1;
      
      await audioManager.playAudio(testBlob);
      
      const state = audioManager.getPlaybackState();
      expect(state.isPlaying).toBe(true);
      expect(state.isPaused).toBe(false);
      expect(state.currentTime).toBe(5);
      expect(state.duration).toBe(10);
      expect(state.volume).toBe(0.8);
      expect(state.playbackRate).toBe(1.2);
      expect(state.isLoading).toBe(false);
      expect(state.hasEnded).toBe(false);
    });

    it('should provide convenient state check methods', async () => {
      const testBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
      mockAudioElement.play.mockResolvedValue(undefined);
      mockAudioElement.paused = false;
      mockAudioElement.ended = false;
      mockAudioElement.currentTime = 5;
      mockAudioElement.duration = 10;
      
      await audioManager.playAudio(testBlob);
      
      expect(audioManager.isPlaying()).toBe(true);
      expect(audioManager.isPaused()).toBe(false);
      expect(audioManager.getCurrentTime()).toBe(5);
      expect(audioManager.getDuration()).toBe(10);
    });
  });

  describe('Audio Metadata Extraction', () => {
    it('should extract audio metadata successfully', async () => {
      const testBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
      mockAudioElement.duration = 120;
      
      // Mock the metadata loading
      setTimeout(() => {
        const metadataEvent = mockAudioElement.addEventListener.mock.calls.find(
          call => call[0] === 'loadedmetadata'
        )?.[1];
        if (metadataEvent) metadataEvent();
      }, 0);
      
      const metadata = await audioManager.getAudioMetadata(testBlob);
      
      expect(metadata.format).toBe('audio/mp3');
      expect(metadata.duration).toBe(120);
      expect(metadata.size).toBe(testBlob.size);
      expect(metadata.isValid).toBe(true);
      expect(typeof metadata.loadTime).toBe('number');
    });

    it('should handle metadata loading timeout', async () => {
      const testBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
      
      // Don't trigger loadedmetadata event to simulate timeout
      await expect(audioManager.getAudioMetadata(testBlob)).rejects.toThrow('Metadata loading timeout');
    });

    it('should handle metadata loading error', async () => {
      const testBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
      
      // Trigger error event
      setTimeout(() => {
        const errorEvent = mockAudioElement.addEventListener.mock.calls.find(
          call => call[0] === 'error'
        )?.[1];
        if (errorEvent) errorEvent();
      }, 0);
      
      await expect(audioManager.getAudioMetadata(testBlob)).rejects.toThrow('Failed to load audio metadata');
    });
  });

  describe('Audio Caching', () => {
    it('should cache audio successfully', async () => {
      const testBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
      
      // Mock metadata loading
      setTimeout(() => {
        const metadataEvent = mockAudioElement.addEventListener.mock.calls.find(
          call => call[0] === 'loadedmetadata'
        )?.[1];
        if (metadataEvent) metadataEvent();
      }, 0);
      
      await audioManager.cacheAudio('test-key', testBlob);
      
      const cachedBlob = audioManager.getCachedAudio('test-key');
      expect(cachedBlob).toBe(testBlob);
    });

    it('should return null for non-existent cache key', () => {
      const cachedBlob = audioManager.getCachedAudio('non-existent');
      expect(cachedBlob).toBeNull();
    });

    it('should track cache access statistics', async () => {
      const testBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
      
      setTimeout(() => {
        const metadataEvent = mockAudioElement.addEventListener.mock.calls.find(
          call => call[0] === 'loadedmetadata'
        )?.[1];
        if (metadataEvent) metadataEvent();
      }, 0);
      
      await audioManager.cacheAudio('test-key', testBlob);
      
      audioManager.getCachedAudio('test-key');
      audioManager.getCachedAudio('test-key');
      
      const stats = audioManager.getCacheStats();
      expect(stats.entryCount).toBe(1);
      expect(stats.totalSizeBytes).toBe(testBlob.size);
    });

    it('should enforce cache size limits', async () => {
      // Create manager with small cache limit
      const smallCacheManager = new AudioManager({ maxCacheSize: 1 });
      
      const blob1 = new Blob(['data1'], { type: 'audio/mp3' });
      const blob2 = new Blob(['data2'], { type: 'audio/mp3' });
      
      // Mock metadata loading for both
      let metadataCallCount = 0;
      mockAudioElement.addEventListener.mockImplementation((event, handler) => {
        if (event === 'loadedmetadata') {
          setTimeout(() => {
            metadataCallCount++;
            handler();
          }, 0);
        }
      });
      
      await smallCacheManager.cacheAudio('key1', blob1);
      await smallCacheManager.cacheAudio('key2', blob2);
      
      // First entry should be evicted
      expect(smallCacheManager.getCachedAudio('key1')).toBeNull();
      expect(smallCacheManager.getCachedAudio('key2')).toBe(blob2);
      
      smallCacheManager.destroy();
    });

    it('should clear cache', async () => {
      const testBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
      
      setTimeout(() => {
        const metadataEvent = mockAudioElement.addEventListener.mock.calls.find(
          call => call[0] === 'loadedmetadata'
        )?.[1];
        if (metadataEvent) metadataEvent();
      }, 0);
      
      await audioManager.cacheAudio('test-key', testBlob);
      
      audioManager.clearCache();
      
      expect(audioManager.getCachedAudio('test-key')).toBeNull();
      expect(audioManager.getCacheStats().entryCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle audio element creation errors', async () => {
      global.Audio = vi.fn(() => {
        throw new Error('Audio element creation failed');
      }) as any;
      
      const testBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
      await expect(audioManager.playAudio(testBlob)).rejects.toThrow();
    });

    it('should handle URL creation errors', async () => {
      global.URL.createObjectURL = vi.fn(() => {
        throw new Error('URL creation failed');
      }) as any;
      
      const testBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
      await expect(audioManager.playAudio(testBlob)).rejects.toThrow();
    });

    it('should prevent operations after destruction', () => {
      audioManager.destroy();
      
      expect(() => audioManager.setVolume(0.5)).toThrow('AudioManager has been destroyed');
      expect(() => audioManager.pauseAudio()).toThrow('AudioManager has been destroyed');
    });
  });

  describe('Resource Management', () => {
    it('should clean up resources on destruction', () => {
      const mockClose = vi.fn();
      mockAudioContext.close = mockClose;
      
      audioManager.destroy();
      
      expect(mockClose).toHaveBeenCalled();
      expect(() => audioManager.setVolume(0.5)).toThrow('AudioManager has been destroyed');
    });

    it('should revoke object URLs on cleanup', async () => {
      const testBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
      mockAudioElement.play.mockResolvedValue(undefined);
      
      await audioManager.playAudio(testBlob);
      await audioManager.stopAudio();
      
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', () => {
      global.URL.revokeObjectURL = vi.fn(() => {
        throw new Error('Cleanup failed');
      }) as any;
      
      expect(() => audioManager.destroy()).not.toThrow();
    });
  });

  describe('Performance Optimization', () => {
    it('should perform automatic cache cleanup', () => {
      const manager = new AudioManager({ maxCacheSize: 2 });
      
      // Manually trigger cleanup (normally done by timer)
      (manager as any).performCacheCleanup();
      
      manager.destroy();
    });

    it('should provide cache statistics for monitoring', () => {
      const stats = audioManager.getCacheStats();
      
      expect(typeof stats.entryCount).toBe('number');
      expect(typeof stats.totalSizeBytes).toBe('number');
      expect(typeof stats.maxSizeBytes).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });
  });
});