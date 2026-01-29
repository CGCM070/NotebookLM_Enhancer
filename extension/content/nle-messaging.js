// Messaging bridge between native page and iframe UI.
(function () {
  const NLE = (window.__NLE__ = window.__NLE__ || {});
  const { messageTypeNotebooksSync, messageTypeOpenNotebook, selectors } = NLE.constants;
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

  window.addEventListener('message', (event) => {
    // Only accept messages from our iframe.
    if (!state.frameEl?.contentWindow) return;
    if (event.source !== state.frameEl.contentWindow) return;
    if (!event.data || typeof event.data !== 'object') return;

    const data = /** @type {{ type?: unknown; payload?: unknown }} */ (event.data);
    if (data.type !== messageTypeOpenNotebook) return;

    const payload = /** @type {{ title?: unknown; index?: unknown }} */ (data.payload ?? {});

    let ok = false;
    if (typeof payload.index === 'number' && Number.isInteger(payload.index) && payload.index >= 0) {
      ok = openNativeNotebookByIndex(payload.index);
    }

    if (!ok && typeof payload.title === 'string') {
      ok = openNativeNotebookByTitle(payload.title);
    }

    if (!ok) NLE.log('Notebook not found for click:', payload);
  });
})();
