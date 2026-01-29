import type { Folder } from './folder.model';

export type StorageStateV1 = {
  version: 1;
  folders: Folder[];
  notebookFolderByTitle: Record<string, string | null>;
};

export type StorageStateV2 = {
  version: 2;
  folders: Folder[];
  notebookFolderByKey: Record<string, string | null>;
  notebookFolderByTitle: Record<string, string | null>;
};

export type StorageState = StorageStateV2;

export const DEFAULT_STORAGE_STATE: StorageState = {
  version: 2,
  folders: [],
  notebookFolderByKey: {},
  notebookFolderByTitle: {},
};
