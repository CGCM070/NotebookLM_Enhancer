import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DragDropModule, type CdkDragEnd } from '@angular/cdk/drag-drop';

import type { NotebookMenuRequest } from '../../models/notebook-menu.model';
import type { Notebook } from '../../models/notebook.model';

@Component({
  selector: 'app-notebook-item',
  standalone: true,
  imports: [DragDropModule],
  templateUrl: './notebook-item.component.html',
})
export class NotebookItemComponent {
  @Input({ required: true }) notebook!: Notebook;

  @Output() open = new EventEmitter<Notebook>();
  @Output() openMenu = new EventEmitter<NotebookMenuRequest>();

  onDragEnded(event: CdkDragEnd): void {
    event.source.reset();
  }
}
