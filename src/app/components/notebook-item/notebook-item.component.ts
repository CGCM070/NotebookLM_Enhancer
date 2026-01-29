import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';

import type { Folder } from '../../models/folder.model';
import type { Notebook } from '../../models/notebook.model';

@Component({
  selector: 'app-notebook-item',
  standalone: true,
  imports: [DragDropModule],
  templateUrl: './notebook-item.component.html',
})
export class NotebookItemComponent {
  @Input({ required: true }) notebook!: Notebook;
  @Input({ required: true }) folders: Folder[] = [];
  @Input({ required: true }) selectedFolderId!: string | null;

  @Output() open = new EventEmitter<Notebook>();
  @Output() setFolder = new EventEmitter<{ notebook: Notebook; folderId: string | null }>();

  onSelectChanged(raw: string): void {
    this.setFolder.emit({ notebook: this.notebook, folderId: raw ? raw : null });
  }
}
