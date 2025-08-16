/**
 * VoiceSelector.ts
 * Voice selection component for NativeMimic v4.0
 * 
 * Manages curated voice display (3-5 voices) + advanced modal (70+ voices)
 * Includes crowdsourced voice quality ratings
 */

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  provider: 'google-tts' | 'system';
  quality: 'standard' | 'premium' | 'neural';
  isRecommended: boolean;
  qualityScore: number;       // Crowdsourced rating 0-100
  sampleCount: number;        // Number of user ratings
}

export interface VoiceSelectorConfig {
  maxDisplayedVoices: number;
  showMoreButton: boolean;
  enableQualityRating: boolean;
  defaultLanguage: string;
  autoSelectBest: boolean;
}

export class VoiceSelector {
  private config: VoiceSelectorConfig;
  private availableVoices: Voice[] = [];
  private selectedVoice: Voice | null = null;
  private onVoiceChange: (voice: Voice) => void;

  constructor(config: VoiceSelectorConfig, onVoiceChange: (voice: Voice) => void) {
    this.config = config;
    this.onVoiceChange = onVoiceChange;
  }

  /**
   * Load voices for detected language with quality curation
   */
  async loadVoicesForLanguage(languageCode: string): Promise<Voice[]> {
    try {
      // Fetch voices from Supabase Edge Function (hides Google TTS API key)
      const response = await fetch('/api/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: languageCode })
      });

      const voices: Voice[] = await response.json();
      
      // Apply quality filtering and sorting
      this.availableVoices = this.curateVoices(voices, languageCode);
      
      // Auto-select best voice if enabled
      if (this.config.autoSelectBest && this.availableVoices.length > 0) {
        const bestVoice = this.availableVoices[0];
        if (bestVoice) {
          this.selectVoice(bestVoice);
        }
      }

      return this.availableVoices;
    } catch (error) {
      console.error('Failed to load voices:', error);
      return [];
    }
  }

  /**
   * Curate voices based on quality scores and recommendations
   */
  private curateVoices(voices: Voice[], languageCode: string): Voice[] {
    return voices
      .filter(voice => voice.language === languageCode)
      .sort((a, b) => {
        // Sort by: recommended first, then quality score, then neural quality
        if (a.isRecommended !== b.isRecommended) {
          return a.isRecommended ? -1 : 1;
        }
        if (a.qualityScore !== b.qualityScore) {
          return b.qualityScore - a.qualityScore;
        }
        if (a.quality !== b.quality) {
          const qualityOrder = { 'neural': 3, 'premium': 2, 'standard': 1 };
          return qualityOrder[b.quality] - qualityOrder[a.quality];
        }
        return 0;
      });
  }

  /**
   * Get top voices for main dropdown (3-5 curated)
   */
  getMainDisplayVoices(): Voice[] {
    return this.availableVoices.slice(0, this.config.maxDisplayedVoices);
  }

  /**
   * Get all voices for advanced modal
   */
  getAllVoices(): Voice[] {
    return this.availableVoices;
  }

  /**
   * Select a voice and notify parent component
   */
  selectVoice(voice: Voice): void {
    this.selectedVoice = voice;
    this.onVoiceChange(voice);
  }

  /**
   * Submit voice quality rating (👍/👎)
   */
  async submitVoiceRating(voiceId: string, rating: 'positive' | 'negative'): Promise<void> {
    try {
      await fetch('/api/voice-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId,
          rating: rating === 'positive' ? 1 : 0,
          timestamp: new Date().toISOString()
        })
      });

      // Update local voice quality score
      const voice = this.availableVoices.find(v => v.id === voiceId);
      if (voice) {
        this.updateVoiceQualityScore(voice, rating);
      }
    } catch (error) {
      console.error('Failed to submit voice rating:', error);
    }
  }

  /**
   * Update voice quality score based on new rating
   */
  private updateVoiceQualityScore(voice: Voice, rating: 'positive' | 'negative'): void {
    const newRating = rating === 'positive' ? 100 : 0;
    const totalScore = voice.qualityScore * voice.sampleCount + newRating;
    voice.sampleCount += 1;
    voice.qualityScore = totalScore / voice.sampleCount;
  }

  /**
   * Get current selected voice
   */
  getSelectedVoice(): Voice | null {
    return this.selectedVoice;
  }

  /**
   * Render main voice selector dropdown
   */
  renderMainSelector(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'voice-selector-main flex items-center gap-2';

    // Voice dropdown
    const dropdown = document.createElement('select');
    dropdown.className = 'voice-dropdown px-3 py-2 border rounded-md';
    
    this.getMainDisplayVoices().forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.id;
      option.textContent = `${voice.name} (${voice.gender})`;
      dropdown.appendChild(option);
    });

    // More voices button
    if (this.config.showMoreButton && this.availableVoices.length > this.config.maxDisplayedVoices) {
      const moreButton = document.createElement('button');
      moreButton.textContent = 'More...';
      moreButton.className = 'more-voices-btn px-3 py-2 bg-primary text-white rounded-md hover:bg-primaryDark';
      moreButton.onclick = () => this.showAdvancedModal();
      container.appendChild(moreButton);
    }

    container.appendChild(dropdown);
    return container;
  }

  /**
   * Show advanced voice selection modal
   */
  showAdvancedModal(): void {
    // TODO: Implement modal with full voice list
    // - Show all 70+ voices organized by quality
    // - Include search/filter functionality
    // - Display quality ratings and sample counts
    // - Allow voice preview and rating submission
    console.log('Advanced voice modal - TODO: Implement');
  }
}