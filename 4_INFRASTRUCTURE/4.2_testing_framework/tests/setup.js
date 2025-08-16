// Jest Setup for QuickSpeak Tests
// Mock Chrome Extension APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve()),
    },
    local: {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve()),
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn()
  },
  tabs: {
    query: jest.fn(() => Promise.resolve([{ id: 1 }])),
    sendMessage: jest.fn(() => Promise.resolve())
  }
};

// Mock Web Speech API
global.speechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn(() => [
    { name: 'Test Voice', lang: 'en-US', localService: true }
  ]),
  speaking: false,
  pending: false,
  paused: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

global.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
  text,
  voice: null,
  volume: 1,
  rate: 1,
  pitch: 1,
  onstart: null,
  onend: null,
  onerror: null
}));

// Mock DOM methods
Object.defineProperty(window, 'getSelection', {
  writable: true,
  value: jest.fn(() => ({
    toString: () => 'test selection',
    getRangeAt: () => ({
      getBoundingClientRect: () => ({
        top: 100,
        left: 100,
        bottom: 120,
        right: 200
      })
    })
  }))
});

// Console error suppression for expected errors in tests
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('QuickSpeak')) {
    return; // Suppress QuickSpeak test errors
  }
  originalError.apply(console, args);
};