-- Fix cost_cents column data type in speech_events table
-- Currently it's INTEGER but we need to store decimal values like 0.001232

-- Check current data type
SELECT column_name, data_type, numeric_precision, numeric_scale 
FROM information_schema.columns 
WHERE table_name = 'speech_events' 
AND column_name = 'cost_cents';

-- Option 1: Change to DECIMAL for precise currency calculations
-- This allows storing values like 0.001232 with full precision
ALTER TABLE public.speech_events 
ALTER COLUMN cost_cents TYPE DECIMAL(10,6);

-- Option 2: Alternative - use NUMERIC for maximum flexibility
-- ALTER TABLE public.speech_events 
-- ALTER COLUMN cost_cents TYPE NUMERIC(10,6);

-- Add comment explaining the precision
COMMENT ON COLUMN public.speech_events.cost_cents IS 'TTS cost in cents with 6 decimal places precision (e.g., 0.001232 cents)';

-- Verify the change
SELECT column_name, data_type, numeric_precision, numeric_scale 
FROM information_schema.columns 
WHERE table_name = 'speech_events' 
AND column_name = 'cost_cents';