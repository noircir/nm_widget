#!/usr/bin/env node

/**
 * NativeMimic Smoke Test Runner
 * 
 * Quick script to run smoke tests and report results
 * Usage: node run-smoke-tests.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 NativeMimic Smoke Test Runner');
console.log('='.repeat(50));
console.log('📋 MANUAL TESTING CHECKLIST:');
console.log('');
console.log('SETUP:');
console.log('1. Load extension in Chrome/Brave (chrome://extensions)');
console.log('2. Open 3 test tabs (different websites)');
console.log('3. Copy smoke-tests.js content to one tab\'s console');
console.log('4. Run: const tests = new NativeMimicSmokeTests(); tests.runAllTests()');
console.log('');
console.log('CRITICAL TESTS TO VERIFY:');
console.log('✅ Widget appears on text selection in all 3 tabs');
console.log('✅ Google TTS voices load in dropdown (>10 voices)');
console.log('✅ System voices load as fallback (>1 voice)');
console.log('✅ Play button works with audio output');
console.log('✅ Speed slider adjustments work');
console.log('✅ Enable/disable hides widgets in ALL tabs immediately');
console.log('✅ Settings persist after page refresh');
console.log('✅ No JavaScript console errors');
console.log('');
console.log('BROWSER COMPATIBILITY:');
console.log('✅ Chrome: All features work');
console.log('⚠️ Brave: Google TTS may fail (localhost blocked)');
console.log('');
console.log('EXPECTED SUCCESS RATE: >90%');
console.log('🚨 If <90% success rate, DO NOT COMMIT changes!');
console.log('');
console.log('='.repeat(50));
console.log('🎯 Run tests AFTER EVERY code change!');

// Check if smoke-tests.js exists
const smokeTestPath = path.join(__dirname, 'smoke-tests.js');
if (fs.existsSync(smokeTestPath)) {
  console.log('✅ smoke-tests.js found at:', smokeTestPath);
} else {
  console.log('❌ smoke-tests.js not found!');
  process.exit(1);
}

// Check if extension files exist
const extensionFiles = [
  'mvp/manifest.json',
  'mvp/content.js',
  'mvp/background.js',
  'mvp/popup.js'
];

console.log('\n📁 Extension Files Check:');
extensionFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING!`);
  }
});

console.log('\n🔄 Next Steps:');
console.log('1. Load extension from mvp/ folder');
console.log('2. Run smoke tests in browser console');
console.log('3. Fix any failing tests before committing');
console.log('4. Update version numbers if tests pass');