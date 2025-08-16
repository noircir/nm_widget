/**
 * Global Setup for Playwright E2E Tests - NativeMimic v4.0
 * 
 * Prepares the testing environment for end-to-end tests
 * including building the extension and setting up test servers
 */

import { FullConfig } from '@playwright/test';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, copyFile } from 'fs/promises';
import { resolve, join } from 'path';

const execAsync = promisify(exec);

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for NativeMimic v4.0 E2E tests...');
  
  try {
    // Step 1: Build the extension for testing
    await buildExtensionForTesting();
    
    // Step 2: Setup test web server
    await setupTestWebServer();
    
    // Step 3: Create test data files
    await createTestDataFiles();
    
    // Step 4: Setup browser extension test environment
    await setupExtensionTestEnvironment();
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

/**
 * Build the browser extension for testing
 */
async function buildExtensionForTesting() {
  console.log('🔨 Building extension for testing...');
  
  const projectRoot = resolve(__dirname, '../../../..');
  
  try {
    // Run TypeScript compilation
    console.log('  - Compiling TypeScript...');
    await execAsync('npx tsc --noEmit', { cwd: projectRoot });
    
    // Build extension (simplified for testing)
    console.log('  - Building extension bundle...');
    await execAsync('npm run build:test', { cwd: projectRoot });
    
    // Copy manifest and static files
    await copyExtensionFiles();
    
    console.log('✅ Extension build completed');
    
  } catch (error) {
    console.error('❌ Extension build failed:', error);
    throw error;
  }
}

/**
 * Copy extension files to dist directory
 */
async function copyExtensionFiles() {
  const projectRoot = resolve(__dirname, '../../../..');
  const distPath = join(projectRoot, 'dist');
  
  // Ensure dist directory exists
  await mkdir(distPath, { recursive: true });
  
  // Create test manifest.json
  const testManifest = {
    manifest_version: 3,
    name: 'NativeMimic Test Extension',
    version: '4.0.0-test',
    description: 'NativeMimic browser extension for testing',
    
    permissions: [
      'storage',
      'activeTab',
      'scripting'
    ],
    
    host_permissions: [
      'http://localhost:*/*',
      'https://localhost:*/*'
    ],
    
    background: {
      service_worker: 'background.js'
    },
    
    content_scripts: [{
      matches: ['<all_urls>'],
      js: ['content.js'],
      css: ['content.css'],
      run_at: 'document_end'
    }],
    
    action: {
      default_popup: 'popup.html',
      default_title: 'NativeMimic Test'
    },
    
    icons: {
      16: 'icon16.png',
      32: 'icon32.png',
      48: 'icon48.png',
      128: 'icon128.png'
    },
    
    web_accessible_resources: [{
      resources: ['*.png', '*.css'],
      matches: ['<all_urls>']
    }]
  };
  
  await writeFile(
    join(distPath, 'manifest.json'),
    JSON.stringify(testManifest, null, 2)
  );
  
  // Create minimal background script for testing
  const backgroundScript = `
// NativeMimic Test Background Script
console.log('NativeMimic test extension background script loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('NativeMimic test extension installed');
});

chrome.action.onClicked.addListener((tab) => {
  console.log('Extension action clicked on tab:', tab.id);
});

// Mock message handling for tests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  if (message.type === 'TEST_PING') {
    sendResponse({ success: true, message: 'pong' });
  }
  
  if (message.type === 'GET_EXTENSION_INFO') {
    sendResponse({
      success: true,
      extensionId: chrome.runtime.id,
      version: chrome.runtime.getManifest().version
    });
  }
  
  return true; // Keep message channel open for async responses
});
`;
  
  await writeFile(join(distPath, 'background.js'), backgroundScript);
  
  // Create minimal content script for testing
  const contentScript = `
// NativeMimic Test Content Script
console.log('NativeMimic test content script loaded on:', window.location.href);

// Add test attribute to body for Playwright detection
document.body.setAttribute('data-nativemimic-test', 'loaded');

// Mock widget injection for testing
function injectTestWidget() {
  const existingWidget = document.querySelector('.nativemimic-test-widget');
  if (existingWidget) return;
  
  const widget = document.createElement('div');
  widget.className = 'nativemimic-test-widget';
  widget.style.cssText = \`
    position: fixed;
    top: 10px;
    right: 10px;
    width: 200px;
    height: 100px;
    background: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 12px;
    display: none;
  \`;
  
  widget.innerHTML = \`
    <div>NativeMimic Test Widget</div>
    <button id="test-play-btn">Play</button>
    <button id="test-close-btn">Close</button>
  \`;
  
  // Add event listeners
  widget.querySelector('#test-play-btn').addEventListener('click', () => {
    console.log('Test play button clicked');
    widget.setAttribute('data-playing', 'true');
  });
  
  widget.querySelector('#test-close-btn').addEventListener('click', () => {
    widget.style.display = 'none';
  });
  
  document.body.appendChild(widget);
  return widget;
}

// Show widget on text selection
document.addEventListener('mouseup', () => {
  const selection = window.getSelection();
  if (selection && selection.toString().trim()) {
    const widget = injectTestWidget();
    widget.style.display = 'block';
    widget.setAttribute('data-selected-text', selection.toString());
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.type === 'SHOW_WIDGET') {
    const widget = injectTestWidget();
    widget.style.display = 'block';
    sendResponse({ success: true });
  }
  
  if (message.type === 'HIDE_WIDGET') {
    const widget = document.querySelector('.nativemimic-test-widget');
    if (widget) {
      widget.style.display = 'none';
    }
    sendResponse({ success: true });
  }
  
  if (message.type === 'GET_PAGE_TEXT') {
    sendResponse({
      success: true,
      text: document.body.innerText.substring(0, 1000)
    });
  }
  
  return true;
});
`;
  
  await writeFile(join(distPath, 'content.js'), contentScript);
  
  // Create minimal CSS for testing
  const contentCSS = `
/* NativeMimic Test Content Styles */
.nativemimic-test-widget {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.nativemimic-test-widget button {
  margin: 2px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 3px;
  cursor: pointer;
}

.nativemimic-test-widget button:hover {
  background: #f5f5f5;
}
`;
  
  await writeFile(join(distPath, 'content.css'), contentCSS);
  
  // Create minimal popup for testing
  const popupHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { width: 300px; padding: 16px; margin: 0; font-family: Arial, sans-serif; }
    h1 { font-size: 16px; margin: 0 0 8px 0; }
    button { padding: 8px 16px; margin: 4px 0; width: 100%; }
  </style>
</head>
<body>
  <h1>NativeMimic Test</h1>
  <p>Test extension popup</p>
  <button id="test-button">Test Action</button>
  <script>
    document.getElementById('test-button').addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'SHOW_WIDGET' });
        window.close();
      });
    });
  </script>
