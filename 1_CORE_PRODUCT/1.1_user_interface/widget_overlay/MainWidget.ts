/**
 * MainWidget.ts
 * Primary overlay widget for NativeMimic v4.0
 * 
 * Orchestrates the main user interface displayed on web pages
 * Replaces unstable JavaScript implementation with TypeScript
 */

import { VoiceSelector, Voice } from '../voice_selection/VoiceSelector';
import { RecordingButton, RecordingState } from '../recording_controls/RecordingButton';
import { ComponentStyles } from '../styles/design-system';
import { AudioManager } from '../../1.2_voice_engine/audio_processing/AudioManager';
import { GoogleTTSClient, TTSRequest } from '../../1.2_voice_engine/tts_integration/GoogleTTSClient';

export interface WidgetState {
  isVisible: boolean;
  selectedText: string;
  currentLanguage: string;
  isPlaying: boolean;
  isRecording: boolean;
  position: { x: number; y: number };
  theme: 'light' | 'dark';
}

export interface WidgetConfig {
  maxTextLength: number;
  autoLanguageDetection: boolean;
  showSpeedControl: boolean;
  enableRecording: boolean;
  enableAnalytics: boolean;
}

export class MainWidget {
  private state: WidgetState;
  private config: WidgetConfig;
  private container: HTMLElement | null = null;
  private voiceSelector!: VoiceSelector;
  private recordingButton!: RecordingButton;
  private audioManager: AudioManager;
  private ttsClient: GoogleTTSClient;

  constructor(
    config: WidgetConfig, 
    audioManager: AudioManager, 
    ttsClient: GoogleTTSClient
  ) {
    this.config = config;
    this.audioManager = audioManager;
    this.ttsClient = ttsClient;
    this.state = {
      isVisible: false,
      selectedText: '',
      currentLanguage: 'en',
      isPlaying: false,
      isRecording: false,
      position: { x: 0, y: 0 },
      theme: 'light'
    };

    this.initializeComponents();
    this.setupEventListeners();
  }

  /**
   * Show widget at specified position with selected text
   */
  show(text: string, position: { x: number; y: number }): void {
    // Limit text length to prevent abuse and API cost overruns
    if (text.length > this.config.maxTextLength) {
      text = text.substring(0, this.config.maxTextLength) + '...';
    }

    this.state.selectedText = text;
    this.state.position = position;
    this.state.isVisible = true;

    // Auto-detect language if enabled
    if (this.config.autoLanguageDetection) {
      this.detectLanguage(text);
    }

    this.render();
    this.trackAnalytics('widget_shown', { textLength: text.length });
  }

  /**
   * Hide widget and cleanup
   */
  hide(): void {
    this.state.isVisible = false;
    this.stopAudio();
    this.removeFromDOM();
    this.trackAnalytics('widget_hidden');
  }

  /**
   * Play selected text with current voice using AudioManager and GoogleTTSClient
   */
  async playText(): Promise<void> {
    if (!this.state.selectedText || this.state.isPlaying) return;

    try {
      this.state.isPlaying = true;
      this.updateUI();

      const selectedVoice = this.voiceSelector.getSelectedVoice();
      if (!selectedVoice) {
        throw new Error('No voice selected');
      }

      // Create TTS request
      const ttsRequest: TTSRequest = {
        text: this.state.selectedText,
        languageCode: this.state.currentLanguage,
        voiceId: selectedVoice.id,
        audioFormat: 'mp3',
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0
      };

      // Use TTS client with AudioManager for consistent audio handling
      await this.ttsClient.synthesizeAndPlay(ttsRequest, () => {
        this.state.isPlaying = false;
        this.updateUI();
      });
      
      this.trackAnalytics('text_played', {
        textLength: this.state.selectedText.length,
        voiceId: selectedVoice.id,
        language: this.state.currentLanguage
      });

    } catch (error) {
      this.state.isPlaying = false;
      this.updateUI();
      this.showError('Failed to play audio: ' + (error as Error).message);
    }
  }

