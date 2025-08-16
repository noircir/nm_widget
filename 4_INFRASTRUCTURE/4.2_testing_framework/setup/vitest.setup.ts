/**
 * Vitest Setup for NativeMimic v4.0
 * 
 * Main test setup file that initializes all mocks and testing environment
 * Critical for preventing the undefined reference cascading failures from v3.16
 */

import { beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { setupBrowserMocks, resetBrowserMocks } from '../mocks/browser-apis.mock';
import { setupChromeExtensionMocks, resetChromeExtensionMocks } from '../mocks/chrome-extension.mock';
import { setupSupabaseMocks, resetSupabaseMocks } from '../mocks/supabase.mock';
import { setupTTSMocks, resetTTSMocks } from '../mocks/tts-apis.mock';

// Global test configuration
const TEST_CONFIG = {
  // Timeout for individual tests (prevent hanging tests)
  testTimeout: 10000,
  
  // Timeout for setup/teardown hooks
  hookTimeout: 5000,
  
  // Enable strict mode to catch more potential issues
  strictMode: true,
  
  // Mock timers for consistent testing
  enableFakeTimers: true
};

// Error tracking for debugging
const testErrors: Error[] = [];

// Performance monitoring
const performanceMarks = new Map<string, number>();

// Global setup - runs once before all tests
beforeAll(async () => {
  console.log('🚀 Setting up NativeMimic v4.0 test environment...');
  
  // Start performance monitoring
  performanceMarks.set('setup-start', performance.now());
  
  try {
    // Setup all mocks in the correct order
    setupBrowserMocks();
    setupChromeExtensionMocks();
    setupSupabaseMocks();
    setupTTSMocks();
    
    // Configure fake timers if enabled
    if (TEST_CONFIG.enableFakeTimers) {
      vi.useFakeTimers();
    }
    
    // Setup DOM environment enhancements
    setupDOMTestingEnvironment();
    
    // Setup error handling
    setupGlobalErrorHandling();
    
    // Setup console monitoring for test debugging
    setupConsoleMonitoring();
    
    performanceMarks.set('setup-end', performance.now());
    const setupTime = performanceMarks.get('setup-end')! - performanceMarks.get('setup-start')!;
    console.log(`✅ Test environment setup completed in ${setupTime.toFixed(2)}ms`);
    
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  }
}, TEST_CONFIG.hookTimeout);

// Setup before each test
beforeEach(async () => {
  // Reset all mocks to clean state
  resetBrowserMocks();
  resetChromeExtensionMocks();
  resetSupabaseMocks();
  resetTTSMocks();
  
  // Clear any previous errors
  testErrors.length = 0;
  
  // Reset DOM to clean state
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Reset window location and history
  Object.defineProperty(window, 'location', {
    writable: true,
    value: {
      href: 'http://localhost:3000',
      hostname: 'localhost',
      port: '3000',
      protocol: 'http:',
      pathname: '/',
      search: '',
      hash: '',
      origin: 'http://localhost:3000',
      reload: vi.fn(),
      assign: vi.fn(),
      replace: vi.fn()
    }
  });
  
  // Reset performance marks for this test
  performanceMarks.clear();
  performanceMarks.set('test-start', performance.now());
});

// Cleanup after each test
afterEach(() => {
  // Log performance metrics
  const testEnd = performance.now();
  const testDuration = testEnd - (performanceMarks.get('test-start') || testEnd);
  
  if (testDuration > 5000) {
    console.warn(`⚠️ Slow test detected: ${testDuration.toFixed(2)}ms`);
  }
  
  // Report any errors that occurred during the test
  if (testErrors.length > 0) {
    console.warn(`⚠️ ${testErrors.length} error(s) occurred during test:`, testErrors);
  }
  
  // Clean up any remaining timers or intervals
  vi.clearAllTimers();
  
  // Clean up any event listeners
  document.removeEventListener?.('click', () => {});
  document.removeEventListener?.('keydown', () => {});
  window.removeEventListener?.('resize', () => {});
  
  // Clean up any created elements that might interfere with other tests
  const nativemimicElements = document.querySelectorAll('[class*="nativemimic"]');
  nativemimicElements.forEach(el => el.remove());
});

// Global cleanup - runs once after all tests
afterAll(() => {
  console.log('🧹 Cleaning up test environment...');
  
  // Restore real timers
  if (TEST_CONFIG.enableFakeTimers) {
    vi.useRealTimers();
  }
  
  // Clear all mocks
  vi.clearAllMocks();
  
  // Final performance report
  if (performanceMarks.size > 0) {
    console.log('📊 Test performance summary:', Object.fromEntries(performanceMarks));
  }
  
  console.log('✅ Test environment cleanup completed');
});

/**
 * Setup DOM testing environment with commonly needed elements
 */
function setupDOMTestingEnvironment() {
  // Create a meta viewport tag (needed for responsive testing)
  const viewport = document.createElement('meta');
  viewport.name = 'viewport';
  viewport.content = 'width=device-width, initial-scale=1';
  document.head.appendChild(viewport);
  
  // Setup body styles for consistent testing
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.fontFamily = 'Arial, sans-serif';
  
  // Mock CSS custom properties support
  if (!CSS.supports) {
    global.CSS = {
      supports: vi.fn(() => true),
      escape: vi.fn((str: string) => str)
    };
  }
  
  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }));
  
  // Mock ResizeObserver
  global.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }));
  
  // Mock MutationObserver
  global.MutationObserver = vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => [])
  }));
}

