/*
  Content script entrypoint.
  Detects the Studio panel, injects a ShadowRoot host, mounts the Angular UI (iframe),
  and keeps everything alive across SPA navigation and hide/show.
*/

(function () {
  const NLE = (window.__NLE__ = window.__NLE__ || {});
  const state = NLE.state;

  // Check if extension context is still valid
  function isContextValid() {
    try {
      // This will throw if context is invalidated
      return !!chrome.runtime.id;
    } catch {
      return false;
    }
  }

  // Load initial enabled state from storage
  async function loadEnabledState() {
    try {
      const result = await chrome.storage.sync.get('nle_enabled');
      state.enabled = result.nle_enabled !== false; // Default to true
      NLE.log('Extension enabled state:', state.enabled);
    } catch (error) {
      if (error?.message?.includes('Extension context invalidated')) {
        NLE.log('Extension context invalidated during loadEnabledState');
        contextInvalidated = true;
        // Try to reinitialize
        setTimeout(loadEnabledState, 1000);
        return;
      }
      NLE.log('Failed to load enabled state, defaulting to enabled:', error);
      state.enabled = true;
    }
    // After loading state, schedule initial mount
    if (!contextInvalidated) {
      NLE.scheduleEnsureMounted();
    }
  }

  // Track if extension context is valid
  let contextInvalidated = false;

  // Listen for toggle messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'NLE_TOGGLE_STATE') {
      state.enabled = message.enabled;
      NLE.log('Extension state toggled:', state.enabled);
      
      // Re-run ensureMounted to apply changes immediately
      NLE.scheduleEnsureMounted();
      
      sendResponse({ success: true });
    }
  });

  // Global watchdog for SPA navigation + sidebar hide/show + list replacements.
  const bodyObserver = new MutationObserver(NLE.scheduleEnsureMounted);
  bodyObserver.observe(document.body, { childList: true, subtree: true });

  // Also hook navigation events (NotebookLM is a SPA).
  window.addEventListener('popstate', NLE.scheduleEnsureMounted);
  window.addEventListener('hashchange', NLE.scheduleEnsureMounted);
  
  // Poll for URL changes as a fallback (SPA navigation might not trigger popstate)
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      NLE.log('URL changed (polling detected):', lastUrl);
      NLE.scheduleEnsureMounted();
    }
  }, 500);
  
  try {
    const origPushState = history.pushState;
    history.pushState = function (...args) {
      const ret = origPushState.apply(this, args);
      NLE.scheduleEnsureMounted();
      return ret;
    };
    const origReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      const ret = origReplaceState.apply(this, args);
      NLE.scheduleEnsureMounted();
      return ret;
    };
  } catch {
    // Ignore if we can't patch (should be rare).
  }

  // Load state first, then mount
  loadEnabledState();
  
  // Initialize export functionality
  if (NLE.initExport) {
    NLE.initExport();
  }
})();
