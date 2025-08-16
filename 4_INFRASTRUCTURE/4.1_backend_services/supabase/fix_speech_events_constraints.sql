-- Fix speech_events table constraints to allow recording events
-- This fixes the "record_local" constraint violation error

-- Drop the existing constraint
ALTER TABLE public.speech_events DROP CONSTRAINT IF EXISTS speech_events_event_type_check;

-- Add updated constraint that includes recording events
ALTER TABLE public.speech_events ADD CONSTRAINT speech_events_event_type_check 
  CHECK (event_type IN (
    'play', 
    'pause', 
    'stop', 
    'speed_change', 
    'voice_change',
    'record_local',     -- New: Local recording without upload
    'record_upload',    -- New: Recording with consent to upload
    'text_selected',    -- New: Text selection analytics
    'widget_opened',    -- New: Widget display analytics
    'widget_closed'     -- New: Widget close analytics
  ));

-- Verify the constraint was updated
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'speech_events_event_type_check';