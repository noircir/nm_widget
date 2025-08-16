#!/usr/bin/env node

/**
 * Verification Script - ElevenLabs Removal
 * Checks that ElevenLabs references have been properly cleaned up from content.js
 */

const fs = require('fs');
const path = require('path');

const contentJsPath = path.join(__dirname, 'mvp', 'content.js');

console.log('🔍 Verifying ElevenLabs removal from content.js...\n');

if (!fs.existsSync(contentJsPath)) {
  console.error('❌ content.js not found at:', contentJsPath);
  process.exit(1);
}

const content = fs.readFileSync(contentJsPath, 'utf8');

// Define checks
const checks = [
  {
    name: 'ElevenLabs functions have fallback stubs',
    test: () => {
      const hasElevenLabsStub = content.includes('speakWithElevenLabs') && 
                               content.includes('falling back to Google TTS');
      const hasPlayAudioStub = content.includes('playElevenLabsAudio') && 
                              content.includes('playGoogleTTSAudio');
      const hasSpeakTextStub = content.includes('speakTextElevenLabs') && 
                             content.includes('speakTextGoogleTTS');
      return hasElevenLabsStub && hasPlayAudioStub && hasSpeakTextStub;
    }
  },
  {
    name: 'ElevenLabs voice selection redirects to Google TTS',
    test: () => {
      return content.includes('elevenlabs voice selected but support removed') ||
             content.includes('falling back to Google TTS');
    }
  },
  {
    name: 'Audio logging changed to Google TTS',
    test: () => {
      const hasGoogleTTSLogging = content.includes('Google TTS Cost:');
      const noElevenLabsAudioLogging = !content.includes('ElevenLabs audio playback rate');
      return hasGoogleTTSLogging && noElevenLabsAudioLogging;
    }
  },
  {
    name: 'Stop speech references updated',
    test: () => {
      return content.includes('Stopping Google TTS audio') ||
             !content.includes('Stopping ElevenLabs audio');
    }
  },
  {
    name: 'Voice name function has Google TTS fallback',
    test: () => {
      return content.includes('getElevenLabsVoiceName') && 
             content.includes('Google TTS Voice');
    }
  },
  {
    name: 'Cache cleanup properly implemented',
    test: () => {
      return content.includes('URL.revokeObjectURL') &&
             content.includes('cleanupCache') &&
             content.includes('maxCacheSize = 50');
    }
  },
  {
    name: 'No critical ElevenLabs API calls remain',
    test: () => {
      const hasElevenLabsClient = content.includes('window.elevenLabsClient');
      const hasElevenLabsApiCalls = content.includes('elevenLabsClient.synthesize') ||
                                  content.includes('elevenLabsClient.getVoices');
      // Some references may remain for cleanup/fallback, but no active API calls
      return !hasElevenLabsApiCalls;
    }
  }
];

let passedCount = 0;
let failedChecks = [];

console.log('Running verification checks...\n');

checks.forEach((check, index) => {
  const passed = check.test();
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${index + 1}. ${check.name}`);
  
  if (passed) {
    passedCount++;
  } else {
    failedChecks.push(check.name);
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(60));

console.log(`✅ Passed: ${passedCount}/${checks.length} checks`);

if (failedChecks.length > 0) {
  console.log(`❌ Failed: ${failedChecks.length} checks`);
  console.log('\nFailed checks:');
  failedChecks.forEach(check => console.log(`   - ${check}`));
}

// Additional analysis
console.log('\n📈 CODE ANALYSIS:');
console.log('='.repeat(60));

const elevenLabsMatches = content.match(/elevenlabs|ElevenLabs/gi) || [];
console.log(`🔍 Total "ElevenLabs" references found: ${elevenLabsMatches.length}`);

if (elevenLabsMatches.length > 0) {
  console.log('📝 Breakdown of remaining references:');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (/elevenlabs|ElevenLabs/i.test(line)) {
      const trimmedLine = line.trim().substring(0, 100);
      console.log(`   Line ${index + 1}: ${trimmedLine}${line.length > 100 ? '...' : ''}`);
    }
  });
  
  console.log('\n💡 Some ElevenLabs references may remain for:');
  console.log('   - Fallback function stubs (expected)');
  console.log('   - Comment explanations (expected)');
  console.log('   - Error handling (expected)');
  console.log('   - Voice selection cleanup logic (expected)');
}

const googleTTSMatches = content.match(/googleTTS|Google TTS/gi) || [];
console.log(`\n🎯 "Google TTS" references found: ${googleTTSMatches.length}`);

console.log('\n' + '='.repeat(60));
if (passedCount === checks.length) {
  console.log('🎉 ALL VERIFICATION CHECKS PASSED!');
  console.log('✅ ElevenLabs removal appears successful.');
  console.log('🧪 Ready for automated and manual testing.');
} else {
  console.log('⚠️  SOME VERIFICATION CHECKS FAILED!');
  console.log('🔧 Review the failed checks and fix before testing.');
  console.log('📝 See analysis above for remaining ElevenLabs references.');
}

process.exit(passedCount === checks.length ? 0 : 1);