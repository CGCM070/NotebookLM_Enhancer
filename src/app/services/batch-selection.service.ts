import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class BatchSelectionService {
  private readonly _isBatchMode$ = new BehaviorSubject<boolean>(false);
  private readonly _selectedIndexes$ = new BehaviorSubject<Set<number>>(new Set());

  readonly isBatchMode$: Observable<boolean> = this._isBatchMode$.asObservable();
  readonly selectedIndexes$: Observable<Set<number>> = this._selectedIndexes$.asObservable();

  readonly selectedCount$ = this._selectedIndexes$.pipe(
    map(indexes => indexes.size)
  );

  get isBatchMode(): boolean {
    return this._isBatchMode$.value;
  }

  get selectedCount(): number {
    return this._selectedIndexes$.value.size;
  }

  get selectedIndexes(): Set<number> {
    return new Set(this._selectedIndexes$.value);
  }

  isSelected(index: number): boolean {
    return this._selectedIndexes$.value.has(index);
  }

  toggleBatchMode(): void {
    const newMode = !this._isBatchMode$.value;
    this._isBatchMode$.next(newMode);

    if (!newMode) {
      this.clearSelection();
    }
  }

  enableBatchMode(): void {
    this._isBatchMode$.next(true);
  }

  disableBatchMode(): void {
    this._isBatchMode$.next(false);
    this.clearSelection();
  }

  toggleSelection(index: number): void {
    const current = new Set(this._selectedIndexes$.value);

    if (current.has(index)) {
      current.delete(index);
    } else {
      current.add(index);
    }

    this._selectedIndexes$.next(current);
  }

  select(index: number): void {
    const current = new Set(this._selectedIndexes$.value);
    current.add(index);
    this._selectedIndexes$.next(current);
  }

  deselect(index: number): void {
    const current = new Set(this._selectedIndexes$.value);
    current.delete(index);
    this._selectedIndexes$.next(current);
  }

  clearSelection(): void {
    this._selectedIndexes$.next(new Set());
  }

  getSelectedIndexesArray(): number[] {
    return Array.from(this._selectedIndexes$.value);
  }

  /**
   * Adjust indexes after items are deleted from the list
   * When items with lower indexes are removed, higher indexes need to be decremented
   * @param deletedIndexes Array of indexes that were deleted (sorted in ascending order)
   */
  adjustIndexesAfterDeletion(deletedIndexes: number[]): void {
    if (deletedIndexes.length === 0) return;

    const current = new Set(this._selectedIndexes$.value);
    const adjusted = new Set<number>();

    for (const index of current) {
      // Count how many deleted indexes are below this index
      const deletedBelow = deletedIndexes.filter(d => d < index).length;
      const newIndex = index - deletedBelow;

      // Only keep the index if it wasn't deleted
      if (!deletedIndexes.includes(index)) {
        adjusted.add(newIndex);
      }
    }

    this._selectedIndexes$.next(adjusted);
  }
}
