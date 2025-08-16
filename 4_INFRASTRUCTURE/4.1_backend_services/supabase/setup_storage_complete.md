# Supabase Storage Setup Guide for NativeMimic v3.30

## 🎯 Overview
This guide creates the `recordings` storage bucket needed for the privacy-first recording system with explicit user consent.

## 📋 Manual Steps Required (Dashboard)

### Step 1: Create Storage Bucket

1. **Open Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your NativeMimic project

2. **Navigate to Storage**
   - Click "Storage" in the left sidebar
   - Click "New Bucket" button

3. **Configure Bucket**
   - **Bucket Name**: `recordings`
   - **Public Bucket**: ❌ **UNCHECK** (Private bucket for user privacy)
   - **File size limit**: `10 MB` (reasonable for short voice recordings)
   - **Allowed MIME types**: `audio/*` (all audio formats)
   - Click "Create bucket"

4. **Verify Bucket Creation**
   - You should see "recordings" bucket in the Storage section
   - Status should show as "Private"

## 🔒 SQL Policies (Run After Bucket Creation)

After creating the bucket manually, run these SQL commands in the Supabase SQL Editor:

### Step 2: Set Up RLS Policies

```sql
-- Allow anonymous and authenticated users to upload recordings
-- (Required for privacy-first consent system)
CREATE POLICY "Users can upload recordings" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'recordings' AND 
  (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

-- Allow users to view their own recordings only
-- Uses folder structure: user_id/filename.webm
CREATE POLICY "Users can view own recordings" ON storage.objects  
FOR SELECT USING (
  bucket_id = 'recordings' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own recordings metadata
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
```

### Step 3: Verification Queries

```sql
-- 1. Verify bucket exists
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE name = 'recordings';

-- 2. Check RLS policies were created
SELECT 
  schemaname,
  tablename, 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%recording%'
ORDER BY policyname;

-- 3. Test bucket permissions (should return empty initially)
SELECT name, size, created_at 
FROM storage.objects 
WHERE bucket_id = 'recordings' 
LIMIT 5;
```

## 🔧 Extension Integration

The extension is already configured to use this storage bucket:

### Upload Path Structure
```
recordings/
  ├── {user_id}/
      ├── recording_20250109_143052.webm
      ├── recording_20250109_143127.webm
      └── ...
```

### Privacy Features
- ✅ **Local-first**: Recordings stored locally by default
- ✅ **Explicit consent**: Upload only with user permission
- ✅ **User-owned folders**: Each user can only access their own recordings
- ✅ **Automatic cleanup**: Old recordings can be programmatically removed

## 🧪 Testing the Storage System

### Test 1: Manual Upload Test
1. Load extension in Chrome
2. Select text and click Record
3. Grant microphone permission
4. Record 2-3 seconds of audio
5. Open feedback modal and select "Bug Report" or "Voice Issue"
6. Check consent checkbox: "Include my voice recording to help debug this issue"
7. Submit feedback

### Test 2: Verify Upload in Dashboard
1. Go to Supabase Dashboard > Storage > recordings
2. Look for folder with your user ID
3. Should see .webm file uploaded
4. File should be private (not publicly accessible)

### Test 3: Console Verification
Check browser console for successful upload logs:
```
NativeMimic: Audio upload result: success
NativeMimic: Recording saved with audio URL: [storage-url]
```

## ⚠️ Important Privacy Notes

1. **GDPR Compliance**: Voice recordings are considered biometric data
2. **User Consent**: Only upload with explicit checkbox consent
3. **Data Retention**: Consider automatic deletion after 30-90 days
4. **Access Control**: Users can only access their own recordings
5. **Transparency**: Users should know exactly how their voice data is used

## 🚨 Troubleshooting

### Common Issues:

**"Bucket does not exist" Error**
- Ensure you created the bucket named exactly `recordings`
- Check bucket is in the correct Supabase project

**"Permission denied" Upload Error**
- Run the RLS policy SQL commands above
- Verify policies exist with verification queries

**"CORS error" During Upload**
- This is normal - Supabase storage handles CORS automatically
- Check if upload succeeded despite console warnings

**Empty Recordings in Database**
- Audio upload failure doesn't prevent metadata storage
- Check `recordings` table for entries even if `audio_url` is null

## 📊 Expected Results

After successful setup:
- ✅ Storage bucket "recordings" exists and is private
- ✅ RLS policies allow user-specific uploads
- ✅ Extension can upload audio files with consent
- ✅ Privacy-first system respects user choice
- ✅ All voice data remains under user control

This completes the storage infrastructure for NativeMimic v3.30's privacy-first recording system.