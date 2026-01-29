// Observers for the Studio panel and artifact list.
(function () {
  const NLE = (window.__NLE__ = window.__NLE__ || {});
  const { selectors } = NLE.constants;
  const state = NLE.state;

  NLE.detachListObserver = function detachListObserver() {
    state.listObserver?.disconnect?.();
    state.listObserver = null;
    state.listEl = null;
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
      NLE.postNotebooks(state.frameEl, notebooks);
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
