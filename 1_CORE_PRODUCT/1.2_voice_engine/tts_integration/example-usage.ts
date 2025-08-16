/**
 * GoogleTTSClient Usage Example
 * Demonstrates integration with AudioManager and comprehensive error handling
 */

import { AudioManager } from '../audio_processing/AudioManager';
import { GoogleTTSClient, type TTSRequest, type GoogleTTSConfig } from './GoogleTTSClient';

/**
 * Example: Basic TTS synthesis and playback
 */
async function basicTTSExample() {
  // Initialize AudioManager with production settings
  const audioManager = new AudioManager({
    preferredFormat: 'mp3',
    maxCacheSize: 100,
    maxCacheSizeBytes: 100 * 1024 * 1024, // 100MB
    enableCrossfade: true,
    volume: 0.8,
    enableWebAudioAPI: true
  });

  // Initialize GoogleTTSClient with production configuration
  const ttsConfig: GoogleTTSConfig = {
    edgeFunctionUrl: 'https://your-supabase-project.supabase.co/functions/v1',
    retryAttempts: 3,
    retryDelayMs: 1000,
    timeoutMs: 15000,
    enableRateLimiting: true,
    rateLimitRpm: 60,
    enableCostTracking: true,
    maxTextLength: 5000,
    enableAnalytics: true,
    defaultVoice: 'en-US-Wavenet-D',
    defaultLanguage: 'en-US',
    audioFormat: 'mp3'
  };

  const ttsClient = new GoogleTTSClient(audioManager, ttsConfig);

  try {
    // Create TTS request
    const request: TTSRequest = {
      text: 'Hello, this is a test of the NativeMimic pronunciation coaching system.',
      languageCode: 'en-US',
      voiceId: 'en-US-Wavenet-D',
      audioFormat: 'mp3',
      speakingRate: 1.0,
      pitch: 0.0,
      volumeGainDb: 0.0,
      isSSML: false,
      enableCache: true,
      priority: 'normal'
    };

    // Synthesize and play audio
    const response = await ttsClient.synthesizeAndPlay(request, () => {
      console.log('Audio playback completed');
    });

    console.log('TTS Response:', {
      cost: response.cost,
      cached: response.cached,
      voiceName: response.voiceName,
      duration: response.metadata.duration,
      processingTime: response.processingTimeMs
    });

    // Get usage metrics
    const metrics = ttsClient.getUsageMetrics();
    console.log('Usage Metrics:', metrics);

  } catch (error) {
    console.error('TTS Error:', error);
  } finally {
    // Clean up resources
    ttsClient.destroy();
    audioManager.destroy();
  }
}

/**
 * Example: SSML synthesis with error handling
 */
async function ssmlTTSExample() {
  const audioManager = new AudioManager();
  const ttsClient = new GoogleTTSClient(audioManager, {
    edgeFunctionUrl: 'https://your-supabase-project.supabase.co/functions/v1'
  });

  try {
    const ssmlText = `
      <speak>
        <p>Welcome to <emphasis level="strong">NativeMimic</emphasis>!</p>
        <break time="500ms"/>
        <p>Let's practice pronunciation with different speaking rates:</p>
        <p><prosody rate="slow">This is slow speech.</prosody></p>
        <p><prosody rate="fast">This is fast speech.</prosody></p>
      </speak>
    `;

    const request: TTSRequest = {
      text: ssmlText,
      languageCode: 'en-US',
      voiceId: 'en-US-Wavenet-F',
      audioFormat: 'mp3',
      speakingRate: 1.0,
      pitch: 0.0,
      volumeGainDb: 0.0,
      isSSML: true,
      enableCache: true,
      priority: 'high'
    };

    const response = await ttsClient.synthesize(request);
    await audioManager.playAudio(response.audioBlob);

    console.log('SSML synthesis successful:', response.analytics);

  } catch (error) {
    console.error('SSML TTS failed:', error);
  } finally {
    ttsClient.destroy();
    audioManager.destroy();
  }
}

/**
 * Example: Batch synthesis with pre-caching
 */
async function batchTTSExample() {
  const audioManager = new AudioManager({
    maxCacheSize: 200,
    maxCacheSizeBytes: 200 * 1024 * 1024 // 200MB for large cache
  });
  
  const ttsClient = new GoogleTTSClient(audioManager, {
    edgeFunctionUrl: 'https://your-supabase-project.supabase.co/functions/v1',
    rateLimitRpm: 120 // Higher rate limit for batch processing
  });

  try {
    // Prepare multiple requests for common pronunciation examples
    const commonPhrases = [
      'Hello, how are you today?',
      'Thank you very much for your help.',
      'Could you please repeat that?',
      'I would like to practice my pronunciation.',
      'The weather is beautiful today.'
    ];

    const requests: TTSRequest[] = commonPhrases.map(text => ({
      text,
      languageCode: 'en-US',
      voiceId: 'en-US-Wavenet-D',
      audioFormat: 'mp3',
      speakingRate: 1.0,
      pitch: 0.0,
      volumeGainDb: 0.0,
      isSSML: false,
      enableCache: true,
      priority: 'normal'
    }));

    // Pre-cache all phrases
    console.log('Pre-caching common phrases...');
    await ttsClient.preCache(requests);

    // Now synthesis will be instant due to caching
    console.log('Playing cached audio...');
    for (const request of requests) {
      const response = await ttsClient.synthesize(request);
      console.log(`Playing: "${request.text}" (cached: ${response.cached})`);
      await audioManager.playAudio(response.audioBlob);
      
      // Wait 2 seconds between phrases
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Display cache statistics
    const cacheStats = ttsClient.getCacheStats();
    console.log('Cache Statistics:', cacheStats);

  } catch (error) {
    console.error('Batch TTS failed:', error);
  } finally {
    ttsClient.destroy();
    audioManager.destroy();
  }
}

/**
 * Example: Voice selection and cost estimation
 */
async function voiceSelectionExample() {
  const audioManager = new AudioManager();
  const ttsClient = new GoogleTTSClient(audioManager, {
    edgeFunctionUrl: 'https://your-supabase-project.supabase.co/functions/v1'
  });

  try {
    // Get available voices for English
    const voices = await ttsClient.getVoicesForLanguage('en-US');
    console.log('Available English voices:', voices.length);

    // Filter for high-quality Neural2 voices
    const neural2Voices = voices.filter(voice => voice.voiceType === 'NEURAL2');
    console.log('Neural2 voices available:', neural2Voices.length);

    // Estimate costs for different voice types
    const testText = 'This is a test phrase for cost estimation.';
    const standardCost = ttsClient.estimateCost(testText, 'STANDARD');
    const wavenetCost = ttsClient.estimateCost(testText, 'WAVENET');
    const neural2Cost = ttsClient.estimateCost(testText, 'NEURAL2');

    console.log('Cost Estimates:', {
      standard: `$${standardCost.toFixed(6)}`,
      wavenet: `$${wavenetCost.toFixed(6)}`,
      neural2: `$${neural2Cost.toFixed(6)}`
    });

    // Check rate limiting status
    console.log('Can make request:', ttsClient.canMakeRequest());
    console.log('Time until next request:', ttsClient.getTimeUntilNextRequest(), 'ms');

  } catch (error) {
    console.error('Voice selection failed:', error);
  } finally {
    ttsClient.destroy();
    audioManager.destroy();
  }
}

// Export examples for testing
export {
  basicTTSExample,
  ssmlTTSExample,
  batchTTSExample,
  voiceSelectionExample
};