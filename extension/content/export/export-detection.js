/**
 * Export System Detection Module
 * Detects when a note is being viewed and extracts note metadata
 * @module export-detection
 */

(function () {
  'use strict';
  
  const NLE = (window.__NLE__ = window.__NLE__ || {});
  const { selectors } = NLE.constants;

  /**
   * Check if we are currently viewing a note (note editor is open in studio panel)
   * @returns {boolean} True if note view is open
   */
  function isNoteViewOpen() {
    return !!getNoteEditor();
  }

  function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' &&
      rect.width > 0 && rect.height > 0;
  }

  /**
   * Get the panel header element for the note view (within studio panel)
   * @returns {HTMLElement | null} The header element or null if not found
   */
  function getNoteViewHeader() {
    const editor = getNoteEditor();
    if (editor) {
      const localHeader = editor.querySelector(
        'header, .panel-header, [class*="panel-header"], [class*="note-header"], [class*="header"]'
      );
      if (localHeader) return localHeader;
    }

    const header = document.querySelector(selectors.studioPanelHeader);
    if (header) return header;

    const panel = document.querySelector(selectors.studioPanel);
    const panelHeader = panel?.querySelector('header, [role="banner"], [class*="header"]');
    if (panelHeader) return panelHeader;

    const collapseButton = Array.from(document.querySelectorAll(selectors.noteCollapseButton))
      .find(isVisible);
    if (collapseButton) {
      return collapseButton.closest('header, [role="banner"], [class*="header"]') ||
        collapseButton.parentElement;
    }
    return null;
  }

  /**
   * Get the note editor element
   * @returns {HTMLElement | null} The note editor element
   */
  function getNoteEditor() {
    const editor = document.querySelector(selectors.noteEditor);
    if (editor) return editor;

    const panel = document.querySelector(selectors.studioPanel);
    if (panel) {
      // Newer builds may no longer expose the note-editor custom element.
      const hasNoteContent = panel.querySelector(
        selectors.noteDocViewer + ', ' +
        selectors.noteViewContent + ', ' +
        selectors.noteTitle + ', ' +
        '[contenteditable="true"], textarea, [role="textbox"], form'
      );
      if (hasNoteContent) return panel;
    }

    // Last-resort fallback for builds that moved the note view outside the
    // historical studio-panel container.
    const hasNoteContent = document.querySelector(
      selectors.noteDocViewer + ', ' +
      selectors.noteViewContent + ', ' +
      selectors.noteTitle + ', ' +
      '[contenteditable="true"], textarea, [role="textbox"], form'
    );
    const hasVisibleClose = Array.from(document.querySelectorAll(selectors.noteCollapseButton))
      .some(isVisible);
    return hasNoteContent && hasVisibleClose ? document.body : null;
  }

  /**
   * Get the collapse button in the note view header
   * @returns {HTMLElement | null} The collapse button
   */
  function getCollapseButton() {
    const header = getNoteViewHeader();
    if (!header) return null;
    return header.querySelector(selectors.noteCollapseButton);
  }

  function getNoteContentRoot() {
    const editor = getNoteEditor();
    if (!editor) return null;

    return editor.querySelector(
      selectors.noteDocViewer + ', ' +
      selectors.noteViewContent + ', ' +
      '[contenteditable="true"], textarea, [role="textbox"]'
    ) || editor;
  }

  /**
   * Get note metadata without full content extraction
   * @returns {{ title: string, hasContent: boolean } | null} Basic note info
   */
  function getNoteMetadata() {
    const noteEditor = getNoteEditor();
    if (!noteEditor) return null;

    // Get title
    const titleInput = noteEditor.querySelector(selectors.noteTitle);
    const title = titleInput?.value || titleInput?.textContent?.trim() || 'Untitled Note';

    // Check if has content viewer
    const docViewer = noteEditor.querySelector(selectors.noteDocViewer);
    const form = noteEditor.querySelector('form');
    
    return {
      title: title,
      hasContent: !!(docViewer || form),
    };
  }

  /**
   * Check if the export button is already injected
   * @returns {boolean} True if button exists
   */
  function isExportButtonInjected() {
    return !!document.getElementById(NLE.constants.exportButtonId);
  }

  /**
   * Wait for note view to be ready
   * @param {number} timeout - Maximum time to wait in ms
   * @returns {Promise<boolean>} Resolves when note view is ready or timeout
   */
  function waitForNoteView(timeout = 5000) {
    return new Promise((resolve) => {
      if (isNoteViewOpen()) {
        resolve(true);
        return;
      }

      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (isNoteViewOpen()) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  }

  // Export module
  NLE.exportDetection = {
    isNoteViewOpen: isNoteViewOpen,
    getNoteViewHeader: getNoteViewHeader,
    getNoteEditor: getNoteEditor,
    getNoteContentRoot: getNoteContentRoot,
    getCollapseButton: getCollapseButton,
    getNoteMetadata: getNoteMetadata,
    isExportButtonInjected: isExportButtonInjected,
    waitForNoteView: waitForNoteView,
  };

  NLE.log('Export detection module loaded');
})();
