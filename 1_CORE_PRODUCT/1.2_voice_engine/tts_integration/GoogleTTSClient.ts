/**
 * GoogleTTSClient.ts
 * Google Text-to-Speech integration for NativeMimic v4.0
 * 
 * Secure TTS client that communicates via Supabase Edge Functions
 * Hides API keys and implements cost monitoring
 */

export interface TTSRequest {
  text: string;
  languageCode: string;
  voiceId: string;
  audioFormat: 'mp3' | 'wav' | 'linear16';
  speakingRate: number;      // 0.25 to 4.0
  pitch: number;             // -20.0 to 20.0
  volumeGainDb: number;      // -96.0 to 16.0
}

export interface TTSResponse {
  audioBlob: Blob;
  cost: number;              // Cost in USD
  cached: boolean;           // Whether response was cached
  voiceName: string;         // Actual voice name used
  metadata: {
    duration: number;
    format: string;
    size: number;
  };
}

export interface CostTracking {
  session: number;           // Current session cost
  daily: number;             // Today's total cost
  monthly: number;           // This month's cost
  totalCharacters: number;   // Characters processed
}

export class GoogleTTSClient {
  private edgeFunctionUrl: string;
  private costTracker: CostTracking = {
    session: 0,
    daily: 0,
    monthly: 0,
    totalCharacters: 0
  };

  constructor(edgeFunctionUrl: string) {
    this.edgeFunctionUrl = edgeFunctionUrl;
    this.loadCostHistory();
  }

