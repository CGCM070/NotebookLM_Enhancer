/**
 * Export System Preview UI Module
 * Uses separated templates from export-templates.js
 * @module export-preview-ui
 */

(function () {
  'use strict';
  
  const NLE = (window.__NLE__ = window.__NLE__ || {});
  const { t } = NLE.exportI18n;
  const templates = NLE.exportTemplates;

  // Preview modal state
  let previewModal = null;
  let currentExportData = null;
  const MODAL_ID = 'nle-export-preview-modal';

  /**
   * Extract note data for export with preview
   */
  function extractExportData() {
    const content = NLE.exportExtraction.extractNoteContent();
    if (!content) return null;

    const wordCount = content.text.trim().split(/\s+/).filter(word => word.length > 0).length;
    const preview = content.text.substring(0, templates.PREVIEW_LENGTH);
    const hasMore = content.text.length > templates.PREVIEW_LENGTH;
    
    return {
      title: content.title,
      preview: preview + (hasMore ? '...' : ''),
      charCount: content.text.length,
      wordCount: wordCount,
      fullContent: content,
    };
  }

  /**
   * Create export modal using templates
   */
  function createExportModal(data, initialFormat) {
    const modalContent = templates.exportModal(data, t, initialFormat);
    return templates.createOverlay(modalContent, MODAL_ID);
  }

  /**
   * Calculate estimated file size
   */
  function calculateSize(format, charCount, includeImages, includeCitations) {
    const baseSize = Math.ceil(charCount / 1024);
    let multiplier = 1;

    switch (format) {
      case 'pdf': multiplier = 1.5; break;
      case 'html': multiplier = 1.3; break;
      case 'markdown': multiplier = 1.0; break;
      case 'txt': multiplier = 0.8; break;
    }

    if (includeImages) multiplier += 0.3;
    if (includeCitations) multiplier += 0.1;

    const estimatedKB = Math.max(1, Math.round(baseSize * multiplier));
    return estimatedKB < 1024 ? `~${estimatedKB} KB` : `~${(estimatedKB / 1024).toFixed(1)} MB`;
  }

  /**
   * Update size estimate display
   */
  function updateSizeEstimate() {
    if (!currentExportData || !previewModal) return;
    
    const selectedFormat = previewModal.querySelector('.format-btn.selected')?.dataset.format || 'pdf';
    const includeImages = previewModal.querySelector('#opt-images')?.checked || false;
    const includeCitations = previewModal.querySelector('#opt-citations')?.checked || false;
    
    const sizeText = calculateSize(
      selectedFormat, 
      currentExportData.charCount, 
      includeImages, 
      includeCitations
    );
    
    const sizeEl = previewModal.querySelector('#size-text');
    if (sizeEl) sizeEl.textContent = `${t('estimatedSize')}: ${sizeText}`;
  }

  /**
   * Show PDF-only options
   */
  function togglePdfOptions(format) {
    const pdfOnly = previewModal?.querySelectorAll('.pdf-only');
    pdfOnly?.forEach(el => {
      el.style.display = format === 'pdf' ? 'flex' : 'none';
    });
  }

  /**
   * Setup event listeners
   */
  function setupListeners() {
    if (!previewModal) return;

    // Close actions
    previewModal.querySelector('.close-btn')?.addEventListener('click', closeModal);
    previewModal.querySelector('#btn-cancel')?.addEventListener('click', closeModal);
    previewModal.addEventListener('click', (e) => {
      if (e.target === previewModal) closeModal();
    });

    // Format selection
    previewModal.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        previewModal.querySelectorAll('.format-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const format = btn.dataset.format;
        togglePdfOptions(format);
        updateSizeEstimate();
      });
    });

    // Options changes
    previewModal.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', updateSizeEstimate);
    });

    // Export button
    previewModal.querySelector('#btn-export')?.addEventListener('click', executeExport);
  }

  /**
   * Execute export
   */
  async function executeExport() {
    if (!currentExportData || !previewModal) return;

    const format = previewModal.querySelector('.format-btn.selected')?.dataset.format;
    const includeImages = previewModal.querySelector('#opt-images')?.checked || false;
    const includeCitations = previewModal.querySelector('#opt-citations')?.checked || false;

    // Show loading
    const exportBtn = previewModal.querySelector('#btn-export');
    exportBtn.innerHTML = '<span class="spinner"></span> ' + t('exporting') + '...';
    exportBtn.disabled = true;

    try {
      const formatMap = {
        'pdf': NLE.exportFormatPDF,
        'markdown': NLE.exportFormatMarkdown,
        'html': NLE.exportFormatHTML,
        'txt': NLE.exportFormatTXT,
      };

      const formatModule = formatMap[format];
      if (!formatModule) throw new Error('Unknown format');

      let content = { ...currentExportData.fullContent };
      
      if (!includeImages) {
        content.html = content.html.replace(/<img[^>]*>/gi, '');
      }

      await formatModule.export(content);
      closeModal();
      
    } catch (error) {
      console.error('[NLE Export] Failed:', error);
      exportBtn.innerHTML = '<span class="material-symbols-outlined">download</span> ' + t('export');
      exportBtn.disabled = false;
    }
  }

  /**
   * Show export modal
   */
  function showModal(initialFormat = 'pdf') {
    closeModal();

    const data = extractExportData();
    if (!data) {
      console.error('[NLE Export] No data available for preview');
      return;
    }

    currentExportData = data;
    previewModal = createExportModal(data, initialFormat);
    document.body.appendChild(previewModal);
    
    setupListeners();
    setTimeout(updateSizeEstimate, 0);

    NLE.log('Export modal shown with content preview');
  }

  /**
   * Close modal
   */
  function closeModal() {
    if (previewModal) {
      previewModal.remove();
      previewModal = null;
    }
    currentExportData = null;
  }

  /**
   * Check if modal is open
   */
  function isOpen() {
    return !!previewModal;
  }

  // Export module
  NLE.exportPreviewUI = {
    show: showModal,
    close: closeModal,
    isOpen: isOpen,
  };

  NLE.log('Export preview UI module loaded (with templates)');
})();