</body>
</html>
`;
  
  await writeFile(join(distPath, 'popup.html'), popupHTML);
  
  // Copy icon files (create simple test icons)
  const iconSizes = [16, 32, 48, 128];
  for (const size of iconSizes) {
    // Create a simple SVG icon and convert to PNG (simplified for testing)
    const iconSVG = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#007acc"/>
  <text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="middle" 
        fill="white" font-family="Arial" font-size="${size/4}">NM</text>
</svg>
`;
    
    // For testing, we'll just create a placeholder file
    await writeFile(join(distPath, `icon${size}.png`), `placeholder-icon-${size}`);
  }
}

/**
 * Setup test web server
 */
async function setupTestWebServer() {
  console.log('🌐 Setting up test web server...');
  
  const testServerPath = resolve(__dirname, '../fixtures');
  await mkdir(testServerPath, { recursive: true });
  
  // Create test HTML pages
  await createTestPages(testServerPath);
  
  console.log('✅ Test web server setup completed');
}

/**
 * Create test HTML pages
 */
async function createTestPages(testPath: string) {
  // Main test page
  const mainTestPage = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NativeMimic Test Page</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
    .selectable { background: #f0f8ff; padding: 10px; margin: 10px 0; }
    .long-text { column-count: 2; column-gap: 20px; }
  </style>
</head>
<body>
  <h1>NativeMimic Extension Test Page</h1>
  
  <div class="selectable" data-testid="short-text">
    This is a short text that can be selected for TTS testing.
  </div>
  
  <div class="selectable" data-testid="medium-text">
    This is a medium-length text passage that contains multiple sentences. 
    It should be long enough to test the TTS functionality properly while 
    still being manageable for automated testing scenarios.
  </div>
  
  <div class="selectable long-text" data-testid="long-text">
    This is a much longer text passage that spans multiple lines and contains 
    various punctuation marks, numbers like 123 and 456, and different types 
    of content. It includes sentences with varying complexity, some with 
    commas, others with semicolons; and even some with exclamation marks! 
    The purpose is to test how well the TTS system handles longer content 
    and whether there are any performance issues or memory leaks when 
    processing substantial amounts of text. This text should be sufficient 
    to trigger any edge cases in the text processing pipeline.
  </div>
  
  <div data-testid="multilingual-text">
    <p lang="en">English text for language detection testing.</p>
    <p lang="es">Texto en español para pruebas de detección de idioma.</p>
    <p lang="fr">Texte français pour les tests de détection de langue.</p>
  </div>
  
  <div data-testid="special-characters">
    Text with special characters: ñáéíóú, çñü, àèìòù, and symbols: @#$%^&*()
  </div>
  
  <div data-testid="numbers-and-dates">
    Numbers: 1, 2, 3, 100, 1,000, 1.5, 3.14159
    Dates: January 1, 2024, 01/01/2024, 2024-01-01
    Times: 3:30 PM, 15:30, 9:00 AM
  </div>
  
  <script>
    // Add test helpers
    window.testHelpers = {
      selectText: function(selector) {
        const element = document.querySelector(selector);
        if (element) {
          const range = document.createRange();
          range.selectNodeContents(element);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          return element.textContent;
        }
        return null;
      },
      
      clearSelection: function() {
        const selection = window.getSelection();
        selection.removeAllRanges();
      },
      
      waitForWidget: function(timeout = 5000) {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          const checkWidget = () => {
            const widget = document.querySelector('.nativemimic-test-widget');
            if (widget && widget.style.display !== 'none') {
              resolve(widget);
            } else if (Date.now() - startTime > timeout) {
              reject(new Error('Widget not found within timeout'));
            } else {
              setTimeout(checkWidget, 100);
            }
          };
          checkWidget();
        });
      }
    };
    
    // Log when page is ready
    document.addEventListener('DOMContentLoaded', () => {
      console.log('Test page loaded and ready');
      document.body.setAttribute('data-test-page-ready', 'true');
    });
  </script>
