import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { Folder } from '../../models/folder.model';
import type { FolderTreeNode } from '../../models/folder-tree-node.model';
import type { Notebook } from '../../models/notebook.model';
import { NotebookItemComponent } from '../notebook-item/notebook-item.component';
import { DragDropModule, type CdkDragDrop } from '@angular/cdk/drag-drop';

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
  @Output() setNotebookFolder = new EventEmitter<{ notebook: NotebookItem; folderId: string | null }>();
  @Output() droppedNotebook = new EventEmitter<CdkDragDrop<any>>();

  onDropped(event: CdkDragDrop<any>): void {
    this.droppedNotebook.emit(event);
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onNativeDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const data = event.dataTransfer?.getData('application/json');
    if (!data) return;
    try {
      const nb = JSON.parse(data) as NotebookItem;
      // Emit droppedNotebook with duck-typed event
      const mockEvent = {
        item: { data: nb },
        container: { data: { targetFolderId: this.node.folder.id } }
      } as unknown as CdkDragDrop<any>;
      this.droppedNotebook.emit(mockEvent);
    } catch (e) {
      console.error('Failed to parse native drop', e);
    }
  }
}
