// Content script shared state.
(function () {
  const NLE = (window.__NLE__ = window.__NLE__ || {});

  NLE.state = {
    panelRootEl: null,
    hostEl: null,
    frameEl: null,
    listEl: null,
    listObserver: null,

    // Last notebook snapshot extracted from native DOM.
    notebooks: [],

    // Hide the native list entirely; widget becomes the only UI.
    hideNativeList: true,
    nativeListEl: null,
    nativeListPrevStyle: null,

    // Native drag/drop bridge state.
    nativeDragOverlayEl: null,
    activeNativeDrag: null,

    ensureScheduled: false,
  };
})();
