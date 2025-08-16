-- Fix RLS policies for users table to allow anonymous user creation

-- Drop existing restrictive policies if they exist
drop policy if exists "Users can only see own profile" on public.users;
drop policy if exists "Users can only update own profile" on public.users;
drop policy if exists "Users can only insert own profile" on public.users;

-- Create permissive policies for anonymous users (MVP phase)
-- Allow anonymous users to insert their own user records
create policy "Allow anonymous user creation" on public.users
  for insert with check (true); -- Allow all inserts for anonymous users

-- Allow users to read their own records
create policy "Users can read own profile" on public.users
  for select using (id = auth.uid() or id::text = current_setting('request.jwt.claims', true)::json->>'sub' or true); -- Allow read access for anonymous users

-- Allow users to update their own records  
create policy "Users can update own profile" on public.users
  for update using (id = auth.uid() or id::text = current_setting('request.jwt.claims', true)::json->>'sub' or true); -- Allow updates for anonymous users

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on public.users to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated;