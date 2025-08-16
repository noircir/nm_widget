/**
 * Chrome Extension API Mock for NativeMimic v4.0 Testing
 * 
 * Comprehensive mocking of Chrome Extension APIs to simulate
 * browser extension environment and prevent API-related failures
 */

import { vi } from 'vitest';

// Mock storage data
const mockStorageData: Record<string, any> = {
  'nativemimic-settings': {
    theme: 'light',
    language: 'en',
    selectedVoiceId: 'test-voice-en',
    autoLanguageDetection: true,
    showSpeedControl: true,
    enableRecording: true,
    enableAnalytics: true
  },
  'nativemimic-cache': {
    voices: [
      { id: 'test-voice-en', name: 'Test English Voice', language: 'en-US' },
      { id: 'test-voice-es', name: 'Test Spanish Voice', language: 'es-ES' }
    ],
    lastUpdated: Date.now()
  },
  'nativemimic-analytics': {
    userId: 'test-user-123',
    sessionId: 'test-session-456',
    events: []
  }
};

// Mock Chrome Storage API
export const mockChromeStorage = {
  sync: {
    get: vi.fn((keys?: string | string[] | null) => {
      if (!keys) return Promise.resolve(mockStorageData);
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockStorageData[keys] });
      }
      if (Array.isArray(keys)) {
        const result: Record<string, any> = {};
        keys.forEach(key => {
          if (mockStorageData[key]) {
            result[key] = mockStorageData[key];
          }
        });
        return Promise.resolve(result);
      }
      return Promise.resolve({});
    }),
    set: vi.fn((items: Record<string, any>) => {
      Object.assign(mockStorageData, items);
      return Promise.resolve();
    }),
    remove: vi.fn((keys: string | string[]) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => delete mockStorageData[key]);
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      Object.keys(mockStorageData).forEach(key => delete mockStorageData[key]);
      return Promise.resolve();
    }),
    getBytesInUse: vi.fn(() => Promise.resolve(1024)),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(() => false)
    }
  },
  local: {
    get: vi.fn((keys?: string | string[] | null) => {
      // Local storage for temporary data
      const localData: Record<string, any> = {
        'temp-selection': 'test selected text',
        'widget-position': { x: 100, y: 150 }
      };
      
      if (!keys) return Promise.resolve(localData);
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: localData[keys] });
      }
      if (Array.isArray(keys)) {
        const result: Record<string, any> = {};
        keys.forEach(key => {
          if (localData[key]) {
            result[key] = localData[key];
          }
        });
        return Promise.resolve(result);
      }
      return Promise.resolve({});
    }),
    set: vi.fn((_items: Record<string, any>) => Promise.resolve()),
    remove: vi.fn((_keys: string | string[]) => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
    getBytesInUse: vi.fn(() => Promise.resolve(512)),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(() => false)
    }
  }
};

// Mock Chrome Runtime API
export const mockChromeRuntime = {
  id: 'test-extension-id',
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false)
  },
  onConnect: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false)
  },
  onInstalled: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false)
  },
  onStartup: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false)
  },
  sendMessage: vi.fn((_extensionId?: string, message?: any, _options?: any) => {
    // Simulate message responses based on message type
    if (message?.type === 'GET_SELECTED_TEXT') {
      return Promise.resolve({ text: 'test selected text' });
    }
    if (message?.type === 'PLAY_TTS') {
      return Promise.resolve({ success: true, audioUrl: 'blob:mock-audio' });
    }
    if (message?.type === 'RECORD_AUDIO') {
      return Promise.resolve({ success: true, recordingId: 'test-recording-123' });
    }
    return Promise.resolve({ success: true });
  }),
  connect: vi.fn(() => ({
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    onDisconnect: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    postMessage: vi.fn(),
    disconnect: vi.fn()
  })),
  getManifest: vi.fn(() => ({
    name: 'NativeMimic Test',
    version: '4.0.0',
    manifest_version: 3,
    permissions: ['storage', 'activeTab', 'scripting']
  })),
  getURL: vi.fn((path: string) => `chrome-extension://test-extension-id/${path}`),
  lastError: null
};

