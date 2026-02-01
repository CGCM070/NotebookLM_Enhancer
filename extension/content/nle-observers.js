// Observers for the Studio panel and artifact list.
(function () {
  const NLE = (window.__NLE__ = window.__NLE__ || {});
  const { selectors } = NLE.constants;
  const state = NLE.state;

  function setNativeListHidden(listEl, hidden) {
    if (!listEl) return;

    if (!hidden) {
      if (state.nativeListEl === listEl) {
        const prev = state.nativeListPrevStyle;
        if (prev) {
          listEl.style.display = prev.display;
          listEl.style.maxHeight = prev.maxHeight;
          listEl.style.overflow = prev.overflow;
          listEl.style.opacity = prev.opacity;
          listEl.style.pointerEvents = prev.pointerEvents;
          listEl.style.margin = prev.margin;
        }
        state.nativeListEl = null;
        state.nativeListPrevStyle = null;
      }
      return;
    }

    if (state.nativeListEl !== listEl) {
      if (state.nativeListEl) {
        const prev = state.nativeListPrevStyle;
        if (prev) {
          state.nativeListEl.style.display = prev.display;
          state.nativeListEl.style.maxHeight = prev.maxHeight;
          state.nativeListEl.style.overflow = prev.overflow;
          state.nativeListEl.style.opacity = prev.opacity;
          state.nativeListEl.style.pointerEvents = prev.pointerEvents;
          state.nativeListEl.style.margin = prev.margin;
        }
      }
      state.nativeListEl = listEl;
      state.nativeListPrevStyle = {
        display: listEl.style.display,
        maxHeight: listEl.style.maxHeight,
        overflow: listEl.style.overflow,
        opacity: listEl.style.opacity,
        pointerEvents: listEl.style.pointerEvents,
        margin: listEl.style.margin,
      };
    }

    // Keep it in the DOM (and observable), but collapse visually.
    listEl.style.display = listEl.style.display || 'block';
    listEl.style.maxHeight = '0px';
    listEl.style.overflow = 'hidden';
    listEl.style.opacity = '0';
    listEl.style.pointerEvents = 'none';
    listEl.style.margin = '0';
  }

  NLE.detachListObserver = function detachListObserver() {
    state.listObserver?.disconnect?.();
    state.listObserver = null;
    state.listEl = null;

    if (state.nativeListEl) {
      setNativeListHidden(state.nativeListEl, false);
    }
  };

  function getNotebookIdFromUrl() {
    try {
      const url = new URL(window.location.href);
      NLE.log('Current URL:', url.href);
      const match = url.pathname.match(/\/notebook\/([a-f0-9-]+)/i);
      if (match) {
        NLE.log('Extracted notebookId:', match[1]);
        return match[1];
      }
      NLE.log('No notebookId match in pathname:', url.pathname);
      const fallback = `${url.pathname}${url.search}${url.hash}`;
      return fallback && fallback !== '/' ? fallback : null;
    } catch (err) {
      NLE.log('Error extracting notebookId:', err);
      return null;
    }
  }

  function emitActiveNotebook() {
    if (!state.frameEl?.contentWindow) return;
    const notebookId = getNotebookIdFromUrl();
    // Always emit if the ID changed (including from null to a value or vice versa)
    if (notebookId === state.activeNotebookId) return;
    NLE.log('Notebook ID changed from', state.activeNotebookId, 'to', notebookId);
    state.activeNotebookId = notebookId;
    if (NLE.postActiveNotebook) {
      NLE.postActiveNotebook(state.frameEl, notebookId);
    }
  }

  NLE.attachListObserver = function attachListObserver(listEl, frameEl) {
    if (state.listEl === listEl && state.listObserver) return;

    NLE.detachListObserver();
    state.listEl = listEl;

    let scheduled = false;
    const emit = () => {
      scheduled = false;
      if (!state.listEl || !state.frameEl?.contentWindow) return;
      const notebooks = NLE.extractNotebooksFromSidebar(state.listEl);
      state.notebooks = notebooks;
      emitActiveNotebook();
      NLE.postNotebooks(state.frameEl, notebooks);
      // Setup native drag handlers on notes
      if (NLE.setupNativeDrag) NLE.setupNativeDrag();
    };
    const scheduleEmit = () => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(emit);
    };

    frameEl.addEventListener('load', () => {
      emitActiveNotebook();
      emit();
    });
    emit();

    state.listObserver = new MutationObserver(scheduleEmit);
    state.listObserver.observe(listEl, { childList: true, subtree: true, characterData: true });
    NLE.log('Observing artifact list updates.');
  };

  NLE.ensureMounted = function ensureMounted() {
    // Check if extension is enabled
    if (!state.enabled) {
      // Extension disabled - remove our UI if present and restore native list
      if (state.hostEl) {
        state.hostEl.remove();
        state.hostEl = null;
        state.frameEl = null;
      }
      if (state.nativeListEl) {
        setNativeListHidden(state.nativeListEl, false);
      }
      NLE.detachListObserver();
      return;
    }

    const panelRoot = NLE.findPanelRoot();
    if (!panelRoot) {
      // Studio panel hidden or not present.
      NLE.detachListObserver();
      state.panelRootEl = null;
      state.hostEl = null;
      state.frameEl = null;
      return;
    }

    const artifactList = panelRoot.querySelector(selectors.artifactList);
    const host = NLE.ensureHost(panelRoot, artifactList);
    const frame = NLE.mountUi(host);

    state.panelRootEl = panelRoot;
    state.hostEl = host;
    state.frameEl = frame;

    if (artifactList && frame) {
      NLE.attachListObserver(artifactList, frame);

      if (state.hideNativeList) {
        setNativeListHidden(artifactList, true);
      }
    }
    
    // Always emit active notebook on mount/refresh to catch URL changes
    emitActiveNotebook();
  };

  NLE.scheduleEnsureMounted = function scheduleEnsureMounted() {
    if (state.ensureScheduled) return;
    state.ensureScheduled = true;
    requestAnimationFrame(() => {
      state.ensureScheduled = false;
      try {
        NLE.ensureMounted();
        emitActiveNotebook();
      } catch (err) {
        // Check if it's a context invalidated error
        if (err?.message?.includes('Extension context invalidated') || 
            err?.message?.includes('context invalidated')) {
          NLE.log('Extension context invalidated, attempting recovery...');
          // Clear state and try to reinitialize
          state.hostEl = null;
          state.frameEl = null;
          // Schedule a retry after a short delay
          setTimeout(() => {
            try {
              NLE.scheduleEnsureMounted();
            } catch (retryErr) {
              console.warn('[NotebookLM Enhancer] Recovery failed:', retryErr);
            }
          }, 500);
        } else if (err?.message?.includes('getURL') || err?.message?.includes('runtime')) {
          // Silenciar error temporal de runtime no disponible - se recuperará automáticamente
          NLE.log('Runtime temporarily unavailable, will retry');
        } else {
          console.warn('[NotebookLM Enhancer] ensureMounted failed', err);
        }
      }
    });
  };
})();
