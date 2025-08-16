# NativeMimic Supabase Edge Functions

This directory contains Edge Functions that replace the localhost:3000 server for production.

## Setup

### 1. Install Supabase CLI
```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Login to Supabase
supabase login
```

### 2. Link to Your Project
```bash
# From the root directory
supabase link --project-ref YOUR_PROJECT_ID

# Get your project ID from: https://app.supabase.com/project/YOUR_PROJECT/settings/general
```

### 3. Set Environment Variables
```bash
# Set your Google Cloud API key
supabase secrets set GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key_here

# Get your Google Cloud API key from:
# https://console.cloud.google.com/apis/credentials
```

### 4. Deploy the Function
```bash
# Deploy the google-tts function
supabase functions deploy google-tts

# The function will be available at:
# https://YOUR_PROJECT_ID.supabase.co/functions/v1/google-tts
```

## Testing

### Test Health Check
```bash
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/google-tts/health
```

### Test TTS Synthesis
```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/google-tts/api/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test",
    "voiceId": "en-US-Neural2-A",
    "options": {
      "speakingRate": 1.0,
      "pitch": 0,
      "volumeGainDb": 0
    }
  }'
```

## Integration

After deployment, update your extension configuration:

1. **Get your function URL**: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/google-tts`

2. **Update extension configuration**:
   ```javascript
   // In content.js NATIVEMIMIC_CONFIG
   GOOGLE_TTS_SERVER_URL: 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/google-tts'
   ```

3. **Test the extension** - premium voices should work without localhost!

## Cost Analysis

With Supabase Edge Functions:
- **500K function calls/month**: FREE
- **Additional calls**: $2 per million
- **Typical user**: ~7 calls/month (well within free tier)
- **Cost per user**: ~$0.01/month

## Function Endpoints

- `GET /health` - Health check
- `GET /api/presets` - Get preset voices
- `GET /api/voices` - Get available voices  
- `POST /api/synthesize` - Convert text to speech

## Security

- **CORS enabled** for browser extension access
- **Google API key** stored securely in Supabase secrets
- **No API keys exposed** to frontend
- **Rate limiting** handled by Supabase platform