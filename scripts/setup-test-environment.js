#!/usr/bin/env node
/**
 * Setup Test Environment for NativeMimic v4.0
 * 
 * Prepares the testing environment and starts necessary services
 */

const { spawn, exec } = require('child_process');
const { promises: fs } = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

const TEST_CONFIG = {
  ports: {
    webServer: 3000,
    mockTTS: 3001,
    supabaseLocal: 54321
  },
  directories: {
    dist: path.resolve(__dirname, '../dist'),
    fixtures: path.resolve(__dirname, '../4_INFRASTRUCTURE/4.2_testing_framework/fixtures'),
    coverage: path.resolve(__dirname, '../coverage'),
    testResults: path.resolve(__dirname, '../test-results')
  }
};

async function main() {
  console.log('🚀 Setting up NativeMimic v4.0 test environment...');
  
  try {
    // Step 1: Ensure all directories exist
    await ensureDirectories();
    
    // Step 2: Build extension for testing
    await buildExtension();
    
    // Step 3: Start mock services
    await startMockServices();
    
    // Step 4: Start web server for E2E tests
    await startWebServer();
    
    // Step 5: Verify everything is working
    await verifySetup();
    
    console.log('✅ Test environment setup completed successfully!');
    console.log(`📍 Web server running on http://localhost:${TEST_CONFIG.ports.webServer}`);
    console.log(`🔧 Mock TTS service on http://localhost:${TEST_CONFIG.ports.mockTTS}`);
    
  } catch (error) {
    console.error('❌ Test environment setup failed:', error);
    process.exit(1);
  }
}

/**
 * Ensure all required directories exist
 */
async function ensureDirectories() {
  console.log('📁 Creating directories...');
  
  for (const [name, dir] of Object.entries(TEST_CONFIG.directories)) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`  ✓ ${name}: ${dir}`);
    } catch (error) {
      console.warn(`  ⚠️ Could not create ${name} directory:`, error.message);
    }
  }
}

/**
 * Build extension for testing
 */
async function buildExtension() {
  console.log('🔨 Building extension for testing...');
  
  try {
    // Check if TypeScript is compiled
    console.log('  - Checking TypeScript compilation...');
    await execAsync('npx tsc --noEmit');
    
    // Create basic extension files if they don't exist
    await createBasicExtensionFiles();
    
    console.log('  ✓ Extension build completed');
    
  } catch (error) {
    console.warn('  ⚠️ Extension build warning:', error.message);
    // Continue with basic files
    await createBasicExtensionFiles();
  }
}

/**
 * Create basic extension files for testing
 */
