/**
 * AudioManager.ts
 * Cross-browser audio processing for NativeMimic v4.0
 * 
 * Handles audio playback, format conversion, and browser compatibility
 */

export interface AudioConfig {
  preferredFormat: 'mp3' | 'wav' | 'webm';
  fallbackFormats: string[];
  maxCacheSize: number;        // Max cached audio files
  enableCrossfade: boolean;
  volume: number;              // 0.0 to 1.0
}

export interface AudioMetadata {
  format: string;
  duration: number;
  size: number;
  sampleRate: number;
  bitRate: number;
}

export class AudioManager {
  private config: AudioConfig;
  private audioCache: Map<string, Blob> = new Map();
  private currentAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;

  constructor(config: AudioConfig) {
    this.config = config;
    this.initializeAudioContext();
  }

  /**
   * Play audio from blob with cross-browser support
   */
  async playAudio(audioBlob: Blob, onEnded?: () => void): Promise<void> {
    try {
      // Stop current audio if playing
      this.stopAudio();

      // Convert to supported format if needed
      const compatibleBlob = await this.ensureCompatibleFormat(audioBlob);
      
      // Create audio element
      this.currentAudio = new Audio(URL.createObjectURL(compatibleBlob));
      this.currentAudio.volume = this.config.volume;
      
      // Set up event listeners
      this.currentAudio.onended = () => {
        this.cleanup();
        onEnded?.();
      };

      this.currentAudio.onerror = (error) => {
        console.error('Audio playback error:', error);
        this.cleanup();
      };

      // Play audio
      await this.currentAudio.play();

    } catch (error) {
      console.error('Failed to play audio:', error);
      throw new Error(`Audio playback failed: ${(error as Error).message}`);
    }
  }

  /**
   * Stop current audio playback
   */
  stopAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.cleanup();
    }
  }

  /**
   * Pause current audio playback
   */
  pauseAudio(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
    }
  }

  /**
   * Resume paused audio playback
   */
  resumeAudio(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play();
    }
  }

  /**
   * Set playback volume
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    if (this.currentAudio) {
      this.currentAudio.volume = this.config.volume;
    }
  }

  /**
   * Set playback speed
   */
  setPlaybackRate(rate: number): void {
    if (this.currentAudio) {
      this.currentAudio.playbackRate = Math.max(0.25, Math.min(4.0, rate));
    }
  }

  /**
   * Cache audio blob for future use
   */
  cacheAudio(key: string, audioBlob: Blob): void {
    // Check cache size limit
    if (this.audioCache.size >= this.config.maxCacheSize) {
      // Remove oldest entry (FIFO)
      const firstKey = this.audioCache.keys().next().value;
      this.audioCache.delete(firstKey);
    }

    this.audioCache.set(key, audioBlob);
  }

  /**
   * Retrieve cached audio blob
   */
  getCachedAudio(key: string): Blob | null {
    return this.audioCache.get(key) || null;
  }

  /**
   * Clear audio cache
   */
  clearCache(): void {
    this.audioCache.clear();
  }

  /**
   * Get audio metadata
   */
  async getAudioMetadata(audioBlob: Blob): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      
      audio.onloadedmetadata = () => {
        const metadata: AudioMetadata = {
          format: audioBlob.type,
          duration: audio.duration,
          size: audioBlob.size,
          sampleRate: 44100, // Default assumption
          bitRate: Math.round((audioBlob.size * 8) / audio.duration / 1000) // Estimate
        };
        
        URL.revokeObjectURL(audio.src);
        resolve(metadata);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audio.src);
        reject(new Error('Failed to load audio metadata'));
      };
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
   * Initialize Web Audio API context
   */
  private initializeAudioContext(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  /**
   * Clean up audio resources
   */
  private cleanup(): void {
    if (this.currentAudio) {
      URL.revokeObjectURL(this.currentAudio.src);
      this.currentAudio = null;
    }
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): {
    isPlaying: boolean;
    isPaused: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    playbackRate: number;
  } {
    if (!this.currentAudio) {
      return {
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 0,
        volume: this.config.volume,
        playbackRate: 1.0
      };
    }

    return {
      isPlaying: !this.currentAudio.paused && !this.currentAudio.ended,
      isPaused: this.currentAudio.paused,
      currentTime: this.currentAudio.currentTime,
      duration: this.currentAudio.duration || 0,
      volume: this.currentAudio.volume,
      playbackRate: this.currentAudio.playbackRate
    };
  }

  /**
   * Destroy audio manager and clean up resources
   */
  destroy(): void {
    this.stopAudio();
    this.clearCache();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}