/**
 * Integration Test Setup for NativeMimic v4.0
 * 
 * Specialized setup for integration tests that test component interactions,
 * data flow, and system integration without external dependencies
 */

import { beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { mockSupabaseClient, setMockTableData, setMockStorageFile } from '../mocks/supabase.mock';
import { mockTTSEdgeFunction } from '../mocks/tts-apis.mock';
import { setMockStorageData } from '../mocks/chrome-extension.mock';

// Integration test configuration
const INTEGRATION_CONFIG = {
  // Longer timeouts for integration tests
  testTimeout: 30000,
  setupTimeout: 10000,
  
  // More realistic delays for integration testing
  networkDelayMs: 100,
  ttsProcessingDelayMs: 200,
  storageDelayMs: 50,
  
  // Test data configuration
  maxTestTextLength: 1000,
  testUserId: 'integration-test-user',
  testSessionId: 'integration-test-session'
};

// Mock test data for integration scenarios
const INTEGRATION_TEST_DATA = {
  user: {
    id: INTEGRATION_CONFIG.testUserId,
    email: 'integration-test@nativemimic.com',
    created_at: new Date().toISOString()
  },
  
  settings: {
    theme: 'light',
    language: 'en',
    selectedVoiceId: 'en-US-Wavenet-D',
    autoLanguageDetection: true,
    showSpeedControl: true,
    enableRecording: true,
    enableAnalytics: true,
    maxTextLength: 5000
  },
  
  speechEvents: [
    {
      id: 'event-1',
      user_id: INTEGRATION_CONFIG.testUserId,
      text: 'Integration test speech event',
      voice_id: 'en-US-Wavenet-D',
      language: 'en-US',
      cost_cents: 8,
      duration_ms: 2100,
      created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    },
    {
      id: 'event-2',
      user_id: INTEGRATION_CONFIG.testUserId,
      text: 'Another test event',
      voice_id: 'es-ES-Wavenet-B',
      language: 'es-ES',
      cost_cents: 6,
      duration_ms: 1800,
      created_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    }
  ],
  
  recordings: [
    {
      id: 'recording-1',
      user_id: INTEGRATION_CONFIG.testUserId,
      file_path: 'recordings/integration-test-1.webm',
      duration_ms: 5000,
      file_size_bytes: 25000,
      created_at: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
    }
  ],
  
  testPages: [
    {
      url: 'https://example.com/test-page',
      title: 'Test Page for Integration',
      content: 'This is a test page with selectable text content for integration testing.'
    },
    {
      url: 'https://news.example.com/article',
      title: 'News Article Test',
      content: 'A longer article with multiple paragraphs to test text selection and processing.'
    }
  ]
};

// Setup before all integration tests
beforeAll(async () => {
  console.log('🔧 Setting up integration test environment...');
  
  // Setup realistic test data in Supabase mocks
  await setupSupabaseTestData();
  
  // Setup Chrome extension storage with test data
  await setupExtensionStorageData();
  
  // Setup TTS service with realistic responses
  await setupTTSServiceMocks();
  
  // Setup test pages and DOM environment
  setupTestPages();
  
  console.log('✅ Integration test environment ready');
}, INTEGRATION_CONFIG.setupTimeout);

// Setup before each integration test
beforeEach(async () => {
  // Reset to known state but keep test data
  await resetToTestState();
  
  // Add realistic delays to simulate network conditions
  addRealisticDelays();
});

// Cleanup after each integration test
afterEach(async () => {
  // Clean up any created DOM elements
  cleanupDOMElements();
  
  // Reset any state changes but preserve base test data
  await resetTestState();
});

/**
 * Setup Supabase test data for integration scenarios
 */
async function setupSupabaseTestData() {
  // Set up speech events data
  setMockTableData('speech_events', INTEGRATION_TEST_DATA.speechEvents);
  
  // Set up recordings data
  setMockTableData('recordings', INTEGRATION_TEST_DATA.recordings);
  
  // Set up user feedback data
  setMockTableData('user_feedback', [
    {
      id: 'feedback-1',
      user_id: INTEGRATION_CONFIG.testUserId,
      type: 'voice_rating',
      content: 'Great voice quality in integration test',
      rating: 5,
      created_at: new Date().toISOString()
    }
  ]);
  
  // Set up storage files
  const testAudioBlob = new Blob(['fake integration test audio data'], { type: 'audio/webm' });
  setMockStorageFile('recordings', 'recordings/integration-test-1.webm', testAudioBlob);
  
  const testCacheBlob = new Blob(['fake cached tts audio'], { type: 'audio/mpeg' });
  setMockStorageFile('tts-cache', 'cache/en-us/integration-test.mp3', testCacheBlob);
}

/**
 * Setup Chrome extension storage with test data
 */
async function setupExtensionStorageData() {
  setMockStorageData({
    'nativemimic-settings': INTEGRATION_TEST_DATA.settings,
    'nativemimic-user': INTEGRATION_TEST_DATA.user,
    'nativemimic-session': {
      sessionId: INTEGRATION_CONFIG.testSessionId,
      startTime: Date.now(),
      pageInteractions: 0,
      speechEvents: 0
    },
    'nativemimic-cache': {
      voices: [
        {
          id: 'en-US-Wavenet-D',
          name: 'English (US) - Wavenet D',
          language: 'en-US',
          gender: 'male',
          quality: 'premium'
        },
        {
          id: 'es-ES-Wavenet-B', 
          name: 'Spanish (Spain) - Wavenet B',
          language: 'es-ES',
          gender: 'male',
          quality: 'premium'
        }
      ],
      lastUpdated: Date.now()
    }
  });
}

/**
 * Setup TTS service mocks with realistic behavior
 */
async function setupTTSServiceMocks() {
  // Mock realistic TTS processing with delays
  mockTTSEdgeFunction.mockImplementation(async (text: string, voice?: string) => {
    // Simulate processing delay based on text length
    const processingDelay = Math.min(
      INTEGRATION_CONFIG.ttsProcessingDelayMs + (text.length * 2),
      2000
    );
    
    await new Promise(resolve => setTimeout(resolve, processingDelay));
    
    // Return realistic audio blob
    const audioBlob = new Blob(
      [new Uint8Array(Math.floor(text.length * 100))], 
      { type: 'audio/mpeg' }
    );
    
    return {
      ok: true,
      status: 200,
      blob: () => Promise.resolve(audioBlob),
      json: () => Promise.resolve({
        success: true,
        duration: text.length * 0.08, // ~80ms per character
        cost: text.length * 0.000016, // Google TTS pricing
        voiceUsed: voice || 'en-US-Wavenet-D'
      })
    };
  });
}

/**
 * Setup test pages for integration testing
 */
function setupTestPages() {
  // Create test page elements
  INTEGRATION_TEST_DATA.testPages.forEach((page, index) => {
    const pageContainer = document.createElement('div');
    pageContainer.id = `test-page-${index}`;
    pageContainer.className = 'integration-test-page';
    pageContainer.innerHTML = `
      <h1>${page.title}</h1>
      <div class="content">${page.content}</div>
      <p class="selectable-text">This text can be selected for TTS testing.</p>
      <div class="complex-content">
        <span>Mixed content with </span>
        <strong>formatting</strong>
        <span> and multiple text nodes.</span>
      </div>
    `;
    
    // Hide test pages by default
    pageContainer.style.display = 'none';
    document.body.appendChild(pageContainer);
  });
}

/**
 * Add realistic delays to mock functions
 */
function addRealisticDelays() {
  // Add storage delay
  const originalStorageGet = chrome.storage.sync.get;
  chrome.storage.sync.get = vi.fn(async (...args) => {
    await new Promise(resolve => setTimeout(resolve, INTEGRATION_CONFIG.storageDelayMs));
    return originalStorageGet.apply(chrome.storage.sync, args);
  });
  
  const originalStorageSet = chrome.storage.sync.set;
  chrome.storage.sync.set = vi.fn(async (...args) => {
    await new Promise(resolve => setTimeout(resolve, INTEGRATION_CONFIG.storageDelayMs));
    return originalStorageSet.apply(chrome.storage.sync, args);
  });
  
  // Add network delay to fetch
  const originalFetch = global.fetch;
  global.fetch = vi.fn(async (...args) => {
    await new Promise(resolve => setTimeout(resolve, INTEGRATION_CONFIG.networkDelayMs));
    return originalFetch.apply(global, args);
  });
}

/**
 * Reset to clean test state while preserving test data
 */
async function resetToTestState() {
  // Clear any widget instances
  const widgets = document.querySelectorAll('.nativemimic-widget');
  widgets.forEach(widget => widget.remove());
  
  // Reset selection
  const selection = window.getSelection();
  selection?.removeAllRanges();
  
  // Reset audio elements
  const audioElements = document.querySelectorAll('audio');
  audioElements.forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
    audio.remove();
  });
  
  // Clear any timers
  vi.clearAllTimers();
}

