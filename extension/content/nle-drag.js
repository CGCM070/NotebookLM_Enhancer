// Native drag-and-drop setup for artifact notes.
// This runs in the page context (not iframe) so it can set event handlers directly.
(function () {
    const NLE = (window.__NLE__ = window.__NLE__ || {});
    const { extensionHostId, messageTypeNativeDrop, selectors } = NLE.constants;
    const state = NLE.state;

    // Track which notes we've already set up for drag
    const setupNotes = new WeakSet();

    function ensureNativeDropOverlay() {
        if (state.nativeDragOverlayEl) return state.nativeDragOverlayEl;

        const el = document.createElement('div');
        el.id = 'nle-native-drop-overlay';
        el.style.position = 'fixed';
        el.style.left = '0px';
        el.style.top = '0px';
        el.style.width = '0px';
        el.style.height = '0px';
        el.style.zIndex = '2147483647';
        el.style.display = 'none';
        el.style.borderRadius = '12px';
        el.style.border = '1px dashed rgba(138,180,248,0.7)';
        el.style.background = 'rgba(32,33,36,0.25)';
        el.style.backdropFilter = 'blur(2px)';
        el.style.pointerEvents = 'auto';

        const label = document.createElement('div');
        label.textContent = 'Drop into folders';
        label.style.position = 'absolute';
        label.style.left = '10px';
        label.style.top = '10px';
        label.style.padding = '4px 8px';
        label.style.borderRadius = '999px';
        label.style.fontSize = '12px';
        label.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
        label.style.color = '#E8EAED';
        label.style.background = 'rgba(30,31,32,0.9)';
        label.style.border = '1px solid rgba(60,64,67,0.9)';

        el.appendChild(label);

        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            positionOverlayToFrame(el);
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            el.style.borderColor = 'rgba(138,180,248,1)';
            el.style.background = 'rgba(32,33,36,0.35)';
        });

        el.addEventListener('dragleave', () => {
            el.style.borderColor = 'rgba(138,180,248,0.7)';
            el.style.background = 'rgba(32,33,36,0.25)';
        });

        el.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const frame = state.frameEl;
            if (!frame?.contentWindow) {
                hideNativeDropOverlay();
                return;
            }

            const rect = frame.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            let payload = null;
            try {
                const raw = e.dataTransfer?.getData('application/x-nle-note') || '';
                if (raw) payload = JSON.parse(raw);
            } catch {
                payload = null;
            }

            const title = (payload?.title || state.activeNativeDrag?.title || '').toString();
            const key = (payload?.key || state.activeNativeDrag?.key || '').toString();

            frame.contentWindow.postMessage(
                {
                    type: messageTypeNativeDrop,
                    payload: {
                        notebook: { key, title },
                        x,
                        y,
                    },
                },
                '*'
            );

            hideNativeDropOverlay();
        });

        document.documentElement.appendChild(el);
        state.nativeDragOverlayEl = el;
        return el;
    }

    function positionOverlayToFrame(overlayEl) {
        const frame = state.frameEl;
        if (!frame) return false;
        const rect = frame.getBoundingClientRect();
        overlayEl.style.left = `${Math.floor(rect.left)}px`;
        overlayEl.style.top = `${Math.floor(rect.top)}px`;
        overlayEl.style.width = `${Math.floor(rect.width)}px`;
        overlayEl.style.height = `${Math.floor(rect.height)}px`;
        return rect.width > 0 && rect.height > 0;
    }

    function showNativeDropOverlay(note) {
        const overlayEl = ensureNativeDropOverlay();
        state.activeNativeDrag = note;
        const ok = positionOverlayToFrame(overlayEl);
        if (!ok) return;
        overlayEl.style.display = 'block';

        const cleanup = () => hideNativeDropOverlay();
        window.addEventListener('dragend', cleanup, { once: true, capture: true });
        window.addEventListener('drop', cleanup, { once: true, capture: true });
        window.addEventListener('resize', cleanup, { once: true });
    }

    function hideNativeDropOverlay() {
        if (state.nativeDragOverlayEl) state.nativeDragOverlayEl.style.display = 'none';
        state.activeNativeDrag = null;
    }

    /**
     * Setup draggable attribute and dragstart handler on native note elements.
     */
    NLE.setupNativeDrag = function setupNativeDrag() {
        const notes = document.querySelectorAll('artifact-library-note');

        for (const note of notes) {
            // Skip if inside our widget host
            if (note.closest(`#${extensionHostId}`)) continue;

            // Skip if already set up
            if (setupNotes.has(note)) continue;

            const titleEl = note.querySelector(selectors.artifactTitle);
            if (!titleEl) continue;

            const el = /** @type {HTMLElement} */ (note);
            el.setAttribute('draggable', 'true');

            el.addEventListener('dragstart', (e) => {
                const title = titleEl.textContent?.trim() || '';
                // Find the notebook data from our synced list
                const notebooks = state.notebooks || [];
                const nb = notebooks.find((n) => n.title.trim() === title);

                 showNativeDropOverlay({
                     key: nb?.key || '',
                     title,
                 });

                if (e.dataTransfer) {
                    e.dataTransfer.setData('text/plain', title);
                    e.dataTransfer.setData('application/x-nle-note', JSON.stringify({
                        key: nb?.key || '',
                        title: title
                    }));
                    e.dataTransfer.effectAllowed = 'move';
                }

                // Add visual feedback
                el.style.opacity = '0.5';
            });

            el.addEventListener('dragend', (e) => {
                el.style.opacity = '';
                hideNativeDropOverlay();
            });

            setupNotes.add(note);
        }
    };

    /**
     * Hide or show native notes based on folder assignments.
     * @param {Record<string, string>} folderByTitle - Map of title -> folderId
     */
    NLE.updateNativeNoteVisibility = function updateNativeNoteVisibility(folderByTitle) {
        const notes = document.querySelectorAll('artifact-library-note');

        for (const note of notes) {
            // Skip if inside our widget host
            if (note.closest(`#${extensionHostId}`)) continue;

            const titleEl = note.querySelector(selectors.artifactTitle);
            if (!titleEl) continue;

            const title = titleEl.textContent?.trim() || '';
            const el = /** @type {HTMLElement} */ (note);

            if (folderByTitle[title]) {
                el.style.display = 'none';
            } else {
                el.style.display = '';
            }
        }
    };
})();
