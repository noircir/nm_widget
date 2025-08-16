/**
 * Browser APIs Mock for NativeMimic v4.0 Testing
 * 
 * Comprehensive mocking of browser APIs to prevent undefined reference errors
 * that caused cascading failures in v3.16
 */

import { vi } from 'vitest';

// Mock Web Speech API
export const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => [
    {
      name: 'Test Voice EN',
      lang: 'en-US',
      localService: true,
      default: true,
      voiceURI: 'test-voice-en'
    },
    {
      name: 'Test Voice ES',
      lang: 'es-ES', 
      localService: true,
      default: false,
      voiceURI: 'test-voice-es'
    }
  ]),
  speaking: false,
  pending: false,
  paused: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onvoiceschanged: null
};

export const mockSpeechSynthesisUtterance = vi.fn().mockImplementation((text: string) => ({
  text,
  voice: null,
  volume: 1,
  rate: 1,
  pitch: 1,
  onstart: null,
  onend: null,
  onerror: null,
  onpause: null,
  onresume: null,
  onmark: null,
  onboundary: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}));

// Mock Audio API
export const mockAudio = vi.fn().mockImplementation((src?: string) => ({
  src: src || '',
  currentTime: 0,
  duration: 0,
  paused: true,
  ended: false,
  volume: 1,
  muted: false,
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  load: vi.fn(),
  canPlayType: vi.fn(() => 'probably'),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onload: null,
  onloadstart: null,
  onloadeddata: null,
  oncanplay: null,
  onplay: null,
  onpause: null,
  onended: null,
  onerror: null
}));

// Mock MediaRecorder API
export const mockMediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  state: 'inactive',
  stream: null,
  mimeType: 'audio/webm',
  audioBitsPerSecond: 128000,
  videoBitsPerSecond: 0,
  ondataavailable: null,
  onstart: null,
  onstop: null,
  onpause: null,
  onresume: null,
  onerror: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}));

// Mock getUserMedia
export const mockGetUserMedia = vi.fn().mockResolvedValue({
  getTracks: vi.fn(() => []),
  getAudioTracks: vi.fn(() => [{
    kind: 'audio',
    label: 'Test Microphone',
    enabled: true,
    stop: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }]),
  getVideoTracks: vi.fn(() => []),
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
});

// Mock Notification API
export const mockNotification = vi.fn().mockImplementation((title: string, options?: any) => ({
  title,
  body: options?.body || '',
  icon: options?.icon || '',
  tag: options?.tag || '',
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onclick: null,
  onclose: null,
  onerror: null,
  onshow: null
}));

// Mock Clipboard API
export const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
  readText: vi.fn().mockResolvedValue('test clipboard content'),
  write: vi.fn().mockResolvedValue(undefined),
  read: vi.fn().mockResolvedValue([])
};

// Mock Selection API
export const mockSelection = {
  toString: vi.fn(() => 'test selected text'),
  getRangeAt: vi.fn(() => ({
    getBoundingClientRect: vi.fn(() => ({
      top: 100,
      left: 100,
      bottom: 120,
      right: 200,
      width: 100,
      height: 20,
      x: 100,
      y: 100
    })),
    startContainer: document.createElement('div'),
    endContainer: document.createElement('div'),
    startOffset: 0,
    endOffset: 10,
    collapsed: false,
    commonAncestorContainer: document.createElement('div')
  })),
  rangeCount: 1,
  anchorNode: document.createElement('div'),
  anchorOffset: 0,
  focusNode: document.createElement('div'),
  focusOffset: 10,
  isCollapsed: false,
  type: 'Range',
  addRange: vi.fn(),
  removeRange: vi.fn(),
  removeAllRanges: vi.fn(),
  collapse: vi.fn(),
  collapseToStart: vi.fn(),
  collapseToEnd: vi.fn(),
  extend: vi.fn(),
  selectAllChildren: vi.fn(),
  deleteFromDocument: vi.fn(),
  containsNode: vi.fn(() => true)
};

