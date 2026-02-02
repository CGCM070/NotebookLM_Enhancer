// Shared constants for content scripts.
(function () {
  const NLE = (window.__NLE__ = window.__NLE__ || {});

  NLE.constants = {
    extensionHostId: 'notebooklm-enhancer-root',
    iframeId: 'nle-frame',
    iframeTitle: 'NotebookLM Enhancer',

    messageTypeNotebooksSync: 'NLE_NOTEBOOKS_SYNC',
    messageTypeActiveNotebook: 'NLE_ACTIVE_NOTEBOOK',
    messageTypeOpenNotebook: 'NLE_OPEN_NOTEBOOK',
    messageTypeOpenNotebookMenu: 'NLE_OPEN_NOTE_MENU',
    messageTypeDeleteNotebook: 'NLE_DELETE_NOTEBOOK',
    messageTypeNativeDrop: 'NLE_NATIVE_DROP',
    messageTypeAddNote: 'NLE_ADD_NOTE',
    messageTypeExportNote: 'NLE_EXPORT_NOTE',

    selectors: {
      studioPanel: 'section.studio-panel',
      panelRoot: '.panel-content-scrollable',
      artifactList: '.artifact-library-container',
      artifactTitle: '.artifact-title',
      artifactDetails: '.artifact-details',
      artifactButton: 'button.artifact-button-content',
      artifactMoreButton: 'button.artifact-more-button',
      // Note view selectors (when viewing note content) - must be within studio-panel
      studioPanelHeader: 'section.studio-panel .panel-header',
      noteViewContent: 'section.studio-panel .panel-content-write',
      noteEditor: 'section.studio-panel note-editor',
      noteTitle: '.note-header__editable-title, input[formcontrolname="name"]',
      noteDocViewer: 'labs-tailwind-doc-viewer',
      noteCollapseButton: 'button[aria-label*="Cerrar"], button[aria-label*="Close"], button[aria-label*="collapse"]',
    },

    exportButtonId: 'nle-export-button',
    exportMenuId: 'nle-export-menu',
  };
})();
