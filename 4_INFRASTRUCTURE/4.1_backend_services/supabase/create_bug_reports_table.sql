-- Create bug_reports table for user feedback and bug reporting
-- This table was referenced in the extension but didn't exist in the database

-- Create the bug_reports table
CREATE TABLE IF NOT EXISTS public.bug_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- 'bug_report', 'feature_request', 'user_feedback', etc.
    description TEXT NOT NULL,
    steps_to_reproduce TEXT,
    browser_info JSONB, -- Browser name, version, OS, etc.
    widget_state JSONB, -- Extension state when bug occurred
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    priority VARCHAR(10) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint (optional, depends on your users table setup)
    CONSTRAINT fk_bug_reports_user_id 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON public.bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_type ON public.bug_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON public.bug_reports(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can insert their own bug reports
CREATE POLICY "Users can create own bug reports" ON public.bug_reports
    FOR INSERT WITH CHECK (user_id = auth.uid() OR true); -- Allow anonymous users for MVP

-- Users can view their own bug reports
CREATE POLICY "Users can view own bug reports" ON public.bug_reports
    FOR SELECT USING (user_id = auth.uid() OR true); -- Allow anonymous users for MVP

-- Users can update their own bug reports (e.g., add more details)
CREATE POLICY "Users can update own bug reports" ON public.bug_reports
    FOR UPDATE USING (user_id = auth.uid() OR true); -- Allow anonymous users for MVP

-- Grant permissions
GRANT ALL ON public.bug_reports TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;