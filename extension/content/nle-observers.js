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
      NLE.postNotebooks(state.frameEl, notebooks);
      // Setup native drag handlers on notes
      if (NLE.setupNativeDrag) NLE.setupNativeDrag();
    };
    const scheduleEmit = () => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(emit);
    };

    frameEl.addEventListener('load', emit);
    emit();

    state.listObserver = new MutationObserver(scheduleEmit);
    state.listObserver.observe(listEl, { childList: true, subtree: true, characterData: true });
    NLE.log('Observing artifact list updates.');
  };

  NLE.ensureMounted = function ensureMounted() {
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
  };

  NLE.scheduleEnsureMounted = function scheduleEnsureMounted() {
    if (state.ensureScheduled) return;
    state.ensureScheduled = true;
    requestAnimationFrame(() => {
      state.ensureScheduled = false;
      try {
        NLE.ensureMounted();
      } catch (err) {
        console.warn('[NotebookLM Enhancer] ensureMounted failed', err);
      }
    });
  };
})();
