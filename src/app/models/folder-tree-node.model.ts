import type { Folder } from './folder.model';

export type FolderTreeNode = {
  folder: Folder;
  children: FolderTreeNode[];
};
