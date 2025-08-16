// QuickSpeak Background Service Worker
class QuickSpeakBackground {
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
      console.log('QuickSpeak: Context menu not available');
    }

    console.log('QuickSpeak background service worker initialized');
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
      isActive: true,
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
      console.log('QuickSpeak: Default settings initialized');
    } catch (error) {
      console.error('QuickSpeak: Error setting default settings:', error);
    }
  }

  showWelcomeMessage() {
    // Show welcome notification (if notifications are available)
    if (chrome.notifications && chrome.notifications.create) {
      try {
        chrome.notifications.create('quickspeak-welcome', {
          type: 'basic',
          title: 'QuickSpeak Installed!',
          message: 'Highlight any text and it will be spoken aloud. Click the extension icon for settings.'
        });
      } catch (error) {
        console.log('QuickSpeak: Notifications not available');
      }
    } else {
      console.log('QuickSpeak: Extension installed successfully');
    }
  }

  handleUpdate(previousVersion) {
    console.log(`QuickSpeak updated from ${previousVersion} to ${chrome.runtime.getManifest().version}`);
    
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
        console.log('QuickSpeak: Settings migrated successfully');
      }
    } catch (error) {
      console.error('QuickSpeak: Error migrating settings:', error);
    }
  }

  onActionClicked(tab) {
    // Toggle QuickSpeak on/off when extension icon is clicked
    this.toggleQuickSpeak(tab);
  }

  async toggleQuickSpeak(tab) {
    try {
      const settings = await chrome.storage.sync.get(['isActive']);
      const newState = !settings.isActive;
      
      await chrome.storage.sync.set({ isActive: newState });
      
      // Send message to content script
      chrome.tabs.sendMessage(tab.id, {
        action: 'toggleQuickSpeak',
        isActive: newState
      });

      // Update icon to reflect state
      this.updateIcon(newState);
      
      // Show notification (if available)
      if (chrome.notifications && chrome.notifications.create) {
        try {
          chrome.notifications.create('quickspeak-toggle', {
            type: 'basic',
            title: 'QuickSpeak',
            message: `QuickSpeak ${newState ? 'enabled' : 'disabled'}`
          });
        } catch (error) {
          console.log('QuickSpeak: Toggle notification not available');
        }
      }

    } catch (error) {
      console.error('QuickSpeak: Error toggling extension:', error);
    }
  }

  updateIcon(isActive) {
    chrome.action.setTitle({
      title: `QuickSpeak - ${isActive ? 'Enabled' : 'Disabled'}`
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

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('QuickSpeak: Error handling message:', error);
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
      console.error('QuickSpeak: Error recording usage stats:', error);
    }
  }


  setupContextMenu() {
    if (chrome.contextMenus && chrome.contextMenus.create) {
      try {
        chrome.contextMenus.create({
          id: 'quickspeak-speak',
          title: 'Speak with QuickSpeak',
          contexts: ['selection']
        });

        chrome.contextMenus.create({
          id: 'quickspeak-report',
          title: 'Report pronunciation issue',
          contexts: ['selection']
        });

        if (chrome.contextMenus.onClicked) {
          chrome.contextMenus.onClicked.addListener((info, tab) => {
            this.handleContextMenuClick(info, tab);
          });
        }
      } catch (error) {
        console.log('QuickSpeak: Failed to set up context menu:', error);
      }
    }
  }

  handleContextMenuClick(info, tab) {
    switch (info.menuItemId) {
      case 'quickspeak-speak':
        chrome.tabs.sendMessage(tab.id, {
          action: 'speakText',
          text: info.selectionText
        });
        break;

      case 'quickspeak-report':
        chrome.tabs.sendMessage(tab.id, {
          action: 'reportPronunciation',
          text: info.selectionText
        });
        break;
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
new QuickSpeakBackground();

// Handle service worker lifecycle
self.addEventListener('activate', () => {
  console.log('QuickSpeak service worker activated');
});

self.addEventListener('install', () => {
  console.log('QuickSpeak service worker installed');
});