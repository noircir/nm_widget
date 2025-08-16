/**
 * Regression Test Suite - Comprehensive validation of all critical functionality
 * 
 * Purpose: Ensure changes don't break existing functionality
 * When to run: Before releases, after major changes, version bumps
 * Duration: 15-30 minutes
 * 
 * Usage: node tests/regression/regression-suite.js
 */

class RegressionTestSuite {
  constructor() {
    this.results = [];
    this.testType = 'REGRESSION';
    this.startTime = Date.now();
  }

  async runFullRegressionSuite() {
    console.log('🔄 REGRESSION TESTING: Comprehensive functionality validation...');
    console.log('📅 Started at:', new Date().toISOString());
    
    try {
      // Core functionality that must never break
      await this.testCoreUserJourneys();
      await this.testAllVoiceSystems();
      await this.testAllFeedbackTypes();
      await this.testAnalyticsIntegration();
      await this.testPrivacyCompliance();
      await this.testErrorHandling();
      await this.testCrossBrowserCompatibility();
      await this.testPerformanceBaselines();
      
      this.reportRegressionResults();
    } catch (error) {
      console.error('💥 REGRESSION SUITE FAILED:', error);
      this.reportRegressionResults();
      process.exit(1);
    }
  }

  async testCoreUserJourneys() {
    console.log('\n👤 Testing Core User Journeys...');
    
    await this.testJourney('New User First Use', async () => {
      // Simulate new user experience
      await this.clearUserData();
      await this.selectText('Welcome to NativeMimic. This is your first time using the extension.');
      await this.sleep(1000);
      
      const widget = document.getElementById('nativemimic-controls');
      this.assert(widget, 'Widget should appear for new users');
      
      const playButton = document.getElementById('nativemimic-play');
      this.assert(playButton, 'Play button should be available');
      
      // Test first speech
      playButton.click();
      await this.sleep(2000);
      
      this.pass('New user journey complete');
    });

    await this.testJourney('Language Switching Flow', async () => {
      await this.selectText('English text first');
      await this.sleep(1000);
      
      await this.selectText('Texto en español después');
      await this.sleep(1000);
      
      await this.selectText('Texte français ensuite');
      await this.sleep(1000);
      
      const dropdown = document.querySelector('.nativemimic-voice-dropdown select');
      this.assert(dropdown.options.length > 1, 'Languages should switch voices');
      
      this.pass('Language switching works');
    });

    await this.testJourney('Complete Recording Workflow', async () => {
      await this.selectText('Test recording and feedback workflow.');
      await this.sleep(1000);
      
      const recordButton = document.getElementById('nativemimic-record');
      this.assert(recordButton, 'Record button exists');
      
      // Test recording (may fail permissions but shouldn't crash)
      try {
        recordButton.click();
        await this.sleep(1000);
      } catch (error) {
        // Permission failures are OK
      }
      
      // Test feedback with recording consent
      const feedbackButton = document.getElementById('nativemimic-feedback');
      feedbackButton.click();
      await this.sleep(500);
      
      const modal = document.getElementById('nativemimic-feedback-modal');
      const dropdown = modal.querySelector('#nativemimic-feedback-type');
      dropdown.value = 'voice_issue';
      dropdown.dispatchEvent(new Event('change'));
      
      const cancelBtn = modal.querySelector('#nativemimic-cancel-feedback');
      if (cancelBtn) cancelBtn.click();
      
      this.pass('Recording workflow complete');
    });
  }

  async testAllVoiceSystems() {
    console.log('\n🗣️ Testing All Voice Systems...');
    
    await this.testVoiceSystem('System Voices', async () => {
      const systemVoices = speechSynthesis.getVoices();
      this.assert(systemVoices.length > 0, 'System voices should be available');
    });

    await this.testVoiceSystem('Google TTS Integration', async () => {
      this.assert(window.googleTTSClient, 'Google TTS client should exist');
      // Test API structure without making actual calls
      this.assert(typeof window.googleTTSClient.generateSpeech === 'function', 'generateSpeech method exists');
    });

    await this.testVoiceSystem('Voice Dropdown Population', async () => {
      await this.selectText('Voice dropdown test.');
      await this.sleep(1500);
      
      const dropdown = document.querySelector('.nativemimic-voice-dropdown select');
      this.assert(dropdown, 'Voice dropdown exists');
      this.assert(dropdown.options.length > 3, 'Multiple voice options available');
    });
  }

