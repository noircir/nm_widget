# NativeMimic Extension Architecture

## Overview

NativeMimic is a Chrome extension that provides instant text-to-speech functionality. Users select text on any webpage, and a draggable widget appears with voice controls, speed adjustment, and pronunciation features.

## Core Components

### 1. Content Script (`content.js`)
- **Primary Role**: Main widget logic and user interaction
- **Lifecycle**: Injected into every page (`<all_urls>`)
- **Key Responsibilities**:
  - Text selection detection and widget display
  - Speech synthesis (Web Speech API + Google TTS)
  - Widget UI management and drag functionality
  - Language detection and voice selection
  - Keyboard shortcuts handling

### 2. Background Script (`background.js`)
- **Primary Role**: Cross-tab coordination and settings management
- **Lifecycle**: Service worker (persistent)
- **Key Responsibilities**:
  - Extension enable/disable state management
  - Cross-tab messaging and state broadcasting
  - Settings storage and migration
  - Extension icon management

### 3. Popup Interface (`popup.js` + `popup.html`)
- **Primary Role**: User settings and extension control
- **Lifecycle**: Opens when user clicks extension icon
- **Key Responsibilities**:
  - Enable/disable toggle interface
  - Status display (enabled/disabled)
  - Keyboard shortcuts reference

## Core Widget Flow

### Text Selection → Widget Display
1. **Text Selection Event**: `document.addEventListener('mouseup')`
2. **Selection Validation**: Check if text is selected and meaningful
3. **Enable State Check**: Verify extension is enabled
4. **Language Detection**: Analyze selected text for language
5. **Widget Creation**: Create draggable widget near selection
6. **Voice Loading**: Populate dropdown with appropriate voices
7. **Auto-play**: Begin speech synthesis immediately

### Widget Lifecycle
```
Text Selected → Language Detected → Widget Created → Voices Loaded → Auto-play Starts
     ↓                                    ↓
Widget Hidden ←← Speech Complete ←← User Interaction (play/pause/stop)
```

## Speech System Architecture

### Multi-TTS Strategy
1. **Primary**: Google Cloud TTS (70+ languages, high quality)
2. **Fallback**: Web Speech API (browser native voices)
3. **Removed**: ElevenLabs integration (v3.15+ cleanup)

### Voice Selection Logic
```
Selected Text → Language Detection → Voice Preference Check → Auto-select Best Voice
                     ↓
                Google TTS Voice (preferred) → System Voice (fallback)
```

### Caching System
- **Audio Cache**: 50-item limit with 24-hour expiry
- **Blob URL Management**: Automatic cleanup to prevent memory leaks
- **Cost Optimization**: Reuse cached audio to minimize Google TTS API calls

## State Management Architecture

### Storage Schema
```javascript
chrome.storage.sync: {
  isEnabled: boolean,           // Master enable/disable switch
  speechRate: number,           // Playback speed (0.5-2.0)
  selectedVoiceURI: string,     // Preferred voice identifier
  pronunciationCorrections: {}, // User-reported corrections
  usageStats: {                 // Analytics data
    totalSpeechCount: number,
    totalCharactersSpoken: number,
    installDate: timestamp
  }
}
```

## Critical System Quirks

### 1. Cross-Tab State Synchronization
**Challenge**: When user disables extension, all open tabs must immediately stop showing widgets.

**Complexity**: Content scripts are isolated - changes in one tab don't automatically affect others.

**Current Issue**: Existing widgets remain visible when extension is disabled from another tab.

### 2. Voice Loading Timing
**Challenge**: Browser voices load asynchronously and may not be ready immediately.

**Solution**: Multiple fallback strategies and voice loading retry logic.

### 3. Language Detection Edge Cases
**Quirks**:
- Mixed-language text defaults to first detected language
- Very short text (< 3 words) may misdetect language
- Special characters and numbers affect detection accuracy

### 4. Widget Positioning
**Challenge**: Maintain widget position near selected text across different page layouts.

**Quirks**:
- Handles scrolled pages with viewport calculations
- Avoids page edges and overlapping elements
- Remembers last position for consecutive selections

### 5. Memory Management
**Critical**: Audio blobs must be explicitly cleaned up to prevent memory leaks.

**Implementation**: 
```javascript
// Proper cleanup pattern
URL.revokeObjectURL(audioURL);
audio.src = '';
audio.remove();
```

