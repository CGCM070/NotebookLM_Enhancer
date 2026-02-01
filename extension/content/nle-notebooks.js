// Notebook extraction from native DOM.
(function () {
  const NLE = (window.__NLE__ = window.__NLE__ || {});
  const { selectors } = NLE.constants;

  // Mapa de iconos de NotebookLM a iconos de Material Symbols
  // Algunos iconos de NotebookLM son específicos de Google, usamos alternativas estándar
  const iconMapping = {
    'sticky_note_2': 'sticky_note_2',
    'audio_magic_eraser': 'headphones', // Alternativa a audio_magic_eraser (específico de Google)
    'subscriptions': 'subscriptions',
    'flowchart': 'account_tree', // flowchart no siempre está disponible
    'auto_tab_group': 'menu_book', // Alternativa a auto_tab_group (específico de Google)
    'cards_star': 'style', // Alternativa a cards_star
    'quiz': 'quiz',
    'stacked_bar_chart': 'stacked_bar_chart',
    'tablet': 'tablet',
    'table_view': 'table_view'
  };

  NLE.extractNotebooksFromSidebar = function extractNotebooksFromSidebar(artifactListEl) {
    const titleEls = artifactListEl.querySelectorAll(selectors.artifactTitle);

    return Array.from(titleEls)
      .map((el, index) => {
        const title = (el.textContent ?? '').trim();
        if (!title) return null;

        const detailsEl = el.closest('.artifact-labels')?.querySelector(selectors.artifactDetails);
        const details = detailsEl ? (detailsEl.textContent ?? '').trim() : null;

        // Buscar el icono - puede estar en artifact-library-item o artifact-library-note
        const itemContainer = el.closest('artifact-library-item, artifact-library-note');
        let icon = 'sticky_note_2'; // Default para notas
        let color = 'grey';

        if (itemContainer) {
          const iconEl = itemContainer.querySelector('mat-icon.artifact-icon');
          if (iconEl) {
            // Extraer nombre del icono del contenido de texto
            const originalIcon = (iconEl.textContent ?? 'sticky_note_2').trim();
            
            // Mapear a icono estándar de Material Symbols (algunos iconos de NotebookLM son específicos de Google)
            icon = iconMapping[originalIcon] || originalIcon;
            
            // Extraer color de las clases CSS
            const iconClasses = iconEl.className || '';
            const colorMatch = iconClasses.match(/\b(blue|green|pink|yellow|orange|cyan|grey)\b/);
            if (colorMatch) {
              color = colorMatch[1];
            }
          }
        }

        return {
          index,
          key: `${index}:${title}:${icon}`, // Incluir icon en key para unicidad
          title,
          details,
          icon,
          color
        };
      })
      .filter((x) => x !== null);
  };
})();