/**
 * Setup global error handling for better test debugging
 */
function setupGlobalErrorHandling() {
  // Capture unhandled errors
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    testErrors.push(error || new Error(String(message)));
    return originalOnError ? originalOnError(message, source, lineno, colno, error) : false;
  };
  
  // Capture unhandled promise rejections
  const originalOnUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = (event) => {
    testErrors.push(new Error(`Unhandled promise rejection: ${event.reason}`));
    return originalOnUnhandledRejection ? originalOnUnhandledRejection(event) : false;
  };
}

/**
 * Setup console monitoring for test debugging
 */
function setupConsoleMonitoring() {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.error = (...args) => {
    // Track console errors for debugging
    if (args[0] && typeof args[0] === 'string' && !args[0].includes('Test:')) {
      testErrors.push(new Error(`Console error: ${args.join(' ')}`));
    }
    return originalConsoleError.apply(console, args);
  };
  
  console.warn = (...args) => {
    // Only log warnings in verbose mode
    if (process.env.TEST_VERBOSE) {
      return originalConsoleWarn.apply(console, args);
    }
  };
}

/**
 * Utility function to create mock DOM elements for testing
 */
export function createMockElement(tag: string, attributes: Record<string, string> = {}, innerHTML = '') {
  const element = document.createElement(tag);
  
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  
  if (innerHTML) {
    element.innerHTML = innerHTML;
  }
  
  return element;
}

/**
 * Utility function to simulate user interaction events
 */
export function simulateUserEvent(element: Element, eventType: string, eventOptions: any = {}) {
  const event = new Event(eventType, { bubbles: true, cancelable: true, ...eventOptions });
  element.dispatchEvent(event);
}

/**
 * Utility function to wait for DOM changes
 */
export function waitForDOM(callback: () => boolean, timeout = 1000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    function check() {
      if (callback()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('DOM condition not met within timeout'));
      } else {
        setTimeout(check, 10);
      }
    }
    
    check();
  });
}

/**
 * Utility function to create a test text selection
 */
export function createTestSelection(text: string = 'test selection') {
  const range = document.createRange();
  const textNode = document.createTextNode(text);
  document.body.appendChild(textNode);
  
  range.selectNodeContents(textNode);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  
  return { range, textNode, selection };
}

/**
 * Utility function to clean up test selection
 */
export function cleanupTestSelection() {
  const selection = window.getSelection();
  selection?.removeAllRanges();
}

// Export test utilities
export {
  TEST_CONFIG,
  testErrors,
  performanceMarks
};