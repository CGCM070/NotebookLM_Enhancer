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
import { FolderTreeComponent } from './components/folder-tree/folder-tree.component';
import { NotebookItemComponent } from './components/notebook-item/notebook-item.component';

import { FolderStructureService } from './services/folder-structure.service';

type NotebookItem = Notebook;

@Component({
  selector: 'app-root',
  imports: [AsyncPipe, DragDropModule, FolderTreeComponent, NotebookItemComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnDestroy {
  title = 'NotebookLM_Enhancer';

  notebooks: NotebookItem[] = [];

  notebookSections: Array<{ id: string | null; name: string; notebooks: NotebookItem[] }> = [];

  // New properties for the unified view
  unsortedNotebooks: NotebookItem[] = [];
  notebooksByFolderId: Record<string, NotebookItem[]> = {};
  isCollapsed = false;
  readonly dropDataUnsorted: NotebookDropListData = { targetFolderId: null };

  folderTree: FolderTreeNode[] = [];

  private readonly subs = new Subscription();

  readonly folders$: Observable<Folder[]>;
  readonly notebookFolderByKey$: Observable<Record<string, string | null>>;
  readonly notebookFolderByTitle$: Observable<Record<string, string | null>>;

  private readonly onMessage: (event: MessageEvent) => void;

  constructor(
    private readonly ngZone: NgZone,
    private readonly folders: FolderStructureService
  ) {
    this.folders$ = this.folders.folders$;
    this.notebookFolderByKey$ = this.folders.notebookFolderByKey$;
    this.notebookFolderByTitle$ = this.folders.notebookFolderByTitle$;

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

  private flattenFolderTree(tree: FolderTreeNode[]): Array<{ folder: Folder; depth: number }> {
    const out: Array<{ folder: Folder; depth: number }> = [];

    const walk = (nodes: FolderTreeNode[], depth: number) => {
      for (const node of nodes) {
        out.push({ folder: node.folder, depth });
        walk(node.children, depth + 1);
      }
    };

    walk(tree, 0);
    return out;
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
    const name = window.prompt('Folder name');
    if (!name) return;
    await this.folders.createFolder(name);
  }

  async createSubfolder(parent: Folder): Promise<void> {
    const name = window.prompt('Subfolder name');
    if (!name) return;
    await this.folders.createFolder(name, parent.id);
  }

  async toggleFolder(folder: Folder): Promise<void> {
    await this.folders.toggleFolderCollapsed(folder.id);
  }

  async renameFolder(folder: Folder): Promise<void> {
    const name = window.prompt('New folder name', folder.name);
    if (!name) return;
    await this.folders.renameFolder(folder.id, name);
  }

  async deleteFolder(folder: Folder): Promise<void> {
    const ok = window.confirm(
      `Delete folder "${folder.name}" and its subfolders? Notebooks in deleted folders will be moved to Unsorted.`
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

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onMessage);
    this.subs.unsubscribe();
  }
}
