-- UNIFIED ANALYTICS TABLE - Single source of truth for all NativeMimic analytics
-- Designed to answer all business intelligence and product questions

-- Drop existing fragmented tables (backup first if needed)
-- DROP TABLE IF EXISTS public.analytics CASCADE;
-- DROP TABLE IF EXISTS public.speech_events CASCADE;

-- Create the master unified analytics table
CREATE TABLE IF NOT EXISTS public.unified_analytics (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- ===== USER & SESSION CONTEXT =====
    user_id UUID NOT NULL,
    session_id TEXT NOT NULL,
    
    -- ===== EVENT CLASSIFICATION =====
    event_type TEXT NOT NULL, -- 'extension_loaded', 'text_selected', 'speech_play', 'voice_changed', 'error_occurred'
    event_category TEXT NOT NULL CHECK (event_category IN (
        'lifecycle',    -- extension_loaded, extension_enabled, extension_disabled
        'interaction',  -- text_selected, button_clicked, shortcut_used
        'speech',       -- speech_play, speech_pause, speech_stop, speech_complete
        'voice',        -- voice_changed, voice_loaded, voice_failed
        'feature',      -- recording_started, note_created, feedback_submitted
        'performance',  -- cache_hit, api_response_time, voice_loading_time
        'error',        -- voice_loading_failed, speech_synthesis_failed, network_error
        'business'      -- feature_discovery, premium_interest, conversion_funnel
    )),
    
    -- ===== CONTENT CONTEXT =====
    page_url TEXT,
    page_domain TEXT, -- extracted from page_url for faster queries
    page_title TEXT,
    text_content TEXT, -- the actual text being processed (truncated for privacy)
    text_length INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    language_detected TEXT, -- auto-detected language code
    language_selected TEXT, -- user-selected language override
    
    -- ===== VOICE/TTS CONTEXT =====
    voice_id TEXT,
    voice_type TEXT CHECK (voice_type IN ('google-tts', 'system', NULL)),
    voice_name TEXT,
    voice_gender TEXT CHECK (voice_gender IN ('male', 'female', 'neutral', NULL)),
    voice_accent TEXT, -- 'us', 'uk', 'au', 'in', etc.
    speed_setting REAL DEFAULT 1.0,
    
    -- ===== BUSINESS METRICS =====
    cost_cents INTEGER DEFAULT 0, -- TTS API cost in cents
    is_cached BOOLEAN DEFAULT false,
    cache_hit_rate REAL, -- for performance events
    duration_ms INTEGER, -- event duration (speech length, loading time, session time)
    
    -- ===== SESSION METRICS =====
    session_duration_seconds INTEGER DEFAULT 0, -- total session time when event occurred
    events_in_session INTEGER DEFAULT 1, -- sequence number of this event in session
    texts_processed_in_session INTEGER DEFAULT 0, -- how many texts processed so far
    
    -- ===== PERFORMANCE METRICS =====
    response_time_ms INTEGER, -- API response time, voice loading time
    network_latency_ms INTEGER,
    browser_performance_score REAL, -- if we measure browser performance
    
    -- ===== ERROR CONTEXT =====
    error_code TEXT,
    error_message TEXT,
    error_stack TEXT, -- for debugging (truncated)
    retry_count INTEGER DEFAULT 0,
    
    -- ===== FEATURE USAGE =====
    feature_name TEXT, -- 'recording', 'notes', 'feedback', 'shortcuts', 'dashboard'
    feature_action TEXT, -- 'opened', 'used', 'completed', 'cancelled'
    feature_value TEXT, -- specific setting changed or value entered
    feature_context TEXT, -- additional context about feature usage
    
    -- ===== USER AGENT/ENVIRONMENT =====
    browser_name TEXT,
    browser_version TEXT,
    os_name TEXT,
    os_version TEXT,
    extension_version TEXT NOT NULL,
    screen_resolution TEXT,
    timezone TEXT,
    
    -- ===== BUSINESS INTELLIGENCE =====
    user_segment TEXT, -- 'new', 'returning', 'power_user', 'at_risk'
    user_journey_stage TEXT, -- 'onboarding', 'activation', 'retention', 'expansion'
    conversion_goal TEXT, -- what premium feature they're moving toward
    referral_source TEXT, -- how they discovered the extension
    
    -- ===== FLEXIBLE EVENT DATA =====
    event_data JSONB, -- for event-specific data that doesn't fit in structured columns
    user_preferences JSONB, -- snapshot of user settings at time of event
    widget_state JSONB, -- widget position, theme, etc.
    
    -- ===== TIMESTAMPS =====
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- when analytics were processed
    
    -- ===== CONSTRAINTS =====
    CONSTRAINT fk_unified_analytics_user_id 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- ===== INDEXES FOR ANALYTICS QUERIES =====

-- Core business intelligence indexes
CREATE INDEX IF NOT EXISTS idx_unified_analytics_user_created ON public.unified_analytics(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_analytics_session ON public.unified_analytics(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_unified_analytics_event_type ON public.unified_analytics(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_analytics_category ON public.unified_analytics(event_category, created_at DESC);

-- Business metrics indexes
CREATE INDEX IF NOT EXISTS idx_unified_analytics_language ON public.unified_analytics(language_detected, language_selected);
CREATE INDEX IF NOT EXISTS idx_unified_analytics_voice_type ON public.unified_analytics(voice_type, voice_name);
CREATE INDEX IF NOT EXISTS idx_unified_analytics_domain ON public.unified_analytics(page_domain, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_analytics_cost ON public.unified_analytics(cost_cents, is_cached);

-- Performance monitoring indexes
CREATE INDEX IF NOT EXISTS idx_unified_analytics_errors ON public.unified_analytics(error_code, created_at DESC) WHERE error_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_analytics_performance ON public.unified_analytics(response_time_ms, created_at DESC) WHERE response_time_ms IS NOT NULL;

-- Feature usage indexes
CREATE INDEX IF NOT EXISTS idx_unified_analytics_features ON public.unified_analytics(feature_name, feature_action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_analytics_journey ON public.unified_analytics(user_journey_stage, conversion_goal);

-- Time-based partitioning index for large scale
CREATE INDEX IF NOT EXISTS idx_unified_analytics_daily ON public.unified_analytics(DATE(created_at), event_category);

-- JSONB indexes for flexible queries
CREATE INDEX IF NOT EXISTS idx_unified_analytics_event_data ON public.unified_analytics USING GIN (event_data);
CREATE INDEX IF NOT EXISTS idx_unified_analytics_preferences ON public.unified_analytics USING GIN (user_preferences);

-- ===== ROW LEVEL SECURITY =====
ALTER TABLE public.unified_analytics ENABLE ROW LEVEL SECURITY;

-- Users can insert their own analytics
CREATE POLICY "Users can insert own analytics" ON public.unified_analytics
    FOR INSERT WITH CHECK (user_id = auth.uid() OR true); -- Allow anonymous users

-- Users can view their own analytics
CREATE POLICY "Users can view own analytics" ON public.unified_analytics
    FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'service_role');

-- Service role can view all for business intelligence
CREATE POLICY "Service role can view all analytics" ON public.unified_analytics
    FOR SELECT USING (auth.role() = 'service_role');

-- ===== PERMISSIONS =====
GRANT ALL ON public.unified_analytics TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ===== COMMENTS FOR DOCUMENTATION =====
COMMENT ON TABLE public.unified_analytics IS 'Unified analytics table for all NativeMimic user interactions, performance metrics, and business intelligence';
COMMENT ON COLUMN public.unified_analytics.event_category IS 'High-level categorization for analytics queries: lifecycle, interaction, speech, voice, feature, performance, error, business';
COMMENT ON COLUMN public.unified_analytics.cost_cents IS 'TTS API cost in cents (1 cent = $0.01) for financial tracking';
COMMENT ON COLUMN public.unified_analytics.session_duration_seconds IS 'Total session time when this event occurred, for engagement analysis';
COMMENT ON COLUMN public.unified_analytics.user_journey_stage IS 'Where user is in conversion funnel: onboarding, activation, retention, expansion';
COMMENT ON COLUMN public.unified_analytics.event_data IS 'Flexible JSONB for event-specific data that doesnt fit in structured columns';