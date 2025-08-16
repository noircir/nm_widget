const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const textToSpeech = require('@google-cloud/text-to-speech');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Google Cloud TTS client
const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get available voices for a language
app.get('/api/voices/:languageCode?', async (req, res) => {
  try {
    const { languageCode } = req.params;
    
    // Fetch ALL voices from Google Cloud TTS
    const [voices] = await ttsClient.listVoices({});

    let filteredVoices = voices.voices;
    
    // Filter by language if specified (include all variants)
    if (languageCode) {
      filteredVoices = voices.voices.filter(voice => 
        voice.languageCodes.some(code => 
          code.startsWith(languageCode.substring(0, 2)) // Match 'fr' with 'fr-FR', 'fr-CA', etc.
        )
      );
    }

    // Format voices for our extension
    const formattedVoices = filteredVoices.map(voice => ({
      id: voice.name,
      name: formatVoiceName(voice),
      language: voice.languageCodes[0],
      gender: voice.ssmlGender,
      type: 'google-tts',
      description: `${voice.ssmlGender} • ${getVoiceQuality(voice.name)}`
    }));

    // Sort voices: European variants first, then regional variants
    if (languageCode) {
      formattedVoices.sort((a, b) => {
        // Prioritize main language variants (fr-FR over fr-CA)
        const mainLangCode = `${languageCode}-${languageCode.toUpperCase()}`;
        const aIsMain = a.language === mainLangCode;
        const bIsMain = b.language === mainLangCode;
        
        if (aIsMain && !bIsMain) return -1;
        if (!aIsMain && bIsMain) return 1;
        
        return a.name.localeCompare(b.name);
      });
    }

    res.json({
      success: true,
      voices: formattedVoices,
      count: formattedVoices.length
    });
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voices'
    });
  }
});

// Synthesize text to speech
app.post('/api/synthesize', async (req, res) => {
  try {
    const { text, voiceId, options = {} } = req.body;

    // Validate input
    if (!text || text.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be less than 5000 characters'
      });
    }

    if (!voiceId) {
      return res.status(400).json({
        success: false,
        error: 'Voice ID is required'
      });
    }

    // Extract language code from voice ID
    const languageCode = getLanguageFromVoiceId(voiceId);

    // Prepare synthesis request
    const request = {
      input: { text },
      voice: {
        name: voiceId,
        languageCode: languageCode
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: Math.max(0.25, Math.min(4.0, options.speakingRate || 1.0)),
        pitch: Math.max(-20.0, Math.min(20.0, options.pitch || 0)),
        volumeGainDb: Math.max(-96.0, Math.min(16.0, options.volumeGainDb || 0))
      }
    };

    // Synthesize speech
    const [response] = await ttsClient.synthesizeSpeech(request);

    // Calculate cost for tracking
    const characterCount = text.length;
    const cost = (characterCount / 1000000) * 16; // $16 per million characters

    // Return audio as base64
    res.json({
      success: true,
      audioContent: response.audioContent.toString('base64'),
      cost: cost,
      characterCount: characterCount,
      voiceId: voiceId
    });

  } catch (error) {
    console.error('Error synthesizing speech:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to synthesize speech'
    });
  }
});

