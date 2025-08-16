# NativeMimic - AI Speech & Pronunciation Coach

## 🧠 CLAUDE SESSION CONTINUITY STRATEGIES

### **For New Claude Sessions - CRITICAL ONBOARDING**
1. **Read CLAUDE.md FIRST** - Contains complete project context, current status, and critical decisions
2. **Check Current Status section** - Shows exact progress, version, and next steps  
3. **Review Recent Git Commits** - `git log --oneline -10` shows latest changes
4. **Test Extension Before Making Changes** - Load `/mvp/` folder in Chrome to understand current state
5. **Never Break Working Functionality** - Extension is production-ready, preserve core features

### **Key Context Files for Claude Sessions:**
- **`CLAUDE.md`** - Project roadmap, status, architecture decisions, lessons learned
- **`CHANGELOG.md`** - Version history and detailed change tracking  
- **`README-MODULAR-TEST.md`** - Modular architecture documentation
- **`package.json`** - Current version and testing commands
- **`mvp/manifest.json`** - Production extension version

### **Critical "Don't Break" Rules:**
- ⚠️ **Never modify `/mvp/` without testing** - This is the working production version
- ⚠️ **Always read current files before editing** - Understand existing implementation  
- ⚠️ **Check git status before major changes** - Don't overwrite uncommitted work
- ⚠️ **Use `/modular_test/` for experiments** - Safe testing environment available
- ⚠️ **Follow version update checklist** - Update all files when versioning

### **Session Recovery Commands:**
```bash
# Quick status check
git status
git log --oneline -5
ls -la mvp/

# Test current extension
# Load chrome://extensions/ → Developer mode → Load unpacked → select mvp/

# Check current version alignment
grep version mvp/manifest.json mvp/popup.html CLAUDE.md
```

## 🚨 CRITICAL COMMIT RULES (MEMORIZE)
- **Git commits could be multi-line messages but concise**
- **NEVER mention Claude or AI assistance** in commit messages  
- **Keep commits concise and descriptive** - focus on what changed
- **ALWAYS update versions** in manifest.json, popup.html, and CLAUDE.md
- **MAINTAIN CHANGELOG.md** with each version release

## 🎨 NATIVEMIMIC BRAND COLORS
- **Primary Green**: `#6ab354` - Main thematic color for buttons, sliders, and UI elements
- **Green Highlights**: `#7bc962` - Light green for raised shadow effects and highlights  
- **Green Shadows**: `#4a8c3e` - Dark green for inset shadows and depth effects
- **Usage**: This green color scheme provides the authentic 1980s retro aesthetic for all interactive elements

## 📋 VERSION UPDATE CHECKLIST
When updating version numbers, ALWAYS update ALL of these files:
1. ✅ `mvp/manifest.json` - Main extension version
2. ✅ `mvp/popup.html` - Popup footer version display (search for "version">v)
3. ✅ `CLAUDE.md` - Current status section header
4. ✅ `CHANGELOG.md` - Add new version entry

## 🎯 CURRENT DEVELOPMENT PLAN (4 Directions)

### **1. UI/UX Enhancement Priority** 
**Done**

### **2. Supabase Backend Implementation**  
**Goal**: Beta voting system and pronunciation correction storage
- Implement user voting modal for premium features ($15/month validation)
- Create bug reporting system with automatic context collection
- Build pronunciation correction database and community validation
- Set up real-time analytics dashboard for business insights
- Anonymous data collection with GDPR compliance

### **3. Chrome Web Store Preparation**
**Goal**: Professional store presence ready for launch
- Create high-quality screenshots (1280x800, 640x400)
- Write compelling store description and feature list
- Prepare promotional images and demo video
- Complete privacy policy and terms of service
- Final cross-browser testing and bug fixes
- Prepare for store review process

### **4. Beta Launch Strategy**
**Goal**: Controlled rollout with feedback collection
- Recruit 15-20 beta testers (friends, family, colleagues)  
- Create beta feedback collection system
- Implement usage analytics and error monitoring
- Test premium pricing acceptance ($15/month)
- Gather pronunciation correction reports
- Refine based on real user feedback



#### **Safe Styling Modification Strategy**
1. **Always target the most specific selector that's actually being used**
2. **Check for existing ID-based overrides** (search for `#nativemimic-*`)
3. **Test both light and dark modes** when making changes
4. **Use class selectors when possible** to avoid specificity wars
5. **Reserve !important only for dark mode overrides**

#### **Key Insights for Future UI Changes**
- **Widget is generated dynamically** - CSS must be loaded before widget creation
- **Dark mode system works reliably** - leverages class toggle + !important overrides  
- **Button styling follows consistent retro 1980s pattern** with raised 3D effects
- **Speed slider uses browser-specific pseudo-elements** requiring webkit/moz prefixes
- **Always check for ID selector conflicts** before implementing class-based changes

### **Next UI Enhancement Approach**
1. **Identify exact selectors** being used (ID vs class)
2. **Modify the higher-specificity rule** rather than fighting with !important  
3. **Test in both themes** to ensure dark mode overrides still work
4. **Make incremental changes** one element at a time

### **Testing Protocol**
⚠️ **STOP**: Test the above 5 critical fixes before proceeding with additional repairs
1. **Test Language Detection**: Select English text → verify "en" language detected and English voices load
2. **Test System Voices**: Verify system voices show proper names (not "undefined undefined") 
3. **Test Dropdown Persistence**: Click elsewhere to deselect text → verify dropdown still works
4. **Test Language Switching**: English text → French text → Chinese text → verify dropdown repopulates each time
5. **Test Actual Voice Loading**: Verify Google TTS voices actually appear in dropdown for each language
6. If ALL 5 tests PASS ✅ → Commit fixes and proceed to theme toggle
7. If ANY test FAILS ❌ → Debug and fix before proceeding

**Expected Results:**
- English text: "Auto-selecting best voice for language: en" + English Google TTS voices visible in dropdown
- French text: "Language changed - refreshing voice dropdown" + French Google TTS voices visible in dropdown  
- Chinese text: "Language changed - refreshing voice dropdown" + Chinese Google TTS voices visible in dropdown
- System voices: "Samantha" or "Alex" names visible (not "undefined undefined")
- Dropdown: Functional after clicking elsewhere to deselect text

### **Testing & Commit Strategy**
- Fix one issue at a time
- **USER MUST TEST MANUALLY** before each commit
- Update version, changelog, commit only AFTER user confirms fix works
- Ask for user confirmation before proceeding to next issue

### **Current Status: Issue #1 - Voice System Debug & Final Fixes**
- ✅ **CRITICAL FIX**: Added missing `speakWithGoogleTTS()` function (infinite recursion loop)
- ✅ **Supporting Functions**: Added `playGoogleTTSAudio()`, `getDefaultGoogleTTSVoice()` functions
- ✅ **Cache Management**: Added `getCachedAudio()`, `cacheAudio()`, `cleanupCache()` functions
- ✅ **Removed Premature Voice Selection**: Eliminated "Set default system voice: Samantha" during initialization
- ✅ **Enhanced Auto-Selection**: Widget always attempts Google TTS voice selection when displayed
- ✅ **System Voice Fallback**: Added English system voice fallback for all languages
- ✅ **Comprehensive Debug Logging**: Added detailed logging for voice detection and dropdown behavior
- ✅ **Pricing Logs**: Added clear cost logging ($X.XXXX for new, $0.0000 CACHED for reused)
- ✅ **Dropdown Memory Fix**: Fixed dropdown breaking after 3 selections (event delegation)
- ✅ **Version Updated**: manifest.json v3.15 → v3.16

### **Debug Focus Areas Added:**
- Auto-selection logging: "Auto-selected best voice for widget display"
- System voice processing: "About to add X system voices to dropdown"  
- Individual voice validation: "Processing system voice 0: Samantha"
- Dropdown interaction: "Dropdown clicked, currently open: false/true"
- Voice selection handling: "Processing voice selection: google-tts:voice-id"

- 🔄 **READY FOR TESTING WITH DEBUG**: 
  - Check console for auto-selection messages
  - Verify system voices appear in dropdown with debug logs
  - Test dropdown clicking with interaction logs
  - Confirm Google TTS voices show pricing logs
- ⏸️ **Next Steps**: User test with debug logs, identify remaining issues, then commit if working

**Next Sprint**: Manual testing of ElevenLabs removal → then UI/UX fixes (Close button, speed slider styling, theme toggle)

## Current Status: v3.31 (CORE FUNCTIONALITY FIXES & IMPROVEMENTS)
- **Location**: `/Users/elenak/working_dir/saas_products/quickspeak_extension/`
- **Git**: Private repository `https://github.com/noircir/lc-studio.git`
- **Production-ready**: Chrome extension MVP complete with live data collection
- **REBRANDED**: QuickSpeak → VocaFluent (v3.0) → NativeMimic (v3.5)
- **BACKEND INTEGRATION**: Live Supabase connection for analytics, feedback, and user data
- **MODULAR FOUNDATION**: Proper modular architecture available in `/modular_test/` (v3.20)
- **LAUNCH READY**: Extension connected to production database for immediate deployment

## 🚀 MAJOR MILESTONE: OPTION B ARCHITECTURE & TESTING (v3.22)

### **✅ COMPLETED: Production-Ready Architecture**
- **Option B Implementation**: Background script as authoritative source with cross-tab broadcasting
- **Critical Bug Fixes**: Widget persistence across tabs, DOM reference errors, async syntax issues
- **Comprehensive Testing**: 16-test automated smoke test suite with 93.8%+ success rate
- **Cross-Browser Compatibility**: Chrome and Brave fully verified with premium voice functionality
- **Launch Readiness**: All 4 launch-critical tests passing, production architecture stable

## 🚀 MAJOR MILESTONE: SUPABASE BACKEND INTEGRATION (v3.21)

### **✅ COMPLETED: Live Database Connection**
- **Supabase Project**: NativeMimic (`https://fbgegchcosrkawsniyco.supabase.co`)
- **Authentication**: Anonymous users enabled (no signup required)
- **Security**: Row Level Security (RLS) implemented - users only see their own data
- **Tables Created**: users, analytics, recordings, notes, feedback
- **Extension Updated**: Supabase client configured with production credentials

### **📊 DATA COLLECTION ARCHITECTURE**
**Current Analytics Collection:**
```sql
analytics (
  user_id UUID,
  event_type TEXT,        -- "extension_loaded", "speech_synthesis"
  event_data JSONB,       -- Rich context data
  page_url TEXT,          -- User's browsing location
  session_duration INT,   -- Time spent
  language TEXT,          -- "en", "es", "fr"
  voice_type TEXT,        -- "google-tts", "system"
  speed REAL,             -- 0.5x to 2.0x
  text_length INT,        -- Text complexity
  created_at TIMESTAMP
)
```

**User Data Storage:**
- Anonymous UUID-based users (GDPR-friendly)
- Usage statistics and preferences in JSONB
- Bug reports with automatic context capture
- Notes and recordings (with user consent)

### **🔧 SCHEMA ISSUES RESOLVED**
- **Problem**: Extension tried to save `event_data`, `page_url`, `session_duration` columns that didn't exist
- **Error**: `Could not find the 'event_data' column of 'analytics'`
- **Solution**: Enhanced analytics table schema to match extension expectations
- **Status**: **NEEDS SQL UPDATE** - Run enhanced schema before next session

### **🎯 BUSINESS VALUE UNLOCKED**
- **Real-time Analytics**: Track user behavior, language preferences, usage patterns
- **Product Intelligence**: See which features drive engagement
- **Monetization Data**: Usage patterns for pricing optimization
- **Quality Assurance**: Automatic bug reporting with full context
- **Market Research**: Popular languages, content types, user flows

### **🔍 TESTING COMPLETED**
- Extension loads successfully with Supabase connection
- Analytics tracking attempts but fails due to schema mismatch
- Error handling works (graceful degradation to offline mode)
- **Next Step**: Fix schema, verify data flow to dashboard

### **🔧 IMMEDIATE ACTION REQUIRED - SUPABASE SCHEMA FIX**
**Problem**: Extension fails to save analytics due to missing database columns  
**Solution**: Run this SQL in Supabase SQL Editor:
```sql
-- Fix analytics table schema mismatch
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS event_data JSONB;
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS page_url TEXT;
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS session_duration INTEGER;
```

