# NativeMimic - Complete High-Level Architecture & Rewrite Plan

## Executive Summary

This document outlines the complete architectural redesign of NativeMimic to address JavaScript complexity issues, UI instability, and lack of proper modularity. The goal is to create a robust, scalable foundation using modern technologies while maintaining the core browser extension value proposition.

## Technology Stack Recommendation

### Frontend Stack
- **Svelte or React with TypeScript** (easier learning curve than vanilla JS)
- **Vite** for build tooling (faster than webpack)
- **Tailwind CSS** for styling consistency

### Backend Stack
- **Supabase** with Edge Functions for serverless logic
- **Supabase Auth** for user management
- **Supabase Storage** for voice recordings

### Extension Architecture
Browser extensions remain optimal for NativeMimic because they provide seamless text selection across any website, which is core to the value proposition.

## Complete System Architecture

```
NativeMimic/
├── 1. CORE_PRODUCT/
│   ├── 1.1_user_interface/
│   │   ├── widget_overlay/          # Main text highlight interface
│   │   ├── voice_selection/         # Voice picker modal
│   │   ├── recording_controls/      # Record/playback UI
│   │   └── settings_panel/          # User preferences
│   ├── 1.2_voice_engine/
│   │   ├── tts_integration/         # Google TTS API calls
│   │   ├── audio_caching/           # Cache management
│   │   ├── voice_filtering/         # Quality curation
│   │   └── multilingual_support/   # Language detection
│   └── 1.3_recording_system/
│       ├── audio_capture/           # User voice recording
│       ├── storage_manager/         # Supabase integration
│       └── privacy_controls/        # Opt-in management
├── 2. PLATFORM_INTEGRATION/
│   ├── 2.1_browser_extension/
│   │   ├── manifest_v3/             # Extension configuration
│   │   ├── content_scripts/         # Web page interaction
│   │   ├── background_service/      # Extension lifecycle
│   │   └── permissions_manager/     # API access control
│   ├── 2.2_web_compatibility/
│   │   ├── cors_handling/           # Cross-origin requests
│   │   ├── site_adapters/           # Different website types
│   │   └── text_extraction/         # Clean text parsing
│   └── 2.3_deployment/
│       ├── chrome_store/            # Web store submission
│       ├── firefox_addon/           # Future expansion
│       └── auto_updates/            # Version management
├── 3. DATA_INTELLIGENCE/
│   ├── 3.1_user_analytics/
│   │   ├── engagement_tracking/     # DAU, session length
│   │   ├── usage_patterns/          # Voice preferences, languages
│   │   ├── learning_progress/       # Recording frequency
│   │   └── cost_monitoring/         # API usage per user
│   ├── 3.2_crowdsourced_curation/
│   │   ├── voice_quality_feedback/  # User ratings
│   │   ├── language_accuracy/       # Community corrections
│   │   └── feature_requests/        # User suggestions
│   └── 3.3_business_intelligence/
│       ├── market_insights/         # Language learning trends
│       ├── migration_patterns/      # Geographic data value
│       └── monetization_data/       # Premium feature usage
├── 4. INFRASTRUCTURE/
│   ├── 4.1_backend_services/
│   │   ├── supabase_functions/      # Edge function APIs
│   │   ├── database_schema/         # User data structure
│   │   ├── file_storage/            # Voice recordings
│   │   └── real_time_sync/          # Live updates
│   ├── 4.2_testing_framework/
│   │   ├── unit_tests/              # Component testing
│   │   ├── integration_tests/       # API interactions
│   │   ├── ui_automation/           # Visual regression
│   │   └── performance_tests/       # Load and speed
│   └── 4.3_devops/
│       ├── ci_cd_pipeline/          # Automated deployment
│       ├── monitoring_alerts/       # System health
│       └── backup_recovery/         # Data protection
└── 5. FUTURE_EXTENSIBILITY/
    ├── 5.1_ai_coach_architecture/
    │   ├── voice_analysis_api/       # Speech parsing (planned)
    │   ├── feedback_engine/          # AI-generated advice (planned)
    │   └── learning_personalization/ # Adaptive training (planned)
    └── 5.2_scaling_preparation/
        ├── microservices_ready/      # Service separation
        ├── cdn_integration/          # Global audio delivery
        └── enterprise_features/      # Team accounts
```

## Detailed Module Specifications

## 1. CORE PRODUCT

### 1.1 User Interface
**Technology**: TypeScript with React or Svelte for robust, type-safe environment to eliminate UI/UX bugs.

**Components:**
- **widget_overlay**: Main text highlight interface
- **voice_selection**: Two-tier system - display 3-5 curated, high-quality voices in main widget, modal for full vetted list
- **recording_controls**: Record/playback UI
- **settings_panel**: Include clear controls for data privacy opt-in

### 1.2 Voice Engine
**Security Note**: TTS integration must NOT call Google TTS API directly from client. All calls routed through secure backend function to protect API key.

**Components:**
- **tts_integration**: Google TTS API calls via backend proxy
- **audio_caching**: Primary cost-control mechanism. Store generated audio in Supabase Storage, pull cached files for subsequent requests
- **voice_filtering**: Manual curation of best voices (human touch as quality differentiator)
- **multilingual_support**: Language detection and processing

### 1.3 Recording System
**Privacy First**: Default should always be "do not store" with clear, explicit opt-in required.

