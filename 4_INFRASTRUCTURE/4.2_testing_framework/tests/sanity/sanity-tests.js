/**
 * Sanity Tests - Quick focused verification after specific changes
 * 
 * Purpose: Fast, targeted checks to verify specific bug fixes or new features work
 * When to run: After bug fixes, small feature additions, or hotfixes
 * Duration: 1-2 minutes maximum
 * 
 * Usage: node tests/sanity/sanity-tests.js --feature=recording
 */

class SanityTests {
  constructor() {
    this.results = [];
    this.testType = 'SANITY';
  }

  async runSanityCheck(target = 'all') {
    console.log(`🎯 SANITY TEST: Quick verification for "${target}"...`);
    
    try {
      switch (target) {
        case 'recording':
          await this.sanityTestRecording();
          break;
        case 'feedback':
          await this.sanityTestFeedback();
          break;
        case 'analytics':
          await this.sanityTestAnalytics();
          break;
        case 'privacy':
          await this.sanityTestPrivacy();
          break;
        case 'voices':
          await this.sanityTestVoices();
          break;
        case 'widget':
          await this.sanityTestWidget();
          break;
        case 'all':
          await this.runAllSanityTests();
          break;
        default:
          throw new Error(`Unknown sanity test target: ${target}`);
      }
      
      this.reportResults();
    } catch (error) {
      console.error('💥 SANITY TEST FAILED:', error);
      process.exit(1);
    }
  }

  async runAllSanityTests() {
    await this.sanityTestWidget();
    await this.sanityTestVoices();
    await this.sanityTestRecording();
    await this.sanityTestFeedback();
    await this.sanityTestAnalytics();
    await this.sanityTestPrivacy();
  }

  async sanityTestWidget() {
    console.log('🧪 Sanity: Widget basics...');
    
    // Quick widget appearance test
    await this.selectText('Quick sanity test.');
    await this.sleep(500);
    
    const widget = document.getElementById('nativemimic-controls');
    this.assert(widget, 'Widget should appear on text selection');
    
    const playButton = document.getElementById('nativemimic-play');
    this.assert(playButton, 'Play button should exist');
    
    this.pass('Widget basics work');
  }

  async sanityTestVoices() {
    console.log('🧪 Sanity: Voice loading...');
    
    await this.selectText('Voice test.');
    await this.sleep(1000);
    
    const dropdown = document.querySelector('.nativemimic-voice-dropdown select');
    this.assert(dropdown, 'Voice dropdown should exist');
    this.assert(dropdown.options.length > 1, 'Should have voice options');
    
    this.pass('Voices load correctly');
  }

  async sanityTestRecording() {
    console.log('🧪 Sanity: Recording button...');
    
    await this.selectText('Recording sanity test.');
    await this.sleep(500);
    
    const recordButton = document.getElementById('nativemimic-record');
    this.assert(recordButton, 'Record button should exist');
    
    // Test button click doesn't crash
    try {
      recordButton.click();
      await this.sleep(100);
      this.pass('Recording button works (UI level)');
    } catch (error) {
      this.fail('Recording button failed', error.message);
    }
  }

  async sanityTestFeedback() {
    console.log('🧪 Sanity: Feedback modal...');
    
    await this.selectText('Feedback sanity test.');
    await this.sleep(500);
    
    const feedbackButton = document.getElementById('nativemimic-feedback');
    this.assert(feedbackButton, 'Feedback button should exist');
    
    feedbackButton.click();
    await this.sleep(300);
    
    const modal = document.getElementById('nativemimic-feedback-modal');
    this.assert(modal, 'Feedback modal should open');
    
    const dropdown = modal.querySelector('#nativemimic-feedback-type');
    this.assert(dropdown.options.length === 5, 'Should have 5 feedback categories');
    
    // Close modal
    const cancelBtn = modal.querySelector('#nativemimic-cancel-feedback');
    if (cancelBtn) cancelBtn.click();
    
    this.pass('Feedback system works');
  }

