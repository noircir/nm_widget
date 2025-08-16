-- Create and configure storage bucket for audio recordings
-- This might be missing, causing audio upload failures

-- 1. Create the recordings bucket if it doesn't exist
-- Note: This needs to be run in Supabase dashboard Storage section or via CLI
-- You cannot create storage buckets via SQL, only via Supabase Dashboard or API

-- Instructions for Supabase Dashboard:
-- 1. Go to Storage in your Supabase dashboard
-- 2. Click "New Bucket" 
-- 3. Name: "recordings"
-- 4. Set as Public: false (private bucket)
-- 5. Configure RLS policies below

-- 2. After creating the bucket, set up RLS policies for the recordings bucket
-- These policies control who can upload/download recordings

-- Allow authenticated and anonymous users to upload recordings
-- (Adjust as needed for your security requirements)
CREATE POLICY "Anyone can upload recordings" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'recordings' AND 
  (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

-- Allow users to view their own recordings
CREATE POLICY "Users can view own recordings" ON storage.objects  
FOR SELECT USING (
  bucket_id = 'recordings' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own recordings  
CREATE POLICY "Users can update own recordings" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'recordings' AND 
  auth.uid()::text = (storage.foldername(name))[1] 
);

-- Allow users to delete their own recordings
CREATE POLICY "Users can delete own recordings" ON storage.objects
FOR DELETE USING (
  bucket_id = 'recordings' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Alternative: More permissive policy for MVP/testing (anonymous users)
-- Uncomment these if you want to allow anonymous users to upload recordings

-- DROP POLICY IF EXISTS "Anyone can upload recordings" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can view own recordings" ON storage.objects;

-- CREATE POLICY "Anonymous users can upload recordings" ON storage.objects
-- FOR INSERT WITH CHECK (bucket_id = 'recordings');

-- CREATE POLICY "Anyone can view recordings" ON storage.objects
-- FOR SELECT USING (bucket_id = 'recordings');

-- 4. Check if policies were created successfully
SELECT 
  schemaname,
  tablename, 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%recording%'
ORDER BY policyname;

-- 5. Verify bucket exists (this will show error if bucket doesn't exist)
SELECT 
  id,
  name,
  public,
  created_at,
  updated_at
FROM storage.buckets 
WHERE name = 'recordings';

-- MANUAL STEPS REQUIRED:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Create bucket named "recordings" 
-- 3. Set bucket to Private (not public)
-- 4. Run the RLS policies above
-- 5. Test audio upload from extension