## Current State (Option A Implementation)

### Architecture Overview
**Strategy**: Storage-first approach where each content script checks `chrome.storage.sync` on every text selection.

### Key Implementation Details

#### Content Script State Management
```javascript
// Every text selection triggers storage check
async handleTextSelection(allowDuplicate = false) {
  let isCurrentlyEnabled = false;
  try {
    const result = await chrome.storage.sync.get(['isEnabled']);
    isCurrentlyEnabled = result.isEnabled === true;
  } catch (error) {
    return; // Assume disabled on error
  }
  
  if (!isCurrentlyEnabled) {
    return; // Don't show widget
  }
  // ... continue with widget display
}
```

#### Background Script Role
- Manages storage state changes
- NO cross-tab broadcasting
- Updates extension icon state

#### Message Flow
```
User Action (popup/icon click) → Storage Update → Individual Tab Checks (on next text selection)
```

### Current Behavior
- ✅ **New Widgets**: Prevented when extension disabled
- ❌ **Existing Widgets**: Remain visible when disabled
- ❌ **User Experience**: Confusing - popup shows "disabled" but widgets stay
- ❌ **Performance**: Storage read on every text selection (overhead)

### Technical Debt
1. **Inconsistent State**: Cached `this.isEnabled` vs storage `isEnabled`
2. **No Immediate Feedback**: Changes only apply to new selections
3. **Storage Overhead**: Every text selection requires async storage read
4. **Abandoned Broadcasting**: Background script has unused broadcasting code

## Planned Migration (Option B Implementation)

### Target Architecture
**Strategy**: Background script as authoritative state manager with immediate broadcasting.

### Key Changes

#### Background Script as Source of Truth
```javascript
async toggleNativeMimic(tab) {
  const newState = !this.currentState;
  await chrome.storage.sync.set({ isEnabled: newState });
  
  // IMMEDIATE: Broadcast to all tabs
  await this.broadcastToAllTabs({
    action: 'updateEnabledState',
    isEnabled: newState
  });
}
```

#### Content Script Message Handling
```javascript
// Revert to cached state for performance
handleTextSelection() {
  if (!this.isEnabled) return; // Fast cached check
  // ... continue with widget display
}

// Listen for state changes
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateEnabledState') {
    this.isEnabled = message.isEnabled;
    if (!this.isEnabled && this.speechWidget) {
      this.hideSpeechControls(); // Hide immediately
    }
  }
});
```

#### Expected Message Flow
```
User Action → Background Script → Broadcast to All Tabs → Immediate Widget Update
```

### Expected Benefits
- ✅ **Immediate Response**: All widgets hide instantly when disabled
- ✅ **Performance**: No storage overhead on text selection
- ✅ **Consistent UX**: State changes apply immediately across all tabs
- ✅ **Clean Architecture**: Proper separation of concerns

## Development Guidelines

### Testing Protocol

#### **Automated Smoke Tests** (MANDATORY after every change)
1. **Load `smoke-tests.js`** in browser console on test page
2. **Run**: `const tests = new NativeMimicSmokeTests(); tests.runAllTests()`
3. **Success Rate**: Must be >90% to commit changes
4. **Critical Tests**:
   - Widget appearance on text selection
   - Google TTS voice loading (>10 voices)
   - System voice fallback (>1 voice)  
   - Play/stop/speed controls functionality
   - Cross-tab enable/disable synchronization
   - Settings persistence
   - Browser compatibility (Chrome/Brave)

#### **Manual Testing Checklist**
1. **Cross-tab Testing**: Always test with 3+ tabs open
2. **State Persistence**: Verify settings survive browser restart  
3. **Memory Testing**: Monitor for audio blob leaks during development
4. **Language Coverage**: Test with multiple languages and edge cases
5. **Network Conditions**: Test with/without localhost server running

### Critical Safety Rules
1. **Never break existing widgets**: Test current functionality before changes
2. **Preserve user data**: Settings and corrections must survive updates
3. **Graceful degradation**: Extension should work even if some features fail
4. **Performance monitoring**: Watch for storage/messaging overhead

### Code Organization Principles
- **Single Responsibility**: Each script has one primary concern
- **Message-Driven**: Cross-component communication via Chrome messages
- **Storage-Backed**: All settings persist in chrome.storage.sync
- **Error Recovery**: Graceful fallbacks for all external dependencies