// Mock Chrome Tabs API
export const mockChromeTabs = {
  query: vi.fn((queryInfo?: chrome.tabs.QueryInfo) => {
    const mockTabs = [
      {
        id: 1,
        url: 'https://example.com',
        title: 'Test Page',
        active: true,
        windowId: 1,
        index: 0
      },
      {
        id: 2,
        url: 'https://test.com',
        title: 'Another Test Page',
        active: false,
        windowId: 1,
        index: 1
      }
    ];
    
    if (queryInfo?.active) {
      return Promise.resolve(mockTabs.filter(tab => tab.active));
    }
    return Promise.resolve(mockTabs);
  }),
  get: vi.fn((tabId: number) => {
    return Promise.resolve({
      id: tabId,
      url: 'https://example.com',
      title: 'Test Page',
      active: true,
      windowId: 1,
      index: 0
    });
  }),
  sendMessage: vi.fn((tabId: number, message: any) => {
    if (message.type === 'INJECT_WIDGET') {
      return Promise.resolve({ success: true });
    }
    if (message.type === 'GET_PAGE_TEXT') {
      return Promise.resolve({ text: 'Sample page content for testing' });
    }
    return Promise.resolve({ received: true });
  }),
  create: vi.fn((createProperties: chrome.tabs.CreateProperties) => {
    return Promise.resolve({
      id: 999,
      url: createProperties.url || 'chrome://newtab/',
      title: 'New Tab',
      active: true,
      windowId: 1,
      index: 0
    });
  }),
  update: vi.fn((tabId: number, updateProperties: chrome.tabs.UpdateProperties) => {
    return Promise.resolve({
      id: tabId,
      url: updateProperties.url || 'https://example.com',
      title: 'Updated Tab',
      active: true,
      windowId: 1,
      index: 0
    });
  }),
  onActivated: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false)
  },
  onUpdated: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false)
  }
};

// Mock Chrome Scripting API (Manifest V3)
export const mockChromeScripting = {
  executeScript: vi.fn((_injection: any) => {
    return Promise.resolve([{ result: 'script executed successfully' }]);
  }),
  insertCSS: vi.fn((_injection: any) => {
    return Promise.resolve();
  }),
  removeCSS: vi.fn((injection: chrome.scripting.CSSInjection) => {
    return Promise.resolve();
  }),
  registerContentScripts: vi.fn((scripts: chrome.scripting.RegisteredContentScript[]) => {
    return Promise.resolve();
  }),
  unregisterContentScripts: vi.fn((filter?: chrome.scripting.ContentScriptFilter) => {
    return Promise.resolve();
  }),
  getRegisteredContentScripts: vi.fn(() => {
    return Promise.resolve([]);
  })
};

// Mock Chrome Action API (Manifest V3)
export const mockChromeAction = {
  setTitle: vi.fn((details: chrome.action.TitleDetails) => Promise.resolve()),
  getTitle: vi.fn((details: chrome.action.TabDetails) => Promise.resolve('NativeMimic')),
  setIcon: vi.fn((details: chrome.action.TabIconDetails) => Promise.resolve()),
  setPopup: vi.fn((details: chrome.action.PopupDetails) => Promise.resolve()),
  getPopup: vi.fn((details: chrome.action.TabDetails) => Promise.resolve('popup.html')),
  setBadgeText: vi.fn((details: chrome.action.BadgeTextDetails) => Promise.resolve()),
  getBadgeText: vi.fn((details: chrome.action.TabDetails) => Promise.resolve('')),
  setBadgeBackgroundColor: vi.fn((details: chrome.action.BadgeColorDetails) => Promise.resolve()),
  getBadgeBackgroundColor: vi.fn((details: chrome.action.TabDetails) => Promise.resolve([0, 0, 0, 0])),
  enable: vi.fn((tabId?: number) => Promise.resolve()),
  disable: vi.fn((tabId?: number) => Promise.resolve()),
  onClicked: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false)
  }
};

