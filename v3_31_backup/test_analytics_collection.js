// Analytics Collection Test Script
// This script tests that all analytics data is being properly collected after fixes

class AnalyticsCollectionTest {
  constructor() {
    this.testResults = [];
    this.userId = null;
  }

  async runAllTests() {
    console.log('🧪 Starting Analytics Collection Test Suite...');
    
    try {
      await this.testBasicAnalyticsLogging();
      await this.testSpeechEventsTracking();
      await this.testRecordingsStorage();
      await this.testWidgetSettingsData();
      await this.testCostTracking();
      
      this.printTestResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  async testBasicAnalyticsLogging() {
    console.log('\n📊 Testing Basic Analytics Logging...');
    
    // Test 1: Verify Supabase client is initialized (check multiple possible locations)
    const supabaseClient = window.nativeMimicSupabase || window.supabaseClient;
    if (supabaseClient) {
      this.logResult('✅ Supabase client initialized');
    } else {
      this.logResult('❌ Supabase client not initialized (check if extension is loaded)');
      return;
    }

    // Test 2: Test authentication
    try {
      await supabaseClient.authenticate();
      this.userId = supabaseClient.userId;
      this.logResult(`✅ User authentication successful: ${this.userId?.substring(0, 8)}...`);
    } catch (error) {
      this.logResult(`❌ User authentication failed: ${error.message}`);
      return;
    }

    // Test 3: Test basic analytics tracking
    try {
      await supabaseClient.trackAnalytics('test_event', {
        test: true,
        timestamp: Date.now()
      });
      this.logResult('✅ Basic analytics tracking successful');
    } catch (error) {
      this.logResult(`❌ Basic analytics tracking failed: ${error.message}`);
    }
  }

  async testSpeechEventsTracking() {
    console.log('\n🗣️ Testing Speech Events Tracking...');

    // Test getWidgetSettings returns complete data (try multiple possible locations)
    const nativeMimicInstance = window.nativeMimicInstance || window.nativemimic || window.speechController;
    const supabaseClient = window.nativeMimicSupabase || window.supabaseClient;
    
    if (nativeMimicInstance && typeof nativeMimicInstance.getWidgetSettings === 'function') {
      const settings = nativeMimicInstance.getWidgetSettings();
      
      // Check if all required analytics data is present
      const requiredFields = ['speed', 'voice', 'selectedVoice', 'language', 'cost', 'cached'];
      const missingFields = requiredFields.filter(field => settings[field] === undefined);
      
      if (missingFields.length === 0) {
        this.logResult('✅ Widget settings contain all required analytics data');
        console.log('Settings data:', settings);
      } else {
        this.logResult(`❌ Widget settings missing fields: ${missingFields.join(', ')}`);
      }

      // Test speech events tracking with mock data
      try {
        if (supabaseClient) {
          await supabaseClient.trackInteraction('play', 'Test text for analytics', {}, {
            selectedVoice: { id: 'test-voice', type: 'google-tts', name: 'Test Voice' },
            language: 'en',
            speed: 1.2,
            cost: 0.0015,
            cached: false
          });
          this.logResult('✅ Speech events tracking successful');
        } else {
          this.logResult('❌ Supabase client not found for speech events tracking');
        }
      } catch (error) {
        this.logResult(`❌ Speech events tracking failed: ${error.message}`);
      }
    } else {
      this.logResult('❌ NativeMimic instance not found (extension may not be loaded on this page)');
    }
  }

  async testRecordingsStorage() {
    console.log('\n🎤 Testing Recordings Storage...');

    const supabaseClient = window.nativeMimicSupabase || window.supabaseClient;
    
    if (supabaseClient) {
      try {
        // Create a mock audio blob for testing
        const mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
        
        await supabaseClient.saveRecording('Test recording text', mockAudioBlob);
        this.logResult('✅ Recording storage successful');
      } catch (error) {
        this.logResult(`❌ Recording storage failed: ${error.message}`);
      }
    } else {
      this.logResult('❌ Supabase client not found for recordings storage');
    }
  }

  async testWidgetSettingsData() {
    console.log('\n⚙️ Testing Widget Settings Data Completeness...');

    if (window.nativeMimicInstance) {
      const settings = window.nativeMimicInstance.getWidgetSettings();
      
      // Test each critical field
      const tests = [
        { field: 'selectedVoice', type: 'object', required: true },
        { field: 'language', type: 'string', required: true },
        { field: 'speed', type: 'number', required: true },
        { field: 'cost', type: 'number', required: true },
        { field: 'cached', type: 'boolean', required: true }
      ];

      tests.forEach(test => {
        const value = settings[test.field];
        const typeCheck = typeof value === test.type;
        const existsCheck = value !== undefined && value !== null;
        
        if (test.required && (!existsCheck || !typeCheck)) {
          this.logResult(`❌ ${test.field}: ${value} (expected ${test.type})`);
        } else {
          this.logResult(`✅ ${test.field}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
        }
      });
    }
  }

  async testCostTracking() {
    console.log('\n💰 Testing Cost Tracking...');

    if (window.nativeMimicInstance) {
      // Check if cost tracking properties exist
      const hasCostProperty = window.nativeMimicInstance.hasOwnProperty('lastSpeechCost');
      const hasCachedProperty = window.nativeMimicInstance.hasOwnProperty('lastSpeechCached');
      
      if (hasCostProperty) {
        this.logResult(`✅ lastSpeechCost property exists: ${window.nativeMimicInstance.lastSpeechCost}`);
      } else {
        this.logResult('❌ lastSpeechCost property missing');
      }

      if (hasCachedProperty) {
        this.logResult(`✅ lastSpeechCached property exists: ${window.nativeMimicInstance.lastSpeechCached}`);
      } else {
        this.logResult('❌ lastSpeechCached property missing');
      }
    }
  }

  logResult(message) {
    this.testResults.push(message);
    console.log(message);
  }

  printTestResults() {
    console.log('\n📋 Test Results Summary:');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.includes('✅')).length;
    const failed = this.testResults.filter(r => r.includes('❌')).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${passed + failed}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.filter(r => r.includes('❌')).forEach(r => console.log(r));
    }

    // Database verification instructions
    console.log('\n🗄️ Database Verification:');
    console.log('Run these SQL queries in Supabase to verify data collection:');
    console.log('1. SELECT COUNT(*) FROM speech_events WHERE user_id = \'' + this.userId + '\';');
    console.log('2. SELECT * FROM speech_events WHERE user_id = \'' + this.userId + '\' ORDER BY created_at DESC LIMIT 5;');
    console.log('3. SELECT COUNT(*) FROM recordings WHERE user_id = \'' + this.userId + '\';');
    console.log('4. SELECT * FROM analytics WHERE user_id = \'' + this.userId + '\' ORDER BY created_at DESC LIMIT 5;');
  }
}

// Auto-run test when script loads
if (typeof window !== 'undefined') {
  window.analyticsTest = new AnalyticsCollectionTest();
  
  // Wait for extension to be ready
  setTimeout(() => {
    window.analyticsTest.runAllTests();
  }, 2000);
  
  console.log('🧪 Analytics Collection Test loaded. Run window.analyticsTest.runAllTests() to test manually.');
}