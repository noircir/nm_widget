// Unified Analytics Client for NativeMimic
// Single source of truth for all analytics collection

class UnifiedAnalyticsClient {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.eventSequence = 0;
    this.textsProcessedInSession = 0;
    this.userAgent = this.parseUserAgent();
    this.extensionVersion = chrome.runtime.getManifest().version;
    
    // Performance tracking
    this.performanceMarks = new Map();
    
    console.log('UnifiedAnalyticsClient: Initialized with session', this.sessionId);
  }

  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  parseUserAgent() {
    const ua = navigator.userAgent;
    const browser = this.detectBrowser(ua);
    const os = this.detectOS(ua);
    
    return {
      browser_name: browser.name,
      browser_version: browser.version,
      os_name: os.name,
      os_version: os.version,
      user_agent: ua
    };
  }

  detectBrowser(ua) {
    if (ua.includes('Chrome')) return { name: 'Chrome', version: ua.match(/Chrome\/([0-9.]+)/)?.[1] };
    if (ua.includes('Firefox')) return { name: 'Firefox', version: ua.match(/Firefox\/([0-9.]+)/)?.[1] };
    if (ua.includes('Safari')) return { name: 'Safari', version: ua.match(/Safari\/([0-9.]+)/)?.[1] };
    if (ua.includes('Edge')) return { name: 'Edge', version: ua.match(/Edge\/([0-9.]+)/)?.[1] };
    return { name: 'Unknown', version: null };
  }

  detectOS(ua) {
    if (ua.includes('Windows')) return { name: 'Windows', version: ua.match(/Windows NT ([0-9.]+)/)?.[1] };
    if (ua.includes('Mac OS X')) return { name: 'macOS', version: ua.match(/Mac OS X ([0-9_]+)/)?.[1]?.replace(/_/g, '.') };
    if (ua.includes('Linux')) return { name: 'Linux', version: null };
    if (ua.includes('Android')) return { name: 'Android', version: ua.match(/Android ([0-9.]+)/)?.[1] };
    if (ua.includes('iOS')) return { name: 'iOS', version: ua.match(/OS ([0-9_]+)/)?.[1]?.replace(/_/g, '.') };
    return { name: 'Unknown', version: null };
  }

  getSessionDuration() {
    return Math.floor((Date.now() - this.sessionStartTime) / 1000);
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  markPerformanceStart(label) {
    this.performanceMarks.set(label, Date.now());
  }

  markPerformanceEnd(label) {
    const startTime = this.performanceMarks.get(label);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.performanceMarks.delete(label);
      return duration;
    }
    return null;
  }

  // ===== CORE ANALYTICS TRACKING METHOD =====
  async track(eventType, eventCategory, data = {}) {
    if (!this.supabase || !this.supabase.enabled) {
      console.log('UnifiedAnalytics: Skipping - analytics disabled');
      return { success: false, error: 'Analytics disabled' };
    }

    try {
      await this.supabase.authenticate();
      this.eventSequence++;

      const analyticsData = {
        // Core event info
        user_id: this.supabase.userId,
        session_id: this.sessionId,
        event_type: eventType,
        event_category: eventCategory,
        
        // Page context
        page_url: window.location.href,
        page_domain: this.extractDomain(window.location.href),
        page_title: document.title,
        
        // Content context (from data)
        text_content: data.textContent ? data.textContent.substring(0, 500) : null, // Truncate for privacy
        text_length: data.textLength || 0,
        word_count: data.wordCount || (data.textContent ? data.textContent.split(/\s+/).length : 0),
        language_detected: data.languageDetected || null,
        language_selected: data.languageSelected || null,
        
        // Voice/TTS context
        voice_id: data.voiceId || null,
        voice_type: data.voiceType || null,
        voice_name: data.voiceName || null,
        voice_gender: data.voiceGender || null,
        voice_accent: data.voiceAccent || null,
        speed_setting: data.speedSetting || null,
        
        // Business metrics
        cost_cents: data.costCents || 0,
        is_cached: data.isCached || false,
        cache_hit_rate: data.cacheHitRate || null,
        duration_ms: data.durationMs || null,
        
        // Session metrics
        session_duration_seconds: this.getSessionDuration(),
        events_in_session: this.eventSequence,
        texts_processed_in_session: this.textsProcessedInSession,
        
        // Performance metrics
        response_time_ms: data.responseTimeMs || null,
        network_latency_ms: data.networkLatencyMs || null,
        browser_performance_score: data.browserPerformanceScore || null,
        
        // Error context
        error_code: data.errorCode || null,
        error_message: data.errorMessage || null,
        error_stack: data.errorStack ? data.errorStack.substring(0, 1000) : null, // Truncate
        retry_count: data.retryCount || 0,
        
        // Feature context
        feature_name: data.featureName || null,
        feature_action: data.featureAction || null,
        feature_value: data.featureValue || null,
        feature_context: data.featureContext || null,
        
        // Environment
        browser_name: this.userAgent.browser_name,
        browser_version: this.userAgent.browser_version,
        os_name: this.userAgent.os_name,
        os_version: this.userAgent.os_version,
        extension_version: this.extensionVersion,
        screen_resolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        
        // Business intelligence
        user_segment: data.userSegment || null,
        user_journey_stage: data.userJourneyStage || null,
        conversion_goal: data.conversionGoal || null,
        referral_source: data.referralSource || null,
        
        // Flexible data
        event_data: data.eventData || {},
        user_preferences: data.userPreferences || {},
        widget_state: data.widgetState || {}
      };

      console.log(`UnifiedAnalytics: Tracking ${eventCategory}/${eventType}:`, {
        eventType,
        eventCategory,
        textLength: analyticsData.text_length,
        voiceType: analyticsData.voice_type,
        sessionDuration: analyticsData.session_duration_seconds,
        eventSequence: analyticsData.events_in_session
      });

      return await this.supabase.query('unified_analytics', 'POST', analyticsData);

    } catch (error) {
      console.error('UnifiedAnalytics: Tracking failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ===== CONVENIENCE METHODS FOR COMMON EVENTS =====

  // Extension lifecycle
  async trackExtensionLoaded() {
    return await this.track('extension_loaded', 'lifecycle');
  }

  async trackExtensionEnabled() {
    return await this.track('extension_enabled', 'lifecycle');
  }

  async trackExtensionDisabled() {
    return await this.track('extension_disabled', 'lifecycle');
  }

  // Text interaction
  async trackTextSelected(text, detectedLanguage) {
    return await this.track('text_selected', 'interaction', {
      textContent: text,
      textLength: text.length,
      wordCount: text.split(/\s+/).length,
      languageDetected: detectedLanguage
    });
  }

  async trackButtonClicked(buttonName, context = {}) {
    return await this.track('button_clicked', 'interaction', {
      featureName: buttonName,
      featureAction: 'clicked',
      featureContext: JSON.stringify(context)
    });
  }

  // Speech events
  async trackSpeechPlay(text, voice, settings = {}) {
    this.textsProcessedInSession++;
    
    return await this.track('speech_play', 'speech', {
      textContent: text,
      textLength: text.length,
      voiceId: voice?.id,
      voiceType: voice?.type,
      voiceName: voice?.name,
      speedSetting: settings.speed || 1.0,
      costCents: settings.costCents || 0,
      isCached: settings.isCached || false,
      durationMs: settings.durationMs
    });
  }

  async trackSpeechPause() {
    return await this.track('speech_pause', 'speech');
  }

  async trackSpeechStop() {
    return await this.track('speech_stop', 'speech');
  }

  async trackSpeechComplete(durationMs) {
    return await this.track('speech_complete', 'speech', {
      durationMs: durationMs
    });
  }

  // Voice events
  async trackVoiceChanged(voice, language) {
    return await this.track('voice_changed', 'voice', {
      voiceId: voice?.id,
      voiceType: voice?.type,
      voiceName: voice?.name,
      languageSelected: language
    });
  }

  async trackVoiceLoadingStarted(voiceType, language) {
    this.markPerformanceStart('voice_loading');
    return await this.track('voice_loading_started', 'voice', {
      voiceType: voiceType,
      languageSelected: language
    });
  }

  async trackVoiceLoadingCompleted(voiceType, language, voiceCount) {
    const loadingTime = this.markPerformanceEnd('voice_loading');
    return await this.track('voice_loading_completed', 'voice', {
      voiceType: voiceType,
      languageSelected: language,
      responseTimeMs: loadingTime,
      eventData: { voiceCount: voiceCount }
    });
  }

  async trackVoiceLoadingFailed(voiceType, language, errorMessage) {
    const loadingTime = this.markPerformanceEnd('voice_loading');
    return await this.track('voice_loading_failed', 'error', {
      voiceType: voiceType,
      languageSelected: language,
      responseTimeMs: loadingTime,
      errorMessage: errorMessage,
      errorCode: 'VOICE_LOADING_FAILED'
    });
  }

  // Feature usage
  async trackFeatureUsed(featureName, action, value = null, context = {}) {
    return await this.track('feature_used', 'feature', {
      featureName: featureName,
      featureAction: action,
      featureValue: value,
      featureContext: JSON.stringify(context)
    });
  }

  async trackRecordingStarted(textContent) {
    return await this.track('recording_started', 'feature', {
      featureName: 'recording',
      featureAction: 'started',
      textContent: textContent
    });
  }

  async trackRecordingCompleted(textContent, durationMs) {
    return await this.track('recording_completed', 'feature', {
      featureName: 'recording',
      featureAction: 'completed',
      textContent: textContent,
      durationMs: durationMs
    });
  }

  async trackFeedbackSubmitted(feedbackType, messageLength) {
    return await this.track('feedback_submitted', 'feature', {
      featureName: 'feedback',
      featureAction: 'submitted',
      featureValue: feedbackType,
      eventData: { messageLength: messageLength }
    });
  }

  // Performance tracking
  async trackCacheHit(voiceType, language) {
    return await this.track('cache_hit', 'performance', {
      voiceType: voiceType,
      languageSelected: language,
      isCached: true,
      costCents: 0
    });
  }

  async trackCacheMiss(voiceType, language, costCents) {
    return await this.track('cache_miss', 'performance', {
      voiceType: voiceType,
      languageSelected: language,
      isCached: false,
      costCents: costCents
    });
  }

  async trackApiResponse(apiName, responseTimeMs, success = true) {
    return await this.track(success ? 'api_response_success' : 'api_response_failure', 'performance', {
      featureName: apiName,
      responseTimeMs: responseTimeMs,
      featureAction: success ? 'success' : 'failure'
    });
  }

  // Error tracking
  async trackError(errorCode, errorMessage, errorStack = null, context = {}) {
    return await this.track('error_occurred', 'error', {
      errorCode: errorCode,
      errorMessage: errorMessage,
      errorStack: errorStack,
      eventData: context
    });
  }

  // Business intelligence
  async trackUserJourney(stage, conversionGoal = null) {
    return await this.track('user_journey_progress', 'business', {
      userJourneyStage: stage,
      conversionGoal: conversionGoal
    });
  }

  async trackFeatureDiscovery(featureName, discoveryMethod) {
    return await this.track('feature_discovery', 'business', {
      featureName: featureName,
      featureAction: 'discovered',
      featureContext: discoveryMethod,
      userJourneyStage: 'feature_discovery'
    });
  }

  async trackPremiumInterest(featureName, interestLevel) {
    return await this.track('premium_interest', 'business', {
      featureName: featureName,
      featureValue: interestLevel,
      userJourneyStage: 'premium_consideration',
      conversionGoal: 'premium_subscription'
    });
  }
}

// Initialize unified analytics
window.nativeMimicUnifiedAnalytics = new UnifiedAnalyticsClient(window.nativeMimicSupabase);

console.log('UnifiedAnalyticsClient: Loaded and ready for comprehensive analytics collection');