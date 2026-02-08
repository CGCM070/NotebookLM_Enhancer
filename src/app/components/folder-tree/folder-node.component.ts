import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';

import type { NotebookDropListData } from '../../models/drag-drop.model';
import type { Folder } from '../../models/folder.model';
import type { FolderTreeNode } from '../../models/folder-tree-node.model';
import type { NotebookMenuRequest } from '../../models/notebook-menu.model';
import type { Notebook } from '../../models/notebook.model';
import { NotebookItemComponent } from '../notebook-item/notebook-item.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { TranslatePipe } from '../../i18n';

type NotebookItem = Notebook;

@Component({
  selector: 'app-folder-node',
  standalone: true,
  imports: [DragDropModule, NotebookItemComponent, TranslatePipe],
  templateUrl: './folder-node.component.html',
})
export class FolderNodeComponent {
  @Input({ required: true }) node!: FolderTreeNode;
  @Input({ required: true }) depth!: number;

  @Input() folders: Folder[] = [];
  @Input() notebooksByFolderId: Record<string, NotebookItem[]> = {};
  @Input() notebookFolderByKey: Record<string, string | null> = {};
  @Input() notebookFolderByTitle: Record<string, string | null> = {};
  @Input() isBatchMode = false;
  @Input() selectedIndexes: Set<number> = new Set();

  @Output() toggleFolder = new EventEmitter<Folder>();
  @Output() createSubfolder = new EventEmitter<Folder>();
  @Output() renameFolder = new EventEmitter<Folder>();
  @Output() deleteFolder = new EventEmitter<Folder>();

  @Output() openNotebook = new EventEmitter<NotebookItem>();
  @Output() openNotebookMenu = new EventEmitter<NotebookMenuRequest>();
  @Output() droppedNotebook = new EventEmitter<CdkDragDrop<NotebookDropListData, NotebookDropListData, NotebookItem>>();
  @Output() notebookSelectionToggle = new EventEmitter<NotebookItem>();

  isNotebookSelected(notebook: NotebookItem): boolean {
    return this.selectedIndexes.has(notebook.index);
  }

  get dropData(): NotebookDropListData {
    return { targetFolderId: this.node.folder.id };
  }

  readonly onlySelfEnter = (drag: CdkDrag, drop: CdkDropList): boolean => {
    return drag.dropContainer === drop;
  };

  onDropped(event: CdkDragDrop<NotebookDropListData, NotebookDropListData, NotebookItem>): void {
    this.droppedNotebook.emit(event);
  }

  onHeaderClick(event: MouseEvent): void {
    // Check if the click was on an action button
    const target = event.target as HTMLElement;
    const isActionButton = target.closest('button') !== null;
    
    if (!isActionButton) {
      // Only toggle if there are children or notebooks to show/hide
      const notebooks = this.notebooksByFolderId[this.node.folder.id] || [];
      if (this.node.children.length > 0 || notebooks.length > 0) {
        this.toggleFolder.emit(this.node.folder);
      }
    }
  }

  onActionClick(event: MouseEvent, action: 'createSubfolder' | 'rename' | 'delete'): void {
    event.stopPropagation();
    
    switch (action) {
      case 'createSubfolder':
        this.createSubfolder.emit(this.node.folder);
        break;
      case 'rename':
        this.renameFolder.emit(this.node.folder);
        break;
      case 'delete':
        this.deleteFolder.emit(this.node.folder);
        break;
    }
  }
}
