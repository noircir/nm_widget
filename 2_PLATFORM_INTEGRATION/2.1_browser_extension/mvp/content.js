// =============================================================================
// NATIVEMIMIC CONFIGURATION - CHANGE THESE FLAGS TO SWITCH MODES
// =============================================================================
const NATIVEMIMIC_CONFIG = {
  // PRODUCTION MODE: Using Supabase Edge Functions for real customers
  DEVELOPMENT_MODE: false, // Switched to production mode
  
  // GOOGLE TTS SETTINGS
  GOOGLE_TTS_SERVER_URL: 'https://fbgegchcosrkawsniyco.supabase.co/functions/v1/google-tts',
  ENABLE_GOOGLE_TTS: true, // Core product feature!
  
  // SUPABASE SETTINGS
  SUPABASE_URL: 'https://fbgegchcosrkawsniyco.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZ2VnY2hjb3Nya2F3c25peWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MDIyNTUsImV4cCI6MjA3MDE3ODI1NX0.DJAI6rqDn2az70bFIu-kxTAjafYe01o_Y82QlWC-zZ0',
  
  // DEBUG SETTINGS
  DEBUG_MODE: true, // Enable detailed console logging
  
  // ANALYTICS SETTINGS  
  ENABLE_SUPABASE_ANALYTICS: true // Re-enabled with proper speech_events table and RLS policies
};

// Make configuration globally available
window.NATIVEMIMIC_CONFIG = NATIVEMIMIC_CONFIG;

// =============================================================================
// NativeMimic Content Script - Core TTS functionality
// =============================================================================
class NativeMimic {
  constructor() {
    // Chromium-based browser detection (includes Chrome, Brave, Edge, etc.)
    this.isChrome = navigator.userAgent.includes('Chrome') || navigator.userAgent.includes('Chromium');
    this.isBrave = navigator.userAgent.includes('Brave') || !!window.navigator.brave;
    
    // Chrome version detection for specific bug workarounds
    this.chromeVersion = this.isChrome ? this.getChromeVersion() : null;
    // isActive removed - using isEnabled for consistency
    this.isEnabled = false; // Widget disabled by default - prevents intrusive behavior during normal browsing
    this.currentUtterance = null;
    this.speechRate = 1.0;
    this.selectedVoice = null;
    this.availableVoices = [];
    this.pronunciationDatabase = new Map(); // For crowdsourced corrections
    this.lastSelectedText = '';
    this.lastDropdownLanguage = 'en'; // Track language for dropdown refresh
    this.currentLanguageVoices = []; // Voices available for current language
    this.isSpeaking = false;
    this.speechInProgress = false; // Additional flag for race condition
    this.speechStarted = false; // Track if onstart event actually fired (Chrome fix)
    this.userDraggedWidget = false; // Track if user has moved widget
    this.lastWidgetPosition = null; // Remember last dragged position
    
    // Voice recording state
    this.mediaRecorder = null;
    this.isRecording = false;
    this.recordedBlob = null;
    this.lastPlayedText = ''; // Keep text available for recording even after speech ends
    
    // Analytics tracking data
    this.lastSpeechCost = 0;
    this.lastSpeechCached = false;
    this.lastDetectedLanguage = 'en';
    
    // Dashboard tracking data
    this.sessionStartTime = Date.now();
    this.todayUsage = [];
    this.speedHistory = [];
    this.languageUsage = {};
    this.voiceUsage = {};
    this.textLengths = [];
    this.dailyStreak = 0;
    
    // Load existing dashboard data
    this.loadDashboardData();
    
    // Audio playback state
    this.currentAudio = null; // Store current Google TTS audio
    this.isGeneratingSpeech = false; // Prevent multiple simultaneous synthesis attempts
    
    // Google TTS caching system
    this.audioCache = new Map(); // Cache for generated audio: key -> {audioUrl, usageCount, timestamp}
    this.maxCacheUsage = 3; // Allow 3 uses per text+voice combination
    this.cacheExpiryHours = 24; // Cache expires after 24 hours
    
    // Theme state
    this.isDarkMode = false;
    
    // Freemium state
    this.isPremium = false; // Default to free tier
    this.dailyUsageCount = 0;
    this.dailyUsageLimit = 50; // Free tier limit: 50 text-to-speech per day
    this.lastUsageReset = null;
    this.freeTrialEnded = false;
    
    // Debug mode - set to false for production
    this.debugMode = true; // TODO: Set to false for production builds
    
    this.init();
  }

