// Messaging bridge between native page and iframe UI.
(function () {
  const NLE = (window.__NLE__ = window.__NLE__ || {});
  const {
    messageTypeNotebooksSync,
    messageTypeOpenNotebook,
    messageTypeOpenNotebookMenu,
    messageTypeDeleteNotebook,
    selectors,
  } = NLE.constants;
  const state = NLE.state;

  function normalizeText(value) {
    return (value ?? '').toString().replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function getLatestMenuPanel() {
    const container = document.querySelector('.cdk-overlay-container');
    if (!container) return null;
    const panels = container.querySelectorAll('.mat-mdc-menu-panel');
    return panels.length > 0 ? panels.item(panels.length - 1) : null;
  }

  function waitForMenuPanel(timeoutMs) {
    return new Promise((resolve) => {
      const existing = getLatestMenuPanel();
      if (existing) return resolve(existing);

      const container = document.querySelector('.cdk-overlay-container');
      if (!container) return resolve(null);

      const obs = new MutationObserver(() => {
        const panel = getLatestMenuPanel();
        if (panel) {
          obs.disconnect();
          resolve(panel);
        }
      });

      obs.observe(container, { childList: true, subtree: true });
      setTimeout(() => {
        obs.disconnect();
        resolve(getLatestMenuPanel());
      }, timeoutMs);
    });
  }

  async function clickDeleteInOpenMenu() {
    const panel = await waitForMenuPanel(800);
    if (!panel) return false;

    const items = panel.querySelectorAll('button, [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]');
    const deleteTokens = ['eliminar', 'borrar', 'delete', 'remove'];

    for (const el of items) {
      const txt = normalizeText(el.textContent);
      if (!txt) continue;
      if (deleteTokens.some((t) => txt.includes(t))) {
        el.click();
        return true;
      }
    }

    return false;
  }

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

  async function deleteNativeNotebookByIndex(index) {
    const ok = openNativeNotebookMenuByIndex(index);
    if (!ok) return false;
    return await clickDeleteInOpenMenu();
  }

  async function deleteNativeNotebookByTitle(title) {
    const ok = openNativeNotebookMenuByTitle(title);
    if (!ok) return false;
    return await clickDeleteInOpenMenu();
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
      const payload = /** @type {{ title?: unknown; index?: unknown; x?: unknown; y?: unknown }} */ (data.payload ?? {});

      let ok = false;
      if (typeof payload.index === 'number' && Number.isInteger(payload.index) && payload.index >= 0) {
        ok = openNativeNotebookMenuByIndex(payload.index);
      }

      if (!ok && typeof payload.title === 'string') {
        ok = openNativeNotebookMenuByTitle(payload.title);
      }

      if (!ok) {
        NLE.log('Notebook menu not found:', payload);
        return;
      }

      const x0 = typeof payload.x === 'number' && Number.isFinite(payload.x) ? payload.x : null;
      const y0 = typeof payload.y === 'number' && Number.isFinite(payload.y) ? payload.y : null;
      if (x0 === null || y0 === null) return;

      void (async () => {
        const panel = await waitForMenuPanel(800);
        if (!panel) return;
        const pane = panel.closest('.cdk-overlay-pane');
        if (!pane) return;

        const frameRect = state.frameEl?.getBoundingClientRect?.();
        const x = (frameRect?.left ?? 0) + x0;
        const y = (frameRect?.top ?? 0) + y0;

        // After initial render, we can clamp using the panel size.
        const r = pane.getBoundingClientRect();
        const margin = 8;
        const left = Math.max(margin, Math.min(x - r.width / 2, window.innerWidth - r.width - margin));
        const top = Math.max(margin, Math.min(y - 8, window.innerHeight - r.height - margin));

        pane.style.left = `${Math.floor(left)}px`;
        pane.style.top = `${Math.floor(top)}px`;
        pane.style.transform = 'none';
        pane.style.zIndex = '2147483000';
      })();

      return;
    }

    if (data.type === messageTypeDeleteNotebook) {
      const payload = /** @type {{ title?: unknown; index?: unknown }} */ (data.payload ?? {});

      void (async () => {
        let ok = false;
        if (typeof payload.index === 'number' && Number.isInteger(payload.index) && payload.index >= 0) {
          ok = await deleteNativeNotebookByIndex(payload.index);
        }
        if (!ok && typeof payload.title === 'string') {
          ok = await deleteNativeNotebookByTitle(payload.title);
        }
        if (!ok) NLE.log('Delete failed:', payload);
      })();

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