/**
 * Clean up DOM elements created during tests
 */
function cleanupDOMElements() {
  // Remove any dynamically created elements
  const dynamicElements = document.querySelectorAll('[data-test-created]');
  dynamicElements.forEach(el => el.remove());
  
  // Remove any event listeners
  document.body.removeEventListener?.('click', () => {});
  document.removeEventListener?.('selectionchange', () => {});
}

/**
 * Reset test state while keeping base data
 */
async function resetTestState() {
  // Reset mock call counts but keep implementations
  vi.clearAllMocks();
  
  // Re-setup the TTS mocks with realistic behavior
  await setupTTSServiceMocks();
  
  // Reset storage to base test state
  await setupExtensionStorageData();
}

/**
 * Utility function to simulate complex user interaction flow
 */
export async function simulateUserWorkflow(steps: Array<{
  action: 'select' | 'click' | 'play' | 'record' | 'wait';
  target?: string;
  text?: string;
  duration?: number;
}>) {
  for (const step of steps) {
    switch (step.action) {
      case 'select':
        if (step.text) {
          simulateTextSelection(step.text);
        }
        break;
      case 'click':
        if (step.target) {
          const element = document.querySelector(step.target);
          if (element) {
            element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
        }
        break;
      case 'play':
        // Simulate TTS playback
        await new Promise(resolve => setTimeout(resolve, step.duration || 1000));
        break;
      case 'record':
        // Simulate recording
        await new Promise(resolve => setTimeout(resolve, step.duration || 2000));
        break;
      case 'wait':
        await new Promise(resolve => setTimeout(resolve, step.duration || 100));
        break;
    }
  }
}

/**
 * Utility function to simulate text selection
 */
export function simulateTextSelection(text: string, element?: Element) {
  const targetElement = element || document.querySelector('.selectable-text');
  if (!targetElement) {
    throw new Error('No target element found for text selection');
  }
  
  // Create text node if needed
  if (!targetElement.textContent?.includes(text)) {
    targetElement.textContent = text;
  }
  
  const range = document.createRange();
  const textNode = targetElement.firstChild || targetElement;
  range.setStart(textNode, 0);
  range.setEnd(textNode, text.length);
  
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  
  // Dispatch selection change event
  document.dispatchEvent(new Event('selectionchange'));
  
  return { range, selection, element: targetElement };
}

/**
 * Utility function to show/hide test pages
 */
export function showTestPage(index: number) {
  // Hide all test pages
  const allPages = document.querySelectorAll('.integration-test-page');
  allPages.forEach(page => (page as HTMLElement).style.display = 'none');
  
  // Show specific test page
  const targetPage = document.getElementById(`test-page-${index}`);
  if (targetPage) {
    targetPage.style.display = 'block';
  }
  
  return targetPage;
}

/**
 * Utility function to verify integration state
 */
export async function verifyIntegrationState(expectedState: {
  widgetVisible?: boolean;
  selectedText?: string;
  audioPlaying?: boolean;
  storageUpdated?: boolean;
  analyticsLogged?: boolean;
}) {
  const checks: Array<{ name: string; passed: boolean; message?: string }> = [];
  
  // Check widget visibility
  if (expectedState.widgetVisible !== undefined) {
    const widget = document.querySelector('.nativemimic-widget');
    const isVisible = widget && !widget.hasAttribute('hidden');
    checks.push({
      name: 'Widget visibility',
      passed: !!isVisible === expectedState.widgetVisible,
      message: `Expected widget ${expectedState.widgetVisible ? 'visible' : 'hidden'}, got ${isVisible ? 'visible' : 'hidden'}`
    });
  }
  
  // Check selected text
  if (expectedState.selectedText !== undefined) {
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    checks.push({
      name: 'Selected text',
      passed: selectedText === expectedState.selectedText,
      message: `Expected "${expectedState.selectedText}", got "${selectedText}"`
    });
  }
  
  // Check audio playing state
  if (expectedState.audioPlaying !== undefined) {
    const audioElements = document.querySelectorAll('audio');
    const isPlaying = Array.from(audioElements).some(audio => !audio.paused);
    checks.push({
      name: 'Audio playing',
      passed: isPlaying === expectedState.audioPlaying,
      message: `Expected audio ${expectedState.audioPlaying ? 'playing' : 'stopped'}, got ${isPlaying ? 'playing' : 'stopped'}`
    });
  }
  
  return {
    allPassed: checks.every(check => check.passed),
    checks,
    summary: `${checks.filter(c => c.passed).length}/${checks.length} checks passed`
  };
}

// Export integration test configuration and utilities
export {
  INTEGRATION_CONFIG,
  INTEGRATION_TEST_DATA
};