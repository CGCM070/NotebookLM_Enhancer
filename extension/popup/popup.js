// Extension popup script - handles enable/disable toggle
(function () {
  const STORAGE_KEY = 'nle_enabled';
  const toggleBtn = document.getElementById('toggleBtn');
  const statusActive = document.getElementById('statusActive');
  const statusInactive = document.getElementById('statusInactive');
  const features = document.getElementById('features');

  // Load current state
  async function loadState() {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEY);
      const enabled = result[STORAGE_KEY] !== false; // Default to true
      updateUI(enabled);
    } catch (error) {
      console.error('Failed to load state:', error);
      updateUI(true); // Default to enabled
    }
  }

  // Update UI based on state
  function updateUI(enabled) {
    if (enabled) {
      toggleBtn.classList.add('active');
      statusActive.classList.remove('hidden');
      statusInactive.classList.add('hidden');
      features.style.opacity = '1';
      features.style.pointerEvents = 'auto';
    } else {
      toggleBtn.classList.remove('active');
      statusActive.classList.add('hidden');
      statusInactive.classList.remove('hidden');
      features.style.opacity = '0.5';
      features.style.pointerEvents = 'none';
    }
  }

  // Toggle state
  async function toggleState() {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEY);
      const currentState = result[STORAGE_KEY] !== false;
      const newState = !currentState;

      // Save new state
      await chrome.storage.sync.set({ [STORAGE_KEY]: newState });

      // Update UI
      updateUI(newState);

      // Notify all tabs
      const tabGroups = await Promise.all([
        chrome.tabs.query({ url: 'https://notebooklm.google.com/*' }),
        chrome.tabs.query({ url: 'https://notebook.google.com/*' }),
      ]);
      const tabs = [...new Map(tabGroups.flat().filter((tab) => tab.id).map((tab) => [tab.id, tab])).values()];
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'NLE_TOGGLE_STATE',
            enabled: newState
          }).catch(() => {
            // Tab may not have content script loaded, ignore error
          });
        }
      });
    } catch (error) {
      console.error('Failed to toggle state:', error);
    }
  }

  // Event listeners
  toggleBtn.addEventListener('click', toggleState);

  // Load initial state
  loadState();
})();
