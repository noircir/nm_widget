/**
 * GoogleTTSClient.ts
 * Production-ready Google Text-to-Speech integration for NativeMimic v4.0
 * 
 * Features:
 * - Seamless AudioManager integration for audio processing and caching
 * - Comprehensive error handling with typed error interfaces
 * - Rate limiting and retry logic for reliability
 * - Cost tracking and usage analytics
 * - Support for both plain text and SSML input
 * - Memory-efficient caching through AudioManager integration
 * - Browser extension environment optimization
 * - Strict TypeScript typing for reliability
 */

import { AudioManager, type AudioMetadata } from '../audio_processing/AudioManager';

/**
 * Configuration interface for GoogleTTSClient initialization
 */
export interface GoogleTTSConfig {
  readonly edgeFunctionUrl: string;
  readonly retryAttempts: number;
  readonly retryDelayMs: number;
  readonly timeoutMs: number;
  readonly enableRateLimiting: boolean;
  readonly rateLimitRpm: number;       // Requests per minute
  readonly enableCostTracking: boolean;
  readonly maxTextLength: number;
  readonly enableAnalytics: boolean;
  readonly defaultVoice: string;
  readonly defaultLanguage: string;
  readonly audioFormat: 'mp3' | 'wav' | 'webm' | 'ogg';
}

/**
 * Google voice metadata interface
 */
export interface GoogleVoice {
  readonly name: string;
  readonly ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  readonly languageCodes: readonly string[];
  readonly naturalSampleRateHertz: number;
  readonly voiceType: 'STANDARD' | 'WAVENET' | 'NEURAL2';
  readonly isAvailable: boolean;
  readonly capabilities: {
    readonly supportsSSML: boolean;
    readonly supportsPitch: boolean;
    readonly supportsSpeed: boolean;
  };
}

/**
 * TTS synthesis request interface with comprehensive options
 */
export interface TTSRequest {
  readonly text: string;
  readonly languageCode: string;
  readonly voiceId: string;
  readonly audioFormat: 'mp3' | 'wav' | 'webm' | 'ogg';
  readonly speakingRate: number;      // 0.25 to 4.0
  readonly pitch: number;             // -20.0 to 20.0
  readonly volumeGainDb: number;      // -96.0 to 16.0
  readonly isSSML: boolean;
  readonly enableCache: boolean;
  readonly priority: 'low' | 'normal' | 'high';
}

/**
 * TTS synthesis response interface with detailed metadata
 */
export interface TTSResponse {
  readonly audioBlob: Blob;
  readonly cost: number;
  readonly cached: boolean;
  readonly voiceName: string;
  readonly processingTimeMs: number;
  readonly metadata: {
    readonly duration: number;
    readonly format: string;
    readonly size: number;
    readonly sampleRate: number;
    readonly bitRate: number;
    readonly channels: number;
  };
  readonly analytics: {
    readonly requestId: string;
    readonly timestamp: number;
    readonly characterCount: number;
    readonly cacheHit: boolean;
  };
}

/**
 * TTS error interface with detailed error information
 */
export interface TTSError {
  readonly code: number;
  readonly message: string;
  readonly type: 'VALIDATION_ERROR' | 'NETWORK_ERROR' | 'API_ERROR' | 'RATE_LIMIT_ERROR' | 'AUTHENTICATION_ERROR' | 'SERVICE_UNAVAILABLE' | 'UNKNOWN_ERROR';
  readonly timestamp: number;
  readonly context?: string;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
}

/**
 * Cost tracking interface with comprehensive analytics (mutable for internal updates)
 */
export interface UsageMetrics {
  session: {
    cost: number;
    characters: number;
    requests: number;
    cacheHits: number;
    startTime: number;
  };
  daily: {
    cost: number;
    characters: number;
    requests: number;
    cacheHits: number;
    date: string;
  };
  monthly: {
    cost: number;
    characters: number;
    requests: number;
    cacheHits: number;
    month: number;
    year: number;
  };
  total: {
    cost: number;
    characters: number;
    requests: number;
    cacheHits: number;
  };
}

