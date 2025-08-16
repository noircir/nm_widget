// QuickSpeak Popup Script
document.addEventListener('DOMContentLoaded', async () => {
  const enableToggle = document.getElementById('enableToggle');
  const toggleStatus = document.getElementById('toggleStatus');

  // Load current enabled state
  const result = await chrome.storage.sync.get(['isEnabled']);
  const isEnabled = result.isEnabled === true; // Default to false if not set

  // Update UI
  enableToggle.checked = isEnabled;
  toggleStatus.textContent = isEnabled ? 'Enabled' : 'Disabled';

  // Handle toggle changes
  enableToggle.addEventListener('change', async (e) => {
    const newState = e.target.checked;
    
    // Save to storage
    await chrome.storage.sync.set({ isEnabled: newState });
    
    // Update UI
    toggleStatus.textContent = newState ? 'Enabled' : 'Disabled';
    
    // Send message to content script to update state
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, {
        action: 'updateEnabled',
        isEnabled: newState
      });
    } catch (error) {
      console.log('Could not send message to content script:', error);
    }
  });



  console.log('QuickSpeak popup initialized');
});