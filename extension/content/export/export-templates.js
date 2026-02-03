/**
 * Export System HTML Templates
 * Separates HTML from logic for better maintainability
 */

(function () {
  'use strict';

  const NLE = (window.__NLE__ = window.__NLE__ || {});

  const PREVIEW_LENGTH = 500;

  const formatConfigs = [
    { id: 'pdf', icon: 'picture_as_pdf', label: 'PDF' },
    { id: 'markdown', icon: 'description', label: 'Markdown' },
    { id: 'html', icon: 'code', label: 'HTML' },
    { id: 'txt', icon: 'article', label: 'Text' },
  ];

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Export Modal Template
   */
  function exportModalTemplate(data, t, initialFormat) {
    return `
      <div class="nle-export-preview-modal">
        <div class="preview-header">
          <h2>${t('exportPreviewTitle')}</h2>
          <button class="close-btn" aria-label="Close">×</button>
        </div>

        <div class="note-info">
          <div class="note-details">
            <span class="note-title">${escapeHtml(data.title)}</span>
            <span class="note-stats">${data.wordCount} ${t('words')} • ${data.charCount} ${t('characters')}</span>
          </div>
        </div>

        <div class="content-preview-section">
          <div class="content-preview">
            ${escapeHtml(data.preview)}
          </div>
        </div>

        <div class="format-section">
          <label>${t('exportFormat')}</label>
          <div class="format-options">
            ${formatConfigs.map(format => `
              <button 
                class="format-btn ${format.id === initialFormat ? 'selected' : ''}" 
                data-format="${format.id}"
                title="Export as ${format.label}"
              >
                <span class="format-label">${format.label}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="options-section">
          <label class="section-label">${t('exportOptions')}</label>
          
          <label class="checkbox-label" title="${t('includeImagesTooltip') || 'Include images from the note in the exported file'}">
            <input type="checkbox" id="opt-images" checked>
            <span class="checkmark"></span>
            ${t('includeImages')}
          </label>

          <label class="checkbox-label" title="${t('includeCitationsTooltip') || 'Include source citations and references'}">
            <input type="checkbox" id="opt-citations">
            <span class="checkmark"></span>
            ${t('includeCitations')}
          </label>

          <label class="checkbox-label pdf-only" style="display: ${initialFormat === 'pdf' ? 'flex' : 'none'}" title="${t('pageNumbersTooltip') || 'Add page numbers at the bottom of each page (PDF only)'}">
            <input type="checkbox" id="opt-pagenumbers" checked>
            <span class="checkmark"></span>
            ${t('pageNumbers')}
          </label>
        </div>

        <div class="size-estimate">
          <span class="material-symbols-outlined">save</span>
          <span id="size-text">${t('calculating')}</span>
        </div>

        <div class="actions">
          <button class="btn-secondary" id="btn-cancel">${t('cancel')}</button>
          <button class="btn-primary" id="btn-export">
            ${t('export')}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Create full modal overlay with wrapper
   */
  function createModalOverlay(content, modalId) {
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'nle-export-preview-overlay';
    modal.innerHTML = content;
    return modal;
  }

  // Export template functions
  NLE.exportTemplates = {
    exportModal: exportModalTemplate,
    createOverlay: createModalOverlay,
    formatConfigs: formatConfigs,
    PREVIEW_LENGTH: PREVIEW_LENGTH,
  };

  NLE.log('Export templates module loaded');
})();
