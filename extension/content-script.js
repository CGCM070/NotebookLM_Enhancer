/*
  Content script entrypoint.
  Injects a ShadowRoot host into the NotebookLM sidebar and mounts the Angular UI via an iframe.
*/

(function () {
  const EXTENSION_HOST_ID = 'notebooklm-enhancer-root';
  const IFRAME_TITLE = 'NotebookLM Enhancer';
  const MESSAGE_TYPE_NOTEBOOKS = 'NLE_NOTEBOOKS_SYNC';
  const SIDEBAR_QUERY_CANDIDATES = ['.artifact-library-container', 'artifact-library', '[class*="artifact-library"]'];

  function log(...args) {
    // Keep logs low-noise; useful during selector hardening.
    console.debug('[NotebookLM Enhancer]', ...args);
  }

  function findSidebarContainer() {
    for (const selector of SIDEBAR_QUERY_CANDIDATES) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  function ensureHost(containerEl) {
    const existing = containerEl.querySelector(`#${EXTENSION_HOST_ID}`);
    if (existing) return existing;

    const host = document.createElement('div');
    host.id = EXTENSION_HOST_ID;
    host.style.display = 'block';
    host.style.width = '100%';

    // Insert at the top of the container so it feels native.
    containerEl.prepend(host);
    return host;
  }

  function mountUi(hostEl) {
    const shadow = hostEl.shadowRoot ?? hostEl.attachShadow({ mode: 'open' });

    if (shadow.getElementById('nle-frame')) return;

    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; display: block; width: 100%; }
      .nle-wrap { display: block; width: 100%; }
      .nle-frame {
        width: 100%;
        height: 280px;
        border: 0;
        display: block;
      }
    `;

    const wrap = document.createElement('div');
    wrap.className = 'nle-wrap';

    const frame = document.createElement('iframe');
    frame.id = 'nle-frame';
    frame.className = 'nle-frame';
    frame.title = IFRAME_TITLE;
    frame.src = chrome.runtime.getURL('index.html');

    wrap.appendChild(frame);
    shadow.appendChild(style);
    shadow.appendChild(wrap);

    return frame;
  }

  function extractNotebooksFromSidebar(containerEl) {
    const titleEls = containerEl.querySelectorAll('.artifact-title');

    return Array.from(titleEls)
      .map((el) => {
        const title = (el.textContent ?? '').trim();
        if (!title) return null;

        const detailsEl = el.closest('.artifact-labels')?.querySelector('.artifact-details');
        const details = detailsEl ? (detailsEl.textContent ?? '').trim() : null;

        return {
          title,
          details,
        };
      })
      .filter((x) => x !== null);
  }

  function postNotebooks(frameEl, notebooks) {
    if (!frameEl?.contentWindow) return;
    frameEl.contentWindow.postMessage(
      {
        type: MESSAGE_TYPE_NOTEBOOKS,
        payload: {
          notebooks,
          timestamp: Date.now(),
        },
      },
      '*'
    );
  }

  function startSidebarObserver(containerEl, frameEl) {
    let scheduled = false;

    const emit = () => {
      scheduled = false;
      const notebooks = extractNotebooksFromSidebar(containerEl);
      postNotebooks(frameEl, notebooks);
    };

    const scheduleEmit = () => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(emit);
    };

    frameEl?.addEventListener('load', emit);
    emit();

    const observer = new MutationObserver(scheduleEmit);
    observer.observe(containerEl, { childList: true, subtree: true, characterData: true });
  }

  function tryInitOnce() {
    const container = findSidebarContainer();
    if (!container) return false;

    const host = ensureHost(container);
    const frame = mountUi(host);
    if (frame) startSidebarObserver(container, frame);
    return true;
  }

  function initWithRetry() {
    if (tryInitOnce()) {
      log('Mounted.');
      return;
    }

    const timeoutMs = 15000;
    const intervalMs = 250;
    const start = Date.now();

    const timer = window.setInterval(() => {
      if (tryInitOnce()) {
        window.clearInterval(timer);
        log('Mounted after retry.');
        return;
      }

      if (Date.now() - start > timeoutMs) {
        window.clearInterval(timer);
        log('Sidebar not found; giving up after timeout.');
      }
    }, intervalMs);
  }

  initWithRetry();
})();
