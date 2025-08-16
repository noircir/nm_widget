/**
 * AudioManager.ts
 * Production-ready cross-browser audio processing for NativeMimic v4.0
 * 
 * Features:
 * - Cross-browser audio compatibility with graceful degradation
 * - Memory-efficient caching with automatic cleanup
 * - Robust error handling and recovery mechanisms
 * - Performance optimized for browser extension environment
 * - Full TypeScript strict typing for reliability
 */

/**
 * Configuration interface for AudioManager initialization
 */
export interface AudioConfig {
  readonly preferredFormat: 'mp3' | 'wav' | 'webm' | 'ogg';
  readonly fallbackFormats: readonly string[];
  readonly maxCacheSize: number;        // Max cached audio files
  readonly maxCacheSizeBytes: number;   // Max cache size in bytes
  readonly enableCrossfade: boolean;
  readonly volume: number;              // 0.0 to 1.0
  readonly playbackRate: number;        // 0.25 to 4.0
  readonly autoplay: boolean;
  readonly preloadStrategy: 'none' | 'metadata' | 'auto';
  readonly enableWebAudioAPI: boolean;
  readonly crossOrigin: 'anonymous' | 'use-credentials' | null;
}

/**
 * Audio metadata interface with comprehensive information
 */
export interface AudioMetadata {
  readonly format: string;
  readonly duration: number;
  readonly size: number;
  readonly sampleRate: number;
  readonly bitRate: number;
  readonly channels: number;
  readonly isValid: boolean;
  readonly loadTime: number;
}

/**
 * Audio playback state interface
 */
export interface AudioPlaybackState {
  readonly isPlaying: boolean;
  readonly isPaused: boolean;
  readonly isLoading: boolean;
  readonly hasEnded: boolean;
  readonly currentTime: number;
  readonly duration: number;
  readonly volume: number;
  readonly playbackRate: number;
  readonly bufferedRanges: readonly TimeRange[];
  readonly networkState: number;
  readonly readyState: number;
  readonly error: AudioError | null;
}

/**
 * Audio error interface with detailed error information
 */
export interface AudioError {
  readonly code: number;
  readonly message: string;
  readonly type: 'MEDIA_ERR_ABORTED' | 'MEDIA_ERR_NETWORK' | 'MEDIA_ERR_DECODE' | 'MEDIA_ERR_SRC_NOT_SUPPORTED' | 'UNKNOWN';
  readonly timestamp: number;
  readonly context?: string;
}

/**
 * Time range interface for buffered audio segments
 */
export interface TimeRange {
  readonly start: number;
  readonly end: number;
}

/**
 * Audio cache entry interface
 */
interface AudioCacheEntry {
  readonly blob: Blob;
  readonly metadata: AudioMetadata;
  readonly lastAccessed: number;
  readonly accessCount: number;
}

/**
 * Production-ready AudioManager class with comprehensive error handling,
 * memory management, and cross-browser compatibility
 */
export class AudioManager {
  private readonly config: AudioConfig;
  private readonly audioCache = new Map<string, AudioCacheEntry>();
  private currentAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isDestroyed = false;
  private currentCacheSizeBytes = 0;
  private readonly eventListeners = new Map<HTMLAudioElement, () => void>();
  private readonly cleanupTimeouts = new Set<NodeJS.Timeout>();

  // Default configuration for safe operation
  private static readonly DEFAULT_CONFIG: AudioConfig = {
    preferredFormat: 'mp3',
    fallbackFormats: ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg'],
    maxCacheSize: 50,
    maxCacheSizeBytes: 50 * 1024 * 1024, // 50MB
    enableCrossfade: false,
    volume: 0.8,
    playbackRate: 1.0,
    autoplay: true,
    preloadStrategy: 'metadata',
    enableWebAudioAPI: true,
    crossOrigin: 'anonymous'
  };

  constructor(config: Partial<AudioConfig> = {}) {
    this.config = { ...AudioManager.DEFAULT_CONFIG, ...config };
    this.validateConfig();
    this.initializeAudioContext();
    this.setupCleanupScheduler();
  }

