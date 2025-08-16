// Supabase Edge Function for Google TTS Proxy
// This replaces the localhost:3000 server for production users

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname
    
    console.log('Edge Function called with path:', path)

    // Handle different endpoints - Supabase strips the function prefix
    if (path.endsWith('/health') || path === '/health') {
      return handleHealth()
    } else if (path.endsWith('/api/presets') || path === '/api/presets') {
      return handlePresets()
    } else if (path.includes('/api/voices')) {
      // Handle both /api/voices and /api/voices/en formats
      const pathParts = path.split('/')
      const languageCode = pathParts[pathParts.length - 1] !== 'voices' ? pathParts[pathParts.length - 1] : null
      return handleVoices(languageCode)
    } else if (path.endsWith('/api/synthesize') || path === '/api/synthesize') {
      return await handleSynthesize(req)
    } else if (path === '/' || path.endsWith('/google-tts')) {
      // Root endpoint - return health status
      return handleHealth()
    } else {
      console.log('No matching route for path:', path)
      return new Response('Not Found', { 
        status: 404, 
        headers: corsHeaders 
      })
    }
  } catch (error) {
    console.error('Edge Function Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function handleHealth() {
  return new Response(
    JSON.stringify({ status: 'healthy', service: 'google-tts-proxy' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function handlePresets() {
  const presets = {
    'en-US-Neural2-A': { name: 'Emma (US English)', id: 'en-US-Neural2-A', language: 'en-US', gender: 'FEMALE' },
    'en-US-Neural2-D': { name: 'James (US English)', id: 'en-US-Neural2-D', language: 'en-US', gender: 'MALE' },
    'en-GB-Neural2-A': { name: 'Lily (British)', id: 'en-GB-Neural2-A', language: 'en-GB', gender: 'FEMALE' },
    'en-GB-Neural2-D': { name: 'Oliver (British)', id: 'en-GB-Neural2-D', language: 'en-GB', gender: 'MALE' },
    'es-ES-Neural2-A': { name: 'Sofia (Spanish)', id: 'es-ES-Neural2-A', language: 'es-ES', gender: 'FEMALE' },
    'es-ES-Neural2-B': { name: 'Carlos (Spanish)', id: 'es-ES-Neural2-B', language: 'es-ES', gender: 'MALE' },
    'fr-FR-Neural2-A': { name: 'Marie (French)', id: 'fr-FR-Neural2-A', language: 'fr-FR', gender: 'FEMALE' },
    'fr-FR-Neural2-B': { name: 'Pierre (French)', id: 'fr-FR-Neural2-B', language: 'fr-FR', gender: 'MALE' },
    'de-DE-Neural2-A': { name: 'Anna (German)', id: 'de-DE-Neural2-A', language: 'de-DE', gender: 'FEMALE' },
    'de-DE-Neural2-D': { name: 'Max (German)', id: 'de-DE-Neural2-D', language: 'de-DE', gender: 'MALE' },
    'it-IT-Neural2-A': { name: 'Giulia (Italian)', id: 'it-IT-Neural2-A', language: 'it-IT', gender: 'FEMALE' },
    'it-IT-Neural2-C': { name: 'Marco (Italian)', id: 'it-IT-Neural2-C', language: 'it-IT', gender: 'MALE' },
    'pt-BR-Neural2-A': { name: 'Ana (Portuguese)', id: 'pt-BR-Neural2-A', language: 'pt-BR', gender: 'FEMALE' },
    'pt-BR-Neural2-C': { name: 'João (Portuguese)', id: 'pt-BR-Neural2-C', language: 'pt-BR', gender: 'MALE' },
    'ja-JP-Neural2-A': { name: 'Sakura (Japanese)', id: 'ja-JP-Neural2-A', language: 'ja-JP', gender: 'FEMALE' },
    'ja-JP-Neural2-C': { name: 'Hiroshi (Japanese)', id: 'ja-JP-Neural2-C', language: 'ja-JP', gender: 'MALE' },
    'ko-KR-Neural2-A': { name: 'Min-ji (Korean)', id: 'ko-KR-Neural2-A', language: 'ko-KR', gender: 'FEMALE' },
    'ko-KR-Neural2-C': { name: 'Jin-woo (Korean)', id: 'ko-KR-Neural2-C', language: 'ko-KR', gender: 'MALE' }
  }

  return new Response(
    JSON.stringify({ presets }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function handleVoices(languageCode?: string | null) {
  // For now, return preset voices in the expected format
  // In a more advanced version, we could call Google TTS API to get all available voices
  const presets = {
    'en-US-Neural2-A': { name: 'Emma (US English)', id: 'en-US-Neural2-A', language: 'en-US', gender: 'FEMALE' },
    'en-US-Neural2-D': { name: 'James (US English)', id: 'en-US-Neural2-D', language: 'en-US', gender: 'MALE' },
    'en-GB-Neural2-A': { name: 'Lily (British)', id: 'en-GB-Neural2-A', language: 'en-GB', gender: 'FEMALE' },
    'en-GB-Neural2-D': { name: 'Oliver (British)', id: 'en-GB-Neural2-D', language: 'en-GB', gender: 'MALE' },
    'es-ES-Neural2-A': { name: 'Sofia (Spanish)', id: 'es-ES-Neural2-A', language: 'es-ES', gender: 'FEMALE' },
    'es-ES-Neural2-B': { name: 'Carlos (Spanish)', id: 'es-ES-Neural2-B', language: 'es-ES', gender: 'MALE' },
    'fr-FR-Neural2-A': { name: 'Marie (French)', id: 'fr-FR-Neural2-A', language: 'fr-FR', gender: 'FEMALE' },
    'fr-FR-Neural2-B': { name: 'Pierre (French)', id: 'fr-FR-Neural2-B', language: 'fr-FR', gender: 'MALE' },
    'de-DE-Neural2-A': { name: 'Anna (German)', id: 'de-DE-Neural2-A', language: 'de-DE', gender: 'FEMALE' },
    'de-DE-Neural2-D': { name: 'Max (German)', id: 'de-DE-Neural2-D', language: 'de-DE', gender: 'MALE' },
    'it-IT-Neural2-A': { name: 'Giulia (Italian)', id: 'it-IT-Neural2-A', language: 'it-IT', gender: 'FEMALE' },
    'it-IT-Neural2-C': { name: 'Marco (Italian)', id: 'it-IT-Neural2-C', language: 'it-IT', gender: 'MALE' },
    'pt-BR-Neural2-A': { name: 'Ana (Portuguese)', id: 'pt-BR-Neural2-A', language: 'pt-BR', gender: 'FEMALE' },
    'pt-BR-Neural2-C': { name: 'João (Portuguese)', id: 'pt-BR-Neural2-C', language: 'pt-BR', gender: 'MALE' },
    'ja-JP-Neural2-A': { name: 'Sakura (Japanese)', id: 'ja-JP-Neural2-A', language: 'ja-JP', gender: 'FEMALE' },
    'ja-JP-Neural2-C': { name: 'Hiroshi (Japanese)', id: 'ja-JP-Neural2-C', language: 'ja-JP', gender: 'MALE' },
    'ko-KR-Neural2-A': { name: 'Min-ji (Korean)', id: 'ko-KR-Neural2-A', language: 'ko-KR', gender: 'FEMALE' },
    'ko-KR-Neural2-C': { name: 'Jin-woo (Korean)', id: 'ko-KR-Neural2-C', language: 'ko-KR', gender: 'MALE' }
  }

  // Convert to voices array format that the client expects
  const allVoices = Object.values(presets);
  
  let filteredVoices = allVoices;
  if (languageCode) {
    // Filter by language code prefix (e.g., 'en' matches 'en-US', 'en-GB')
    filteredVoices = allVoices.filter(voice => 
      voice.language.toLowerCase().startsWith(languageCode.toLowerCase())
    );
  }

  return new Response(
    JSON.stringify({ voices: filteredVoices }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleSynthesize(req: Request) {
  const body = await req.json()
  const { text, voiceId, options = {} } = body

  if (!text || !voiceId) {
    return new Response(
      JSON.stringify({ error: 'Missing text or voiceId' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Get Google Cloud TTS API key from environment
  const googleApiKey = Deno.env.get('GOOGLE_CLOUD_API_KEY')
  if (!googleApiKey) {
    return new Response(
      JSON.stringify({ error: 'Google Cloud API key not configured' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // Call Google Cloud Text-to-Speech API
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: voiceId.split('-').slice(0, 2).join('-'), // e.g., 'en-US' from 'en-US-Neural2-A'
            name: voiceId
            // Note: ssmlGender is optional and will be determined by the voice name
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: options.speakingRate || 1.0,
            pitch: options.pitch || 0,
            volumeGainDb: options.volumeGainDb || 0
          }
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Google TTS API Error:', errorData)
      console.error('Request body was:', JSON.stringify({
        input: { text },
        voice: {
          languageCode: voiceId.split('-').slice(0, 2).join('-'),
          name: voiceId,
          ssmlGender: 'NEUTRAL'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: options.speakingRate || 1.0,
          pitch: options.pitch || 0,
          volumeGainDb: options.volumeGainDb || 0
        }
      }))
      return new Response(
        JSON.stringify({ 
          error: `Google TTS API error: ${response.status}`,
          details: errorData
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = await response.json()
    
    return new Response(
      JSON.stringify({
        success: true,
        audioContent: data.audioContent,
        characterCount: text.length,
        voiceId,
        cost: (text.length / 1000000) * 16 // $16 per million characters
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('TTS Synthesis Error:', error)
    return new Response(
      JSON.stringify({ error: 'TTS synthesis failed' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}