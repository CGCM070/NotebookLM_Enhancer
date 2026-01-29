// Notebook extraction from native DOM.
(function () {
  const NLE = (window.__NLE__ = window.__NLE__ || {});
  const { selectors } = NLE.constants;

  NLE.extractNotebooksFromSidebar = function extractNotebooksFromSidebar(artifactListEl) {
    const titleEls = artifactListEl.querySelectorAll(selectors.artifactTitle);

    return Array.from(titleEls)
      .map((el, index) => {
        const title = (el.textContent ?? '').trim();
        if (!title) return null;

        const detailsEl = el.closest('.artifact-labels')?.querySelector(selectors.artifactDetails);
        const details = detailsEl ? (detailsEl.textContent ?? '').trim() : null;

        return {
          index,
          title,
          details,
        };
      })
      .filter((x) => x !== null);
  };
})();
