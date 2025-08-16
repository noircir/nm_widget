-- Create all feedback tables for NativeMimic extension
-- Based on code analysis: bug_report uses bug_reports table, others use speech_events

-- 1. ALREADY CREATED: bug_reports table for bug_report category
-- This handles: bug_report (🐛 Bug Report)
-- Uses: saveBugReport() -> bug_reports table

-- 2. The speech_events table ALREADY EXISTS and handles the other 4 categories:
-- - feature_request (✨ Feature Request)
-- - voice_issue (🎤 Voice/Pronunciation Issue)  
-- - general (💬 General Feedback)
-- - pricing (💰 Pricing Feedback)
-- These use: trackInteraction('feedback', message, {type: category}) -> speech_events table

-- However, we should create dedicated tables for better organization and analytics

-- Create feature_requests table
CREATE TABLE IF NOT EXISTS public.feature_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(200),
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    status VARCHAR(20) DEFAULT 'submitted', -- 'submitted', 'reviewing', 'planned', 'in_progress', 'completed', 'rejected'
    votes_count INTEGER DEFAULT 0,
    category VARCHAR(50), -- 'ui', 'voice', 'performance', 'integration', etc.
    estimated_effort VARCHAR(20), -- 'small', 'medium', 'large'
    target_version VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_feature_requests_user_id 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create voice_issues table for pronunciation and voice problems
CREATE TABLE IF NOT EXISTS public.voice_issues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    issue_type VARCHAR(50) NOT NULL, -- 'pronunciation', 'voice_quality', 'accent', 'speed', 'volume'
    text_content TEXT, -- The text that has the issue
    expected_pronunciation TEXT,
    actual_pronunciation TEXT,
    voice_id VARCHAR(100), -- Which voice was used
    voice_type VARCHAR(50), -- 'google-tts', 'system', 'elevenlabs'
    language_code VARCHAR(10),
    audio_url TEXT, -- Recording of the issue if provided
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(20) DEFAULT 'reported', -- 'reported', 'verified', 'fixing', 'fixed', 'wont_fix'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_voice_issues_user_id 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create general_feedback table
CREATE TABLE IF NOT EXISTS public.general_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    feedback_type VARCHAR(50) DEFAULT 'general', -- 'usability', 'design', 'performance', 'content', 'general'
    rating INTEGER, -- 1-5 star rating (optional)
    message TEXT NOT NULL,
    page_url TEXT, -- Where the feedback was given
    user_agent TEXT,
    widget_state JSONB, -- Extension state when feedback was given
    tags TEXT[], -- Tags for categorization
    is_anonymous BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_general_feedback_user_id 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create pricing_feedback table
CREATE TABLE IF NOT EXISTS public.pricing_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    feedback_type VARCHAR(50) NOT NULL, -- 'too_expensive', 'reasonable', 'cheap', 'willing_to_pay', 'pricing_model'
    current_price_perception VARCHAR(20), -- 'too_high', 'fair', 'low'
    suggested_price_monthly DECIMAL(6,2), -- User's suggested monthly price
    suggested_price_yearly DECIMAL(7,2), -- User's suggested yearly price
    would_pay BOOLEAN, -- Would they pay for premium features?
    payment_frequency_preference VARCHAR(20), -- 'monthly', 'yearly', 'lifetime', 'pay_per_use'
    most_valuable_features TEXT[], -- Which features justify the price
    deal_breakers TEXT[], -- What would make them not pay
    competitor_comparison TEXT, -- How does pricing compare to alternatives
    message TEXT, -- Additional feedback
    user_segment VARCHAR(50), -- 'student', 'professional', 'business', 'casual'
    usage_frequency VARCHAR(20), -- 'daily', 'weekly', 'monthly', 'rarely'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_pricing_feedback_user_id 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feature_requests_user_id ON public.feature_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON public.feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_category ON public.feature_requests(category);
CREATE INDEX IF NOT EXISTS idx_feature_requests_created_at ON public.feature_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_voice_issues_user_id ON public.voice_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_issues_issue_type ON public.voice_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_voice_issues_voice_type ON public.voice_issues(voice_type);
CREATE INDEX IF NOT EXISTS idx_voice_issues_language ON public.voice_issues(language_code);
CREATE INDEX IF NOT EXISTS idx_voice_issues_status ON public.voice_issues(status);

CREATE INDEX IF NOT EXISTS idx_general_feedback_user_id ON public.general_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_general_feedback_type ON public.general_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_general_feedback_created_at ON public.general_feedback(created_at);

CREATE INDEX IF NOT EXISTS idx_pricing_feedback_user_id ON public.pricing_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_feedback_type ON public.pricing_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_pricing_feedback_would_pay ON public.pricing_feedback(would_pay);
CREATE INDEX IF NOT EXISTS idx_pricing_feedback_created_at ON public.pricing_feedback(created_at);

-- Enable RLS on all tables
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for feature_requests
CREATE POLICY "Users can create feature requests" ON public.feature_requests
    FOR INSERT WITH CHECK (user_id = auth.uid() OR true); -- Allow anonymous users

CREATE POLICY "Users can view feature requests" ON public.feature_requests
    FOR SELECT USING (true); -- Public visibility for voting/prioritization

CREATE POLICY "Users can update own feature requests" ON public.feature_requests
    FOR UPDATE USING (user_id = auth.uid() OR true);

-- Create RLS policies for voice_issues  
CREATE POLICY "Users can create voice issues" ON public.voice_issues
    FOR INSERT WITH CHECK (user_id = auth.uid() OR true);

CREATE POLICY "Users can view own voice issues" ON public.voice_issues
    FOR SELECT USING (user_id = auth.uid() OR true);

CREATE POLICY "Users can update own voice issues" ON public.voice_issues
    FOR UPDATE USING (user_id = auth.uid() OR true);

-- Create RLS policies for general_feedback
CREATE POLICY "Users can create general feedback" ON public.general_feedback
    FOR INSERT WITH CHECK (user_id = auth.uid() OR true);

CREATE POLICY "Users can view own general feedback" ON public.general_feedback
    FOR SELECT USING (user_id = auth.uid() OR true);

-- Create RLS policies for pricing_feedback
CREATE POLICY "Users can create pricing feedback" ON public.pricing_feedback
    FOR INSERT WITH CHECK (user_id = auth.uid() OR true);

CREATE POLICY "Users can view own pricing feedback" ON public.pricing_feedback
    FOR SELECT USING (user_id = auth.uid() OR true);

-- Grant permissions
GRANT ALL ON public.feature_requests TO anon, authenticated, service_role;
GRANT ALL ON public.voice_issues TO anon, authenticated, service_role;
GRANT ALL ON public.general_feedback TO anon, authenticated, service_role;
GRANT ALL ON public.pricing_feedback TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.feature_requests IS 'User feature requests and enhancement suggestions';
COMMENT ON TABLE public.voice_issues IS 'Voice quality and pronunciation issue reports';
COMMENT ON TABLE public.general_feedback IS 'General user feedback and usability comments';
COMMENT ON TABLE public.pricing_feedback IS 'User feedback on pricing strategy and willingness to pay';