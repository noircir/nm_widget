// QuickSpeak Content Script - Core TTS functionality
class QuickSpeak {
  constructor() {
    // Better Chrome detection that excludes Brave
    this.isChrome = navigator.userAgent.includes('Chrome') && 
                   !navigator.userAgent.includes('Brave') && 
                   !window.navigator.brave;
    
    // Chrome version detection for specific bug workarounds
    this.chromeVersion = this.isChrome ? this.getChromeVersion() : null;
    this.isActive = true;
    this.isEnabled = false; // Widget disabled by default - user must enable
    this.currentUtterance = null;
    this.speechRate = 1.0;
    this.selectedVoice = null;
    this.availableVoices = [];
    this.pronunciationDatabase = new Map(); // For crowdsourced corrections
    this.lastSelectedText = '';
    this.isSpeaking = false;
    this.speechInProgress = false; // Additional flag for race condition
    this.speechStarted = false; // Track if onstart event actually fired (Chrome fix)
    this.userDraggedWidget = false; // Track if user has moved widget
    this.lastWidgetPosition = null; // Remember last dragged position
    this.currentSkin = 'blue'; // Default skin
    this.customColors = null; // Custom color picker values
    
    // Define preset skins
    this.presetSkins = {
      blue: {
        name: 'Ocean Blue',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        shadow: 'rgba(102, 126, 234, 0.4)'
      },
      sunflower: {
        name: 'Sunflower',
        gradient: 'linear-gradient(135deg, #e8e22e 0%, #f5b223 100%)',
        shadow: 'rgba(232, 226, 46, 0.4)'
      },
      citrus: {
        name: 'Citrus Fuzz',
        gradient: 'linear-gradient(135deg, #729a0a 0%, #c8e41b 100%)',
        shadow: 'rgba(114, 154, 10, 0.4)'
      },
      balance: {
        name: 'Balance',
        gradient: 'linear-gradient(135deg, #1a0639 0%, #3c0a6b 25%, #6a139e 50%, #a11acf 75%, #e324ff 100%)',
        shadow: 'rgba(26, 6, 57, 0.4)'
      },
      aquaflow: {
        name: 'Aquaflow',
        gradient: 'linear-gradient(135deg, #008080 0%, #66e6e6 100%)',
        shadow: 'rgba(0, 128, 128, 0.4)'
      }
    };
    
    this.init();
  }

