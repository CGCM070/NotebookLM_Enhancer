import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import type { 
  ModalConfig, 
  ModalState, 
  PromptModalResult, 
  ConfirmModalResult 
} from '../models/modal.model';
import { TranslationService } from '../i18n/translation.service';

/**
 * Service for managing modal dialogs.
 * Provides promise-based API similar to native prompt/confirm.
 */
@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly modalState$ = new BehaviorSubject<ModalState | null>(null);
  private idCounter = 0;

  constructor(private readonly translationService: TranslationService) {}

  /**
   * Observable of the current modal state
   */
  readonly activeModal$: Observable<ModalState | null> = this.modalState$.asObservable();

  /**
   * Show a prompt modal (text input) and return a promise.
   * Resolves with the input value or null if cancelled.
   */
  prompt(title: string, defaultValue?: string): Promise<string | null> {
    return new Promise((resolve) => {
      const id = this.generateId();
      const config: ModalConfig = {
        type: 'prompt',
        title,
        defaultValue,
        confirmText: this.translationService.translate('buttons.accept'),
        cancelText: this.translationService.translate('buttons.cancel'),
      };

      const state: ModalState = {
        id,
        config,
        resolve: (result: PromptModalResult) => {
          resolve(result.confirmed ? result.value : null);
          this.clearModal(id);
        },
      };

      this.modalState$.next(state);
    });
  }

  /**
   * Show a confirmation modal and return a promise.
   * Resolves with true if confirmed, false if cancelled.
   */
  confirm(title: string, message?: string): Promise<boolean> {
    return new Promise((resolve) => {
      const id = this.generateId();
      const config: ModalConfig = {
        type: 'confirm',
        title,
        message,
        confirmText: this.translationService.translate('buttons.yes'),
        cancelText: this.translationService.translate('buttons.cancel'),
      };

      const state: ModalState = {
        id,
        config,
        resolve: (result: ConfirmModalResult) => {
          resolve(result.confirmed);
          this.clearModal(id);
        },
      };

      this.modalState$.next(state);
    });
  }

  /**
   * Close the current modal with a result.
   * Called by the ModalComponent when user interacts with it.
   */
  close(result: PromptModalResult | ConfirmModalResult): void {
    const current = this.modalState$.value;
    if (current) {
      current.resolve(result);
    }
  }

  /**
   * Generate a unique modal ID
   */
  private generateId(): string {
    return `modal-${++this.idCounter}-${Date.now()}`;
  }

  /**
   * Clear the modal state if it matches the given ID
   */
  private clearModal(id: string): void {
    const current = this.modalState$.value;
    if (current && current.id === id) {
      this.modalState$.next(null);
    }
  }
}
