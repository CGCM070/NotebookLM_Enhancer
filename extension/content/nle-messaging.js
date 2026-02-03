// Messaging bridge between native page and iframe UI.
(function () {
  const NLE = (window.__NLE__ = window.__NLE__ || {});
  const {
    messageTypeNotebooksSync,
    messageTypeActiveNotebook,
    messageTypeOpenNotebook,
    messageTypeOpenNotebookMenu,
    messageTypeDeleteNotebook,
    messageTypeAddNote,
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

  // Store last notebookId to send to iframe when it becomes ready
  state.lastNotebookId = null;

  NLE.postActiveNotebook = function postActiveNotebook(frameEl, notebookId) {
    if (!frameEl?.contentWindow) return;

    // Store for later if iframe sends READY request
    state.lastNotebookId = notebookId;
    
    NLE.log('Sending NLE_ACTIVE_NOTEBOOK:', notebookId);
    frameEl.contentWindow.postMessage(
      {
        type: messageTypeActiveNotebook,
        payload: {
          notebookId,
        },
      },
      '*'
    );
  };
  
  // Handle iframe ready signal
  NLE.sendLastNotebookId = function sendLastNotebookId(frameEl) {
    if (!frameEl?.contentWindow) return;
    if (state.lastNotebookId !== null) {
      NLE.log('Iframe ready, sending last notebookId:', state.lastNotebookId);
      frameEl.contentWindow.postMessage(
        {
          type: messageTypeActiveNotebook,
          payload: {
            notebookId: state.lastNotebookId,
          },
        },
        '*'
      );
    }
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

    // Buscar tanto artifact-library-note (notas) como artifact-library-item (otros artefactos)
    const itemEl = match.closest('artifact-library-note, artifact-library-item');
    if (!itemEl) return false;

    const btn = itemEl.querySelector(selectors.artifactMoreButton);
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

    // Buscar tanto artifact-library-note (notas) como artifact-library-item (otros artefactos)
    const itemEl = el.closest('artifact-library-note, artifact-library-item');
    if (!itemEl) return false;

    const btn = itemEl.querySelector(selectors.artifactMoreButton);
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
    
    // Handle iframe ready signal - resend last notebookId
    if (data.type === 'NLE_IFRAME_READY') {
      NLE.log('Iframe reported ready, sending last notebookId');
      if (NLE.sendLastNotebookId) {
        NLE.sendLastNotebookId(state.frameEl);
      }
      return;
    }
    
    // Handle add note request
    if (data.type === messageTypeAddNote) {
      const addNoteButton = document.querySelector('.add-note-button-container .add-note-button');
      if (addNoteButton) {
        addNoteButton.click();
        NLE.log('Add note button clicked');
      } else {
        NLE.log('Add note button not found');
      }
      return;
    }

    // Handle language change request
    if (data.type === 'NLE_CHANGE_LANGUAGE') {
      const lang = data.payload?.lang;
      if (lang && typeof NLE.exportI18n?.setLanguage === 'function') {
        NLE.exportI18n.setLanguage(lang);
        NLE.log('Language changed to:', lang);
      }
      return;
    }
  });
})();