// Get preset voices for quick selection
app.get('/api/presets', (req, res) => {
  const presets = {
    'en-US-Neural2-F': { name: 'Emma (US English)', id: 'en-US-Neural2-F', language: 'en-US', gender: 'FEMALE' },
    'en-US-Neural2-D': { name: 'James (US English)', id: 'en-US-Neural2-D', language: 'en-US', gender: 'MALE' },
    'en-GB-Neural2-A': { name: 'Sophie (British English)', id: 'en-GB-Neural2-A', language: 'en-GB', gender: 'FEMALE' },
    'en-GB-Neural2-D': { name: 'Oliver (British English)', id: 'en-GB-Neural2-D', language: 'en-GB', gender: 'MALE' },
    'es-ES-Neural2-A': { name: 'Carmen (Spanish)', id: 'es-ES-Neural2-A', language: 'es-ES', gender: 'FEMALE' },
    'es-ES-Neural2-B': { name: 'Diego (Spanish)', id: 'es-ES-Neural2-B', language: 'es-ES', gender: 'MALE' },
    'fr-FR-Neural2-A': { name: 'Charlotte (French)', id: 'fr-FR-Neural2-A', language: 'fr-FR', gender: 'FEMALE' },
    'fr-FR-Neural2-B': { name: 'Antoine (French)', id: 'fr-FR-Neural2-B', language: 'fr-FR', gender: 'MALE' },
    'de-DE-Neural2-A': { name: 'Anna (German)', id: 'de-DE-Neural2-A', language: 'de-DE', gender: 'FEMALE' },
    'de-DE-Neural2-D': { name: 'Klaus (German)', id: 'de-DE-Neural2-D', language: 'de-DE', gender: 'MALE' },
    'it-IT-Neural2-A': { name: 'Isabella (Italian)', id: 'it-IT-Neural2-A', language: 'it-IT', gender: 'FEMALE' },
    'it-IT-Neural2-C': { name: 'Marco (Italian)', id: 'it-IT-Neural2-C', language: 'it-IT', gender: 'MALE' },
    'pt-BR-Neural2-A': { name: 'Ana (Portuguese)', id: 'pt-BR-Neural2-A', language: 'pt-BR', gender: 'FEMALE' },
    'pt-BR-Neural2-C': { name: 'Carlos (Portuguese)', id: 'pt-BR-Neural2-C', language: 'pt-BR', gender: 'MALE' },
    'ja-JP-Neural2-B': { name: 'Yuki (Japanese)', id: 'ja-JP-Neural2-B', language: 'ja-JP', gender: 'FEMALE' },
    'ja-JP-Neural2-C': { name: 'Hiroshi (Japanese)', id: 'ja-JP-Neural2-C', language: 'ja-JP', gender: 'MALE' },
    'ko-KR-Neural2-A': { name: 'Min-ji (Korean)', id: 'ko-KR-Neural2-A', language: 'ko-KR', gender: 'FEMALE' },
    'ko-KR-Neural2-C': { name: 'Jin-woo (Korean)', id: 'ko-KR-Neural2-C', language: 'ko-KR', gender: 'MALE' }
  };

  res.json({
    success: true,
    presets: presets
  });
});

