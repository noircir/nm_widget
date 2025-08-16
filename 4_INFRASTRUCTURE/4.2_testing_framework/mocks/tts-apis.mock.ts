/**
 * TTS APIs Mock for NativeMimic v4.0 Testing
 * 
 * Comprehensive mocking of Text-to-Speech API services
 * including Google Cloud TTS, Azure Speech, and other providers
 */

import { vi } from 'vitest';

// Mock voice data
export const mockVoices = {
  google: [
    {
      name: 'en-US-Wavenet-D',
      ssmlGender: 'MALE',
      languageCodes: ['en-US'],
      naturalSampleRateHertz: 24000
    },
    {
      name: 'en-US-Wavenet-F',
      ssmlGender: 'FEMALE', 
      languageCodes: ['en-US'],
      naturalSampleRateHertz: 24000
    },
    {
      name: 'es-ES-Wavenet-B',
      ssmlGender: 'MALE',
      languageCodes: ['es-ES'],
      naturalSampleRateHertz: 24000
    },
    {
      name: 'fr-FR-Wavenet-C',
      ssmlGender: 'FEMALE',
      languageCodes: ['fr-FR'],
      naturalSampleRateHertz: 24000
    }
  ],
  azure: [
    {
      Name: 'en-US-AriaNeural',
      DisplayName: 'Aria',
      LocalName: 'Aria',
      ShortName: 'en-US-AriaNeural',
      Gender: 'Female',
      Locale: 'en-US',
      StyleList: ['chat', 'customerservice', 'newscast']
    },
    {
      Name: 'en-US-DavisNeural',
      DisplayName: 'Davis',
      LocalName: 'Davis', 
      ShortName: 'en-US-DavisNeural',
      Gender: 'Male',
      Locale: 'en-US',
      StyleList: ['chat', 'excited']
    }
  ]
};

// Mock TTS response data
const mockTTSResponses = {
  'hello world': {
    audioContent: 'UklGRjQEAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
    cost: 0.000032,
    duration: 1.2
  },
  'test selected text': {
    audioContent: 'UklGRjQEAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
    cost: 0.000048,
    duration: 1.8
  }
};

// Google Cloud TTS Mock
export const mockGoogleTTSClient = {
  listVoices: vi.fn(() => Promise.resolve({
    voices: mockVoices.google
  })),
  
  synthesizeSpeech: vi.fn((request: any) => {
    const text = request.input?.text || request.input?.ssml || '';
    const mockResponse = mockTTSResponses[text.toLowerCase()] || mockTTSResponses['hello world'];
    
    // Simulate processing delay
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          audioContent: mockResponse.audioContent,
          timepoints: [],
          audioConfig: {
            audioEncoding: request.audioConfig?.audioEncoding || 'MP3',
            sampleRateHertz: request.audioConfig?.sampleRateHertz || 24000,
            speakingRate: request.audioConfig?.speakingRate || 1.0,
            pitch: request.audioConfig?.pitch || 0.0,
            volumeGainDb: request.audioConfig?.volumeGainDb || 0.0
          }
        });
      }, 100);
    });
  }),
  
  // Mock authentication
  setCredentials: vi.fn(),
  getClient: vi.fn(() => Promise.resolve(mockGoogleTTSClient))
};

// Azure Speech Services Mock
export const mockAzureSpeechClient = {
  getVoicesAsync: vi.fn(() => Promise.resolve({
    voices: mockVoices.azure
  })),
  
  speakTextAsync: vi.fn((text: string, voice?: string) => {
    const mockResponse = mockTTSResponses[text.toLowerCase()] || mockTTSResponses['hello world'];
    
    return Promise.resolve({
      audioData: new Uint8Array(Buffer.from(mockResponse.audioContent, 'base64')),
      format: 'audio/wav',
      duration: mockResponse.duration
    });
  }),
  
  speakSsmlAsync: vi.fn((ssml: string) => {
    return mockAzureSpeechClient.speakTextAsync(ssml);
  }),
  
  close: vi.fn()
};

// Web Speech API Mock (Browser native)
export const mockWebSpeechAPI = {
  getVoices: vi.fn(() => [
    {
      voiceURI: 'Alex',
      name: 'Alex',
      lang: 'en-US',
      localService: true,
      default: true
    },
    {
      voiceURI: 'Samantha',
      name: 'Samantha',
      lang: 'en-US',
      localService: true,
      default: false
    },
    {
      voiceURI: 'Google Español',
      name: 'Google Español',
      lang: 'es-ES',
      localService: false,
      default: false
    }
  ]),
  
  speak: vi.fn((utterance: any) => {
    // Simulate speech events
    setTimeout(() => {
      if (utterance.onstart) utterance.onstart();
    }, 10);
    
    setTimeout(() => {
      if (utterance.onend) utterance.onend();
    }, 1000);
  }),
  
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  
  speaking: false,
  pending: false,
  paused: false
};

