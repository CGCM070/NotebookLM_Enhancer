import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';

import type { NotebookDropListData } from '../../models/drag-drop.model';
import type { Folder } from '../../models/folder.model';
import type { FolderTreeNode } from '../../models/folder-tree-node.model';
import type { NotebookMenuRequest } from '../../models/notebook-menu.model';
import type { Notebook } from '../../models/notebook.model';
import { NotebookItemComponent } from '../notebook-item/notebook-item.component';
import { DragDropModule } from '@angular/cdk/drag-drop';

type NotebookItem = Notebook;

@Component({
  selector: 'app-folder-node',
  standalone: true,
  imports: [DragDropModule, NotebookItemComponent],
  templateUrl: './folder-node.component.html',
})
export class FolderNodeComponent {
  @Input({ required: true }) node!: FolderTreeNode;
  @Input({ required: true }) depth!: number;

  @Input() folders: Folder[] = [];
  @Input() notebooksByFolderId: Record<string, NotebookItem[]> = {};
  @Input() notebookFolderByKey: Record<string, string | null> = {};
  @Input() notebookFolderByTitle: Record<string, string | null> = {};

  @Output() toggleFolder = new EventEmitter<Folder>();
  @Output() createSubfolder = new EventEmitter<Folder>();
  @Output() renameFolder = new EventEmitter<Folder>();
  @Output() deleteFolder = new EventEmitter<Folder>();

  @Output() openNotebook = new EventEmitter<NotebookItem>();
  @Output() openNotebookMenu = new EventEmitter<NotebookMenuRequest>();
  @Output() droppedNotebook = new EventEmitter<CdkDragDrop<NotebookDropListData, NotebookDropListData, NotebookItem>>();

  get dropData(): NotebookDropListData {
    return { targetFolderId: this.node.folder.id };
  }

  readonly onlySelfEnter = (drag: CdkDrag, drop: CdkDropList): boolean => {
    return drag.dropContainer === drop;
  };

  onDropped(event: CdkDragDrop<NotebookDropListData, NotebookDropListData, NotebookItem>): void {
    this.droppedNotebook.emit(event);
  }
}
