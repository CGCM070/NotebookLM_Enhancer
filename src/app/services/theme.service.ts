import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import {
  type ThemeState,
  type ThemeType,
  THEME_CYCLE,
  THEME_METADATA,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
} from '../models/theme.model';

/**
 * Service for managing theme preferences and dark mode.
 * Detects system preference as default, allows manual override.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeSubject = new BehaviorSubject<ThemeType>(DEFAULT_THEME);
  private readonly isDarkSubject = new BehaviorSubject<boolean>(false);
  private mediaQuery: MediaQueryList | null = null;
  private systemPreferenceListener: ((e: MediaQueryListEvent) => void) | null = null;

  /** Current theme preference */
  readonly theme$: Observable<ThemeType> = this.themeSubject.asObservable();

  /** Whether dark mode is currently active */
  readonly isDark$: Observable<boolean> = this.isDarkSubject.asObservable();

  /** Current theme value (synchronous) */
  get currentTheme(): ThemeType {
    return this.themeSubject.value;
  }

  /** Whether dark mode is currently active (synchronous) */
  get isDarkMode(): boolean {
    return this.isDarkSubject.value;
  }

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    // Load saved preference
    const saved = await this.loadThemePreference();
    const initialTheme = saved?.theme ?? DEFAULT_THEME;

    // Initialize media query for system preference
    this.setupSystemPreferenceListener();

    // Apply initial theme
    this.setTheme(initialTheme, false);
  }

  /**
   * Set the active theme
   * @param theme - Theme to apply
   * @param save - Whether to persist the preference (default: true)
   */
  setTheme(theme: ThemeType, save = true): void {
    this.themeSubject.next(theme);

    const isDark = this.computeIsDark(theme);
    this.applyDarkMode(isDark);
    this.isDarkSubject.next(isDark);

    if (save) {
      void this.saveThemePreference(theme);
    }
  }

  /**
   * Toggle to the next theme in the cycle (light → dark → system → light)
   */
  toggleTheme(): void {
    const current = this.themeSubject.value;
    const currentIndex = THEME_CYCLE.indexOf(current);
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    const nextTheme = THEME_CYCLE[nextIndex];

    this.setTheme(nextTheme);
  }

  /**
   * Get metadata for the current theme
   */
  getCurrentThemeMetadata() {
    return THEME_METADATA[this.currentTheme];
  }

  /**
   * Get metadata for a specific theme
   */
  getThemeMetadata(theme: ThemeType) {
    return THEME_METADATA[theme];
  }

  /**
   * Check if system prefers dark mode
   */
  private getSystemPrefersDark(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Compute whether dark mode should be active based on theme setting
   */
  private computeIsDark(theme: ThemeType): boolean {
    switch (theme) {
      case 'light':
        return false;
      case 'dark':
        return true;
      case 'system':
      default:
        return this.getSystemPrefersDark();
    }
  }

  /**
   * Apply or remove dark mode class from document
   */
  private applyDarkMode(isDark: boolean): void {
    if (typeof document === 'undefined') return;

    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }

  /**
   * Setup listener for system preference changes
   */
  private setupSystemPreferenceListener(): void {
    if (typeof window === 'undefined') return;

    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    this.systemPreferenceListener = (e: MediaQueryListEvent) => {
      // Only react to system changes if current theme is 'system'
      if (this.themeSubject.value === 'system') {
        this.applyDarkMode(e.matches);
        this.isDarkSubject.next(e.matches);
      }
    };

    this.mediaQuery.addEventListener('change', this.systemPreferenceListener);
  }

  /**
   * Load theme preference from storage
   */
  private async loadThemePreference(): Promise<ThemeState | null> {
    try {
      // Try chrome.storage first (extension environment)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chromeApi = (window as any).chrome;
      if (chromeApi?.storage?.sync) {
        const result = await chromeApi.storage.sync.get(THEME_STORAGE_KEY);
        if (result[THEME_STORAGE_KEY]) {
          return result[THEME_STORAGE_KEY] as ThemeState;
        }
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as ThemeState;
      }
    } catch {
      // Ignore storage errors
    }

    return null;
  }

  /**
   * Save theme preference to storage
   */
  private async saveThemePreference(theme: ThemeType): Promise<void> {
    const state: ThemeState = {
      theme,
      updatedAt: Date.now(),
    };

    try {
      // Try chrome.storage first (extension environment)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chromeApi = (window as any).chrome;
      if (chromeApi?.storage?.sync) {
        await chromeApi.storage.sync.set({ [THEME_STORAGE_KEY]: state });
        return;
      }
    } catch {
      // Fallback to localStorage
    }

    // Fallback to localStorage
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Cleanup when service is destroyed
   */
  destroy(): void {
    if (this.mediaQuery && this.systemPreferenceListener) {
      this.mediaQuery.removeEventListener('change', this.systemPreferenceListener);
    }
  }
}
