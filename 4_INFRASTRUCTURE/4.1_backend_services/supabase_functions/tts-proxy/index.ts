/**
 * TTS Proxy Edge Function
 * Supabase Edge Function for secure Google TTS API integration
 * 
 * Hides API keys from client and implements rate limiting
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TTSRequest {
  text: string;
  language_code: string;
  voice_id: string;
  audio_format: string;
  speaking_rate: number;
  pitch: number;
  volume_gain_db: number;
}

interface RateLimitInfo {
  requests_today: number;
  characters_today: number;
  last_request: string;
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get current user
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    // Parse request
    const ttsRequest: TTSRequest = await req.json()

    // Validate request
    if (!ttsRequest.text || ttsRequest.text.length > 5000) {
      throw new Error('Invalid text length')
    }

    // Check rate limits
    await checkRateLimit(supabaseClient, user.id, ttsRequest.text.length)

    // Check cache first
    const cacheKey = generateCacheKey(ttsRequest)
    const cachedResponse = await getCachedTTS(supabaseClient, cacheKey)
    
    if (cachedResponse) {
      // Update analytics for cached request
      await logTTSRequest(supabaseClient, user.id, ttsRequest, 0, true)
      
      return new Response(JSON.stringify({
        audio_content: cachedResponse.audio_content,
        audio_format: cachedResponse.audio_format,
        voice_name: cachedResponse.voice_name,
        voice_type: cachedResponse.voice_type,
        duration: cachedResponse.duration,
        cost: 0, // Cached responses are free
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Make Google TTS API request
    const googleResponse = await callGoogleTTS(ttsRequest)
    
    // Calculate cost
    const cost = calculateCost(ttsRequest.text.length, googleResponse.voice_type)

    // Cache the response
    await cacheTTSResponse(supabaseClient, cacheKey, googleResponse)

    // Log analytics
    await logTTSRequest(supabaseClient, user.id, ttsRequest, cost, false)

    return new Response(JSON.stringify({
      ...googleResponse,
      cost,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('TTS Proxy Error:', error)
    
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * Call Google Text-to-Speech API
 */
async function callGoogleTTS(request: TTSRequest) {
  const googleApiKey = Deno.env.get('GOOGLE_TTS_API_KEY')
  if (!googleApiKey) {
    throw new Error('Google TTS API key not configured')
  }

  const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: request.text },
      voice: {
        languageCode: request.language_code,
        name: request.voice_id
      },
      audioConfig: {
        audioEncoding: request.audio_format.toUpperCase(),
        speakingRate: request.speaking_rate,
        pitch: request.pitch,
        volumeGainDb: request.volume_gain_db
      }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google TTS API error: ${error}`)
  }

  return await response.json()
}

/**
 * Check user rate limits
 */
async function checkRateLimit(supabase: any, userId: string, characterCount: number) {
  // TODO: Implement proper rate limiting based on subscription tier
  // For now, basic limits
  const dailyCharacterLimit = 50000 // 50k characters per day for free tier
  const dailyRequestLimit = 1000    // 1000 requests per day

  // Query today's usage
  const today = new Date().toISOString().split('T')[0]
  
  const { data: usage } = await supabase
    .from('user_usage_daily')
    .select('characters_used, requests_made')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  const currentUsage = usage || { characters_used: 0, requests_made: 0 }

  if (currentUsage.characters_used + characterCount > dailyCharacterLimit) {
    throw new Error('Daily character limit exceeded')
  }

  if (currentUsage.requests_made >= dailyRequestLimit) {
    throw new Error('Daily request limit exceeded')
  }
}

/**
 * Generate cache key for TTS request
 */
function generateCacheKey(request: TTSRequest): string {
  const key = `${request.text}_${request.language_code}_${request.voice_id}_${request.speaking_rate}_${request.pitch}`
  return btoa(key).replace(/[+/=]/g, '')
}

/**
 * Get cached TTS response
 */
async function getCachedTTS(supabase: any, cacheKey: string) {
  const { data } = await supabase
    .from('tts_cache')
    .select('*')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single()

  return data
}

/**
 * Cache TTS response
 */
async function cacheTTSResponse(supabase: any, cacheKey: string, response: any) {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // Cache for 7 days

  await supabase.from('tts_cache').upsert({
    cache_key: cacheKey,
    audio_content: response.audioContent,
    audio_format: response.audioConfig?.audioEncoding || 'MP3',
    voice_name: response.voice?.name || 'Unknown',
    voice_type: response.voice?.ssmlGender || 'Unknown',
    duration: response.duration || 0,
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString()
  })
}

/**
 * Log TTS request for analytics
 */
async function logTTSRequest(supabase: any, userId: string, request: TTSRequest, cost: number, cached: boolean) {
  await supabase.from('analytics').insert({
    user_id: userId,
    event_type: 'tts_request',
    event_data: {
      text_length: request.text.length,
      language: request.language_code,
      voice_id: request.voice_id,
      cost_usd: cost,
      cached: cached
    },
    created_at: new Date().toISOString()
  })

  // Update daily usage
  const today = new Date().toISOString().split('T')[0]
  await supabase.from('user_usage_daily').upsert({
    user_id: userId,
    date: today,
    characters_used: request.text.length,
    requests_made: 1,
    cost_usd: cost
  }, {
    onConflict: 'user_id,date',
    merge: ['characters_used', 'requests_made', 'cost_usd']
  })
}

/**
 * Calculate TTS cost
 */
function calculateCost(characterCount: number, voiceType: string): number {
  const pricing = {
    'STANDARD': 4.00,     // $4 per 1M characters
    'WAVENET': 16.00,     // $16 per 1M characters  
    'NEURAL2': 16.00      // $16 per 1M characters
  }

  const pricePerMillion = pricing[voiceType as keyof typeof pricing] || pricing.WAVENET
  return (characterCount / 1000000) * pricePerMillion
}