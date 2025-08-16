# AudioManager v4.0 - Production-Ready Audio Foundation

## Overview

The AudioManager is the foundational audio component for NativeMimic v4.0, designed to prevent the memory leaks and instability issues experienced in v3.16. It provides robust cross-browser audio processing with TypeScript safety and proper resource management.

## Key Features

### 🔒 **Memory Management**
- Intelligent cache cleanup with LRU (Least Recently Used) algorithm
- Automatic memory monitoring and size limits
- Proper resource cleanup on component destruction
- ObjectURL lifecycle management to prevent memory leaks

### 🎵 **Audio Processing**
- Cross-browser audio format support with graceful degradation
- Web Audio API integration for advanced features
- Automatic format conversion and compatibility checking
- Comprehensive audio metadata extraction

### 🛡️ **Error Handling**
- Robust retry logic for playback failures
- Comprehensive error reporting with detailed context
- Graceful degradation when advanced features are unavailable
- Safe operation after component destruction

### ⚡ **Performance Optimizations**
- Smart caching with access pattern tracking
- Background cleanup scheduling
- Efficient audio blob handling
- Optimized for browser extension environment

## Architecture

### Component Isolation
```typescript
// AudioManager operates independently with clear interfaces
const audioManager = new AudioManager(config);
```

### Dependency Injection Ready
```typescript
// GoogleTTSClient depends on AudioManager
const ttsClient = new GoogleTTSClient(edgeFunctionUrl, audioManager);

// MainWidget depends on both
const widget = new MainWidget(config, audioManager, ttsClient);
```

### Interface-Driven Design
```typescript
interface AudioConfig {
  readonly preferredFormat: 'mp3' | 'wav' | 'webm' | 'ogg';
  readonly maxCacheSize: number;
  readonly enableWebAudioAPI: boolean;
  // ... comprehensive configuration options
}
```

## Usage Examples

### Basic Audio Playback
```typescript
const audioManager = new AudioManager({
  preferredFormat: 'mp3',
  maxCacheSize: 50,
  volume: 0.8
});

// Play audio with callback
await audioManager.playAudio(audioBlob, () => {
  console.log('Audio playback completed');
});
```

### Advanced Audio Control
```typescript
// Set volume with validation
audioManager.setVolume(0.5);

// Control playback speed
audioManager.setPlaybackRate(1.5);

// Seek to specific time
audioManager.seekTo(30); // 30 seconds

// Get comprehensive playback state
const state = audioManager.getPlaybackState();
console.log({
  isPlaying: state.isPlaying,
  currentTime: state.currentTime,
  duration: state.duration,
  bufferedRanges: state.bufferedRanges
});
```

### Intelligent Caching
```typescript
// Cache audio with automatic memory management
await audioManager.cacheAudio('speech-key', audioBlob);

// Retrieve cached audio
const cachedBlob = audioManager.getCachedAudio('speech-key');

// Monitor cache performance
const stats = audioManager.getCacheStats();
console.log({
  entryCount: stats.entryCount,
  totalSizeMB: stats.totalSizeBytes / 1024 / 1024,
  hitRate: stats.hitRate
});
```

### Error Handling
```typescript
try {
  await audioManager.playAudio(audioBlob);
} catch (error) {
  // AudioManager provides detailed error context
  console.error('Playback failed:', error.message);
  
  // Check if AudioManager is still functional
  const state = audioManager.getPlaybackState();
  if (state.error) {
    console.log('Audio error details:', state.error);
  }
}
```

## Integration with Other Components

### GoogleTTSClient Integration
```typescript
export class GoogleTTSClient {
  constructor(edgeFunctionUrl: string, audioManager: AudioManager) {
    this.audioManager = audioManager;
  }

  async synthesizeAndPlay(request: TTSRequest): Promise<void> {
    const response = await this.synthesize(request);
    await this.audioManager.playAudio(response.audioBlob);
  }
}
```

### MainWidget Integration
```typescript
export class MainWidget {
  constructor(
    config: WidgetConfig,
    audioManager: AudioManager,
    ttsClient: GoogleTTSClient
  ) {
    this.audioManager = audioManager;
    this.ttsClient = ttsClient;
  }

  async playText(): Promise<void> {
    await this.ttsClient.synthesizeAndPlay(ttsRequest);
  }

  async stopAudio(): Promise<void> {
    await this.audioManager.stopAudio();
  }
}
```

## Configuration Options

### Audio Quality
```typescript
{
  preferredFormat: 'mp3',        // Primary audio format
  fallbackFormats: ['wav', 'webm'], // Fallback options
  enableWebAudioAPI: true,       // Advanced audio features
  enableCrossfade: true          // Smooth transitions
}
```

### Memory Management
```typescript
{
  maxCacheSize: 50,              // Max cached files
  maxCacheSizeBytes: 52428800,   // 50MB limit
  preloadStrategy: 'metadata'    // Loading strategy
}
```

### Playback Control
```typescript
{
  volume: 0.8,                   // Default volume (0-1)
  playbackRate: 1.0,             // Default speed (0.25-4.0)
  autoplay: true,                // Auto-start playback
  crossOrigin: 'anonymous'       // CORS handling
}
```

## Testing

The AudioManager includes comprehensive unit tests covering:

- **Initialization and Configuration**: Parameter validation and setup
- **Audio Format Support**: Cross-browser compatibility detection
- **Playback Operations**: Play, pause, stop, seek functionality
- **Memory Management**: Cache operations and cleanup
- **Error Handling**: Failure scenarios and recovery
- **Resource Management**: Proper cleanup and destruction

```bash
# Run AudioManager tests
npm test AudioManager.test.ts
```

## Safety Features

### Memory Leak Prevention
- Automatic ObjectURL cleanup
- Event listener management
- Cache size monitoring
- Resource cleanup on destruction

### Browser Compatibility
- Feature detection for Web Audio API
- Graceful degradation for unsupported formats
- Cross-origin handling
- Mobile browser optimizations

### Error Recovery
- Retry logic for temporary failures
- State validation before operations
- Safe operation after destruction
- Comprehensive error reporting

## Performance Monitoring

### Cache Statistics
```typescript
const stats = audioManager.getCacheStats();
// Monitor: entryCount, totalSizeBytes, hitRate
```

### Playback State
```typescript
const state = audioManager.getPlaybackState();
// Monitor: isPlaying, isLoading, networkState, readyState
```

### Health Checks
```typescript
// Check if AudioManager is still functional
if (audioManager.isPlaying()) {
  console.log('Audio playback active');
}
```

## Future Extensibility

The AudioManager is designed to support future NativeMimic features:

- **AI Voice Analysis**: Audio processing for pronunciation coaching
- **Real-time Effects**: Dynamic audio manipulation
- **Multi-track Audio**: Advanced mixing capabilities
- **Streaming Audio**: Progressive loading for large files
- **Voice Synthesis**: Direct integration with neural TTS models

## Migration from v3.16

The AudioManager replaces the problematic audio handling in v3.16:

### v3.16 Issues (Resolved)
- ❌ Memory leaks from unmanaged ObjectURLs
- ❌ Inconsistent audio state management
- ❌ No proper error recovery
- ❌ Browser compatibility issues

### v4.0 Solutions
- ✅ Automatic resource cleanup
- ✅ Comprehensive state management
- ✅ Robust error handling and retry logic
- ✅ Cross-browser compatibility with graceful degradation
- ✅ TypeScript safety and testing coverage

The AudioManager serves as the stable foundation that prevents v3.16-style failures while enabling advanced audio features for the NativeMimic pronunciation coaching platform.