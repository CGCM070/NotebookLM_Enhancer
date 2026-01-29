/*
  Content script entrypoint.
  Detects the Studio panel, injects a ShadowRoot host, mounts the Angular UI (iframe),
  and keeps everything alive across SPA navigation and hide/show.
*/

(function () {
  const NLE = (window.__NLE__ = window.__NLE__ || {});

  // Global watchdog for SPA navigation + sidebar hide/show + list replacements.
  const bodyObserver = new MutationObserver(NLE.scheduleEnsureMounted);
  bodyObserver.observe(document.body, { childList: true, subtree: true });

  // Also hook navigation events (NotebookLM is a SPA).
  window.addEventListener('popstate', NLE.scheduleEnsureMounted);
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

  // Initial mount.
  NLE.scheduleEnsureMounted();
})();