  /**
   * Synthesize speech from text using Google TTS
   */
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    try {
      // Validate request
      this.validateRequest(request);

      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cachedAudio = this.getCachedAudio(cacheKey);
      
      if (cachedAudio) {
        return {
          audioBlob: cachedAudio.blob,
          cost: 0, // Cached responses are free
          cached: true,
          voiceName: cachedAudio.voiceName,
          metadata: cachedAudio.metadata
        };
      }

      // Make API request via Supabase Edge Function
      const response = await fetch(`${this.edgeFunctionUrl}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getSupabaseToken()}`
        },
        body: JSON.stringify({
          text: request.text,
          language_code: request.languageCode,
          voice_id: request.voiceId,
          audio_format: request.audioFormat,
          speaking_rate: request.speakingRate,
          pitch: request.pitch,
          volume_gain_db: request.volumeGainDb
        })
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Convert base64 audio to blob
      const audioBlob = this.base64ToBlob(result.audio_content, result.audio_format);
      
      // Calculate cost (Google TTS pricing: $4 per 1M characters for WaveNet voices)
      const cost = this.calculateCost(request.text.length, result.voice_type);
      
      // Update cost tracking
      this.updateCostTracking(cost, request.text.length);

      // Cache the response
      const ttsResponse: TTSResponse = {
        audioBlob,
        cost,
        cached: false,
        voiceName: result.voice_name,
        metadata: {
          duration: result.duration || 0,
          format: result.audio_format,
          size: audioBlob.size
        }
      };

      this.cacheAudio(cacheKey, {
        blob: audioBlob,
        voiceName: result.voice_name,
        metadata: ttsResponse.metadata
      });

      return ttsResponse;

    } catch (error) {
      console.error('TTS synthesis failed:', error);
      throw new Error(`Text-to-speech failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get available voices for language
   */
  async getVoicesForLanguage(languageCode: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.edgeFunctionUrl}/voices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getSupabaseToken()}`
        },
        body: JSON.stringify({ language_code: languageCode })
      });

      if (!response.ok) {
        throw new Error(`Voice list API error: ${response.status}`);
      }

      const result = await response.json();
      return result.voices || [];

    } catch (error) {
      console.error('Failed to fetch voices:', error);
      return [];
    }
  }

  /**
   * Get current cost tracking information
   */
  getCostTracking(): CostTracking {
    return { ...this.costTracker };
  }

  /**
   * Reset session cost tracking
   */
  resetSessionCosts(): void {
    this.costTracker.session = 0;
    this.saveCostHistory();
  }

  /**
   * Get estimated cost for text
   */
  estimateCost(text: string, voiceType: 'standard' | 'wavenet' | 'neural2' = 'wavenet'): number {
    return this.calculateCost(text.length, voiceType);
  }

  /**
   * Validate TTS request parameters
   */
  private validateRequest(request: TTSRequest): void {
    if (!request.text || request.text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    if (request.text.length > 5000) {
      throw new Error('Text too long (max 5000 characters)');
    }

    if (request.speakingRate < 0.25 || request.speakingRate > 4.0) {
      throw new Error('Speaking rate must be between 0.25 and 4.0');
    }

    if (request.pitch < -20.0 || request.pitch > 20.0) {
      throw new Error('Pitch must be between -20.0 and 20.0');
    }

    if (request.volumeGainDb < -96.0 || request.volumeGainDb > 16.0) {
      throw new Error('Volume gain must be between -96.0 and 16.0 dB');
    }
  }

  /**
   * Generate cache key for TTS request
   */
  private generateCacheKey(request: TTSRequest): string {
    const key = `${request.text}_${request.languageCode}_${request.voiceId}_${request.speakingRate}_${request.pitch}`;
    return btoa(key).replace(/[+/=]/g, ''); // Base64 encode and remove special chars
  }

  /**
   * Calculate cost based on character count and voice type
   */
  private calculateCost(characterCount: number, voiceType: string): number {
    // Google TTS pricing (as of 2024)
    const pricing = {
      'standard': 4.00,      // $4 per 1M characters
      'wavenet': 16.00,      // $16 per 1M characters  
      'neural2': 16.00       // $16 per 1M characters
    };

    const pricePerMillion = pricing[voiceType as keyof typeof pricing] || pricing.wavenet;
    return (characterCount / 1000000) * pricePerMillion;
  }

  /**
   * Update cost tracking
   */
  private updateCostTracking(cost: number, characterCount: number): void {
    this.costTracker.session += cost;
    this.costTracker.daily += cost;
    this.costTracker.monthly += cost;
    this.costTracker.totalCharacters += characterCount;
    
    this.saveCostHistory();
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
   * Cache audio with metadata
   */
  private cacheAudio(key: string, data: any): void {
    try {
      // Store in localStorage with expiration
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      
      localStorage.setItem(`tts_cache_${key}`, JSON.stringify(cacheEntry));
    } catch (error) {
      console.warn('Failed to cache audio:', error);
    }
  }

  /**
   * Retrieve cached audio
   */
  private getCachedAudio(key: string): any | null {
    try {
      const cached = localStorage.getItem(`tts_cache_${key}`);
      if (!cached) return null;

      const cacheEntry = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() > cacheEntry.expires) {
        localStorage.removeItem(`tts_cache_${key}`);
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      console.warn('Failed to retrieve cached audio:', error);
      return null;
    }
  }

  /**
   * Load cost history from storage
   */
  private loadCostHistory(): void {
    try {
      const saved = localStorage.getItem('nativemimic_costs');
      if (saved) {
        const data = JSON.parse(saved);
        
        // Reset daily costs if it's a new day
        const today = new Date().toDateString();
        if (data.lastDate !== today) {
          data.daily = 0;
          data.lastDate = today;
        }
        
        // Reset monthly costs if it's a new month
        const thisMonth = new Date().getMonth();
        if (data.lastMonth !== thisMonth) {
          data.monthly = 0;
          data.lastMonth = thisMonth;
        }
        
        this.costTracker = {
          session: 0, // Always start fresh
          daily: data.daily || 0,
          monthly: data.monthly || 0,
          totalCharacters: data.totalCharacters || 0
        };
      }
    } catch (error) {
      console.warn('Failed to load cost history:', error);
    }
  }

  /**
   * Save cost history to storage
   */
  private saveCostHistory(): void {
    try {
      const data = {
        ...this.costTracker,
        lastDate: new Date().toDateString(),
        lastMonth: new Date().getMonth()
      };
      
      localStorage.setItem('nativemimic_costs', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cost history:', error);
    }
  }
}