</body>
</html>
`;
  
  await writeFile(join(testPath, 'test-page.html'), mainTestPage);
  
  // Performance test page
  const performanceTestPage = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Test Page</title>
</head>
<body>
  <h1>Performance Test Page</h1>
  
  <div id="dynamic-content">
    <!-- Content will be dynamically generated for performance testing -->
  </div>
  
  <script>
    // Generate large amounts of content for performance testing
    function generateContent(textLength) {
      const content = document.getElementById('dynamic-content');
      const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(textLength / 50);
      
      for (let i = 0; i < 100; i++) {
        const div = document.createElement('div');
        div.className = 'test-content-block';
        div.textContent = \`Block \${i}: \${text}\`;
        div.setAttribute('data-block-id', i);
        content.appendChild(div);
      }
    }
    
    // Performance test helpers
    window.performanceHelpers = {
      generateLargeContent: () => generateContent(5000),
      clearContent: () => document.getElementById('dynamic-content').innerHTML = '',
      simulateMemoryLeak: () => {
        // Simulate memory leak by creating unreferenced DOM elements
        for (let i = 0; i < 1000; i++) {
          const element = document.createElement('div');
          element.innerHTML = 'Memory leak test element ' + i;
        }
      }
    };
  </script>
</body>
</html>
`;
  
  await writeFile(join(testPath, 'performance-test.html'), performanceTestPage);
}

/**
 * Create test data files
 */
async function createTestDataFiles() {
  console.log('📄 Creating test data files...');
  
  const testDataPath = resolve(__dirname, '../fixtures/data');
  await mkdir(testDataPath, { recursive: true });
  
  // Test configuration
  const testConfig = {
    endpoints: {
      tts: 'http://localhost:3000/api/tts',
      analytics: 'http://localhost:3000/api/analytics'
    },
    testUsers: [
      { id: 'test-user-1', email: 'test1@example.com' },
      { id: 'test-user-2', email: 'test2@example.com' }
    ],
    testVoices: [
      { id: 'en-US-Wavenet-D', name: 'English (US) Male', language: 'en-US' },
      { id: 'en-US-Wavenet-F', name: 'English (US) Female', language: 'en-US' },
      { id: 'es-ES-Wavenet-B', name: 'Spanish (Spain) Male', language: 'es-ES' }
    ]
  };
  
  await writeFile(
    join(testDataPath, 'test-config.json'),
    JSON.stringify(testConfig, null, 2)
  );
  
  console.log('✅ Test data files created');
}

/**
 * Setup browser extension test environment
 */
async function setupExtensionTestEnvironment() {
  console.log('🔧 Setting up extension test environment...');
  
  // Create extension testing utilities
  const utilsPath = resolve(__dirname, '../utils');
  await mkdir(utilsPath, { recursive: true });
  
  const extensionTestUtils = `
// Extension Test Utilities
export async function loadExtension(page, extensionPath) {
  // This would be implemented based on the browser type
  console.log('Loading extension from:', extensionPath);
}

export async function waitForExtensionReady(page, timeout = 10000) {
  await page.waitForFunction(
    () => document.body.hasAttribute('data-nativemimic-test'),
    { timeout }
  );
}

export async function selectTextAndTriggerWidget(page, selector) {
  await page.evaluate((sel) => {
    window.testHelpers?.selectText(sel);
  }, selector);
  
  // Wait for widget to appear
  await page.waitForSelector('.nativemimic-test-widget[style*="block"]', {
    timeout: 5000
  });
}
`;
  
  await writeFile(join(utilsPath, 'extension-test-utils.js'), extensionTestUtils);
  
  console.log('✅ Extension test environment setup completed');
}

export default globalSetup;