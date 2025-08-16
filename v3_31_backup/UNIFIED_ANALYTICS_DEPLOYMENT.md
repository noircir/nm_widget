# Unified Analytics System Deployment Guide

## Overview
This guide deploys the new unified analytics system that replaces the fragmented `analytics` and `speech_events` tables with a single comprehensive `unified_analytics` table.

## ✅ Completed Steps

### 1. **Files Created**
- ✅ `supabase/create_unified_analytics_table.sql` - Complete table schema
- ✅ `mvp/unified-analytics-client.js` - JavaScript analytics client
- ✅ `mvp/manifest.json` - Updated to include new client
- ✅ `mvp/content.js` - Updated key analytics calls

### 2. **Code Changes Made**
- ✅ Text selection analytics → `trackTextSelected()`
- ✅ Speech playback analytics → `trackSpeechPlay()`
- ✅ Extension initialization → `trackExtensionLoaded()`
- ✅ Feedback submission → `trackFeedbackSubmitted()`
- ✅ Recording completion → `trackRecordingCompleted()`

## 🚀 Deployment Steps

### Step 1: Deploy Database Schema
Run this SQL in Supabase SQL Editor:
```bash
# Copy and paste the entire contents of:
supabase/create_unified_analytics_table.sql
```

**Expected Result**: 
- New `unified_analytics` table created
- All indexes and policies created
- Table ready to receive data

### Step 2: Test Extension Loading
```bash
# 1. Load extension in Chrome
# chrome://extensions/ → Developer mode → Load unpacked → select mvp/

# 2. Check browser console for:
# "UnifiedAnalyticsClient: Initialized with session sess_..."
# "UnifiedAnalyticsClient: Loaded and ready for comprehensive analytics collection"
```

### Step 3: Test Analytics Collection
```bash
# 1. Select text on any webpage
# 2. Check browser console for:
# "UnifiedAnalytics: Tracking interaction/text_selected"

# 3. Click Play button
# 4. Check console for:
# "UnifiedAnalytics: Tracking speech/speech_play"
```

### Step 4: Verify Database Data
Check Supabase Table Editor → `unified_analytics`:
```sql
-- Should see new records with populated columns:
SELECT 
  event_type,
  event_category,
  text_length,
  language_detected,
  voice_type,
  session_duration_seconds,
  page_domain,
  created_at
FROM unified_analytics 
ORDER BY created_at DESC 
LIMIT 10;
```

**Expected Result**: Rich data in all columns (no more NULL values)

## 🔧 Troubleshooting

### Issue 1: "nativeMimicUnifiedAnalytics is not defined"
**Cause**: Script loading order
**Fix**: Verify manifest.json has correct order:
```json
"js": [
  "supabase-client.js",
  "google-tts-client.js", 
  "unified-analytics-client.js",  // ← Must be before content.js
  "content.js"
]
```

### Issue 2: Empty analytics data
**Cause**: Table doesn't exist or permissions issue
**Fix**: 
1. Run the SQL schema creation script
2. Check Supabase logs for permission errors
3. Verify RLS policies allow anonymous users

### Issue 3: Console errors about missing functions
**Cause**: Old analytics calls not yet updated
**Solution**: Replace remaining calls:
```javascript
// OLD (don't use)
window.nativeMimicSupabase.trackAnalytics('event', data)
window.nativeMimicSupabase.trackInteraction('event', text, pos, settings)

// NEW (use these)
window.nativeMimicUnifiedAnalytics.trackSpeechPlay(text, voice, settings)
window.nativeMimicUnifiedAnalytics.trackButtonClicked(buttonName, context)
window.nativeMimicUnifiedAnalytics.trackFeatureUsed(featureName, action, value)
```

## 📊 Analytics Capabilities Unlocked

### Business Intelligence Queries
```sql
-- Daily active users
SELECT DATE(created_at) as date, COUNT(DISTINCT user_id) as dau
FROM unified_analytics 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- Popular languages by usage
SELECT language_detected, COUNT(*) as usage_count
FROM unified_analytics 
WHERE event_category = 'speech'
GROUP BY language_detected
ORDER BY usage_count DESC;

-- Voice preference patterns
SELECT voice_type, voice_name, COUNT(*) as selections
FROM unified_analytics 
WHERE event_type = 'voice_changed'
GROUP BY voice_type, voice_name
ORDER BY selections DESC;

-- Session engagement metrics
SELECT 
  AVG(session_duration_seconds) as avg_session_duration,
  AVG(events_in_session) as avg_events_per_session,
  AVG(texts_processed_in_session) as avg_texts_per_session
FROM unified_analytics
WHERE event_category = 'lifecycle' AND event_type = 'extension_loaded';

-- Error rate analysis
SELECT 
  error_code,
  COUNT(*) as error_count,
  COUNT(*) * 100.0 / (SELECT COUNT(*) FROM unified_analytics WHERE created_at >= NOW() - INTERVAL '7 days') as error_rate_percent
FROM unified_analytics 
WHERE event_category = 'error' 
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY error_code
ORDER BY error_count DESC;

-- Cost optimization insights
SELECT 
  voice_type,
  SUM(cost_cents) as total_cost_cents,
  AVG(cost_cents) as avg_cost_per_request,
  SUM(CASE WHEN is_cached = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as cache_hit_rate_percent
FROM unified_analytics 
WHERE cost_cents > 0
GROUP BY voice_type;
```

### Performance Monitoring
```sql
-- Voice loading performance
SELECT 
  voice_type,
  AVG(response_time_ms) as avg_loading_time,
  COUNT(*) as total_loads,
  SUM(CASE WHEN error_code IS NOT NULL THEN 1 ELSE 0 END) as failed_loads
FROM unified_analytics 
WHERE event_type LIKE '%voice_loading%'
GROUP BY voice_type;

-- Website performance patterns
SELECT 
  page_domain,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(session_duration_seconds) as avg_session_duration,
  COUNT(*) as total_interactions
FROM unified_analytics 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY page_domain
ORDER BY unique_users DESC
LIMIT 20;
```

## 🎯 Success Metrics

**✅ System is working correctly when you see:**

1. **Rich Data Collection**: All columns populated (no NULL fields)
2. **Session Tracking**: Real session durations (not 0)
3. **Event Sequencing**: events_in_session incrementing properly  
4. **Performance Data**: Response times and error tracking
5. **Business Context**: Page domains, languages, voice preferences
6. **User Journey**: Clear progression through features

**📈 Business Value Achieved:**
- Single source of truth for all analytics
- Real-time business intelligence capabilities
- Performance monitoring and optimization insights
- User behavior and conversion funnel analysis
- Cost tracking and optimization opportunities
- Error monitoring and reliability metrics

## 🔄 Migration Complete

The unified analytics system provides a complete replacement for the fragmented analytics approach, giving you comprehensive business intelligence capabilities in a single, well-structured table.

Next: Run the deployment steps and verify data collection is working correctly.