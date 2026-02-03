/**
 * Export System Core Module
 * Main orchestrator for the export functionality
 * Coordinates detection, extraction, UI, and format exports
 * @module export-core
 */

(function () {
  'use strict';
  
  const NLE = (window.__NLE__ = window.__NLE__ || {});
  
  // Track observer
  let exportObserver = null;
  let exportCheckTimeout = null;
  let isInitialized = false;

  /**
   * Handle export request event
   * @param {CustomEvent} event - The export request event
   */
  async function handleExportRequest(event) {
    const { format } = event.detail;
    
    NLE.log('Export requested:', format);
    
    // Set loading state
    NLE.exportUI.setButtonLoading(true);
    
    try {
      // Extract content
      const content = NLE.exportExtraction.extractNoteContent();
      
      if (!content) {
        console.error('[NLE Export] No content available for export');
        return;
      }

      NLE.log('Exporting note:', content.title, 'format:', format);

      // Execute export based on format
      const formatModule = getFormatModule(format);
      
      if (formatModule && typeof formatModule.export === 'function') {
        await formatModule.export(content);
      } else {
        throw new Error(`Unknown export format: ${format}`);
      }
    } catch (err) {
      console.error('[NLE Export] Export failed:', err);
      NLE.log('Export failed:', err);
    } finally {
      NLE.exportUI.setButtonLoading(false);
    }
  }

  /**
   * Get format module by ID
   * @param {string} formatId - Format identifier
   * @returns {Object | null} Format module or null
   */
  function getFormatModule(formatId) {
    const formatMap = {
      'pdf': NLE.exportFormatPDF,
      'markdown': NLE.exportFormatMarkdown,
      'html': NLE.exportFormatHTML,
      'txt': NLE.exportFormatTXT,
    };
    
    return formatMap[formatId] || null;
  }

  /**
   * Check and inject export button
   */
  function checkAndInjectButton() {
    // Clear any pending check
    clearTimeout(exportCheckTimeout);
    
    // Debounce the injection
    exportCheckTimeout = setTimeout(() => {
      NLE.exportUI.injectExportButton();
    }, 100);
  }

  /**
   * Setup observer to detect when note view opens/closes
   */
  function setupObserver() {
    // Initial check with delay to let page settle
    setTimeout(() => {
      NLE.exportUI.injectExportButton();
    }, 500);

    // Create observer for note view changes
    exportObserver = new MutationObserver(() => {
      checkAndInjectButton();
    });

    // Observe the document body for changes
    exportObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Listen for custom export events
    document.addEventListener('nle-export-request', handleExportRequest);

    NLE.log('Export system observer setup complete');
  }

  /**
   * Inject CSS styles for export system
   */
  function injectStyles() {
    if (document.getElementById('nle-export-styles')) return;

    const link = document.createElement('link');
    link.id = 'nle-export-styles';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content/styles.css');
    
    link.onload = () => {
      NLE.log('Export styles loaded');
    };
    
    link.onerror = () => {
      console.error('[NLE Export] Failed to load styles');
    };
    
    document.head.appendChild(link);
  }

  /**
   * Initialize export functionality
   * @returns {boolean} True if initialization succeeded
   */
  function init() {
    if (isInitialized) {
      NLE.log('Export system already initialized');
      return true;
    }

    NLE.log('Initializing export system v2.0 (modular)');

    try {
      // Verify all required modules are loaded
      const requiredModules = [
        'exportI18n',
        'exportDetection',
        'exportExtraction',
        'exportLibraries',
        'exportUtils',
        'exportUI',
        'exportFormatPDF',
        'exportFormatMarkdown',
        'exportFormatHTML',
        'exportFormatTXT',
      ];

      const missingModules = requiredModules.filter(
        (module) => typeof NLE[module] === 'undefined'
      );

      if (missingModules.length > 0) {
        console.error('[NLE Export] Missing modules:', missingModules.join(', '));
        return false;
      }

      // Inject styles
      injectStyles();

      // Setup observer
      setupObserver();

      isInitialized = true;
      NLE.log('Export system initialized successfully');
      return true;
    } catch (err) {
      console.error('[NLE Export] Initialization failed:', err);
      return false;
    }
  }

  /**
   * Cleanup export functionality
   */
  function cleanup() {
    if (exportObserver) {
      exportObserver.disconnect();
      exportObserver = null;
    }

    clearTimeout(exportCheckTimeout);
    
    NLE.exportUI.removeExportButton();
    
    document.removeEventListener('nle-export-request', handleExportRequest);
    
    isInitialized = false;
    NLE.log('Export system cleanup complete');
  }

  // Public API
  NLE.exportCore = {
    init: init,
    cleanup: cleanup,
    isInitialized: () => isInitialized,
  };

  // Legacy compatibility
  NLE.initExport = init;
  NLE.cleanupExport = cleanup;

  NLE.log('Export core module loaded');
})();