// Mock Fetch API with common responses
export const mockFetch = vi.fn().mockImplementation((url: string, _options?: any) => {
  // TTS API responses
  if (url.includes('/api/tts') || url.includes('tts-proxy')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['fake audio data'], { type: 'audio/mpeg' })),
      json: () => Promise.resolve({ success: true })
    });
  }
  
  // Supabase responses
  if (url.includes('supabase')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [], error: null })
    });
  }
  
  // Default response
  return Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({}),
    blob: () => Promise.resolve(new Blob())
  });
});

// Mock localStorage
export const mockLocalStorage = {
  getItem: vi.fn((key: string) => {
    const storage: Record<string, string> = {
      'nativemimic-settings': JSON.stringify({
        theme: 'light',
        language: 'en',
        voiceId: 'test-voice'
      }),
      'nativemimic-analytics': JSON.stringify({
        userId: 'test-user-id',
        sessionId: 'test-session-id'
      })
    };
    return storage[key] || null;
  }),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

// Mock sessionStorage
export const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

// Mock IndexedDB
export const mockIndexedDB = {
  open: vi.fn().mockResolvedValue({
    result: {
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          add: vi.fn().mockResolvedValue(undefined),
          get: vi.fn().mockResolvedValue(undefined),
          put: vi.fn().mockResolvedValue(undefined),
          delete: vi.fn().mockResolvedValue(undefined),
          clear: vi.fn().mockResolvedValue(undefined),
          count: vi.fn().mockResolvedValue(0)
        })),
        oncomplete: null,
        onerror: null
      })),
      createObjectStore: vi.fn(),
      deleteObjectStore: vi.fn(),
      close: vi.fn()
    }
  }),
  deleteDatabase: vi.fn().mockResolvedValue(undefined)
};

// Mock URL API
export const mockURL = {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn()
};

// Apply mocks to global objects
export function setupBrowserMocks() {
  // @ts-ignore
  global.speechSynthesis = mockSpeechSynthesis;
  // @ts-ignore  
  global.SpeechSynthesisUtterance = mockSpeechSynthesisUtterance;
  // @ts-ignore
  global.Audio = mockAudio;
  // @ts-ignore
  global.MediaRecorder = mockMediaRecorder;
  // @ts-ignore
  global.Notification = mockNotification;
  
  // @ts-ignore
  global.navigator = {
    ...global.navigator,
    mediaDevices: {
      getUserMedia: mockGetUserMedia,
      enumerateDevices: vi.fn().mockResolvedValue([]),
      ondevicechange: null,
      getDisplayMedia: vi.fn(),
      getSupportedConstraints: vi.fn(() => ({})),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true)
    } as MediaDevices,
    clipboard: {
      ...mockClipboard,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true)
    } as Clipboard,
    userAgent: 'Mozilla/5.0 (Chrome Test)',
    language: 'en-US',
    languages: ['en-US', 'en'],
    onLine: true
  };

  Object.defineProperty(window, 'getSelection', {
    writable: true,
    value: vi.fn(() => mockSelection)
  });

  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: mockLocalStorage
  });

  Object.defineProperty(window, 'sessionStorage', {
    writable: true,
    value: mockSessionStorage
  });

  // @ts-ignore
  global.fetch = mockFetch;
  // @ts-ignore
  global.indexedDB = mockIndexedDB;
  // @ts-ignore
  global.URL = mockURL;

  // Mock CSS and style computations
  Object.defineProperty(window, 'getComputedStyle', {
    value: vi.fn(() => ({
      getPropertyValue: vi.fn(() => ''),
      display: 'block',
      position: 'static',
      width: '100px',
      height: '20px'
    }))
  });

  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
  global.cancelAnimationFrame = vi.fn();
}

// Reset all mocks
export function resetBrowserMocks() {
  vi.clearAllMocks();
  setupBrowserMocks();
}