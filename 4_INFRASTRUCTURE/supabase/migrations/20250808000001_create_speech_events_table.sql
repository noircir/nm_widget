-- Create speech_events table for tracking TTS usage
create table if not exists public.speech_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  session_id text not null,
  event_type text not null check (event_type in ('play', 'pause', 'stop', 'speed_change', 'voice_change')),
  text_content text,
  text_length integer,
  voice_id text,
  voice_type text check (voice_type in ('system', 'google-tts')),
  language_code text,
  speed_setting real default 1.0,
  website_url text,
  website_domain text,
  cost_cents integer default 0,
  is_cached boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better performance
create index if not exists speech_events_user_id_idx on public.speech_events(user_id);
create index if not exists speech_events_created_at_idx on public.speech_events(created_at);
create index if not exists speech_events_event_type_idx on public.speech_events(event_type);
create index if not exists speech_events_session_id_idx on public.speech_events(session_id);

-- Enable RLS (Row Level Security)
alter table public.speech_events enable row level security;

-- Create RLS policies for speech_events
-- Allow anonymous users to insert their own events
create policy "Users can insert their own speech events" on public.speech_events
  for insert with check (true); -- Allow all inserts for now (anonymous users)

-- Allow users to read their own speech events  
create policy "Users can view their own speech events" on public.speech_events
  for select using (user_id = auth.uid() or user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- Allow service role to read all (for analytics)
create policy "Service role can view all speech events" on public.speech_events
  for select using (auth.role() = 'service_role');

-- Grant permissions
grant usage on schema public to anon, authenticated;
grant all on public.speech_events to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated;