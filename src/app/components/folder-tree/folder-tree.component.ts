import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { Folder } from '../../models/folder.model';
import type { FolderTreeNode } from '../../models/folder-tree-node.model';
import { FolderNodeComponent } from './folder-node.component';

@Component({
  selector: 'app-folder-tree',
  standalone: true,
  imports: [FolderNodeComponent],
  templateUrl: './folder-tree.component.html',
})
export class FolderTreeComponent {
  @Input({ required: true }) tree: FolderTreeNode[] = [];

  @Output() toggleFolder = new EventEmitter<Folder>();
  @Output() createSubfolder = new EventEmitter<Folder>();
  @Output() renameFolder = new EventEmitter<Folder>();
  @Output() deleteFolder = new EventEmitter<Folder>();
}
