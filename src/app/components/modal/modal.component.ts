import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, ViewChild, type SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import type { ModalConfig, PromptModalResult, ConfirmModalResult } from '../../models/modal.model';
import { TranslatePipe } from '../../i18n';

/**
 * Reusable modal component for prompts and confirmations.
 * Supports dark/light mode via Tailwind classes.
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    @if (isOpen) {
      <!-- Backdrop -->
      <div 
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        (click)="onBackdropClick($event)"
      >
        <!-- Modal Card -->
        <div 
          class="w-full max-w-md rounded-xl bg-white dark:bg-[#1E1F20] shadow-2xl border border-gray-200 dark:border-[#3C4043] overflow-hidden"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 dark:border-[#3C4043]">
            <h3 class="text-lg font-medium text-gray-900 dark:text-[#E8EAED]">
              {{ config.title }}
            </h3>
          </div>

          <!-- Body -->
          <div class="px-6 py-4">
            @if (config.message) {
              <p class="text-sm text-gray-600 dark:text-[#9AA0A6] mb-4">
                {{ config.message }}
              </p>
            }

            @if (config.type === 'prompt') {
              <input
                #inputRef
                type="text"
                [(ngModel)]="inputValue"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#5F6368] bg-white dark:bg-[#303134] text-gray-900 dark:text-[#E3E3E3] placeholder-gray-400 dark:placeholder-[#80868b] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                [placeholder]="'placeholders.writeHere' | translate"
                (keyup.enter)="confirm()"
                (keyup.escape)="cancel()"
              />
            }
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 bg-gray-50 dark:bg-[#202124] flex justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-[#9AA0A6] hover:bg-gray-100 dark:hover:bg-[#3C4043] transition-colors"
              (click)="cancel()"
            >
              {{ config.cancelText || ('buttons.cancel' | translate) }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
              (click)="confirm()"
            >
              {{ config.confirmText || (config.type === 'confirm' ? ('buttons.yes' | translate) : ('buttons.accept' | translate)) }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ModalComponent implements OnInit, AfterViewInit, OnChanges {
  @Input({ required: true }) config!: ModalConfig;
  @Input() isOpen = false;

  @Output() closed = new EventEmitter<PromptModalResult | ConfirmModalResult>();

  @ViewChild('inputRef') inputRef!: ElementRef<HTMLInputElement>;

  inputValue = '';

  ngOnInit(): void {
    if (this.config.type === 'prompt') {
      this.inputValue = this.config.defaultValue || '';
    }
  }

  ngAfterViewInit(): void {
    this.focusInput();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Focus input when modal opens (isOpen changes from false to true)
    if (changes['isOpen']?.currentValue === true && this.config.type === 'prompt') {
      setTimeout(() => {
        this.focusInput();
      }, 0);
    }
  }

  /**
   * Focus input and select all text
   */
  private focusInput(): void {
    if (this.isOpen && this.config.type === 'prompt' && this.inputRef) {
      const input = this.inputRef.nativeElement;
      input.focus();
      input.select();
    }
  }

  /**
   * Handle keyboard events (ESC to close)
   */
  @HostListener('document:keydown.escape', ['$event'])
  onEscapePress(): void {
    if (this.isOpen) {
      this.cancel();
    }
  }

  /**
   * Handle backdrop click (close on click outside)
   */
  onBackdropClick(event: MouseEvent): void {
    event.stopPropagation();
    this.cancel();
  }

  /**
   * Confirm the modal action
   */
  confirm(): void {
    if (this.config.type === 'prompt') {
      const result: PromptModalResult = {
        value: this.inputValue.trim() || null,
        confirmed: true,
      };
      this.closed.emit(result);
    } else {
      const result: ConfirmModalResult = {
        confirmed: true,
      };
      this.closed.emit(result);
    }
    this.isOpen = false;
  }

  /**
   * Cancel the modal action
   */
  cancel(): void {
    if (this.config.type === 'prompt') {
      const result: PromptModalResult = {
        value: null,
        confirmed: false,
      };
      this.closed.emit(result);
    } else {
      const result: ConfirmModalResult = {
        confirmed: false,
      };
      this.closed.emit(result);
    }
    this.isOpen = false;
  }
}
