-- Complete Analytics Data Verification
-- Run this after testing to verify all analytics improvements are working

-- 1. Check speech_events table has complete data (after fixes)
SELECT 
    'speech_events_complete_data' as test_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN voice_id IS NOT NULL THEN 1 END) as rows_with_voice_id,
    COUNT(CASE WHEN voice_type IS NOT NULL THEN 1 END) as rows_with_voice_type,
    COUNT(CASE WHEN language_code IS NOT NULL THEN 1 END) as rows_with_language,
    COUNT(CASE WHEN speed_setting IS NOT NULL AND speed_setting != 1.0 THEN 1 END) as rows_with_speed_change,
    COUNT(CASE WHEN cost_cents IS NOT NULL AND cost_cents > 0 THEN 1 END) as rows_with_cost,
    COUNT(CASE WHEN is_cached IS NOT NULL THEN 1 END) as rows_with_cached_status,
    COUNT(CASE WHEN text_length IS NOT NULL AND text_length > 0 THEN 1 END) as rows_with_text_length
FROM public.speech_events;

-- 2. Show sample speech_events data to verify quality
SELECT 
    event_type,
    text_length,
    voice_id,
    voice_type, 
    language_code,
    speed_setting,
    cost_cents,
    is_cached,
    website_domain,
    created_at
FROM public.speech_events 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check recordings table has data (after column mapping fix)
SELECT 
    'recordings_data_check' as test_name,
    COUNT(*) as total_recordings,
    COUNT(CASE WHEN text IS NOT NULL AND length(text) > 0 THEN 1 END) as recordings_with_text,
    COUNT(CASE WHEN audio_url IS NOT NULL THEN 1 END) as recordings_with_audio_url,
    COUNT(CASE WHEN language IS NOT NULL THEN 1 END) as recordings_with_language
FROM public.recordings;

-- 4. Show sample recordings data
SELECT 
    text,
    audio_url,
    language,
    quality_score,
    created_at
FROM public.recordings 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Verify analytics table has meaningful event data  
SELECT 
    event_type,
    COUNT(*) as event_count,
    MIN(created_at) as first_event,
    MAX(created_at) as last_event
FROM public.analytics
GROUP BY event_type
ORDER BY event_count DESC;

-- 6. Check for cost tracking accuracy
SELECT 
    'cost_tracking_analysis' as test_name,
    AVG(cost_cents) as avg_cost_cents,
    MIN(cost_cents) as min_cost,
    MAX(cost_cents) as max_cost,
    COUNT(CASE WHEN is_cached = true THEN 1 END) as cached_requests,
    COUNT(CASE WHEN is_cached = false THEN 1 END) as new_requests,
    SUM(cost_cents) as total_cost_cents
FROM public.speech_events
WHERE cost_cents IS NOT NULL;

-- 7. Language detection verification
SELECT 
    'language_detection_check' as test_name,
    language_code,
    COUNT(*) as occurrences,
    COUNT(DISTINCT voice_id) as unique_voices_used
FROM public.speech_events
WHERE language_code IS NOT NULL
GROUP BY language_code
ORDER BY occurrences DESC;

-- 8. Voice usage analytics
SELECT 
    'voice_usage_analytics' as test_name,
    voice_type,
    COUNT(*) as usage_count,
    AVG(cost_cents) as avg_cost,
    COUNT(DISTINCT language_code) as languages_supported
FROM public.speech_events
WHERE voice_id IS NOT NULL
GROUP BY voice_type
ORDER BY usage_count DESC;

-- 9. Check for data completeness issues
SELECT 
    'data_completeness_issues' as test_name,
    COUNT(CASE WHEN voice_id IS NULL THEN 1 END) as missing_voice_id,
    COUNT(CASE WHEN voice_type IS NULL THEN 1 END) as missing_voice_type,
    COUNT(CASE WHEN language_code IS NULL THEN 1 END) as missing_language,
    COUNT(CASE WHEN speed_setting IS NULL THEN 1 END) as missing_speed,
    COUNT(CASE WHEN cost_cents IS NULL THEN 1 END) as missing_cost,
    COUNT(CASE WHEN text_length IS NULL OR text_length = 0 THEN 1 END) as missing_text_length
FROM public.speech_events;

-- 10. User activity summary
SELECT 
    u.id as user_id,
    u.created_at as user_created,
    COUNT(DISTINCT se.id) as speech_events,
    COUNT(DISTINCT r.id) as recordings,
    COUNT(DISTINCT a.id) as analytics_events,
    COUNT(DISTINCT n.id) as notes,
    SUM(se.cost_cents) as total_cost_cents
FROM public.users u
LEFT JOIN public.speech_events se ON u.id = se.user_id  
LEFT JOIN public.recordings r ON u.id = r.user_id
LEFT JOIN public.analytics a ON u.id = a.user_id
LEFT JOIN public.notes n ON u.id = n.user_id
GROUP BY u.id, u.created_at
ORDER BY speech_events DESC;