  getChromeVersion() {
    const match = navigator.userAgent.match(/Chrome\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  // Centralized logging methods - optimized for production
  debugLog(message, ...args) {
    if (NATIVEMIMIC_CONFIG.DEBUG_MODE) {
      console.log(`[NativeMimic]`, message, ...args);
    }
  }

  debugError(message, ...args) {
    if (NATIVEMIMIC_CONFIG.DEBUG_MODE) {
      console.error(`[NativeMimic ERROR]`, message, ...args);
    } else {
      // Always log errors in production but without verbose details
      console.error('NativeMimic error occurred');
    }
  }

  debugWarn(message, ...args) {
    if (this.debugMode) {
      console.warn(`[NativeMimic WARN]`, message, ...args);
    }
  }

  async init() {
    // Load user settings
    await this.loadSettings();
    
    // Initialize Web Speech API
    this.initSpeechSynthesis();
    
    // Initialize freemium system
    this.initFreemiumSystem();
    
    // Show language selection modal only if extension is enabled
    if (this.isEnabled) {
      // Extension ready for use
    }
    
    
    // Initialize Google TTS for premium users
    this.initGoogleTTS();
    
    // Set up text selection listener
    this.setupSelectionListener();
    
    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // OPTION B: Set up message listener for background script communications
    this.setupMessageListener();

    if (this.isChrome) {
      // Add a one-time event listener to resume audio context on first user interaction
      const resumeAudio = () => {
          if (speechSynthesis.state === 'suspended') {
              speechSynthesis.resume();
          }
          document.body.removeEventListener('mousedown', resumeAudio, true);
          document.body.removeEventListener('keydown', resumeAudio, true);
      };
      document.body.addEventListener('mousedown', resumeAudio, true);
      document.body.addEventListener('keydown', resumeAudio, true);
    }
    
    this.debugLog('NativeMimic initialized successfully');
  }

  // =============================================================================
  // HTML TEMPLATE FUNCTIONS
  // =============================================================================
  // Extracted from inline innerHTML assignments for better maintainability

  getUpgradeModalTemplate(trigger) {
    return `
      <div class="nativemimic-upgrade-backdrop"></div>
      <div class="nativemimic-upgrade-content">
        <div class="nativemimic-upgrade-header">
          <h3>🚀 Upgrade to NativeMimic Premium</h3>
          <button class="nativemimic-upgrade-close">×</button>
        </div>
        <div class="nativemimic-upgrade-body">
          ${this.getUpgradeMessage(trigger)}
          
          <div class="nativemimic-upgrade-features">
            <div class="nativemimic-feature">
              <span class="nativemimic-feature-icon">🔄</span>
              <div>
                <strong>Unlimited Text-to-Speech</strong>
                <p>No daily limits - use NativeMimic as much as you need</p>
              </div>
            </div>
            <div class="nativemimic-feature">
              <span class="nativemimic-feature-icon">🎙️</span>
              <div>
                <strong>Premium AI Voices</strong>
                <p>Google TTS native-quality voices in 70+ languages</p>
              </div>
            </div>
            <div class="nativemimic-feature">
              <span class="nativemimic-feature-icon">📊</span>
              <div>
                <strong>Pronunciation Coaching (Coming Soon)</strong>
                <p>AI-powered feedback to improve your accent</p>
              </div>
            </div>
          </div>
          
          <div class="nativemimic-upgrade-pricing">
            <div class="nativemimic-pricing-option">
              <h4>Premium Monthly</h4>
              <div class="nativemimic-price">$15<span>/month</span></div>
              <button class="nativemimic-upgrade-btn">Upgrade Now</button>
            </div>
          </div>
          
          <div class="nativemimic-upgrade-footer">
            <p><strong>Free Plan:</strong> ${this.dailyUsageCount}/${this.dailyUsageLimit} daily uses</p>
          </div>
        </div>
      </div>
    `;
  }

  getWidgetControlsTemplate() {
    const dashboardData = this.getDashboardData();
    return `
      <div class="nativemimic-widget-container">
        <!-- Top Row: Audio Playback Area -->
        <div class="nativemimic-playback-row">
          <div class="nativemimic-voice-control">
            <label>Voice:</label>
            <div class="nativemimic-voice-dropdown" id="nativemimic-voice-dropdown">
              <div class="nativemimic-voice-selected" id="nativemimic-voice-selected">
                <span>Loading voices...</span>
                <span class="dropdown-arrow">▼</span>
              </div>
              <div class="nativemimic-voice-options" id="nativemimic-voice-options" style="display: none;">
                <!-- Options will be populated here -->
              </div>
            </div>
          </div>
          <button id="nativemimic-play-pause" class="nativemimic-play-button" title="Play selected text (Ctrl+Shift+S)">Play</button>
          <button id="nativemimic-stop" class="nativemimic-stop-button" title="Stop speech completely">Stop</button>
          <div class="nativemimic-speed-control">
            <label>Speed:</label>
            <input type="range" id="nativemimic-speed" min="0.3" max="2.0" step="0.1" value="${this.speechRate}">
            <span id="nativemimic-speed-value">${this.speechRate}x</span>
          </div>
        </div>
        
        <!-- Bottom Row: Recording & Admin Area -->
        <div class="nativemimic-recording-row">
          <button id="nativemimic-notes" class="nativemimic-notes-button" title="Add pronunciation notes">Notes</button>
          <button id="nativemimic-feedback" class="nativemimic-feedback-button" title="Send feedback to improve NativeMimic">Feedback</button>
          <button id="nativemimic-dashboard" class="nativemimic-dashboard-button" title="View learning analytics">📊</button>
          <button id="nativemimic-theme-toggle" class="nativemimic-theme-button" title="Toggle light/dark mode">🌙</button>
          <button id="nativemimic-record" class="nativemimic-record-button" title="Record your pronunciation">Record</button>
          <button id="nativemimic-close" class="nativemimic-close-button" title="Close"></button>
        </div>
      </div>
    `;
  }


  getPersonalNotesModalTemplate() {
    return `
      <div class="nativemimic-modal-overlay">
        <div class="nativemimic-modal-content nativemimic-notes-modal">
          <div class="nativemimic-modal-header">
            <h3>📝 Personal Notes</h3>
            <button class="nativemimic-modal-close">&times;</button>
          </div>
          
          <div class="nativemimic-modal-body">
            <textarea id="nativemimic-personal-notes" placeholder="e.g., 'Remember to stress the first syllable in...' or 'Practice rolling R sounds'"></textarea>
          </div>
          
          <div class="nativemimic-modal-footer">
            <button class="nativemimic-comparison-button nativemimic-submit-button" id="nativemimic-save-notes">Save Notes</button>
            <button class="nativemimic-comparison-button" id="nativemimic-cancel-notes">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  getFeedbackModalTemplate() {
    return `
      <div class="nativemimic-modal-overlay">
        <div class="nativemimic-modal-content nativemimic-notes-modal">
          <div class="nativemimic-modal-header">
            <h3>💬 Send Feedback</h3>
            <button class="nativemimic-modal-close">&times;</button>
          </div>
          
          <div class="nativemimic-modal-body">
            <div style="margin-bottom: 12px;">
              <label for="nativemimic-feedback-type" style="display: block; margin-bottom: 4px; font-weight: 500;">Feedback Type:</label>
              <select id="nativemimic-feedback-type" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
                <option value="bug_report">🐛 Bug Report</option>
                <option value="feature_request">✨ Feature Request</option>
                <option value="voice_issue">🎤 Voice/Pronunciation Issue</option>
                <option value="general">💬 General Feedback</option>
                <option value="pricing">💰 Pricing Feedback</option>
              </select>
            </div>
            <textarea id="nativemimic-feedback-message" placeholder="Please describe your feedback, suggestion, or issue. Include steps to reproduce if reporting a bug."></textarea>
            
            <!-- Recording consent section - shown only for bug reports and voice issues -->
            <div id="nativemimic-recording-consent" style="margin-top: 12px; padding: 10px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid #007bff; display: none;">
              <div style="font-weight: 500; margin-bottom: 6px; color: #495057;">🎤 Help us fix this issue</div>
              <label style="display: flex; align-items: flex-start; font-size: 12px; color: #666; cursor: pointer;">
                <input type="checkbox" id="nativemimic-include-recording" style="margin-right: 8px; margin-top: 2px;">
                <span>Include my voice recording to help debug this issue. My recording will be used only for technical analysis and automatically deleted after 30 days. I can request deletion anytime.</span>
              </label>
            </div>
            
            <div style="margin-top: 8px; font-size: 11px; color: #666; line-height: 1.3;">
              Your feedback helps improve NativeMimic for everyone! We collect anonymous usage data to identify patterns and fix issues.
            </div>
          </div>
          
          <div class="nativemimic-modal-footer">
            <button class="nativemimic-comparison-button nativemimic-submit-button" id="nativemimic-send-feedback">Send Feedback</button>
            <button class="nativemimic-comparison-button" id="nativemimic-cancel-feedback">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  getPronunciationReportModalTemplate(text) {
    return `
      <div class="nativemimic-modal-overlay">
        <div class="nativemimic-modal-content nativemimic-compact-modal">
          <div class="nativemimic-modal-header">
            <h3>🗣️ Report Pronunciation Issue</h3>
            <button class="nativemimic-modal-close">&times;</button>
          </div>
          
          <div class="nativemimic-modal-body">
            <div class="nativemimic-text-display">
              <label>Selected text:</label>
              <div class="nativemimic-selected-text">"${text}"</div>
            </div>
            
            <div class="nativemimic-notes-section">
              <label for="nativemimic-report-notes">Describe the pronunciation issue:</label>
              <textarea id="nativemimic-report-notes" placeholder="e.g., 'Wrong stress pattern - should be on first syllable' or 'Missing silent letters'"></textarea>
            </div>
            
            <div class="nativemimic-community-note">
              💡 Your report helps improve pronunciation for everyone in the community!
            </div>
          </div>
          
          <div class="nativemimic-modal-footer">
            <button class="nativemimic-comparison-button" id="nativemimic-cancel-report">Cancel</button>
            <button class="nativemimic-comparison-button nativemimic-submit-button" id="nativemimic-submit-report">Submit Report</button>
          </div>
        </div>
      </div>
    `;
  }

  getDashboardModalTemplate() {
    const dashboardData = this.getDashboardData();
    return `
      <div class="nativemimic-modal-overlay">
        <div class="nativemimic-modal-content nativemimic-notes-modal">
          <div class="nativemimic-modal-header">
            <h3>📊 Learning Analytics</h3>
            <button class="nativemimic-modal-close">&times;</button>
          </div>
          
          <div class="nativemimic-modal-body">
            <div class="nativemimic-dashboard-grid">
              <div class="nativemimic-dashboard-stat">
                <span class="emoji">🔥</span>
                <span class="label">Practice Streak:</span>
                <span class="value">${dashboardData.streak} days</span>
              </div>
              <div class="nativemimic-dashboard-stat">
                <span class="emoji">📊</span>
                <span class="label">Texts Practiced:</span>
                <span class="value">${dashboardData.totalTexts}</span>
              </div>
              <div class="nativemimic-dashboard-stat">
                <span class="emoji">🌍</span>
                <span class="label">Most Practiced:</span>
                <span class="value">${dashboardData.topLanguage}</span>
              </div>
              <div class="nativemimic-dashboard-stat">
                <span class="emoji">🔊</span>
                <span class="label">Preferred Voice:</span>
                <span class="value">${dashboardData.preferredVoice}</span>
              </div>
              <div class="nativemimic-dashboard-stat">
                <span class="emoji">⚡</span>
                <span class="label">Average Speed:</span>
                <span class="value">${dashboardData.avgSpeed}x</span>
              </div>
              <div class="nativemimic-dashboard-stat">
                <span class="emoji">⏱️</span>
                <span class="label">Today's Practice:</span>
                <span class="value">${dashboardData.todayTime}m</span>
              </div>
            </div>
          </div>
          
          <div class="nativemimic-modal-footer">
            <button class="nativemimic-comparison-button nativemimic-submit-button" id="nativemimic-close-dashboard">Close</button>
          </div>
        </div>
      </div>
    `;
  }


  getExportModalTemplate() {
    return `
      <div class="nativemimic-modal-overlay">
        <div class="nativemimic-modal-content nativemimic-compact-modal">
          <div class="nativemimic-modal-header">
            <h3>📁 Export Your Data</h3>
            <button class="nativemimic-modal-close">&times;</button>
          </div>
          
          <div class="nativemimic-modal-body">
            <div class="nativemimic-export-options">
              <button class="nativemimic-export-btn" data-format="json">
                <span class="nativemimic-export-icon">📄</span>
                <div class="nativemimic-export-info">
                  <strong>JSON Format</strong>
                  <small>Complete data with all details (for developers)</small>
                </div>
              </button>
              
              <button class="nativemimic-export-btn" data-format="txt">
                <span class="nativemimic-export-icon">📝</span>
                <div class="nativemimic-export-info">
                  <strong>Text Format</strong>
                  <small>Simple readable format (for sharing/printing)</small>
                </div>
              </button>
              
              <button class="nativemimic-export-btn" data-format="pdf">
                <span class="nativemimic-export-icon">📋</span>
                <div class="nativemimic-export-info">
                  <strong>PDF Format</strong>
                  <small>Professional report format (coming soon)</small>
                </div>
              </button>
            </div>
          </div>
          
          <div class="nativemimic-modal-footer">
            <button class="nativemimic-modal-btn nativemimic-modal-cancel">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  // =============================================================================
  // END TEMPLATE FUNCTIONS
  // =============================================================================

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get({
        // isActive removed - using isEnabled for consistency
        isEnabled: false, // Default to disabled on fresh install
        speechRate: 1.0,
        selectedVoiceURI: null,
        pronunciationCorrections: {}
      });
      
      // isActive removed - using isEnabled for consistency
      this.isEnabled = result.isEnabled;
      this.speechRate = result.speechRate;
      this.pronunciationDatabase = new Map(Object.entries(result.pronunciationCorrections));
    } catch (error) {
      // Error loading settings - use defaults
    }
  }

  initSpeechSynthesis() {
    // Wait for voices to load
    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.addEventListener('voiceschanged', () => {
        this.loadVoices();
      });
    } else {
      this.loadVoices();
    }
  }

  loadVoices() {
    this.availableVoices = speechSynthesis.getVoices();
    
    // Try to restore selected voice
    chrome.storage.sync.get(['selectedVoiceURI', 'themeSettings', 'isEnabled'], (result) => {
      if (result.selectedVoiceURI) {
        if (result.selectedVoiceURI.startsWith('google-tts:')) {
          // Google TTS voice selected
          const voiceId = result.selectedVoiceURI.replace('google-tts:', '');
          this.selectedVoice = { type: 'google-tts', id: voiceId };
          this.debugLog('Loaded Google TTS voice from storage:', voiceId);
        } else {
          // System voice selected
          this.selectedVoice = this.availableVoices.find(
            voice => voice.voiceURI === result.selectedVoiceURI
          );
          this.debugLog('Loaded system voice from storage:', this.selectedVoice?.name);
        }
      }
      
      
      // Load theme settings
      if (result && result.themeSettings) {
        this.isDarkMode = result.themeSettings.isDarkMode || false;
      }
      
      // Load enabled state
      if (result.isEnabled !== undefined) {
        this.isEnabled = result.isEnabled;
      }
      
      // Set default voice if none selected
      if (!this.selectedVoice) {
        this.selectedVoice = this.getBestVoice();
        this.debugLog('Set default system voice:', this.selectedVoice?.name);
      }
    });
  }

  // Freemium System Methods
  async initFreemiumSystem() {
    try {
      const result = await chrome.storage.sync.get(['premiumStatus', 'dailyUsage', 'lastUsageReset']);
      
      // Set premium status
      this.isPremium = result.premiumStatus || false;
      
      // Reset daily usage if new day
      const today = new Date().toDateString();
      if (result.lastUsageReset !== today) {
        this.dailyUsageCount = 0;
        this.lastUsageReset = today;
        await chrome.storage.sync.set({ 
          dailyUsage: 0, 
          lastUsageReset: today 
        });
      } else {
        this.dailyUsageCount = result.dailyUsage || 0;
        this.lastUsageReset = result.lastUsageReset;
      }
      
    } catch (error) {
      this.debugError(' Error initializing freemium system:', error);
    }
  }

  async checkUsageLimit() {
    if (this.isPremium) {
      return true; // Premium users have unlimited usage
    }
    
    // Check if free user has exceeded daily limit
    if (this.dailyUsageCount >= this.dailyUsageLimit) {
      this.showUpgradeModal('daily_limit');
      return false;
    }
    
    return true;
  }

  async incrementUsage() {
    if (this.isPremium) {
      return; // Premium users don't count usage
    }
    
    this.dailyUsageCount++;
    try {
      await chrome.storage.sync.set({ dailyUsage: this.dailyUsageCount });
    } catch (error) {
      this.debugWarn('Storage unavailable (extension context lost):', error.message);
      return; // Gracefully handle context invalidation
    }
    
    // Show usage warnings
    const remaining = this.dailyUsageLimit - this.dailyUsageCount;
    if (remaining === 10) {
      this.showMessage(`⚠️ Free Plan: ${remaining} uses remaining today`, 'warning', 4000);
    } else if (remaining === 5) {
      this.showMessage(`🚨 Free Plan: Only ${remaining} uses left today!`, 'warning', 5000);
    } else if (remaining === 0) {
      this.showMessage('🔒 Daily limit reached! Upgrade for unlimited access', 'info', 6000);
    }
  }

  showUpgradeModal(trigger) {
    const modal = document.createElement('div');
    modal.className = 'nativemimic-upgrade-modal';
    modal.innerHTML = this.getUpgradeModalTemplate(trigger);
    
    document.body.appendChild(modal);
    
    // Close modal handlers
    const closeBtn = modal.querySelector('.nativemimic-upgrade-close');
    const backdrop = modal.querySelector('.nativemimic-upgrade-backdrop');
    
    [closeBtn, backdrop].forEach(element => {
      element.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    });
    
    // Upgrade button handler
    const upgradeBtn = modal.querySelector('.nativemimic-upgrade-btn');
    upgradeBtn.addEventListener('click', () => {
      window.open('https://vocafluent.com/upgrade', '_blank');
      document.body.removeChild(modal);
    });
  }
  
  getUpgradeMessage(trigger) {
    switch (trigger) {
      case 'daily_limit':
        return `
          <div class="nativemimic-upgrade-message">
            <p><strong>You've reached your daily limit of ${this.dailyUsageLimit} text-to-speech uses.</strong></p>
            <p>Upgrade to Premium for unlimited daily usage and premium AI voices!</p>
          </div>
        `;
      case 'premium_voice':
        return `
          <div class="nativemimic-upgrade-message">
            <p><strong>Premium voices require NativeMimic Premium.</strong></p>
            <p>Upgrade to access 70+ natural AI voices with native-speaker quality!</p>
          </div>
        `;
      default:
        return `
          <div class="nativemimic-upgrade-message">
            <p><strong>Unlock the full power of NativeMimic!</strong></p>
            <p>Get unlimited usage and premium features.</p>
          </div>
        `;
    }
  }


  // Google TTS Integration
  async initGoogleTTS() {
    try {
      if (window.googleTTSClient) {
        this.debugLog('Initializing Google TTS client...');
        const initialized = await window.googleTTSClient.initialize();
        
        if (initialized) {
          this.debugLog(' Google TTS initialized successfully');
          
          // Refresh voice dropdown to include Google TTS voices
          if (this.currentWidget) {
            this.debugLog(' Refreshing voice dropdown with Google TTS voices');
            this.refreshVoiceDropdown();
          }
        } else {
          this.debugLog(' Google TTS backend unavailable');
        }
      }
    } catch (error) {
      this.debugError(' Google TTS initialization failed:', error);
    }
  }

  // ElevenLabs support removed - function kept for backward compatibility
  async speakWithElevenLabs(text, voiceId = null) {
    this.debugLog('ElevenLabs support removed, falling back to Google TTS');
    // Fallback to Google TTS
    await this.speakWithGoogleTTS(text, voiceId);
  }

  // ElevenLabs Audio Caching Methods
  getCachedAudio(cacheKey) {
    const cached = this.audioCache.get(cacheKey);
    if (!cached) return null;
    
    // Check if cache entry has expired (24 hours)
    const now = Date.now();
    const expiryTime = cached.timestamp + (this.cacheExpiryHours * 60 * 60 * 1000);
    if (now > expiryTime) {
      this.debugLog(' Cache entry expired, removing:', cacheKey);
      this.audioCache.delete(cacheKey);
      return null;
    }
    
    // No usage limit - serve unlimited times within 24 hours
    return cached;
  }
  
  cacheAudio(cacheKey, audioUrl) {
    this.audioCache.set(cacheKey, {
      audioUrl: audioUrl,
      timestamp: Date.now()
    });
    
    // Clean up old cache entries to prevent memory bloat
    this.cleanupCache();
  }
  
  // ElevenLabs support removed - audio playback now handled by Google TTS methods
  async playElevenLabsAudio(audioUrl, cacheKey) {
    // Fallback to Google TTS audio playback
    await this.playGoogleTTSAudio(audioUrl, cacheKey);
  }
  
  // Usage tracking removed - unlimited cache usage within 24 hours
  
  cleanupCache() {
    const now = Date.now();
    const maxCacheSize = 50; // Maximum number of cached items
    let cleanedCount = 0;
    
    // Remove expired entries and revoke blob URLs to prevent memory leaks
    for (const [key, cached] of this.audioCache.entries()) {
      const expiryTime = cached.timestamp + (this.cacheExpiryHours * 60 * 60 * 1000);
      if (now > expiryTime) {
        // Revoke blob URL to free memory
        if (cached.audioUrl && cached.audioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(cached.audioUrl);
        }
        this.audioCache.delete(key);
        cleanedCount++;
      }
    }
    
    // If still too many entries, remove oldest ones
    if (this.audioCache.size > maxCacheSize) {
      const entries = [...this.audioCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, entries.length - maxCacheSize);
      for (const [key, cached] of toRemove) {
        // Revoke blob URL to free memory
        if (cached.audioUrl && cached.audioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(cached.audioUrl);
        }
        this.audioCache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 NativeMimic: Cleaned ${cleanedCount} cache entries, freed blob URLs`);
    }
    console.log(`💾 NativeMimic: Cache status - ${this.audioCache.size}/50 entries`);
  }

  async speakWithGoogleTTS(text, voiceId = null) {
    if (!window.googleTTSClient || !window.googleTTSClient.isInitialized) {
      throw new Error('GoogleTTS not initialized');
    }

    try {
      // Create cache key combining text and voice ID
      const cacheKey = `google_${text.substring(0, 500)}_${voiceId || 'default'}`;
      
      // Check if we have cached audio for this text+voice combination
      const cachedAudio = this.getCachedAudio(cacheKey);
      if (cachedAudio) {
        this.debugLog(' Using cached Google TTS audio (unlimited usage within 24hrs)');
        // Removed cost message since users pay flat fee
        
        // Use cached audio directly
        await this.playGoogleTTSAudio(cachedAudio.audioUrl, cacheKey);
        return { audioUrl: cachedAudio.audioUrl, cost: 0, cached: true };
      }

      // No cache available - generate new audio
      this.debugLog(' Cache miss - generating new Google TTS audio for:', text.substring(0, 50));
      this.showMessage('🎙️ Generating voice...', 'info', 3000);

      // Use selected voice or fallback to language-appropriate default
      const selectedVoiceId = voiceId || this.getDefaultGoogleTTSVoice();
      this.debugLog(' Using Google TTS voice:', selectedVoiceId);

      // Generate speech with speed control (no primer for now)
      const result = await window.googleTTSClient.synthesizeText(text, selectedVoiceId, {
        speakingRate: this.speechRate
      });

      // Cache the new audio for future use (24 hours)
      this.cacheAudio(cacheKey, result.audioUrl);
      this.debugLog(' Cached new Google TTS audio for future use');

      // Play the generated audio
      await this.playGoogleTTSAudio(result.audioUrl, cacheKey);

      // Store cost and cached status for analytics tracking
      this.lastSpeechCost = result.cost;
      this.lastSpeechCached = result.cached || false;
      
      // Log usage for tracking
      console.log(`NativeMimic: Google TTS speech generated - Cost: $${result.cost.toFixed(4)}`);
      
      return result;
    } catch (error) {
      this.debugError(' Google TTS speech failed:', error);
      this.showMessage('❌ Premium voice generation failed', 'error');
      throw error;
    }
  }

  async playGoogleTTSAudio(audioUrl, cacheKey) {
    try {
      // Stop any existing audio
      if (this.currentAudio) {
        this.debugLog(' Stopping existing Google TTS audio');
        this.currentAudio.pause();
        this.currentAudio = null;
      }

      // Create and configure audio
      const audio = new Audio(audioUrl);
      this.currentAudio = audio; // Store reference so we can stop it
      
      // Apply speech rate to Google TTS audio
      audio.playbackRate = this.speechRate;
      console.log(`NativeMimic: Setting Google TTS audio playback rate to ${this.speechRate}x`);
      
      // Set up audio event handlers
      audio.onplay = () => {
        this.debugLog(' Google TTS audio started');
        this.onSpeechStart();
      };
      
      audio.onended = () => {
        this.debugLog(' Google TTS audio ended');
        this.currentAudio = null;
        this.onSpeechEnd();
      };
      
      audio.onerror = (e) => {
        this.debugError(' Google TTS audio error:', e);
        this.currentAudio = null;
        this.onSpeechEnd();
      };

      // Play the audio
      await audio.play();
      
    } catch (error) {
      this.debugError(' Error playing Google TTS audio:', error);
      this.currentAudio = null;
      this.onSpeechEnd();
      throw error;
    }
  }

  getDefaultGoogleTTSVoice() {
    // Return default voices based on current session language
    const languageDefaults = {
      'en': 'en-US-Neural2-F', // Emma (US English)
      'es': 'es-ES-Neural2-A', // Carmen (Spanish)
      'fr': 'fr-FR-Neural2-A', // Charlotte (French)
      'de': 'de-DE-Neural2-A', // Anna (German)
      'it': 'it-IT-Neural2-A', // Isabella (Italian)
      'pt': 'pt-BR-Neural2-A', // Ana (Portuguese)
      'ja': 'ja-JP-Neural2-B', // Yuki (Japanese)
      'ko': 'ko-KR-Neural2-A', // Min-ji (Korean)
    };

    const currentLang = this.detectLanguage(this.lastSelectedText);
    return languageDefaults[currentLang] || 'en-US-Neural2-F';
  }

  detectLanguage(text) {
    // Simple language detection based on character patterns
    if (!text) return 'en';
    
    // Japanese: Check for Hiragana/Katakana first (more specific than Kanji)
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
      return 'ja';
    }
    
    // Chinese: CJK characters without Japanese script markers
    if (/[\u4E00-\u9FFF]/.test(text) && !/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
      return 'zh';
    }
    
    // Japanese with Kanji: Only if contains Kanji but no specific Chinese indicators
    if (/[\u4E00-\u9FAF]/.test(text)) {
      return 'ja';
    }
    
    // Korean: Hangul
    if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text)) {
      return 'ko';
    }
    
    // Mongolian Cyrillic: Check for Mongolian-specific patterns before Russian
    // Mongolian uses additional Cyrillic letters: Өө, Үү and specific word patterns
    if (/[\u0400-\u04FF]/.test(text)) {
      // Check for Mongolian-specific Cyrillic letters or common Mongolian words
      if (/[ӨөҮү]/.test(text) || 
          /\b(бол|гэж|дээр|доор|хүүхэд|наадам|түрүү|ард|монгол|улс|байна|болно|хэмээн)\b/i.test(text)) {
        return 'mn';
      }
      // Otherwise treat as Russian
      return 'ru';
    }
    
    // Mongolian: Traditional Mongolian script (vertical)
    if (/[\u1800-\u18AF\u11A0-\u11FF]/.test(text)) {
      return 'mn';
    }
    
    // Arabic
    if (/[\u0600-\u06FF]/.test(text)) {
      return 'ar';
    }
    
    // Thai
    if (/[\u0E00-\u0E7F]/.test(text)) {
      return 'th';
    }
    
    // English: Check for common English patterns first to avoid false detection
    const strongEnglishWords = (text.match(/\b(the|and|or|of|to|in|for|with|on|at|by|from|this|that|these|those|not|will|would|could|should|have|has|had|was|were|been|being|do|does|did|can|may|might|must|shall|should|their|there|they|them|then|than|when|where|what|which|who|how|why|if|whether|said|says|say|because|so|but|however|although|though|while|since|after|before|during|until|through|within|without|under|over|above|below|between|among|across|around|behind|beside|beyond|inside|outside|towards|against|upon|into|onto|out|off|up|down|back|away|here|now|today|yesterday|tomorrow|time|year|years|day|days|week|weeks|month|months|people|person|man|woman|child|children|family|government|country|state|city|world|house|home|work|school|hospital|police|military|business|company|money|market|system|program|service|information|data|research|study|report|news|article|story|book|page|website|internet|computer|technology|science|medical|health|education|law|political|economic|social|cultural|international|national|local|public|private|american|united|states|president|minister|official|officials|statement|said|according|including|however|although|whether|specifically|precisely|pressure|smithsonian|museum|trump|saturday)\b/gi) || []).length;
    
    // Strong English indicators - if found, likely English
    if (strongEnglishWords >= 5) {
      return 'en';
    }
    
    const englishWords = strongEnglishWords;
    
    // German: Check for German-specific patterns first (has unique characters)
    if (/[äöüßÄÖÜ]/.test(text)) {
      return 'de';
    }
    
    // German: Only detect as German if has German words AND few English words
    const germanWords = (text.match(/\b(der|die|das|und|ist|nicht|haben|sein|für|auf|von|zu|werden|sich|auch|nach|über|ich|wir|ihr|hallo|deutsch|wie|was|wo|wann|warum|bitte|wählen|deutschen|aussprache|gegen|unter|während|zwischen|einem|einer|eines|werden|wurden|wurde|sehr|mehr|neue|neuen|neuer|neues|groß|große|großen|großer|großes|klein|kleine|kleinen|kleiner|kleines)\b/gi) || []).length;
    
    // Only detect as German if more German words than English words and at least 3 German words
    if (germanWords >= 3 && germanWords > englishWords) {
      return 'de';
    }
    
    // French: Check for French-specific patterns 
    // Look for French accented characters (excluding German umlauts ä,ö,ü)
    if (/[àâéèêëïîôùûüÿçÀÂÉÈÊËÏÎÔÙÛÜŸÇ]/.test(text) || 
        /\b(le|la|les|du|des|avec|pour|dans|sur|cette|ces|ceci|bonjour|français|merci|oui|non|où|donc|soit)\b/i.test(text)) {
      return 'fr';
    }
    
    // Spanish: Check for Spanish-specific patterns (after French to avoid conflicts)
    if (/[ñáéíóúüÑÁÉÍÓÚÜ¿¡]/.test(text) || 
        /\b(el|la|los|las|del|y|con|por|para|esta?|esto|hola|cómo|qué|dónde|cuándo|español|habla|sí|gracias)\b/i.test(text)) {
      return 'es';
    }
    
    // Default to English for Latin scripts and others
    return 'en';
  }

  // Map extension language codes to Google TTS language codes
  mapToGoogleTTSLanguage(extensionLangCode) {
    const languageMap = {
      'zh': 'cmn',  // Chinese Mandarin
      'ja': 'ja',   // Japanese
      'ko': 'ko',   // Korean  
      'fr': 'fr',   // French
      'es': 'es',   // Spanish
      'de': 'de',   // German
      'it': 'it',   // Italian
      'pt': 'pt',   // Portuguese
      'ru': 'ru',   // Russian
      'ar': 'ar',   // Arabic
      'hi': 'hi',   // Hindi
      'th': 'th',   // Thai
      'vi': 'vi',   // Vietnamese
      'en': 'en'    // English
    };
    
    return languageMap[extensionLangCode] || extensionLangCode;
  }

  getVoiceForLanguage(languageCode) {
    if (!this.availableVoices.length) return null;
    
    // Find the best voice for the detected language
    // Priority: local service voice > remote voice
    let voice = this.availableVoices.find(v => 
      v.lang.startsWith(languageCode) && v.localService
    );
    
    if (!voice) {
      voice = this.availableVoices.find(v => 
        v.lang.startsWith(languageCode)
      );
    }
    
    // Handle missing voices with user notification
    if (!voice) {
      this.handleMissingVoice(languageCode);
      return null; // Don't use fallback voices for different languages
    }
    
    console.log(`NativeMimic: Found voice for ${languageCode}:`, voice?.name || 'none');
    return voice;
  }

  handleMissingVoice(languageCode) {
    const languageNames = {
      'mn': 'Mongolian',
      'zh': 'Chinese', 
      'ja': 'Japanese',
      'ko': 'Korean',
      'ru': 'Russian',
      'ar': 'Arabic',
      'th': 'Thai',
      'fr': 'French'
    };
    
    const langName = languageNames[languageCode] || languageCode.toUpperCase();
    
    // Show permanent notification with generic guidance
    this.showPermanentMessage(
      `${langName} voice not available`,
      `Check your system settings to add ${langName} text-to-speech voices, or upgrade to NativeMimic Premium (coming soon) for more language options.`
    );
    
    console.log(`NativeMimic: ${langName} voice not found. User notified about installation options.`);
  }

  getBestVoice() {
    // Prioritize local, high-quality voices
    const language = document.documentElement.lang || 'en-US';
    
    // Try to find local voice for document language
    let voice = this.availableVoices.find(v => 
      v.lang.startsWith(language.split('-')[0]) && v.localService
    );
    
    // Fallback to any voice for the language
    if (!voice) {
      voice = this.availableVoices.find(v => 
        v.lang.startsWith(language.split('-')[0])
      );
    }
    
    // Ultimate fallback to default English
    if (!voice) {
      voice = this.availableVoices.find(v => 
        v.lang.startsWith('en') && v.localService
      ) || this.availableVoices[0];
    }
    
    return voice;
  }

  setupSelectionListener() {
    let selectionTimeout;
    let processingSelection = false; // Flag to prevent rapid calls
    
    const handleSelection = async () => {
      if (processingSelection) {
        this.debugLog(' Selection already processing, ignoring');
        return;
      }
      processingSelection = true;
      
      await this.handleTextSelection();
      
      // Reset flag after processing
      setTimeout(() => {
        processingSelection = false;
      }, 1000);
    };
    
    document.addEventListener('mouseup', () => {
      clearTimeout(selectionTimeout);
      selectionTimeout = setTimeout(handleSelection, 300);
    });

    document.addEventListener('keyup', (e) => {
      // Handle selection via keyboard (Shift+Arrow keys)
      if (e.shiftKey) {
        clearTimeout(selectionTimeout);
        selectionTimeout = setTimeout(handleSelection, 300);
      }
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', async (e) => {
      // Ctrl/Cmd + Shift + E: Toggle NativeMimic enable/disable
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.toggleEnabled();
        return;
      }
      
      // Skip local isEnabled check - let handleTextSelection check storage for real-time state
      
      // Ctrl/Cmd + Shift + S: Speak selected text
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        this.debugLog(' Ctrl+Shift+S triggered');
        const selectedText = window.getSelection().toString().trim();
        if (selectedText.length === 0) {
          this.showMessage('Please select some text first', 'info');
        } else {
          await this.handleTextSelection(true); // Allow duplicate text for intentional replay
        }
      }
      
      // Ctrl/Cmd + Shift + P: Pause/Resume
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        this.debugLog(' Ctrl+Shift+P triggered');
        if (!speechSynthesis.speaking && !speechSynthesis.paused) {
          this.showMessage('No speech to pause/resume', 'info');
        } else {
          this.toggleSpeech();
        }
      }
      
      // Ctrl/Cmd + Shift + X: Stop
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        this.stopSpeech();
      }
      
      // Ctrl/Cmd + Shift + R: Report pronunciation issue
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        this.debugLog(' Ctrl+Shift+R triggered');
        this.showPronunciationReport();
      }
      
      // Speed control: Ctrl+Shift+Plus/Minus (works when speech is active or widget is shown)
      if ((e.key === '=' || e.key === '+') && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        this.debugLog(' Ctrl+Shift+Plus triggered');
        if (speechSynthesis.speaking || this.currentUtterance) {
          this.adjustSpeed(0.1);
          this.showMessage(`Speed: ${this.speechRate.toFixed(1)}x`, 'info');
        } else {
          this.showMessage('Start speaking first to adjust speed', 'info');
        }
      } else if ((e.key === '-' || e.key === '_') && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        this.debugLog(' Ctrl+Shift+Minus triggered');
        if (speechSynthesis.speaking || this.currentUtterance) {
          this.adjustSpeed(-0.1);
          this.showMessage(`Speed: ${this.speechRate.toFixed(1)}x`, 'info');
        } else {
          this.showMessage('Start speaking first to adjust speed', 'info');
        }
      }
    });
  }

  // OPTION B: Message listener for background script communications
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📩 CONTENT: Received message from background:', message);
      console.log('📍 CONTENT: Current tab URL:', window.location.href);
      const widgetExists = !!document.getElementById('nativemimic-controls');
      console.log('🎛️ CONTENT: Current state - isEnabled:', this.isEnabled, 'hasWidget:', widgetExists);
      
      try {
        switch (message.action) {
          case 'updateEnabledState':
            const newState = message.isEnabled === true;
            console.log('🔄 CONTENT: Processing updateEnabledState -', this.isEnabled, '→', newState);
            
            // Update cached state
            this.isEnabled = newState;
            console.log('✅ CONTENT: Updated cached state to:', newState);
            
            // If disabled, check for existing widget and hide it immediately
            if (!newState) {
              const existingWidget = document.getElementById('nativemimic-controls');
              if (existingWidget) {
                console.log('👻 CONTENT: Extension disabled - hiding existing widget');
                console.log('🎯 CONTENT: Widget DOM element found:', !!existingWidget);
                this.hideSpeechControls();
                console.log('✅ CONTENT: hideSpeechControls() called and widget should be removed');
              } else {
                console.log('ℹ️ CONTENT: Extension disabled but no widget found in DOM');
              }
            } else {
              console.log('🟢 CONTENT: Extension enabled');
            }
            
            sendResponse({ success: true, currentState: newState });
            console.log('📤 CONTENT: Response sent to background');
            break;
            
          case 'getState':
            const existingWidget = document.getElementById('nativemimic-controls');
            const state = { 
              isEnabled: this.isEnabled,
              hasWidget: !!existingWidget,
              isPlaying: this.isSpeaking 
            };
            console.log('📊 CONTENT: Sending state to background:', state);
            sendResponse(state);
            break;
            
          case 'debugPing':
            console.log('🏓 DEBUG: Received ping from background:', message);
            sendResponse({ success: true, url: window.location.href });
            break;
            
          default:
            console.log('❌ CONTENT: Unknown action:', message.action);
            sendResponse({ error: 'Unknown action: ' + message.action });
        }
      } catch (error) {
        console.log('💥 CONTENT: Error handling message:', error);
        sendResponse({ error: error.message });
      }
      
      return true; // Keep message channel open for async responses
    });
    
    console.log('👂 CONTENT: Message listener set up and ready');
    
    // DEBUGGING: Test if we can receive messages at all
    setTimeout(() => {
      console.log('🔍 DEBUG: Testing message reception capability...');
      console.log('🔍 DEBUG: Tab URL:', window.location.href);
      console.log('🔍 DEBUG: Content script loaded and listener active');
    }, 1000);
  }

  handleTextSelection(allowDuplicate = false) {
    // OPTION B: Use cached state for performance - background script manages state
    this.debugLog(' handleTextSelection called, isEnabled:', this.isEnabled);
    if (!this.isEnabled) {
      this.debugLog(' Extension disabled, widget will not appear');
      return;
    }
    
    // IMMEDIATE race condition check
    if (this.speechInProgress) {
      this.debugLog(' Speech already in progress, blocking');
      return;
    }
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // Prevent duplicate speech and don't interrupt ongoing speech
    // Allow duplicates when explicitly requested (keyboard shortcut, button click)
    const isDuplicate = selectedText === this.lastSelectedText;
    
    // Chrome-specific check - be more permissive to work around stuck states
    const canSpeak = this.isChrome ? 
      (selectedText.length > 0 && (!isDuplicate || allowDuplicate)) : // Chrome: only check text and duplicates
      (selectedText.length > 0 && (!isDuplicate || allowDuplicate) && !this.isSpeaking && !speechSynthesis.speaking && !speechSynthesis.pending);
    
    if (canSpeak) {
      
      // Track text selection analytics
      if (window.nativeMimicUnifiedAnalytics) {
        const detectedLanguage = this.detectLanguage(selectedText);
        window.nativeMimicUnifiedAnalytics.trackTextSelected(selectedText, detectedLanguage).catch(err => {
          this.debugLog(' Analytics tracking failed (offline mode):', err.message);
        });
      }
      
      // Check if we're in compare mode and this is new text - exit compare mode
      // But don't exit if we're currently recording or just finished recording
      const playRecordingBtn = document.getElementById('nativemimic-play-recording');
      if (playRecordingBtn && selectedText !== this.lastSelectedText && !this.isRecording && selectedText.length > 0) {
        this.debugLog(' New text selected, exiting compare mode');
        this.exitCompareMode();
      }
      
      // Reset progress flag for new selection and set text
      this.speechInProgress = false;
      this.lastSelectedText = selectedText;
      
      this.debugLog(' Text selected:', selectedText.substring(0, 30) + '...');
      this.showSpeechControls(selection.getRangeAt(0));
    } else {
      this.debugLog(' Skipping - reasons:', {
        hasText: selectedText.length > 0,
        isDuplicate: isDuplicate,
        allowDuplicate: allowDuplicate,
        lastText: this.lastSelectedText?.substring(0, 20),
        currentText: selectedText?.substring(0, 20),
        isSpeaking: this.isSpeaking,
        browserSpeaking: speechSynthesis.speaking,
        browserPending: speechSynthesis.pending
      });
    }
  }

  async speakText(text) {
    console.log(`[${Date.now()}] NativeMimic: speakText initiated for:`, text.substring(0, 30));
    
    // Store text for recording purposes (persists even after speech ends)
    this.lastPlayedText = text;
    
    // Check usage limit before speaking
    const canUse = await this.checkUsageLimit();
    if (!canUse) {
      return; // Usage limit exceeded, upgrade modal already shown
    }
    
    // Track usage for dashboard analytics
    const detectedLanguage = this.detectLanguage(text);
    const voiceType = this.selectedVoice ? this.selectedVoice.type || 'system' : 'google-tts';
    this.trackUsage(detectedLanguage, voiceType, this.speechRate, text.length);
    
    // Check if ElevenLabs voice is selected OR available as fallback
    this.debugLog(' Current selectedVoice:', this.selectedVoice);
    this.debugLog(' Voice client status:', {
      googleTTSInitialized: window.googleTTSClient?.isInitialized,
      selectedVoiceType: this.selectedVoice?.type
    });
    
    // Check for Google TTS voice selection
    const shouldUseGoogleTTS = this.selectedVoice && this.selectedVoice.type === 'google-tts';
    
    if (shouldUseGoogleTTS && window.googleTTSClient && window.googleTTSClient.isInitialized) {
      try {
        const voiceId = this.selectedVoice.id;
        this.debugLog(' Using Google TTS voice:', voiceId);
        await this.speakWithGoogleTTS(text, voiceId);
        await this.incrementUsage(); // Track usage even for premium
        return;
      } catch (error) {
        this.debugError(' Google TTS failed, falling back to system voices:', error);
        // Fall through to other options below
      }
    }
    
    // ElevenLabs support removed - redirect to Google TTS or system voices
    if (this.selectedVoice && this.selectedVoice.type === 'elevenlabs') {
      this.debugLog(' ElevenLabs voice selected but support removed - falling back to Google TTS');
      // Convert ElevenLabs selection to Google TTS default
      this.selectedVoice = null; // Reset to trigger Google TTS default below
    }
    
    // Default to Google TTS if available and no other premium voice selected
    if (!this.selectedVoice && window.googleTTSClient && window.googleTTSClient.isInitialized) {
      try {
        this.debugLog(' No voice selected, using default Google TTS');
        await this.speakWithGoogleTTS(text);
        await this.incrementUsage(); // Track usage
        return;
      } catch (error) {
        this.debugError(' Default Google TTS failed, falling back to system voices:', error);
        // Fall through to system voices below
      }
    }
    
    // Fallback: use system voices
    this.debugLog(' Using system voices as fallback');
    
    // Chrome gets completely different, simpler treatment
    this.debugLog(' Chrome detection check - isChrome:', this.isChrome, 'userAgent:', navigator.userAgent.substring(0, 50));
    if (this.isChrome) {
      this.debugLog(' Using Chrome-specific speech method');
      return this.speakTextChrome(text);
    }
    
    // Non-Chrome browsers use full logic
    speechSynthesis.cancel();

    // Prevent overlapping speech
    if (this.isSpeaking || speechSynthesis.speaking || speechSynthesis.pending) {
      // Speech already in progress - aborting
      return;
    }
    
    this.isSpeaking = true;
    this.speechStarted = false;
    console.log(`[${Date.now()}] Set isSpeaking = true`);
    
    // Stop any residual speech
    this.stopSpeech();
    
    // Wait for speech to stop
    await new Promise(resolve => setTimeout(resolve, 150));
    console.log(`[${Date.now()}] Resumed after 150ms wait.`);
    
    const correctedText = this.applyCrowdsourcedCorrections(text);
    
    // Priority: User-selected voice > Language detection
    let voiceToUse = null;
    
    if (this.selectedVoice) {
      // User has explicitly selected a voice - check if it's compatible with system speech
      if (this.selectedVoice.type === 'elevenlabs' || this.selectedVoice.type === 'google-tts') {
        // Premium voice selected but we're falling back to system - find equivalent system voice
        this.debugLog(' Premium voice selected but unavailable, finding system fallback for:', this.selectedVoice.name);
        const detectedLanguage = this.detectLanguage(correctedText);
        voiceToUse = this.getVoiceForLanguage(detectedLanguage);
        this.debugLog(' Using system voice fallback:', voiceToUse?.name);
      } else {
        // System voice selected - use it directly
        voiceToUse = this.selectedVoice;
        this.debugLog(' Using user-selected system voice:', voiceToUse.name);
      }
    }
    
    if (!voiceToUse) {
      // No user selection - use automatic language detection
      const detectedLanguage = this.detectLanguage(correctedText);
      voiceToUse = this.getVoiceForLanguage(detectedLanguage);
      this.debugLog(' No user selection, using language-detected voice:', voiceToUse?.name);
      
      if (!voiceToUse && detectedLanguage !== 'en') {
        // No voice found for language - aborting
        this.isSpeaking = false;
        return;
      }
    }
    console.log(`[${Date.now()}] Voice selected:`, voiceToUse ? voiceToUse.name : 'Default');

    this.currentUtterance = new SpeechSynthesisUtterance(correctedText);
    this.currentUtterance.voice = voiceToUse;
    this.currentUtterance.rate = this.speechRate;
    
    this.currentUtterance.onstart = () => {
      console.log(`[${Date.now()}] Event: onstart fired.`);
      this.onSpeechStart();
    };
    
    this.currentUtterance.onend = () => {
      console.log(`[${Date.now()}] Event: onend fired.`);
      this.onSpeechEnd();
    };
    
    this.currentUtterance.onerror = (event) => {
      // Speech error occurred
      this.onSpeechError(event);
    };
    
    try {
      // Pre-speech state validation

      // Simple approach - Chrome gets NO primer, others get full primer
      if (!this.isChrome) {
        // Non-Chrome browser - using extended primer for stability
        // Other browsers (Brave, etc.) need longer primer to prevent word cutting
        const primer = new SpeechSynthesisUtterance('The quick brown fox jumps over the lazy dog.');
        primer.voice = voiceToUse;
        primer.volume = 0.001;
        primer.rate = 3.0;
        primer.pitch = 1.0;
        
        await new Promise((resolve) => {
          let resolved = false;
          const resolveOnce = () => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          };
          
          primer.onend = resolveOnce;
          primer.onerror = resolveOnce;
          primer.onstart = () => {
            // Primer started successfully
            setTimeout(resolveOnce, 100);
          };
          
          speechSynthesis.speak(primer);
          // Extended timeout - critical for Brave
          setTimeout(resolveOnce, 1500);
        });
      } else {
        // Chrome detected - using extended primer to prevent first word swallowing
        const primer = new SpeechSynthesisUtterance('Warming up speech synthesis engine.');
        primer.voice = voiceToUse;
        primer.volume = 0.001;
        primer.rate = 3.0;
        primer.pitch = 1.0;
        
        await new Promise((resolve) => {
          let resolved = false;
          const resolveOnce = () => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          };
          
          primer.onend = resolveOnce;
          primer.onerror = resolveOnce;
          primer.onstart = () => {
            setTimeout(resolveOnce, 150);
          };
          
          speechSynthesis.speak(primer);
          // Extended timeout for Chrome primer
          setTimeout(resolveOnce, 800);
        });
      }

      // Calling speak()
      speechSynthesis.speak(this.currentUtterance);
      // speechSynthesis.speak() called

      // Chrome-specific timeout and recovery
      setTimeout(() => {
        if (speechSynthesis.speaking && !this.speechStarted) {
          // Fallback: Manually trigger onstart if it didn't fire
          this.onSpeechStart();
        } else if (this.isChrome && this.isSpeaking && !speechSynthesis.speaking) {
          // Chrome: Speech failed - reset state
          this.isSpeaking = false;
          this.speechStarted = false;
          this.onSpeechEnd();
        }
      }, 200);
      
      // Additional Chrome timeout for stuck state detection
      if (this.isChrome) {
        setTimeout(() => {
          if (this.isSpeaking && speechSynthesis.speaking && !this.speechStarted) {
            // Chrome: Speech stuck in silent state - forcing reset
            speechSynthesis.cancel();
            this.isSpeaking = false;
            this.speechStarted = false;
            this.onSpeechEnd();
          }
        }, 2000);
      }

    } catch (error) {
      // Critical error in speakText - reset state
      this.isSpeaking = false;
    }
  }

  // Chrome-specific speech method with known bug workarounds
  speakTextChrome(text) {
    this.debugLog(' speakTextChrome called with selectedVoice:', this.selectedVoice);
    // Chrome: Applying research-based fixes
    
    // REQUIRED: Chrome autoplay policy compliance (since 2018)
    // Must cancel before every speak() call
    speechSynthesis.cancel();
    // Chrome: Mandatory cancel() for autoplay policy compliance
    
    // Force state reset
    this.isSpeaking = true;
    this.speechStarted = false;
    this.lastSelectedText = text;
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.speechRate;
    utterance.volume = 1.0;
    
    // Chrome: Proper voice selection with language detection
    let voiceToUse = null;
    
    if (this.selectedVoice) {
      // User has explicitly selected a voice - prioritize this!
      if (this.selectedVoice.type === 'google-tts') {
        // Google TTS voice selected - handle via Google TTS method instead
        this.debugLog(' User selected Google TTS voice, switching to Google TTS method');
        this.speakTextGoogleTTS(text);
        return;
      } else if (this.selectedVoice.type === 'elevenlabs') {
        // ElevenLabs support removed - fallback to Google TTS
        this.debugLog(' ElevenLabs voice selected but support removed - falling back to Google TTS');
        this.selectedVoice = null; // Reset to trigger Google TTS fallback
        if (window.googleTTSClient && window.googleTTSClient.isInitialized) {
          this.speakTextGoogleTTS(text);
          return;
        }
      } else if (this.selectedVoice.voiceURI) {
        // System voice selected
        voiceToUse = this.selectedVoice;
        this.debugLog(' Using user-selected system voice:', voiceToUse.name);
      }
    }
    
    if (!voiceToUse) {
      // No user selection or invalid selection - auto-detect language
      const detectedLanguage = this.detectLanguage(text);
      this.debugLog(' No user selection, detected language:', detectedLanguage);
      
      voiceToUse = this.getVoiceForLanguage(detectedLanguage);
      if (voiceToUse) {
        this.debugLog(' Using language-matched voice:', voiceToUse.name);
      } else if (this.availableVoices.length > 0) {
        // Fallback to first available voice
        voiceToUse = this.availableVoices[0];
        this.debugLog(' Using fallback voice:', voiceToUse.name);
      }
    }
    
    if (voiceToUse) {
      utterance.voice = voiceToUse;
    }
    
    // Simple event handlers
    utterance.onstart = () => {
      // Chrome: Speech started successfully
      this.speechStarted = true;
      this.updatePlayPauseButton('Pause', 'Pause');
      
      // Update voice dropdown to show which voice is actually being used
      this.updateVoiceDropdownSelection(utterance.voice);
      
      // Track speech analytics
      if (window.nativeMimicUnifiedAnalytics) {
        window.nativeMimicUnifiedAnalytics.trackSpeechPlay(
          text, 
          this.selectedVoice, 
          { speed: this.speechRate, isCached: false }
        ).catch(err => {
          this.debugLog(' Analytics tracking failed (offline mode):', err.message);
        });
      }
    };
    
    utterance.onend = () => {
      // Chrome: Speech ended
      this.isSpeaking = false;
      this.speechStarted = false;
      this.updatePlayPauseButton('Play', 'Play');
    };
    
    utterance.onerror = (e) => {
      // Chrome: Speech error occurred
      this.isSpeaking = false;
      this.speechStarted = false;
      this.updatePlayPauseButton('Play', 'Play');
      
      // If error is not 'canceled', try once more
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        // Chrome: Retrying speech after error
        setTimeout(() => {
          speechSynthesis.speak(utterance);
        }, 200);
      }
    };
    
    // Chrome research-based speech execution
    // Chrome: Executing speak() with compliance fixes
    try {
      // The key Chrome fix: cancel() immediately before speak()
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
      // Chrome: speak() called after mandatory cancel()
      
      // Research shows Chrome needs user gesture validation
      setTimeout(() => {
        if (this.isSpeaking && !this.speechStarted) {
          // Chrome: Speech synthesis failed - applying emergency reset
          
          // Check if Chrome's speechSynthesis is stuck
          if (speechSynthesis.speaking || speechSynthesis.pending) {
            // Chrome: speechSynthesis stuck in broken state
            // Multiple aggressive resets
            for (let i = 0; i < 3; i++) {
              speechSynthesis.cancel();
            }
            
            // If still stuck after 1 second, show reload suggestion
            setTimeout(() => {
              if (speechSynthesis.speaking || speechSynthesis.pending) {
                // Chrome: speechSynthesis permanently broken
                this.showPermanentMessage(
              'Chrome Audio Not Working', 
              `Chrome ${this.chromeVersion} has known Web Speech API issues.\n\n✅ WORKING SOLUTIONS:\n• Use Brave browser (100% compatible)\n• Use Microsoft Edge (fully supported)\n• Use Firefox (reliable)\n\n🔧 CHROME FIXES TO TRY:\n• Refresh this page (Ctrl+F5)\n• Restart Chrome completely\n• Update Chrome to latest version\n\nNativeMimic works perfectly in other browsers!`
            );
              }
            }, 1000);
          }
          
          this.isSpeaking = false;
          this.speechStarted = false;
          this.updatePlayPauseButton('Play', 'Play');
        }
      }, 300);
      
    } catch (error) {
      // Chrome: speak() failed
      this.isSpeaking = false;
      this.updatePlayPauseButton('Play', 'Play');
    }
  }

  // ElevenLabs support removed - method kept for backward compatibility
  async speakTextElevenLabs(text) {
    this.debugLog(' ElevenLabs method called but support removed - falling back to Google TTS');
    // Fallback to Google TTS method
    await this.speakTextGoogleTTS(text);
  }

  // Google TTS-specific speech method that respects user voice selection
  async speakTextGoogleTTS(text) {
    this.debugLog(' speakTextGoogleTTS called with voice:', this.selectedVoice);
    
    // Prevent multiple simultaneous synthesis attempts
    if (this.isGeneratingSpeech) {
      this.debugLog(' Already generating speech, ignoring duplicate request');
      return;
    }
    
    // Force state reset
    this.isSpeaking = true;
    this.speechInProgress = true;
    this.updatePlayPauseButton('Pause', 'Speaking...');
    
    // Stop any existing speech or audio
    speechSynthesis.cancel();
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    // Use the selected Google TTS voice ID
    const voiceId = this.selectedVoice?.id;
    
    if (!voiceId) {
      this.debugError(' No Google TTS voice ID found in selectedVoice:', this.selectedVoice);
      // Fallback to system voices
      this.speakTextChrome(text);
      return;
    }
    
    this.debugLog(' Using Google TTS voice ID:', voiceId);
    
    this.isGeneratingSpeech = true; // Set guard flag
    
    try {
      await this.speakWithGoogleTTS(text, voiceId);
    } catch (error) {
      this.debugError(' Google TTS speech failed:', error);
      // Fallback to system voices - but avoid recursive loop by temporarily clearing selectedVoice
      const originalVoice = this.selectedVoice;
      this.selectedVoice = null; // Clear to avoid infinite loop
      this.debugLog(' Falling back to system voice due to Google TTS failure');
      this.speakTextChrome(text);
      this.selectedVoice = originalVoice; // Restore for next attempt
    } finally {
      this.isGeneratingSpeech = false; // Clear guard flag
    }
  }

  applyCrowdsourcedCorrections(text) {
    let correctedText = text;
    
    // Apply word-level corrections from community database
    for (const [originalWord, correction] of this.pronunciationDatabase) {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${this.escapeRegex(originalWord)}\\b`, 'gi');
      correctedText = correctedText.replace(regex, correction);
    }
    
    return correctedText;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async showSpeechControls(range) {
    // Check if widget already exists
    let controls = document.getElementById('nativemimic-controls');
    
    this.debugLog(' showSpeechControls called, existing widget:', !!controls);
    
    if (controls) {
      // Widget exists - check if we need to refresh voices for different language
      const currentLanguage = this.lastSelectedText ? this.detectLanguage(this.lastSelectedText) : 'en';
      const lastLanguage = this.lastDropdownLanguage || 'en';
      
      this.debugLog(' Reusing existing widget');
      this.debugLog(' Current language:', currentLanguage, 'Last language:', lastLanguage);
      
      if (currentLanguage !== lastLanguage) {
        this.debugLog(' Language changed - refreshing voice dropdown and auto-selecting best voice');
        // Language changed - refresh the dropdown and auto-select best voice
        this.lastDropdownLanguage = currentLanguage;
        await this.autoSelectBestVoiceForLanguage(currentLanguage);
        this.setupCustomVoiceDropdown();
      } else {
        this.debugLog(' Same language - preserving dropdown');
      }
      
      this.repositionWidget(controls, range);
      return;
    }
    
    // Create control panel (only if it doesn't exist)
    this.debugLog(' Creating new widget');
    controls = document.createElement('div');
    controls.id = 'nativemimic-controls';
    controls.className = 'nativemimic-speech-controls';
    
    // Position widget - use remembered position if user dragged it, otherwise auto-position
    const controlsWidth = 350; // Estimated width of controls
    const controlsHeight = 80; // Estimated height of controls
    
    let top, left;
    
    if (this.userDraggedWidget && this.lastWidgetPosition && this.lastSelectedText) {
      // Use last dragged position only for the same text
      top = this.lastWidgetPosition.top;
      left = this.lastWidgetPosition.left;
      this.debugLog(' Using remembered position for same text:', { top, left });
    } else {
      // Reset drag memory for new text selections
      this.userDraggedWidget = false;
      this.lastWidgetPosition = null;
      // Auto-position near selection
      const rect = range.getBoundingClientRect();
      this.debugLog(' Selection rect:', rect);
      
      // Check if rect is valid (not collapsed or zero)
      if (rect.width === 0 && rect.height === 0) {
        this.debugLog(' Invalid selection rect, using center positioning');
        top = 100;
        left = Math.max(10, (window.innerWidth - 350) / 2);
      } else {
        top = rect.bottom + 10;
        left = rect.left;
      }
      this.debugLog(' Auto-positioning widget for new text:', { top, left, rectBottom: rect.bottom, rectLeft: rect.left });
      
      // Avoid going off-screen horizontally
      if (left + controlsWidth > window.innerWidth) {
        left = window.innerWidth - controlsWidth - 10;
      }
      if (left < 10) left = 10;
      
      // Avoid going off-screen vertically - if no room below, put above
      if (top + controlsHeight > window.innerHeight) {
        top = rect.top - controlsHeight - 10;
        // If still off-screen, force into viewport
        if (top < 10) {
          top = 10;
        }
      }
      this.debugLog(' Auto-positioning widget:', { top, left });
    }
    
    controls.style.position = 'fixed';
    controls.style.top = `${top}px`;
    controls.style.left = `${left}px`;
    controls.style.zIndex = '10000';
    controls.style.cursor = 'move'; // Indicate it's draggable
    
    // Control buttons and speed slider
    controls.innerHTML = this.getWidgetControlsTemplate();
    
    document.body.appendChild(controls);
    
    // Apply current skin
    
    // Apply dark mode if enabled
    if (this.isDarkMode) {
      controls.classList.add('nativemimic-dark-mode');
    }
    
    // Set up control event listeners
    await this.setupControlsEventListeners();
    
    // Add drag functionality
    this.makeDraggable(controls);
    
    // Widget stays persistent - only user can close it with X button
    // No auto-hide timers at all for maximum replay convenience
  }

  async setupControlsEventListeners() {
    const playPauseBtn = document.getElementById('nativemimic-play-pause');
    const stopBtn = document.getElementById('nativemimic-stop');
    const voiceSelect = document.getElementById('nativemimic-voice-select');
    const speedSlider = document.getElementById('nativemimic-speed');
    const speedValue = document.getElementById('nativemimic-speed-value');
    const recordBtn = document.getElementById('nativemimic-record');
    const notesBtn = document.getElementById('nativemimic-notes');
    const feedbackBtn = document.getElementById('nativemimic-feedback');
    const dashboardBtn = document.getElementById('nativemimic-dashboard');
    const closeBtn = document.getElementById('nativemimic-close');
    
    // Initialize custom voice dropdown with retry logic
    const initialLanguage = this.lastSelectedText ? this.detectLanguage(this.lastSelectedText) : 'en';
    this.lastDropdownLanguage = initialLanguage;
    
    // Auto-select best voice for the detected language
    await this.autoSelectBestVoiceForLanguage(initialLanguage);
    this.setupCustomVoiceDropdown();
    
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        // Check if NativeMimic is enabled before allowing any TTS functionality
        if (!this.isEnabled) {
          this.debugLog(' Play button blocked - extension is disabled');
          return;
        }
        
        // Check current state to decide between play/pause/resume
        const isCurrentlyPlaying = (speechSynthesis.speaking && !speechSynthesis.paused) || 
                                  (this.currentAudio && !this.currentAudio.paused);
        const isPaused = speechSynthesis.paused || 
                        (this.currentAudio && this.currentAudio.paused);
        
        // If we manually stopped speech (via stopSpeech), override the paused state
        const isActuallyStopped = !this.isSpeaking && !this.speechInProgress;
        
        this.debugLog(' Play button clicked - Current state:', {
          isCurrentlyPlaying,
          isPaused,
          isActuallyStopped,
          speechSynthesisSpeaking: speechSynthesis.speaking,
          speechSynthesisPaused: speechSynthesis.paused,
          hasCurrentAudio: !!this.currentAudio,
          currentAudioPaused: this.currentAudio?.paused
        });
        
        if (isCurrentlyPlaying) {
          // Currently playing - PAUSE it
          this.debugLog(' Pausing current speech');
          
          if (speechSynthesis.speaking) {
            speechSynthesis.pause();
          }
          
          if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.pause();
          }
          
          this.updatePlayPauseButton('Resume', 'Resume (Ctrl+Shift+P)');
          
        } else if (isPaused && !isActuallyStopped) {
          // Currently paused (but not stopped) - RESUME it
          this.debugLog(' Resuming paused speech');
          
          if (speechSynthesis.paused) {
            speechSynthesis.resume();
          }
          
          if (this.currentAudio && this.currentAudio.paused) {
            this.currentAudio.play();
          }
          
          this.updatePlayPauseButton('Pause', 'Pause (Ctrl+Shift+P)');
          
        } else {
          // Not playing anything - START new speech
          this.debugLog(' Starting new speech');
          
          // Stop any existing speech first
          speechSynthesis.cancel();
          if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
          }
          
          // Reset state
          this.isSpeaking = false;
          this.speechStarted = false;
          this.speechInProgress = false;
          
          // Get current selected text or use last selected text
          let selectedText = window.getSelection().toString().trim();
          if (!selectedText && this.lastSelectedText) {
            selectedText = this.lastSelectedText;
            this.debugLog(' Using remembered text:', selectedText.substring(0, 30));
          }
          
          if (selectedText) {
            this.debugLog(' Starting fresh speech for:', selectedText.substring(0, 30));
            this.speakText(selectedText);
          } else {
            this.debugLog(' No text selected');
            this.showMessage('Please select some text first', 'info');
            this.updatePlayPauseButton('Play', 'No text selected');
          }
        }
      });
    }
    
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        // Check if NativeMimic is enabled before allowing speed changes
        if (!this.isEnabled) {
          this.debugLog(' Speed adjustment blocked - extension is disabled');
          return;
        }
        
        const newRate = parseFloat(e.target.value);
        this.setSpeechRate(newRate); // Use direct rate setter instead of delta adjustment
      });
    }
    
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.debugLog(' Stop button clicked');
        this.stopSpeech();  // Complete stop - no resume possible
        this.updatePlayPauseButton('Play', 'Play');
      });
    }
    
    // Custom dropdown is handled in setupCustomVoiceDropdown()
    
    if (recordBtn) {
      recordBtn.addEventListener('click', () => this.toggleRecording());
    }
    
    if (notesBtn) {
      notesBtn.addEventListener('click', () => this.showPersonalNotesModal());
    }
    
    if (feedbackBtn) {
      feedbackBtn.addEventListener('click', () => this.showFeedbackModal());
    }
    
    if (dashboardBtn) {
      dashboardBtn.addEventListener('click', () => {
        this.debugLog(' Dashboard button clicked');
        this.showDashboard();
      });
    }
    
    const themeBtn = document.getElementById('nativemimic-theme-toggle');
    if (themeBtn) {
      // Set initial icon based on current theme
      themeBtn.textContent = this.isDarkMode ? '☀️' : '🌙';
      themeBtn.title = this.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';
      
      themeBtn.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        speechSynthesis.cancel(); // Stop any ongoing speech
        this.hideSpeechControls();
        this.speechInProgress = false; // Reset for new selections
      });
    }
  }

  hideSpeechControls() {
    const existing = document.getElementById('nativemimic-controls');
    if (existing) {
      this.debugLog(' Removing widget via hideSpeechControls');
      // Clean up any recording state
      this.exitCompareMode();
      this.resetRecordingState();
      existing.remove();
    }
  }

  toggleSpeech() {
    // Check if NativeMimic is enabled before allowing speech toggle
    if (!this.isEnabled) {
      this.debugLog(' Speech toggle blocked - extension is disabled');
      return;
    }
    
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      this.updatePlayPauseButton('Resume', 'Resume (Ctrl+Shift+P)');
    } else if (speechSynthesis.paused) {
      speechSynthesis.resume();
      this.updatePlayPauseButton('Pause', 'Pause (Ctrl+Shift+P)');
    }
  }

  stopSpeech() {
    // Force stop all speech - both system and Google TTS
    speechSynthesis.cancel();
    this.stopSpeechMonitoring(); // Stop monitoring when speech is cancelled
    
    // Stop Google TTS audio if playing
    if (this.currentAudio) {
      this.debugLog(' Stopping Google TTS audio');
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0; // Reset to beginning
      this.currentAudio = null;
    }
    
    // Clear any pending speech
    if (this.currentUtterance) {
      this.currentUtterance.onstart = null;
      this.currentUtterance.onend = null;
      this.currentUtterance.onerror = null;
    }
    
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.speechInProgress = false; // Reset progress flag
    this.speechStarted = false; // Reset start flag
    document.body.classList.remove('nativemimic-speaking');
  }

  adjustSpeed(delta) {
    const newRate = Math.max(0.3, Math.min(2.0, this.speechRate + delta));
    this.speechRate = newRate;
    
    // Save to settings
    try {
      chrome.storage.sync.set({ speechRate: newRate });
    } catch (error) {
      this.debugWarn('Storage unavailable (extension context lost):', error.message);
      // Continue without saving - user can still adjust speed for current session
    }
    
    // Update speed slider if visible
    const speedSlider = document.getElementById('nativemimic-speed');
    const speedValue = document.getElementById('nativemimic-speed-value');
    if (speedSlider) speedSlider.value = newRate;
    if (speedValue) speedValue.textContent = `${newRate.toFixed(1)}x`;
    
    // If currently speaking, restart with new rate
    if (this.currentUtterance && speechSynthesis.speaking) {
      const currentText = this.currentUtterance.text;
      this.stopSpeech();
      
      // Wait longer for speech synthesis to fully clean up and add validation
      setTimeout(() => {
        // Double-check that speech has fully stopped before restarting
        if (!speechSynthesis.speaking && !speechSynthesis.pending) {
          this.speakText(currentText);
        } else {
          // If still not ready, wait a bit more and try again
          setTimeout(() => {
            if (!speechSynthesis.speaking && !speechSynthesis.pending) {
              this.speakText(currentText);
            }
          }, 100);
        }
      }, 200);
    }
  }

  setSpeechRate(newRate) {
    // Direct rate setting (used by speed slider)
    const clampedRate = Math.max(0.3, Math.min(2.0, newRate));
    this.speechRate = clampedRate;
    
    // Save to settings
    try {
      chrome.storage.sync.set({ speechRate: clampedRate });
    } catch (error) {
      this.debugWarn('Storage unavailable (extension context lost):', error.message);
      // Continue without saving - user can still adjust speed for current session
    }
    
    // Update speed slider if visible
    const speedSlider = document.getElementById('nativemimic-speed');
    const speedValue = document.getElementById('nativemimic-speed-value');
    if (speedSlider) speedSlider.value = clampedRate;
    if (speedValue) speedValue.textContent = `${clampedRate.toFixed(1)}x`;
    
    // If currently speaking, update playback rate immediately
    if (this.currentAudio && !this.currentAudio.paused) {
      // Google TTS audio - update playback rate directly
      this.currentAudio.playbackRate = clampedRate;
      console.log(`💰 Google TTS Cost: $0.0000 (SPEED CHANGE) | Playback rate: ${clampedRate}x`);
    } else if (this.currentUtterance && speechSynthesis.speaking) {
      // System voice - restart with new rate
      const currentText = this.currentUtterance.text;
      this.stopSpeech();
      
      // Wait for speech synthesis to fully clean up and restart
      setTimeout(() => {
        if (!speechSynthesis.speaking && !speechSynthesis.pending) {
          this.speakText(currentText);
        } else {
          // If still not ready, wait a bit more and try again
          setTimeout(() => {
            if (!speechSynthesis.speaking && !speechSynthesis.pending) {
              this.speakText(currentText);
            }
          }, 100);
        }
      }, 200);
    }
  }

  updatePlayPauseButton(icon, title) {
    const playPauseBtn = document.getElementById('nativemimic-play-pause');
    if (playPauseBtn) {
      playPauseBtn.innerHTML = icon;
      playPauseBtn.title = title;
    }
  }

  startSpeechMonitoring() {
    // Clear any existing monitoring
    if (this.speechMonitorInterval) {
      clearInterval(this.speechMonitorInterval);
    }
    
    // Monitor speech state every 200ms for accurate button updates
    this.speechMonitorInterval = setInterval(() => {
      const isCurrentlySpeaking = speechSynthesis.speaking && !speechSynthesis.paused;
      const isCurrentlyPaused = speechSynthesis.paused;
      
      if (isCurrentlySpeaking) {
        // Speech is active - ensure pause button is shown
        this.updatePlayPauseButton('Pause', 'Pause (Ctrl+Shift+P)');
      } else if (isCurrentlyPaused) {
        // Speech is paused - ensure resume/play button is shown
        this.updatePlayPauseButton('Resume', 'Resume (Ctrl+Shift+P)');
      } else if (!speechSynthesis.speaking && this.isSpeaking) {
        // Speech has ended - clean up
        this.stopSpeechMonitoring();
        this.onSpeechEnd();
      }
    }, 200);
    
    // Auto-stop monitoring after 30 seconds as failsafe
    setTimeout(() => {
      this.stopSpeechMonitoring();
    }, 30000);
  }

  stopSpeechMonitoring() {
    if (this.speechMonitorInterval) {
      clearInterval(this.speechMonitorInterval);
      this.speechMonitorInterval = null;
    }
  }

  showSkinSelector() {
    // Remove any existing settings modal
    const existing = document.getElementById('nativemimic-settings-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'nativemimic-settings-modal';
    modal.className = 'nativemimic-modal';
    
    modal.innerHTML = `
      <div class="nativemimic-modal-overlay">
        <div class="nativemimic-modal-content">
          <div class="nativemimic-modal-header">
            <h3>Settings</h3>
            <button class="nativemimic-modal-close">✕</button>
          </div>
          <div class="nativemimic-modal-body">
            <!-- Theme Section -->
            <div class="nativemimic-settings-section">
              <h4>🎨 Theme</h4>
              <div class="nativemimic-theme-options">
                <button id="themeToggle" class="nativemimic-settings-btn">
                  <span id="themeIcon">${this.isDarkMode ? '☀️' : '🌙'}</span>
                  <span id="themeText">${this.isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>
            </div>
            
            <!-- Keyboard Shortcuts Section -->
            <div class="nativemimic-settings-section">
              <h4>⌨️ Keyboard Shortcuts</h4>
              <div class="nativemimic-shortcuts-list">
                <div class="nativemimic-shortcut-item">
                  <span class="nativemimic-shortcut-key">Ctrl+Shift+S</span>
                  <span class="nativemimic-shortcut-desc">Play/Pause Speech</span>
                </div>
                <div class="nativemimic-shortcut-item">
                  <span class="nativemimic-shortcut-key">Ctrl+Shift+P</span>
                  <span class="nativemimic-shortcut-desc">Pause/Resume</span>
                </div>
                <div class="nativemimic-shortcut-item">
                  <span class="nativemimic-shortcut-key">Ctrl+Shift+X</span>
                  <span class="nativemimic-shortcut-desc">Stop Speech</span>
                </div>
                <div class="nativemimic-shortcut-item">
                  <span class="nativemimic-shortcut-key">Ctrl+Shift+Plus</span>
                  <span class="nativemimic-shortcut-desc">Speed Up</span>
                </div>
                <div class="nativemimic-shortcut-item">
                  <span class="nativemimic-shortcut-key">Ctrl+Shift+Minus</span>
                  <span class="nativemimic-shortcut-desc">Slow Down</span>
                </div>
              </div>
            </div>
            
            <!-- Tools & Data Section -->
            <div class="nativemimic-settings-section">
              <h4>📊 Tools & Data</h4>
              <div class="nativemimic-theme-options">
                <button id="dashboardBtn" class="nativemimic-settings-btn">📊 View Dashboard</button>
                <button id="bugReportBtn" class="nativemimic-settings-btn">🐛 Report Bug</button>
              </div>
            </div>
          </div>
          
          <div class="nativemimic-modal-footer">
            <button class="nativemimic-btn" onclick="this.closest('.nativemimic-modal').remove()">Close</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Apply current theme to modal
    this.applyTheme(modal);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.nativemimic-modal-close');
    closeBtn.addEventListener('click', () => modal.remove());
    
    // Theme toggle
    const themeToggleBtn = modal.querySelector('#themeToggle');
    const themeIcon = modal.querySelector('#themeIcon');
    const themeText = modal.querySelector('#themeText');
    
    themeToggleBtn.addEventListener('click', () => {
      this.toggleTheme();
      // Update button text immediately
      themeIcon.textContent = this.isDarkMode ? '☀️' : '🌙';
      themeText.textContent = this.isDarkMode ? 'Light Mode' : 'Dark Mode';
    });
    
    // Dashboard button
    const dashboardBtn = modal.querySelector('#dashboardBtn');
    dashboardBtn.addEventListener('click', () => {
      modal.remove(); // Close settings modal
      this.showDashboard(); // Open dashboard
    });
    
    // Bug report button
    const bugReportBtn = modal.querySelector('#bugReportBtn');
    bugReportBtn.addEventListener('click', () => {
      modal.remove(); // Close settings modal
      this.showBugReportModal(); // Open bug report
    });
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('nativemimic-modal-overlay')) {
        modal.remove();
      }
    });
  }


  saveThemeSettings() {
    const themeSettings = {
      isDarkMode: this.isDarkMode
    };
    chrome.storage.sync.set({ themeSettings });
  }

  applyTheme(modal) {
    if (this.isDarkMode) {
      modal.classList.add('nativemimic-dark-mode');
    } else {
      modal.classList.remove('nativemimic-dark-mode');
    }
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    this.saveThemeSettings();
    
    // Update theme toggle button
    const themeToggleBtn = document.getElementById('nativemimic-theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.textContent = this.isDarkMode ? '☀️' : '🌙';
      themeToggleBtn.title = this.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';
    }
    
    // Apply theme to widget
    const controls = document.getElementById('nativemimic-controls');
    if (controls) {
      if (this.isDarkMode) {
        controls.classList.add('nativemimic-dark-mode');
      } else {
        controls.classList.remove('nativemimic-dark-mode');
      }
    }
    
    // Apply theme to any open modals
    const modals = document.querySelectorAll('.nativemimic-modal');
    modals.forEach(modal => this.applyTheme(modal));
  }

  async populateVoiceOptionsWithRetry(voiceSelect) {
    if (!voiceSelect) return;
    
    // Initial attempt
    await this.populateVoiceOptions(voiceSelect);
    
    // If no system voices were found, retry multiple times
    if (this.availableVoices.length <= 1) { // Sometimes only default voice shows up initially
      this.debugLog(' Few system voices found, retrying with delays...');
      
      // Retry 1: After 500ms
      setTimeout(async () => {
        const voices = speechSynthesis.getVoices();
        if (voices.length > this.availableVoices.length) {
          this.debugLog(' Retry 1 - Found more voices:', voices.length);
          this.availableVoices = voices;
          await this.populateVoiceOptions(voiceSelect);
        }
      }, 500);
      
      // Retry 2: After 1.5 seconds  
      setTimeout(async () => {
        const voices = speechSynthesis.getVoices();
        if (voices.length > this.availableVoices.length) {
          this.debugLog(' Retry 2 - Found more voices:', voices.length);
          this.availableVoices = voices;
          await this.populateVoiceOptions(voiceSelect);
        }
      }, 1500);
    }
    
    // If ElevenLabs client isn't initialized yet, retry after delay
    if (!window.elevenLabsClient?.isInitialized) {
      this.debugLog(' ElevenLabs not ready, will retry in 2 seconds...');
      setTimeout(async () => {
        await this.populateVoiceOptions(voiceSelect);
      }, 2000);
    }
  }

  async populateVoiceOptions(voiceSelect) {
    if (!voiceSelect) return;
    
    this.debugLog(' Populating voice options...');
    
    // Always refresh voices to ensure we have the latest
    this.debugLog(' Current cached voices:', this.availableVoices.length);
    const freshVoices = speechSynthesis.getVoices();
    this.debugLog(' Fresh voices from speechSynthesis:', freshVoices.length);
    
    if (freshVoices.length > 0) {
      this.availableVoices = freshVoices;
      this.debugLog(' Updated to fresh voices');
    } else if (this.availableVoices.length === 0) {
      this.debugLog(' No voices available, will retry');
    }
    
    this.debugLog(' Available voices count:', this.availableVoices.length);
    this.debugLog(' First 5 system voices:', this.availableVoices.slice(0, 5).map(v => `${v.name} (${v.lang}) [${v.voiceURI}]`));
    this.debugLog(' ElevenLabs client initialized:', window.elevenLabsClient?.isInitialized);
    
    // Clear existing options
    voiceSelect.innerHTML = '';
    
    // Add system voices
    const systemGroup = document.createElement('optgroup');
    systemGroup.label = '🔊 System Voices';
    
    this.debugLog(' Adding system voices to dropdown...');
    
    this.availableVoices.forEach((voice, index) => {
      if (voice && voice.name && voice.voiceURI) {
        const option = document.createElement('option');
        option.value = voice.voiceURI;
        option.textContent = `${voice.name} (${voice.lang || 'unknown'})`;
        if (this.selectedVoice && this.selectedVoice.voiceURI === voice.voiceURI) {
          option.selected = true;
        }
        systemGroup.appendChild(option);
        if (index < 5) {
          console.log(`NativeMimic: Added voice ${index + 1}: ${voice.name} (${voice.lang}) [${voice.voiceURI}]`);
        }
      } else {
        console.log(`NativeMimic: Skipping invalid voice at index ${index}:`, voice);
      }
    });
    
    this.debugLog(' Added', systemGroup.children.length, 'system voices to dropdown');
    
    voiceSelect.appendChild(systemGroup);
    
    // Add Google TTS premium voices if available
    if (window.googleTTSClient && window.googleTTSClient.isInitialized) {
      try {
        this.debugLog(' Adding Google TTS voices...');
        const googleGroup = document.createElement('optgroup');
        googleGroup.label = '🎙️ High Quality Voices';
        
        // Get preset voices first (faster than API call)
        const presetVoices = window.googleTTSClient.getPresetVoices();
        console.log('Google TTS preset voices:', Object.keys(presetVoices));
        
        Object.entries(presetVoices).forEach(([key, voice]) => {
          console.log(`Adding Google TTS voice: ${voice.name} (${voice.id})`);
          const option = document.createElement('option');
          option.value = `google-tts:${voice.id}`;
          option.textContent = `🎙️ ${voice.name}`;
          if (this.selectedVoice && this.selectedVoice.type === 'google-tts' && this.selectedVoice.id === voice.id) {
            option.selected = true;
          }
          googleGroup.appendChild(option);
        });
        
        voiceSelect.appendChild(googleGroup);
        
      } catch (error) {
        this.debugLog(' Could not load Google TTS voices:', error);
      }
    } else {
      // No Google TTS available - show info option
      const googleGroup = document.createElement('optgroup');
      googleGroup.label = '🎙️ High Quality Voices';
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '🎙️ Premium voices available with subscription';
      option.disabled = true;
      googleGroup.appendChild(option);
      voiceSelect.appendChild(googleGroup);
    }
    
    // Add ElevenLabs premium voices if API key is available
    this.debugLog(' Checking ElevenLabs status:', {
      clientExists: !!window.elevenLabsClient,
      clientInitialized: window.elevenLabsClient?.isInitialized,
      hasApiKey: !!window.elevenLabsClient?.apiKey
    });
    
    if (window.elevenLabsClient && window.elevenLabsClient.isInitialized) {
      try {
        this.debugLog(' Adding ElevenLabs voices...');
        const premiumGroup = document.createElement('optgroup');
        premiumGroup.label = '🎭 Premium AI Voices (ElevenLabs)';
        
        // Get preset voices first (faster than API call)
        const presetVoices = window.elevenLabsClient.getPresetVoices();
        console.log('ElevenLabs preset voices:', Object.keys(presetVoices));
        
        Object.entries(presetVoices).forEach(([key, voice]) => {
          console.log(`Adding ElevenLabs voice: ${voice.name} (${voice.id})`);
          const option = document.createElement('option');
          option.value = `elevenlabs:${voice.id}`;
          option.textContent = `✨ ${voice.name} - ${voice.description}`;
          if (this.selectedVoice && this.selectedVoice.type === 'elevenlabs' && this.selectedVoice.id === voice.id) {
            option.selected = true;
          }
          premiumGroup.appendChild(option);
        });
        
        voiceSelect.appendChild(premiumGroup);
        
        // Load ALL available voices from API (deduplicated)
        try {
          this.debugLog(' Loading full ElevenLabs voice list...');
          const voices = await window.elevenLabsClient.getAvailableVoices();
          this.debugLog(' Found', voices.length, 'ElevenLabs voices from API');
          
          // Track already added preset voice IDs to avoid duplicates
          const presetVoiceIds = new Set(Object.values(presetVoices).map(v => v.id));
          
          voices.forEach(voice => {
            // Skip if this voice was already added as a preset
            if (!presetVoiceIds.has(voice.voice_id)) {
              const option = document.createElement('option');
              option.value = `elevenlabs:${voice.voice_id}`;
              option.textContent = `✨ ${voice.name}`;
              if (this.selectedVoice && this.selectedVoice.type === 'elevenlabs' && this.selectedVoice.id === voice.voice_id) {
                option.selected = true;
              }
              premiumGroup.appendChild(option);
            }
          });
        } catch (apiError) {
          this.debugLog(' Could not load full voice list, using presets only:', apiError);
        }
        
      } catch (error) {
        this.debugLog(' Could not load ElevenLabs voices:', error);
        
        // Add placeholder if API fails
        const premiumGroup = document.createElement('optgroup');
        premiumGroup.label = '🎭 Premium AI Voices';
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Premium voices unavailable';
        option.disabled = true;
        premiumGroup.appendChild(option);
        voiceSelect.appendChild(premiumGroup);
      }
    } else {
      // No API key - show upgrade option
      const premiumGroup = document.createElement('optgroup');
      premiumGroup.label = '🎭 Premium AI Voices';
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '⬆️ Add ElevenLabs API key for premium voices';
      option.disabled = true;
      premiumGroup.appendChild(option);
      voiceSelect.appendChild(premiumGroup);
    }
    
    // Load saved voice selection
    try {
      const result = await chrome.storage.sync.get(['selectedVoiceURI']);
      if (result.selectedVoiceURI) {
        this.debugLog(' Restoring saved voice:', result.selectedVoiceURI);
        const savedOption = voiceSelect.querySelector(`option[value="${result.selectedVoiceURI}"]`);
        if (savedOption) {
          savedOption.selected = true;
          this.debugLog(' Voice selection restored');
        } else {
          this.debugLog(' Saved voice not found in current options');
        }
      }
    } catch (error) {
      this.debugLog(' Could not restore voice selection:', error);
    }
    
    this.debugLog(' Voice options populated - Total options:', voiceSelect.options.length);
  }

  async setupCustomVoiceDropdown() {
    const dropdown = document.getElementById('nativemimic-voice-dropdown');
    const selected = document.getElementById('nativemimic-voice-selected');
    const options = document.getElementById('nativemimic-voice-options');
    
    if (!dropdown || !selected || !options) {
      this.debugLog(' Custom dropdown elements not found');
      return;
    }
    
    // Populate dropdown with voices
    await this.populateCustomDropdown();
    
    // Remove existing event listeners to prevent duplicates
    if (this.dropdownClickHandler) {
      selected.removeEventListener('click', this.dropdownClickHandler);
      document.removeEventListener('click', this.dropdownOutsideClickHandler);
    }
    
    // Create new event handlers and store references
    this.dropdownClickHandler = (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains('open');
      
      if (isOpen) {
        dropdown.classList.remove('open');
        options.style.display = 'none';
        this.debugLog(' Custom dropdown closed');
      } else {
        dropdown.classList.add('open');
        options.style.display = 'block';
        
        // Check if dropdown should appear above to avoid going below viewport
        const dropdownRect = dropdown.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = 200; // max-height from CSS
        const spaceBelow = viewportHeight - dropdownRect.bottom;
        const spaceAbove = dropdownRect.top;
        
        if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
          options.classList.add('dropdown-above');
          this.debugLog(' Dropdown positioned above (insufficient space below)');
        } else {
          options.classList.remove('dropdown-above');
          this.debugLog(' Dropdown positioned below (normal)');
        }
        
        this.debugLog(' Custom dropdown opened');
      }
    };
    
    this.dropdownOutsideClickHandler = (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
        options.style.display = 'none';
      }
    };
    
    // Add new event listeners
    selected.addEventListener('click', this.dropdownClickHandler);
    document.addEventListener('click', this.dropdownOutsideClickHandler);
  }

  async populateCustomDropdown() {
    const selected = document.getElementById('nativemimic-voice-selected');
    const options = document.getElementById('nativemimic-voice-options');
    
    if (!selected || !options) return;
    
    // Refresh voices
    const freshVoices = speechSynthesis.getVoices();
    if (freshVoices.length > 0) {
      this.availableVoices = freshVoices;
    }
    
    let optionsHTML = '';
    let totalOptions = 0;

    // Use language-specific voices if available (auto-detected from current text)
    const currentLanguage = this.lastSelectedText ? this.detectLanguage(this.lastSelectedText) : 'en';
    
    // Ensure Google TTS voices are loaded for the current language
    if (window.googleTTSClient) {
      if (!window.googleTTSClient.isInitialized) {
        this.debugLog(' Google TTS client not initialized, attempting to initialize...');
        try {
          const initialized = await window.googleTTSClient.initialize();
          if (initialized) {
            this.debugLog(' Google TTS client initialized successfully');
          } else {
            this.debugLog(' Google TTS client initialization failed');
          }
        } catch (error) {
          this.debugLog(' Error initializing Google TTS:', error);
        }
      }
      
      if (window.googleTTSClient.isInitialized) {
        this.debugLog(' Loading Google TTS voices for current language:', currentLanguage);
        await this.loadVoicesForCurrentLanguage(currentLanguage);
      } else {
        this.debugLog(' Google TTS client still not ready, using system voices only');
      }
    } else {
      this.debugLog(' Google TTS client not available');
    }
    
    if (this.currentLanguageVoices.length > 0) {
      this.debugLog(' Using language-specific voices for', currentLanguage, '- Total:', this.currentLanguageVoices.length);
      
      // Group voices by type
      const googleTtsVoices = this.currentLanguageVoices.filter(v => v.type === 'google-tts');
      const systemVoices = this.currentLanguageVoices.filter(v => v.type === 'system');
      
      // Add Google TTS voices first (highest quality)
      if (googleTtsVoices.length > 0) {
        const languageName = this.getLanguageName(currentLanguage);
        optionsHTML += `<div class="nativemimic-voice-group">🎙️ ${languageName} (High Quality)</div>`;
        
        googleTtsVoices.slice(0, 12).forEach(voice => { // Show up to 12 voices
          const isSelected = this.selectedVoice && this.selectedVoice.type === 'google-tts' && this.selectedVoice.id === voice.id;
          optionsHTML += `<div class="nativemimic-voice-option premium-voice recommended ${isSelected ? 'selected' : ''}" data-value="google-tts:${voice.id}" data-type="google-tts">
            ${voice.name}
          </div>`;
          totalOptions++;
        });
      }
      
      
      // Add minimal system voices (just 2 best ones)
      if (systemVoices.length > 0) {
        const languageName = this.getLanguageName(currentLanguage);
        optionsHTML += `<div class="nativemimic-voice-group">🔊 ${languageName} (Standard)</div>`;
        
        // Show only the 2 best system voices
        systemVoices.slice(0, 2).forEach(voice => {
          const isSelected = this.selectedVoice && this.selectedVoice.voiceURI === voice.voiceURI;
          optionsHTML += `<div class="nativemimic-voice-option system-voice ${isSelected ? 'selected' : ''}" data-value="${voice.voiceURI}" data-type="system">
            🔊 ${voice.name}
          </div>`;
          totalOptions++;
        });
      }
      
    } else {
      // Fallback to old multi-language logic
      this.debugLog(' Using multi-language mode or no session language set');
      
      // Detect language of selected text for intelligent voice filtering
      const detectedLanguage = this.lastSelectedText ? this.detectLanguage(this.lastSelectedText) : 'en';
      this.debugLog(' Selected text:', this.lastSelectedText?.substring(0, 50));
      this.debugLog(' Detected language:', detectedLanguage);
      this.debugLog(' Total available voices:', this.availableVoices.length);

      // Add ElevenLabs premium voices first (better quality) - filtered by language
    if (window.elevenLabsClient && window.elevenLabsClient.isInitialized) {
      const presetVoices = window.elevenLabsClient.getPresetVoices();
      const matchingElevenLabsVoices = [];
      const otherElevenLabsVoices = [];
      
      // Filter ElevenLabs voices by detected language
      Object.entries(presetVoices).forEach(([key, voice]) => {
        const voiceLangMatch = key.startsWith(detectedLanguage + '-') || 
                              (detectedLanguage === 'en' && key.startsWith('en-'));
        if (voiceLangMatch) {
          matchingElevenLabsVoices.push([key, voice]);
        } else {
          otherElevenLabsVoices.push([key, voice]);
        }
      });
      
      // Add matching language premium voices first
      if (matchingElevenLabsVoices.length > 0) {
        const languageName = this.getLanguageName(detectedLanguage);
        optionsHTML += `<div class="nativemimic-voice-group">🎭 ${languageName} Premium AI Voices (Best Quality)</div>`;
        
        matchingElevenLabsVoices.forEach(([key, voice]) => {
          const isSelected = this.selectedVoice && this.selectedVoice.type === 'elevenlabs' && this.selectedVoice.id === voice.id;
          optionsHTML += `<div class="nativemimic-voice-option premium-voice recommended ${isSelected ? 'selected' : ''}" data-value="elevenlabs:${voice.id}" data-type="elevenlabs">
            <span class="premium-badge">💎 PREMIUM</span> ${voice.name} <span class="voice-desc">${voice.description}</span>
          </div>`;
          totalOptions++;
        });
      }
      
      // Add other premium voices (limited)
      if (otherElevenLabsVoices.length > 0) {
        optionsHTML += '<div class="nativemimic-voice-group">🎭 Other Premium AI Voices</div>';
        
        // Show only first 3 other premium voices to avoid clutter
        otherElevenLabsVoices.slice(0, 3).forEach(([key, voice]) => {
          const isSelected = this.selectedVoice && this.selectedVoice.type === 'elevenlabs' && this.selectedVoice.id === voice.id;
          optionsHTML += `<div class="nativemimic-voice-option premium-voice ${isSelected ? 'selected' : ''}" data-value="elevenlabs:${voice.id}" data-type="elevenlabs">
            <span class="premium-badge">💎 PREMIUM</span> ${voice.name} <span class="voice-desc">${voice.description}</span>
          </div>`;
          totalOptions++;
        });
      }
    }

    // Filter and organize system voices by language
    if (this.availableVoices.length > 0) {
      this.debugLog(' Filtering', this.availableVoices.length, 'system voices for language:', detectedLanguage);
      
      // Separate voices by language match
      const matchingVoices = [];
      const otherVoices = [];
      
      this.availableVoices.forEach(voice => {
        if (voice && voice.name && voice.voiceURI) {
          const voiceLang = voice.lang ? voice.lang.toLowerCase().substring(0, 2) : 'en';
          console.log(`Voice: ${voice.name} | Voice Lang: ${voiceLang} | Detected: ${detectedLanguage} | Match: ${voiceLang === detectedLanguage}`);
          
          if (voiceLang === detectedLanguage) {
            matchingVoices.push(voice);
          } else {
            otherVoices.push(voice);
          }
        }
      });
      
      console.log(`NativeMimic: Found ${matchingVoices.length} matching voices, ${otherVoices.length} other voices`);
      
      // Show matching language voices as recommended
      if (matchingVoices.length > 0) {
        const languageName = this.getLanguageName(detectedLanguage);
        optionsHTML += `<div class="nativemimic-voice-group">🔊 ${languageName} (Standard)</div>`;
        
        matchingVoices.forEach(voice => {
          const isSelected = this.selectedVoice && this.selectedVoice.voiceURI === voice.voiceURI;
          optionsHTML += `<div class="nativemimic-voice-option system-voice recommended ${isSelected ? 'selected' : ''}" data-value="${voice.voiceURI}" data-type="system">
            🔊 ${voice.name} <span class="voice-lang">(${voice.lang || 'unknown'})</span>
          </div>`;
          totalOptions++;
        });
      }
      
      // Show limited other system voices only if user wants to see them
      if (otherVoices.length > 0) {
        optionsHTML += '<div class="nativemimic-voice-group">🔊 Other (Standard)</div>';
        
        // Show only first 15 other voices to avoid overwhelming
        const displayOtherVoices = otherVoices.slice(0, 15);
        displayOtherVoices.forEach(voice => {
          const isSelected = this.selectedVoice && this.selectedVoice.voiceURI === voice.voiceURI;
          optionsHTML += `<div class="nativemimic-voice-option system-voice ${isSelected ? 'selected' : ''}" data-value="${voice.voiceURI}" data-type="system">
            🔊 ${voice.name} <span class="voice-lang">(${voice.lang || 'unknown'})</span>
          </div>`;
          totalOptions++;
        });
        
        if (otherVoices.length > 15) {
          optionsHTML += `<div class="nativemimic-voice-option" data-disabled="true" style="font-style: italic; color: #666;">+ ${otherVoices.length - 15} more system voices...</div>`;
        }
      }
    }
    } // End of multi-language mode else block
    
    options.innerHTML = optionsHTML;
    
    // Update selected display
    if (this.selectedVoice) {
      // Check if the selected voice is still relevant for the current language
      const detectedLanguage = this.lastSelectedText ? this.detectLanguage(this.lastSelectedText) : 'en';
      const shouldClearSelection = this.selectedVoice.type === 'system' && 
                                 this.selectedVoice.lang && 
                                 !this.selectedVoice.lang.startsWith(detectedLanguage);
      
      if (shouldClearSelection) {
        this.debugLog(' Clearing voice selection due to language change:', this.selectedVoice.name, 'not suitable for', detectedLanguage);
        this.selectedVoice = null;
        selected.querySelector('span').textContent = 'Auto-select by language';
      } else if (this.selectedVoice.type === 'elevenlabs') {
        const voiceName = this.getElevenLabsVoiceName(this.selectedVoice.id);
        selected.querySelector('span').textContent = `✨ ${voiceName}`;
      } else if (this.selectedVoice.type === 'google-tts') {
        // Google TTS voice - use language property and clean up display
        const langCode = this.selectedVoice.language || '';
        const displayText = langCode ? `${this.selectedVoice.name}` : this.selectedVoice.name;
        selected.querySelector('span').textContent = displayText;
      } else {
        // System voice - use lang property
        const langCode = this.selectedVoice.lang || '';
        const displayText = langCode ? `${this.selectedVoice.name} (${this.selectedVoice.lang})` : this.selectedVoice.name;
        selected.querySelector('span').textContent = displayText;
      }
    } else {
      selected.querySelector('span').textContent = window.elevenLabsClient?.isInitialized ? 
        '✨ Antoni (Default)' : 'Auto-select by language';
    }
    
    // Add click handlers to options
    options.querySelectorAll('.nativemimic-voice-option').forEach(option => {
      if (!option.dataset.disabled) {
        option.addEventListener('click', async (e) => {
          await this.handleVoiceSelection(option.dataset.value, option.textContent.trim());
        });
      }
    });
    
    this.debugLog(' Custom dropdown populated with', totalOptions, 'voices');
  }

  // ElevenLabs support removed - keeping stub for backward compatibility
  getElevenLabsVoiceName(voiceId) {
    return 'Google TTS Voice';
  }

  getLanguageName(langCode) {
    const languageNames = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French', 
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'da': 'Danish',
      'no': 'Norwegian',
      'fi': 'Finnish',
      'pl': 'Polish',
      'tr': 'Turkish',
      'el': 'Greek'
    };
    return languageNames[langCode] || langCode.toUpperCase();
  }

  async autoSelectBestVoiceForLanguage(languageCode) {
    this.debugLog(' Auto-selecting best voice for language:', languageCode);
    
    // Load voices for the current language
    await this.loadVoicesForCurrentLanguage(languageCode);
    
    // Clear current selection
    this.selectedVoice = null;
    
    // Prefer Google TTS voices first (better quality)
    const googleTTSVoices = this.currentLanguageVoices.filter(voice => 
      voice && voice.type === 'google-tts'
    );
    
    if (googleTTSVoices.length > 0) {
      // Select first Google TTS voice for the language
      const firstGoogleVoice = googleTTSVoices[0];
      this.selectedVoice = {
        type: 'google-tts',
        id: firstGoogleVoice.id,
        name: firstGoogleVoice.name,
        language: firstGoogleVoice.language
      };
      this.debugLog(' Auto-selected Google TTS voice:', this.selectedVoice.name, 'for', languageCode);
      return;
    }
    
    // Fallback: Try to find best system voice for this language
    const matchingSystemVoices = this.availableVoices.filter(voice => 
      voice && voice.lang && voice.lang.toLowerCase().startsWith(languageCode)
    );
    
    if (matchingSystemVoices.length > 0) {
      // Select first available system voice for the language
      this.selectedVoice = matchingSystemVoices[0];
      this.debugLog(' Auto-selected system voice:', this.selectedVoice.name, 'for', languageCode);
      return;
    }
    
    this.debugLog(' No suitable voice found for', languageCode, '- will use auto-detection');
  }



  async loadVoicesForCurrentLanguage(languageCode) {
    if (!languageCode) return;
    
    this.debugLog(' Loading voices for current language:', languageCode);
    
    // Load premium voices for this language (Google TTS)
    this.currentLanguageVoices = [];
    
    // Load Google TTS voices first
    this.debugLog(' Checking Google TTS availability:', {
      clientExists: !!window.googleTTSClient,
      clientInitialized: window.googleTTSClient?.isInitialized,
      currentLanguage: languageCode
    });
    
    if (window.googleTTSClient && window.googleTTSClient.isInitialized) {
      try {
        this.debugLog(' Loading Google TTS voices for current language:', languageCode);
        const googleTTSLangCode = this.mapToGoogleTTSLanguage(languageCode);
        this.debugLog(' Mapped to Google TTS language code:', googleTTSLangCode);
        
        // Test backend connectivity directly
        try {
          const serverUrl = window.NATIVEMIMIC_CONFIG?.GOOGLE_TTS_SERVER_URL || 'https://fbgegchcosrkawsniyco.supabase.co/functions/v1/google-tts';
          const headers = {
            'Authorization': `Bearer ${window.NATIVEMIMIC_CONFIG?.SUPABASE_ANON_KEY}`,
            'apikey': window.NATIVEMIMIC_CONFIG?.SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          };
          const response = await fetch(`${serverUrl}/health`, { headers });
          if (response.ok) {
            this.debugLog(' Backend server is reachable');
          } else {
            this.debugLog(' Backend server returned error:', response.status);
          }
        } catch (backendError) {
          this.debugLog(' Backend server unreachable:', backendError);
        }
        
        const googleVoices = await window.googleTTSClient.getVoices(googleTTSLangCode);
        
        this.debugLog(' Google TTS getVoices returned:', googleVoices);
        
        if (googleVoices && googleVoices.length > 0) {
          this.debugLog(' Found', googleVoices.length, 'Google TTS voices for', languageCode);
          // Transform Google TTS voices to add type property
          const transformedVoices = googleVoices.map(voice => ({
            type: 'google-tts',
            id: voice.id,
            name: voice.name,
            language: voice.language,
            gender: voice.gender
          }));
          this.currentLanguageVoices.push(...transformedVoices);
        } else {
          this.debugLog(' No Google TTS voices found for', languageCode);
          // Try to get preset voices as fallback
          const presetVoices = window.googleTTSClient.getPresetVoices();
          this.debugLog(' Trying preset voices as fallback:', Object.keys(presetVoices));
          
          Object.entries(presetVoices).forEach(([key, voice]) => {
            if (voice.language.startsWith(googleTTSLangCode)) {
              this.currentLanguageVoices.push({
                type: 'google-tts',
                id: voice.id,
                name: voice.name,
                language: voice.language,
                gender: voice.gender,
                description: `Google TTS Voice`
              });
            }
          });
          this.debugLog(' Added', this.currentLanguageVoices.filter(v => v.type === 'google-tts').length, 'preset Google TTS voices');
        }
      } catch (error) {
        this.debugLog(' Error loading Google TTS voices:', error);
      }
    } else {
      this.debugLog(' Google TTS not available - client exists:', !!window.googleTTSClient, 'initialized:', window.googleTTSClient?.isInitialized);
    }
    
    // Add system voices for the current language
    const systemVoices = this.availableVoices.filter(voice => {
      if (!voice || !voice.lang) return false;
      return voice.lang.toLowerCase().startsWith(languageCode);
    });
    
    systemVoices.forEach(voice => {
      this.currentLanguageVoices.push({
        type: 'system',
        voiceURI: voice.voiceURI,
        name: voice.name,
        lang: voice.lang,
        description: `${voice.lang} System Voice`
      });
    });
    
    this.debugLog(' Loaded', this.currentLanguageVoices.length, 'voices for', languageCode);
  }


  showSettingsModal() {
    this.debugLog(' Opening settings modal');
    
    // Remove any existing settings modal
    const existing = document.getElementById('nativemimic-settings-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.className = 'nativemimic-modal';
    modal.id = 'nativemimic-settings-modal';
    modal.innerHTML = this.getSettingsModalTemplate();
    
    document.body.appendChild(modal);
    this.applyTheme(modal);
    
    // Set up event handlers
    this.setupSettingsModalEvents(modal);
    
  }
  
  setupSettingsModalEvents(modal) {
    // Close button handlers
    modal.querySelectorAll('.nativemimic-modal-close').forEach(btn => {
      btn.addEventListener('click', () => modal.remove());
    });
    
    const closeSettingsBtn = modal.querySelector('#nativemimic-close-settings');
    if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', () => modal.remove());
    }
    
    // Click outside to close
    const overlay = modal.querySelector('.nativemimic-modal-overlay');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) modal.remove();
    });
    
    // Dashboard button
    const dashboardBtn = modal.querySelector('#dashboardBtn');
    if (dashboardBtn) {
      dashboardBtn.addEventListener('click', () => {
        modal.remove(); // Close settings modal
        this.showDashboard(); // Open dashboard
      });
    }
  }
  

  updateToggleButton(button) {
    if (this.isEnabled) {
      button.textContent = '⏸️';
      button.title = 'Disable extension';
      button.className = 'nativemimic-toggle-btn enabled';
    } else {
      button.textContent = '▶️';
      button.title = 'Enable extension';
      button.className = 'nativemimic-toggle-btn disabled';
    }
  }

  async handleVoiceSelection(value, displayName) {
    this.debugLog(' Voice selected:', value, displayName);
    
    const dropdown = document.getElementById('nativemimic-voice-dropdown');
    const selected = document.getElementById('nativemimic-voice-selected');
    const options = document.getElementById('nativemimic-voice-options');
    
    if (value.startsWith('google-tts:')) {
      // Google TTS premium voice selected
      const voiceId = value.replace('google-tts:', '');
      this.selectedVoice = { type: 'google-tts', id: voiceId };
    } else if (value.startsWith('elevenlabs:')) {
      // ElevenLabs premium voice selected
      const voiceId = value.replace('elevenlabs:', '');
      this.selectedVoice = { type: 'elevenlabs', id: voiceId };
    } else {
      // System voice selected
      this.selectedVoice = this.availableVoices.find(voice => voice.voiceURI === value);
    }
    
    // Update display
    selected.querySelector('span').textContent = displayName;
    
    // Update option selection states
    options.querySelectorAll('.nativemimic-voice-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    options.querySelector(`[data-value="${value}"]`).classList.add('selected');
    
    // Close dropdown
    dropdown.classList.remove('open');
    options.style.display = 'none';
    
    // Save selection
    try {
      await chrome.storage.sync.set({ selectedVoiceURI: value });
    } catch (error) {
      this.debugWarn('Storage unavailable (extension context lost):', error.message);
      // Continue without saving - voice selection still works for current session
    }
    
    this.debugLog(' Voice selection saved:', this.selectedVoice);
  }

  repositionWidget(controls, range) {
    // Reposition existing widget without recreating it
    const controlsWidth = 350;
    const controlsHeight = 80;
    
    let top, left;
    
    // Check if we should use remembered position or move to new selection
    const rect = range.getBoundingClientRect();
    const shouldUseRememberedPosition = this.userDraggedWidget && this.lastWidgetPosition && this.isSelectionNearWidget(rect);
    
    if (shouldUseRememberedPosition) {
      // Use last dragged position only if selection is nearby
      top = this.lastWidgetPosition.top;
      left = this.lastWidgetPosition.left;
      this.debugLog(' Using remembered position for nearby selection:', { top, left });
    } else {
      // Reset drag memory and auto-position near new selection
      if (this.userDraggedWidget) {
        this.debugLog(' Selection moved far from widget, resetting drag memory');
        this.userDraggedWidget = false;
        this.lastWidgetPosition = null;
      }
      // Auto-position near new selection  
      this.debugLog(' Reposition selection rect:', rect);
      
      // Check if rect is valid (not collapsed or zero)
      if (rect.width === 0 && rect.height === 0) {
        this.debugLog(' Invalid selection rect in reposition, using center positioning');
        top = 100;
        left = Math.max(10, (window.innerWidth - 350) / 2);
      } else {
        top = rect.bottom + 10;
        left = rect.left;
      }
      
      // Avoid going off-screen
      if (left + controlsWidth > window.innerWidth) {
        left = window.innerWidth - controlsWidth - 10;
      }
      if (left < 10) left = 10;
      
      if (top + controlsHeight > window.innerHeight) {
        top = rect.top - controlsHeight - 10;
        if (top < 10) top = 10;
      }
      this.debugLog(' Repositioning to new selection:', { top, left, rectBottom: rect.bottom, rectLeft: rect.left });
    }
    
    controls.style.top = `${top}px`;
    controls.style.left = `${left}px`;
  }

  // Check if the new selection is close to the current widget position
  isSelectionNearWidget(selectionRect) {
    if (!this.lastWidgetPosition || !selectionRect) return false;
    
    // Selection coordinates are already viewport-relative from getBoundingClientRect()
    const selectionCenter = {
      x: selectionRect.left + selectionRect.width / 2,
      y: selectionRect.top + selectionRect.height / 2
    };
    
    // Widget position is also viewport-relative (position: fixed)
    const widgetCenter = {
      x: this.lastWidgetPosition.left + 175, // Widget width ~350px
      y: this.lastWidgetPosition.top + 40   // Widget height ~80px
    };
    
    // Calculate distance between selection and widget
    const distance = Math.sqrt(
      Math.pow(selectionCenter.x - widgetCenter.x, 2) + 
      Math.pow(selectionCenter.y - widgetCenter.y, 2)
    );
    
    // Consider "near" if within 200 pixels
    const isNear = distance < 200;
    this.debugLog(' Selection distance from widget:', Math.round(distance), 'px, near:', isNear);
    return isNear;
  }

  updateVoiceDropdownSelection(activeVoice) {
    if (!activeVoice) return;
    
    const voiceSelect = document.getElementById('nativemimic-voice-select');
    if (!voiceSelect) return;
    
    this.debugLog(' Updating dropdown to show active voice:', activeVoice.name);
    
    // Find the option that matches the active voice
    const matchingOption = Array.from(voiceSelect.options).find(option => {
      return option.value === activeVoice.voiceURI;
    });
    
    if (matchingOption) {
      // Clear all selections first
      Array.from(voiceSelect.options).forEach(option => option.selected = false);
      // Select the matching option
      matchingOption.selected = true;
      this.debugLog(' Updated dropdown selection to:', matchingOption.textContent);
    } else {
      this.debugLog(' Could not find dropdown option for voice:', activeVoice.name);
    }
  }



  async toggleEnabled() {
    // OPTION B: Delegate to background script for coordinated state management
    const newState = !this.isEnabled;
    
    this.debugLog(' Requesting toggle to background script:', newState);
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'toggleExtension',
        requestedState: newState
      });
      
      if (response && response.success) {
        this.debugLog(' Background script confirmed toggle:', response.newState);
        
        // Local UI feedback only (state update will come via message)
        if (!newState) {
          this.showMessage('NativeMimic disabled. Press Ctrl+Shift+E to re-enable.', 'info');
        } else {
          this.showMessage('NativeMimic enabled! Select text to use.', 'success');
        }
      } else {
        this.debugLog(' Failed to toggle extension state:', response);
        this.showMessage('Failed to toggle extension state', 'error');
      }
    } catch (error) {
      this.debugLog(' Error communicating with background script:', error);
      this.showMessage('Error toggling extension', 'error');
    }
  }

  
  async toggleRecording() {
    // Allow recording if we have selected text or previously played text
    const selectedText = window.getSelection().toString().trim();
    const availableText = selectedText || this.lastPlayedText || this.lastSelectedText;
    
    if (!availableText) {
      this.debugLog(' No text available for recording');
      return;
    }
    
    // If we have selected text but no lastPlayedText, use the selected text
    if (!this.lastPlayedText && selectedText) {
      this.lastPlayedText = selectedText;
      this.debugLog(' Using currently selected text for recording');
    }
    
    const recordBtn = document.getElementById('nativemimic-record');
    if (!recordBtn) return;
    
    if (!this.isRecording) {
      await this.startWidgetRecording(recordBtn);
    } else {
      this.stopWidgetRecording(recordBtn);
    }
  }
  
  async startWidgetRecording(button) {
    try {
      // Check microphone permission first
      const permission = await navigator.permissions.query({ name: 'microphone' });
      this.debugLog(' Microphone permission state:', permission.state);
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Update button state
      button.innerHTML = 'Recording...';
      button.title = 'Stop recording';
      this.isRecording = true;
      
      // Set up MediaRecorder with compatible format
      const chunks = [];
      let options = {};
      
      // Try to use more compatible audio format
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
        this.debugLog(' Using audio/mp4 format');
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=pcm')) {
        options.mimeType = 'audio/webm;codecs=pcm';
        this.debugLog(' Using audio/webm with PCM');
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        options.mimeType = 'audio/wav';
        this.debugLog(' Using audio/wav format');
      } else {
        this.debugLog(' Using default WebM/Opus format');
      }
      
      this.mediaRecorder = new MediaRecorder(stream, options);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        this.debugLog(' Recording stopped, chunks count:', chunks.length);
        this.debugLog(' Chunks sizes:', chunks.map(chunk => chunk.size));
        
        const blobType = options.mimeType || 'audio/webm;codecs=opus';
        this.recordedBlob = new Blob(chunks, { type: blobType });
        this.debugLog(' Created blob with type:', blobType);
        this.debugLog(' Created blob size:', this.recordedBlob.size, 'bytes');
        
        stream.getTracks().forEach(track => track.stop()); // Stop microphone
        
        // Add delay to allow audio encoding to complete
        // Show temporary message while encoding
        const recordBtn = document.getElementById('nativemimic-record');
        if (recordBtn) {
          recordBtn.innerHTML = '⏳ Processing...';
          recordBtn.disabled = true;
        }
        
        setTimeout(() => {
          this.debugLog(' Audio encoding finalized, ready for playback');
          
          // Only track recording event (not save audio) for analytics
          if (window.nativeMimicUnifiedAnalytics && this.lastPlayedText) {
            window.nativeMimicUnifiedAnalytics.trackRecordingCompleted(
              this.lastPlayedText, 
              Date.now() - this.recordingStartTime
            ).catch(error => {
              this.debugLog(' Failed to track recording event:', error.message);
            });
          }
          
          this.showCompareMode();
          
          // Re-enable after processing
          if (recordBtn) {
            recordBtn.disabled = false;
          }
        }, 3000); // 3 seconds should be enough for MP4 encoding
      };
      
      this.mediaRecorder.onerror = (error) => {
        console.error('Recording error:', error);
        this.resetRecordingState(button);
      };
      
      // Start recording
      this.mediaRecorder.start();
      this.debugLog(' Started widget recording');
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.resetRecordingState(button);
    }
  }
  
  stopWidgetRecording(button) {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }
  
  resetRecordingState(button) {
    this.isRecording = false;
    if (button) {
      button.innerHTML = 'Record';
      button.title = 'Record your pronunciation';
    }
  }
  
  showCompareMode() {
    // Replace the record button with compare buttons in-place
    const recordBtn = document.getElementById('nativemimic-record');
    if (!recordBtn) return;
    
    // Replace the record button with "Your Recording" button
    recordBtn.innerHTML = 'Play Recording';
    recordBtn.title = 'Play your recording';
    recordBtn.id = 'nativemimic-play-recording';
    recordBtn.className = 'nativemimic-play-recording-button';
    
    // Find the next button after record button to insert "Record Again" 
    const nextButton = recordBtn.nextElementSibling;
    
    // Create "Record Again" button
    const recordAgainBtn = document.createElement('button');
    recordAgainBtn.id = 'nativemimic-record-again';
    recordAgainBtn.innerHTML = 'Record Again';
    recordAgainBtn.title = 'Record again';
    recordAgainBtn.className = 'nativemimic-record-button';
    recordAgainBtn.style.cssText = recordBtn.style.cssText; // Copy same styling
    
    // Insert the "Record Again" button right after the "Play Recording" button
    recordBtn.parentNode.insertBefore(recordAgainBtn, nextButton);
    
    // Set up comparison event listeners
    this.setupCompareControls();
  }
  
  setupCompareControls() {
    const playRecBtn = document.getElementById('nativemimic-play-recording');
    const recordAgainBtn = document.getElementById('nativemimic-record-again');
    
    if (playRecBtn && this.recordedBlob) {
      // Store the blob reference to ensure it's available in the closure
      const currentBlob = this.recordedBlob;
      
      // Remove the onclick attribute if it exists
      playRecBtn.removeAttribute('onclick');
      
      // Store the new event handler
      const playHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.debugLog(' Play Recording clicked, blob exists:', !!currentBlob);
        
        // Immediately update button to show user interaction was received
        playRecBtn.innerHTML = '⏳ Loading...';
        
        if (currentBlob) {
          try {
            this.debugLog(' Playing blob - size:', currentBlob.size, 'type:', currentBlob.type);
            
            // Create audio URL
            const audioUrl = URL.createObjectURL(currentBlob);
            
            // Use persistent audio element or create new one
            if (!this.recordingAudio) {
              this.recordingAudio = new Audio();
              this.debugLog(' Created persistent audio element');
            }
            const audio = this.recordingAudio;
            this.debugLog(' Audio element created');
            
            // Set properties before loading
            audio.volume = 1.0;
            audio.preload = 'auto';
            
            // Ensure audio context is resumed (browser autoplay policy)
            try {
              if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                const AudioContextClass = AudioContext || webkitAudioContext;
                // Create or get existing audio context
                if (typeof window.audioContext === 'undefined') {
                  window.audioContext = new AudioContextClass();
                }
                // Resume if suspended
                if (window.audioContext.state === 'suspended') {
                  window.audioContext.resume().then(() => {
                    this.debugLog(' Audio context resumed for playback');
                  }).catch(error => {
                    this.debugLog(' Audio context resume failed:', error);
                  });
                }
              }
            } catch (error) {
              this.debugLog(' Audio context handling error:', error);
            }
            
            let hasPlayed = false;
            
            // Handle audio loading and playback
            const playAudio = () => {
              if (!hasPlayed) {
                hasPlayed = true;
                this.debugLog(' Attempting to play audio now');
                // Update button text to show playing state
                playRecBtn.innerHTML = '⏸️ Playing...';
                
                // Ensure audio is ready and play it
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                  playPromise.then(() => {
                    this.debugLog(' Audio playback started successfully');
                  }).catch(error => {
                    this.debugError(' Audio playback failed:', error);
                    // Reset button on error
                    playRecBtn.innerHTML = 'Play Recording';
                  });
                }
              }
            };

            // Try to play when audio is ready
            audio.addEventListener('canplaythrough', () => {
              this.debugLog(' Audio ready to play through');
              playAudio();
            });

            // Also try when loaded (backup)
            audio.addEventListener('loadeddata', () => {
              this.debugLog(' Audio data loaded');
              if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or better
                playAudio();
              }
            });
            
            
            audio.addEventListener('play', () => {
              this.debugLog(' Audio play event fired');
            });
            
            audio.addEventListener('playing', () => {
              this.debugLog(' Audio is actually playing now');
            });
            
            audio.addEventListener('error', (error) => {
              this.debugError(' Audio error:', error);
            });
            
            // Set source and load
            audio.src = audioUrl;
            audio.load();
            this.debugLog(' Audio source set and loading...');
            
            // Direct play attempt right after setting source
            audio.play().then(() => {
              hasPlayed = true;
              this.debugLog(' Direct audio play successful on first try');
              playRecBtn.innerHTML = '⏸️ Playing...';
            }).catch(error => {
              this.debugLog(' Direct play failed, waiting for audio to load:', error);
            });
            
            // Fallback: try to play after a short delay if not already played
            setTimeout(() => {
              if (!hasPlayed && audio.readyState >= 2) {
                this.debugLog(' Fallback: trying to play audio after delay');
                playAudio();
              }
            }, 200);
            
            // Clean up URL after playback and reset button
            audio.addEventListener('ended', () => {
              URL.revokeObjectURL(audioUrl);
              playRecBtn.innerHTML = 'Play Recording';
              this.debugLog(' Audio playback ended, URL cleaned up');
            });
            
            // Fallback cleanup
            setTimeout(() => {
              if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
              }
            }, 10000);
            
          } catch (error) {
            this.debugError(' Error creating/playing audio:', error);
          }
        } else {
          this.debugLog(' No recorded audio blob available');
        }
      };
      
      // Remove any existing event listeners and add the new one
      playRecBtn.removeEventListener('click', playHandler);
      playRecBtn.addEventListener('click', playHandler);
    }
    
    if (recordAgainBtn) {
      recordAgainBtn.addEventListener('click', () => {
        this.exitCompareMode();
        this.toggleRecording();
      });
    }
  }
  
  exitCompareMode() {
    // Remove the "Record Again" button
    const recordAgainBtn = document.getElementById('nativemimic-record-again');
    if (recordAgainBtn) {
      recordAgainBtn.remove();
    }
    
    // Clear the recorded blob to prevent playing old recordings
    this.recordedBlob = null;
    this.isRecording = false;
    
    // Restore the original record button from "Play Recording" button
    const playRecBtn = document.getElementById('nativemimic-play-recording');
    if (playRecBtn) {
      // Clone the button to remove all old event listeners
      const newRecordBtn = playRecBtn.cloneNode(false);
      newRecordBtn.innerHTML = 'Record';
      newRecordBtn.title = 'Record your pronunciation';
      newRecordBtn.id = 'nativemimic-record';
      newRecordBtn.className = 'nativemimic-record-button';
      
      // Replace the old button with the new one
      playRecBtn.parentNode.replaceChild(newRecordBtn, playRecBtn);
      
      // Set up the correct recording event listener
      newRecordBtn.addEventListener('click', () => {
        this.toggleRecording();
      });
      
      this.resetRecordingState(newRecordBtn);
    }
  }

  showPronunciationNotes() {
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText) {
      this.showMessage('Please select some text to add notes', 'info');
      return;
    }
    
    this.showPronunciationNotesModal(selectedText);
  }


  showPersonalNotesModal() {
    // Remove any existing modal
    const existingModal = document.getElementById('nativemimic-personal-notes-modal');
    if (existingModal) existingModal.remove();
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'nativemimic-personal-notes-modal';
    modal.className = 'nativemimic-modal';
    
    modal.innerHTML = this.getPersonalNotesModalTemplate();
    
    document.body.appendChild(modal);
    
    // Apply current theme to modal
    this.applyTheme(modal);
    
    this.setupPersonalNotesModalEvents();
  }

  showFeedbackModal() {
    // Remove any existing modal
    const existingModal = document.getElementById('nativemimic-feedback-modal');
    if (existingModal) existingModal.remove();
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'nativemimic-feedback-modal';
    modal.className = 'nativemimic-modal';
    
    modal.innerHTML = this.getFeedbackModalTemplate();
    
    document.body.appendChild(modal);
    
    // Apply current theme to modal
    this.applyTheme(modal);
    
    this.setupFeedbackModalEvents();
  }

  showPronunciationReport() {
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText) {
      this.showMessage('Please select some text to report pronunciation issues', 'info');
      return;
    }
    
    this.showPronunciationReportModal(selectedText);
  }

  showPronunciationReportModal(text) {
    // Remove any existing modal
    const existingModal = document.getElementById('nativemimic-pronunciation-report-modal');
    if (existingModal) existingModal.remove();
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'nativemimic-pronunciation-report-modal';
    modal.className = 'nativemimic-modal';
    
    modal.innerHTML = this.getPronunciationReportModalTemplate(text);
    
    document.body.appendChild(modal);
    
    // Apply current theme to modal
    this.applyTheme(modal);
    
    this.setupPronunciationReportModalEvents(text);
  }


  setupPersonalNotesModalEvents() {
    const modal = document.getElementById('nativemimic-personal-notes-modal');
    
    // Close modal events
    const closeBtn = modal.querySelector('.nativemimic-modal-close');
    const cancelBtn = modal.querySelector('#nativemimic-cancel-notes');
    const overlay = modal.querySelector('.nativemimic-modal-overlay');
    
    [closeBtn, cancelBtn].forEach(btn => {
      btn.addEventListener('click', () => modal.remove());
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) modal.remove();
    });
    
    // Save notes
    const saveBtn = modal.querySelector('#nativemimic-save-notes');
    saveBtn.addEventListener('click', () => {
      const notesText = modal.querySelector('#nativemimic-personal-notes').value.trim();
      if (notesText) {
        this.savePersonalNotes(notesText);
        modal.remove();
        this.showMessage('Notes saved successfully!', 'success');
      } else {
        this.showMessage('Please add some notes first.', 'warning');
      }
    });
    
    // Focus on textarea
    modal.querySelector('#nativemimic-personal-notes').focus();
  }

  setupFeedbackModalEvents() {
    const modal = document.getElementById('nativemimic-feedback-modal');
    
    // Close modal events
    const closeBtn = modal.querySelector('.nativemimic-modal-close');
    const cancelBtn = modal.querySelector('#nativemimic-cancel-feedback');
    const overlay = modal.querySelector('.nativemimic-modal-overlay');
    
    [closeBtn, cancelBtn].forEach(btn => {
      btn.addEventListener('click', () => modal.remove());
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) modal.remove();
    });
    
    // Feedback type change handler - show consent for bug reports and voice issues  
    const feedbackTypeSelect = modal.querySelector('#nativemimic-feedback-type');
    const recordingConsentDiv = modal.querySelector('#nativemimic-recording-consent');
    
    feedbackTypeSelect.addEventListener('change', () => {
      const selectedType = feedbackTypeSelect.value;
      const needsRecordingConsent = selectedType === 'bug_report' || selectedType === 'voice_issue';
      const hasRecording = this.recordedBlob && this.recordedBlob.size > 0;
      
      if (needsRecordingConsent && hasRecording) {
        recordingConsentDiv.style.display = 'block';
        recordingConsentDiv.querySelector('span').textContent = 
          selectedType === 'bug_report' 
            ? 'Include my voice recording to help debug this issue. My recording will be used only for technical analysis and automatically deleted after 30 days. I can request deletion anytime.'
            : 'Include my voice recording to demonstrate this pronunciation issue. My recording will be used only for voice quality improvement and automatically deleted after 90 days. I can request deletion anytime.';
      } else {
        recordingConsentDiv.style.display = 'none';
      }
    });
    
    // Trigger change event to set initial state
    feedbackTypeSelect.dispatchEvent(new Event('change'));

    // Send feedback
    const sendBtn = modal.querySelector('#nativemimic-send-feedback');
    sendBtn.addEventListener('click', () => {
      const feedbackType = modal.querySelector('#nativemimic-feedback-type').value;
      const feedbackMessage = modal.querySelector('#nativemimic-feedback-message').value.trim();
      const includeRecording = modal.querySelector('#nativemimic-include-recording')?.checked || false;
      
      if (feedbackMessage) {
        this.sendFeedback(feedbackType, feedbackMessage, includeRecording);
        modal.remove();
        this.showMessage('Feedback sent! Thank you for helping improve NativeMimic 🙏', 'success');
      } else {
        this.showMessage('Please add your feedback message.', 'warning');
      }
    });
    
    // Focus on textarea
    modal.querySelector('#nativemimic-feedback-message').focus();
  }

  async sendFeedback(type, message, includeRecording = false) {
    try {
      // Track feedback analytics
      if (window.nativeMimicUnifiedAnalytics) {
        await window.nativeMimicUnifiedAnalytics.trackFeedbackSubmitted(type, message.length);

        // Route feedback to appropriate table based on type
        switch (type) {
          case 'bug_report':
            await window.nativeMimicSupabase.saveBugReport(
              'user_feedback',
              `${type}: ${message}`,
              null, // steps to reproduce
              {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                url: window.location.hostname
              },
              this.getWidgetSettings()
            );
            
            // Save recording only if user consented
            if (includeRecording && this.recordedBlob && this.lastSelectedText) {
              try {
                await window.nativeMimicSupabase.saveRecording(
                  this.lastSelectedText, 
                  this.recordedBlob
                );
                console.log('NativeMimic: Recording saved with user consent for bug report');
              } catch (error) {
                console.warn('NativeMimic: Failed to save recording for bug report:', error.message);
              }
            }
            break;

          case 'feature_request':
            await window.nativeMimicSupabase.saveFeatureRequest(
              'User Suggestion', // title
              message,
              'user_submitted', // category
              'medium' // priority
            );
            break;

          case 'voice_issue':
            const settings = this.getWidgetSettings();
            let audioUrl = null;
            
            // Save recording first if user consented
            if (includeRecording && this.recordedBlob && this.lastSelectedText) {
              try {
                const recordingResult = await window.nativeMimicSupabase.saveRecording(
                  this.lastSelectedText, 
                  this.recordedBlob
                );
                audioUrl = recordingResult?.audio_url || null;
                console.log('NativeMimic: Recording saved with user consent for voice issue');
              } catch (error) {
                console.warn('NativeMimic: Failed to save recording for voice issue:', error.message);
              }
            }
            
            await window.nativeMimicSupabase.saveVoiceIssue(
              'pronunciation', // issue type
              message,
              this.lastSelectedText, // text content
              settings.selectedVoice?.id,
              settings.selectedVoice?.type,
              settings.language,
              audioUrl, // audio URL if recording was saved with consent
              'medium' // severity
            );
            break;

          case 'general':
            await window.nativeMimicSupabase.saveGeneralFeedback(
              message,
              'usability', // feedback type
              null, // rating
              window.location.href, // page URL
              ['user_submitted'] // tags
            );
            break;

          case 'pricing':
            await window.nativeMimicSupabase.savePricingFeedback(
              'general', // feedback type
              message,
              null, // would pay (unknown)
              null, // suggested price
              null, // payment frequency
              [], // valuable features
              'unknown' // user segment
            );
            break;

          default:
            // Fallback to speech_events table for unknown types
            await window.nativeMimicSupabase.trackInteraction('feedback', message, 
              { type: type, url: window.location.hostname }, 
              this.getWidgetSettings()
            );
        }

        this.debugLog(' Feedback submitted to Supabase:', type);
      }
    } catch (error) {
      this.debugLog(' Feedback submission failed (offline mode):', error.message);
      // Still show success message since we don't want to discourage feedback
    }
  }

  setupPronunciationReportModalEvents(text) {
    const modal = document.getElementById('nativemimic-pronunciation-report-modal');
    
    // Close modal events
    const closeBtn = modal.querySelector('.nativemimic-modal-close');
    const cancelBtn = modal.querySelector('#nativemimic-cancel-report');
    const overlay = modal.querySelector('.nativemimic-modal-overlay');
    
    [closeBtn, cancelBtn].forEach(btn => {
      btn.addEventListener('click', () => modal.remove());
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) modal.remove();
    });
    
    // Submit report
    const submitBtn = modal.querySelector('#nativemimic-submit-report');
    submitBtn.addEventListener('click', () => {
      const reportText = modal.querySelector('#nativemimic-report-notes').value.trim();
      if (reportText) {
        const reportData = { 
          type: 'pronunciation_issue', 
          content: reportText
        };
        this.submitPronunciationReport(text, reportData);
        modal.remove();
        this.showMessage('Report submitted! Thank you for helping improve pronunciation for everyone.', 'success');
      } else {
        this.showMessage('Please describe the pronunciation issue.', 'warning');
      }
    });
    
    // Focus on textarea
    modal.querySelector('#nativemimic-report-notes').focus();
  }

  async submitPronunciationReport(text, issue) {
    try {
      const report = {
        id: this.generateReportId(),
        text: text,
        issue: issue,
        timestamp: Date.now(),
        url: window.location.href,
        language: document.documentElement.lang || 'unknown',
        userAgent: navigator.userAgent,
        analysisStatus: 'pending'
      };
      
      // Enhanced storage and analysis based on type
      if (issue.type === 'voice') {
        await this.storeRecording(report);
        await this.analyzeRecording(report);
        this.showSuccessMessage('🎯 Recording saved & analyzed! View your pronunciation history in the dashboard.');
      } else if (issue.type === 'text') {
        await this.storeNote(report);
        this.showSuccessMessage('📝 Notes saved! Export or organize them from your dashboard.');
      }
      
      // Update usage statistics
      await this.updateUsageStats(issue.type);
      
      // Submit to Supabase backend (when available) - non-blocking
      try {
        await this.submitToSupabase(report);
      } catch (supabaseError) {
        this.debugLog(' Supabase submission failed (continuing with local storage):', supabaseError.message);
      }
      
    } catch (error) {
      this.debugError(' Failed to save report:', error);
      this.debugError(' Error details:', error.message, error.stack);
      this.showMessage('Failed to save data. Please try again.', 'error');
    }
  }

  async savePersonalNotes(notesText) {
    try {
      const note = {
        id: this.generateReportId(),
        content: notesText,
        timestamp: Date.now(),
        url: window.location.href,
        type: 'personal'
      };
      
      // Store locally first (for offline access)
      const result = await chrome.storage.local.get(['personalNotes']);
      const notes = result.personalNotes || [];
      
      // Add new note
      notes.unshift(note);
      
      // Limit to 100 notes to prevent bloat
      if (notes.length > 100) {
        notes.splice(100);
      }
      
      // Save to local storage
      await chrome.storage.local.set({ personalNotes: notes });
      
      this.debugLog(' Personal note saved locally:', note.id);
      
      // Submit to Supabase backend (when available) - non-blocking
      try {
        await this.submitToSupabase(note);
      } catch (supabaseError) {
        this.debugLog(' Supabase submission failed (continuing with local storage):', supabaseError.message);
      }
      
    } catch (error) {
      this.debugError(' Failed to save personal notes:', error);
      this.showMessage('Failed to save notes. Please try again.', 'error');
    }
  }

  generateReportId() {
    return 'vf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async storeRecording(report) {
    // Store locally first (for offline access)
    const result = await chrome.storage.local.get(['recordings']);
    const recordings = result.recordings || [];
    
    // Add new recording with metadata
    const recordingData = {
      ...report,
      duration: this.recordedBlob ? this.recordedBlob.size / 1000 : 0,
      quality: 'unknown',
      analysisData: null,
      audioBlob: this.recordedBlob ? await this.blobToBase64(this.recordedBlob) : null
    };
    
    recordings.push(recordingData);
    
    // Keep only last 50 recordings to prevent storage bloat
    if (recordings.length > 50) {
      recordings.splice(0, recordings.length - 50);
    }
    
    await chrome.storage.local.set({ recordings });
    this.debugLog(' Recording saved to chrome.storage.local:', report.id, 'Total recordings:', recordings.length);
    
    // Also save to Supabase for cloud sync and analysis
    if (window.nativeMimicSupabase && this.recordedBlob) {
      try {
        await window.nativeMimicSupabase.saveRecording(report.text, this.recordedBlob);
        await window.nativeMimicSupabase.trackInteraction('record', report.text, this.getWidgetPosition(), this.getWidgetSettings());
        this.debugLog(' Recording synced to Supabase:', report.id);
      } catch (error) {
        this.debugLog(' Supabase sync failed (offline mode):', error.message);
      }
    }
  }

  async storeNote(report) {
    // Store locally first (for offline access)
    const result = await chrome.storage.local.get(['notes']);
    const notes = result.notes || [];
    
    // Add new note with organization features
    const noteData = {
      ...report,
      tags: this.extractTags(report.issue.content),
      wordCount: report.text.split(' ').length,
      searchableContent: `${report.text} ${report.issue.content}`.toLowerCase()
    };
    
    notes.push(noteData);
    
    // Keep only last 100 notes
    if (notes.length > 100) {
      notes.splice(0, notes.length - 100);
    }
    
    await chrome.storage.local.set({ notes });
    this.debugLog(' Note saved to chrome.storage.local:', report.id, 'Total notes:', notes.length);
    
    // Also save to Supabase for cloud sync
    if (window.nativeMimicSupabase) {
      try {
        await window.nativeMimicSupabase.saveNote(
          report.issue.title || 'Practice Note',
          report.issue.content,
          noteData.tags,
          report.text
        );
        await window.nativeMimicSupabase.trackInteraction('note', report.text, this.getWidgetPosition(), this.getWidgetSettings());
        this.debugLog(' Note synced to Supabase:', report.id);
      } catch (error) {
        this.debugLog(' Supabase sync failed (offline mode):', error.message);
      }
    }
  }

  extractTags(content) {
    const tags = [];
    const tagPatterns = [
      /stress/i, /silent/i, /vowel/i, /consonant/i, /accent/i,
      /rhythm/i, /intonation/i, /pronunciation/i, /difficult/i
    ];
    
    tagPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        tags.push(pattern.source.replace(/[\/\\^$*+?.()|[\]{}]/g, ''));
      }
    });
    
    return tags;
  }

  getWidgetPosition() {
    const widget = document.getElementById('nativemimic-widget');
    if (widget) {
      const rect = widget.getBoundingClientRect();
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      };
    }
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  getWidgetSettings() {
    // Get current language from last detected language
    const currentLanguage = this.lastDetectedLanguage || this.detectLanguage(this.lastSelectedText || '') || 'en';
    
    return {
      speed: this.speechRate,
      voice: this.selectedVoice ? this.selectedVoice.name : 'default',
      selectedVoice: this.selectedVoice, // Include full voice object for tracking
      language: currentLanguage,
      theme: this.isDarkMode ? 'dark' : 'light', 
      enabled: this.isEnabled,
      // Add cost tracking (will be updated by speech generation)
      cost: this.lastSpeechCost || 0,
      cached: this.lastSpeechCached || false
    };
  }

  async analyzeRecording(report) {
    try {
      const analysis = {
        timestamp: Date.now(),
        estimatedWords: report.text.split(' ').length,
        estimatedDuration: this.recordedBlob ? this.recordedBlob.size / 8000 : 0,
        quality: this.recordedBlob && this.recordedBlob.size > 5000 ? 'good' : 'low',
        improvements: this.generateBasicImprovements(report.text)
      };
      
      // Update the stored recording with analysis
      const result = await chrome.storage.local.get(['recordings']);
      const recordings = result.recordings || [];
      const recordingIndex = recordings.findIndex(r => r.id === report.id);
      
      if (recordingIndex !== -1) {
        recordings[recordingIndex].analysisData = analysis;
        recordings[recordingIndex].analysisStatus = 'completed';
        await chrome.storage.local.set({ recordings });
      }
      
      this.debugLog(' Recording analysis completed for:', report.id);
    } catch (error) {
      this.debugError(' Recording analysis failed:', error);
    }
  }

  generateBasicImprovements(text) {
    const improvements = [];
    
    if (/th/i.test(text)) {
      improvements.push("Practice 'th' sounds - place tongue between teeth");
    }
    if (/[aeiou]{2,}/i.test(text)) {
      improvements.push("Focus on vowel combinations - pronounce each clearly");
    }
    if (text.split(' ').length > 10) {
      improvements.push("Break long phrases into smaller chunks for practice");
    }
    if (/[A-Z]/g.test(text)) {
      improvements.push("Pay attention to word stress in capitalized words");
    }
    
    return improvements;
  }

  async updateUsageStats(activityType) {
    const result = await chrome.storage.local.get(['usageStats']);
    const stats = result.usageStats || {
      recordings: 0,
      notes: 0,
      totalSessions: 0,
      lastActivity: null,
      streakDays: 0
    };
    
    if (activityType === 'voice') stats.recordings++;
    if (activityType === 'text') stats.notes++;
    
    // Track daily streak
    const today = new Date().toDateString();
    if (stats.lastActivity !== today) {
      stats.streakDays = stats.lastActivity === new Date(Date.now() - 86400000).toDateString() 
        ? stats.streakDays + 1 : 1;
      stats.lastActivity = today;
    }
    
    await chrome.storage.local.set({ usageStats: stats });
    this.debugLog(' Usage stats updated in chrome.storage.local:', stats);
  }

  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async submitToSupabase(report) {
    if (!window.nativeMimicSupabase) {
      this.debugLog(' Supabase client not available, using local storage only');
      return;
    }

    try {
      if (report.type === 'bug_report') {
        // Submit bug report
        await window.nativeMimicSupabase.saveBugReport(
          'bug',
          report.issue.title + ': ' + report.issue.content,
          report.issue.stepsToReproduce || null,
          {
            browser: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
          },
          this.getWidgetSettings()
        );
        await window.nativeMimicSupabase.trackAnalytics('bug_report_submitted', {
          reportId: report.id,
          category: report.issue.title
        });
        this.debugLog(' Bug report submitted to Supabase:', report.id);
      } else {
        // Generic report submission for other types
        await window.nativeMimicSupabase.trackAnalytics('report_submitted', {
          reportId: report.id,
          type: report.type || 'unknown'
        });
        this.debugLog(' Report submitted to Supabase:', report.id);
      }
    } catch (error) {
      this.debugLog(' Supabase submission failed (offline mode):', error.message);
    }
  }

  async getSupabaseConfig() {
    const result = await chrome.storage.local.get(['supabaseConfig']);
    return result.supabaseConfig || { enabled: false };
  }

  async getStoredReports() {
    try {
      const result = await chrome.storage.local.get(['pronunciationReports']);
      return result.pronunciationReports || [];
    } catch (error) {
      return [];
    }
  }

  showPronunciationNotesModal(text) {
    // Remove any existing modal
    const existingModal = document.getElementById('nativemimic-pronunciation-modal');
    if (existingModal) existingModal.remove();
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'nativemimic-pronunciation-modal';
    modal.className = 'nativemimic-modal';
    
    modal.innerHTML = `
      <div class="nativemimic-modal-overlay">
        <div class="nativemimic-modal-content nativemimic-compact-modal">
          <div class="nativemimic-modal-header">
            <h3>📝 Add Notes</h3>
            <button class="nativemimic-modal-close">&times;</button>
          </div>
          
          <div class="nativemimic-modal-body">
            <div class="nativemimic-text-display">
              <label>Selected text:</label>
              <div class="nativemimic-selected-text">${text}</div>
            </div>
            
            <div class="nativemimic-text-input">
              <label for="nativemimic-notes-text">Add pronunciation notes:</label>
              <textarea id="nativemimic-notes-text" placeholder="e.g., 'Stress on second syllable' or 'Silent 'h' at beginning'"></textarea>
            </div>
          </div>
          
          <div class="nativemimic-modal-footer">
            <button class="nativemimic-btn nativemimic-btn-secondary" id="nativemimic-cancel-notes">Cancel</button>
            <button class="nativemimic-btn nativemimic-btn-primary" id="nativemimic-submit-notes">Save Notes</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Apply current theme to modal
    this.applyTheme(modal);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.nativemimic-modal-close');
    const cancelBtn = modal.querySelector('#nativemimic-cancel-notes');
    const submitBtn = modal.querySelector('#nativemimic-submit-notes');
    const overlay = modal.querySelector('.nativemimic-modal-overlay');
    
    [closeBtn, cancelBtn].forEach(btn => {
      btn.addEventListener('click', () => modal.remove());
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) modal.remove();
    });
    
    submitBtn.addEventListener('click', () => {
      const notesText = modal.querySelector('#nativemimic-notes-text').value.trim();
      if (notesText) {
        const notesData = { 
          type: 'text', 
          content: notesText
        };
        this.submitPronunciationReport(text, notesData);
        modal.remove();
      } else {
        alert('Please add some notes first.');
      }
    });
    
    // Focus on textarea
    modal.querySelector('#nativemimic-notes-text').focus();
  }

  setupRecordingButton(modal, text) {
    const recordBtn = modal.querySelector('#nativemimic-record-btn');
    const googlePlayBtn = modal.querySelector('#nativemimic-google-play-btn');
    const statusDiv = modal.querySelector('#nativemimic-recording-status');
    
    if (!recordBtn || !statusDiv) return;
    
    // Set up recording button
    recordBtn.addEventListener('click', async () => {
      if (!this.isRecording) {
        await this.startRecording(recordBtn, statusDiv);
      } else {
        this.stopRecording(recordBtn, statusDiv);
      }
    });
    
    // Set up Google TTS play button for comparison
    if (googlePlayBtn && text) {
      googlePlayBtn.addEventListener('click', async () => {
        try {
          googlePlayBtn.disabled = true;
          googlePlayBtn.innerHTML = '<span class="nativemimic-play-icon">🔊</span> Playing...';
          
          // Use the same speech logic as the main widget
          await this.speakText(text);
          
          googlePlayBtn.disabled = false;
          googlePlayBtn.innerHTML = '<span class="nativemimic-play-icon">🔊</span> Play Google Voice';
        } catch (error) {
          console.error('Failed to play Google TTS in modal:', error);
          googlePlayBtn.disabled = false;
          googlePlayBtn.innerHTML = '<span class="nativemimic-play-icon">🔊</span> Play Google Voice';
        }
      });
    }
  }

  async startRecording(button, statusDiv) {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      // Setup MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        this.recordedBlob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        stream.getTracks().forEach(track => track.stop()); // Stop microphone
        
        // Show success message with recording playback option
        const audioUrl = URL.createObjectURL(this.recordedBlob);
        statusDiv.innerHTML = `
          <div style="color: #28a745; font-weight: 500; margin-bottom: 8px;">
            ✅ Recording saved! Use buttons above to compare.
          </div>
          <div class="nativemimic-playback-comparison">
            <button id="nativemimic-play-recording" class="nativemimic-comparison-button" 
                    style="width: 100%;">
              🎤 Play Your Recording
            </button>
            <audio id="nativemimic-recorded-audio" src="${audioUrl}" style="display: none;"></audio>
          </div>
        `;
        
        // Add event listener for recording playback button
        const playRecordingBtn = statusDiv.querySelector('#nativemimic-play-recording');
        const audio = statusDiv.querySelector('#nativemimic-recorded-audio');
        
        // Recording playback button - simplified approach
        playRecordingBtn.addEventListener('click', () => {
          if (audio.paused) {
            this.debugLog(' Play Recording button clicked, audio state:', {
              paused: audio.paused,
              readyState: audio.readyState,
              src: audio.src ? 'present' : 'missing'
            });
            
            playRecordingBtn.innerHTML = '⏳ Loading...';
            
            // Simple approach: just play and handle any errors
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
              playPromise.then(() => {
                playRecordingBtn.innerHTML = '⏸️ Playing...';
                this.debugLog(' Recording playback started successfully');
              }).catch(error => {
                this.debugError(' Recording playback failed:', error);
                playRecordingBtn.innerHTML = '🎤 Play Your Recording';
              });
            } else {
              // Fallback for older browsers
              playRecordingBtn.innerHTML = '⏸️ Playing...';
            }
          } else {
            audio.pause();
            audio.currentTime = 0;
            playRecordingBtn.innerHTML = '🎤 Play Your Recording';
          }
        });
        
        // Reset recording button when audio ends
        audio.addEventListener('ended', () => {
          playRecordingBtn.innerHTML = '🎤 Play Your Recording';
        });
      };
      
      this.mediaRecorder.onerror = (error) => {
        console.error('Recording error:', error);
        statusDiv.innerHTML = '<div style="color: #dc3545;">❌ Recording failed. Please try again.</div>';
        this.isRecording = false;
        button.innerHTML = '<span class="nativemimic-record-icon">🎤</span>Start Recording';
      };
      
      // Start recording
      this.mediaRecorder.start();
      this.isRecording = true;
      
      // Update UI
      button.innerHTML = 'Recording...';
      button.style.background = '#dc3545';
      statusDiv.innerHTML = '<div style="color: #007bff; font-weight: 500;">🎤 Recording... Click "Recording..." to stop</div>';
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      statusDiv.innerHTML = '<div style="color: #dc3545;">❌ Microphone access denied or not available</div>';
    }
  }

  stopRecording(button, statusDiv) {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      // Update UI
      button.innerHTML = '<span class="nativemimic-record-icon">🎤</span>Start Recording';
      button.style.background = '';
      statusDiv.innerHTML = '<div style="color: #ffc107;">⏳ Processing recording...</div>';
    }
  }

  showSuccessMessage(message) {
    this.showMessage(message, 'success');
  }

  showErrorMessage(message) {
    this.showMessage(message, 'error');
  }

  showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `nativemimic-message nativemimic-message-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.zIndex = '10001';
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }

  showPermanentMessage(title, details) {
    // Remove any existing permanent message
    const existing = document.getElementById('nativemimic-permanent-message');
    if (existing) existing.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.id = 'nativemimic-permanent-message';
    messageDiv.className = 'nativemimic-permanent-message';
    
    messageDiv.innerHTML = `
      <div class="nativemimic-permanent-header">
        <strong>${title}</strong>
        <button class="nativemimic-permanent-close">✕</button>
      </div>
      <div class="nativemimic-permanent-body">
        ${details.replace(/\n/g, '<br>')}
      </div>
    `;
    
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.zIndex = '10001';
    
    document.body.appendChild(messageDiv);
    
    // Add close button functionality
    const closeBtn = messageDiv.querySelector('.nativemimic-permanent-close');
    closeBtn.addEventListener('click', () => messageDiv.remove());
  }

  onSpeechStart() {
    this.debugLog(' Speech started');
    this.speechStarted = true; // Track that speech actually started (Chrome fix)
    // Add visual indicator that speech is active
    document.body.classList.add('nativemimic-speaking');
    // Update button to show pause state
    this.updatePlayPauseButton('Pause', 'Pause (Ctrl+Shift+P)');
    
    // Update voice dropdown to show which voice is being used
    if (this.currentUtterance && this.currentUtterance.voice) {
      this.updateVoiceDropdownSelection(this.currentUtterance.voice);
    }
  }

  async onSpeechEnd() {
    this.debugLog(' Speech ended');
    this.stopSpeechMonitoring(); // Stop monitoring when speech ends
    document.body.classList.remove('nativemimic-speaking');
    
    // Reset button to play state
    this.updatePlayPauseButton('Play', 'Play selected text (Ctrl+Shift+S)');
    
    // Reset selection memory to allow new text selections
    setTimeout(() => {
      this.lastSelectedText = '';
      this.debugLog(' Reset selection memory - ready for new text');
    }, 1000);
    
    // Track usage for free tier users
    if (!this.isPremium) {
      await this.incrementUsage();
    }
    
    // Check if speech actually started (Chrome fix)
    const speechActuallyStarted = this.speechStarted || false;
    this.debugLog(' Speech actually started:', speechActuallyStarted);
    
    this.isSpeaking = false; // Allow new speech
    this.speechInProgress = false; // Reset progress flag
    this.speechStarted = false; // Reset start flag
    
    // Only remember text as "last spoken" if speech actually started
    // This prevents Chrome's immediate onend from blocking replay attempts
    if (!speechActuallyStarted) {
      this.debugLog(' Speech failed to start - clearing lastSelectedText to allow retry');
      this.lastSelectedText = '';
    }
    
    // Reset play/pause button to default state
    this.updatePlayPauseButton('Play', 'Play selected text (Ctrl+Shift+S)');
    
    // Keep controls visible for easy replay
  }

  onSpeechError(event) {
    // Speech error occurred - details captured internally
    
    // Only show error for non-interrupt errors
    if (event.error !== 'interrupted' && event.error !== 'canceled') {
      // Showing error message for significant error
      this.showErrorMessage(`Speech error: ${event.error}. Please try again.`);
    } else {
      // Suppressing normal interrupt/cancel error
    }
    
    this.onSpeechEnd();
  }

  testSpeechSynthesis() {
    this.debugLog(' Testing speech synthesis...');
    this.debugLog(' speechSynthesis available:', !!window.speechSynthesis);
    this.debugLog(' SpeechSynthesisUtterance available:', !!window.SpeechSynthesisUtterance);
    
    if (window.speechSynthesis) {
      this.debugLog(' speechSynthesis.getVoices():', speechSynthesis.getVoices().length);
      
      // Try a simple test utterance
      setTimeout(() => {
        const testUtterance = new SpeechSynthesisUtterance('test');
        testUtterance.volume = 0.1; // Very quiet
        testUtterance.onstart = () => this.debugLog(' Test speech started');
        testUtterance.onend = () => this.debugLog(' Test speech ended');
        testUtterance.onerror = (e) => this.debugLog(' Test speech error:', e.error);
        
        this.debugLog(' Starting test speech (very quiet)');
        speechSynthesis.speak(testUtterance);
      }, 1000);
    }
  }

  makeDraggable(element) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    element.addEventListener('mousedown', (e) => {
      // Only allow dragging from the main container, not buttons
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.classList.contains('nativemimic-speed-control')) {
        return;
      }
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(element.style.left) || 0;
      startTop = parseInt(element.style.top) || 0;
      
      element.style.cursor = 'grabbing';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;
      
      // Keep within viewport bounds
      const maxLeft = window.innerWidth - element.offsetWidth;
      const maxTop = window.innerHeight - element.offsetHeight;
      
      newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      newTop = Math.max(0, Math.min(newTop, maxTop));
      
      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        element.style.cursor = 'move';
        
        // Remember this position for future widget placements
        this.userDraggedWidget = true;
        this.lastWidgetPosition = {
          top: parseInt(element.style.top),
          left: parseInt(element.style.left)
        };
        this.debugLog(' Widget dragged, position saved:', this.lastWidgetPosition);
      }
    });
  }

  showBugReportModal() {
    this.debugLog(' Opening bug report modal');
    // Remove any existing modal
    const existingModal = document.getElementById('nativemimic-bug-modal');
    if (existingModal) existingModal.remove();
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'nativemimic-bug-modal';
    modal.className = 'nativemimic-modal';
    
    modal.innerHTML = `
      <div class="nativemimic-modal-overlay">
        <div class="nativemimic-modal-content">
          <div class="nativemimic-modal-header">
            <h3>🐛 Report Bug</h3>
            <button class="nativemimic-modal-close">&times;</button>
          </div>
          
          <div class="nativemimic-modal-body">
            <div class="nativemimic-text-input">
              <label for="nativemimic-bug-title">Bug Title:</label>
              <input type="text" id="nativemimic-bug-title" placeholder="e.g., Speech not working on this site">
            </div>
            
            <div class="nativemimic-text-input">
              <label for="nativemimic-bug-description">Description:</label>
              <textarea id="nativemimic-bug-description" placeholder="What happened? What did you expect to happen?"></textarea>
            </div>
            
            <div class="nativemimic-text-input">
              <label for="nativemimic-bug-category">Category:</label>
              <select id="nativemimic-bug-category">
                <option value="speech_synthesis">Speech/Voice Issues</option>
                <option value="ui">User Interface</option>
                <option value="keyboard_shortcuts">Keyboard Shortcuts</option>
                <option value="recording">Recording Problems</option>
                <option value="performance">Performance</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div class="nativemimic-text-input">
              <label for="nativemimic-bug-email">Email (optional):</label>
              <input type="email" id="nativemimic-bug-email" placeholder="For follow-up (optional)">
            </div>
          </div>
          
          <div class="nativemimic-modal-footer">
            <button class="nativemimic-modal-btn nativemimic-modal-cancel">Cancel</button>
            <button class="nativemimic-modal-btn nativemimic-modal-submit">Submit Bug Report</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.applyTheme(modal);
    
    // Event listeners
    modal.querySelector('.nativemimic-modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.nativemimic-modal-cancel').addEventListener('click', () => modal.remove());
    modal.querySelector('.nativemimic-modal-submit').addEventListener('click', () => this.submitBugReport(modal));
    
    // Focus on title input
    modal.querySelector('#nativemimic-bug-title').focus();
  }

  async submitBugReport(modal) {
    this.debugLog(' Bug report submission started');
    
    const title = modal.querySelector('#nativemimic-bug-title').value.trim();
    const description = modal.querySelector('#nativemimic-bug-description').value.trim();
    const category = modal.querySelector('#nativemimic-bug-category').value;
    const email = modal.querySelector('#nativemimic-bug-email').value.trim();
    
    this.debugLog(' Bug report form values:', { title, description, category, email });

    if (!title || !description) {
      alert('Please fill in the title and description.');
      return;
    }
    
    try {
      const bugReport = {
        id: this.generateReportId(),
        title,
        description,
        category,
        email: email || null,
        timestamp: Date.now(),
        extensionVersion: '3.4',
        url: window.location.href,
        userAgent: navigator.userAgent,
        widgetState: this.getWidgetDebugInfo(),
        status: 'new'
      };
      
      // Store locally
      const result = await chrome.storage.local.get(['bugReports']);
      const bugReports = result.bugReports || [];
      bugReports.push(bugReport);
      
      // Keep only last 20 bug reports
      if (bugReports.length > 20) {
        bugReports.splice(0, bugReports.length - 20);
      }
      
      await chrome.storage.local.set({ bugReports });
      this.debugLog(' Bug report saved to chrome.storage.local:', bugReport.id);
      
      // Submit to Supabase (when available)
      await this.submitToSupabase({...bugReport, type: 'bug_report'});
      
      this.showSuccessMessage('🐛 Bug report submitted! We\'ll investigate and fix it soon.');
      modal.remove();
      
    } catch (error) {
      this.debugError(' Failed to submit bug report:', error);
      this.showMessage('Failed to submit bug report. Please try again.', 'error');
    }
  }

  getWidgetDebugInfo() {
    return {
      isEnabled: this.isEnabled,
      isSpeaking: this.isSpeaking,
      speechRate: this.speechRate,
      isDarkMode: this.isDarkMode,
      availableVoices: this.availableVoices.length,
      lastSelectedText: this.lastSelectedText.substring(0, 100)
    };
  }

  showDashboard() {
    this.debugLog(' Opening dashboard modal');
    // Remove any existing modal
    const existingModal = document.querySelector('.nativemimic-modal-overlay');
    if (existingModal) existingModal.remove();
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'nativemimic-modal';
    
    modal.innerHTML = this.getDashboardModalTemplate();
    
    document.body.appendChild(modal);
    this.applyTheme(modal);
    
    // Event listeners
    modal.querySelector('.nativemimic-modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('#nativemimic-close-dashboard').addEventListener('click', () => modal.remove());
    
    // Click outside to close
    const overlay = modal.querySelector('.nativemimic-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) modal.remove();
      });
    }
  }

  async loadDashboardData(modal) {
    try {
      const [recordings, notes, bugReports, usageStats] = await Promise.all([
        chrome.storage.local.get(['recordings']).then(r => r.recordings || []),
        chrome.storage.local.get(['notes']).then(r => r.notes || []),
        chrome.storage.local.get(['bugReports']).then(r => r.bugReports || []),
        chrome.storage.local.get(['usageStats']).then(r => r.usageStats || {})
      ]);
      
      this.debugLog(' Dashboard data loaded from chrome.storage.local:', {
        recordings: recordings.length,
        notes: notes.length,
        bugReports: bugReports.length,
        streakDays: usageStats.streakDays || 0
      });
      
      const content = modal.querySelector('#nativemimic-dashboard-content');
      content.innerHTML = `
        <div class="nativemimic-dashboard-stats">
          <div class="nativemimic-stat-card">
            <h4>🎤 Recordings</h4>
            <div class="nativemimic-stat-number">${recordings.length}</div>
            <div class="nativemimic-stat-label">Total recordings</div>
          </div>
          
          <div class="nativemimic-stat-card">
            <h4>📝 Notes</h4>
            <div class="nativemimic-stat-number">${notes.length}</div>
            <div class="nativemimic-stat-label">Pronunciation notes</div>
          </div>
          
          <div class="nativemimic-stat-card">
            <h4>🔥 Streak</h4>
            <div class="nativemimic-stat-number">${usageStats.streakDays || 0}</div>
            <div class="nativemimic-stat-label">Days active</div>
          </div>
          
          <div class="nativemimic-stat-card">
            <h4>🐛 Bug Reports</h4>
            <div class="nativemimic-stat-number">${bugReports.length}</div>
            <div class="nativemimic-stat-label">Reports submitted</div>
          </div>
        </div>
        
        <div class="nativemimic-dashboard-tabs">
          <button class="nativemimic-tab-btn nativemimic-tab-active" data-tab="overview">Overview</button>
          <button class="nativemimic-tab-btn" data-tab="recordings">Recordings (${recordings.length})</button>
          <button class="nativemimic-tab-btn" data-tab="notes">Notes (${notes.length})</button>
          <button class="nativemimic-tab-btn" data-tab="reports">Bug Reports (${bugReports.length})</button>
        </div>
        
        <div class="nativemimic-tab-content">
          <div class="nativemimic-tab-panel nativemimic-tab-active" data-panel="overview">
            <div class="nativemimic-dashboard-section">
              <h4>Recent Activity</h4>
              ${this.renderRecentActivity([...recordings.slice(-3), ...notes.slice(-3)].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5))}
            </div>
          </div>
          
          <div class="nativemimic-tab-panel" data-panel="recordings">
            <div class="nativemimic-dashboard-section">
              <h4>All Recordings (${recordings.length})</h4>
              <div class="nativemimic-scrollable-list">
                ${this.renderCompactRecordings(recordings.reverse())}
              </div>
            </div>
          </div>
          
          <div class="nativemimic-tab-panel" data-panel="notes">
            <div class="nativemimic-dashboard-section">
              <h4>All Notes (${notes.length})</h4>
              <div class="nativemimic-scrollable-list">
                ${this.renderCompactNotes(notes.reverse())}
              </div>
            </div>
          </div>
          
          <div class="nativemimic-tab-panel" data-panel="reports">
            <div class="nativemimic-dashboard-section">
              <h4>Bug Reports (${bugReports.length})</h4>
              <div class="nativemimic-scrollable-list">
                ${this.renderBugReports(bugReports.reverse())}
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Add tab functionality
      this.setupDashboardTabs(modal);
      
    } catch (error) {
      this.debugError(' Failed to load dashboard data:', error);
      const content = modal.querySelector('#nativemimic-dashboard-content');
      content.innerHTML = '<div class="nativemimic-error">Failed to load dashboard data.</div>';
    }
  }

  setupDashboardTabs(modal) {
    const tabBtns = modal.querySelectorAll('.nativemimic-tab-btn');
    const tabPanels = modal.querySelectorAll('.nativemimic-tab-panel');
    
    // Set up tab switching
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        
        // Remove active class from all tabs and panels
        tabBtns.forEach(b => b.classList.remove('nativemimic-tab-active'));
        tabPanels.forEach(p => p.classList.remove('nativemimic-tab-active'));
        
        // Add active class to clicked tab and corresponding panel
        btn.classList.add('nativemimic-tab-active');
        modal.querySelector(`[data-panel="${targetTab}"]`).classList.add('nativemimic-tab-active');
        
        this.debugLog(' Dashboard tab switched to:', targetTab);
      });
    });

    // Set up recording playback
    this.setupRecordingPlayback(modal);
  }

  async setupRecordingPlayback(modal) {
    const playBtns = modal.querySelectorAll('.nativemimic-play-btn');
    
    playBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const recordingId = btn.dataset.recordingId;
        const playIcon = btn.querySelector('.nativemimic-play-icon');
        
        try {
          // Get the recording from storage
          const result = await chrome.storage.local.get(['recordings']);
          const recordings = result.recordings || [];
          const recording = recordings.find(r => r.id === recordingId);
          
          if (!recording || !recording.audioBlob) {
            this.showMessage('Recording not found or no audio available', 'error');
            return;
          }

          // Update button state
          btn.disabled = true;
          playIcon.textContent = '⏸️';
          btn.innerHTML = '<span class="nativemimic-play-icon">⏸️</span> Playing...';
          
          this.debugLog(' Playing recording:', recordingId);
          
          // Convert base64 back to blob and play
          await this.playRecordingFromBlob(recording.audioBlob);
          
          // Reset button state
          btn.disabled = false;
          playIcon.textContent = '▶️';
          btn.innerHTML = '<span class="nativemimic-play-icon">▶️</span> Play';
          
        } catch (error) {
          this.debugError(' Failed to play recording:', error);
          this.showMessage('Failed to play recording', 'error');
          
          // Reset button state
          btn.disabled = false;
          playIcon.textContent = '▶️';
          btn.innerHTML = '<span class="nativemimic-play-icon">▶️</span> Play';
        }
      });
    });
  }

  async playRecordingFromBlob(base64AudioBlob) {
    return new Promise((resolve, reject) => {
      try {
        // Convert base64 back to blob
        const byteCharacters = atob(base64AudioBlob.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const audioBlob = new Blob([byteArray], { type: 'audio/webm' });
        
        // Create audio element and play
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };
        
        audio.play();
        
      } catch (error) {
        reject(error);
      }
    });
  }

  renderRecentActivity(items) {
    if (items.length === 0) {
      return '<div class="nativemimic-empty">No recent activity. Start recording or taking notes!</div>';
    }
    
    return items.map(item => `
      <div class="nativemimic-dashboard-item">
        <div class="nativemimic-item-text">
          ${item.issue ? '📝' : '🎤'} "${item.text.substring(0, 40)}${item.text.length > 40 ? '...' : ''}"
        </div>
        ${item.issue ? `<div class="nativemimic-item-note">${item.issue.content.substring(0, 60)}${item.issue.content.length > 60 ? '...' : ''}</div>` : ''}
        <div class="nativemimic-item-meta">${new Date(item.timestamp).toLocaleDateString()}</div>
      </div>
    `).join('');
  }

  renderCompactRecordings(recordings) {
    if (recordings.length === 0) {
      return '<div class="nativemimic-empty">No recordings yet. Try recording your pronunciation!</div>';
    }
    
    return recordings.map((recording, index) => {
      const hasAudio = recording.audioBlob && recording.audioBlob !== null;
      const qualityScore = this.getQualityScore(recording);
      const qualityColor = this.getQualityColor(qualityScore);
      
      return `
        <div class="nativemimic-compact-item nativemimic-recording-item" data-recording-index="${index}">
          <div class="nativemimic-compact-header">
            <span class="nativemimic-compact-text">"${recording.text.substring(0, 35)}${recording.text.length > 35 ? '...' : ''}"</span>
            <span class="nativemimic-compact-date">${new Date(recording.timestamp).toLocaleString()}</span>
          </div>
          
          <div class="nativemimic-recording-controls">
            <div class="nativemimic-recording-left">
              ${hasAudio ? 
                `<button class="nativemimic-play-btn" data-recording-id="${recording.id}" title="Play recording">
                  <span class="nativemimic-play-icon">▶️</span> Play
                </button>` : 
                '<span class="nativemimic-no-audio">No audio available</span>'
              }
              <span class="nativemimic-duration">${recording.duration ? Math.round(recording.duration) + 's' : 'Unknown'}</span>
            </div>
            
            <div class="nativemimic-recording-right">
              <div class="nativemimic-quality-score" style="color: ${qualityColor}" title="Placeholder score - AI analysis coming soon">
                Length Score: ${qualityScore}/10
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  getQualityScore(recording) {
    if (recording.analysisData?.quality === 'good') return 8;
    if (recording.analysisData?.quality === 'medium') return 6; 
    if (recording.analysisData?.quality === 'low') return 4;
    if (recording.duration > 3) return 7; // Longer recordings generally better
    if (recording.duration > 1) return 5;
    return 3; // Default for very short or unknown
  }

  getQualityColor(score) {
    if (score >= 8) return '#22c55e'; // Green
    if (score >= 6) return '#f59e0b'; // Orange  
    if (score >= 4) return '#ef4444'; // Red
    return '#9ca3af'; // Gray
  }

  renderCompactNotes(notes) {
    if (notes.length === 0) {
      return '<div class="nativemimic-empty">No notes yet. Add pronunciation notes while practicing!</div>';
    }
    
    return notes.map(note => `
      <div class="nativemimic-compact-item">
        <div class="nativemimic-compact-header">
          <span class="nativemimic-compact-text">"${note.text.substring(0, 25)}${note.text.length > 25 ? '...' : ''}"</span>
          <span class="nativemimic-compact-date">${new Date(note.timestamp).toLocaleDateString()}</span>
        </div>
        <div class="nativemimic-compact-note">${note.issue.content.substring(0, 60)}${note.issue.content.length > 60 ? '...' : ''}</div>
        ${note.tags && note.tags.length > 0 ? `<div class="nativemimic-compact-tags">${note.tags.map(tag => `<span class="nativemimic-tag">${tag}</span>`).join('')}</div>` : ''}
      </div>
    `).join('');
  }

  renderBugReports(reports) {
    if (reports.length === 0) {
      return '<div class="nativemimic-empty">No bug reports yet.</div>';
    }
    
    return reports.map(report => `
      <div class="nativemimic-compact-item">
        <div class="nativemimic-compact-header">
          <span class="nativemimic-compact-text">${report.title}</span>
          <span class="nativemimic-compact-date">${new Date(report.timestamp).toLocaleDateString()}</span>
        </div>
        <div class="nativemimic-compact-meta">
          Category: ${report.category} • Status: ${report.status}
        </div>
        <div class="nativemimic-compact-note">${report.description.substring(0, 80)}${report.description.length > 80 ? '...' : ''}</div>
      </div>
    `).join('');
  }

  showExportOptions(modal) {
    const exportModal = document.createElement('div');
    exportModal.className = 'nativemimic-modal';
    exportModal.innerHTML = this.getExportModalTemplate();
    
    document.body.appendChild(exportModal);
    this.applyTheme(exportModal);
    
    // Event listeners
    exportModal.querySelector('.nativemimic-modal-close').addEventListener('click', () => exportModal.remove());
    exportModal.querySelector('.nativemimic-modal-cancel').addEventListener('click', () => exportModal.remove());
    
    exportModal.querySelectorAll('.nativemimic-export-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const format = btn.dataset.format;
        
        if (format === 'pdf') {
          alert('PDF export coming soon! Use TXT format for now.');
          return;
        }
        
        await this.exportUserData(format);
        exportModal.remove();
      });
    });
  }

  async exportUserData(format = 'json') {
    try {
      this.debugLog(' Starting data export from chrome.storage.local, format:', format);
      const [recordings, notes, bugReports, usageStats] = await Promise.all([
        chrome.storage.local.get(['recordings']).then(r => r.recordings || []),
        chrome.storage.local.get(['notes']).then(r => r.notes || []),
        chrome.storage.local.get(['bugReports']).then(r => r.bugReports || []),
        chrome.storage.local.get(['usageStats']).then(r => r.usageStats || {})
      ]);
      
      let content, mimeType, filename;
      
      if (format === 'txt') {
        content = this.generateTextExport(recordings, notes, bugReports, usageStats);
        mimeType = 'text/plain';
        filename = `nativemimic-data-${new Date().toISOString().split('T')[0]}.txt`;
      } else {
        const exportData = {
          exportDate: new Date().toISOString(),
          version: '3.2',
          summary: {
            totalRecordings: recordings.length,
            totalNotes: notes.length,
            totalBugReports: bugReports.length,
            streakDays: usageStats.streakDays || 0
          },
          recordings: recordings.map(r => ({
            id: r.id,
            text: r.text,
            timestamp: r.timestamp,
            quality: r.analysisData?.quality,
            improvements: r.analysisData?.improvements
          })),
          notes: notes.map(n => ({
            id: n.id,
            text: n.text,
            content: n.issue.content,
            tags: n.tags,
            timestamp: n.timestamp
          })),
          usageStats
        };
        content = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        filename = `nativemimic-data-${new Date().toISOString().split('T')[0]}.json`;
      }
      
      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      this.debugLog(' Data exported successfully to file:', filename);
      this.showSuccessMessage('📁 Data exported successfully!');
      
    } catch (error) {
      this.debugError(' Failed to export data:', error);
      this.showMessage('Failed to export data. Please try again.', 'error');
    }
  }

  generateTextExport(recordings, notes, bugReports, usageStats) {
    const exportDate = new Date().toLocaleDateString();
    const exportTime = new Date().toLocaleTimeString();
    
    let content = `VOCAFLUENT - PRONUNCIATION PRACTICE REPORT
Generated on: ${exportDate} at ${exportTime}
Version: 3.2

=== SUMMARY ===
Total Recordings: ${recordings.length}
Total Notes: ${notes.length}
Bug Reports: ${bugReports.length}
Current Streak: ${usageStats.streakDays || 0} days
Last Activity: ${usageStats.lastActivity || 'Never'}

`;

    if (recordings.length > 0) {
      content += `=== RECORDINGS (${recordings.length}) ===\n`;
      recordings.forEach((recording, index) => {
        const date = new Date(recording.timestamp).toLocaleDateString();
        content += `${index + 1}. "${recording.text}" (${date})\n`;
        content += `   Quality: ${recording.analysisData?.quality || 'Unknown'}\n`;
        if (recording.analysisData?.improvements?.length > 0) {
          content += `   Suggestions: ${recording.analysisData.improvements.join(', ')}\n`;
        }
        content += '\n';
      });
    }

    if (notes.length > 0) {
      content += `=== PRONUNCIATION NOTES (${notes.length}) ===\n`;
      notes.forEach((note, index) => {
        const date = new Date(note.timestamp).toLocaleDateString();
        content += `${index + 1}. "${note.text}" (${date})\n`;
        content += `   Note: ${note.issue.content}\n`;
        if (note.tags?.length > 0) {
          content += `   Tags: ${note.tags.join(', ')}\n`;
        }
        content += '\n';
      });
    }

    if (bugReports.length > 0) {
      content += `=== BUG REPORTS (${bugReports.length}) ===\n`;
      bugReports.forEach((report, index) => {
        const date = new Date(report.timestamp).toLocaleDateString();
        content += `${index + 1}. ${report.title} (${date})\n`;
        content += `   Category: ${report.category}\n`;
        content += `   Description: ${report.description}\n`;
        content += `   Status: ${report.status}\n\n`;
      });
    }

    content += `=== GENERATED BY ===
NativeMimic - AI Speech & Pronunciation Coach
Break speaking barriers, master pronunciation
Visit vocafluent.com for AI coaching platform`;

    return content;
  }

  // Dashboard tracking methods
  trackUsage(language, voiceType, speed, textLength) {
    const now = Date.now();
    
    // Track today's usage time
    this.todayUsage.push(now);
    
    // Track speed history
    this.speedHistory.push(speed);
    
    // Track language usage
    this.languageUsage[language] = (this.languageUsage[language] || 0) + 1;
    
    // Track voice usage
    this.voiceUsage[voiceType] = (this.voiceUsage[voiceType] || 0) + 1;
    
    // Track text length progression
    this.textLengths.push(textLength);
    
    // Update streak (simplified - daily streak)
    this.updateDailyStreak();
    
    // Save to storage periodically
    this.saveDashboardData();
  }

  updateDailyStreak() {
    const today = new Date().toDateString();
    const lastUsed = localStorage.getItem('nativemimic-last-used-date');
    
    if (lastUsed !== today) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
      
      if (lastUsed === yesterday) {
        this.dailyStreak += 1;
      } else if (lastUsed !== null) {
        this.dailyStreak = 1; // Reset streak if gap > 1 day
      } else {
        this.dailyStreak = 1; // First use
      }
      
      localStorage.setItem('nativemimic-last-used-date', today);
      localStorage.setItem('nativemimic-daily-streak', this.dailyStreak.toString());
    }
  }

  getDashboardData() {
    // Load saved data
    this.loadDashboardData();
    
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayUsage = this.todayUsage.filter(time => time >= todayStart);
    const todayMinutes = Math.round(todayUsage.length * 0.5); // Estimate 30 sec per usage
    
    // Calculate top language
    const topLanguageEntry = Object.entries(this.languageUsage)
      .sort((a, b) => b[1] - a[1])[0];
    const topLanguage = topLanguageEntry ? topLanguageEntry[0] : 'en';
    
    // Calculate preferred voice type
    const topVoiceEntry = Object.entries(this.voiceUsage)
      .sort((a, b) => b[1] - a[1])[0];
    const preferredVoice = topVoiceEntry ? 
      (topVoiceEntry[0].includes('google') ? 'Google' : 'System') : 'Google';
    
    // Calculate average speed
    const avgSpeed = this.speedHistory.length > 0 ? 
      (this.speedHistory.reduce((a, b) => a + b, 0) / this.speedHistory.length).toFixed(1) : '1.0';
    
    return {
      streak: this.dailyStreak,
      totalTexts: this.textLengths.length,
      topLanguage: topLanguage.toUpperCase(),
      preferredVoice: preferredVoice,
      avgSpeed: avgSpeed,
      todayTime: todayMinutes
    };
  }

  saveDashboardData() {
    try {
      const data = {
        todayUsage: this.todayUsage.slice(-100), // Keep last 100 entries
        speedHistory: this.speedHistory.slice(-100),
        languageUsage: this.languageUsage,
        voiceUsage: this.voiceUsage,
        textLengths: this.textLengths.slice(-100),
        dailyStreak: this.dailyStreak
      };
      localStorage.setItem('nativemimic-dashboard-data', JSON.stringify(data));
    } catch (error) {
      console.log('NativeMimic: Could not save dashboard data:', error);
    }
  }

  loadDashboardData() {
    try {
      const saved = localStorage.getItem('nativemimic-dashboard-data');
      if (saved) {
        const data = JSON.parse(saved);
        this.todayUsage = data.todayUsage || [];
        this.speedHistory = data.speedHistory || [];
        this.languageUsage = data.languageUsage || {};
        this.voiceUsage = data.voiceUsage || {};
        this.textLengths = data.textLengths || [];
        this.dailyStreak = data.dailyStreak || 0;
      }
      
      // Load streak from separate storage
      const streak = localStorage.getItem('nativemimic-daily-streak');
      if (streak) {
        this.dailyStreak = parseInt(streak);
      }
    } catch (error) {
      console.log('NativeMimic: Could not load dashboard data:', error);
    }
  }
}

// Initialize NativeMimic when DOM is ready - SINGLE INSTANCE ONLY
let nativeMimicInstance = null;

function initializeNativeMimic() {
  if (nativeMimicInstance) {
    console.log('[NativeMimic] Instance already exists, skipping initialization');
    return;
  }
  
  nativeMimicInstance = new NativeMimic();
  window.nativeMimicInstance = nativeMimicInstance;
  console.log('[NativeMimic] Single instance created');
  
  // Track extension initialization with unified analytics
  if (window.nativeMimicUnifiedAnalytics) {
    setTimeout(() => {
      window.nativeMimicUnifiedAnalytics.trackExtensionLoaded().catch(err => {
        console.log('NativeMimic: Analytics tracking failed (offline mode):', err.message);
      });
    }, 1000); // Delay to ensure analytics client is ready
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNativeMimic);
} else {
  initializeNativeMimic();
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!window.nativeMimicInstance) {
    // NativeMimic: Instance not found
    sendResponse({ error: 'Instance not found' });
    return;
  }
  
  if (request.action === 'apiKeyUpdated') {
    // Reinitialize ElevenLabs when API key is updated
    this.debugLog(' Received API key update message');
    window.nativeMimicInstance.initElevenLabs();
    sendResponse({ success: true });
    return true;
  }
  
  // REMOVED: updateEnabledState handler - using Option A (storage check on text selection)

  if (request.action === 'openMainInterface') {
    // Open the main NativeMimic interface
    this.debugLog(' Opening main interface from popup');
    if (window.nativeMimicInstance.isEnabled) {
      // Show the language selection modal as the main interface
      this.debugLog(' Extension active - highlight text to begin');
    } else {
      // If disabled, enable and then show interface
      window.nativeMimicInstance.isEnabled = true;
      this.debugLog(' Extension active - highlight text to begin');
    }
    sendResponse({ success: true });
    return true;
  }
  
  
  
  // REMOVED: Old toggleNativeMimic handler (replaced by updateEnabledState)
  // REMOVED: Old updateEnabled handler (replaced by updateEnabledState)
  
  if (request.action === 'updateSettings') {
    // Update settings from popup
    window.nativeMimicInstance.speechRate = request.settings.speechRate;
    window.nativeMimicInstance.selectedVoice = request.settings.selectedVoice;
    sendResponse({ success: true });
    return true;
  }
  
});