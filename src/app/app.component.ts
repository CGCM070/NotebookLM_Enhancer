import { AsyncPipe } from '@angular/common';
import { DragDropModule, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, NgZone, OnDestroy } from '@angular/core';
import type { Observable } from 'rxjs';
import { Subscription } from 'rxjs';

import type { NotebookDropListData } from './models/drag-drop.model';
import type { Folder } from './models/folder.model';
import type { FolderTreeNode } from './models/folder-tree-node.model';
import type { NotebookMenuRequest } from './models/notebook-menu.model';
import type { Notebook } from './models/notebook.model';
import type { ThemeType } from './models/theme.model';
import { FolderTreeComponent } from './components/folder-tree/folder-tree.component';
import { NotebookItemComponent } from './components/notebook-item/notebook-item.component';
import { ModalComponent } from './components/modal/modal.component';

import { FolderStructureService } from './services/folder-structure.service';
import { ThemeService } from './services/theme.service';
import { ModalService } from './services/modal.service';

type NotebookItem = Notebook;

@Component({
  selector: 'app-root',
  imports: [AsyncPipe, DragDropModule, FolderTreeComponent, NotebookItemComponent, ModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnDestroy {
  title = 'NotebookLM_Enhancer';

  notebooks: NotebookItem[] = [];

  // Unified view properties
  unsortedNotebooks: NotebookItem[] = [];
  notebooksByFolderId: Record<string, NotebookItem[]> = {};
  isInboxCollapsed = false;
  readonly dropDataUnsorted: NotebookDropListData = { targetFolderId: null };

  folderTree: FolderTreeNode[] = [];

  private readonly subs = new Subscription();

  readonly folders$: Observable<Folder[]>;
  readonly notebookFolderByKey$: Observable<Record<string, string | null>>;
  readonly notebookFolderByTitle$: Observable<Record<string, string | null>>;

  // Theme observables
  readonly theme$: Observable<ThemeType>;
  readonly isDark$: Observable<boolean>;

  private readonly onMessage: (event: MessageEvent) => void;

  // Modal state
  isModalOpen = false;

  // Modal configuration getter for template
  get modalConfig() {
    return this.modalService.activeModal$;
  }

  constructor(
    private readonly ngZone: NgZone,
    private readonly folders: FolderStructureService,
    private readonly themeService: ThemeService,
    readonly modalService: ModalService
  ) {
    this.folders$ = this.folders.folders$;
    this.notebookFolderByKey$ = this.folders.notebookFolderByKey$;
    this.notebookFolderByTitle$ = this.folders.notebookFolderByTitle$;

    // Theme observables
    this.theme$ = this.themeService.theme$;
    this.isDark$ = this.themeService.isDark$;

    this.onMessage = (event: MessageEvent) => {
      // Messages come from the NotebookLM page context via the content script.
      if (event.origin !== 'https://notebooklm.google.com') return;
      if (!event.data || typeof event.data !== 'object') return;

      const data = event.data as { type?: unknown; payload?: unknown };

      if (data.type === 'NLE_NOTEBOOKS_SYNC') {
        const payload = data.payload as { notebooks?: unknown };
        const notebooks = payload.notebooks;
        if (!Array.isArray(notebooks)) return;

        this.ngZone.run(() => {
          this.notebooks = notebooks
            .map((n) => {
              if (!n || typeof n !== 'object') return null;
              const nn = n as { index?: unknown; key?: unknown; title?: unknown; details?: unknown };
              if (typeof nn.index !== 'number' || !Number.isInteger(nn.index) || nn.index < 0) return null;
              if (typeof nn.title !== 'string') return null;
              const key = typeof nn.key === 'string' && nn.key ? nn.key : `${nn.index}:${nn.title}`;
              const details = typeof nn.details === 'string' ? nn.details : null;
              return { index: nn.index, key, title: nn.title, details } satisfies NotebookItem;
            })
            .filter((n): n is NotebookItem => n !== null);

          this.recomputeNotebookSections();
        });
        return;
      }

      if (data.type === 'NLE_ACTIVE_NOTEBOOK') {
        const payload = data.payload as { notebookId?: unknown };
        const notebookId = typeof payload.notebookId === 'string' ? payload.notebookId : null;
        this.ngZone.run(() => {
          void this.folders.setActiveNotebookId(notebookId);
        });
        return;
      }

      if (data.type === 'NLE_NATIVE_DROP') {
        const payload = data.payload as { notebook?: unknown; x?: unknown; y?: unknown };
        const nbRaw = payload.notebook;
        if (!nbRaw || typeof nbRaw !== 'object') return;
        const nb = nbRaw as { key?: unknown; title?: unknown };
        const key = typeof nb.key === 'string' ? nb.key : null;
        const title = typeof nb.title === 'string' ? nb.title : null;
        if (!key || !title) return;
        if (typeof payload.x !== 'number' || typeof payload.y !== 'number') return;

        this.ngZone.run(() => {
          void this.handleNativeDrop({ key, title }, payload.x as number, payload.y as number);
        });
      }
    };

    window.addEventListener('message', this.onMessage);

    this.subs.add(
      this.folders.folders$.subscribe(() => {
        this.recomputeNotebookSections();
      })
    );
    this.subs.add(
      this.folders.notebookFolderByTitle$.subscribe(() => {
        this.recomputeNotebookSections();
      })
    );
    this.subs.add(
      this.folders.notebookFolderByKey$.subscribe(() => {
        this.recomputeNotebookSections();
      })
    );

    // Subscribe to modal state
    this.subs.add(
      this.modalService.activeModal$.subscribe((modal) => {
        this.isModalOpen = modal !== null;
      })
    );
    
    // Signal to content script that iframe is ready to receive messages
    window.parent.postMessage({ type: 'NLE_IFRAME_READY' }, '*');
  }

  private recomputeNotebookSections(): void {
    const folders = this.folders.folders$.value;
    const mapByKey = this.folders.notebookFolderByKey$.value;
    const mapByTitle = this.folders.notebookFolderByTitle$.value;

    this.folderTree = this.buildFolderTree(folders);

    const validFolderIds = new Set(folders.map((f) => f.id));
    const byId = new Map<string, NotebookItem[]>();
    const unsorted: NotebookItem[] = [];

    for (const nb of this.notebooks) {
      const folderId = mapByKey[nb.key] ?? mapByTitle[nb.title] ?? null;
      if (!folderId || !validFolderIds.has(folderId)) {
        unsorted.push(nb);
        continue;
      }
      const arr = byId.get(folderId) ?? [];
      arr.push(nb);
      byId.set(folderId, arr);
    }

    const out: Record<string, NotebookItem[]> = {};
    for (const [id, arr] of byId.entries()) out[id] = arr;

    this.unsortedNotebooks = unsorted;
    this.notebooksByFolderId = out;
  }

  private async handleNativeDrop(nb: { key: string; title: string }, x: number, y: number): Promise<void> {
    const el = document.elementFromPoint(x, y);
    const target = el?.closest?.('[data-nle-drop-folder-id]') as HTMLElement | null;
    if (!target) return;

    const raw = target.getAttribute('data-nle-drop-folder-id');
    if (raw === null) return;

    const folderId = raw.trim() ? raw.trim() : null;
    await this.folders.setNotebookFolder(nb.key, folderId, nb.title);
  }


  private buildFolderTree(folders: Folder[]): FolderTreeNode[] {
    const byId = new Map<string, Folder>();
    for (const f of folders) byId.set(f.id, f);

    const childrenByParent = new Map<string | null, Folder[]>();
    for (const f of folders) {
      const parentId = f.parentId && byId.has(f.parentId) ? f.parentId : null;
      const arr = childrenByParent.get(parentId) ?? [];
      arr.push(f);
      childrenByParent.set(parentId, arr);
    }

    const sortByName = (a: Folder, b: Folder) => a.name.localeCompare(b.name);
    for (const [k, arr] of childrenByParent) {
      childrenByParent.set(k, arr.slice().sort(sortByName));
    }

    const build = (parentId: string | null): FolderTreeNode[] => {
      return (childrenByParent.get(parentId) ?? []).map((folder) => ({
        folder,
        children: build(folder.id),
      }));
    };

    return build(null);
  }

  openNotebook(nb: NotebookItem): void {
    // Send a click intent to the content script (page context) via the iframe parent.
    window.parent.postMessage(
      {
        type: 'NLE_OPEN_NOTEBOOK',
        payload: {
          index: nb.index,
          title: nb.title,
        },
      },
      '*'
    );
  }

  openNotebookMenu(req: NotebookMenuRequest): void {
    window.parent.postMessage(
      {
        type: 'NLE_OPEN_NOTE_MENU',
        payload: {
          index: req.notebook.index,
          title: req.notebook.title,
          x: req.x,
          y: req.y,
        },
      },
      '*'
    );
  }

  async createFolder(): Promise<void> {
    const name = await this.modalService.prompt('Nueva carpeta');
    if (!name) return;
    const folder = await this.folders.createFolder(name);
    void this.scrollAndHighlightFolder(folder.id);
  }

  async createSubfolder(parent: Folder): Promise<void> {
    const name = await this.modalService.prompt('Nueva subcarpeta');
    if (!name) return;
    const folder = await this.folders.createFolder(name, parent.id);
    void this.scrollAndHighlightFolder(folder.id);
  }

  toggleInbox(): void {
    this.isInboxCollapsed = !this.isInboxCollapsed;
  }


  /**
   * Scroll smoothly to a folder and highlight it briefly
   * Only scrolls for root folders (no parentId). Subfolders don't scroll.
   */
  private async scrollAndHighlightFolder(folderId: string): Promise<void> {
    // Wait for DOM to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Find the folder element
    const element = document.querySelector(`div[data-nle-folder-id="${folderId}"]`) as HTMLElement | null;
    if (!element) return;

    // Check if this is a root folder or subfolder
    const folder = this.folders.folders$.value.find((f) => f.id === folderId);
    const isRootFolder = !folder?.parentId;

    // For subfolders, just highlight (no scroll needed)
    if (!isRootFolder) {
      element.classList.add('nle-folder-highlight');
      setTimeout(() => element.classList.remove('nle-folder-highlight'), 520);
      return;
    }


    // Get the scroll container
    const scrollContainer = document.querySelector('.overflow-y-auto') as HTMLElement | null;
    if (!scrollContainer) {
      element.classList.add('nle-folder-highlight');
      setTimeout(() => element.classList.remove('nle-folder-highlight'), 520);
      return;
    }

    // Use getBoundingClientRect() for accurate positioning
    const elementRect = element.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();

    // Calculate element position relative to scroll container
    const elementTopFromContainer = elementRect.top - containerRect.top + scrollContainer.scrollTop;

    // Scroll to center the element in the container
    const targetScrollTop = elementTopFromContainer - (scrollContainer.clientHeight / 2) + (elementRect.height / 2);

    // Scroll to element
    scrollContainer.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });

    // Add highlight effect
    element.classList.add('nle-folder-highlight');

    // Remove highlight after 520ms
    setTimeout(() => {
      element.classList.remove('nle-folder-highlight');
    }, 520);
  }

  async toggleFolder(folder: Folder): Promise<void> {
    await this.folders.toggleFolderCollapsed(folder.id);
  }

  async renameFolder(folder: Folder): Promise<void> {
    const name = await this.modalService.prompt('Renombrar carpeta', folder.name);
    if (!name) return;
    await this.folders.renameFolder(folder.id, name);
  }

  async deleteFolder(folder: Folder): Promise<void> {
    const ok = await this.modalService.confirm(
      'Eliminar carpeta',
      `¿Seguro que quieres eliminar "${folder.name}" y sus subcarpetas? Las notas se moverán a Inbox.`
    );
    if (!ok) return;
    await this.folders.deleteFolder(folder.id);
  }

  async setNotebookFolder(nb: NotebookItem, folderId: string | null): Promise<void> {
    await this.folders.setNotebookFolder(nb.key, folderId, nb.title);
  }

  async onNotebookDropped(
    event: CdkDragDrop<NotebookDropListData, NotebookDropListData, NotebookItem>
  ): Promise<void> {
    const targetFolderId = event.container.data?.targetFolderId ?? null;
    const nb = event.item.data as Partial<NotebookItem> | null;
    if (!nb || typeof nb.key !== 'string' || typeof nb.title !== 'string') return;
    await this.folders.setNotebookFolder(nb.key, targetFolderId, nb.title);
  }

  /**
   * Toggle theme between light → dark → system → light
   */
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  /**
   * Get current theme metadata for display
   */
  get themeIcon(): string {
    const theme = this.themeService.currentTheme;
    switch (theme) {
      case 'light':
        return 'sun';
      case 'dark':
        return 'moon';
      case 'system':
      default:
        return 'monitor';
    }
  }

  get themeTooltip(): string {
    return this.themeService.getCurrentThemeMetadata().tooltip;
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onMessage);
    this.subs.unsubscribe();
    this.themeService.destroy();
  }
}
