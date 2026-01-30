import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';

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
  @Output() openMenu = new EventEmitter<Notebook>();
}