  /**
   * Stop current audio playback using AudioManager
   */
  async stopAudio(): Promise<void> {
    await this.audioManager.stopAudio();
    this.state.isPlaying = false;
    this.updateUI();
  }

  /**
   * Detect language of selected text
   */
  private async detectLanguage(text: string): Promise<void> {
    try {
      // TODO: Implement language detection
      // Could use browser API or external service
      // For now, simple heuristic based on character sets
      
      const detectedLanguage = this.simpleLanguageDetection(text);
      if (detectedLanguage !== this.state.currentLanguage) {
        this.state.currentLanguage = detectedLanguage;
        await this.voiceSelector.loadVoicesForLanguage(detectedLanguage);
        this.updateUI();
      }
    } catch (error) {
      console.error('Language detection failed:', error);
    }
  }

  /**
   * Simple language detection based on character patterns
   */
  private simpleLanguageDetection(text: string): string {
    // Chinese characters
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    // Japanese characters
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
    // Arabic characters
    if (/[\u0600-\u06ff]/.test(text)) return 'ar';
    // Cyrillic characters
    if (/[\u0400-\u04ff]/.test(text)) return 'ru';
    
    // European language detection (basic)
    const words = text.toLowerCase().split(/\s+/);
    const frenchWords = ['le', 'la', 'les', 'de', 'du', 'des', 'et', 'est', 'une', 'dans'];
    const spanishWords = ['el', 'la', 'los', 'las', 'de', 'del', 'y', 'es', 'una', 'en'];
    const germanWords = ['der', 'die', 'das', 'den', 'dem', 'und', 'ist', 'eine', 'in'];
    
    const frenchCount = words.filter(word => frenchWords.includes(word)).length;
    const spanishCount = words.filter(word => spanishWords.includes(word)).length;
    const germanCount = words.filter(word => germanWords.includes(word)).length;
    
    if (frenchCount > spanishCount && frenchCount > germanCount) return 'fr';
    if (spanishCount > germanCount) return 'es';
    if (germanCount > 0) return 'de';
    
    return 'en'; // Default to English
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return this.ttsClient.getCacheStats();
  }

  /**
   * Clear audio cache
   */
  clearCache(): void {
    this.ttsClient.clearCache();
  }

  /**
   * Get current audio playback state
   */
  getAudioState() {
    return this.audioManager.getPlaybackState();
  }

  /**
   * Initialize child components
   */
  private initializeComponents(): void {
    this.voiceSelector = new VoiceSelector(
      {
        maxDisplayedVoices: 5,
        showMoreButton: true,
        enableQualityRating: true,
        defaultLanguage: 'en',
        autoSelectBest: true
      },
      (voice) => this.onVoiceChanged(voice)
    );

    this.recordingButton = new RecordingButton(
      {
        maxDuration: 30,
        audioFormat: 'webm',
        sampleRate: 44100,
        requireConsent: true
      },
      (state) => this.onRecordingStateChanged(state)
    );
  }