// Mock Chrome Permissions API
export const mockChromePermissions = {
  contains: vi.fn((permissions: chrome.permissions.Permissions) => {
    const grantedPermissions = ['storage', 'activeTab', 'scripting'];
    if (permissions.permissions) {
      return Promise.resolve(
        permissions.permissions.every(perm => grantedPermissions.includes(perm))
      );
    }
    return Promise.resolve(true);
  }),
  request: vi.fn((permissions: chrome.permissions.Permissions) => {
    return Promise.resolve(true);
  }),
  remove: vi.fn((permissions: chrome.permissions.Permissions) => {
    return Promise.resolve(true);
  }),
  getAll: vi.fn(() => {
    return Promise.resolve({
      permissions: ['storage', 'activeTab', 'scripting'],
      origins: []
    });
  }),
  onAdded: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false)
  },
  onRemoved: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false)
  }
};

// Complete Chrome API mock object
export const mockChrome = {
  storage: mockChromeStorage,
  runtime: mockChromeRuntime,
  tabs: mockChromeTabs,
  scripting: mockChromeScripting,
  action: mockChromeAction,
  permissions: mockChromePermissions,
  
  // Additional APIs that might be used
  windows: {
    get: vi.fn(() => Promise.resolve({ id: 1, focused: true })),
    getCurrent: vi.fn(() => Promise.resolve({ id: 1, focused: true })),
    getAll: vi.fn(() => Promise.resolve([{ id: 1, focused: true }]))
  },
  
  contextMenus: {
    create: vi.fn(() => 'test-menu-item'),
    update: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    removeAll: vi.fn(() => Promise.resolve()),
    onClicked: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  
  alarms: {
    create: vi.fn(),
    clear: vi.fn(() => Promise.resolve(true)),
    clearAll: vi.fn(() => Promise.resolve(true)),
    get: vi.fn(() => Promise.resolve(null)),
    getAll: vi.fn(() => Promise.resolve([])),
    onAlarm: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  }
};

// Setup Chrome Extension mocks
export function setupChromeExtensionMocks() {
  // @ts-ignore
  global.chrome = mockChrome;
  
  // Also set up browser API for Firefox compatibility
  // @ts-ignore
  global.browser = {
    ...mockChrome,
    // Firefox-specific differences
    runtime: {
      ...mockChrome.runtime,
      getBrowserInfo: vi.fn(() => Promise.resolve({
        name: 'Firefox',
        vendor: 'Mozilla',
        version: '100.0'
      }))
    }
  };
}

// Reset Chrome Extension mocks
export function resetChromeExtensionMocks() {
  vi.clearAllMocks();
  
  // Reset storage data
  Object.keys(mockStorageData).forEach(key => delete mockStorageData[key]);
  Object.assign(mockStorageData, {
    'nativemimic-settings': {
      theme: 'light',
      language: 'en',
      selectedVoiceId: 'test-voice-en',
      autoLanguageDetection: true,
      showSpeedControl: true,
      enableRecording: true,
      enableAnalytics: true
    },
    'nativemimic-cache': {
      voices: [
        { id: 'test-voice-en', name: 'Test English Voice', language: 'en-US' },
        { id: 'test-voice-es', name: 'Test Spanish Voice', language: 'es-ES' }
      ],
      lastUpdated: Date.now()
    },
    'nativemimic-analytics': {
      userId: 'test-user-123',
      sessionId: 'test-session-456',
      events: []
    }
  });
  
  setupChromeExtensionMocks();
}

// Helper to get mock storage data for testing
export function getMockStorageData() {
  return { ...mockStorageData };
}

// Helper to set mock storage data for testing
export function setMockStorageData(data: Record<string, any>) {
  Object.assign(mockStorageData, data);
}