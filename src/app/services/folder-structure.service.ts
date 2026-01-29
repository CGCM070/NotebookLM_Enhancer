import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import type { Folder } from '../models/folder.model';
import type { StorageState } from '../models/storage-state.model';
import { StorageService } from './storage.service';

function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `f_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

@Injectable({ providedIn: 'root' })
export class FolderStructureService {
  private readonly state$ = new BehaviorSubject<StorageState | null>(null);

  readonly folders$ = new BehaviorSubject<Folder[]>([]);
  readonly notebookFolderByKey$ = new BehaviorSubject<Record<string, string | null>>({});
  readonly notebookFolderByTitle$ = new BehaviorSubject<Record<string, string | null>>({});

  constructor(private readonly storage: StorageService) {
    void this.init();
  }

  private async init(): Promise<void> {
    const state = await this.storage.load();
    this.state$.next(state);
    this.folders$.next(state.folders);
    this.notebookFolderByKey$.next(state.notebookFolderByKey);
    this.notebookFolderByTitle$.next(state.notebookFolderByTitle);
  }

  private async commit(next: StorageState): Promise<void> {
    this.state$.next(next);
    this.folders$.next(next.folders);
    this.notebookFolderByKey$.next(next.notebookFolderByKey);
    this.notebookFolderByTitle$.next(next.notebookFolderByTitle);
    await this.storage.save(next);
  }

  async createFolder(name: string, parentId: string | null = null): Promise<Folder> {
    const base = this.state$.value;
    if (!base) throw new Error('FolderStructureService not initialized');

    const folder: Folder = {
      id: uid(),
      name: name.trim() || 'Untitled',
      parentId,
      collapsed: false,
      createdAt: Date.now(),
    };

    await this.commit({
      ...base,
      folders: [...base.folders, folder],
    });

    return folder;
  }

  async renameFolder(folderId: string, name: string): Promise<void> {
    const base = this.state$.value;
    if (!base) throw new Error('FolderStructureService not initialized');

    const nextName = name.trim();
    if (!nextName) return;

    await this.commit({
      ...base,
      folders: base.folders.map((f) => (f.id === folderId ? { ...f, name: nextName } : f)),
    });
  }

  async deleteFolder(folderId: string): Promise<void> {
    const base = this.state$.value;
    if (!base) throw new Error('FolderStructureService not initialized');

    const deletedIds = this.getDescendantFolderIds(base.folders, folderId);
    deletedIds.add(folderId);

    const remaining = base.folders.filter((f) => !deletedIds.has(f.id));

    const nextKeyMap: Record<string, string | null> = { ...base.notebookFolderByKey };
    for (const [key, id] of Object.entries(nextKeyMap)) {
      if (id && deletedIds.has(id)) nextKeyMap[key] = null;
    }

    const nextTitleMap: Record<string, string | null> = { ...base.notebookFolderByTitle };
    for (const [title, id] of Object.entries(nextTitleMap)) {
      if (id && deletedIds.has(id)) nextTitleMap[title] = null;
    }

    await this.commit({
      ...base,
      folders: remaining,
      notebookFolderByKey: nextKeyMap,
      notebookFolderByTitle: nextTitleMap,
    });
  }

  async toggleFolderCollapsed(folderId: string): Promise<void> {
    const base = this.state$.value;
    if (!base) throw new Error('FolderStructureService not initialized');

    await this.commit({
      ...base,
      folders: base.folders.map((f) => (f.id === folderId ? { ...f, collapsed: !f.collapsed } : f)),
    });
  }

  private getDescendantFolderIds(folders: Folder[], folderId: string): Set<string> {
    const byParent = new Map<string, string[]>();
    for (const f of folders) {
      if (!f.parentId) continue;
      const arr = byParent.get(f.parentId) ?? [];
      arr.push(f.id);
      byParent.set(f.parentId, arr);
    }

    const out = new Set<string>();
    const stack = [...(byParent.get(folderId) ?? [])];
    while (stack.length > 0) {
      const id = stack.pop();
      if (!id || out.has(id)) continue;
      out.add(id);
      for (const child of byParent.get(id) ?? []) stack.push(child);
    }
    return out;
  }

  async setNotebookFolder(notebookKey: string, folderId: string | null, notebookTitle?: string): Promise<void> {
    const base = this.state$.value;
    if (!base) throw new Error('FolderStructureService not initialized');

    const nextKeyMap: Record<string, string | null> = {
      ...base.notebookFolderByKey,
      [notebookKey]: folderId,
    };

    const nextTitleMap: Record<string, string | null> =
      typeof notebookTitle === 'string'
        ? {
            ...base.notebookFolderByTitle,
            [notebookTitle]: folderId,
          }
        : base.notebookFolderByTitle;

    await this.commit({
      ...base,
      notebookFolderByKey: nextKeyMap,
      notebookFolderByTitle: nextTitleMap,
    });
  }
}