// Utility functions
function formatVoiceName(voice) {
  // Create better voice names with gender and personality
  const voiceMap = {
    // French voices
    'fr-CA-Chirp-HD-A': 'Sophie (Canadian French, Female)',
    'fr-CA-Chirp-HD-B': 'Antoine (Canadian French, Male)', 
    'fr-CA-Chirp-HD-C': 'Marie (Canadian French, Female)',
    'fr-CA-Chirp-HD-D': 'Pierre (Canadian French, Male)',
    'fr-CA-Chirp-HD-E': 'Claire (Canadian French, Female)',
    'fr-CA-Chirp-HD-F': 'Jean (Canadian French, Male)',
    'fr-CA-Chirp-HD-G': 'Isabelle (Canadian French, Female)',
    'fr-CA-Chirp-HD-H': 'Marc (Canadian French, Male)',
    'fr-CA-Chirp-HD-I': 'Camille (Canadian French, Female)',
    'fr-CA-Chirp-HD-J': 'David (Canadian French, Male)',
    'fr-CA-Chirp-HD-K': 'Élise (Canadian French, Female)',
    'fr-CA-Chirp-HD-L': 'François (Canadian French, Male)',
    'fr-CA-Chirp-HD-M': 'Amélie (Canadian French, Female)',
    'fr-CA-Chirp-HD-N': 'Gabriel (Canadian French, Male)',
    'fr-CA-Chirp-HD-O': 'Céline (Canadian French, Female)',
    
    'fr-FR-Chirp-HD-A': 'Charlotte (French, Female)',
    'fr-FR-Chirp-HD-B': 'Laurent (French, Male)',
    'fr-FR-Chirp-HD-C': 'Juliette (French, Female)', 
    'fr-FR-Chirp-HD-D': 'Olivier (French, Male)',
    'fr-FR-Chirp-HD-E': 'Brigitte (French, Female)',
    'fr-FR-Chirp-HD-F': 'Philippe (French, Male)',
    
    'fr-FR-Chirp3-HD-Archernar': 'Archernar (French, Male)',
    'fr-FR-Chirp3-HD-Achird': 'Achird (French, Female)',
    'fr-FR-Chirp3-HD-Algieb': 'Algieb (French, Male)',
    'fr-FR-Chirp3-HD-Albireo': 'Albireo (French, Female)',
    
    // English voices
    'en-US-Chirp-HD-A': 'Emma (American, Female)',
    'en-US-Chirp-HD-B': 'James (American, Male)',
    'en-US-Chirp-HD-C': 'Sarah (American, Female)',
    'en-US-Chirp-HD-D': 'Michael (American, Male)',
    'en-US-Chirp-HD-E': 'Emily (American, Female)',
    'en-US-Chirp-HD-F': 'David (American, Male)',
    
    'en-GB-Chirp-HD-A': 'Sophie (British, Female)',
    'en-GB-Chirp-HD-B': 'Oliver (British, Male)',
    'en-GB-Chirp-HD-C': 'Isabella (British, Female)',
    'en-GB-Chirp-HD-D': 'Henry (British, Male)',
    
    // Spanish voices
    'es-ES-Chirp-HD-A': 'Carmen (Spanish, Female)',
    'es-ES-Chirp-HD-B': 'Diego (Spanish, Male)',
    'es-MX-Chirp-HD-A': 'Sofía (Mexican, Female)',
    'es-MX-Chirp-HD-B': 'Carlos (Mexican, Male)',
    
    // German voices
    'de-DE-Chirp-HD-A': 'Anna (German, Female)',
    'de-DE-Chirp-HD-B': 'Klaus (German, Male)',
    
    // Chinese voices  
    'zh-CN-Chirp-HD-A': 'Li Wei (Mandarin, Female)',
    'zh-CN-Chirp-HD-B': 'Wang Ming (Mandarin, Male)',
    'zh-CN-Chirp-HD-C': 'Zhang Mei (Mandarin, Female)',
    'zh-CN-Chirp-HD-D': 'Liu Gang (Mandarin, Male)',
    
    // Japanese voices
    'ja-JP-Chirp-HD-A': 'Yuki (Japanese, Female)',
    'ja-JP-Chirp-HD-B': 'Hiroshi (Japanese, Male)',
    
    // Italian voices
    'it-IT-Chirp-HD-A': 'Isabella (Italian, Female)',
    'it-IT-Chirp-HD-B': 'Marco (Italian, Male)',
    
    // Portuguese voices
    'pt-BR-Chirp-HD-A': 'Ana (Brazilian, Female)',
    'pt-BR-Chirp-HD-B': 'Carlos (Brazilian, Male)',
    
    // Korean voices
    'ko-KR-Chirp-HD-A': 'Min-ji (Korean, Female)',
    'ko-KR-Chirp-HD-B': 'Jin-woo (Korean, Male)',
    
    // Chirp3 voices (newer generation)
    'fr-CA-Chirp3-HD-Archernar': 'Archernar (Canadian French, Male)',
    'fr-CA-Chirp3-HD-Achird': 'Achird (Canadian French, Female)',
    'fr-CA-Chirp3-HD-Algieb': 'Algieb (Canadian French, Male)',
    'fr-CA-Chirp3-HD-Albireo': 'Albireo (Canadian French, Female)',
    'fr-CA-Chirp3-HD-Algol': 'Algol (Canadian French, Male)',
    'fr-CA-Chirp3-HD-Altair': 'Altair (Canadian French, Female)',
    
    'en-US-Chirp3-HD-Archernar': 'Archernar (American, Male)',
    'en-US-Chirp3-HD-Achird': 'Achird (American, Female)',
    'en-US-Chirp3-HD-Algieb': 'Algieb (American, Male)',
    'en-US-Chirp3-HD-Albireo': 'Albireo (American, Female)',
    
    'es-ES-Chirp3-HD-Archernar': 'Archernar (Spanish, Male)',
    'es-ES-Chirp3-HD-Achird': 'Achird (Spanish, Female)',
    
    'zh-CN-Chirp3-HD-Archernar': 'Archernar (Mandarin, Male)',
    'zh-CN-Chirp3-HD-Achird': 'Achird (Mandarin, Female)',
    'zh-CN-Chirp3-HD-Algieb': 'Algieb (Mandarin, Male)',
    'zh-CN-Chirp3-HD-Albireo': 'Albireo (Mandarin, Female)'
  };

  // Return mapped name or create fallback name
  if (voiceMap[voice.name]) {
    return voiceMap[voice.name];
  }
  
  // Create fallback name for unmapped voices
  const parts = voice.name.split('-');
  if (parts.length >= 3) {
    const lang = parts[0] + '-' + parts[1];
    const voiceId = parts[parts.length - 1];
    const gender = voice.ssmlGender === 'FEMALE' ? 'Female' : 'Male';
    
    const langNames = {
      'fr-CA': 'Canadian French',
      'fr-FR': 'French', 
      'en-US': 'American',
      'en-GB': 'British',
      'es-ES': 'Spanish',
      'zh-CN': 'Mandarin',
      'ja-JP': 'Japanese',
      'de-DE': 'German',
      'it-IT': 'Italian'
    };
    
    const langName = langNames[lang] || lang;
    return `${voiceId} (${langName}, ${gender})`;
  }
  
  return voice.name;
}

function getVoiceQuality(voiceName) {
  if (voiceName.includes('Neural2')) return 'Neural (Highest Quality)';
  if (voiceName.includes('Wavenet')) return 'WaveNet (High Quality)';
  if (voiceName.includes('Standard')) return 'Standard Quality';
  return 'AI Voice';
}

function getLanguageFromVoiceId(voiceId) {
  const parts = voiceId.split('-');
  if (parts.length >= 2) {
    return parts[0] + '-' + parts[1];
  }
  return 'en-US';
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(port, () => {
  console.log(`NativeMimic Backend running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;