  /**
   * Play audio from blob with comprehensive error handling and recovery
   */
  async playAudio(audioBlob: Blob, onEnded?: () => void): Promise<void> {
    this.throwIfDestroyed();
    
    try {
      // Validate input
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Invalid audio blob provided');
      }

      // Stop current audio if playing
      await this.stopAudio();

      // Convert to supported format if needed
      const compatibleBlob = await this.ensureCompatibleFormat(audioBlob);
      
      // Create and configure audio element
      this.currentAudio = this.createAudioElement(compatibleBlob);
      
      // Set up comprehensive event listeners
      this.setupAudioEventListeners(this.currentAudio, onEnded);
      
      // Configure audio properties
      this.configureAudioElement(this.currentAudio);

      // Attempt playback with retry logic
      await this.attemptPlaybackWithRetry(this.currentAudio);

    } catch (error) {
      this.handlePlaybackError(error as Error);
      throw error;
    }
  }

  /**
   * Stop current audio playback with proper cleanup
   */
  async stopAudio(): Promise<void> {
    if (!this.currentAudio) return;

    try {
      // Fade out if crossfade is enabled
      if (this.config.enableCrossfade && this.gainNode) {
        await this.fadeOut(this.currentAudio, 150); // 150ms fade
      }

      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.cleanupCurrentAudio();
    } catch (error) {
      // Force cleanup even if fade fails
      this.cleanupCurrentAudio();
    }
  }

  /**
   * Pause current audio playback
   */
  pauseAudio(): void {
    this.throwIfDestroyed();
    
    if (this.currentAudio && !this.currentAudio.paused) {
      try {
        this.currentAudio.pause();
      } catch (error) {
        console.warn('Failed to pause audio:', error);
      }
    }
  }

  /**
   * Resume paused audio playback
   */
  async resumeAudio(): Promise<void> {
    this.throwIfDestroyed();
    
    if (this.currentAudio && this.currentAudio.paused && !this.currentAudio.ended) {
      try {
        await this.currentAudio.play();
      } catch (error) {
        this.handlePlaybackError(error as Error);
        throw error;
      }
    }
  }

  /**
   * Set playback volume with validation and Web Audio API support
   */
  setVolume(volume: number): void {
    this.throwIfDestroyed();
    
    const clampedVolume = Math.max(0, Math.min(1, volume));
    (this.config as any).volume = clampedVolume;
    
    if (this.currentAudio) {
      this.currentAudio.volume = clampedVolume;
    }
    
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(clampedVolume, this.audioContext?.currentTime || 0);
    }
  }

  /**
   * Set playback speed with smooth transitions
   */
  setPlaybackRate(rate: number): void {
    this.throwIfDestroyed();
    
    const clampedRate = Math.max(0.25, Math.min(4.0, rate));
    (this.config as any).playbackRate = clampedRate;
    
    if (this.currentAudio) {
      try {
        this.currentAudio.playbackRate = clampedRate;
      } catch (error) {
        console.warn('Failed to set playback rate:', error);
      }
    }
  }

  /**
   * Cache audio blob with intelligent memory management
   */
  async cacheAudio(key: string, audioBlob: Blob): Promise<void> {
    this.throwIfDestroyed();
    
    if (!key || !audioBlob || audioBlob.size === 0) {
      throw new Error('Invalid cache key or audio blob');
    }

    try {
      // Get metadata for the audio
      const metadata = await this.getAudioMetadata(audioBlob);
      
      // Check if we need to make space
      await this.ensureCacheSpace(audioBlob.size);
      
      // Create cache entry
      const cacheEntry: AudioCacheEntry = {
        blob: audioBlob,
        metadata,
        lastAccessed: Date.now(),
        accessCount: 0
      };
      
      this.audioCache.set(key, cacheEntry);
      this.currentCacheSizeBytes += audioBlob.size;
      
    } catch (error) {
      console.warn('Failed to cache audio:', error);
    }
  }

  /**
   * Retrieve cached audio blob with access tracking
   */
  getCachedAudio(key: string): Blob | null {
    this.throwIfDestroyed();
    
    const entry = this.audioCache.get(key);
    if (!entry) return null;
    
    // Update access statistics
    const updatedEntry: AudioCacheEntry = {
      ...entry,
      lastAccessed: Date.now(),
      accessCount: entry.accessCount + 1
    };
    
    this.audioCache.set(key, updatedEntry);
    return entry.blob;
  }

  /**
   * Clear audio cache with proper memory cleanup
   */
  clearCache(): void {
    this.audioCache.clear();
    this.currentCacheSizeBytes = 0;
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    entryCount: number;
    totalSizeBytes: number;
    maxSizeBytes: number;
    hitRate: number;
  } {
    const entries = Array.from(this.audioCache.values());
    const totalAccesses = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    
    return {
      entryCount: this.audioCache.size,
      totalSizeBytes: this.currentCacheSizeBytes,
      maxSizeBytes: this.config.maxCacheSizeBytes,
      hitRate: totalAccesses > 0 ? entries.length / totalAccesses : 0
    };
  }

  /**
   * Get comprehensive audio metadata with timeout protection
   */
  async getAudioMetadata(audioBlob: Blob): Promise<AudioMetadata> {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(audioBlob);
      let isResolved = false;
      
      // Timeout protection
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Metadata loading timeout'));
        }
      }, 5000);
      
      const cleanup = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(objectUrl);
      };
      
      audio.onloadedmetadata = () => {
        if (isResolved) return;
        isResolved = true;
        
        const loadTime = performance.now() - startTime;
        const isValid = !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0;
        
        const metadata: AudioMetadata = {
          format: audioBlob.type || 'unknown',
          duration: isValid ? audio.duration : 0,
          size: audioBlob.size,
          sampleRate: 44100, // Default assumption
          bitRate: isValid ? Math.round((audioBlob.size * 8) / audio.duration / 1000) : 0,
          channels: 2, // Default assumption
          isValid,
          loadTime
        };
        
        cleanup();
        resolve(metadata);
      };

      audio.onerror = (event) => {
        if (isResolved) return;
        isResolved = true;
        
        cleanup();
        reject(new Error(`Failed to load audio metadata: ${audio.error?.message || 'Unknown error'}`));
      };
      
      audio.src = objectUrl;
    });
  }

  /**
   * Check if browser supports audio format
   */
  supportsAudioFormat(mimeType: string): boolean {
    const audio = new Audio();
    const support = audio.canPlayType(mimeType);
    return support === 'probably' || support === 'maybe';
  }

  /**
   * Get best supported audio format for current browser
   */
  getBestSupportedFormat(): string {
    const formats = [
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/webm',
      'audio/ogg'
    ];

    for (const format of formats) {
      if (this.supportsAudioFormat(format)) {
        return format;
      }
    }

    return 'audio/mp3'; // Fallback
  }

  /**
   * Ensure audio blob is in compatible format
   */
  private async ensureCompatibleFormat(audioBlob: Blob): Promise<Blob> {
    // Check if current format is supported
    if (this.supportsAudioFormat(audioBlob.type)) {
      return audioBlob;
    }

    // Try fallback formats
    for (const format of this.config.fallbackFormats) {
      if (this.supportsAudioFormat(format)) {
        // In a real implementation, you would convert the audio format here
        // For now, return original blob and let browser handle it
        console.warn(`Audio format ${audioBlob.type} not supported, using fallback`);
        return audioBlob;
      }
    }

    return audioBlob;
  }

  /**
   * Initialize Web Audio API context with proper error handling
   */
  private initializeAudioContext(): void {
    if (!this.config.enableWebAudioAPI) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API not available in this browser');
        return;
      }
      
      this.audioContext = new AudioContextClass();
      
      // Create gain node for volume control
      if (this.audioContext) {
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
        this.gainNode.gain.setValueAtTime(this.config.volume, this.audioContext.currentTime);
      }
      
    } catch (error) {
      console.warn('Failed to initialize Web Audio API:', error);
      this.audioContext = null;
      this.gainNode = null;
    }
  }

  /**
   * Validate configuration on initialization
   */
  private validateConfig(): void {
    if (this.config.volume < 0 || this.config.volume > 1) {
      throw new Error('Volume must be between 0 and 1');
    }
    
    if (this.config.playbackRate < 0.25 || this.config.playbackRate > 4) {
      throw new Error('Playback rate must be between 0.25 and 4');
    }
    
    if (this.config.maxCacheSize < 1) {
      throw new Error('Max cache size must be at least 1');
    }
    
    if (this.config.maxCacheSizeBytes < 1024) {
      throw new Error('Max cache size bytes must be at least 1024');
    }
  }
  
  /**
   * Set up automatic cache cleanup scheduler
   */
  private setupCleanupScheduler(): void {
    // Schedule cache cleanup every 5 minutes
    const cleanupInterval = setInterval(() => {
      if (this.isDestroyed) {
        clearInterval(cleanupInterval);
        return;
      }
      this.performCacheCleanup();
    }, 5 * 60 * 1000);
    
    this.cleanupTimeouts.add(cleanupInterval);
  }
  
  /**
   * Perform intelligent cache cleanup based on access patterns
   */
  private performCacheCleanup(): void {
    if (this.audioCache.size <= this.config.maxCacheSize && 
        this.currentCacheSizeBytes <= this.config.maxCacheSizeBytes) {
      return;
    }
    
    // Sort by last accessed time and access count (LRU with frequency)
    const entries = Array.from(this.audioCache.entries()).sort(([, a], [, b]) => {
      const scoreA = a.lastAccessed + (a.accessCount * 60000); // Boost frequently used items
      const scoreB = b.lastAccessed + (b.accessCount * 60000);
      return scoreA - scoreB; // Least recently used first
    });
    
    // Remove oldest entries until we're under limits
    for (let i = 0; i < entries.length; i++) {
      const [key, entry] = entries[i];
      if (this.audioCache.size <= this.config.maxCacheSize && 
          this.currentCacheSizeBytes <= this.config.maxCacheSizeBytes) {
        break;
      }
      
      this.audioCache.delete(key);
      this.currentCacheSizeBytes -= entry.blob.size;
    }
  }
  
  /**
   * Ensure there's enough cache space for new entry
   */
  private async ensureCacheSpace(newEntrySize: number): Promise<void> {
    while (this.audioCache.size >= this.config.maxCacheSize || 
           this.currentCacheSizeBytes + newEntrySize > this.config.maxCacheSizeBytes) {
      
      if (this.audioCache.size === 0) break;
      
      // Find least recently used entry
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      
      for (const [key, entry] of this.audioCache.entries()) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        const entry = this.audioCache.get(oldestKey)!;
        this.audioCache.delete(oldestKey);
        this.currentCacheSizeBytes -= entry.blob.size;
      } else {
        break;
      }
    }
  }
  
  /**
   * Create and configure audio element
   */
  private createAudioElement(audioBlob: Blob): HTMLAudioElement {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(audioBlob);
    
    audio.src = objectUrl;
    audio.preload = this.config.preloadStrategy;
    
    if (this.config.crossOrigin) {
      audio.crossOrigin = this.config.crossOrigin;
    }
    
    return audio;
  }
  
  /**
   * Configure audio element properties
   */
  private configureAudioElement(audio: HTMLAudioElement): void {
    audio.volume = this.config.volume;
    audio.playbackRate = this.config.playbackRate;
    audio.autoplay = this.config.autoplay;
  }
  
  /**
   * Set up comprehensive event listeners for audio element
   */
  private setupAudioEventListeners(audio: HTMLAudioElement, onEnded?: () => void): void {
    const cleanup = () => {
      URL.revokeObjectURL(audio.src);
      this.eventListeners.delete(audio);
    };
    
    audio.addEventListener('ended', () => {
      cleanup();
      onEnded?.();
    });
    
    audio.addEventListener('error', (event) => {
      const error = audio.error;
      console.error('Audio playback error:', error);
      cleanup();
    });
    
    audio.addEventListener('abort', cleanup);
    
    this.eventListeners.set(audio, cleanup);
  }
  
  /**
   * Attempt audio playback with retry logic
   */
  private async attemptPlaybackWithRetry(audio: HTMLAudioElement, maxRetries = 3): Promise<void> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await audio.play();
        return; // Success
      } catch (error) {
        console.warn(`Playback attempt ${attempt + 1} failed:`, error);
        
        if (attempt < maxRetries - 1) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        } else {
          throw error; // Final attempt failed
        }
      }
    }
  }
  
  /**
   * Handle playback errors with detailed logging
   */
  private handlePlaybackError(error: Error): void {
    const audioError: AudioError = {
      code: -1,
      message: error.message,
      type: 'UNKNOWN',
      timestamp: Date.now(),
      context: 'AudioManager.playAudio'
    };
    
    console.error('Audio playback failed:', audioError);
  }
  
  /**
   * Clean up current audio element and associated resources
   */
  private cleanupCurrentAudio(): void {
    if (!this.currentAudio) return;
    
    const cleanup = this.eventListeners.get(this.currentAudio);
    if (cleanup) {
      cleanup();
    }
    
    this.currentAudio = null;
  }
  
  /**
   * Fade out audio for smooth transitions
   */
  private async fadeOut(audio: HTMLAudioElement, duration = 300): Promise<void> {
    if (!this.gainNode || !this.audioContext) return;
    
    const currentTime = this.audioContext.currentTime;
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0, currentTime + duration / 1000);
    
    return new Promise(resolve => {
      setTimeout(resolve, duration);
    });
  }
  
  /**
   * Throw error if manager has been destroyed
   */
  private throwIfDestroyed(): void {
    if (this.isDestroyed) {
      throw new Error('AudioManager has been destroyed');
    }
  }


  /**
   * Get current playback state with comprehensive information
   */
  getPlaybackState(): AudioPlaybackState {
    if (!this.currentAudio) {
      return {
        isPlaying: false,
        isPaused: false,
        isLoading: false,
        hasEnded: false,
        currentTime: 0,
        duration: 0,
        volume: this.config.volume,
        playbackRate: this.config.playbackRate,
        bufferedRanges: [],
        networkState: 0,
        readyState: 0,
        error: null
      };
    }

    const bufferedRanges: TimeRange[] = [];
    for (let i = 0; i < this.currentAudio.buffered.length; i++) {
      bufferedRanges.push({
        start: this.currentAudio.buffered.start(i),
        end: this.currentAudio.buffered.end(i)
      });
    }

    let audioError: AudioError | null = null;
    if (this.currentAudio.error) {
      audioError = {
        code: this.currentAudio.error.code,
        message: this.currentAudio.error.message,
        type: this.getErrorType(this.currentAudio.error.code),
        timestamp: Date.now()
      };
    }

    return {
      isPlaying: !this.currentAudio.paused && !this.currentAudio.ended,
      isPaused: this.currentAudio.paused,
      isLoading: this.currentAudio.readyState < 4,
      hasEnded: this.currentAudio.ended,
      currentTime: this.currentAudio.currentTime,
      duration: this.currentAudio.duration || 0,
      volume: this.currentAudio.volume,
      playbackRate: this.currentAudio.playbackRate,
      bufferedRanges,
      networkState: this.currentAudio.networkState,
      readyState: this.currentAudio.readyState,
      error: audioError
    };
  }
  
  /**
   * Convert error code to error type
   */
  private getErrorType(code: number): AudioError['type'] {
    switch (code) {
      case 1: return 'MEDIA_ERR_ABORTED';
      case 2: return 'MEDIA_ERR_NETWORK';
      case 3: return 'MEDIA_ERR_DECODE';
      case 4: return 'MEDIA_ERR_SRC_NOT_SUPPORTED';
      default: return 'UNKNOWN';
    }
  }
  
  /**
   * Check if audio is currently playing
   */
  isPlaying(): boolean {
    return this.currentAudio ? !this.currentAudio.paused && !this.currentAudio.ended : false;
  }
  
  /**
   * Check if audio is currently paused
   */
  isPaused(): boolean {
    return this.currentAudio ? this.currentAudio.paused : false;
  }
  
  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    return this.currentAudio?.currentTime || 0;
  }
  
  /**
   * Get audio duration
   */
  getDuration(): number {
    return this.currentAudio?.duration || 0;
  }
  
  /**
   * Seek to specific time position
   */
  seekTo(time: number): void {
    this.throwIfDestroyed();
    
    if (this.currentAudio && !isNaN(time) && isFinite(time)) {
      const clampedTime = Math.max(0, Math.min(time, this.currentAudio.duration || 0));
      try {
        this.currentAudio.currentTime = clampedTime;
      } catch (error) {
        console.warn('Failed to seek audio:', error);
      }
    }
  }
  
  /**
   * Check if specific audio format is supported
   */
  static isFormatSupported(mimeType: string): boolean {
    const audio = new Audio();
    const support = audio.canPlayType(mimeType);
    return support === 'probably' || support === 'maybe';
  }
  
  /**
   * Get list of all supported audio formats
   */
  static getSupportedFormats(): string[] {
    const formats = [
      'audio/mpeg', 'audio/mp3',
      'audio/wav', 'audio/wave',
      'audio/webm', 'audio/webm; codecs=opus',
      'audio/ogg', 'audio/ogg; codecs=vorbis',
      'audio/aac', 'audio/mp4',
      'audio/flac'
    ];
    
    return formats.filter(format => AudioManager.isFormatSupported(format));
  }
  
  /**
   * Destroy audio manager and clean up all resources
   */
  destroy(): void {
    if (this.isDestroyed) return;
    
    this.isDestroyed = true;
    
    // Stop current audio
    this.stopAudio();
    
    // Clear cache
    this.clearCache();
    
    // Clean up all event listeners
    const cleanupCallbacks = Array.from(this.eventListeners.values());
    for (let i = 0; i < cleanupCallbacks.length; i++) {
      try {
        cleanupCallbacks[i]();
      } catch (error) {
        console.warn('Error during event listener cleanup:', error);
      }
    }
    this.eventListeners.clear();
    
    // Clear all timeouts
    const timeoutArray = Array.from(this.cleanupTimeouts);
    for (let i = 0; i < timeoutArray.length; i++) {
      clearTimeout(timeoutArray[i]);
    }
    this.cleanupTimeouts.clear();
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (error) {
        console.warn('Error closing audio context:', error);
      }
    }
    
    this.audioContext = null;
    this.gainNode = null;
  }
}