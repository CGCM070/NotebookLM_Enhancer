import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { CdkDragDrop } from '@angular/cdk/drag-drop';

import type { NotebookDropListData } from '../../models/drag-drop.model';
import type { Folder } from '../../models/folder.model';
import type { FolderTreeNode } from '../../models/folder-tree-node.model';
import type { Notebook } from '../../models/notebook.model';
import { FolderNodeComponent } from './folder-node.component';

type NotebookItem = Notebook;

@Component({
  selector: 'app-folder-tree',
  standalone: true,
  imports: [FolderNodeComponent],
  templateUrl: './folder-tree.component.html',
})
export class FolderTreeComponent {
  @Input({ required: true }) tree: FolderTreeNode[] = [];
  @Input() folders: Folder[] = [];
  @Input() notebooksByFolderId: Record<string, NotebookItem[]> = {};
  @Input() notebookFolderByKey: Record<string, string | null> = {};
  @Input() notebookFolderByTitle: Record<string, string | null> = {};

  @Output() toggleFolder = new EventEmitter<Folder>();
  @Output() createSubfolder = new EventEmitter<Folder>();
  @Output() renameFolder = new EventEmitter<Folder>();
  @Output() deleteFolder = new EventEmitter<Folder>();

  @Output() openNotebook = new EventEmitter<NotebookItem>();
  @Output() openNotebookMenu = new EventEmitter<NotebookItem>();
  @Output() droppedNotebook = new EventEmitter<CdkDragDrop<NotebookDropListData, NotebookDropListData, NotebookItem>>();
}
