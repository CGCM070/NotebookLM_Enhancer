// Content script shared state.
(function () {
  const NLE = (window.__NLE__ = window.__NLE__ || {});

  NLE.state = {
    panelRootEl: null,
    hostEl: null,
    frameEl: null,
    listEl: null,
    listObserver: null,

    ensureScheduled: false,
  };
})();
