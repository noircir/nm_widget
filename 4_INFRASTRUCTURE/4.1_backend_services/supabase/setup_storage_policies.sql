-- Supabase Storage RLS Policies for NativeMimic Recordings
-- Run AFTER creating "recordings" bucket manually in Dashboard

-- 🔒 PRIVACY-FIRST RECORDING SYSTEM
-- These policies enable user consent-based recording uploads
-- with strict privacy controls and user-owned data access

-- 1. Allow anonymous and authenticated users to upload recordings
-- (Required for MVP with anonymous users + future authentication)
CREATE POLICY "Users can upload recordings" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'recordings' AND 
  (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

-- 2. Allow users to view their own recordings only
-- Uses folder structure: recordings/{user_id}/filename.webm
CREATE POLICY "Users can view own recordings" ON storage.objects  
FOR SELECT USING (
  bucket_id = 'recordings' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Allow users to update their own recordings metadata
CREATE POLICY "Users can update own recordings" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'recordings' AND 
  auth.uid()::text = (storage.foldername(name))[1] 
);

-- 4. Allow users to delete their own recordings
CREATE POLICY "Users can delete own recordings" ON storage.objects
FOR DELETE USING (
  bucket_id = 'recordings' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 🧪 VERIFICATION QUERIES

-- Check bucket exists and is configured correctly
SELECT 
  id,
  name,
  public as is_public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE name = 'recordings';

-- Verify all RLS policies were created
SELECT 
  policyname,
  cmd as operation,
  roles,
  qual as condition
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%recording%'
ORDER BY cmd, policyname;

-- Check initial state (should be empty)
SELECT 
  name, 
  size, 
  metadata,
  created_at 
FROM storage.objects 
WHERE bucket_id = 'recordings' 
LIMIT 5;

-- 📊 EXPECTED RESULTS:
-- 1. Bucket "recordings" exists with public=false
-- 2. 4 RLS policies created (INSERT, SELECT, UPDATE, DELETE)
-- 3. Objects table initially empty
-- 4. No errors in policy creation

-- ✅ SUCCESS INDICATORS:
-- - Bucket query returns 1 row with name='recordings', public=false
-- - Policies query returns 4 rows (one for each operation)
-- - Objects query returns 0 rows initially
-- - Extension console shows "Audio upload result: success" after testing