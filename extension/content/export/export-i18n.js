/**
 * Export System Internationalization Module
 * Shared translations for the export system
 * @module export-i18n
 */

(function () {
  'use strict';
  
  const NLE = (window.__NLE__ = window.__NLE__ || {});

  /**
   * Translation dictionary for export system
   * @type {Object.<string, Object.<string, string>>}
   */
  const translations = {
    en: {
      exportButton: 'Export note',
      pdf: 'PDF Document',
      markdown: 'Markdown',
      html: 'HTML Page',
      txt: 'Plain Text',
      exportedFrom: 'Exported from NotebookLM on',
      exportError: 'Could not extract note content. Please try again.',
      pdfError: 'Failed to export PDF. Please try again.',
      loadingPdf: 'Loading PDF libraries...',
      downloadFailed: 'Download failed. Please try again.',
      preparingExport: 'Preparing export...',
      // Preview modal translations
      exportPreviewTitle: 'Export Note',
      words: 'words',
      characters: 'characters',
      contentPreview: 'Preview',
      exportFormat: 'Export Format',
      exportOptions: 'Options',
      includeImages: 'Include images',
      includeCitations: 'Include citations',
      pageNumbers: 'Add page numbers',
      estimatedSize: 'Estimated size',
      calculating: 'Calculating...',
      cancel: 'Cancel',
      export: 'Export',
      exporting: 'Exporting',
      // Format descriptions
      pdfDesc: 'Document with formatting',
      markdownDesc: 'Editable text format',
      htmlDesc: 'Web page format',
      txtDesc: 'Plain text only',
      // Preview type labels
      previewDocument: 'Document Preview',
      previewMarkdown: 'Markdown Preview',
      previewHTML: 'HTML Preview',
      previewText: 'Text Preview',
      // Tooltip translations
      includeImagesTooltip: 'Include images from the note in the exported file',
      includeCitationsTooltip: 'Include source citations and references',
      pageNumbersTooltip: 'Add page numbers at the bottom of each page (PDF only)',
    },
    es: {
      exportButton: 'Exportar nota',
      pdf: 'Documento PDF',
      markdown: 'Markdown',
      html: 'Página HTML',
      txt: 'Texto plano',
      exportedFrom: 'Exportado desde NotebookLM el',
      exportError: 'No se pudo extraer el contenido de la nota. Por favor, inténtalo de nuevo.',
      pdfError: 'Error al exportar PDF. Por favor, inténtalo de nuevo.',
      loadingPdf: 'Cargando librerías PDF...',
      downloadFailed: 'Error en la descarga. Por favor, inténtalo de nuevo.',
      preparingExport: 'Preparando exportación...',
      // Preview modal translations
      exportPreviewTitle: 'Exportar Nota',
      words: 'palabras',
      characters: 'caracteres',
      contentPreview: 'Vista previa',
      exportFormat: 'Formato de exportación',
      exportOptions: 'Opciones',
      includeImages: 'Incluir imágenes',
      includeCitations: 'Incluir citas',
      pageNumbers: 'Añadir números de página',
      estimatedSize: 'Tamaño estimado',
      calculating: 'Calculando...',
      cancel: 'Cancelar',
      export: 'Exportar',
      exporting: 'Exportando',
      // Format descriptions
      pdfDesc: 'Documento con formato',
      markdownDesc: 'Formato de texto editable',
      htmlDesc: 'Formato de página web',
      txtDesc: 'Solo texto plano',
      // Preview type labels
      previewDocument: 'Vista previa del documento',
      previewMarkdown: 'Vista previa Markdown',
      previewHTML: 'Vista previa HTML',
      previewText: 'Vista previa de texto',
      // Tooltip translations
      includeImagesTooltip: 'Incluir las imágenes de la nota en el archivo exportado',
      includeCitationsTooltip: 'Incluir citas y referencias de las fuentes',
      pageNumbersTooltip: 'Añadir números de página en la parte inferior (solo PDF)',
    },
  };

  // Store forced language from widget
  let forcedLang = null;

  /**
   * Get current language from document or default to English
   * Priority: forcedLang > document.lang > URL param > default
   * @returns {'en' | 'es'} The detected language code
   */
  function getCurrentLang() {
    // If language was forced by widget, use that
    if (forcedLang) return forcedLang;
    
    const htmlLang = document.documentElement.lang?.toLowerCase() || '';
    if (htmlLang.startsWith('es')) return 'es';
    // Check URL for Spanish locale
    if (location.href.includes('hl=es')) return 'es';
    return 'en';
  }

  /**
   * Set/force a specific language (called from widget via postMessage)
   * @param {'en' | 'es'} lang - Language code
   */
  function setLanguage(lang) {
    if (translations[lang]) {
      forcedLang = lang;
      NLE.log('Export i18n language set to:', lang);
    }
  }

  /**
   * Get translation for a key
   * @param {string} key - The translation key
   * @returns {string} The translated string or the key if not found
   */
  function translate(key) {
    const lang = getCurrentLang();
    return translations[lang]?.[key] || translations.en[key] || key;
  }

  /**
   * Get all translations for current language
   * @returns {Object.<string, string>} Object with all translations
   */
  function getAllTranslations() {
    const lang = getCurrentLang();
    return translations[lang] || translations.en;
  }

  /**
   * Add custom translations (useful for extending)
   * @param {string} lang - Language code
   * @param {Object.<string, string>} newTranslations - New translations to add
   */
  function addTranslations(lang, newTranslations) {
    if (!translations[lang]) {
      translations[lang] = {};
    }
    Object.assign(translations[lang], newTranslations);
  }

  // Export module
  NLE.exportI18n = {
    t: translate,
    translate: translate,
    getCurrentLang: getCurrentLang,
    setLanguage: setLanguage,
    getAllTranslations: getAllTranslations,
    addTranslations: addTranslations,
    _translations: translations, // Exposed for debugging
  };

  NLE.log('Export i18n module loaded');
})();
