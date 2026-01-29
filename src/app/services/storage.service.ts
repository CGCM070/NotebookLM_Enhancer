import { Injectable } from '@angular/core';

import { DEFAULT_STORAGE_STATE, type StorageState, type StorageStateV1, type StorageStateV2 } from '../models/storage-state.model';

type ChromeStorageArea = {
  get: (keys: string[] | string, cb: (items: Record<string, unknown>) => void) => void;
  set: (items: Record<string, unknown>, cb?: () => void) => void;
};

function getChromeStorageSync(): ChromeStorageArea | null {
  const w = window as unknown as { chrome?: unknown };
  const chromeObj = w.chrome as
    | {
        storage?: {
          sync?: unknown;
        };
      }
    | undefined;

  const sync = chromeObj?.storage?.sync;
  const candidate = sync as Partial<ChromeStorageArea> | null | undefined;

  if (candidate && typeof candidate.get === 'function' && typeof candidate.set === 'function') {
    return candidate as ChromeStorageArea;
  }

  return null;
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly storageKey = 'nle_state_v1';

  async load(): Promise<StorageState> {
    const chromeSync = getChromeStorageSync();
    if (chromeSync) {
      return await new Promise<StorageState>((resolve) => {
        chromeSync.get(this.storageKey, (items) => {
          const raw = items?.[this.storageKey];
          resolve(this.parse(raw));
        });
      });
    }

    const raw = localStorage.getItem(this.storageKey);
    return this.parse(raw ? JSON.parse(raw) : null);
  }

  async save(state: StorageState): Promise<void> {
    const chromeSync = getChromeStorageSync();
    if (chromeSync) {
      await new Promise<void>((resolve) => {
        chromeSync.set({ [this.storageKey]: state }, () => resolve());
      });
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  private parse(raw: unknown): StorageState {
    if (!raw || typeof raw !== 'object') return DEFAULT_STORAGE_STATE;

    const v = (raw as { version?: unknown }).version;
    if (v === 2) {
      const obj = raw as Partial<StorageStateV2>;
      return {
        version: 2,
        folders: Array.isArray(obj.folders) ? (obj.folders as StorageStateV2['folders']) : [],
        notebookFolderByKey:
          obj.notebookFolderByKey && typeof obj.notebookFolderByKey === 'object'
            ? (obj.notebookFolderByKey as StorageStateV2['notebookFolderByKey'])
            : {},
        notebookFolderByTitle:
          obj.notebookFolderByTitle && typeof obj.notebookFolderByTitle === 'object'
            ? (obj.notebookFolderByTitle as StorageStateV2['notebookFolderByTitle'])
            : {},
      };
    }

    if (v === 1) {
      const obj = raw as Partial<StorageStateV1>;
      return {
        version: 2,
        folders: Array.isArray(obj.folders) ? (obj.folders as StorageStateV1['folders']) : [],
        notebookFolderByKey: {},
        notebookFolderByTitle:
          obj.notebookFolderByTitle && typeof obj.notebookFolderByTitle === 'object'
            ? (obj.notebookFolderByTitle as StorageStateV1['notebookFolderByTitle'])
            : {},
      };
    }

    return DEFAULT_STORAGE_STATE;
  }
}