// Mock TTS API responses for different scenarios
export const mockTTSAPIResponses = {
  // Success response
  success: (text: string, voice: string = 'en-US-Wavenet-D') => ({
    ok: true,
    status: 200,
    blob: () => Promise.resolve(new Blob(['fake audio data'], { type: 'audio/mpeg' })),
    json: () => Promise.resolve({
      success: true,
      audioUrl: 'blob:mock-audio-url',
      duration: text.length * 0.1,
      cost: text.length * 0.000016,
      voiceUsed: voice
    })
  }),
  
  // Rate limit error
  rateLimited: () => ({
    ok: false,
    status: 429,
    json: () => Promise.resolve({
      error: 'Rate limit exceeded',
      retryAfter: 60
    })
  }),
  
  // Authentication error
  authError: () => ({
    ok: false,
    status: 401,
    json: () => Promise.resolve({
      error: 'Authentication failed',
      message: 'Invalid API key'
    })
  }),
  
  // Service unavailable
  serviceUnavailable: () => ({
    ok: false,
    status: 503,
    json: () => Promise.resolve({
      error: 'Service temporarily unavailable',
      message: 'TTS service is down for maintenance'
    })
  }),
  
  // Invalid voice error
  invalidVoice: () => ({
    ok: false,
    status: 400,
    json: () => Promise.resolve({
      error: 'Invalid voice',
      message: 'The specified voice is not available'
    })
  }),
  
  // Text too long error
  textTooLong: () => ({
    ok: false,
    status: 400,
    json: () => Promise.resolve({
      error: 'Text too long',
      message: 'Text exceeds maximum length of 5000 characters'
    })
  })
};

// Mock TTS Edge Function (Supabase)
export const mockTTSEdgeFunction = vi.fn((text: string, voice?: string, options?: any) => {
  // Simulate different response scenarios based on input
  if (text.length > 5000) {
    return Promise.resolve(mockTTSAPIResponses.textTooLong());
  }
  
  if (voice === 'invalid-voice') {
    return Promise.resolve(mockTTSAPIResponses.invalidVoice());
  }
  
  if (text.includes('rate-limit-test')) {
    return Promise.resolve(mockTTSAPIResponses.rateLimited());
  }
  
  if (text.includes('auth-error-test')) {
    return Promise.resolve(mockTTSAPIResponses.authError());
  }
  
  if (text.includes('service-down-test')) {
    return Promise.resolve(mockTTSAPIResponses.serviceUnavailable());
  }
  
  // Default success response
  return Promise.resolve(mockTTSAPIResponses.success(text, voice));
});

// Mock cost calculation
export const mockCostCalculator = {
  calculateTTSCost: vi.fn((text: string, voice: string = 'standard') => {
    const baseRate = voice.includes('Neural') || voice.includes('Wavenet') ? 0.000016 : 0.000004;
    return Math.max(text.length * baseRate, 0.001); // Minimum 0.1 cent
  }),
  
  calculateMonthlyEstimate: vi.fn((dailyCharacters: number) => {
    return dailyCharacters * 30 * 0.000016;
  })
};

// Mock voice quality analyzer
export const mockVoiceQualityAnalyzer = {
  analyzeVoice: vi.fn((voiceId: string, text: string) => ({
    naturalness: Math.random() * 0.3 + 0.7, // 0.7-1.0
    clarity: Math.random() * 0.2 + 0.8,     // 0.8-1.0  
    emotion: Math.random() * 0.5 + 0.5,     // 0.5-1.0
    overallRating: Math.random() * 0.3 + 0.7,
    characteristics: {
      gender: voiceId.includes('Female') ? 'female' : 'male',
      accent: voiceId.includes('US') ? 'american' : 'neutral',
      age: 'adult',
      speed: 'normal'
    }
  })),
  
  compareVoices: vi.fn((voiceIds: string[]) => {
    return voiceIds.map(id => mockVoiceQualityAnalyzer.analyzeVoice(id, 'test'));
  })
};

// Setup TTS API mocks
export function setupTTSMocks() {
  // Mock Google TTS
  vi.mock('@google-cloud/text-to-speech', () => ({
    TextToSpeechClient: vi.fn(() => mockGoogleTTSClient)
  }));
  
  // Mock Azure Speech SDK
  vi.mock('microsoft-cognitiveservices-speech-sdk', () => ({
    SpeechSynthesizer: vi.fn(() => mockAzureSpeechClient),
    SpeechConfig: {
      fromSubscription: vi.fn(() => ({}))
    },
    AudioConfig: {
      fromDefaultSpeakerOutput: vi.fn(() => ({}))
    }
  }));
  
  // Mock Web Speech API
  if (typeof global !== 'undefined') {
    Object.defineProperty(global, 'speechSynthesis', {
      writable: true,
      value: mockWebSpeechAPI
    });
  }
}

// Reset TTS mocks
export function resetTTSMocks() {
  vi.clearAllMocks();
  setupTTSMocks();
}

// Helper functions for testing different scenarios
export function mockTTSSuccess(text: string = 'test', voice: string = 'en-US-Wavenet-D') {
  mockTTSEdgeFunction.mockResolvedValueOnce(mockTTSAPIResponses.success(text, voice));
}

export function mockTTSRateLimit() {
  mockTTSEdgeFunction.mockResolvedValueOnce(mockTTSAPIResponses.rateLimited());
}

export function mockTTSAuthError() {
  mockTTSEdgeFunction.mockResolvedValueOnce(mockTTSAPIResponses.authError());
}

export function mockTTSServiceDown() {
  mockTTSEdgeFunction.mockResolvedValueOnce(mockTTSAPIResponses.serviceUnavailable());
}

export function mockTTSInvalidVoice() {
  mockTTSEdgeFunction.mockResolvedValueOnce(mockTTSAPIResponses.invalidVoice());
}

export function mockTTSTextTooLong() {
  mockTTSEdgeFunction.mockResolvedValueOnce(mockTTSAPIResponses.textTooLong());
}

// All mocks are already exported above as named exports