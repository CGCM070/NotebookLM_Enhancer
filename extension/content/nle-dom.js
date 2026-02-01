// DOM location and mounting helpers.
(function () {
  const NLE = (window.__NLE__ = window.__NLE__ || {});
  const { extensionHostId, iframeId, iframeTitle, selectors } = NLE.constants;

  function findStudioPanel() {
    const section = document.querySelector(selectors.studioPanel);
    if (section) return section;

    // Fallback: tolerate changes (e.g. element type) as long as class survives.
    return document.querySelector('.studio-panel');
  }

  NLE.findPanelRoot = function findPanelRoot() {
    const studioPanel = findStudioPanel();
    if (studioPanel) {
      const panelRoot = studioPanel.querySelector(selectors.panelRoot);
      if (panelRoot) return panelRoot;
    }

    // Fallback: best-effort search.
    return document.querySelector(selectors.panelRoot);
  };

  NLE.ensureHost = function ensureHost(panelRootEl, insertBeforeEl) {
    const existing = panelRootEl.querySelector(`#${extensionHostId}`);
    if (existing) return existing;

    const host = document.createElement('div');
    host.id = extensionHostId;
    host.style.display = 'block';
    host.style.width = '100%';

    // Insert before the native artifact list so it feels native.
    if (insertBeforeEl?.parentNode === panelRootEl) {
      panelRootEl.insertBefore(host, insertBeforeEl);
    } else {
      panelRootEl.prepend(host);
    }
    return host;
  };

  NLE.mountUi = function mountUi(hostEl) {
    const shadow = hostEl.shadowRoot ?? hostEl.attachShadow({ mode: 'open' });

    const existingFrame = shadow.getElementById(iframeId);
    if (existingFrame) return /** @type {HTMLIFrameElement} */ (existingFrame);

    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; display: block; width: 100%; height: 100%; }
      .nle-wrap { display: block; width: 100%; height: 100%; overflow: hidden; }
      .nle-frame {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
      }
    `;

    const wrap = document.createElement('div');
    wrap.className = 'nle-wrap';

    const frame = document.createElement('iframe');
    frame.id = iframeId;
    frame.className = 'nle-frame';
    frame.title = iframeTitle;
    frame.src = chrome.runtime.getURL('index.html');

    wrap.appendChild(frame);
    shadow.appendChild(style);
    shadow.appendChild(wrap);

    setupDynamicHeight(hostEl, frame);

    return frame;
  };

  function setupDynamicHeight(hostEl, frameEl) {
    const studioPanel = findStudioPanel();
    if (!studioPanel) return;

    function updateHeight() {
      const rect = studioPanel.getBoundingClientRect();
      const height = Math.floor(rect.height);
      hostEl.style.height = height + 'px';
    }

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(studioPanel);
    NLE.observers = NLE.observers || [];
    NLE.observers.push(observer);
  }
})();