**Components:**
- **audio_capture**: User voice recording functionality
- **storage_manager**: Use Supabase Storage with logical file paths (e.g., /user_id/recordings/timestamp.mp3)
- **privacy_controls**: Critical for user trust - explicit opt-in before any voice recording storage

## 2. PLATFORM INTEGRATION

### 2.1 Browser Extension
**Compatibility**: TypeScript/React fully compatible with Manifest V3 requirements.

**Components:**
- **manifest_v3**: Extension configuration
- **content_scripts**: Web page interaction
- **background_service**: Extension's brain - handles communication between content scripts, UI, and backend services
- **permissions_manager**: API access control

### 2.2 Web Compatibility
**Strategy**: Start with specific popular websites (Wikipedia, major news domains, Medium) for stable experience before universal compatibility.

**Components:**
- **cors_handling**: Cross-origin request management
- **site_adapters**: Different website type handling
- **text_extraction**: Clean text parsing

### 2.3 Deployment
**6-Week Goal Preparation**: Begin drafting store listing assets now - compelling description, high-quality screenshots, clear privacy policy.

**Components:**
- **chrome_store**: Web store submission
- **firefox_addon**: Future expansion
- **auto_updates**: Version management

## 3. DATA INTELLIGENCE
**Business Secret Weapon**: The value of collected data for market insights and monetization.

### 3.1 User Analytics
**Priority Metrics**: DAU/MAU, recordings per session, user retention (1-day, 7-day, 30-day) for product-market fit proof.

**Components:**
- **engagement_tracking**: DAU, session length
- **usage_patterns**: Voice preferences, languages
- **learning_progress**: Recording frequency
- **cost_monitoring**: API usage per user (logged by backend functions)

### 3.2 Crowdsourced Curation
**Implementation**: Simple thumbs-up/thumbs-down button next to play button for low-friction feedback.

**Components:**
- **voice_quality_feedback**: User ratings
- **language_accuracy**: Community corrections
- **feature_requests**: User suggestions

### 3.3 Business Intelligence
**Monetization Target**: Trend reports on language pairs, geographic demand, content types for corporate L&D, market research firms, AI developers.

**Components:**
- **market_insights**: Language learning trends
- **migration_patterns**: Geographic data value
- **monetization_data**: Premium feature usage

## 4. INFRASTRUCTURE

### 4.1 Backend Services (Supabase)
**Critical Edge Functions** (Immediate Implementation):

1. **tts-proxy**: Receives text from client, calls Google TTS API with secret key, returns audio (keeps key secure)
2. **rate-limiter**: Checks user's API usage against subscription plan before allowing tts-proxy calls

**Components:**
- **supabase_functions**: Edge function APIs
- **database_schema**: Design tables for analytics and future AI needs (recordings table linking user, original text, cached native audio URL)
- **file_storage**: Voice recordings
- **real_time_sync**: Live updates

### 4.2 Testing Framework
**Highest Priority**: UI automation for fixing UI/UX instability using Playwright or Cypress for end-to-end tests.

**Components:**
- **unit_tests**: Component testing
- **integration_tests**: API interaction verification (UI-Supabase function contracts)
- **ui_automation**: Visual regression testing
- **performance_tests**: Load and speed testing

### 4.3 DevOps
**Pipeline**: GitHub Actions configured to run full test suite on every code change to prevent production regressions.

**Components:**
- **ci_cd_pipeline**: Automated deployment
- **monitoring_alerts**: System health
- **backup_recovery**: Data protection

## 5. FUTURE EXTENSIBILITY

### 5.1 AI Coach Architecture
**Immediate Action**: Standardize data storage by saving user's audio, original text, and native audio file together to create perfect training dataset for future voice_analysis_api.

**Components:**
- **voice_analysis_api**: Speech parsing (planned)
- **feedback_engine**: AI-generated advice (planned)
- **learning_personalization**: Adaptive training (planned)

### 5.2 Scaling Preparation
**Current Alignment**: Supabase Edge Functions already aligned with microservices approach. Supabase Storage uses CDN for global performance.

**Components:**
- **microservices_ready**: Service separation (each function is independent service)
- **cdn_integration**: Global audio delivery (already implemented via Supabase)
- **enterprise_features**: Team accounts

## Implementation Priorities

### Phase 1: Foundation (Weeks 1-2)
1. Set up TypeScript/React development environment
2. Implement critical Edge Functions (tts-proxy, rate-limiter)
3. Create basic UI automation tests
4. Set up CI/CD pipeline

### Phase 2: Core Features (Weeks 3-4)
1. Build modular UI components
2. Implement secure TTS integration
3. Set up audio caching system
4. Create user analytics tracking

### Phase 3: Polish & Deploy (Weeks 5-6)
1. Complete testing framework
2. Prepare Chrome Web Store assets
3. Implement privacy controls
4. Final testing and deployment

## Key Success Metrics

### Technical Quality
- **Zero UI breaking changes** through comprehensive testing
- **Type safety** throughout codebase with TypeScript
- **Modular architecture** allowing independent component development
- **Secure API integration** protecting sensitive keys

### Business Intelligence
- **Complete user analytics** for product-market fit validation
- **Cost monitoring** for sustainable growth
- **Data collection** for future AI and market insights monetization

### User Experience
- **Seamless text selection** across all major websites
- **Fast, reliable voice playback** with caching
- **Clear privacy controls** building user trust
- **Consistent, stable UI** eliminating frustration

This architecture provides a robust foundation for NativeMimic's growth from MVP to enterprise-scale language learning platform while maintaining the core browser extension advantages.