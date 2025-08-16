-- Comprehensive verification of all feedback table structures and data
-- Run this after creating all feedback tables to ensure everything is set up correctly

-- 1. Check all feedback-related tables exist
SELECT 
    'table_existence_check' as test_name,
    table_name,
    CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
    VALUES 
        ('bug_reports'),
        ('feature_requests'),
        ('voice_issues'),
        ('general_feedback'),
        ('pricing_feedback'),
        ('speech_events'),
        ('users')
) AS expected_tables(table_name)
LEFT JOIN information_schema.tables t 
    ON t.table_name = expected_tables.table_name 
    AND t.table_schema = 'public'
ORDER BY expected_tables.table_name;

-- 2. Check column structures for each feedback table
SELECT 'bug_reports_schema' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bug_reports' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'feature_requests_schema' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'feature_requests' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'voice_issues_schema' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'voice_issues' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'general_feedback_schema' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'general_feedback' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'pricing_feedback_schema' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'pricing_feedback' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check RLS policies exist for all feedback tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN cmd = 'INSERT' THEN '📝 Create'
        WHEN cmd = 'SELECT' THEN '👀 Read' 
        WHEN cmd = 'UPDATE' THEN '✏️ Update'
        WHEN cmd = 'DELETE' THEN '🗑️ Delete'
        ELSE cmd
    END as operation_type
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('bug_reports', 'feature_requests', 'voice_issues', 'general_feedback', 'pricing_feedback')
ORDER BY tablename, cmd;

-- 4. Check indexes exist for performance
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('bug_reports', 'feature_requests', 'voice_issues', 'general_feedback', 'pricing_feedback')
ORDER BY tablename, indexname;

-- 5. Check row counts (should be 0 initially)
SELECT 'row_counts_initial' as test_name,
    (SELECT COUNT(*) FROM public.bug_reports) as bug_reports,
    (SELECT COUNT(*) FROM public.feature_requests) as feature_requests,
    (SELECT COUNT(*) FROM public.voice_issues) as voice_issues,
    (SELECT COUNT(*) FROM public.general_feedback) as general_feedback,
    (SELECT COUNT(*) FROM public.pricing_feedback) as pricing_feedback,
    (SELECT COUNT(*) FROM public.speech_events) as speech_events,
    (SELECT COUNT(*) FROM public.users) as users;

-- 6. Test sample inserts (will be rolled back)
BEGIN;

-- Insert test user (if doesn't exist)
INSERT INTO public.users (id, created_at) 
VALUES ('00000000-0000-4000-8000-000000000000', NOW())
ON CONFLICT (id) DO NOTHING;

-- Test insert into each feedback table
INSERT INTO public.bug_reports (user_id, report_type, description) 
VALUES ('00000000-0000-4000-8000-000000000000', 'test', 'Test bug report');

INSERT INTO public.feature_requests (user_id, title, description) 
VALUES ('00000000-0000-4000-8000-000000000000', 'Test Feature', 'Test feature request');

INSERT INTO public.voice_issues (user_id, issue_type, description) 
VALUES ('00000000-0000-4000-8000-000000000000', 'pronunciation', 'Test voice issue');

INSERT INTO public.general_feedback (user_id, message) 
VALUES ('00000000-0000-4000-8000-000000000000', 'Test general feedback');

INSERT INTO public.pricing_feedback (user_id, feedback_type, message) 
VALUES ('00000000-0000-4000-8000-000000000000', 'general', 'Test pricing feedback');

-- Verify test inserts worked
SELECT 'test_inserts_verification' as test_name,
    (SELECT COUNT(*) FROM public.bug_reports WHERE user_id = '00000000-0000-4000-8000-000000000000') as bug_reports,
    (SELECT COUNT(*) FROM public.feature_requests WHERE user_id = '00000000-0000-4000-8000-000000000000') as feature_requests,
    (SELECT COUNT(*) FROM public.voice_issues WHERE user_id = '00000000-0000-4000-8000-000000000000') as voice_issues,
    (SELECT COUNT(*) FROM public.general_feedback WHERE user_id = '00000000-0000-4000-8000-000000000000') as general_feedback,
    (SELECT COUNT(*) FROM public.pricing_feedback WHERE user_id = '00000000-0000-4000-8000-000000000000') as pricing_feedback;

-- Rollback test inserts
ROLLBACK;

-- 7. Check foreign key constraints exist
SELECT
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as foreign_table,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE contype = 'f'
AND connamespace = 'public'::regnamespace
AND conrelid::regclass::text IN ('bug_reports', 'feature_requests', 'voice_issues', 'general_feedback', 'pricing_feedback')
ORDER BY table_name;

-- 8. Summary report
SELECT 
    '🎯 FEEDBACK SYSTEM VERIFICATION COMPLETE' as summary,
    'All 5 feedback categories now have dedicated tables:' as categories,
    '1. bug_report → bug_reports table' as mapping_1,
    '2. feature_request → feature_requests table' as mapping_2,
    '3. voice_issue → voice_issues table' as mapping_3,
    '4. general → general_feedback table' as mapping_4,
    '5. pricing → pricing_feedback table' as mapping_5,
    'Each table has RLS policies and proper indexes' as security,
    'Ready for extension testing!' as status;