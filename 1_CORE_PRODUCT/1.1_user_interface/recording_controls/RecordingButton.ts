/**
 * RecordingButton.ts
 * Voice recording control component for NativeMimic v4.0
 * 
 * Handles microphone access, recording state, and user privacy controls
 */

export interface RecordingState {
  status: 'idle' | 'requesting' | 'recording' | 'processing' | 'complete' | 'error';
  duration: number;
  audioBlob?: Blob;
  error?: string;
}

export interface RecordingConfig {
  maxDuration: number;        // Maximum recording length in seconds
  audioFormat: 'webm' | 'mp4';
  sampleRate: number;
  requireConsent: boolean;    // GDPR compliance
}

export class RecordingButton {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private state: RecordingState = { status: 'idle', duration: 0 };
  private config: RecordingConfig;
  private onStateChange: (state: RecordingState) => void;

  constructor(config: RecordingConfig, onStateChange: (state: RecordingState) => void) {
    this.config = config;
    this.onStateChange = onStateChange;
  }

  /**
   * Request microphone permission and start recording
   */
  async startRecording(): Promise<void> {
    try {
      this.updateState({ status: 'requesting', duration: 0 });

      // Check if user has consented to recording (GDPR)
      if (this.config.requireConsent && !await this.checkConsent()) {
        throw new Error('User consent required for recording');
      }

      // Request microphone access
      const stream = await navigator.mediaRecorder.getUserMedia({ 
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // Initialize MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: `audio/${this.config.audioFormat}`
      });

      this.setupRecorderEvents();
      
      this.mediaRecorder.start();
      this.updateState({ status: 'recording', duration: 0 });
      this.startDurationTimer();

    } catch (error) {
      this.updateState({ 
        status: 'error', 
        duration: 0,
        error: error instanceof Error ? error.message : 'Recording failed'
      });
    }
  }

  /**
   * Stop recording and process audio
   */
  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.updateState({ status: 'processing', duration: this.state.duration });
      this.mediaRecorder.stop();
      
      // Stop all tracks to release microphone
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }

  /**
   * Get recorded audio blob
   */
  getRecording(): Blob | null {
    return this.state.audioBlob || null;
  }

  /**
   * Reset recording state
   */
  reset(): void {
    this.audioChunks = [];
    this.updateState({ status: 'idle', duration: 0 });
  }

  private setupRecorderEvents(): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.audioChunks, { 
        type: `audio/${this.config.audioFormat}` 
      });
      
      this.updateState({
        status: 'complete',
        duration: this.state.duration,
        audioBlob
      });
    };

    this.mediaRecorder.onerror = (event) => {
      this.updateState({
        status: 'error',
        duration: this.state.duration,
        error: 'Recording error occurred'
      });
    };
  }

  private startDurationTimer(): void {
    const timer = setInterval(() => {
      if (this.state.status !== 'recording') {
        clearInterval(timer);
        return;
      }

      const newDuration = this.state.duration + 0.1;
      
      // Auto-stop at max duration
      if (newDuration >= this.config.maxDuration) {
        this.stopRecording();
        clearInterval(timer);
        return;
      }

      this.updateState({
        ...this.state,
        duration: newDuration
      });
    }, 100);
  }

  private async checkConsent(): Promise<boolean> {
    // TODO: Implement consent check with Supabase
    // Check if user has previously consented to recording
    // Show consent modal if needed
    return true; // Placeholder
  }

  private updateState(newState: Partial<RecordingState>): void {
    this.state = { ...this.state, ...newState };
    this.onStateChange(this.state);
  }
}