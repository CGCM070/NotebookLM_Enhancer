// Shared constants for content scripts.
(function () {
  const NLE = (window.__NLE__ = window.__NLE__ || {});

  NLE.constants = {
    extensionHostId: 'notebooklm-enhancer-root',
    iframeId: 'nle-frame',
    iframeTitle: 'NotebookLM Enhancer',

    messageTypeNotebooksSync: 'NLE_NOTEBOOKS_SYNC',
    messageTypeOpenNotebook: 'NLE_OPEN_NOTEBOOK',

    selectors: {
      studioPanel: 'section.studio-panel',
      panelRoot: '.panel-content-scrollable',
      artifactList: '.artifact-library-container',
      artifactTitle: '.artifact-title',
      artifactDetails: '.artifact-details',
      artifactButton: 'button.artifact-button-content',
    },
  };
})();
