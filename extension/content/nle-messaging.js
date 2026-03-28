// Messaging bridge between native page and iframe UI.
(function () {
  const NLE = (window.__NLE__ = window.__NLE__ || {});
  const {
    messageTypeNotebooksSync,
    messageTypeActiveNotebook,
    messageTypeOpenNotebook,
    messageTypeOpenNotebookMenu,
    messageTypeDeleteNotebook,
    messageTypeDeleteNotebooksBatch,
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

  /**
   * Wait for the delete confirmation dialog to appear
   * @param {number} timeoutMs
   * @returns {Promise<HTMLElement|null>}
   */
  function waitForDeleteConfirmationDialog(timeoutMs) {
    return new Promise((resolve) => {
      // Check if dialog already exists
      const existing = document.querySelector('mat-dialog-container, .mat-mdc-dialog-container, delete-dialog');
      if (existing) return resolve(existing);

      // Observe for dialog appearance
      const obs = new MutationObserver(() => {
        const dialog = document.querySelector('mat-dialog-container, .mat-mdc-dialog-container, delete-dialog');
        if (dialog) {
          obs.disconnect();
          resolve(dialog);
        }
      });

      obs.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        obs.disconnect();
        resolve(document.querySelector('mat-dialog-container, .mat-mdc-dialog-container, delete-dialog'));
      }, timeoutMs);
    });
  }

  /**
   * Click the confirm button in the delete dialog
   * @param {HTMLElement} dialog
   * @returns {boolean}
   */
  function clickConfirmDeleteInDialog(dialog) {
    // Try multiple selectors for the confirm button
    const selectors = [
      'button[type="submit"]',
      'button.submit',
      'button[color="primary"]',
      'button[class*="primary"]',
      'button:not(.cancel)',
      'button[aria-label*="eliminar" i]',
      'button[aria-label*="delete" i]',
      'button'
    ];

    for (const selector of selectors) {
      const buttons = dialog.querySelectorAll(selector);
      for (const btn of buttons) {
        const text = normalizeText(btn.textContent);
        // Look for "Eliminar" or "Delete" text, avoid "Cancelar"
        if ((text.includes('eliminar') || text.includes('delete')) && !text.includes('cancel')) {
          btn.click();
          return true;
        }
      }
    }

    // Fallback: click the second button (usually the confirm button in dialogs)
    const allButtons = dialog.querySelectorAll('button');
    if (allButtons.length >= 2) {
      allButtons[allButtons.length - 1].click();
      return true;
    }

    return false;
  }

  /**
   * Wait for dialog to close
   * @param {number} timeoutMs
   * @returns {Promise<void>}
   */
  function waitForDialogToClose(timeoutMs) {
    return new Promise((resolve) => {
      const checkInterval = 100;
      const maxChecks = timeoutMs / checkInterval;
      let checks = 0;

      const interval = setInterval(() => {
        const dialog = document.querySelector('mat-dialog-container, .mat-mdc-dialog-container, delete-dialog, .cdk-overlay-pane');
        checks++;

        if (!dialog || checks >= maxChecks) {
          clearInterval(interval);
          resolve();
        }
      }, checkInterval);
    });
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

    // Buscar el item container (tanto note como item)
    const itemEl = match.closest('artifact-library-note, artifact-library-item');
    if (!itemEl) return false;

    // Buscar el botón dentro del container
    const button = itemEl.querySelector(selectors.artifactButton) ?? itemEl.querySelector('button.mat-mdc-button');
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

    // Buscar el item container (tanto note como item)
    const itemEl = el.closest('artifact-library-note, artifact-library-item');
    if (!itemEl) return false;

    // Buscar el botón dentro del container
    const button = itemEl.querySelector(selectors.artifactButton) ?? itemEl.querySelector('button.mat-mdc-button');
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
    
    // Click delete in menu
    const menuClicked = await clickDeleteInOpenMenu();
    if (!menuClicked) return false;
    
    // Wait for confirmation dialog and confirm
    await new Promise(resolve => setTimeout(resolve, 300));
    const dialog = await waitForDeleteConfirmationDialog(1000);
    if (!dialog) {
      NLE.log('No delete confirmation dialog found');
      return false;
    }
    
    const confirmed = clickConfirmDeleteInDialog(dialog);
    if (!confirmed) {
      NLE.log('Could not click confirm button in dialog');
      return false;
    }
    
    // Wait for dialog to close
    await waitForDialogToClose(2000);
    return true;
  }

  async function deleteNativeNotebookByTitle(title) {
    const ok = openNativeNotebookMenuByTitle(title);
    if (!ok) return false;
    
    // Click delete in menu
    const menuClicked = await clickDeleteInOpenMenu();
    if (!menuClicked) return false;
    
    // Wait for confirmation dialog and confirm
    await new Promise(resolve => setTimeout(resolve, 300));
    const dialog = await waitForDeleteConfirmationDialog(1000);
    if (!dialog) {
      NLE.log('No delete confirmation dialog found');
      return false;
    }
    
    const confirmed = clickConfirmDeleteInDialog(dialog);
    if (!confirmed) {
      NLE.log('Could not click confirm button in dialog');
      return false;
    }
    
    // Wait for dialog to close
    await waitForDialogToClose(2000);
    return true;
  }

  /**
   * Batch delete notebooks with delay between each to avoid race conditions
   * @param {Array<{index?: number; title?: string}>} notebooks
   * @returns {Promise<{success: boolean; deletedCount: number; failedCount: number; errors?: string[]}>}
   */
  async function deleteNotebooksBatch(notebooks) {
    if (!Array.isArray(notebooks) || notebooks.length === 0) {
      return { success: false, deletedCount: 0, failedCount: 0, errors: ['No notebooks provided'] };
    }

    const result = {
      success: true,
      deletedCount: 0,
      failedCount: 0,
      errors: [],
    };

    const DELAY_MS = 400; // Delay between deletions to allow UI to settle

    for (let i = 0; i < notebooks.length; i++) {
      const notebook = notebooks[i];
      const progressInfo = `[${i + 1}/${notebooks.length}]`;

      try {
        let ok = false;

        // Try by index first (more reliable)
        if (typeof notebook.index === 'number' && Number.isInteger(notebook.index) && notebook.index >= 0) {
          // Adjust index for previously deleted items
          const adjustedIndex = notebook.index - result.deletedCount;
          if (adjustedIndex >= 0) {
            NLE.log(`${progressInfo} Deleting notebook by index:`, notebook.title || `index ${adjustedIndex}`);
            ok = await deleteNativeNotebookByIndex(adjustedIndex);
          }
        }

        // Fallback to title if index fails
        if (!ok && typeof notebook.title === 'string') {
          NLE.log(`${progressInfo} Deleting notebook by title:`, notebook.title);
          ok = await deleteNativeNotebookByTitle(notebook.title);
        }

        if (ok) {
          result.deletedCount++;
          NLE.log(`${progressInfo} Successfully deleted`);
        } else {
          result.failedCount++;
          const error = `Failed to delete: ${notebook.title || `index ${notebook.index}`}`;
          result.errors.push(error);
          NLE.log(`${progressInfo} Failed:`, error);
        }

        // Send progress update to iframe if callback exists
        if (NLE.onBatchDeleteProgress) {
          NLE.onBatchDeleteProgress({
            current: i + 1,
            total: notebooks.length,
            currentTitle: notebook.title || `Note ${i + 1}`,
          });
        }

        // Delay between deletions (except for the last one)
        if (i < notebooks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      } catch (error) {
        result.failedCount++;
        const errorMsg = `Error deleting ${notebook.title || `index ${notebook.index}`}: ${error}`;
        result.errors.push(errorMsg);
        NLE.log(`${progressInfo} Error:`, errorMsg);
      }
    }

    result.success = result.failedCount === 0;
    NLE.log('Batch delete complete:', result);
    return result;
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

    // Handle batch delete notebooks request
    if (data.type === messageTypeDeleteNotebooksBatch) {
      const payload = /** @type {{ notebooks?: unknown }} */ (data.payload ?? {});
      const notebooks = Array.isArray(payload.notebooks) ? payload.notebooks : [];

      void (async () => {
        const result = await deleteNotebooksBatch(notebooks);
        
        // Send result back to iframe
        if (state.frameEl?.contentWindow) {
          state.frameEl.contentWindow.postMessage(
            {
              type: 'NLE_DELETE_BATCH_COMPLETE',
              payload: result,
            },
            '*'
          );
        }
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