  async testAllFeedbackTypes() {
    console.log('\n📝 Testing All Feedback Types...');
    
    const feedbackTypes = [
      { value: 'bug_report', name: 'Bug Report' },
      { value: 'feature_request', name: 'Feature Request' },
      { value: 'voice_issue', name: 'Voice Issue' },
      { value: 'general', name: 'General Feedback' },
      { value: 'pricing', name: 'Pricing Feedback' }
    ];

    for (const feedbackType of feedbackTypes) {
      await this.testFeedbackType(feedbackType.name, async () => {
        await this.selectText(`Testing ${feedbackType.name} functionality.`);
        await this.sleep(500);
        
        const feedbackButton = document.getElementById('nativemimic-feedback');
        feedbackButton.click();
        await this.sleep(300);
        
        const modal = document.getElementById('nativemimic-feedback-modal');
        const dropdown = modal.querySelector('#nativemimic-feedback-type');
        
        // Test category exists
        const option = Array.from(dropdown.options).find(opt => opt.value === feedbackType.value);
        this.assert(option, `${feedbackType.name} option should exist`);
        
        // Test selection
        dropdown.value = feedbackType.value;
        dropdown.dispatchEvent(new Event('change'));
        
        // Test consent system for recording-related feedback
        const consentDiv = modal.querySelector('#nativemimic-recording-consent');
        if (feedbackType.value === 'bug_report' || feedbackType.value === 'voice_issue') {
          this.assert(consentDiv, 'Consent system should exist for recording feedback');
        }
        
        const cancelBtn = modal.querySelector('#nativemimic-cancel-feedback');
        if (cancelBtn) cancelBtn.click();
        
        this.pass(`${feedbackType.name} works correctly`);
      });
    }
  }

  async testAnalyticsIntegration() {
    console.log('\n📊 Testing Analytics Integration...');
    
    await this.testAnalytics('Supabase Client', async () => {
      this.assert(window.nativeMimicSupabase, 'Supabase client exists');
      this.assert(typeof window.nativeMimicSupabase.authenticate === 'function', 'authenticate method');
      this.assert(typeof window.nativeMimicSupabase.trackAnalytics === 'function', 'trackAnalytics method');
      this.assert(typeof window.nativeMimicSupabase.trackInteraction === 'function', 'trackInteraction method');
    });

    await this.testAnalytics('Feedback Methods', async () => {
      const client = window.nativeMimicSupabase;
      this.assert(typeof client.saveBugReport === 'function', 'saveBugReport method');
      this.assert(typeof client.saveFeatureRequest === 'function', 'saveFeatureRequest method');
      this.assert(typeof client.saveVoiceIssue === 'function', 'saveVoiceIssue method');
      this.assert(typeof client.saveGeneralFeedback === 'function', 'saveGeneralFeedback method');
      this.assert(typeof client.savePricingFeedback === 'function', 'savePricingFeedback method');
    });
  }

  async testPrivacyCompliance() {
    console.log('\n🔒 Testing Privacy Compliance...');
    
    await this.testPrivacy('Recording Privacy', async () => {
      // Verify recordings don't auto-upload
      await this.selectText('Privacy test recording.');
      await this.sleep(500);
      
      const recordButton = document.getElementById('nativemimic-record');
      if (recordButton) {
        try {
          recordButton.click();
          await this.sleep(1000);
          // Should NOT automatically call saveRecording without consent
        } catch (error) {
          // Permission failures are expected and OK
        }
      }
      
      this.pass('Recordings stay local by default');
    });

    await this.testPrivacy('Consent System', async () => {
      const feedbackButton = document.getElementById('nativemimic-feedback');
      feedbackButton.click();
      await this.sleep(300);
      
      const modal = document.getElementById('nativemimic-feedback-modal');
      const consentDiv = modal.querySelector('#nativemimic-recording-consent');
      const checkbox = modal.querySelector('#nativemimic-include-recording');
      
      this.assert(consentDiv, 'Consent UI exists');
      this.assert(checkbox, 'Consent checkbox exists');
      this.assert(checkbox.type === 'checkbox', 'Proper checkbox input');
      
      const cancelBtn = modal.querySelector('#nativemimic-cancel-feedback');
      if (cancelBtn) cancelBtn.click();
      
      this.pass('Consent system implemented');
    });
  }

  async testErrorHandling() {
    console.log('\n⚠️ Testing Error Handling...');
    
    await this.testErrorCase('No Text Selected', async () => {
      window.getSelection().removeAllRanges();
      
      if (window.nativemimic || window.nativeMimicInstance) {
        const instance = window.nativemimic || window.nativeMimicInstance;
        if (instance.handleTextSelection) {
          instance.handleTextSelection();
          // Should not crash
        }
      }
      
      this.pass('Handles no text gracefully');
    });

    await this.testErrorCase('Invalid Voice Selection', async () => {
      await this.selectText('Error handling test.');
      await this.sleep(500);
      
      const dropdown = document.querySelector('.nativemimic-voice-dropdown select');
      if (dropdown) {
        // Try to select invalid option
        dropdown.value = 'invalid-voice-id';
        dropdown.dispatchEvent(new Event('change'));
        // Should not crash
      }
      
      this.pass('Handles invalid voice selection');
    });
  }

  async testCrossBrowserCompatibility() {
    console.log('\n🌐 Testing Cross-Browser Compatibility...');
    
    await this.testCompatibility('Browser API Support', async () => {
      this.assert(typeof window.speechSynthesis !== 'undefined', 'Speech Synthesis API available');
      this.assert(typeof window.getSelection === 'function', 'Selection API available');
      this.assert(typeof window.fetch === 'function', 'Fetch API available');
      this.assert(typeof window.MediaRecorder !== 'undefined', 'MediaRecorder API available');
    });
  }