**After SQL Fix**:
1. Reload extension in Chrome
2. Test text-to-speech functionality  
3. Check Supabase Table Editor for new analytics rows
4. Verify feedback submission works
5. **Success Metric**: Live data flowing to Supabase dashboard

## 🧪 TESTING STRATEGY ANALYSIS (Launch-Focused ROI)

### **📊 Current Test Infrastructure Status**
- **Test Files**: 21 files, ~6,500 lines of code
- **Coverage**: E2E tests (Playwright), Unit tests (Jest), Integration tests
- **Size Impact**: 272KB (41% of production code size - reasonable footprint)
- **Historical Value**: Caught voice loading bugs, ElevenLabs removal verification, modular architecture validation

### **🎯 STRATEGIC TESTING RECOMMENDATION: 80/20 Rule**

#### **🔴 CRITICAL - Launch-Blocking Tests (20% effort, 80% value)**
**Investment**: 2-3 hours | **ROI**: Prevent major bugs that kill user adoption
```javascript
// High-Impact Test Suite (4 files):
1. speech-synthesis.test.js      // Core TTS functionality - user's primary use case
2. supabase-integration.test.js  // Analytics & feedback - revenue-critical data
3. voice-loading.test.js         // Historical pain point - we've broken this 3+ times
4. user-workflow.test.js         // End-to-end journey - select text → hear speech
```

#### **🟡 MEDIUM Priority - Post-Launch (60% effort, 15% value)**
```javascript
// UI interactions, keyboard shortcuts, theme toggles, modal functionality
// Important but not launch-blocking - defer until profitable
```

#### **🟢 LOW Priority - Skip for Launch (20% effort, 5% value)**
```javascript
// Edge cases, error handling, performance optimizations, cross-browser quirks
// Add after achieving product-market fit and steady revenue
```

### **💰 BUSINESS CASE FOR FOCUSED TESTING**
- **Prevent 1 major bug** = Save 50+ one-star reviews = $500+ in lost revenue
- **Catch Supabase issues** = Preserve analytics data = $1000+ in business intelligence  
- **Maintain voice reliability** = 95%+ user satisfaction = Higher conversion rates
- **Time saved** = 10+ hours redirected to Chrome Web Store optimization, user acquisition, pricing experiments

### **🚀 LAUNCH DECISION: Focus First, Scale Later**
**RECOMMENDATION**: Write 4 launch-critical tests (~2 hours) but defer comprehensive testing until after paying customers.

**Rationale**: Extension already has solid 21-test foundation. Time better spent on:
1. Chrome Web Store assets and optimization
2. Beta user recruitment and feedback collection  
3. Pricing validation and conversion optimization
4. Revenue generation and market validation

**Success Metric**: Ship fast with critical functionality verified, iterate based on real user data rather than theoretical test coverage.

### **🎯 NEXT SESSION PRIORITIES**
1. **CRITICAL**: Fix Supabase schema (SQL above)
2. **Verify**: End-to-end data collection working
3. **Optional**: Implement 4 launch-critical tests (if time permits)
4. **Launch Prep**: Chrome Web Store assets and submission
5. **Monetization**: Beta testing and pricing validation

### **Major Architectural Achievement: Proper Modularization Complete**

**Status**: ✅ **Successfully created modular architecture** in `/modular_test/` directory  

#### **Modular Architecture Implementation:**
- **Safe Approach**: Learned from v3.16 modular failure, analyzed dependencies first
- **Test Environment**: Created `/modular_test/` directory to avoid breaking working `/mvp/`
- **Three Core Modules**: Extracted utilities, data management, and analytics without breaking functionality
- **Strategic Decision**: Option B platform foundation - simple expansion path without immediate complexity

#### **Module Breakdown:**
1. **`nativemimic-utils.js`** - Pure utility functions (language detection, formatting, validation)
2. **`nativemimic-data.js`** - Storage management, cache handling, data persistence  
3. **`nativemimic-analytics.js`** - Usage tracking, dashboard metrics, Supabase integration
4. **`content-modular.js`** - Refactored main class using modules internally