  /**
   * Setup global event listeners
   */
  private setupEventListeners(): void {
    // Click outside to hide widget
    document.addEventListener('click', (event) => {
      if (this.container && !this.container.contains(event.target as Node)) {
        this.hide();
      }
    });

    // Escape key to hide widget
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.state.isVisible) {
        this.hide();
      }
    });
  }

  /**
   * Handle voice selection change
   */
  private onVoiceChanged(voice: Voice): void {
    this.trackAnalytics('voice_changed', { voiceId: voice.id });
  }

  /**
   * Handle recording state change
   */
  private onRecordingStateChanged(state: RecordingState): void {
    this.state.isRecording = state.status === 'recording';
    this.updateUI();
    
    if (state.status === 'complete' && state.audioBlob) {
      this.trackAnalytics('recording_completed', { duration: state.duration });
    }
  }

  /**
   * Render widget to DOM
   */
  private render(): void {
    if (!this.state.isVisible) return;

    // Remove existing widget
    this.removeFromDOM();

    // Create widget container
    this.container = document.createElement('div');
    this.container.className = `nativemimic-widget ${ComponentStyles.widget.overlay}`;
    this.container.style.left = `${this.state.position.x}px`;
    this.container.style.top = `${this.state.position.y}px`;

    // Add widget content
    this.container.innerHTML = this.getWidgetHTML();

    // Attach event listeners
    this.attachEventListeners();

    // Add to DOM
    document.body.appendChild(this.container);
  }

  /**
   * Generate widget HTML
   */
  private getWidgetHTML(): string {
    return `
      <div class="widget-header flex items-center justify-between mb-3">
        <span class="text-sm font-medium text-gray-700">NativeMimic</span>
        <button class="close-btn text-gray-400 hover:text-gray-600">×</button>
      </div>
      
      <div class="selected-text mb-3 p-2 bg-gray-50 rounded text-sm">
        ${this.escapeHtml(this.state.selectedText)}
      </div>
      
      <div class="controls flex items-center gap-2 mb-3">
        <button class="play-btn ${ComponentStyles.button.base} ${ComponentStyles.button.primary}" 
                ${this.state.isPlaying ? 'disabled' : ''}>
          ${this.state.isPlaying ? '⏸️' : '▶️'} ${this.state.isPlaying ? 'Playing...' : 'Play'}
        </button>
        
        ${this.config.enableRecording ? `
          <button class="record-btn ${ComponentStyles.button.base} ${ComponentStyles.button.secondary}"
                  ${this.state.isRecording ? 'disabled' : ''}>
            🎤 ${this.state.isRecording ? 'Recording...' : 'Record'}
          </button>
        ` : ''}
      </div>
      
      <div class="voice-selector-container mb-2">
        <!-- Voice selector will be inserted here -->
      </div>
      
      <div class="widget-footer text-xs text-gray-500">
        Language: ${this.state.currentLanguage.toUpperCase()}
      </div>
    `;
  }

  /**
   * Attach event listeners to widget elements
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Play button
    const playBtn = this.container.querySelector('.play-btn');
    playBtn?.addEventListener('click', () => {
      if (this.state.isPlaying) {
        this.stopAudio();
      } else {
        this.playText();
      }
    });

    // Record button
    const recordBtn = this.container.querySelector('.record-btn');
    recordBtn?.addEventListener('click', () => {
      if (this.state.isRecording) {
        this.recordingButton.stopRecording();
      } else {
        this.recordingButton.startRecording();
      }
    });

    // Close button
    const closeBtn = this.container.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    // Insert voice selector
    const voiceSelectorContainer = this.container.querySelector('.voice-selector-container');
    if (voiceSelectorContainer) {
      voiceSelectorContainer.appendChild(this.voiceSelector.renderMainSelector());
    }
  }

  /**
   * Update UI based on current state
   */
  private updateUI(): void {
    if (!this.container) return;
    
    // Update play button
    const playBtn = this.container.querySelector('.play-btn');
    if (playBtn) {
      playBtn.textContent = this.state.isPlaying ? '⏸️ Playing...' : '▶️ Play';
      (playBtn as HTMLButtonElement).disabled = false;
    }

    // Update record button
    const recordBtn = this.container.querySelector('.record-btn');
    if (recordBtn) {
      recordBtn.textContent = this.state.isRecording ? '🎤 Recording...' : '🎤 Record';
      (recordBtn as HTMLButtonElement).disabled = false;
    }
  }

  /**
   * Remove widget from DOM
   */
  private removeFromDOM(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
  }

  /**
   * Show error message to user
   */
  private showError(message: string): void {
    // TODO: Implement user-friendly error display
    console.error('Widget error:', message);
  }

  /**
   * Track analytics events
   */
  private trackAnalytics(event: string, data?: any): void {
    if (!this.config.enableAnalytics) return;
    
    // TODO: Send to Supabase analytics
    console.log('Analytics:', event, data);
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}