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
    messageTypeDeleteNotebooksBatch: 'NLE_DELETE_NOTEBOOKS_BATCH',
    messageTypeNativeDrop: 'NLE_NATIVE_DROP',
    messageTypeAddNote: 'NLE_ADD_NOTE',
    messageTypeExportNote: 'NLE_EXPORT_NOTE',

    selectors: {
      studioPanel: 'section.studio-panel, [data-testid="studio-panel"], [class~="studio-panel"]',
      panelRoot: '.panel-content-scrollable, [data-testid="studio-panel-content"]',
      artifactList: '.artifact-library-container, [data-testid="artifact-library"]',
      artifactTitle: '.artifact-title, [data-testid="artifact-title"]',
      artifactDetails: '.artifact-details, [data-testid="artifact-details"]',
      artifactButton: 'button.artifact-stretched-button, button[data-testid="artifact-open"]',
      artifactMoreButton: 'button.artifact-more-button, button[data-testid="artifact-more"]',
      // Note view selectors (when viewing note content) - must be within studio-panel
      studioPanelHeader: 'section.studio-panel .panel-header, [data-testid="studio-panel"] .panel-header',
      noteViewContent: 'section.studio-panel .panel-content-write, [data-testid="studio-panel"] [data-testid="note-content"]',
      noteEditor: 'section.studio-panel note-editor, [data-testid="studio-panel"] note-editor, [data-testid="note-editor"]',
      noteTitle: '.note-header__editable-title, input[formcontrolname="name"]',
      noteDocViewer: 'labs-tailwind-doc-viewer, [data-testid="note-doc-viewer"]',
      noteCollapseButton: 'button[aria-label*="Cerrar"], button[aria-label*="Close"], button[aria-label*="collapse"]',
    },

    exportButtonId: 'nle-export-button',
    exportMenuId: 'nle-export-menu',
  };
})();
