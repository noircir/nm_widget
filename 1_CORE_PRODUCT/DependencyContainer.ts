/**
 * DependencyContainer.ts
 * Dependency injection container for NativeMimic v4.0
 * 
 * Manages component lifecycle and prevents tight coupling
 * Ensures proper initialization order and resource cleanup
 */

import { AudioManager, type AudioConfig } from './1.2_voice_engine/audio_processing/AudioManager';
import { GoogleTTSClient } from './1.2_voice_engine/tts_integration/GoogleTTSClient';
import { MainWidget, type WidgetConfig } from './1.1_user_interface/widget_overlay/MainWidget';

export class DependencyContainer {
  private audioManager: AudioManager | null = null;
  private ttsClient: GoogleTTSClient | null = null;
  private mainWidget: MainWidget | null = null;
  private isInitialized = false;

  /**
   * Initialize all dependencies in correct order
   */
  async initialize(config: {
    audio: Partial<AudioConfig>;
    widget: WidgetConfig;
    ttsEdgeFunctionUrl: string;
  }): Promise<void> {
    if (this.isInitialized) {
      throw new Error('DependencyContainer is already initialized');
    }

    try {
      // 1. Initialize AudioManager first (foundation dependency)
      this.audioManager = new AudioManager(config.audio);
      
      // 2. Initialize GoogleTTSClient with AudioManager dependency
      this.ttsClient = new GoogleTTSClient(config.ttsEdgeFunctionUrl, this.audioManager);
      
      // 3. Initialize MainWidget with both dependencies
      this.mainWidget = new MainWidget(config.widget, this.audioManager, this.ttsClient);
      
      this.isInitialized = true;
      
      console.log('NativeMimic v4.0 dependencies initialized successfully');
      
    } catch (error) {
      // Clean up partial initialization
      await this.cleanup();
      throw new Error(`Failed to initialize dependencies: ${(error as Error).message}`);
    }
  }

  /**
   * Get AudioManager instance
   */
  getAudioManager(): AudioManager {
    this.ensureInitialized();
    return this.audioManager!;
  }

  /**
   * Get GoogleTTSClient instance
   */
  getTTSClient(): GoogleTTSClient {
    this.ensureInitialized();
    return this.ttsClient!;
  }

  /**
   * Get MainWidget instance
   */
  getMainWidget(): MainWidget {
    this.ensureInitialized();
    return this.mainWidget!;
  }

  /**
   * Check if container is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    audioManager: boolean;
    ttsClient: boolean;
    mainWidget: boolean;
    memoryUsage: {
      audioCache: number;
      totalCacheSizeBytes: number;
    };
  } {
    this.ensureInitialized();

    const cacheStats = this.audioManager!.getCacheStats();
    
    return {
      audioManager: !!this.audioManager,
      ttsClient: !!this.ttsClient,
      mainWidget: !!this.mainWidget,
      memoryUsage: {
        audioCache: cacheStats.entryCount,
        totalCacheSizeBytes: cacheStats.totalSizeBytes
      }
    };
  }

  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    if (this.mainWidget) {
      try {
        this.mainWidget.hide();
      } catch (error) {
        console.warn('Error cleaning up MainWidget:', error);
      }
      this.mainWidget = null;
    }

    if (this.ttsClient) {
      try {
        this.ttsClient.clearCache();
      } catch (error) {
        console.warn('Error cleaning up TTSClient:', error);
      }
      this.ttsClient = null;
    }

    if (this.audioManager) {
      try {
        this.audioManager.destroy();
      } catch (error) {
        console.warn('Error cleaning up AudioManager:', error);
      }
      this.audioManager = null;
    }

    this.isInitialized = false;
  }

  /**
   * Ensure container is initialized before use
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('DependencyContainer must be initialized before use');
    }
  }
}

/**
 * Global instance for NativeMimic v4.0
 */
export const nativeMimicContainer = new DependencyContainer();