#### **UI/UX Improvements (v3.20):**
- ✅ **Dashboard Button**: Fixed retro styling to match neighboring buttons with 3D shadows
- ✅ **User Feedback**: Restored "select text first" message for Play button
- ✅ **Dashboard Focus**: Removed community section to keep dashboard pure analytics
- ✅ **Shortcuts Location**: Moved from Settings to extension popup with NM green styling
- ✅ **Feedback Modal**: Fixed textarea width to use full modal width
- ✅ **Brand Consistency**: NM green (#6ab354) applied to all submit buttons
- ✅ **Label Clarity**: Changed "Total Texts" to "Texts Practiced"
- **MAJOR CLEANUP**: ElevenLabs integration completely removed with Google TTS fallbacks (v3.15+)

## 🧹 MAJOR UPDATE: ElevenLabs Integration Removal (v3.15+)

### **Status: ✅ COMPLETED**
**Decision**: Remove ElevenLabs integration entirely to focus on Google TTS and system voices only.

#### **Changes Made:**
1. **Function Stubs Created**: All ElevenLabs functions kept as backward-compatible stubs
   - `speakWithElevenLabs()` → falls back to `speakWithGoogleTTS()`
   - `playElevenLabsAudio()` → calls `playGoogleTTSAudio()`  
   - `speakTextElevenLabs()` → calls `speakTextGoogleTTS()`
   - `getElevenLabsVoiceName()` → returns "Google TTS Voice"

2. **Voice Selection Logic Updated**:
   - ElevenLabs voice selections automatically redirect to Google TTS
   - Voice dropdown only shows Google TTS and system voices
   - No more ElevenLabs options or references in UI

3. **Logging & Error Handling Updated**:
   - All "ElevenLabs audio" references changed to "Google TTS audio"  
   - Console logs show Google TTS cost tracking instead of ElevenLabs
   - Speed change logs updated to Google TTS format

4. **Memory Management Preserved**:
   - Cache cleanup with blob URL revocation still works properly
   - 50-item cache limit and 24-hour expiry maintained
   - No memory leaks identified

#### **Testing Results:**
- ✅ **Static Code Verification**: 7/7 checks passed  
- ✅ **Unit Tests**: 15/15 tests passed
- ✅ **Core Functionality Tests**: 17/17 tests passed
- ✅ **Memory Management Tests**: All cache cleanup tests passed
- 🧪 **Manual Testing Required**: Load extension and verify widget works

#### **Files Modified:**
- `mvp/content.js`: Main cleanup with 74 ElevenLabs references handled
- `tests/unit/elevenlabs-removal.test.js`: Comprehensive test suite (NEW)
- `tests/e2e/speech-workflow-post-elevenlabs-removal.spec.js`: E2E tests (NEW)
- `run-elevenlabs-removal-tests.js`: Test runner script (NEW)
- `verify-elevenlabs-removal.js`: Static verification script (NEW)

#### **Next Manual Testing Steps:**
1. Load extension in Chrome (mvp/ folder)
2. Test text selection → widget appears
3. Test play button → works with Google TTS/system voices
4. Test voice dropdown → no ElevenLabs options
5. Test speed slider → works without ElevenLabs errors
6. Check browser console → no ElevenLabs-related errors

## 📋 CURRENT OUTSTANDING ISSUES (Reference: `/issues/CURRENT_ISSUES.md`)

### **🔴 HIGH Priority (Affects Core UX):**
1. **Widget Enable/Disable State Issues** - Cross-tab state management when extension is disabled
2. **Audio Playback State Management** - Play button doesn't work with new text when paused audio exists
3. **Extension Popup Auto-Close** - Popup doesn't auto-close after state changes
4. **Keyboard Shortcuts Broken** - Error on some domains like Supabase
5. **Language Detection Issues** - German text incorrectly detected as English

### **🟡 MEDIUM Priority (UX Polish):**
6. **Voice Name Accuracy** - Google TTS voice names don't match actual sound
7. **Limited Voice Selection Display** - Only shows 4-6 of 51+ available voices
8. **Cross-Browser Compatibility** - Testing needed on Firefox, Edge, Safari
9. **Excessive Console Logging** - Too much debug output in production

### **Testing Status:**
- ✅ ElevenLabs removal automated tests: **PASSED**
- ✅ Testing infrastructure for v3.30: **COMPLETED**
- ✅ Smoke tests updated (22 tests for v3.30 features): **COMPLETED**
- ✅ Sanity testing system: **COMPLETED**
- ✅ Regression testing suite: **COMPLETED**
- 🔴 **Current High Priority Issues**: Documented in `/issues/CURRENT_ISSUES.md`

## 🎯 Core Business Definition
**AI Speech & Pronunciation Coach** - We help language learners overcome speaking fears and improve their pronunciation through:
- **🔍 Discovery:** Hear how native speakers actually pronounce words in context
- **🎤 Practice:** Record and compare your pronunciation against native speech
- **📊 Analysis:** AI identifies specific improvement areas and pronunciation patterns  
- **🧠 Coaching:** Personalized guidance and feedback to improve speaking confidence

## Recent Updates (v3.15+)
1. **CRITICAL ARCHITECTURE DECISION**: Abandoned modular v3.16 after 6+ hours of cascading failures, reverted to working content.js v3.15
2. **MAJOR CLEANUP - ElevenLabs Removal**: Completely removed ElevenLabs integration with proper Google TTS fallbacks 
3. **Function Stubs**: All ElevenLabs functions kept as backward-compatible stubs to prevent runtime errors
4. **Voice System Simplification**: Voice dropdown now shows only Google TTS and system voices (no ElevenLabs options)
5. **Memory Management Preserved**: 50-item cache with 24-hour expiry and blob URL cleanup still functions properly
6. **Comprehensive Testing**: Created full test suite (15 unit tests, E2E tests, verification scripts) - all automated tests passing
7. **Console Logging Updated**: All ElevenLabs references in logs changed to Google TTS cost tracking format

## Project Structure
```
vocafluent_extension/
├── README.md                          # Complete project documentation
├── mvp/                              # Production MVP (v3.0)
│   ├── manifest.json                 # Chrome extension config (v3.0)
│   ├── content.js                    # Core TTS functionality (1800+ lines)
│   ├── content.css                   # Professional UI with modal styles
│   ├── background.js                 # Service worker & settings
│   └── popup.html                    # Settings panel
├── extension_demo/                   # Original demo version
└── web_speech_api_research_report.md # Technical validation
```

## Technical Implementation
- **Hybrid TTS**: Web Speech API (free) + future ElevenLabs (premium)
- **Core Features**: Text selection → instant speech, speed control, keyboard shortcuts
- **UI**: Draggable widget with position memory, professional gradient styling
- **Crowdsourcing**: Foundation for pronunciation correction reports

## Business Model
- **Pricing**: $3-12/month (vs competitors $10-30/month)
- **Target**: 15M+ displaced users, 500M+ language learners
- **Revenue Goal**: $24K Year 1, $150K Year 3

## Known Issues Status
### ✅ **Recently Fixed:**
- ✅ First-word skipping ("Wilkinson" → "son lived") - Fixed with extended primer
- ✅ Pause button showing duplicate play icons - Fixed with proper state reset  
- ✅ Clunky pronunciation reporting - Replaced with elegant modal
- ✅ ElevenLabs integration issues - Completely removed with Google TTS fallbacks
- ✅ Modular architecture cascading failures - Reverted to working content.js
- ✅ Memory leaks in cache system - Verified proper blob URL cleanup

### 🔧 **Current Issues (See `/issues/CURRENT_ISSUES.md` for details):**
**Reference the current issues documentation at `/issues/CURRENT_ISSUES.md` for up-to-date status.**

**Recently Fixed (v3.31):**
- ✅ Button press feedback - Added indigo blue active states
- ✅ Google TTS voice loading - Fixed Edge Function endpoint  
- ✅ Database constraint errors - Updated speech_events table constraints

## Development Commands & Testing Protocol

### Extension Loading
```bash
# Load extension in Chrome
# 1. Go to chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select mvp/ folder
```

### 🧪 REQUIRED TESTING PROTOCOL

**Before EVERY commit:**
```bash
npm run test:smoke    # 22 critical functionality tests (2-5 min)
npm run lint          # Code quality check
```

**After bug fixes:**
```bash
npm run test:fix      # Sanity + Smoke tests
```

**After new features:**
```bash
npm run test:feature  # Full sanity testing + Smoke tests
```

**Before releases:**
```bash
npm run test:release  # Complete regression suite (15-30 min)
```

### Testing Schedule Reminders
- **Daily**: `npm run test:daily` - Smoke + Unit tests
- **Weekly**: `npm run test:weekly` - Daily + E2E tests  
- **Release**: `npm run test:release` - All tests including regression
- **Monthly**: Manual usability + performance testing

### Git Operations
```bash
git add .
git commit -m "Brief one-liner description of changes"

# BEFORE PUSHING - Run appropriate tests:
npm run test:smoke    # Minimum requirement
npm run test:release  # Before version bumps

git push origin main
```

## Git Commit Guidelines
- **One-liner commits only** - no multi-line commit messages
- **No Claude/AI mentions** - never include "Generated with Claude Code" or similar
- **Detailed and descriptive** - provide context and explain the purpose of changes
- Example: `git commit -m "Revert to content.js v3.15 due to modular architecture failures affecting voice loading and dropdown functionality"`

## Next Development Priorities (Post-Reversion - v3.15+)

### **Immediate Focus: UI/UX Enhancement on Stable Foundation**
1. **Theme Toggle Fixes** - Dark/light mode functionality on working content.js
2. **Modern Widget Design** - Apple/Notion aesthetic with minimal visual weight
3. **Button Functionality** - Notes, Close, Settings buttons operational  
4. **Professional Polish** - Smooth animations and micro-interactions

### **Phase 2: Supabase Backend Integration**
1. **User Data Sync** - Anonymous user authentication and cross-device data sync
2. **Analytics Dashboard** - Real-time usage analytics and speech event tracking
3. **Beta Feedback System** - Integrated bug reporting with automatic context collection
4. **Pronunciation Database** - Community validation and crowdsourced correction storage
5. **GDPR Compliance** - Anonymous data collection with proper privacy controls

### **Phase 3: Chrome Web Store & Beta Launch**
1. **Professional Assets** - High-quality screenshots (1280x800, 640x400) and promotional images
2. **Store Optimization** - Compelling description, feature lists, and demo video
3. **Beta Tester Recruitment** - 15-20 testers for real-world feedback collection
4. **Privacy & Legal** - Privacy policy, terms of service, and compliance documentation

### **Legacy Priorities (Pre-Reversion)**
### **v2.7-2.8: Core Infrastructure**
1. **Extension icons** (16px, 32px, 48px, 128px) for Chrome Web Store
2. **Voice recording system** - MediaRecorder API implementation  
3. **Backend API** - Database and cloud storage for pronunciation reports
4. **Chrome Web Store submission** - Ready for publication

### **v2.9-3.0: Crowdsourcing Platform**
1. **Community validation** - Users vote on pronunciation accuracy
2. **Moderation system** - Anti-prank guardrails and quality control
3. **User reputation** - Track submission quality and reliability
4. **Premium tier** - ElevenLabs integration when revenue justifies

### **v3.1+: Advanced Features**
1. **AI pronunciation scoring** - Automated quality assessment
2. **Regional accent support** - Multiple valid pronunciations per word
3. **Language learning integration** - Export progress to other platforms
4. **Mobile app** - Extend beyond browser extension

## Testing Focus Areas
- First-word pronunciation accuracy with new primer
- Pause button state transitions
- Pronunciation modal UX and functionality
- Cross-browser compatibility (Chrome primary, Edge secondary)

## File Locations for Quick Access
- **Main functionality**: `mvp/content.js:206-314` (speakText method)
- **Modal implementation**: `mvp/content.js:528-662` (pronunciation reporting)
- **CSS styles**: `mvp/content.css:3-258` (modal + controls)
- **Extension config**: `mvp/manifest.json` (v2.5)

## Important Notes
- Extension works offline (Web Speech API advantage)
- Zero monthly costs until premium tier
- Ready for immediate Chrome Web Store submission
- All critical user issues from testing have been addressed

## Claude's Memories
- to memorize
- Always give descriptive names
- **Commit Messages**: Use one-liner commit messages only, never verbose multi-line. No mention of Claude or AI generation. yes.
- don't forget to track versions
- to memorize the work we've done
