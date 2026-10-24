/**
 * Export System Content Extraction Module
 * Extracts and cleans note content for export
 * @module export-extraction
 */

(function () {
  'use strict';

  const NLE = (window.__NLE__ = window.__NLE__ || {});
  const { selectors } = NLE.constants;

  /**
   * @typedef {Object} NoteContent
   * @property {string} title - Sanitized title for filename
   * @property {string} html - Clean HTML content
   * @property {string} text - Plain text content
   * @property {Date} timestamp - Export timestamp
   */

  /**
   * Extract note content (title, HTML, text)
   * @returns {NoteContent | null} The extracted content or null if extraction failed
   */
  function extractNoteContent() {
    // Use the studio-panel specific selector
    const noteEditor = NLE.exportDetection.getNoteEditor();
    if (!noteEditor) return null;

    // Get title
    const titleInput = noteEditor.querySelector(selectors.noteTitle);
    const title = titleInput?.value || titleInput?.textContent?.trim() ||
      document.querySelector('h1, [role="heading"]')?.textContent?.trim() ||
      'Untitled Note';

    // Get content viewer
    const docViewer = NLE.exportDetection.getNoteContentRoot();
    if (!docViewer) {
      // Try to get form content directly
      const form = noteEditor.querySelector('form');
      if (form) {
        const cleanForm = cleanHtmlForExport(form.cloneNode(true));
        return {
          title: sanitizeFilename(title),
          html: cleanForm.innerHTML,
          text: cleanForm.textContent || '',
          timestamp: new Date(),
        };
      }
      return null;
    }

    // Clone and clean the HTML
    const clone = docViewer.cloneNode(true);
    cleanHtmlForExport(clone);

    return {
      title: sanitizeFilename(title),
      html: clone.innerHTML,
      text: clone.textContent || '',
      timestamp: new Date(),
    };
  }

  /**
   * Clean HTML element for export (remove UI elements, attributes, etc.)
   * Mutates the element in place
   * @param {HTMLElement} element - The element to clean
   * @returns {HTMLElement} The cleaned element (same reference)
   */
  function cleanHtmlForExport(element) {
    // Remove citation buttons and UI elements
    const removeSelectors = [
      'button.xap-inline-dialog',
      'sources-carousel-inline',
      'sources-carousel',
      '[jslog]',
      '.mat-ripple',
      '.mat-focus-indicator',
      '.mat-mdc-button-touch-target',
      '.nle-export-button', // Remove our own button if present
      '#nle-export-menu',
    ];

    removeSelectors.forEach((sel) => {
      element.querySelectorAll(sel).forEach((el) => el.remove());
    });

    // Remove jslog attributes
    element.querySelectorAll('[jslog]').forEach((el) => el.removeAttribute('jslog'));

    // Remove Angular-specific attributes
    const angularAttrs = [];
    element.querySelectorAll('*').forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (
          attr.name.startsWith('_ngcontent') ||
          attr.name.startsWith('_nghost') ||
          attr.name.startsWith('ng-') ||
          attr.name === 'data-start-index' ||
          attr.name.startsWith('aria-') // Remove ARIA attributes that might conflict
        ) {
          angularAttrs.push({ el, name: attr.name });
        }
      });
    });
    angularAttrs.forEach(({ el, name }) => el.removeAttribute(name));

    // Clean class names (remove Angular dynamic classes)
    element.querySelectorAll('*').forEach((el) => {
      const classes = Array.from(el.classList);
      const cleanClasses = classes.filter(
        (c) => !c.startsWith('ng-') && !c.startsWith('mat-') && !c.startsWith('mdc-') && !c.startsWith('cdk-')
      );
      el.className = cleanClasses.join(' ');
    });

    return element;
  }

  /**
   * Sanitize string to be safe as filename
   * @param {string} name - The original name
   * @returns {string} Sanitized filename
   */
  function sanitizeFilename(name) {
    return name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100) || 'note';
  }

  /**
   * Escape HTML entities for safe embedding
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Get raw HTML content without cleaning (for debugging)
   * @returns {string | null} Raw HTML or null
   */
  function getRawHtml() {
    const noteEditor = NLE.exportDetection.getNoteEditor();
    if (!noteEditor) return null;

    const docViewer = noteEditor.querySelector(selectors.noteDocViewer);
    return docViewer?.innerHTML || null;
  }

  // Export module
  NLE.exportExtraction = {
    extractNoteContent: extractNoteContent,
    cleanHtmlForExport: cleanHtmlForExport,
    sanitizeFilename: sanitizeFilename,
    escapeHtml: escapeHtml,
    getRawHtml: getRawHtml,
  };

  NLE.log('Export extraction module loaded');
})();