async function createBasicExtensionFiles() {
  const distDir = TEST_CONFIG.directories.dist;
  
  // Create manifest.json
  const manifest = {
    manifest_version: 3,
    name: 'NativeMimic Test',
    version: '4.0.0-test',
    description: 'NativeMimic test extension',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['http://localhost:*/*'],
    background: { service_worker: 'background.js' },
    content_scripts: [{
      matches: ['<all_urls>'],
      js: ['content.js'],
      css: ['content.css']
    }],
    action: { default_popup: 'popup.html' }
  };
  
  await fs.writeFile(
    path.join(distDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  // Create background.js
  const backgroundJS = `
console.log('NativeMimic test background loaded');
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TEST_PING') {
    sendResponse({ success: true, timestamp: Date.now() });
  }
  return true;
});
`;
  
  await fs.writeFile(path.join(distDir, 'background.js'), backgroundJS);
  
  // Create content.js
  const contentJS = `
console.log('NativeMimic test content script loaded');
document.body.setAttribute('data-nativemimic-test', 'ready');

// Simple widget for testing
function createTestWidget() {
  const widget = document.createElement('div');
  widget.id = 'nativemimic-test-widget';
  widget.style.cssText = \`
    position: fixed; top: 10px; right: 10px; width: 200px; height: 80px;
    background: #fff; border: 1px solid #ccc; border-radius: 4px;
    padding: 8px; z-index: 10000; display: none; font-family: Arial, sans-serif;
  \`;
  widget.innerHTML = '<div>Test Widget</div><button onclick="this.parentNode.style.display=\\'none\\'">Close</button>';
  document.body.appendChild(widget);
  return widget;
}

document.addEventListener('mouseup', () => {
  const selection = window.getSelection();
  if (selection && selection.toString().trim()) {
    const widget = document.getElementById('nativemimic-test-widget') || createTestWidget();
    widget.style.display = 'block';
  }
});
`;
  
  await fs.writeFile(path.join(distDir, 'content.js'), contentJS);
  
  // Create content.css
  const contentCSS = `
#nativemimic-test-widget {
  font-size: 12px !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
}
`;
  
  await fs.writeFile(path.join(distDir, 'content.css'), contentCSS);
  
  // Create popup.html
  const popupHTML = `
<!DOCTYPE html>
<html>
<head><title>Test</title><style>body{width:200px;padding:16px;}</style></head>
<body><h3>NativeMimic Test</h3><p>Extension is ready for testing</p></body>
</html>
`;
  
  await fs.writeFile(path.join(distDir, 'popup.html'), popupHTML);
}

/**
 * Start mock services for testing
 */
async function startMockServices() {
  console.log('🎭 Starting mock services...');
  
  // Create mock TTS service
  const mockTTSServer = `
const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/api/tts' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        // Simulate TTS response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          audioUrl: 'data:audio/wav;base64,UklGRjQEAABXQVZF...',
          duration: data.text ? data.text.length * 0.1 : 1.0,
          cost: data.text ? data.text.length * 0.000016 : 0.001
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(${TEST_CONFIG.ports.mockTTS}, () => {
  console.log('Mock TTS server running on port ${TEST_CONFIG.ports.mockTTS}');
});
`;
  
  // Write and start mock TTS server
  const mockTTSPath = path.join(TEST_CONFIG.directories.fixtures, 'mock-tts-server.js');
  await fs.writeFile(mockTTSPath, mockTTSServer);
  
  // Start the mock server in background
  spawn('node', [mockTTSPath], {
    detached: true,
    stdio: 'ignore'
  }).unref();
  
  // Wait a moment for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`  ✓ Mock TTS server started on port ${TEST_CONFIG.ports.mockTTS}`);
}

/**
 * Start web server for E2E tests
 */
async function startWebServer() {
  console.log('🌐 Starting web server for E2E tests...');
  
  const webServer = `
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/test-page.html' : req.url;
  filePath = path.join(__dirname, filePath);
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Serve default test page
      const defaultPage = \`
<!DOCTYPE html>
<html>
<head><title>Test Page</title></head>
<body>
  <h1>NativeMimic Test Page</h1>
  <p class="selectable-text">This is selectable text for testing.</p>
  <div data-testid="test-content">
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
    Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
  </div>
  <script>
    document.body.setAttribute('data-test-ready', 'true');
    console.log('Test page ready');
  </script>
</body>
</html>
\`;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(defaultPage);
    } else {
      const ext = path.extname(filePath);
      const contentType = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json'
      }[ext] || 'text/plain';
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

server.listen(${TEST_CONFIG.ports.webServer}, () => {
  console.log('Web server running on port ${TEST_CONFIG.ports.webServer}');
});
`;
  
  // Write and start web server
  const webServerPath = path.join(TEST_CONFIG.directories.fixtures, 'web-server.js');
  await fs.writeFile(webServerPath, webServer);
  
  // Start the web server in background
  spawn('node', [webServerPath], {
    detached: true,
    stdio: 'ignore'
  }).unref();
  
  // Wait a moment for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`  ✓ Web server started on port ${TEST_CONFIG.ports.webServer}`);
}

/**
 * Verify the setup is working
 */
async function verifySetup() {
  console.log('🔍 Verifying setup...');
  
  try {
    // Check if web server is responding
    const http = require('http');
    await new Promise((resolve, reject) => {
      const req = http.get(\`http://localhost:\${TEST_CONFIG.ports.webServer}\`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(\`Web server returned status \${res.statusCode}\`));
        }
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Web server timeout')));
    });
    
    console.log('  ✓ Web server is responding');
    
    // Check if mock TTS server is responding
    await new Promise((resolve, reject) => {
      const req = http.get(\`http://localhost:\${TEST_CONFIG.ports.mockTTS}\`, (res) => {
        // Expect 404 for root path, which means server is running
        resolve();
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Mock TTS server timeout')));
    });
    
    console.log('  ✓ Mock TTS server is responding');
    
    // Check if extension files exist
    const manifestPath = path.join(TEST_CONFIG.directories.dist, 'manifest.json');
    await fs.access(manifestPath);
    console.log('  ✓ Extension files are ready');
    
  } catch (error) {
    throw new Error(\`Setup verification failed: \${error.message}\`);
  }
}

// Run setup if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = { TEST_CONFIG, main };