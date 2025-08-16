-- Check actual table schemas to see column mismatches

-- Check recordings table schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'recordings' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check notes table schema  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notes'
AND table_schema = 'public' 
ORDER BY ordinal_position;

-- Check speech_events table schema (should exist)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'speech_events'
AND table_schema = 'public'
ORDER BY ordinal_position;