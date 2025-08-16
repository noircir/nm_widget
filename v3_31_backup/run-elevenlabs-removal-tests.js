#!/usr/bin/env node

/**
 * Test Runner for ElevenLabs Removal Functionality
 * Runs specific tests to verify the widget still works after ElevenLabs cleanup
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Running ElevenLabs Removal Tests...\n');

// Test configurations
const testConfigs = [
  {
    name: 'Unit Tests - ElevenLabs Removal',
    command: 'npx',
    args: ['jest', 'tests/unit/elevenlabs-removal.test.js', '--verbose', '--colors'],
    description: 'Testing ElevenLabs function stubs and fallback logic'
  },
  // E2E tests commented out - require Playwright browser automation setup
  // {
  //   name: 'E2E Tests - Speech Workflow',
  //   command: 'npx',
  //   args: ['jest', 'tests/e2e/speech-workflow-post-elevenlabs-removal.spec.js', '--verbose', '--colors'],
  //   description: 'Testing complete speech workflow in browser'
  // },
  {
    name: 'Existing Core Tests',
    command: 'npx',
    args: ['jest', 'tests/unit/quickspeak.test.js', '--verbose', '--colors'],
    description: 'Verifying existing functionality still works'
  }
];

async function runTest(config) {
  return new Promise((resolve, reject) => {
    console.log(`\n📋 ${config.name}`);
    console.log(`   ${config.description}\n`);

    const process = spawn(config.command, config.args, {
      stdio: 'inherit',
      cwd: __dirname
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${config.name} - PASSED\n`);
        resolve(true);
      } else {
        console.log(`❌ ${config.name} - FAILED (exit code ${code})\n`);
        resolve(false);
      }
    });

    process.on('error', (err) => {
      console.log(`💥 ${config.name} - ERROR: ${err.message}\n`);
      resolve(false);
    });
  });
}

async function runAllTests() {
  console.log('Starting ElevenLabs removal functionality tests...');
  console.log('=' .repeat(60));

  const results = [];
  
  for (const config of testConfigs) {
    const success = await runTest(config);
    results.push({ name: config.name, success });
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  let passedCount = 0;
  results.forEach(result => {
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} - ${result.name}`);
    if (result.success) passedCount++;
  });

  console.log(`\n🎯 Results: ${passedCount}/${results.length} test suites passed`);
  
  if (passedCount === results.length) {
    console.log('🎉 All tests passed! ElevenLabs removal was successful.');
    console.log('💡 You can now manually test the widget functionality.');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
    console.log('🔧 Fix the issues before proceeding with manual testing.');
  }

  return passedCount === results.length;
}

// Instructions for manual testing
function printManualTestingInstructions() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 MANUAL TESTING INSTRUCTIONS');
  console.log('='.repeat(60));
  
  console.log(`
🔍 After automated tests pass, manually verify:

1. **Load Extension in Chrome:**
   - Go to chrome://extensions/
   - Enable Developer mode  
   - Click "Load unpacked"
   - Select the mvp/ folder

2. **Test Basic Functionality:**
   - Open any webpage
   - Select some text
   - Widget should appear
   - Play button should work (Google TTS or system voices)
   - No ElevenLabs errors in console

3. **Test Voice Selection:**
   - Open voice dropdown
   - Should see Google TTS voices (if backend running) and system voices
   - Should NOT see any ElevenLabs voices
   - Voice selection should work without errors

4. **Test Speed Control:**
   - Adjust speed slider
   - Should work without ElevenLabs-related errors
   - Audio playback rate should change

5. **Test Cache Logging:**
   - Open browser console (F12)
   - Play same text twice
   - Should see "Google TTS Cost: $0.0000 (CACHED)" messages
   - Should NOT see ElevenLabs references

6. **Check for Errors:**
   - Monitor console for JavaScript errors
   - Should not see ElevenLabs-related errors
   - Extension should work smoothly

✅ If all manual tests pass, the ElevenLabs removal was successful!
❌ If issues found, report them for fixing before proceeding.
`);
}

// Run the tests
if (require.main === module) {
  runAllTests().then(allPassed => {
    printManualTestingInstructions();
    process.exit(allPassed ? 0 : 1);
  }).catch(err => {
    console.error('💥 Test runner error:', err);
    process.exit(1);
  });
}

module.exports = { runAllTests, printManualTestingInstructions };