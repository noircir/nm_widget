// Google Cloud Text-to-Speech Client for NativeMimic (Backend-Managed)
class GoogleTTSClient {
  constructor() {
    this.isInitialized = false;
    this.supportedVoices = [];
    this.cachedVoices = new Map(); // Cache voice lists by language
    this.backendAvailable = false; // Track if backend is actually working
    this.baseUrl = 'http://localhost:3000'; // Will be updated in initialize()
  }

  // Get request headers for API calls (includes Supabase auth if configured)
  getRequestHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add Supabase authentication if available
    if (this.supabaseAnonKey) {
      headers['Authorization'] = `Bearer ${this.supabaseAnonKey}`;
      headers['apikey'] = this.supabaseAnonKey;
    }
    
    return headers;
  }

  async initialize() {
    // Read configuration at initialization time (not constructor)
    const config = window.NATIVEMIMIC_CONFIG;
    this.baseUrl = config?.GOOGLE_TTS_SERVER_URL || 'http://localhost:3000';
    this.developmentMode = config?.DEVELOPMENT_MODE || false;
    this.googleTTSEnabled = config?.ENABLE_GOOGLE_TTS || false;
    this.supabaseUrl = config?.SUPABASE_URL;
    this.supabaseAnonKey = config?.SUPABASE_ANON_KEY;
    
    console.log('GoogleTTS: Configuration check:', {
      developmentMode: this.developmentMode,
      googleTTSEnabled: this.googleTTSEnabled,
      hasSupabaseConfig: !!(this.supabaseUrl && this.supabaseAnonKey),
      configExists: !!config
    });
    
    // Check if Google TTS is enabled (either dev mode OR Supabase Edge Function)
    if (!this.googleTTSEnabled) {
      console.log('GoogleTTS: Google TTS disabled in configuration');
      return this.initializeOfflineMode();
    }
    
    // Google TTS Backend Connection (localhost or Supabase Edge Function)
    const mode = this.developmentMode ? 'localhost' : 'Supabase Edge Function';
    console.log(`GoogleTTS: Connecting to ${mode} - ${this.baseUrl}`);
    try {
      // Test backend connectivity with proper headers
      const headers = this.getRequestHeaders();
      const healthUrl = this.developmentMode ? `${this.baseUrl}/health` : `${this.baseUrl}/health`;
      const response = await fetch(healthUrl, { headers });
      
      if (!response.ok) {
        console.error(`GoogleTTS: Backend service unavailable (${response.status})`);
        return this.initializeOfflineMode();
      }

      // Load preset voices for immediate use
      const presetResponse = await fetch(`${this.baseUrl}/api/presets`, { headers });
      if (presetResponse.ok) {
        const data = await presetResponse.json();
        this.supportedVoices = Object.values(data.presets || {});
        console.log(`GoogleTTS: Loaded ${this.supportedVoices.length} preset voices`);
      }

      this.backendAvailable = true;
      this.isInitialized = true;
      console.log(`GoogleTTS: Initialized with backend service`);
      return true;
    } catch (error) {
      console.error('GoogleTTS: Backend initialization failed:', error);
      console.log('GoogleTTS: Falling back to offline mode (preset voices only)');
      return this.initializeOfflineMode();
    }
  }

  // Initialize with preset voices only (offline mode)
  initializeOfflineMode() {
    this.supportedVoices = []; // Don't show any voices if backend is unavailable
    this.backendAvailable = false;
    
    // In production mode, don't mark as initialized to prevent voices from showing
    const productionMode = !window.NATIVEMIMIC_CONFIG?.DEVELOPMENT_MODE;
    if (productionMode) {
      this.isInitialized = false; // Prevent voices from appearing in dropdown
      console.log('GoogleTTS: Production mode - not marking as initialized to hide voices');
    } else {
      this.isInitialized = true; // Mark as initialized but with no voices (development mode)
      console.log('GoogleTTS: Initialized in offline mode - no voices available without backend');
    }
    return true;
  }

  async getVoices(languageCode = null) {
    if (!this.isInitialized) {
      console.warn('GoogleTTS: Client not initialized');
      return [];
    }

    // If backend is not available, return empty array (don't show non-functional voices)
    if (!this.backendAvailable) {
      console.log('GoogleTTS: Backend unavailable - not showing Google voices');
      return [];
    }

    try {
      // Return cached voices if available
      const cacheKey = languageCode || 'all';
      if (this.cachedVoices.has(cacheKey)) {
        return this.cachedVoices.get(cacheKey);
      }

      // Fetch voices from backend (only if backend is available)
      const url = languageCode 
        ? `${this.baseUrl}/api/voices/${languageCode}`
        : `${this.baseUrl}/api/voices`;
      
      const response = await fetch(url, { headers: this.getRequestHeaders() });
      if (response.ok) {
        const data = await response.json();
        const voices = data.voices || [];
        // Cache the result
        this.cachedVoices.set(cacheKey, voices);
        return voices;
      } else {
        console.log('GoogleTTS: Backend request failed');
        return [];
      }
      
    } catch (error) {
      console.error('GoogleTTS: Error getting voices:', error);
      return [];
    }
  }

  formatVoiceName(voice) {
    // Extract meaningful name from Google's naming convention
    // e.g., "en-US-Standard-A" -> "Standard A (US English)"
    const nameParts = voice.name.split('-');
    if (nameParts.length >= 3) {
      const language = nameParts[0] + '-' + nameParts[1];
      const voiceType = nameParts[2];
      const voiceId = nameParts[3] || '';
      
      const languageNames = {
        'en-US': 'US English',
        'en-GB': 'British English',
        'en-AU': 'Australian English',
        'es-ES': 'Spanish (Spain)',
        'es-MX': 'Spanish (Mexico)',
        'fr-FR': 'French',
        'de-DE': 'German',
        'it-IT': 'Italian',
        'pt-BR': 'Portuguese (Brazil)',
        'ja-JP': 'Japanese',
        'ko-KR': 'Korean',
        'zh-CN': 'Chinese (Mandarin)',
        'ru-RU': 'Russian',
        'ar-XA': 'Arabic',
        'hi-IN': 'Hindi',
        'th-TH': 'Thai',
        'vi-VN': 'Vietnamese'
      };

      const languageName = languageNames[language] || language.toUpperCase();
      return `${voiceType} ${voiceId} (${languageName})`;
    }
    
    return voice.name;
  }

  getVoiceQuality(voiceName) {
    if (voiceName.includes('Neural2')) return 'Neural (Highest Quality)';
    if (voiceName.includes('Wavenet')) return 'WaveNet (High Quality)';
    if (voiceName.includes('Standard')) return 'Standard Quality';
    return 'AI Voice';
  }

  async synthesizeText(text, voiceId, options = {}) {
    if (!this.isInitialized) {
      throw new Error('GoogleTTS: Client not initialized');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/synthesize`, {
        method: 'POST',
        headers: this.getRequestHeaders(),
        body: JSON.stringify({
          text: text,
          voiceId: voiceId,
          options: {
            speakingRate: options.speakingRate || 1.0,
            pitch: options.pitch || 0,
            volumeGainDb: options.volumeGainDb || 0
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GoogleTTS Backend error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.audioContent) {
        throw new Error('No audio content received from GoogleTTS backend');
      }

      // Convert base64 audio to blob URL
      const audioBytes = atob(data.audioContent);
      const audioArray = new Uint8Array(audioBytes.length);
      for (let i = 0; i < audioBytes.length; i++) {
        audioArray[i] = audioBytes.charCodeAt(i);
      }
      
      const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Track object URL for cleanup (if NativeMimic instance available)
      if (typeof window !== 'undefined' && window.nativeMimicInstance?.memoryMonitor) {
        window.nativeMimicInstance.memoryMonitor.trackObjectUrl(audioUrl);
      }

      return {
        audioUrl: audioUrl,
        cost: data.cost || 0,
        characterCount: data.characterCount || text.length,
        voiceId: voiceId
      };

    } catch (error) {
      console.error('GoogleTTS: Synthesis failed:', error);
      throw error;
    }
  }

  getLanguageFromVoiceId(voiceId) {
    // Extract language code from voice ID
    const parts = voiceId.split('-');
    if (parts.length >= 2) {
      return parts[0] + '-' + parts[1];
    }
    return 'en-US'; // Default fallback
  }

  // Get preset voices for quick selection
  getPresetVoices() {
    return {
      'en-US-Neural2-A': { name: 'Emma (US English)', id: 'en-US-Neural2-A', language: 'en-US', gender: 'FEMALE' },
      'en-US-Neural2-D': { name: 'James (US English)', id: 'en-US-Neural2-D', language: 'en-US', gender: 'MALE' },
      'en-GB-Neural2-A': { name: 'Sophie (British English)', id: 'en-GB-Neural2-A', language: 'en-GB', gender: 'FEMALE' },
      'en-GB-Neural2-D': { name: 'Oliver (British English)', id: 'en-GB-Neural2-D', language: 'en-GB', gender: 'MALE' },
      'es-ES-Neural2-A': { name: 'Carmen (Spanish)', id: 'es-ES-Neural2-A', language: 'es-ES', gender: 'FEMALE' },
      'es-ES-Neural2-B': { name: 'Diego (Spanish)', id: 'es-ES-Neural2-B', language: 'es-ES', gender: 'MALE' },
      'fr-FR-Neural2-A': { name: 'Charlotte (French)', id: 'fr-FR-Neural2-A', language: 'fr-FR', gender: 'FEMALE' },
      'fr-FR-Neural2-B': { name: 'Antoine (French)', id: 'fr-FR-Neural2-B', language: 'fr-FR', gender: 'MALE' },
      'de-DE-Neural2-A': { name: 'Anna (German)', id: 'de-DE-Neural2-A', language: 'de-DE', gender: 'FEMALE' },
      'de-DE-Neural2-D': { name: 'Klaus (German)', id: 'de-DE-Neural2-D', language: 'de-DE', gender: 'MALE' },
      'it-IT-Neural2-A': { name: 'Isabella (Italian)', id: 'it-IT-Neural2-A', language: 'it-IT', gender: 'FEMALE' },
      'it-IT-Neural2-C': { name: 'Marco (Italian)', id: 'it-IT-Neural2-C', language: 'it-IT', gender: 'MALE' },
      'pt-BR-Neural2-A': { name: 'Ana (Portuguese)', id: 'pt-BR-Neural2-A', language: 'pt-BR', gender: 'FEMALE' },
      'pt-BR-Neural2-C': { name: 'Carlos (Portuguese)', id: 'pt-BR-Neural2-C', language: 'pt-BR', gender: 'MALE' },
      'ja-JP-Neural2-A': { name: 'Yuki (Japanese)', id: 'ja-JP-Neural2-A', language: 'ja-JP', gender: 'FEMALE' },
      'ja-JP-Neural2-C': { name: 'Hiroshi (Japanese)', id: 'ja-JP-Neural2-C', language: 'ja-JP', gender: 'MALE' },
      'ko-KR-Neural2-A': { name: 'Min-ji (Korean)', id: 'ko-KR-Neural2-A', language: 'ko-KR', gender: 'FEMALE' },
      'ko-KR-Neural2-C': { name: 'Jin-woo (Korean)', id: 'ko-KR-Neural2-C', language: 'ko-KR', gender: 'MALE' }
    };
  }
}

// Initialize Google TTS client globally
window.googleTTSClient = new GoogleTTSClient();

// Also expose to page scope for debugging
if (typeof window !== 'undefined') {
  window.debugGoogleTTS = {
    client: window.googleTTSClient,
    getPresets: () => window.googleTTSClient?.getPresetVoices(),
    getVoices: (lang) => window.googleTTSClient?.getVoices(lang),
    test: () => 'Google TTS is working!'
  };
}

console.log('GoogleTTS: Client loaded and ready for initialization');