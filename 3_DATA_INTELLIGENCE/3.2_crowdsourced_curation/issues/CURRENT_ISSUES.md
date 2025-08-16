# NativeMimic - Current Issues

## 🔴 HIGH Priority (Affects Core UX)

### Widget Enable/Disable State Issues
- **Issue**: When extension is disabled, existing widgets disappear but new text selection still shows widget in old tabs
- **Impact**: Confusing user experience - extension appears "partially disabled"
- **Location**: Cross-tab state management
- **Status**: Critical UX bug

### Audio Playback State Management  
- **Issue**: When paused audio exists and new text is selected, Play button doesn't work properly - shows pause button and plays old audio instead
- **Impact**: Broken core functionality - users can't play new text
- **Expected**: New text selection should abandon previous audio session completely
- **Status**: Critical functionality bug

### Extension Popup Auto-Close
- **Issue**: After enabling extension, popup stays open requiring extra click to close
- **Impact**: Annoying extra clicks over time, poor UX flow  
- **Expected**: Popup should auto-close after state change
- **Status**: User experience friction

### Keyboard Shortcuts Broken
- **Issue**: Shortcut to disable extension shows "Error toggling extension" on some sites (e.g., Supabase)
- **Impact**: Users cannot use keyboard shortcuts reliably
- **Status**: Functionality broken on some domains

### Language Detection Issues
- **Issue**: German text like "Vor einigen Wochen sollte der Bundestag insgesamt 3" detected as English
- **Impact**: Wrong voices loaded, poor pronunciation
- **Root Cause**: Detection algorithm needs more German word patterns
- **Location**: `content.js:882-971` (`detectLanguage` function)
- **Fix**: Add more German words to detection pattern

## 🟡 MEDIUM Priority (UX Polish)

### Voice Name Accuracy
- **Issue**: Google TTS voice names don't match their actual sound (e.g., "Emma" sounds male)
- **Impact**: Users select voices expecting different gender/tone
- **Potential Fix**: Add voice preview samples or better voice descriptions
- **Status**: Misleading voice naming

### Limited Voice Selection Display - DESIGN DECISION MADE ✅
- **Issue**: Widget only shows 4-6 voices despite loading 51+ voices from Google TTS
- **Impact**: Users don't see full range of available voices
- **SOLUTION**: Two-tier approach:
  1. **Widget dropdown**: Show best 4-6 curated voices per language for quick selection
  2. **"More Voices" button**: Opens modal with 20-40 pre-filtered quality voices (exclude weird/robot/alien voices)
  3. **Voice testing needed**: Manual testing to filter out low-quality voices from Google's 70+ options
  4. **Star/favorite system**: Users can promote voices from modal to main dropdown
- **Status**: Ready for implementation - needs voice quality evaluation phase

### Cross-Browser Compatibility
- **Issue**: Extension not tested on browsers other than Chrome
- **Impact**: Unknown functionality on Firefox, Edge, Safari
- **Status**: Testing needed across browser ecosystem

### Excessive Console Logging
- **Issue**: Too much debug logging in production
- **Impact**: Console clutter, potential performance impact
- **Status**: Code cleanup needed

## 🟢 LOW Priority (Infrastructure)

### E2E Testing Not Implemented
- **Issue**: E2E tests exist but are broken - wrong selectors, old naming (QuickSpeak), don't load extension properly
- **Impact**: No automated browser testing, relying on manual smoke tests only
- **Current State**: 8 e2e test files but all non-functional
- **Status**: E2E testing infrastructure needs complete rebuild

### CI/CD Pipeline
- **Issue**: No automated testing/deployment with GitHub Actions
- **Impact**: Manual deployment process, no automated quality checks  
- **Dependency**: Needs working E2E tests first
- **Status**: DevOps improvement opportunity

### Multi-Language Testing
- **Issue**: Limited testing on diverse languages across real-world websites
- **Impact**: Unknown behavior on less common languages/scripts
- **Status**: Expand testing coverage

### Minimum Browser Requirements
- **Issue**: Unclear minimum browser versions and graceful fallbacks
- **Impact**: Users may experience broken functionality on older browsers
- **Status**: Define support matrix and add graceful degradation

## ✅ RECENTLY FIXED

### Button Press Feedback ✅
- **Issue**: Buttons didn't show press state on real websites
- **Fix**: Added indigo blue active states to all buttons
- **Date**: 2025-08-10

### Google TTS Voice Loading ✅  
- **Issue**: Google TTS voices not loading properly
- **Fix**: Fixed Edge Function endpoint and voice transformation
- **Date**: 2025-08-10

### Database Constraint Errors ✅
- **Issue**: `record_local` event type not allowed in speech_events table
- **Fix**: Updated database constraints to allow recording events
- **Date**: 2025-08-10

---
*Last updated: 2025-08-10*