  getChromeVersion() {
    const match = navigator.userAgent.match(/Chrome\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  async init() {
    // Load user settings
    await this.loadSettings();
    
    // Initialize Web Speech API
    this.initSpeechSynthesis();
    
    // Set up text selection listener
    this.setupSelectionListener();
    
    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();

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
    
    console.log('QuickSpeak initialized successfully');
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get({
        isActive: true,
        isEnabled: false, // Default to disabled on fresh install
        speechRate: 1.0,
        selectedVoiceURI: null,
        pronunciationCorrections: {}
      });
      
      this.isActive = result.isActive;
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
    chrome.storage.sync.get(['selectedVoiceURI', 'skinSettings', 'isEnabled'], (result) => {
      if (result.selectedVoiceURI) {
        this.selectedVoice = this.availableVoices.find(
          voice => voice.voiceURI === result.selectedVoiceURI
        );
      }
      
      // Load skin settings
      if (result && result.skinSettings) {
        this.currentSkin = result.skinSettings.currentSkin || 'blue';
        this.customColors = result.skinSettings.customColors || null;
        
        // Apply loaded skin to any existing widget
        if (document.getElementById('quickspeak-controls')) {
          this.updateWidgetSkin();
        }
      }
      
      // Load enabled state
      if (result.isEnabled !== undefined) {
        this.isEnabled = result.isEnabled;
      }
      
      // Fallback to best available voice
      if (!this.selectedVoice) {
        this.selectedVoice = this.getBestVoice();
      }
    });
  }

  detectLanguage(text) {
    // Simple language detection based on character patterns
    if (!text) return 'en';
    
    // Japanese: Hiragana, Katakana, or Kanji
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
      return 'ja';
    }
    
    // Chinese: Traditional or Simplified Chinese characters
    if (/[\u4E00-\u9FFF]/.test(text)) {
      return 'zh';
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
    
    // French: Check for French-specific diacritical marks and common patterns
    // Look for French accented characters that are less common in other languages
    if (/[àâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]/.test(text) || 
        /\b(le|la|les|de|du|des|et|est|avec|pour|dans|sur|par|une?|ce|cette|ces|que|qui|où|mais|ou|donc|car|ni|soit)\b/i.test(text)) {
      return 'fr';
    }
    
    // Default to English for Latin scripts and others
    return 'en';
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
    
    console.log(`QuickSpeak: Found voice for ${languageCode}:`, voice?.name || 'none');
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
      `Check your system settings to add ${langName} text-to-speech voices, or upgrade to QuickSpeak Premium (coming soon) for more language options.`
    );
    
    console.log(`QuickSpeak: ${langName} voice not found. User notified about installation options.`);
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
    
    const handleSelection = () => {
      if (processingSelection) {
        console.log('QuickSpeak: Selection already processing, ignoring');
        return;
      }
      processingSelection = true;
      
      this.handleTextSelection();
      
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
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + E: Toggle QuickSpeak enable/disable
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.toggleEnabled();
        return;
      }
      
      // Only process other shortcuts when QuickSpeak is enabled
      if (!this.isEnabled) return;
      
      // Ctrl/Cmd + Shift + S: Speak selected text
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        console.log('QuickSpeak: Ctrl+Shift+S triggered');
        const selectedText = window.getSelection().toString().trim();
        if (selectedText.length === 0) {
          this.showMessage('Please select some text first', 'info');
        } else {
          this.handleTextSelection(true); // Allow duplicate text for intentional replay
        }
      }
      
      // Ctrl/Cmd + Shift + P: Pause/Resume
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        console.log('QuickSpeak: Ctrl+Shift+P triggered');
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
      
      // Speed control: Ctrl+Shift+Plus/Minus (works when speech is active or widget is shown)
      if ((e.key === '=' || e.key === '+') && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        console.log('QuickSpeak: Ctrl+Shift+Plus triggered');
        if (speechSynthesis.speaking || this.currentUtterance) {
          this.adjustSpeed(0.1);
          this.showMessage(`Speed: ${this.speechRate.toFixed(1)}x`, 'info');
        } else {
          this.showMessage('Start speaking first to adjust speed', 'info');
        }
      } else if ((e.key === '-' || e.key === '_') && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        console.log('QuickSpeak: Ctrl+Shift+Minus triggered');
        if (speechSynthesis.speaking || this.currentUtterance) {
          this.adjustSpeed(-0.1);
          this.showMessage(`Speed: ${this.speechRate.toFixed(1)}x`, 'info');
        } else {
          this.showMessage('Start speaking first to adjust speed', 'info');
        }
      }
    });
  }

  handleTextSelection(allowDuplicate = false) {
    if (!this.isEnabled) return;
    
    // IMMEDIATE race condition check
    if (this.speechInProgress) {
      console.log('QuickSpeak: Speech already in progress, blocking');
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
      
      // Reset progress flag for new selection and set text
      this.speechInProgress = false;
      this.lastSelectedText = selectedText;
      
      console.log('QuickSpeak: Text selected:', selectedText.substring(0, 30) + '...');
      this.showSpeechControls(selection.getRangeAt(0));
    } else {
      console.log('QuickSpeak: Skipping - reasons:', {
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
    console.log(`[${Date.now()}] QuickSpeak: speakText initiated for:`, text.substring(0, 30));
    
    // Chrome gets completely different, simpler treatment
    if (this.isChrome) {
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
    const detectedLanguage = this.detectLanguage(correctedText);
    const voiceForText = this.getVoiceForLanguage(detectedLanguage);
    
    if (!voiceForText && detectedLanguage !== 'en') {
      // No voice found for language - aborting
      this.isSpeaking = false;
      return;
    }
    
    const voiceToUse = voiceForText || this.selectedVoice;
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
        // Chrome detected - skipping primer entirely
        // Chrome gets no primer at all - direct speech only
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
    
    // Chrome fix: Use local service voices when possible (avoid 15-second cutoff)
    if (this.selectedVoice && this.selectedVoice.localService) {
      utterance.voice = this.selectedVoice;
      // Chrome: Using localService voice to avoid cutoff bug
    } else if (this.availableVoices.length > 0) {
      // Find first local voice as fallback
      const localVoice = this.availableVoices.find(v => v.localService);
      if (localVoice) {
        utterance.voice = localVoice;
        // Chrome: Fallback to local voice
      }
    }
    
    // Simple event handlers
    utterance.onstart = () => {
      // Chrome: Speech started successfully
      this.speechStarted = true;
      this.updatePlayPauseButton('⏸️', 'Pause');
    };
    
    utterance.onend = () => {
      // Chrome: Speech ended
      this.isSpeaking = false;
      this.speechStarted = false;
      this.updatePlayPauseButton('▶️', 'Play');
    };
    
    utterance.onerror = (e) => {
      // Chrome: Speech error occurred
      this.isSpeaking = false;
      this.speechStarted = false;
      this.updatePlayPauseButton('▶️', 'Play');
      
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
              `Chrome ${this.chromeVersion} has known Web Speech API issues.\n\n✅ WORKING SOLUTIONS:\n• Use Brave browser (100% compatible)\n• Use Microsoft Edge (fully supported)\n• Use Firefox (reliable)\n\n🔧 CHROME FIXES TO TRY:\n• Refresh this page (Ctrl+F5)\n• Restart Chrome completely\n• Update Chrome to latest version\n\nQuickSpeak works perfectly in other browsers!`
            );
              }
            }, 1000);
          }
          
          this.isSpeaking = false;
          this.speechStarted = false;
          this.updatePlayPauseButton('▶️', 'Play');
        }
      }, 300);
      
    } catch (error) {
      // Chrome: speak() failed
      this.isSpeaking = false;
      this.updatePlayPauseButton('▶️', 'Play');
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

  showSpeechControls(range) {
    // Remove any existing controls
    this.hideSpeechControls();
    
    // Create control panel
    const controls = document.createElement('div');
    controls.id = 'quickspeak-controls';
    controls.className = 'quickspeak-speech-controls';
    
    // Position widget - use remembered position if user dragged it, otherwise auto-position
    const controlsWidth = 350; // Estimated width of controls
    const controlsHeight = 80; // Estimated height of controls
    
    let top, left;
    
    if (this.userDraggedWidget && this.lastWidgetPosition) {
      // Use last dragged position
      top = this.lastWidgetPosition.top;
      left = this.lastWidgetPosition.left;
      console.log('QuickSpeak: Using remembered position:', { top, left });
    } else {
      // Auto-position near selection
      const rect = range.getBoundingClientRect();
      top = rect.bottom + 10;
      left = rect.left;
      
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
      console.log('QuickSpeak: Auto-positioning widget:', { top, left });
    }
    
    controls.style.position = 'fixed';
    controls.style.top = `${top}px`;
    controls.style.left = `${left}px`;
    controls.style.zIndex = '10000';
    controls.style.cursor = 'move'; // Indicate it's draggable
    
    // Control buttons and speed slider
    controls.innerHTML = `
      <div class="quickspeak-controls-container">
        <button id="quickspeak-play-pause" title="Play selected text (Ctrl+Shift+S)">▶️</button>
        <div class="quickspeak-speed-control">
          <label>Speed:</label>
          <input type="range" id="quickspeak-speed" min="0.3" max="2.0" step="0.1" value="${this.speechRate}">
          <span id="quickspeak-speed-value">${this.speechRate}x</span>
        </div>
        <button id="quickspeak-report" title="Report pronunciation error">🚩</button>
        <button id="quickspeak-skin" title="Settings & Skins">⚙️</button>
        <button id="quickspeak-close" title="Close">✕</button>
      </div>
    `;
    
    document.body.appendChild(controls);
    
    // Apply current skin
    this.updateWidgetSkin();
    
    // Set up control event listeners
    this.setupControlsEventListeners();
    
    // Add drag functionality
    this.makeDraggable(controls);
    
    // Widget stays persistent - only user can close it with X button
    // No auto-hide timers at all for maximum replay convenience
  }

  setupControlsEventListeners() {
    const playPauseBtn = document.getElementById('quickspeak-play-pause');
    const speedSlider = document.getElementById('quickspeak-speed');
    const speedValue = document.getElementById('quickspeak-speed-value');
    const reportBtn = document.getElementById('quickspeak-report');
    const skinBtn = document.getElementById('quickspeak-skin');
    const closeBtn = document.getElementById('quickspeak-close');
    
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        // Check if QuickSpeak is enabled before allowing any TTS functionality
        if (!this.isEnabled) {
          console.log('QuickSpeak: Play button blocked - extension is disabled');
          return;
        }
        
        if (speechSynthesis.speaking && !speechSynthesis.paused) {
          // Currently playing - pause it
          speechSynthesis.pause();
          this.updatePlayPauseButton('▶️', 'Resume (Ctrl+Shift+P)');
        } else if (speechSynthesis.paused) {
          // Currently paused - resume it
          speechSynthesis.resume();
          this.updatePlayPauseButton('⏸️', 'Pause (Ctrl+Shift+P)');
        } else {
          // Not speaking - start new speech
          console.log('QuickSpeak: Play button clicked');
          
          // Chrome-specific reset to break stuck states
          if (this.isChrome) {
            console.log('QuickSpeak: Chrome detected - performing full reset');
            speechSynthesis.cancel();
            this.isSpeaking = false;
            this.speechStarted = false;
            this.speechInProgress = false;
            this.lastSelectedText = ''; // Clear to allow new selections
            // Force button reset
            this.updatePlayPauseButton('▶️', 'Play selected text (Ctrl+Shift+S)');
          }
          
          // Ensure audio context is active for all browsers
          speechSynthesis.resume();
          
          this.speechInProgress = false;
          const selectedText = window.getSelection().toString().trim();
          if (selectedText) {
            // Directly speak text, bypassing duplicate check for button clicks
            this.speakText(selectedText);
          }
        }
      });
    }
    
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        // Check if QuickSpeak is enabled before allowing speed changes
        if (!this.isEnabled) {
          console.log('QuickSpeak: Speed adjustment blocked - extension is disabled');
          return;
        }
        
        const newRate = parseFloat(e.target.value);
        this.adjustSpeed(newRate - this.speechRate);
        speedValue.textContent = `${newRate}x`;
      });
    }
    
    if (reportBtn) {
      reportBtn.addEventListener('click', () => this.showPronunciationReport());
    }
    
    if (skinBtn) {
      skinBtn.addEventListener('click', () => this.showSkinSelector());
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
    const existing = document.getElementById('quickspeak-controls');
    if (existing) {
      existing.remove();
    }
  }

  toggleSpeech() {
    // Check if QuickSpeak is enabled before allowing speech toggle
    if (!this.isEnabled) {
      console.log('QuickSpeak: Speech toggle blocked - extension is disabled');
      return;
    }
    
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      this.updatePlayPauseButton('▶️', 'Resume (Ctrl+Shift+P)');
    } else if (speechSynthesis.paused) {
      speechSynthesis.resume();
      this.updatePlayPauseButton('⏸️', 'Pause (Ctrl+Shift+P)');
    }
  }

  stopSpeech() {
    // Force stop all speech
    speechSynthesis.cancel();
    this.stopSpeechMonitoring(); // Stop monitoring when speech is cancelled
    
    // Clear any pending speech
    if (this.currentUtterance) {
      this.currentUtterance.onstart = null;
      this.currentUtterance.onend = null;
      this.currentUtterance.onerror = null;
    }
    
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.speechInProgress = false; // Reset progress flag
    document.body.classList.remove('quickspeak-speaking');
  }

  adjustSpeed(delta) {
    const newRate = Math.max(0.3, Math.min(2.0, this.speechRate + delta));
    this.speechRate = newRate;
    
    // Save to settings
    chrome.storage.sync.set({ speechRate: newRate });
    
    // Update speed slider if visible
    const speedSlider = document.getElementById('quickspeak-speed');
    const speedValue = document.getElementById('quickspeak-speed-value');
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

  updatePlayPauseButton(icon, title) {
    const playPauseBtn = document.getElementById('quickspeak-play-pause');
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
        this.updatePlayPauseButton('⏸️', 'Pause (Ctrl+Shift+P)');
      } else if (isCurrentlyPaused) {
        // Speech is paused - ensure resume/play button is shown
        this.updatePlayPauseButton('▶️', 'Resume (Ctrl+Shift+P)');
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
    // Remove any existing skin selector
    const existing = document.getElementById('quickspeak-skin-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'quickspeak-skin-modal';
    modal.className = 'quickspeak-modal';
    
    const presetOptions = Object.keys(this.presetSkins).map(skinKey => {
      const skin = this.presetSkins[skinKey];
      const isSelected = this.currentSkin === skinKey;
      return `
        <div class="quickspeak-skin-option ${isSelected ? 'selected' : ''}" data-skin="${skinKey}">
          <div class="quickspeak-skin-preview" style="background: ${skin.gradient};"></div>
          <span>${skin.name}</span>
        </div>
      `;
    }).join('');
    
    modal.innerHTML = `
      <div class="quickspeak-modal-overlay">
        <div class="quickspeak-modal-content">
          <div class="quickspeak-modal-header">
            <h3>Settings & Skins</h3>
            <button class="quickspeak-modal-close">✕</button>
          </div>
          <div class="quickspeak-modal-body">
            <div class="quickspeak-skin-presets">
              <h4>Widget Skins</h4>
              <div class="quickspeak-skin-grid">
                ${presetOptions}
              </div>
            </div>
            <div class="quickspeak-skin-custom">
              <h4>Custom Colors</h4>
              <div class="quickspeak-color-inputs">
                <label>
                  Start Color: <input type="color" id="quickspeak-color1" value="#667eea">
                </label>
                <label>
                  End Color: <input type="color" id="quickspeak-color2" value="#764ba2">
                </label>
                <button id="quickspeak-apply-custom" class="quickspeak-btn">Apply Custom</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Apply current skin to modal
    this.applyModalSkin(modal);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.quickspeak-modal-close');
    closeBtn.addEventListener('click', () => modal.remove());
    
    // Preset skin selection
    modal.querySelectorAll('.quickspeak-skin-option').forEach(option => {
      option.addEventListener('click', () => {
        const skinKey = option.dataset.skin;
        this.applySkin(skinKey);
        modal.remove();
      });
    });
    
    // Custom color application
    const applyCustomBtn = modal.querySelector('#quickspeak-apply-custom');
    applyCustomBtn.addEventListener('click', () => {
      const color1 = modal.querySelector('#quickspeak-color1').value;
      const color2 = modal.querySelector('#quickspeak-color2').value;
      this.applyCustomSkin(color1, color2);
      modal.remove();
    });
    
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('quickspeak-modal-overlay')) {
        modal.remove();
      }
    });
  }

  applySkin(skinKey) {
    this.currentSkin = skinKey;
    this.customColors = null;
    this.updateWidgetSkin();
    this.saveSkinSettings();
  }

  applyCustomSkin(color1, color2) {
    this.currentSkin = 'custom';
    this.customColors = { color1, color2 };
    this.updateWidgetSkin();
    this.saveSkinSettings();
  }

  saveSkinSettings() {
    const skinSettings = {
      currentSkin: this.currentSkin,
      customColors: this.customColors
    };
    chrome.storage.sync.set({ skinSettings });
  }

  updateWidgetSkin() {
    const controls = document.getElementById('quickspeak-controls');
    if (!controls) return;
    
    let gradient, shadow;
    
    if (this.currentSkin === 'custom' && this.customColors) {
      gradient = `linear-gradient(135deg, ${this.customColors.color1} 0%, ${this.customColors.color2} 100%)`;
      shadow = `${this.customColors.color1}40`; // Add transparency
    } else {
      const skin = this.presetSkins[this.currentSkin] || this.presetSkins.blue;
      gradient = skin.gradient;
      shadow = skin.shadow;
    }
    
    controls.style.background = gradient;
    controls.style.boxShadow = `0 8px 32px ${shadow}`;
    
    // Apply skin-specific button styling for better visibility
    const buttons = controls.querySelectorAll('button');
    buttons.forEach(button => {
      if (this.currentSkin === 'sunflower') {
        // Darker borders for bright yellow theme
        button.style.border = '2px solid rgba(0, 0, 0, 0.4)';
        button.style.background = 'rgba(255, 255, 255, 0.3)';
      } else {
        // Reset to default styling
        button.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        button.style.background = 'rgba(255, 255, 255, 0.2)';
      }
    });
  }

  applyModalSkin(modal) {
    const modalContent = modal.querySelector('.quickspeak-modal-content');
    if (!modalContent) return;
    
    let gradient, shadow;
    
    if (this.currentSkin === 'custom' && this.customColors) {
      gradient = `linear-gradient(135deg, ${this.customColors.color1} 0%, ${this.customColors.color2} 100%)`;
      shadow = `${this.customColors.color1}40`;
    } else {
      const skin = this.presetSkins[this.currentSkin] || this.presetSkins.blue;
      gradient = skin.gradient;
      shadow = skin.shadow;
    }
    
    // Modal styling is now handled by CSS only for consistent black/white/gray theme
  }

  toggleEnabled() {
    this.isEnabled = !this.isEnabled;
    
    if (!this.isEnabled) {
      // Disable: Clean up and show brief notification
      this.stopSpeech();
      this.hideSpeechControls();
      this.lastSelectedText = ''; // Clear selection memory
      
      this.showMessage('QuickSpeak disabled. Press Ctrl+Shift+E to re-enable.', 'info');
    } else {
      // Enable: Reset state and show brief confirmation
      this.speechInProgress = false;
      this.isSpeaking = false;
      this.lastSelectedText = ''; // Clear to allow fresh selections
      
      this.showMessage('QuickSpeak enabled! Select text to use.', 'success');
    }
    
    // Save enabled state
    chrome.storage.sync.set({ isEnabled: this.isEnabled });
    
    console.log(`QuickSpeak: Widget ${this.isEnabled ? 'enabled' : 'disabled'}`);
  }


  showPronunciationReport() {
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText) return;
    
    this.showPronunciationReportModal(selectedText);
  }

  showPronunciationReportModal(text) {
    // Remove any existing modal
    const existingModal = document.getElementById('quickspeak-pronunciation-modal');
    if (existingModal) existingModal.remove();
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'quickspeak-pronunciation-modal';
    modal.className = 'quickspeak-modal';
    
    modal.innerHTML = `
      <div class="quickspeak-modal-overlay">
        <div class="quickspeak-modal-content">
          <div class="quickspeak-modal-header">
            <h3>🗣️ Report Pronunciation Issue</h3>
            <button class="quickspeak-modal-close">&times;</button>
          </div>
          
          <div class="quickspeak-modal-body">
            <div class="quickspeak-text-display">
              <label>Selected text:</label>
              <div class="quickspeak-selected-text">"${text}"</div>
            </div>
            
            <div class="quickspeak-report-options">
              <label>How would you like to report this?</label>
              
              <div class="quickspeak-option-buttons">
                <button class="quickspeak-option-btn" data-option="text">
                  <span class="quickspeak-option-icon">✏️</span>
                  <span class="quickspeak-option-text">Describe the issue</span>
                </button>
                <button class="quickspeak-option-btn" data-option="record">
                  <span class="quickspeak-option-icon">🎤</span>
                  <span class="quickspeak-option-text">Record correct pronunciation</span>
                </button>
              </div>
            </div>
            
            <div class="quickspeak-input-section" style="display: none;">
              <div class="quickspeak-text-input" style="display: none;">
                <label for="quickspeak-issue-text">Describe what's wrong:</label>
                <textarea id="quickspeak-issue-text" placeholder="e.g., 'First word is cut off' or 'Wrong stress on syllable'"></textarea>
              </div>
              
              <div class="quickspeak-voice-input" style="display: none;">
                <label>Record the correct pronunciation:</label>
                <div class="quickspeak-voice-controls">
                  <button id="quickspeak-record-btn" class="quickspeak-record-button">
                    <span class="quickspeak-record-icon">🎤</span>
                    Start Recording
                  </button>
                  <div id="quickspeak-recording-status" class="quickspeak-recording-status"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="quickspeak-modal-footer">
            <button class="quickspeak-btn quickspeak-btn-secondary" id="quickspeak-cancel-report">Cancel</button>
            <button class="quickspeak-btn quickspeak-btn-primary" id="quickspeak-submit-report" style="display: none;">Submit Report</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Apply current skin to modal
    this.applyModalSkin(modal);
    
    this.setupPronunciationModalEvents(text);
  }

  setupPronunciationModalEvents(text) {
    const modal = document.getElementById('quickspeak-pronunciation-modal');
    
    // Close modal events
    const closeBtn = modal.querySelector('.quickspeak-modal-close');
    const cancelBtn = modal.querySelector('#quickspeak-cancel-report');
    const overlay = modal.querySelector('.quickspeak-modal-overlay');
    
    [closeBtn, cancelBtn].forEach(btn => {
      btn.addEventListener('click', () => modal.remove());
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) modal.remove();
    });
    
    // Option selection
    const optionBtns = modal.querySelectorAll('.quickspeak-option-btn');
    const inputSection = modal.querySelector('.quickspeak-input-section');
    const textInput = modal.querySelector('.quickspeak-text-input');
    const voiceInput = modal.querySelector('.quickspeak-voice-input');
    const submitBtn = modal.querySelector('#quickspeak-submit-report');
    
    optionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Reset states
        optionBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        inputSection.style.display = 'block';
        submitBtn.style.display = 'block';
        
        const option = btn.dataset.option;
        if (option === 'text') {
          textInput.style.display = 'block';
          voiceInput.style.display = 'none';
          modal.querySelector('#quickspeak-issue-text').focus();
        } else if (option === 'record') {
          textInput.style.display = 'none';
          voiceInput.style.display = 'block';
        }
      });
    });
    
    // Submit report
    submitBtn.addEventListener('click', () => {
      const selectedOption = modal.querySelector('.quickspeak-option-btn.active')?.dataset.option;
      let reportData = null;
      
      if (selectedOption === 'text') {
        const issueText = modal.querySelector('#quickspeak-issue-text').value.trim();
        if (issueText) {
          reportData = { type: 'text', content: issueText };
        }
      } else if (selectedOption === 'record') {
        // Voice recording would be handled here
        reportData = { type: 'voice', content: 'Voice recording feature coming soon' };
      }
      
      if (reportData) {
        this.submitPronunciationReport(text, reportData);
        modal.remove();
      }
    });
  }

  async submitPronunciationReport(text, issue) {
    try {
      // For MVP, store locally (will send to server in production)
      const report = {
        text: text,
        issue: issue,
        timestamp: Date.now(),
        url: window.location.href,
        language: document.documentElement.lang || 'unknown'
      };
      
      // Store in local storage for now
      const reports = await this.getStoredReports();
      reports.push(report);
      
      chrome.storage.local.set({ pronunciationReports: reports });
      
      this.showSuccessMessage('Thank you! Your pronunciation report has been submitted.');
    } catch (error) {
      // Error submitting report
      this.showErrorMessage('Failed to submit report. Please try again.');
    }
  }

  async getStoredReports() {
    try {
      const result = await chrome.storage.local.get(['pronunciationReports']);
      return result.pronunciationReports || [];
    } catch (error) {
      return [];
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
    messageDiv.className = `quickspeak-message quickspeak-message-${type}`;
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
    const existing = document.getElementById('quickspeak-permanent-message');
    if (existing) existing.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.id = 'quickspeak-permanent-message';
    messageDiv.className = 'quickspeak-permanent-message';
    
    messageDiv.innerHTML = `
      <div class="quickspeak-permanent-header">
        <strong>${title}</strong>
        <button class="quickspeak-permanent-close">✕</button>
      </div>
      <div class="quickspeak-permanent-body">
        ${details.replace(/\n/g, '<br>')}
      </div>
    `;
    
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.zIndex = '10001';
    
    document.body.appendChild(messageDiv);
    
    // Add close button functionality
    const closeBtn = messageDiv.querySelector('.quickspeak-permanent-close');
    closeBtn.addEventListener('click', () => messageDiv.remove());
  }

  onSpeechStart() {
    console.log('QuickSpeak: Speech started');
    this.speechStarted = true; // Track that speech actually started (Chrome fix)
    // Add visual indicator that speech is active
    document.body.classList.add('quickspeak-speaking');
    // Update button to show pause state
    this.updatePlayPauseButton('⏸️', 'Pause (Ctrl+Shift+P)');
  }

  onSpeechEnd() {
    console.log('QuickSpeak: Speech ended');
    this.stopSpeechMonitoring(); // Stop monitoring when speech ends
    document.body.classList.remove('quickspeak-speaking');
    
    // Check if speech actually started (Chrome fix)
    const speechActuallyStarted = this.speechStarted || false;
    console.log('QuickSpeak: Speech actually started:', speechActuallyStarted);
    
    this.isSpeaking = false; // Allow new speech
    this.speechInProgress = false; // Reset progress flag
    this.speechStarted = false; // Reset start flag
    
    // Only remember text as "last spoken" if speech actually started
    // This prevents Chrome's immediate onend from blocking replay attempts
    if (!speechActuallyStarted) {
      console.log('QuickSpeak: Speech failed to start - clearing lastSelectedText to allow retry');
      this.lastSelectedText = '';
    }
    
    // Reset play/pause button to default state
    this.updatePlayPauseButton('▶️', 'Play selected text (Ctrl+Shift+S)');
    
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
    console.log('QuickSpeak: Testing speech synthesis...');
    console.log('QuickSpeak: speechSynthesis available:', !!window.speechSynthesis);
    console.log('QuickSpeak: SpeechSynthesisUtterance available:', !!window.SpeechSynthesisUtterance);
    
    if (window.speechSynthesis) {
      console.log('QuickSpeak: speechSynthesis.getVoices():', speechSynthesis.getVoices().length);
      
      // Try a simple test utterance
      setTimeout(() => {
        const testUtterance = new SpeechSynthesisUtterance('test');
        testUtterance.volume = 0.1; // Very quiet
        testUtterance.onstart = () => console.log('QuickSpeak: Test speech started');
        testUtterance.onend = () => console.log('QuickSpeak: Test speech ended');
        testUtterance.onerror = (e) => console.log('QuickSpeak: Test speech error:', e.error);
        
        console.log('QuickSpeak: Starting test speech (very quiet)');
        speechSynthesis.speak(testUtterance);
      }, 1000);
    }
  }

  makeDraggable(element) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    element.addEventListener('mousedown', (e) => {
      // Only allow dragging from the main container, not buttons
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.classList.contains('quickspeak-speed-control')) {
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
        console.log('QuickSpeak: Widget dragged, position saved:', this.lastWidgetPosition);
      }
    });
  }
}

