import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
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
  @Input() isBatchMode = false;
  @Input() isSelected = false;
  @Input() isDeletingBatch = false;

  @Output() open = new EventEmitter<Notebook>();
  @Output() openMenu = new EventEmitter<NotebookMenuRequest>();
  @Output() selectionToggle = new EventEmitter<Notebook>();

  onDragEnded(event: CdkDragEnd): void {
    event.source.reset();
  }

  onSelectionToggle(event: MouseEvent): void {
    event.stopPropagation();
    this.selectionToggle.emit(this.notebook);
  }

  onRowClick(event: MouseEvent): void {
    if (this.isBatchMode) {
      event.preventDefault();
      event.stopPropagation();
      this.selectionToggle.emit(this.notebook);
    }
  }

  @HostListener('click', ['$event'])
  onHostClick(event: MouseEvent): void {
    if (this.isBatchMode) {
      const target = event.target as HTMLElement;
      // Don't toggle if clicking on the checkbox directly
      if (!target.closest('.nle-batch-checkbox')) {
        event.preventDefault();
        event.stopPropagation();
        this.selectionToggle.emit(this.notebook);
      }
    }
  }
}
