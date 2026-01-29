import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { Folder } from '../../models/folder.model';
import type { FolderTreeNode } from '../../models/folder-tree-node.model';

@Component({
  selector: 'app-folder-node',
  standalone: true,
  templateUrl: './folder-node.component.html',
})
export class FolderNodeComponent {
  @Input({ required: true }) node!: FolderTreeNode;
  @Input({ required: true }) depth!: number;

  @Output() toggleFolder = new EventEmitter<Folder>();
  @Output() createSubfolder = new EventEmitter<Folder>();
  @Output() renameFolder = new EventEmitter<Folder>();
  @Output() deleteFolder = new EventEmitter<Folder>();
}
