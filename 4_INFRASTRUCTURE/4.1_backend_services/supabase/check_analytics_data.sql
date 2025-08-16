-- Analytics Data Verification Queries
-- Run these in your Supabase SQL editor to see what's actually being collected

-- 1. Check users table
SELECT 
    id, 
    created_at,
    updated_at
FROM public.users 
ORDER BY created_at DESC;

-- 2. Check analytics table - what events are being tracked
SELECT 
    id,
    user_id,
    event_type,
    event_data,
    page_url,
    session_duration,
    created_at
FROM public.analytics 
ORDER BY created_at DESC;

-- 3. Check speech_events table - should have play events with TTS costs
SELECT 
    id,
    user_id,
    session_id,
    event_type,
    text_content,
    text_length,
    voice_id,
    voice_type,
    language_code,
    speed_setting,
    website_url,
    website_domain,
    cost_cents,
    is_cached,
    created_at
FROM public.speech_events 
ORDER BY created_at DESC;

-- 4. Check recordings table - should have your 3 recordings
SELECT 
    id,
    user_id,
    audio_blob,
    audio_type,
    text_content,
    duration_ms,
    created_at
FROM public.recordings 
ORDER BY created_at DESC;

-- 5. Check notes table
SELECT 
    id,
    user_id,
    note_text,
    text_content,
    created_at
FROM public.notes 
ORDER BY created_at DESC;

-- 6. Summary counts by table
SELECT 'users' as table_name, COUNT(*) as row_count FROM public.users
UNION ALL
SELECT 'analytics' as table_name, COUNT(*) as row_count FROM public.analytics
UNION ALL  
SELECT 'speech_events' as table_name, COUNT(*) as row_count FROM public.speech_events
UNION ALL
SELECT 'recordings' as table_name, COUNT(*) as row_count FROM public.recordings
UNION ALL
SELECT 'notes' as table_name, COUNT(*) as row_count FROM public.notes;

-- 7. Check what event_types are in analytics vs speech_events
SELECT 'analytics' as source, event_type, COUNT(*) as count 
FROM public.analytics 
GROUP BY event_type
UNION ALL
SELECT 'speech_events' as source, event_type, COUNT(*) as count 
FROM public.speech_events 
GROUP BY event_type
ORDER BY source, event_type;