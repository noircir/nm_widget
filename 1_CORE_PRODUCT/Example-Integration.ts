/**
 * Example-Integration.ts
 * Example showing how to integrate AudioManager with other NativeMimic components
 * 
 * Demonstrates:
 * - Proper dependency injection setup
 * - Component initialization order
 * - Error handling and resource cleanup
 * - Cross-component communication
 */

import { nativeMimicContainer } from './DependencyContainer';

/**
 * Example: Initialize NativeMimic v4.0 with AudioManager foundation
 */
async function initializeNativeMimic() {
  try {
    // Configuration for each component
    const config = {
      // AudioManager configuration - foundation for all audio operations
      audio: {
        preferredFormat: 'mp3' as const,
        maxCacheSize: 50,
        maxCacheSizeBytes: 50 * 1024 * 1024, // 50MB
        enableWebAudioAPI: true,
        enableCrossfade: true,
        volume: 0.8,
        playbackRate: 1.0,
        autoplay: true
      },
      
      // Widget configuration
      widget: {
        maxTextLength: 1000,
        autoLanguageDetection: true,
        showSpeedControl: true,
        enableRecording: true,
        enableAnalytics: true
      },
      
      // TTS service configuration
      ttsEdgeFunctionUrl: 'https://your-supabase-project.supabase.co/functions/v1'
    };

    // Initialize all components with proper dependency injection
    await nativeMimicContainer.initialize(config);
    
    console.log('✅ NativeMimic v4.0 initialized successfully');
    
    // Get component instances
    const audioManager = nativeMimicContainer.getAudioManager();
    const ttsClient = nativeMimicContainer.getTTSClient();
    const mainWidget = nativeMimicContainer.getMainWidget();
    
    // Example: Set up text selection listener
    setupTextSelectionHandler(mainWidget);
    
    // Example: Monitor system health
    monitorSystemHealth();
    
    return { audioManager, ttsClient, mainWidget };
    
  } catch (error) {
    console.error('❌ Failed to initialize NativeMimic:', error);
    await nativeMimicContainer.cleanup();
    throw error;
  }
}

/**
 * Example: Set up text selection handler
 */
function setupTextSelectionHandler(mainWidget: any) {
  document.addEventListener('mouseup', (event) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const selectedText = selection.toString().trim();
    if (selectedText.length < 3) return; // Ignore short selections
    
    // Get selection position for widget placement
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const position = {
      x: rect.left + (rect.width / 2),
      y: rect.bottom + 10
    };
    
    // Show widget at selection position
    mainWidget.show(selectedText, position);
  });
}

/**
 * Example: Monitor system health and performance
 */
function monitorSystemHealth() {
  setInterval(() => {
    if (!nativeMimicContainer.isReady()) return;
    
    const health = nativeMimicContainer.getHealthStatus();
    
    // Log cache usage for monitoring
    console.log('📊 NativeMimic Health:', {
      components: {
        audioManager: health.audioManager,
        ttsClient: health.ttsClient,
        mainWidget: health.mainWidget
      },
      memory: {
        cachedAudioFiles: health.memoryUsage.audioCache,
        cacheSizeMB: Math.round(health.memoryUsage.totalCacheSizeBytes / 1024 / 1024 * 100) / 100
      }
    });
    
    // Warn if cache is getting large
    if (health.memoryUsage.totalCacheSizeBytes > 40 * 1024 * 1024) { // 40MB threshold
      console.warn('⚠️ Audio cache is getting large, consider clearing cache');
    }
    
  }, 60000); // Check every minute
}

/**
 * Example: Advanced usage - Custom audio processing
 */
async function advancedAudioExample() {
  if (!nativeMimicContainer.isReady()) {
    throw new Error('NativeMimic not initialized');
  }
  
  const audioManager = nativeMimicContainer.getAudioManager();
  const ttsClient = nativeMimicContainer.getTTSClient();
  
  try {
    // Example: Synthesize speech with custom parameters
    const response = await ttsClient.synthesize({
      text: "Hello! This is an example of high-quality speech synthesis.",
      languageCode: 'en-US',
      voiceId: 'en-US-Wavenet-D',
      audioFormat: 'mp3',
      speakingRate: 1.2,
      pitch: 2.0,
      volumeGainDb: 0.0
    });
    
    console.log('🎵 Audio synthesized:', {
      cached: response.cached,
      cost: response.cost,
      duration: response.metadata.duration,
      size: response.metadata.size
    });
    
    // Example: Custom audio playback with controls
    await audioManager.playAudio(response.audioBlob, () => {
      console.log('🏁 Audio playback completed');
    });
    
    // Example: Real-time audio state monitoring
    const audioState = audioManager.getPlaybackState();
    console.log('🎵 Audio State:', {
      isPlaying: audioState.isPlaying,
      currentTime: audioState.currentTime,
      duration: audioState.duration,
      volume: audioState.volume
    });
    
  } catch (error) {
    console.error('❌ Advanced audio example failed:', error);
    throw error;
  }
}

/**
 * Example: Error handling and recovery
 */
async function handleAudioErrors() {
  if (!nativeMimicContainer.isReady()) return;
  
  const audioManager = nativeMimicContainer.getAudioManager();
  
  try {
    // Example: Invalid audio blob
    const invalidBlob = new Blob([], { type: 'audio/mp3' });
    await audioManager.playAudio(invalidBlob);
    
  } catch (error) {
    console.log('✅ Error handling working correctly:', error.message);
    
    // Recovery: Stop any current audio and reset state
    await audioManager.stopAudio();
    
    // Check if AudioManager is still functional
    const state = audioManager.getPlaybackState();
    console.log('🔄 AudioManager recovery state:', state);
  }
}

/**
 * Example: Cleanup and resource management
 */
async function cleanupExample() {
  console.log('🧹 Cleaning up NativeMimic resources...');
  
  // Get final stats before cleanup
  if (nativeMimicContainer.isReady()) {
    const health = nativeMimicContainer.getHealthStatus();
    console.log('📊 Final stats before cleanup:', health);
  }
  
  // Cleanup all resources
  await nativeMimicContainer.cleanup();
  
  console.log('✅ Cleanup completed');
}

// Export functions for use in browser extension
export {
  initializeNativeMimic,
  setupTextSelectionHandler,
  monitorSystemHealth,
  advancedAudioExample,
  handleAudioErrors,
  cleanupExample
};

// Example: Auto-initialize when script loads (comment out for manual control)
/*
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initializeNativeMimic();
    console.log('🚀 NativeMimic v4.0 ready for use');
  } catch (error) {
    console.error('💥 Failed to auto-initialize NativeMimic:', error);
  }
});

// Example: Cleanup on page unload
window.addEventListener('beforeunload', async () => {
  await cleanupExample();
});
*/