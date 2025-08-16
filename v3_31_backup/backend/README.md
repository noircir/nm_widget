# NativeMimic Backend - Google Cloud TTS Service

Backend service for NativeMimic Chrome extension providing Google Cloud Text-to-Speech integration.

## Setup

### 1. Google Cloud Setup

1. Create a Google Cloud Project
2. Enable the Cloud Text-to-Speech API
3. Create a service account with TTS permissions
4. Download the service account JSON key file

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Path to your Google Cloud service account key
GOOGLE_APPLICATION_CREDENTIALS=./path/to/your-service-account-key.json

# Server configuration
PORT=3000
NODE_ENV=production

# Allow your extension to access the API
ALLOWED_ORIGINS=chrome-extension://your-extension-id,https://yourdomain.com
```

### 3. Installation

```bash
npm install
```

### 4. Development

```bash
npm run dev
```

### 5. Production

```bash
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Service status

### Voice Management
- `GET /api/voices` - Get all available voices
- `GET /api/voices/:languageCode` - Get voices for specific language
- `GET /api/presets` - Get preset voices for quick selection

### Text-to-Speech
- `POST /api/synthesize` - Convert text to speech
  ```json
  {
    "text": "Hello world",
    "voiceId": "en-US-Neural2-F",
    "options": {
      "speakingRate": 1.0,
      "pitch": 0,
      "volumeGainDb": 0
    }
  }
  ```

## Cost Management

### Google Cloud TTS Pricing
- $16 per million characters
- Neural voices: highest quality
- WaveNet voices: high quality  
- Standard voices: basic quality

### Cost Optimization
- Extension caches audio for 24 hours
- Typical user: ~100k characters/month = $1.60 cost
- Heavy user: ~500k characters/month = $8 cost
- $7/month pricing provides healthy margins

## Deployment

### Local Development
```bash
npm run dev
```

### Production Deployment
1. Deploy to your preferred cloud platform (Heroku, Railway, DigitalOcean, etc.)
2. Set environment variables
3. Update extension's Google TTS client baseUrl to your deployed backend URL

### Rate Limiting
- 100 requests per 15 minutes per IP
- Configurable in server.js

## Security Features
- CORS protection
- Helmet security headers
- Rate limiting
- Input validation
- No API keys exposed to frontend

## Monitoring
- Health check endpoint for uptime monitoring
- Request logging
- Error tracking
- Cost tracking per request