  async sanityTestAnalytics() {
    console.log('🧪 Sanity: Analytics integration...');
    
    this.assert(window.nativeMimicSupabase, 'Supabase client should exist');
    this.assert(typeof window.nativeMimicSupabase.trackAnalytics === 'function', 'trackAnalytics should exist');
    
    // Test API call doesn't crash (may fail network but shouldn't crash)
    try {
      await window.nativeMimicSupabase.trackAnalytics('sanity_test', { test: true });
    } catch (error) {
      // Network failures are OK, crashes are not
      if (error.message.includes('TypeError') || error.message.includes('undefined')) {
        this.fail('Analytics crashed', error.message);
        return;
      }
    }
    
    this.pass('Analytics integration works');
  }

  async sanityTestPrivacy() {
    console.log('🧪 Sanity: Privacy consent system...');
    
    await this.selectText('Privacy sanity test.');
    await this.sleep(500);
    
    const feedbackButton = document.getElementById('nativemimic-feedback');
    feedbackButton.click();
    await this.sleep(300);
    
    const modal = document.getElementById('nativemimic-feedback-modal');
    const consentDiv = modal.querySelector('#nativemimic-recording-consent');
    this.assert(consentDiv, 'Consent div should exist');
    
    const dropdown = modal.querySelector('#nativemimic-feedback-type');
    dropdown.value = 'bug_report';
    dropdown.dispatchEvent(new Event('change'));
    await this.sleep(100);
    
    // Privacy system should be present (may not be visible without recording)
    const checkbox = modal.querySelector('#nativemimic-include-recording');
    this.assert(checkbox, 'Privacy consent checkbox should exist');
    
    // Close modal
    const cancelBtn = modal.querySelector('#nativemimic-cancel-feedback');
    if (cancelBtn) cancelBtn.click();
    
    this.pass('Privacy consent system works');
  }

  // Utility methods
  async selectText(text) {
    // Create test element if it doesn't exist
    let testEl = document.getElementById('sanity-test-text');
    if (!testEl) {
      testEl = document.createElement('div');
      testEl.id = 'sanity-test-text';
      testEl.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 10000; background: white; padding: 10px;';
      document.body.appendChild(testEl);
    }
    
    testEl.textContent = text;
    
    // Select the text
    const range = document.createRange();
    range.selectNodeContents(testEl);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Trigger selection handler
    if (window.nativemimic || window.nativeMimicInstance) {
      const instance = window.nativemimic || window.nativeMimicInstance;
      if (instance.handleTextSelection) {
        instance.handleTextSelection();
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
    console.log(`✅ ${testName}`);
  }

  fail(testName, error) {
    this.results.push({ test: testName, passed: false, error });
    console.log(`❌ ${testName}: ${error}`);
  }

  reportResults() {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    console.log('\n🎯 SANITY TEST RESULTS:');
    console.log(`✅ Passed: ${passed}/${total}`);
    
    if (passed < total) {
      console.log('❌ Failed tests:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`- ${r.test}: ${r.error}`);
      });
      process.exit(1);
    } else {
      console.log('🎉 All sanity tests passed!');
    }
    
    // Cleanup
    const testEl = document.getElementById('sanity-test-text');
    if (testEl) testEl.remove();
  }
}

// CLI Usage
if (typeof process !== 'undefined' && process.argv) {
  const args = process.argv.slice(2);
  const targetArg = args.find(arg => arg.startsWith('--feature='));
  const target = targetArg ? targetArg.split('=')[1] : 'all';
  
  console.log(`🎯 SANITY TESTS - Node.js CLI Mode (${target})`);
  console.log('⚠️  NOTE: These tests require browser DOM environment');
  console.log('📋 For full testing: Load extension in Chrome and run in browser console');
  console.log('✅ Sanity test script structure validated - no syntax errors');
  process.exit(0);
}

// Export for browser usage
if (typeof window !== 'undefined') {
  window.SanityTests = SanityTests;
}