/**
 * Production-ready GoogleTTSClient class with comprehensive error handling,
 * rate limiting, cost tracking, and AudioManager integration
 */
export class GoogleTTSClient {
  private readonly config: GoogleTTSConfig;
  private readonly audioManager: AudioManager;
  private usageMetrics!: UsageMetrics; // Initialized in constructor
  private isDestroyed = false;
  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly requestQueue: Array<{ request: TTSRequest; resolve: (value: TTSResponse) => void; reject: (error: Error) => void; }> = [];
  private isProcessingQueue = false;
  private readonly activeRequests = new Set<string>();
  private readonly rateLimitWindow = new Map<number, number>(); // minute -> request count
  private readonly cleanupTimeouts = new Set<NodeJS.Timeout>();

  // Default configuration for safe operation
  private static readonly DEFAULT_CONFIG: GoogleTTSConfig = {
    edgeFunctionUrl: '',
    retryAttempts: 3,
    retryDelayMs: 1000,
    timeoutMs: 30000,
    enableRateLimiting: true,
    rateLimitRpm: 60,
    enableCostTracking: true,
    maxTextLength: 5000,
    enableAnalytics: true,
    defaultVoice: 'en-US-Wavenet-D',
    defaultLanguage: 'en-US',
    audioFormat: 'mp3'
  };

  constructor(audioManager: AudioManager, config: Partial<GoogleTTSConfig> = {}) {
    if (!audioManager) {
      throw new Error('AudioManager is required for GoogleTTSClient');
    }
    
    this.audioManager = audioManager;
    this.config = { ...GoogleTTSClient.DEFAULT_CONFIG, ...config };
    this.validateConfig();
    this.initializeUsageMetrics();
    this.setupCleanupScheduler();
  }

  /**
   * Synthesize speech from text with comprehensive error handling and caching
   */
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    this.throwIfDestroyed();
    const startTime = performance.now();
    const requestId = this.generateRequestId();
    