// Initialize QuickSpeak when DOM is ready - SINGLE INSTANCE ONLY
let quickSpeakInstance = null;

function initializeQuickSpeak() {
  if (quickSpeakInstance) {
    console.log('QuickSpeak: Instance already exists, skipping initialization');
    return;
  }
  
  quickSpeakInstance = new QuickSpeak();
  window.quickSpeakInstance = quickSpeakInstance;
  console.log('QuickSpeak: Single instance created');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeQuickSpeak);
} else {
  initializeQuickSpeak();
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!window.quickSpeakInstance) {
    // QuickSpeak: Instance not found
    sendResponse({ error: 'Instance not found' });
    return;
  }
  
  if (request.action === 'toggleQuickSpeak') {
    // Toggle extension on/off
    window.quickSpeakInstance.isActive = !window.quickSpeakInstance.isActive;
    chrome.storage.sync.set({ isActive: window.quickSpeakInstance.isActive });
    sendResponse({ isActive: window.quickSpeakInstance.isActive });
  }
  
  if (request.action === 'updateSettings') {
    // Update settings from popup
    window.quickSpeakInstance.speechRate = request.settings.speechRate;
    window.quickSpeakInstance.selectedVoice = request.settings.selectedVoice;
    sendResponse({ success: true });
  }
  
  if (request.action === 'updateEnabled') {
    // Update enabled state from popup
    window.quickSpeakInstance.isEnabled = request.isEnabled;
    
    if (!request.isEnabled) {
      // When disabled, immediately clean up widget and stop any speech
      window.quickSpeakInstance.hideSpeechControls();
      window.quickSpeakInstance.stopSpeech();
      console.log('QuickSpeak: Disabled from popup - widget removed and speech stopped');
    } else {
      // When re-enabled, ensure all state is properly reset
      window.quickSpeakInstance.speechInProgress = false;
      window.quickSpeakInstance.isSpeaking = false;
      window.quickSpeakInstance.lastSelectedText = ''; // Clear to allow re-selection of same text
      console.log('QuickSpeak: Re-enabled from popup - state reset for new selections');
    }
    
    console.log(`QuickSpeak: Enabled state updated to ${request.isEnabled} from popup`);
    sendResponse({ success: true });
  }
  
});