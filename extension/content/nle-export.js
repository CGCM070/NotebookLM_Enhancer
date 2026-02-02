// Export functionality for NotebookLM notes.
// Injects export button into note view header and handles export to PDF, Markdown, HTML, and TXT.
(function () {
  const NLE = (window.__NLE__ = window.__NLE__ || {});
  const { selectors, exportButtonId, exportMenuId } = NLE.constants;

  // Track if libraries are loaded
  let pdfMakeLoaded = false;
  let htmlToPdfMakeLoaded = false;

  // ============================================================================
  // Translations
  // ============================================================================

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
    },
    es: {
      exportButton: 'Exportar nota',
      pdf: 'Documento PDF',
      markdown: 'Markdown',
      html: 'Pagina HTML',
      txt: 'Texto plano',
      exportedFrom: 'Exportado desde NotebookLM el',
      exportError: 'No se pudo extraer el contenido de la nota. Por favor, intentalo de nuevo.',
      pdfError: 'Error al exportar PDF. Por favor, intentalo de nuevo.',
      loadingPdf: 'Cargando librerias PDF...',
    },
  };

  /**
   * Get current language from document or default to English
   * @returns {'en' | 'es'}
   */
  function getCurrentLang() {
    const htmlLang = document.documentElement.lang?.toLowerCase() || '';
    if (htmlLang.startsWith('es')) return 'es';
    // Check URL for Spanish locale
    if (location.href.includes('hl=es')) return 'es';
    return 'en';
  }

  /**
   * Get translation for key
   * @param {string} key
   * @returns {string}
   */
  function t(key) {
    const lang = getCurrentLang();
    return translations[lang]?.[key] || translations.en[key] || key;
  }

  // ============================================================================
  // Library Loading
  // ============================================================================

  /**
   * Load a script from extension resources
   * @param {string} src - The script source path
   * @returns {Promise<void>}
   */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Load PDF export libraries (pdfmake + html-to-pdfmake)
   * @returns {Promise<boolean>}
   */
  async function loadPdfLibraries() {
    if (pdfMakeLoaded && htmlToPdfMakeLoaded) return true;

    try {
      const extensionUrl = chrome.runtime.getURL('');

      // Load pdfmake first
      if (!pdfMakeLoaded) {
        await loadScript(`${extensionUrl}lib/pdfmake.min.js`);
        await loadScript(`${extensionUrl}lib/vfs_fonts.min.js`);
        pdfMakeLoaded = true;
        NLE.log('pdfmake loaded');
      }

      // Load html-to-pdfmake
      if (!htmlToPdfMakeLoaded) {
        await loadScript(`${extensionUrl}lib/html-to-pdfmake.min.js`);
        htmlToPdfMakeLoaded = true;
        NLE.log('html-to-pdfmake loaded');
      }

      return true;
    } catch (err) {
      NLE.log('Failed to load PDF libraries:', err);
      return false;
    }
  }

  // ============================================================================
  // Note Detection
  // ============================================================================

  /**
   * Check if we are currently viewing a note (note editor is open in studio panel)
   * @returns {boolean}
   */
  function isNoteViewOpen() {
    // Check for note-editor specifically within the studio panel (right sidebar)
    const noteEditor = document.querySelector(selectors.noteEditor);
    return !!noteEditor;
  }

  /**
   * Get the panel header element for the note view (within studio panel)
   * @returns {HTMLElement | null}
   */
  function getNoteViewHeader() {
    // Get the header specifically from the studio panel (right sidebar)
    return document.querySelector(selectors.studioPanelHeader);
  }

  // ============================================================================
  // Content Extraction
  // ============================================================================

  /**
   * Extract note content (title, HTML, text)
   * @returns {{ title: string, html: string, text: string, timestamp: Date } | null}
   */
  function extractNoteContent() {
    // Use the studio-panel specific selector
    const noteEditor = document.querySelector(selectors.noteEditor);
    if (!noteEditor) return null;

    // Get title
    const titleInput = noteEditor.querySelector(selectors.noteTitle);
    const title = titleInput?.value || titleInput?.textContent?.trim() || 'Untitled Note';

    // Get content viewer
    const docViewer = noteEditor.querySelector(selectors.noteDocViewer);
    if (!docViewer) {
      // Try to get form content directly
      const form = noteEditor.querySelector('form');
      if (form) {
        return {
          title: sanitizeFilename(title),
          html: form.innerHTML,
          text: form.textContent || '',
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
   * @param {HTMLElement} element
   */
  function cleanHtmlForExport(element) {
    // Remove citation buttons and UI elements
    const removeSelectors = [
      'button.citation-marker',
      'button.xap-inline-dialog',
      'sources-carousel-inline',
      'sources-carousel',
      'source-footnote',
      '[jslog]',
      '.mat-ripple',
      '.mat-focus-indicator',
      '.mat-mdc-button-touch-target',
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
          attr.name === 'data-start-index'
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
  }

  /**
   * Sanitize string to be safe as filename
   * @param {string} name
   * @returns {string}
   */
  function sanitizeFilename(name) {
    return name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100) || 'note';
  }

  // ============================================================================
  // Export Functions
  // ============================================================================

  /**
   * Download a file
   * @param {string} filename
   * @param {string | Blob} content
   * @param {string} mimeType
   */
  function downloadFile(filename, content, mimeType) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Export to plain text
   * @param {{ title: string, text: string, timestamp: Date }} content
   */
  function exportToText(content) {
    const { title, text, timestamp } = content;
    const formattedDate = timestamp.toLocaleString();
    const output = `${title}\n${'='.repeat(title.length)}\n\n${t('exportedFrom')} ${formattedDate}\n\n${text}`;
    downloadFile(`${title}.txt`, output, 'text/plain;charset=utf-8');
    NLE.log('Exported to TXT:', title);
  }

  /**
   * Export to HTML file
   * @param {{ title: string, html: string, timestamp: Date }} content
   */
  function exportToHTML(content) {
    const { title, html, timestamp } = content;
    const formattedDate = timestamp.toLocaleString();

    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1 { font-size: 1.8em; margin-bottom: 0.5em; }
    .metadata { font-size: 0.85em; color: #666; margin-bottom: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 1em; }
    p { margin: 0.5em 0; }
    ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
    li { margin-bottom: 0.3em; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.9em; }
    pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    strong, b { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f9f9f9; font-weight: 600; }
    blockquote { margin: 1em 0; padding: 0.5em 1em; border-left: 4px solid #ddd; color: #666; }
    .paragraph { margin: 0.5em 0; }
    .heading3 { font-size: 1.2em; font-weight: 600; margin-top: 1em; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="metadata">${t('exportedFrom')} ${escapeHtml(formattedDate)}</div>
  <div class="content">${html}</div>
</body>
</html>`;

    downloadFile(`${title}.html`, fullHTML, 'text/html;charset=utf-8');
    NLE.log('Exported to HTML:', title);
  }

  /**
   * Convert HTML to Markdown
   * @param {string} html
   * @returns {string}
   */
  function htmlToMarkdown(html) {
    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = html;

    // Process the DOM tree
    return processNodeToMarkdown(container).trim();
  }

  /**
   * Process a DOM node to Markdown
   * @param {Node} node
   * @returns {string}
   */
  function processNodeToMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = /** @type {HTMLElement} */ (node);
    const tagName = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map(processNodeToMarkdown).join('');

    switch (tagName) {
      case 'h1':
        return `# ${children.trim()}\n\n`;
      case 'h2':
        return `## ${children.trim()}\n\n`;
      case 'h3':
        return `### ${children.trim()}\n\n`;
      case 'h4':
        return `#### ${children.trim()}\n\n`;
      case 'h5':
        return `##### ${children.trim()}\n\n`;
      case 'h6':
        return `###### ${children.trim()}\n\n`;
      case 'p':
      case 'div':
        if (el.classList.contains('paragraph')) {
          if (el.classList.contains('heading3')) {
            return `### ${children.trim()}\n\n`;
          }
          return `${children.trim()}\n\n`;
        }
        return children ? `${children}\n` : '';
      case 'br':
        return '\n';
      case 'strong':
      case 'b':
        return `**${children}**`;
      case 'em':
      case 'i':
        return `*${children}*`;
      case 'u':
        return `<u>${children}</u>`;
      case 's':
      case 'strike':
      case 'del':
        return `~~${children}~~`;
      case 'code':
        return `\`${children}\``;
      case 'pre':
        return `\n\`\`\`\n${children.trim()}\n\`\`\`\n\n`;
      case 'a':
        const href = el.getAttribute('href') || '';
        return `[${children}](${href})`;
      case 'ul':
        return `${processListToMarkdown(el, '-')}\n`;
      case 'ol':
        return `${processListToMarkdown(el, '1.')}\n`;
      case 'li':
        return children;
      case 'blockquote':
        return children
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n') + '\n\n';
      case 'table':
        return processTableToMarkdown(el);
      case 'span':
        return children;
      default:
        return children;
    }
  }

  /**
   * Process list to Markdown
   * @param {HTMLElement} listEl
   * @param {string} marker
   * @returns {string}
   */
  function processListToMarkdown(listEl, marker) {
    const items = Array.from(listEl.children);
    return items
      .map((item, index) => {
        const content = processNodeToMarkdown(item).trim();
        const prefix = marker === '1.' ? `${index + 1}.` : marker;
        return `${prefix} ${content}`;
      })
      .join('\n');
  }

  /**
   * Process table to Markdown
   * @param {HTMLElement} tableEl
   * @returns {string}
   */
  function processTableToMarkdown(tableEl) {
    const rows = Array.from(tableEl.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    const result = [];
    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      const cellContents = cells.map((cell) => processNodeToMarkdown(cell).trim().replace(/\|/g, '\\|'));
      result.push(`| ${cellContents.join(' | ')} |`);

      // Add header separator after first row
      if (rowIndex === 0) {
        result.push(`| ${cells.map(() => '---').join(' | ')} |`);
      }
    });

    return result.join('\n') + '\n\n';
  }

  /**
   * Export to Markdown
   * @param {{ title: string, html: string, timestamp: Date }} content
   */
  function exportToMarkdown(content) {
    const { title, html, timestamp } = content;
    const formattedDate = timestamp.toLocaleString();

    const markdown = `# ${title}\n\n*${t('exportedFrom')} ${formattedDate}*\n\n---\n\n${htmlToMarkdown(html)}`;

    downloadFile(`${title}.md`, markdown, 'text/markdown;charset=utf-8');
    NLE.log('Exported to Markdown:', title);
  }

  /**
   * Export to PDF using pdfmake
   * @param {{ title: string, html: string, timestamp: Date }} content
   */
  async function exportToPDF(content) {
    const { title, html, timestamp } = content;
    const formattedDate = timestamp.toLocaleString();

    // Load libraries if needed
    const loaded = await loadPdfLibraries();
    if (!loaded) {
      alert(t('pdfError'));
      return;
    }

    try {
      // Check if libraries are available
      if (typeof window.pdfMake === 'undefined' || typeof window.htmlToPdfmake === 'undefined') {
        throw new Error('PDF libraries not available');
      }

      // Convert HTML to pdfmake format
      const pdfContent = window.htmlToPdfmake(html, {
        tableAutoSize: true,
        defaultStyles: {
          b: { bold: true },
          strong: { bold: true },
          i: { italics: true },
          em: { italics: true },
          code: { font: 'Courier', fontSize: 10, background: '#f5f5f5' },
          pre: { font: 'Courier', fontSize: 9, background: '#f5f5f5', margin: [0, 5, 0, 5] },
        },
      });

      // Create document definition
      const docDefinition = {
        info: {
          title: title,
          creator: 'NotebookLM Enhancer',
          producer: 'pdfmake',
        },
        content: [
          { text: title, style: 'header' },
          { text: `${t('exportedFrom')} ${formattedDate}`, style: 'metadata' },
          { text: '', margin: [0, 10, 0, 0] }, // Spacer
          ...pdfContent,
        ],
        defaultStyle: {
          fontSize: 11,
          lineHeight: 1.4,
        },
        styles: {
          header: {
            fontSize: 22,
            bold: true,
            margin: [0, 0, 0, 5],
          },
          metadata: {
            fontSize: 10,
            italics: true,
            color: '#666666',
            margin: [0, 0, 0, 15],
          },
          'html-h1': { fontSize: 20, bold: true, margin: [0, 15, 0, 5] },
          'html-h2': { fontSize: 18, bold: true, margin: [0, 12, 0, 5] },
          'html-h3': { fontSize: 16, bold: true, margin: [0, 10, 0, 5] },
          'html-h4': { fontSize: 14, bold: true, margin: [0, 8, 0, 5] },
          'html-code': { font: 'Courier', fontSize: 10, background: '#f5f5f5' },
          'html-pre': { font: 'Courier', fontSize: 9, background: '#f5f5f5' },
        },
        pageMargins: [40, 40, 40, 40],
      };

      // Generate and download PDF
      window.pdfMake.createPdf(docDefinition).download(`${title}.pdf`);
      NLE.log('Exported to PDF:', title);
    } catch (err) {
      NLE.log('PDF export error:', err);
      alert(t('pdfError'));
    }
  }

  /**
   * Escape HTML entities
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================================================
  // UI Components
  // ============================================================================

  /**
   * Create the export button element
   * @returns {HTMLButtonElement}
   */
  function createExportButton() {
    const button = document.createElement('button');
    button.id = exportButtonId;
    button.className =
      'mdc-icon-button mat-mdc-icon-button mat-mdc-button-base mat-mdc-tooltip-trigger label-medium-button mat-unthemed nle-export-button';
    button.setAttribute('mat-icon-button', '');
    button.setAttribute('aria-label', t('exportButton'));
    button.setAttribute('title', t('exportButton'));
    button.style.cssText = 'position: relative;';

    button.innerHTML = `
      <span class="mat-mdc-button-persistent-ripple mdc-icon-button__ripple"></span>
      <mat-icon role="img" aria-hidden="true" class="mat-icon notranslate material-symbols-outlined google-symbols mat-icon-no-color" data-mat-icon-type="font" style="font-size: 24px;">download</mat-icon>
      <span class="mat-focus-indicator"></span>
      <span class="mat-mdc-button-touch-target"></span>
    `;

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleExportMenu(button);
    });

    return button;
  }

  /**
   * Create the export menu element
   * @returns {HTMLDivElement}
   */
  function createExportMenu() {
    const menu = document.createElement('div');
    menu.id = exportMenuId;
    menu.className = 'nle-export-menu';
    menu.style.cssText = `
      position: absolute;
      top: 100%;
      right: 0;
      z-index: 10000;
      background: var(--gm3-sys-color-surface-container, #fff);
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      min-width: 160px;
      overflow: hidden;
      display: none;
    `;

    const formats = [
      { id: 'pdf', icon: 'picture_as_pdf', labelKey: 'pdf', format: 'pdf' },
      { id: 'markdown', icon: 'description', labelKey: 'markdown', format: 'markdown' },
      { id: 'html', icon: 'code', labelKey: 'html', format: 'html' },
      { id: 'txt', icon: 'article', labelKey: 'txt', format: 'txt' },
    ];

    formats.forEach(({ id, icon, labelKey, format }) => {
      const item = document.createElement('button');
      item.className = 'nle-export-menu-item';
      item.dataset.format = format;
      item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 12px 16px;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 14px;
        color: var(--gm3-sys-color-on-surface, #1f1f1f);
        text-align: left;
        transition: background 0.15s;
      `;

      item.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 20px; color: var(--gm3-sys-color-on-surface-variant, #444);">${icon}</span>
        <span>${t(labelKey)}</span>
      `;

      item.addEventListener('mouseenter', () => {
        item.style.background = 'var(--gm3-sys-color-surface-container-highest, #f0f0f0)';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
      });

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        handleExport(format);
        hideExportMenu();
      });

      menu.appendChild(item);
    });

    return menu;
  }

  /**
   * Toggle export menu visibility
   * @param {HTMLElement} button
   */
  function toggleExportMenu(button) {
    let menu = document.getElementById(exportMenuId);

    if (!menu) {
      menu = createExportMenu();
      button.appendChild(menu);
    }

    const isVisible = menu.style.display !== 'none';
    menu.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
      // Close menu when clicking outside
      const closeHandler = (e) => {
        if (!button.contains(e.target)) {
          hideExportMenu();
          document.removeEventListener('click', closeHandler);
        }
      };
      setTimeout(() => document.addEventListener('click', closeHandler), 0);
    }
  }

  /**
   * Hide export menu
   */
  function hideExportMenu() {
    const menu = document.getElementById(exportMenuId);
    if (menu) {
      menu.style.display = 'none';
    }
  }

  /**
   * Handle export action
   * @param {string} format
   */
  function handleExport(format) {
    const content = extractNoteContent();
    if (!content) {
      NLE.log('No note content to export');
      alert(t('exportError'));
      return;
    }

    NLE.log('Exporting note:', content.title, 'format:', format);

    switch (format) {
      case 'pdf':
        void exportToPDF(content);
        break;
      case 'markdown':
        exportToMarkdown(content);
        break;
      case 'html':
        exportToHTML(content);
        break;
      case 'txt':
        exportToText(content);
        break;
      default:
        NLE.log('Unknown format:', format);
    }
  }

  // ============================================================================
  // Button Injection
  // ============================================================================

  /**
   * Inject export button into note view header
   */
  function injectExportButton() {
    // Check if note view is open
    if (!isNoteViewOpen()) {
      removeExportButton();
      return;
    }

    // Check if button already exists
    if (document.getElementById(exportButtonId)) {
      return;
    }

    const header = getNoteViewHeader();
    if (!header) return;

    // Find the collapse button to insert before it
    const collapseButton = header.querySelector(selectors.noteCollapseButton);
    if (!collapseButton) {
      // Try to find any button in the header
      const anyButton = header.querySelector('button');
      if (anyButton) {
        const button = createExportButton();
        anyButton.parentNode?.insertBefore(button, anyButton);
        NLE.log('Export button injected before first button');
      }
      return;
    }

    const button = createExportButton();
    collapseButton.parentNode?.insertBefore(button, collapseButton);
    NLE.log('Export button injected into note header');
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

  // ============================================================================
  // Observer Setup
  // ============================================================================

  /**
   * Set up observer to detect when note view opens/closes
   */
  function setupNoteViewObserver() {
    // Initial check
    setTimeout(injectExportButton, 500);

    // Create observer for note view changes
    const observer = new MutationObserver(() => {
      // Debounce the check
      clearTimeout(NLE.exportCheckTimeout);
      NLE.exportCheckTimeout = setTimeout(() => {
        injectExportButton();
      }, 100);
    });

    // Observe the document body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    NLE.exportObserver = observer;
    NLE.log('Note view observer set up');
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize export functionality
   */
  NLE.initExport = function initExport() {
    NLE.log('Initializing export functionality');
    setupNoteViewObserver();
  };

  /**
   * Cleanup export functionality
   */
  NLE.cleanupExport = function cleanupExport() {
    if (NLE.exportObserver) {
      NLE.exportObserver.disconnect();
      NLE.exportObserver = null;
    }
    removeExportButton();
    clearTimeout(NLE.exportCheckTimeout);
  };
})();
