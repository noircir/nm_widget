# 📋 Supabase Storage Setup Checklist

## Quick Setup Guide for NativeMimic Recordings Storage

### ✅ Manual Steps (Supabase Dashboard)
- [ ] Go to [Supabase Dashboard](https://supabase.com/dashboard) → Storage
- [ ] Click "New Bucket"
- [ ] Name: `recordings`
- [ ] Public: **❌ UNCHECK** (must be private)
- [ ] File size limit: `10 MB`
- [ ] MIME types: `audio/*`
- [ ] Click "Create bucket"

### ✅ SQL Steps (SQL Editor)
- [ ] Copy and paste `setup_storage_policies.sql` into Supabase SQL Editor
- [ ] Run the script
- [ ] Verify 4 RLS policies created
- [ ] Confirm bucket shows as private

### ✅ Testing Steps
- [ ] Load extension in Chrome
- [ ] Select text → Record voice → Check consent checkbox → Submit feedback
- [ ] Check browser console for "Audio upload result: success"
- [ ] Verify file appears in Dashboard → Storage → recordings → {user-id}/

### 🚨 Critical Security Settings
- ✅ Bucket MUST be Private (not public)
- ✅ RLS policies enforce user-owned data access
- ✅ Only explicit consent uploads (no automatic saves)
- ✅ User can only access their own recordings

**Time Required**: 5-10 minutes
**Prerequisites**: Existing Supabase project with NativeMimic tables