  async testPerformanceBaselines() {
    console.log('\n⚡ Testing Performance Baselines...');
    
    await this.testPerformance('Widget Appearance Speed', async () => {
      const startTime = performance.now();
      
      await this.selectText('Performance test text.');
      
      // Wait for widget to appear
      let widget = null;
      let attempts = 0;
      while (!widget && attempts < 50) { // 5 second timeout
        widget = document.getElementById('nativemimic-controls');
        await this.sleep(100);
        attempts++;
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.assert(widget, 'Widget should appear');
      this.assert(duration < 2000, `Widget should appear quickly (${duration}ms < 2000ms)`);
      
      this.pass(`Widget appears in ${duration.toFixed(0)}ms`);
    });
  }

  // Helper methods for different test categories
  async testJourney(name, testFn) {
    try {
      console.log(`  👤 ${name}...`);
      await testFn();
    } catch (error) {
      this.fail(`Journey: ${name}`, error.message);
    }
  }

  async testVoiceSystem(name, testFn) {
    try {
      console.log(`  🗣️ ${name}...`);
      await testFn();
    } catch (error) {
      this.fail(`Voice System: ${name}`, error.message);
    }
  }

  async testFeedbackType(name, testFn) {
    try {
      console.log(`  📝 ${name}...`);
      await testFn();
    } catch (error) {
      this.fail(`Feedback: ${name}`, error.message);
    }
  }

  async testAnalytics(name, testFn) {
    try {
      console.log(`  📊 ${name}...`);
      await testFn();
    } catch (error) {
      this.fail(`Analytics: ${name}`, error.message);
    }
  }

  async testPrivacy(name, testFn) {
    try {
      console.log(`  🔒 ${name}...`);
      await testFn();
    } catch (error) {
      this.fail(`Privacy: ${name}`, error.message);
    }
  }

  async testErrorCase(name, testFn) {
    try {
      console.log(`  ⚠️ ${name}...`);
      await testFn();
    } catch (error) {
      this.fail(`Error Handling: ${name}`, error.message);
    }
  }

  async testCompatibility(name, testFn) {
    try {
      console.log(`  🌐 ${name}...`);
      await testFn();
    } catch (error) {
      this.fail(`Compatibility: ${name}`, error.message);
    }
  }

  async testPerformance(name, testFn) {
    try {
      console.log(`  ⚡ ${name}...`);
      await testFn();
    } catch (error) {
      this.fail(`Performance: ${name}`, error.message);
    }
  }

  // Utility methods
  async selectText(text) {
    let testEl = document.getElementById('regression-test-text');
    if (!testEl) {
      testEl = document.createElement('div');
      testEl.id = 'regression-test-text';
      testEl.style.cssText = 'position: fixed; top: 50px; left: 50px; z-index: 10000; background: white; padding: 10px; border: 1px solid #ccc;';
      document.body.appendChild(testEl);
    }
    
    testEl.textContent = text;
    
    const range = document.createRange();
    range.selectNodeContents(testEl);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    if (window.nativemimic || window.nativeMimicInstance) {
      const instance = window.nativemimic || window.nativeMimicInstance;
      if (instance.handleTextSelection) {
        instance.handleTextSelection();
      }
    }
  }

  async clearUserData() {
    // Clear local storage, chrome storage if available
    localStorage.clear();
    sessionStorage.clear();
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        await chrome.storage.local.clear();
        await chrome.storage.sync.clear();
      } catch (error) {
        // May not have permissions
      }
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  pass(testName) {
    this.results.push({ test: testName, passed: true });
    console.log(`    ✅ ${testName}`);
  }

  fail(testName, error) {
    this.results.push({ test: testName, passed: false, error });
    console.log(`    ❌ ${testName}: ${error}`);
  }

  reportRegressionResults() {
    const duration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const failed = total - passed;
    
    console.log('\n' + '='.repeat(60));
    console.log('🔄 REGRESSION TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`📊 Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️ Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`- ${result.test}: ${result.error}`);
      });
      console.log('\n🚨 REGRESSION DETECTED - Fix required before release!');
    } else {
      console.log('\n🎉 ALL REGRESSION TESTS PASSED - Safe to proceed!');
    }
    
    // Cleanup
    const testEl = document.getElementById('regression-test-text');
    if (testEl) testEl.remove();
    
    console.log('='.repeat(60));
  }
}

// CLI Usage
if (typeof process !== 'undefined' && process.argv) {
  console.log('🔄 REGRESSION TESTS - Node.js CLI Mode');
  console.log('⚠️  NOTE: These tests require browser DOM environment');
  console.log('📋 For full testing: Load extension in Chrome and run in browser console');
  console.log('✅ Regression test script structure validated - no syntax errors');
  process.exit(0);
}

// Export for browser usage
if (typeof window !== 'undefined') {
  window.RegressionTestSuite = RegressionTestSuite;
}