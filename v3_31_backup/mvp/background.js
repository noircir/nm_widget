// NativeMimic Background Service Worker
class NativeMimicBackground {
  constructor() {
    this.init();
  }

  init() {
    // Handle installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.onInstalled(details);
    });

    // Handle extension icon click
    chrome.action.onClicked.addListener((tab) => {
      this.onActionClicked(tab);
    });

    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Context menu integration (optional feature)
    try {
      this.setupContextMenu();
    } catch (error) {
      console.log('NativeMimic: Context menu not available');
    }

    console.log('NativeMimic background service worker initialized');
  }

  onInstalled(details) {
    if (details.reason === 'install') {
      // First time install
      this.setDefaultSettings();
      this.showWelcomeMessage();
    } else if (details.reason === 'update') {
      // Extension updated
      this.handleUpdate(details.previousVersion);
    }
  }

  async setDefaultSettings() {
    const defaultSettings = {
      isEnabled: false, // DEFAULT TO DISABLED: Prevents widget appearing unexpectedly during normal browsing
      speechRate: 1.0,
      selectedVoiceURI: null,
      showWelcomeMessage: true,
      pronunciationCorrections: {},
      usageStats: {
        totalSpeechCount: 0,
        totalCharactersSpoken: 0,
        installDate: Date.now()
      }
    };

    try {
      await chrome.storage.sync.set(defaultSettings);
      console.log('NativeMimic: Default settings initialized');
    } catch (error) {
      console.error('NativeMimic: Error setting default settings:', error);
    }
  }

  showWelcomeMessage() {
    // Show welcome notification (if notifications are available)
    if (chrome.notifications && chrome.notifications.create) {
      try {
        chrome.notifications.create('nativemimic-welcome', {
          type: 'basic',
          title: 'NativeMimic Installed!',
          message: 'Highlight any text and it will be spoken aloud. Click the extension icon for settings.'
        });
      } catch (error) {
        console.log('NativeMimic: Notifications not available');
      }
    } else {
      console.log('NativeMimic: Extension installed successfully');
    }
  }

  handleUpdate(previousVersion) {
    console.log(`NativeMimic updated from ${previousVersion} to ${chrome.runtime.getManifest().version}`);
    
    // Handle any migration logic here
    this.migrateSettings(previousVersion);
  }

  async migrateSettings(previousVersion) {
    // Migration logic for future updates
    try {
      const settings = await chrome.storage.sync.get();
      let needsUpdate = false;

      // Example migration (for future use)
      if (!settings.pronunciationCorrections) {
        settings.pronunciationCorrections = {};
        needsUpdate = true;
      }

      if (needsUpdate) {
        await chrome.storage.sync.set(settings);
        console.log('NativeMimic: Settings migrated successfully');
      }
    } catch (error) {
      console.error('NativeMimic: Error migrating settings:', error);
    }
  }

  onActionClicked(tab) {
    // Toggle NativeMimic on/off when extension icon is clicked
    this.toggleNativeMimic(tab);
  }

  async toggleNativeMimic(tab) {
    try {
      // OPTION B: Background script as source of truth with immediate broadcasting
      const settings = await chrome.storage.sync.get(['isEnabled']);
      const newState = !settings.isEnabled;
      
      // Update storage
      await chrome.storage.sync.set({ isEnabled: newState });
      
      // OPTION B: Broadcast immediately to all tabs
      await this.broadcastToAllTabs({
        action: 'updateEnabledState',
        isEnabled: newState
      });

      // Update icon to reflect state
      this.updateIcon(newState);
      
      // Show notification (if available)
      if (chrome.notifications && chrome.notifications.create) {
        try {
          chrome.notifications.create('nativemimic-toggle', {
            type: 'basic',
            title: 'NativeMimic',
            message: `NativeMimic ${newState ? 'enabled' : 'disabled'}`
          });
        } catch (error) {
          console.log('NativeMimic: Toggle notification not available');
        }
      }

      console.log(`NativeMimic: Extension ${newState ? 'enabled' : 'disabled'} via icon click`);

    } catch (error) {
      console.error('NativeMimic: Error toggling extension:', error);
    }
  }

  updateIcon(isEnabled) {
    chrome.action.setTitle({
      title: `NativeMimic - ${isEnabled ? 'Enabled' : 'Disabled'}`
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'getSettings':
          const settings = await chrome.storage.sync.get();
          sendResponse({ settings });
          break;

        case 'updateSettings':
          await chrome.storage.sync.set(request.settings);
          sendResponse({ success: true });
          break;

        case 'recordUsage':
          await this.recordUsageStats(request.stats);
          sendResponse({ success: true });
          break;

        case 'getPronunciationReports':
          const reports = await chrome.storage.local.get(['pronunciationReports']);
          sendResponse({ reports: reports.pronunciationReports || [] });
          break;

        case 'clearPronunciationReports':
          await chrome.storage.local.set({ pronunciationReports: [] });
          sendResponse({ success: true });
          break;

        case 'getAvailableVoices':
          // This will be handled by content script since voices are only available there
          sendResponse({ error: 'Voices only available in content script context' });
          break;

        case 'toggleExtension':
          // OPTION B: Handle toggle request from content script
          console.log('🔄 BACKGROUND: Received toggleExtension request:', request);
          const currentSettings = await chrome.storage.sync.get(['isEnabled']);
          const newState = request.requestedState !== undefined ? 
                          request.requestedState : 
                          !currentSettings.isEnabled;
          
          console.log('📊 BACKGROUND: Current state:', currentSettings.isEnabled, '→ New state:', newState);
          
          // Update storage
          await chrome.storage.sync.set({ isEnabled: newState });
          console.log('💾 BACKGROUND: Storage updated to:', newState);
          
          // Broadcast to all tabs immediately
          console.log('📡 BACKGROUND: Starting broadcast to all tabs...');
          await this.broadcastToAllTabs({
            action: 'updateEnabledState',
            isEnabled: newState
          });
          console.log('✅ BACKGROUND: Broadcast completed');
          
          // Update icon
          this.updateIcon(newState);
          
          sendResponse({ success: true, newState: newState });
          console.log(`🎯 BACKGROUND: Extension ${newState ? 'enabled' : 'disabled'} via content script - response sent`);
          break;

        case 'broadcastEnabledState':
          // CRITICAL FIX: Broadcast enabled state to all tabs
          await this.broadcastToAllTabs({
            action: 'updateEnabledState',
            isEnabled: request.isEnabled
          });
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('NativeMimic: Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  async recordUsageStats(stats) {
    try {
      const currentStats = await chrome.storage.sync.get(['usageStats']);
      const usage = currentStats.usageStats || {
        totalSpeechCount: 0,
        totalCharactersSpoken: 0,
        installDate: Date.now()
      };

      usage.totalSpeechCount += stats.speechCount || 0;
      usage.totalCharactersSpoken += stats.charactersSpoken || 0;
      usage.lastUsed = Date.now();

      await chrome.storage.sync.set({ usageStats: usage });
    } catch (error) {
      console.error('NativeMimic: Error recording usage stats:', error);
    }
  }


  setupContextMenu() {
    if (chrome.contextMenus && chrome.contextMenus.create) {
      try {
        chrome.contextMenus.create({
          id: 'nativemimic-speak',
          title: 'Speak with NativeMimic',
          contexts: ['selection']
        });

        chrome.contextMenus.create({
          id: 'nativemimic-report',
          title: 'Report pronunciation issue',
          contexts: ['selection']
        });

        if (chrome.contextMenus.onClicked) {
          chrome.contextMenus.onClicked.addListener((info, tab) => {
            this.handleContextMenuClick(info, tab);
          });
        }
      } catch (error) {
        console.log('NativeMimic: Failed to set up context menu:', error);
      }
    }
  }

  handleContextMenuClick(info, tab) {
    switch (info.menuItemId) {
      case 'nativemimic-speak':
        chrome.tabs.sendMessage(tab.id, {
          action: 'speakText',
          text: info.selectionText
        });
        break;

      case 'nativemimic-report':
        chrome.tabs.sendMessage(tab.id, {
          action: 'reportPronunciation',
          text: info.selectionText
        });
        break;
    }
  }

  // CRITICAL FIX: Broadcast message to all tabs
  async broadcastToAllTabs(message) {
    try {
      console.log('📡 BROADCAST: Starting broadcast with message:', message);
      const tabs = await chrome.tabs.query({});
      console.log(`📋 BROADCAST: Found ${tabs.length} total tabs`);
      
      const validTabs = tabs.filter(tab => this.isValidTab(tab));
      console.log(`✅ BROADCAST: ${validTabs.length} valid tabs after filtering`);
      
      validTabs.forEach(tab => {
        console.log(`📄 BROADCAST: Tab ${tab.id} - ${tab.url}`);
      });
      
      const promises = validTabs.map(tab => 
        chrome.tabs.sendMessage(tab.id, message).then(response => {
          console.log(`✅ BROADCAST: Tab ${tab.id} responded:`, response);
          return response;
        }).catch(error => {
          // Some tabs might not have content script loaded, that's OK
          console.log(`❌ BROADCAST: Could not send message to tab ${tab.id}:`, error.message);
        })
      );
      
      const results = await Promise.allSettled(promises);
      console.log(`🎯 BROADCAST: Completed - sent to ${promises.length} tabs, results:`, results);
    } catch (error) {
      console.error('💥 BROADCAST: Error broadcasting to tabs:', error);
    }
  }

  // Utility method to check if tab is valid for injection
  isValidTab(tab) {
    const url = tab.url;
    return url && 
           !url.startsWith('chrome://') && 
           !url.startsWith('chrome-extension://') && 
           !url.startsWith('moz-extension://') && 
           !url.startsWith('about:');
  }
}

// Initialize background service worker
new NativeMimicBackground();

// Handle service worker lifecycle
self.addEventListener('activate', () => {
  console.log('NativeMimic service worker activated');
});

self.addEventListener('install', () => {
  console.log('NativeMimic service worker installed');
});