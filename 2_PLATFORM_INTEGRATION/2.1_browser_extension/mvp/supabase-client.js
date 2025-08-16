// Supabase client for NativeMimic browser extension
// Lightweight client without external dependencies

class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.userId = null;
    this.sessionId = this.generateSessionId();
    // Enable Supabase for basic analytics and feedback collection
    this.enabled = true;
    console.log('SupabaseClient: Initialized and enabled for analytics and feedback collection');
  }

  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async authenticate() {
    // TODO: Replace with real authentication for paid version
    // Current: Anonymous users for MVP testing
    // Future: Email/password or Google OAuth
    
    let result = await chrome.storage.local.get(['supabase_user_id', 'supabase_session']);
    
    // Check if we have a real authenticated session
    if (result.supabase_session) {
      // TODO: Validate session with Supabase Auth
      // const { data: { user } } = await supabase.auth.getUser()
      // this.userId = user.id;
      // return this.userId;
    }
    
    // Fallback: Anonymous user for MVP
    if (!result.supabase_user_id || result.supabase_user_id.startsWith('anon_')) {
      // Generate a proper UUID format for Supabase compatibility
      // Clear old invalid format if it exists
      if (result.supabase_user_id && result.supabase_user_id.startsWith('anon_')) {
        console.log('NativeMimic: Replacing invalid user ID format with proper UUID');
      }
      this.userId = this.generateUUID();
      await chrome.storage.local.set({ supabase_user_id: this.userId });
      console.log('NativeMimic: Created anonymous user for MVP testing:', this.userId);
      
      // Create user in Supabase users table
      await this.ensureUserExists();
    } else {
      this.userId = result.supabase_user_id;
      console.log('NativeMimic: Using existing anonymous user:', this.userId);
      
      // Ensure user exists in database (in case it was deleted)
      await this.ensureUserExists();
    }
    
    return this.userId;
  }

  // TODO: Add real authentication methods for paid version
  async signUpWithEmail(email, password) {
    // const { data, error } = await supabase.auth.signUp({ email, password })
    // Handle real user creation
    throw new Error('Real authentication not implemented yet - MVP uses anonymous users');
  }

  async signInWithEmail(email, password) {
    // const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    // Handle real user login
    throw new Error('Real authentication not implemented yet - MVP uses anonymous users');
  }

  async signOut() {
    // const { error } = await supabase.auth.signOut()
    // Clear local session
    await chrome.storage.local.remove(['supabase_user_id', 'supabase_session']);
    this.userId = null;
  }

  // Generate a proper UUID v4 format for Supabase compatibility
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Ensure user exists in Supabase users table
  async ensureUserExists() {
    if (!this.userId) {
      console.error('NativeMimic: Cannot ensure user exists - no userId');
      return;
    }

    try {
      // First check if user already exists to avoid 409 conflicts
      const existingUser = await this.query('users', 'GET', null, `id=eq.${this.userId}&select=id`);
      
      if (existingUser && existingUser.length > 0) {
        console.log('NativeMimic: User already exists in database:', this.userId);
        return;
      }

      // User doesn't exist, create new one
      const userData = {
        id: this.userId,
        created_at: new Date().toISOString()
      };

      await this.query('users', 'POST', userData);
      console.log('NativeMimic: User created in database:', this.userId);
    } catch (error) {
      // Handle specific error cases
      if (error.message.includes('duplicate key') || error.message.includes('23505')) {
        console.log('NativeMimic: User already exists in database (race condition):', this.userId);
      } else {
        console.warn('NativeMimic: Failed to ensure user exists:', error.message);
        // Don't throw - analytics should continue to work even if user creation fails
      }
    }
  }

  async query(table, method = 'POST', data = null, filter = null) {
    if (!this.enabled) {
      console.log('SupabaseClient: Skipping query - client disabled');
      return { success: false, error: 'Supabase client disabled' };
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`
    };

    let url = `${this.url}/rest/v1/${table}`;
    let options = { method, headers };

    if (method === 'POST' && data) {
      options.body = JSON.stringify(data);
    }

    if (method === 'GET' && filter) {
      url += `?${filter}`;
    }

    try {
      console.log(`NativeMimic: Supabase ${method} to ${table}:`, data ? JSON.stringify(data).substring(0, 100) : 'no data');
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`NativeMimic: Supabase ${method} failed: ${response.status} - ${errorText}`);
        throw new Error(`Supabase ${method} failed: ${response.status} - ${errorText}`);
      }
      
      // Handle empty responses (common for 201 Created, 204 No Content)
      const responseText = await response.text();
      console.log(`DEBUG: Response text for ${method}:`, JSON.stringify(responseText), `length: ${responseText.length}`);
      if (!responseText || responseText.trim() === '') {
        console.log(`NativeMimic: Supabase ${method} success: empty response (${response.status})`);
        return { success: true, status: response.status };
      }
      
      try {
        const result = JSON.parse(responseText);
        console.log(`NativeMimic: Supabase ${method} success:`, result);
        return result;
      } catch (jsonError) {
        console.warn(`NativeMimic: Could not parse JSON response, returning raw text:`, responseText);
        return { success: true, data: responseText, status: response.status };
      }
    } catch (error) {
      console.error('NativeMimic Supabase Error:', error.message);
      console.error('NativeMimic Supabase URL:', url);
      console.error('NativeMimic Supabase Data:', data);
      throw error; // Re-throw so calling code knows it failed
    }
  }

  async saveRecording(originalText, audioBlob, transcription = null) {
    await this.authenticate();
    
    console.log('NativeMimic: Attempting to save recording:', {
      textLength: originalText?.length,
      blobSize: audioBlob?.size,
      blobType: audioBlob?.type
    });
    
    // Try to upload audio to storage
    let audioUrl = null;
    try {
      audioUrl = await this.uploadAudio(audioBlob);
      console.log('NativeMimic: Audio upload result:', audioUrl ? 'success' : 'failed');
    } catch (error) {
      console.warn('NativeMimic: Audio upload failed, saving metadata anyway:', error.message);
    }
    
    // Save recording metadata regardless of audio upload success
    const recordingData = {
      user_id: this.userId,
      text: originalText, // Match 'text' column name
      audio_url: audioUrl || `blob://failed-upload-${Date.now()}`, // Use placeholder if upload failed
      quality_score: null, // Will be calculated later
      language: 'en' // Default to English, can be detected later
    };

    console.log('NativeMimic: Saving recording metadata:', recordingData);
    return await this.query('recordings', 'POST', recordingData);
  }

  async uploadAudio(audioBlob) {
    // Detect file extension based on blob type
    let fileExtension = '.webm';
    if (audioBlob.type.includes('mp4')) {
      fileExtension = '.mp4';
    } else if (audioBlob.type.includes('wav')) {
      fileExtension = '.wav';
    } else if (audioBlob.type.includes('ogg')) {
      fileExtension = '.ogg';
    }
    
    const fileName = `${this.userId}/${Date.now()}${fileExtension}`;
    const formData = new FormData();
    formData.append('file', audioBlob, fileName);

    console.log('NativeMimic: Uploading audio:', {
      fileName: fileName,
      blobSize: audioBlob.size,
      blobType: audioBlob.type
    });

    try {
      const uploadUrl = `${this.url}/storage/v1/object/recordings/${fileName}`;
      console.log('NativeMimic: Upload URL:', uploadUrl);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.key}`
        },
        body: formData
      });

      console.log('NativeMimic: Upload response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });

      if (response.ok) {
        console.log('NativeMimic: Audio upload successful');
        return `recordings/${fileName}`;
      } else {
        const errorText = await response.text();
        console.error('NativeMimic: Audio upload failed:', response.status, errorText);
        throw new Error(`Audio upload failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('NativeMimic Audio Upload Error:', error);
      throw error; // Re-throw to be handled by saveRecording
    }
  }

  async saveNote(title, content, tags = [], textContext = null) {
    await this.authenticate();

    const noteData = {
      user_id: this.userId,
      title: title,
      content: content,
      tags: tags,
      text_context: textContext
    };

    return await this.query('notes', 'POST', noteData);
  }

  async saveBugReport(reportType, description, stepsToReproduce = null, browserInfo = {}, widgetState = {}) {
    await this.authenticate();

    const bugData = {
      user_id: this.userId,
      report_type: reportType,
      description: description,
      steps_to_reproduce: stepsToReproduce,
      browser_info: browserInfo,
      widget_state: widgetState
    };

    return await this.query('bug_reports', 'POST', bugData);
  }

  async saveFeatureRequest(title, description, category = null, priority = 'medium') {
    await this.authenticate();

    const featureData = {
      user_id: this.userId,
      title: title,
      description: description,
      category: category,
      priority: priority
    };

    return await this.query('feature_requests', 'POST', featureData);
  }

  async saveVoiceIssue(issueType, description, textContent = null, voiceId = null, voiceType = null, languageCode = null, audioUrl = null, severity = 'medium') {
    await this.authenticate();

    const voiceIssueData = {
      user_id: this.userId,
      issue_type: issueType,
      text_content: textContent,
      voice_id: voiceId,
      voice_type: voiceType,
      language_code: languageCode,
      audio_url: audioUrl,
      description: description,
      severity: severity
    };

    return await this.query('voice_issues', 'POST', voiceIssueData);
  }

  async saveGeneralFeedback(message, feedbackType = 'general', rating = null, pageUrl = null, tags = []) {
    await this.authenticate();

    const feedbackData = {
      user_id: this.userId,
      feedback_type: feedbackType,
      rating: rating,
      message: message,
      page_url: pageUrl || window.location.href,
      user_agent: navigator.userAgent,
      tags: tags
    };

    return await this.query('general_feedback', 'POST', feedbackData);
  }

  async savePricingFeedback(feedbackType, message, wouldPay = null, suggestedPriceMonthly = null, paymentFrequency = null, valuableFeatures = [], userSegment = null) {
    await this.authenticate();

    const pricingData = {
      user_id: this.userId,
      feedback_type: feedbackType,
      message: message,
      would_pay: wouldPay,
      suggested_price_monthly: suggestedPriceMonthly,
      payment_frequency_preference: paymentFrequency,
      most_valuable_features: valuableFeatures,
      user_segment: userSegment
    };

    return await this.query('pricing_feedback', 'POST', pricingData);
  }

  async trackInteraction(interactionType, textContent = null, widgetPosition = {}, settings = {}) {
    await this.authenticate();

    // Map to speech_events table structure
    const speechEventData = {
      user_id: this.userId,
      session_id: this.sessionId,
      event_type: interactionType, // 'play', 'pause', 'stop', 'speed_change', 'voice_change'
      text_content: textContent,
      text_length: textContent?.length || 0,
      voice_id: settings?.selectedVoice?.id || null,
      voice_type: settings?.selectedVoice?.type || null,
      language_code: settings?.language || null,
      speed_setting: settings?.speed || 1.0,
      website_url: window.location.href,
      website_domain: window.location.hostname,
      cost_cents: settings?.cost || 0,
      is_cached: settings?.cached || false
    };

    console.log('NativeMimic: Tracking interaction to speech_events:', {
      eventType: interactionType,
      textLength: textContent?.length || 0,
      voiceType: settings?.selectedVoice?.type,
      userId: this.userId?.substring(0, 8) + '...',
      voiceId: settings?.selectedVoice?.id,
      language: settings?.language,
      cost: settings?.cost
    });

    return await this.query('speech_events', 'POST', speechEventData);
  }

  async trackAnalytics(eventType, eventData = {}, pageUrl = window.location.href, sessionDuration = 0) {
    // Check if analytics are enabled in configuration
    if (!window.NATIVEMIMIC_CONFIG?.ENABLE_SUPABASE_ANALYTICS) {
      console.log('NativeMimic: Analytics disabled in configuration');
      return { success: false, error: 'Analytics disabled' };
    }
    
    await this.authenticate();

    const analyticsData = {
      user_id: this.userId,
      event_type: eventType,
      event_data: eventData,
      page_url: pageUrl,
      session_duration: sessionDuration
    };

    return await this.query('analytics', 'POST', analyticsData);
  }

  async getUserRecordings() {
    await this.authenticate();
    return await this.query('recordings', 'GET', null, `user_id=eq.${this.userId}&order=created_at.desc`);
  }

  async getUserNotes() {
    await this.authenticate();
    return await this.query('notes', 'GET', null, `user_id=eq.${this.userId}&order=created_at.desc`);
  }

  async getUserBugReports() {
    await this.authenticate();
    return await this.query('bug_reports', 'GET', null, `user_id=eq.${this.userId}&order=created_at.desc`);
  }
}

// Initialize Supabase client
window.nativeMimicSupabase = new SupabaseClient(
  'https://fbgegchcosrkawsniyco.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZ2VnY2hjb3Nya2F3c25peWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MDIyNTUsImV4cCI6MjA3MDE3ODI1NX0.DJAI6rqDn2az70bFIu-kxTAjafYe01o_Y82QlWC-zZ0'
);