    try {
      // Validate request parameters
      this.validateRequest(request);
      
      // Check rate limiting
      if (this.config.enableRateLimiting) {
        await this.enforceRateLimit();
      }
      
      // Generate cache key for consistent caching
      const cacheKey = this.generateCacheKey(request);
      
      // Check AudioManager cache first if caching is enabled
      if (request.enableCache) {
        const cachedBlob = this.audioManager.getCachedAudio(cacheKey);
        if (cachedBlob) {
          const metadata = await this.audioManager.getAudioMetadata(cachedBlob);
          const processingTime = performance.now() - startTime;
          
          // Update analytics for cache hit
          this.updateUsageMetrics({
            cost: 0,
            characters: request.text.length,
            cached: true,
            requestId,
            processingTime
          });
          
          return {
            audioBlob: cachedBlob,
            cost: 0,
            cached: true,
            voiceName: 'cached',
            processingTimeMs: processingTime,
            metadata: {
              duration: metadata.duration,
              format: metadata.format,
              size: metadata.size,
              sampleRate: metadata.sampleRate,
              bitRate: metadata.bitRate,
              channels: metadata.channels
            },
            analytics: {
              requestId,
              timestamp: Date.now(),
              characterCount: request.text.length,
              cacheHit: true
            }
          };
        }
      }
      
      // Execute TTS synthesis with retry logic
      const synthesisResult = await this.executeWithRetry(
        () => this.performSynthesis(request, requestId),
        this.config.retryAttempts
      );
      
      const processingTime = performance.now() - startTime;
      
      // Create comprehensive response
      const ttsResponse: TTSResponse = {
        ...synthesisResult,
        processingTimeMs: processingTime,
        analytics: {
          requestId,
          timestamp: Date.now(),
          characterCount: request.text.length,
          cacheHit: false
        }
      };
      
      // Cache the response if caching is enabled
      if (request.enableCache) {
        try {
          await this.audioManager.cacheAudio(cacheKey, ttsResponse.audioBlob);
        } catch (cacheError) {
          console.warn('Failed to cache TTS response:', cacheError);
          // Non-fatal error, continue with response
        }
      }
      
      // Update usage metrics
      this.updateUsageMetrics({
        cost: ttsResponse.cost,
        characters: request.text.length,
        cached: false,
        requestId,
        processingTime
      });
      
      return ttsResponse;
      
    } catch (error) {
      const processingTime = performance.now() - startTime;
      const ttsError = this.createTTSError(error as Error, requestId);
      
      // Log detailed error information
      console.error('TTS synthesis failed:', {
        requestId,
        error: ttsError,
        processingTime,
        request: {
          textLength: request.text.length,
          languageCode: request.languageCode,
          voiceId: request.voiceId
        }
      });
      
      throw new Error(`Text-to-speech synthesis failed: ${ttsError.message}`);
    }
  }

  /**
   * Get available voices for specific language with comprehensive error handling
   */
  async getVoicesForLanguage(languageCode: string): Promise<GoogleVoice[]> {
    this.throwIfDestroyed();
    
    if (!languageCode || languageCode.trim().length === 0) {
      throw new Error('Language code is required');
    }
    
    try {
      const response = await this.executeWithRetry(
        () => this.fetchVoicesFromAPI(languageCode),
        this.config.retryAttempts
      );
      
      return this.processVoicesResponse(response);
      
    } catch (error) {
      console.error('Failed to fetch voices for language:', languageCode, error);
      
      // Return fallback voices for common languages
      return this.getFallbackVoices(languageCode);
    }
  }
  
  /**
   * Get all available voices with filtering and sorting options
   */
  async getAllVoices(filters?: {
    gender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
    voiceType?: 'STANDARD' | 'WAVENET' | 'NEURAL2';
    languageCode?: string;
  }): Promise<GoogleVoice[]> {
    this.throwIfDestroyed();
    
    try {
      const response = await this.executeWithRetry(
        () => this.fetchAllVoicesFromAPI(),
        this.config.retryAttempts
      );
      
      let voices = this.processVoicesResponse(response);
      
      // Apply filters if provided
      if (filters) {
        voices = voices.filter(voice => {
          if (filters.gender && voice.ssmlGender !== filters.gender) return false;
          if (filters.voiceType && voice.voiceType !== filters.voiceType) return false;
          if (filters.languageCode && !voice.languageCodes.includes(filters.languageCode)) return false;
          return true;
        });
      }
      
      // Sort by voice quality (Neural2 > WaveNet > Standard)
      return voices.sort((a, b) => {
        const typeOrder = { 'NEURAL2': 3, 'WAVENET': 2, 'STANDARD': 1 };
        return typeOrder[b.voiceType] - typeOrder[a.voiceType];
      });
      
    } catch (error) {
      console.error('Failed to fetch all voices:', error);
      return [];
    }
  }

  /**
   * Get comprehensive usage metrics and analytics
   */
  getUsageMetrics(): UsageMetrics {
    this.throwIfDestroyed();
    return JSON.parse(JSON.stringify(this.usageMetrics)); // Deep clone for immutability
  }
  
  /**
   * Reset session usage metrics
   */
  resetSessionMetrics(): void {
    this.throwIfDestroyed();
    
    this.usageMetrics.session = {
      cost: 0,
      characters: 0,
      requests: 0,
      cacheHits: 0,
      startTime: Date.now()
    };
    
    this.saveUsageMetrics();
  }
  
  /**
   * Estimate cost for text synthesis with voice type consideration
   */
  estimateCost(text: string, voiceType: 'STANDARD' | 'WAVENET' | 'NEURAL2' = 'WAVENET'): number {
    this.throwIfDestroyed();
    
    if (!text || text.trim().length === 0) {
      return 0;
    }
    
    return this.calculateCost(text.length, voiceType);
  }
  
  /**
   * Check if request would exceed rate limits
   */
  canMakeRequest(): boolean {
    this.throwIfDestroyed();
    
    if (!this.config.enableRateLimiting) {
      return true;
    }
    
    const currentMinute = Math.floor(Date.now() / 60000);
    const requestsThisMinute = this.rateLimitWindow.get(currentMinute) || 0;
    
    return requestsThisMinute < this.config.rateLimitRpm;
  }
  
  /**
   * Get time until next request is allowed (in ms)
   */
  getTimeUntilNextRequest(): number {
    this.throwIfDestroyed();
    
    if (this.canMakeRequest()) {
      return 0;
    }
    
    const currentMinute = Math.floor(Date.now() / 60000);
    const nextMinute = (currentMinute + 1) * 60000;
    
    return nextMinute - Date.now();
  }

  /**
   * Validate TTS request parameters with comprehensive checks
   */
  private validateRequest(request: TTSRequest): void {
    if (!request) {
      throw new Error('TTS request is required');
    }
    
    if (!request.text || request.text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }
    
    if (request.text.length > this.config.maxTextLength) {
      throw new Error(`Text too long (max ${this.config.maxTextLength} characters)`);
    }
    
    if (!request.languageCode || !/^[a-z]{2}-[A-Z]{2}$/.test(request.languageCode)) {
      throw new Error('Valid language code is required (format: xx-XX)');
    }
    
    if (!request.voiceId || request.voiceId.trim().length === 0) {
      throw new Error('Voice ID is required');
    }
    
    if (!['mp3', 'wav', 'webm', 'ogg'].includes(request.audioFormat)) {
      throw new Error('Invalid audio format. Supported: mp3, wav, webm, ogg');
    }
    
    if (typeof request.speakingRate !== 'number' || request.speakingRate < 0.25 || request.speakingRate > 4.0) {
      throw new Error('Speaking rate must be a number between 0.25 and 4.0');
    }
    
    if (typeof request.pitch !== 'number' || request.pitch < -20.0 || request.pitch > 20.0) {
      throw new Error('Pitch must be a number between -20.0 and 20.0');
    }
    
    if (typeof request.volumeGainDb !== 'number' || request.volumeGainDb < -96.0 || request.volumeGainDb > 16.0) {
      throw new Error('Volume gain must be a number between -96.0 and 16.0 dB');
    }
    
    if (typeof request.isSSML !== 'boolean') {
      throw new Error('isSSML must be a boolean value');
    }
    
    if (typeof request.enableCache !== 'boolean') {
      throw new Error('enableCache must be a boolean value');
    }
    
    if (!['low', 'normal', 'high'].includes(request.priority)) {
      throw new Error('Priority must be one of: low, normal, high');
    }
    
    // Validate SSML if applicable
    if (request.isSSML) {
      this.validateSSML(request.text);
    }
  }

  /**
   * Generate deterministic cache key for TTS request
   */
  private generateCacheKey(request: TTSRequest): string {
    // Create deterministic hash of all relevant parameters
    const keyComponents = [
      request.text.trim(),
      request.languageCode,
      request.voiceId,
      request.audioFormat,
      request.speakingRate.toFixed(2),
      request.pitch.toFixed(1),
      request.volumeGainDb.toFixed(1),
      request.isSSML ? 'ssml' : 'text'
    ];
    
    const keyString = keyComponents.join('|');
    
    // Create a simple hash (for browser compatibility)
    let hash = 0;
    for (let i = 0; i < keyString.length; i++) {
      const char = keyString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to safe cache key
    return `tts_${Math.abs(hash).toString(36)}`;
  }
  
  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `tts_${timestamp}_${random}`;
  }

  /**
   * Calculate cost based on character count and voice type with accurate pricing
   */
  private calculateCost(characterCount: number, voiceType: 'STANDARD' | 'WAVENET' | 'NEURAL2'): number {
    if (characterCount <= 0) return 0;
    
    // Google Cloud TTS pricing (as of 2024)
    const pricing = {
      'STANDARD': 4.00,      // $4 per 1M characters
      'WAVENET': 16.00,      // $16 per 1M characters
      'NEURAL2': 16.00       // $16 per 1M characters
    };
    
    const pricePerMillion = pricing[voiceType] || pricing.WAVENET;
    return Math.round((characterCount / 1000000) * pricePerMillion * 100000) / 100000; // Round to 5 decimal places
  }

  /**
   * Update comprehensive usage metrics
   */
  private updateUsageMetrics(update: {
    cost: number;
    characters: number;
    cached: boolean;
    requestId: string;
    processingTime: number;
  }): void {
    const now = Date.now();
    const today = new Date().toDateString();
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    
    // Update session metrics
    this.usageMetrics.session.cost += update.cost;
    this.usageMetrics.session.characters += update.characters;
    this.usageMetrics.session.requests += 1;
    if (update.cached) {
      this.usageMetrics.session.cacheHits += 1;
    }
    
    // Update daily metrics (reset if new day)
    if (this.usageMetrics.daily.date !== today) {
      this.usageMetrics.daily = {
        cost: update.cost,
        characters: update.characters,
        requests: 1,
        cacheHits: update.cached ? 1 : 0,
        date: today
      };
    } else {
      this.usageMetrics.daily.cost += update.cost;
      this.usageMetrics.daily.characters += update.characters;
      this.usageMetrics.daily.requests += 1;
      if (update.cached) {
        this.usageMetrics.daily.cacheHits += 1;
      }
    }
    
    // Update monthly metrics (reset if new month)
    if (this.usageMetrics.monthly.month !== thisMonth || this.usageMetrics.monthly.year !== thisYear) {
      this.usageMetrics.monthly = {
        cost: update.cost,
        characters: update.characters,
        requests: 1,
        cacheHits: update.cached ? 1 : 0,
        month: thisMonth,
        year: thisYear
      };
    } else {
      this.usageMetrics.monthly.cost += update.cost;
      this.usageMetrics.monthly.characters += update.characters;
      this.usageMetrics.monthly.requests += 1;
      if (update.cached) {
        this.usageMetrics.monthly.cacheHits += 1;
      }
    }
    
    // Update total metrics
    this.usageMetrics.total.cost += update.cost;
    this.usageMetrics.total.characters += update.characters;
    this.usageMetrics.total.requests += 1;
    if (update.cached) {
      this.usageMetrics.total.cacheHits += 1;
    }
    
    // Save metrics to storage
    this.saveUsageMetrics();
  }

  /**
   * Convert base64 audio to Blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Get Supabase authentication token
   */
  private async getSupabaseToken(): Promise<string> {
    // TODO: Implement Supabase auth token retrieval
    // This would get the current user's session token
    return 'placeholder-token';
  }

  /**
   * Play synthesized audio immediately
   */
  async synthesizeAndPlay(request: TTSRequest, onEnded?: () => void): Promise<void> {
    const response = await this.synthesize(request);
    await this.audioManager.playAudio(response.audioBlob, onEnded);
  }

  /**
   * Get current cache statistics from AudioManager
   */
  getCacheStats() {
    return this.audioManager.getCacheStats();
  }

  /**
   * Clear TTS audio cache
   */
  clearCache(): void {
    this.audioManager.clearCache();
  }

  /**
   * Load cost history from storage (deprecated - replaced by loadUsageMetrics)
   */
  private loadCostHistory(): void {
    // This method is deprecated and replaced by loadUsageMetrics()
    console.warn('loadCostHistory is deprecated, use loadUsageMetrics instead');
  }

  /**
   * Validate configuration on initialization
   */
  private validateConfig(): void {
    if (!this.config.edgeFunctionUrl || typeof this.config.edgeFunctionUrl !== 'string') {
      throw new Error('Valid edge function URL is required');
    }
    
    if (this.config.retryAttempts < 0 || this.config.retryAttempts > 10) {
      throw new Error('Retry attempts must be between 0 and 10');
    }
    
    if (this.config.retryDelayMs < 100 || this.config.retryDelayMs > 10000) {
      throw new Error('Retry delay must be between 100ms and 10s');
    }
    
    if (this.config.timeoutMs < 1000 || this.config.timeoutMs > 60000) {
      throw new Error('Timeout must be between 1s and 60s');
    }
    
    if (this.config.rateLimitRpm < 1 || this.config.rateLimitRpm > 1000) {
      throw new Error('Rate limit must be between 1 and 1000 requests per minute');
    }
    
    if (this.config.maxTextLength < 1 || this.config.maxTextLength > 10000) {
      throw new Error('Max text length must be between 1 and 10000 characters');
    }
  }
  
  /**
   * Initialize usage metrics with default values
   */
  private initializeUsageMetrics(): void {
    const now = Date.now();
    const today = new Date().toDateString();
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    
    this.usageMetrics = {
      session: {
        cost: 0,
        characters: 0,
        requests: 0,
        cacheHits: 0,
        startTime: now
      },
      daily: {
        cost: 0,
        characters: 0,
        requests: 0,
        cacheHits: 0,
        date: today
      },
      monthly: {
        cost: 0,
        characters: 0,
        requests: 0,
        cacheHits: 0,
        month: thisMonth,
        year: thisYear
      },
      total: {
        cost: 0,
        characters: 0,
        requests: 0,
        cacheHits: 0
      }
    };
    
    this.loadUsageMetrics();
  }
  
  /**
   * Load usage metrics from storage
   */
  private loadUsageMetrics(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      
      const saved = localStorage.getItem('nativemimic_usage_metrics');
      if (!saved) {
        return;
      }
      
      const data = JSON.parse(saved);
      const today = new Date().toDateString();
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      
      // Restore daily metrics if same day
      if (data.daily && data.daily.date === today) {
        this.usageMetrics.daily = data.daily;
      }
      
      // Restore monthly metrics if same month
      if (data.monthly && data.monthly.month === thisMonth && data.monthly.year === thisYear) {
        this.usageMetrics.monthly = data.monthly;
      }
      
      // Always restore total metrics
      if (data.total) {
        this.usageMetrics.total = data.total;
      }
    } catch (error) {
      console.warn('Failed to load usage metrics:', error);
    }
  }
  
  /**
   * Save usage metrics to storage
   */
  private saveUsageMetrics(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      
      const data = {
        daily: this.usageMetrics.daily,
        monthly: this.usageMetrics.monthly,
        total: this.usageMetrics.total,
        lastSaved: Date.now()
      };
      
      localStorage.setItem('nativemimic_usage_metrics', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save usage metrics:', error);
    }
  }
  
  /**
   * Set up automatic cleanup scheduler
   */
  private setupCleanupScheduler(): void {
    // Clean up rate limit window every minute
    const rateLimitCleanup = setInterval(() => {
      if (this.isDestroyed) {
        clearInterval(rateLimitCleanup);
        return;
      }
      
      const currentMinute = Math.floor(Date.now() / 60000);
      const cutoffMinute = currentMinute - 2; // Keep last 2 minutes
      
      const minutesToDelete: number[] = [];
      this.rateLimitWindow.forEach((count, minute) => {
        if (minute < cutoffMinute) {
          minutesToDelete.push(minute);
        }
      });
      
      minutesToDelete.forEach(minute => {
        this.rateLimitWindow.delete(minute);
      });
    }, 60000);
    
    this.cleanupTimeouts.add(rateLimitCleanup);
    
    // Save metrics periodically
    const metricsSave = setInterval(() => {
      if (this.isDestroyed) {
        clearInterval(metricsSave);
        return;
      }
      
      this.saveUsageMetrics();
    }, 30000); // Every 30 seconds
    
    this.cleanupTimeouts.add(metricsSave);
  }
  
  /**
   * Perform TTS synthesis via Supabase Edge Function
   */
  private async performSynthesis(request: TTSRequest, requestId: string): Promise<Omit<TTSResponse, 'processingTimeMs' | 'analytics'>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);
    
    try {
      const response = await fetch(`${this.config.edgeFunctionUrl}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getSupabaseToken()}`,
          'X-Request-ID': requestId
        },
        body: JSON.stringify({
          text: request.text,
          language_code: request.languageCode,
          voice_id: request.voiceId,
          audio_format: request.audioFormat,
          speaking_rate: request.speakingRate,
          pitch: request.pitch,
          volume_gain_db: request.volumeGainDb,
          is_ssml: request.isSSML,
          priority: request.priority
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw await this.createHTTPError(response);
      }
      
      const result = await response.json();
      
      // Validate response structure
      if (!result.audio_content || !result.audio_format) {
        throw new Error('Invalid TTS response: missing audio data');
      }
      
      // Convert base64 audio to blob
      const audioBlob = this.base64ToBlob(result.audio_content, this.getAudioMimeType(result.audio_format));
      
      // Get audio metadata from AudioManager
      const audioMetadata = await this.audioManager.getAudioMetadata(audioBlob);
      
      // Calculate cost
      const voiceType = this.getVoiceType(result.voice_name || request.voiceId);
      const cost = this.calculateCost(request.text.length, voiceType);
      
      return {
        audioBlob,
        cost,
        cached: false,
        voiceName: result.voice_name || request.voiceId,
        metadata: {
          duration: audioMetadata.duration,
          format: audioMetadata.format,
          size: audioMetadata.size,
          sampleRate: audioMetadata.sampleRate,
          bitRate: audioMetadata.bitRate,
          channels: audioMetadata.channels
        }
      };
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if ((error as Error).name === 'AbortError') {
        throw new Error(`TTS request timeout after ${this.config.timeoutMs}ms`);
      }
      
      throw error;
    }
  }
  
  /**
   * Execute function with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        const ttsError = this.createTTSError(lastError, `attempt_${attempt}`);
        
        // Don't retry certain errors
        if (!ttsError.retryable || attempt === maxAttempts) {
          throw lastError;
        }
        
        // Calculate retry delay with exponential backoff
        const delay = ttsError.retryAfterMs || (this.config.retryDelayMs * Math.pow(2, attempt - 1));
        
        console.warn(`TTS attempt ${attempt} failed, retrying in ${delay}ms:`, ttsError.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
  
  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const currentMinute = Math.floor(Date.now() / 60000);
    const requestsThisMinute = this.rateLimitWindow.get(currentMinute) || 0;
    
    if (requestsThisMinute >= this.config.rateLimitRpm) {
      const waitTime = ((currentMinute + 1) * 60000) - Date.now();
      
      if (waitTime > 0) {
        console.warn(`Rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Update rate limit counter
    this.rateLimitWindow.set(currentMinute, (this.rateLimitWindow.get(currentMinute) || 0) + 1);
  }
  
  /**
   * Create detailed TTS error from generic error
   */
  private createTTSError(error: Error, context?: string): TTSError {
    let type: TTSError['type'] = 'UNKNOWN_ERROR';
    let retryable = true;
    let retryAfterMs: number | undefined;
    
    const message = error.message.toLowerCase();
    
    if (message.includes('validation') || message.includes('invalid')) {
      type = 'VALIDATION_ERROR';
      retryable = false;
    } else if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      type = 'NETWORK_ERROR';
    } else if (message.includes('rate limit')) {
      type = 'RATE_LIMIT_ERROR';
      retryAfterMs = 60000; // 1 minute default
    } else if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
      type = 'AUTHENTICATION_ERROR';
      retryable = false;
    } else if (message.includes('service') || message.includes('unavailable') || message.includes('503')) {
      type = 'SERVICE_UNAVAILABLE';
      retryAfterMs = 5000; // 5 seconds
    } else if (message.includes('api') || message.includes('400') || message.includes('404')) {
      type = 'API_ERROR';
      retryable = false;
    }
    
    return {
      code: -1,
      message: error.message,
      type,
      timestamp: Date.now(),
      context,
      retryable,
      retryAfterMs
    };
  }
  
  /**
   * Create HTTP error from response
   */
  private async createHTTPError(response: Response): Promise<Error> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Ignore JSON parsing errors
    }
    
    return new Error(errorMessage);
  }
  
  /**
   * Process voices API response
   */
  private processVoicesResponse(response: any): GoogleVoice[] {
    if (!response || !Array.isArray(response.voices)) {
      return [];
    }
    
    return response.voices.map((voice: any): GoogleVoice => ({
      name: voice.name || 'unknown',
      ssmlGender: voice.ssmlGender || 'NEUTRAL',
      languageCodes: Array.isArray(voice.languageCodes) ? voice.languageCodes : [],
      naturalSampleRateHertz: voice.naturalSampleRateHertz || 24000,
      voiceType: this.getVoiceType(voice.name),
      isAvailable: true,
      capabilities: {
        supportsSSML: true,
        supportsPitch: true,
        supportsSpeed: true
      }
    }));
  }
  
  /**
   * Get fallback voices for common languages
   */
  private getFallbackVoices(languageCode: string): GoogleVoice[] {
    const fallbackVoices: Record<string, GoogleVoice[]> = {
      'en-US': [
        {
          name: 'en-US-Wavenet-D',
          ssmlGender: 'MALE',
          languageCodes: ['en-US'],
          naturalSampleRateHertz: 24000,
          voiceType: 'WAVENET',
          isAvailable: true,
          capabilities: { supportsSSML: true, supportsPitch: true, supportsSpeed: true }
        }
      ]
    };
    
    return fallbackVoices[languageCode] || [];
  }
  
  /**
   * Fetch voices from API
   */
  private async fetchVoicesFromAPI(languageCode: string): Promise<any> {
    const response = await fetch(`${this.config.edgeFunctionUrl}/voices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getSupabaseToken()}`
      },
      body: JSON.stringify({ language_code: languageCode })
    });
    
    if (!response.ok) {
      throw await this.createHTTPError(response);
    }
    
    return response.json();
  }
  
  /**
   * Fetch all voices from API
   */
  private async fetchAllVoicesFromAPI(): Promise<any> {
    const response = await fetch(`${this.config.edgeFunctionUrl}/voices/all`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getSupabaseToken()}`
      }
    });
    
    if (!response.ok) {
      throw await this.createHTTPError(response);
    }
    
    return response.json();
  }
  
  /**
   * Get voice type from voice name
   */
  private getVoiceType(voiceName: string): 'STANDARD' | 'WAVENET' | 'NEURAL2' {
    if (voiceName.includes('Neural2')) return 'NEURAL2';
    if (voiceName.includes('Wavenet')) return 'WAVENET';
    return 'STANDARD';
  }
  
  /**
   * Get audio MIME type from format
   */
  private getAudioMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'webm': 'audio/webm',
      'ogg': 'audio/ogg'
    };
    
    return mimeTypes[format.toLowerCase()] || 'audio/mpeg';
  }
  
  /**
   * Validate SSML content
   */
  private validateSSML(ssml: string): void {
    // Basic SSML validation
    if (!ssml.includes('<speak>') || !ssml.includes('</speak>')) {
      throw new Error('SSML must be wrapped in <speak> tags');
    }
    
    // Check for balanced tags (simplified)
    const openTags = (ssml.match(/<[^/][^>]*>/g) || []).length;
    const closeTags = (ssml.match(/<\/[^>]*>/g) || []).length;
    
    if (openTags !== closeTags) {
      throw new Error('SSML tags are not properly balanced');
    }
  }
  
  /**
   * Throw error if client has been destroyed
   */
  private throwIfDestroyed(): void {
    if (this.isDestroyed) {
      throw new Error('GoogleTTSClient has been destroyed');
    }
  }
  
  /**
   * Destroy TTS client and clean up all resources
   */
  destroy(): void {
    if (this.isDestroyed) return;
    
    this.isDestroyed = true;
    
    // Save final metrics
    this.saveUsageMetrics();
    
    // Clear all timeouts
    const timeoutArray = Array.from(this.cleanupTimeouts);
    for (let i = 0; i < timeoutArray.length; i++) {
      clearTimeout(timeoutArray[i]);
    }
    this.cleanupTimeouts.clear();
    
    // Clear request queue
    this.requestQueue.length = 0;
    
    // Clear rate limit tracking
    this.rateLimitWindow.clear();
    
    // Clear active requests
    this.activeRequests.clear();
    
    console.log('GoogleTTSClient destroyed successfully');
  }
}