/**
 * Export System UI Module
 * Handles UI components for the export system
 * @module export-ui
 */

(function () {
  'use strict';
  
  const NLE = (window.__NLE__ = window.__NLE__ || {});
  const { exportButtonId } = NLE.constants;
  const { t } = NLE.exportI18n;

  /**
   * Create the export button element
   * @returns {HTMLButtonElement} The export button
   */
  function createExportButton() {
    const button = document.createElement('button');
    button.id = exportButtonId;
    button.className =
      'mdc-icon-button mat-mdc-icon-button mat-mdc-button-base mat-mdc-tooltip-trigger label-medium-button mat-unthemed nle-export-button';
    button.setAttribute('mat-icon-button', '');
    button.setAttribute('aria-label', t('exportButton'));
    button.setAttribute('title', t('exportButton'));

    button.innerHTML = `
      <span class="mat-mdc-button-persistent-ripple mdc-icon-button__ripple"></span>
      <mat-icon role="img" aria-hidden="true" class="mat-icon notranslate material-symbols-outlined google-symbols mat-icon-no-color" data-mat-icon-type="font" style="font-size: 24px;">download</mat-icon>
      <span class="mat-focus-indicator"></span>
      <span class="mat-mdc-button-touch-target"></span>
    `;

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      handleExportButtonClick();
    });

    return button;
  }

  /**
   * Handle export button click - goes directly to preview
   */
  function handleExportButtonClick() {
    // Show preview modal directly (no intermediate menu)
    if (NLE.exportPreviewUI && typeof NLE.exportPreviewUI.show === 'function') {
      NLE.exportPreviewUI.show('pdf'); // Default to PDF, user can change in preview
    } else {
      // Fallback to direct export if preview UI not available
      console.error('[NLE Export] Preview UI not available');
    }
  }

  /**
   * Remove export button from DOM
   */
  function removeExportButton() {
    const button = document.getElementById(exportButtonId);
    if (button) {
      button.remove();
      NLE.log('Export button removed');
    }
  }

  /**
   * Inject export button into note view header
   * @returns {boolean} True if button was injected
   */
  function injectExportButton() {
    const { getNoteViewHeader, getCollapseButton, isNoteViewOpen, isExportButtonInjected } = NLE.exportDetection;
    
    // Check if note view is open
    if (!isNoteViewOpen()) {
      removeExportButton();
      return false;
    }

    // Check if button already exists
    if (isExportButtonInjected()) {
      return false;
    }

    const header = getNoteViewHeader();
    if (!header) return false;

    const collapseButton = getCollapseButton();
    const button = createExportButton();

    if (collapseButton) {
      collapseButton.parentNode?.insertBefore(button, collapseButton);
    } else {
      // Fallback: insert at the end of header
      const anyButton = header.querySelector('button:last-of-type');
      if (anyButton && anyButton.parentNode) {
        anyButton.parentNode.insertBefore(button, anyButton.nextSibling);
      } else {
        header.appendChild(button);
      }
    }

    NLE.log('Export button injected');
    return true;
  }

  // Export module
  NLE.exportUI = {
    createExportButton: createExportButton,
    injectExportButton: injectExportButton,
    removeExportButton: removeExportButton,
  };

  NLE.log('Export UI module loaded (simplified - direct to preview)');
})();
