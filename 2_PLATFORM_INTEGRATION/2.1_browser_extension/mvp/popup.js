// NativeMimic Popup Script - Minimalist Interface
document.addEventListener('DOMContentLoaded', async () => {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const toggleExtension = document.getElementById('toggleExtension');
  // toggleIcon removed for clean Apple aesthetics
  const toggleText = document.getElementById('toggleText');

  // Load current enabled state
  let isEnabled = false;
  try {
    const result = await chrome.storage.sync.get(['isEnabled']);
    isEnabled = result.isEnabled === true; // Default to false if not set
  } catch (error) {
    console.log('NativeMimic: Could not load settings from storage:', error);
  }

  // Update status display
  updateStatus(isEnabled);


  // Handle toggle enable/disable button
  toggleExtension.addEventListener('click', async () => {
    const newState = !isEnabled;
    
    try {
      // OPTION B: Send message to background script for coordinated toggle
      console.log('🎛️ POPUP: Sending toggleExtension message, requesting:', newState);
      const response = await chrome.runtime.sendMessage({
        action: 'toggleExtension',
        requestedState: newState
      });
      
      console.log('📨 POPUP: Received response from background:', response);
      
      if (response && response.success) {
        // Update local state and UI
        isEnabled = response.newState;
        updateStatus(isEnabled);
        
        console.log(`✅ POPUP: ${isEnabled ? 'Enabled' : 'Disabled'} extension via popup - UI updated`);
        
        // User feedback
        if (isEnabled) {
          console.log('🟢 POPUP: Extension enabled - select text on any tab to use widget');
        } else {
          console.log('🔴 POPUP: Extension disabled - all widgets should be hidden immediately');
        }
      } else {
        console.log('❌ POPUP: Failed to toggle extension:', response);
      }
      
    } catch (error) {
      console.log('💥 POPUP: Could not communicate with background script:', error);
    }
  });

  function updateStatus(enabled) {
    if (enabled) {
      // Extension is enabled
      statusDot.className = 'status-dot enabled';
      statusText.textContent = 'Extension Enabled';
      
      toggleText.textContent = 'Disable Extension';
      toggleExtension.classList.remove('enabled');
      
    } else {
      // Extension is disabled
      statusDot.className = 'status-dot';
      statusText.textContent = 'Extension Disabled';
      
      toggleText.textContent = 'Enable Extension';
      toggleExtension.classList.add('enabled');
      
    }
  }

  // Add keyboard shortcut hint
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      toggleExtension.click();
    }
  });
});