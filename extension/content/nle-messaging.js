// Messaging bridge between native page and iframe UI.
(function () {
  const NLE = (window.__NLE__ = window.__NLE__ || {});
  const { messageTypeNotebooksSync, messageTypeOpenNotebook, messageTypeOpenNotebookMenu, selectors } = NLE.constants;
  const state = NLE.state;

  NLE.postNotebooks = function postNotebooks(frameEl, notebooks) {
    if (!frameEl?.contentWindow) return;

    frameEl.contentWindow.postMessage(
      {
        type: messageTypeNotebooksSync,
        payload: {
          notebooks,
          timestamp: Date.now(),
        },
      },
      '*'
    );
  };

  function openNativeNotebookByTitle(title) {
    const listEl = state.listEl;
    if (!listEl) return false;

    const titleEls = listEl.querySelectorAll(selectors.artifactTitle);
    const match = Array.from(titleEls).find((el) => (el.textContent ?? '').trim() === title);
    if (!match) return false;

    const button = match.closest(selectors.artifactButton) ?? match.closest('button');
    if (!button) return false;

    button.click();
    return true;
  }

  function openNativeNotebookByIndex(index) {
    const listEl = state.listEl;
    if (!listEl) return false;

    const titleEls = listEl.querySelectorAll(selectors.artifactTitle);
    const el = titleEls.item(index);
    if (!el) return false;

    const button = el.closest(selectors.artifactButton) ?? el.closest('button');
    if (!button) return false;

    button.click();
    return true;
  }

  function openNativeNotebookMenuByTitle(title) {
    const listEl = state.listEl;
    if (!listEl) return false;

    const titleEls = listEl.querySelectorAll(selectors.artifactTitle);
    const match = Array.from(titleEls).find((el) => (el.textContent ?? '').trim() === title);
    if (!match) return false;

    const noteEl = match.closest('artifact-library-note');
    if (!noteEl) return false;

    const btn = noteEl.querySelector(selectors.artifactMoreButton);
    if (!btn) return false;

    btn.click();
    return true;
  }

  function openNativeNotebookMenuByIndex(index) {
    const listEl = state.listEl;
    if (!listEl) return false;

    const titleEls = listEl.querySelectorAll(selectors.artifactTitle);
    const el = titleEls.item(index);
    if (!el) return false;

    const noteEl = el.closest('artifact-library-note');
    if (!noteEl) return false;

    const btn = noteEl.querySelector(selectors.artifactMoreButton);
    if (!btn) return false;

    btn.click();
    return true;
  }

  window.addEventListener('message', (event) => {
    // Only accept messages from our iframe.
    if (!state.frameEl?.contentWindow) return;
    if (event.source !== state.frameEl.contentWindow) return;
    if (!event.data || typeof event.data !== 'object') return;

    const data = /** @type {{ type?: unknown; payload?: unknown }} */ (event.data);

    // Handle open notebook request
    if (data.type === messageTypeOpenNotebook) {
      const payload = /** @type {{ title?: unknown; index?: unknown }} */ (data.payload ?? {});

      let ok = false;
      if (typeof payload.index === 'number' && Number.isInteger(payload.index) && payload.index >= 0) {
        ok = openNativeNotebookByIndex(payload.index);
      }

      if (!ok && typeof payload.title === 'string') {
        ok = openNativeNotebookByTitle(payload.title);
      }

      if (!ok) NLE.log('Notebook not found for click:', payload);
      return;
    }

    if (data.type === messageTypeOpenNotebookMenu) {
      const payload = /** @type {{ title?: unknown; index?: unknown }} */ (data.payload ?? {});

      let ok = false;
      if (typeof payload.index === 'number' && Number.isInteger(payload.index) && payload.index >= 0) {
        ok = openNativeNotebookMenuByIndex(payload.index);
      }

      if (!ok && typeof payload.title === 'string') {
        ok = openNativeNotebookMenuByTitle(payload.title);
      }

      if (!ok) NLE.log('Notebook menu not found:', payload);
      return;
    }

    // Handle visibility update request
    if (data.type === 'NLE_UPDATE_VISIBILITY') {
      const payload = /** @type {{ folderByTitle?: unknown }} */ (data.payload ?? {});
      const folderByTitle = payload.folderByTitle;
      if (folderByTitle && typeof folderByTitle === 'object') {
        if (NLE.updateNativeNoteVisibility) {
          NLE.updateNativeNoteVisibility(/** @type {Record<string, string>} */(folderByTitle));
        }
      }
      return;
    }
  });
})();
