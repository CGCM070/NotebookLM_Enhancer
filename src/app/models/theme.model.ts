/**
 * Theme types supported by the application
 */
export type ThemeType = 'light' | 'dark' | 'system';

/**
 * Theme state interface for persistence
 */
export interface ThemeState {
  /** Selected theme preference */
  theme: ThemeType;
  /** Timestamp of last update */
  updatedAt: number;
}

/**
 * Theme display metadata
 */
export interface ThemeMetadata {
  /** Theme value */
  value: ThemeType;
  /** Display label */
  label: string;
  /** Tooltip text */
  tooltip: string;
}

/**
 * Theme cycle order for toggle
 */
export const THEME_CYCLE: ThemeType[] = ['light', 'dark', 'system'];

/**
 * Theme metadata for each theme type
 */
export const THEME_METADATA: Record<ThemeType, ThemeMetadata> = {
  light: {
    value: 'light',
    label: 'Light',
    tooltip: 'Modo claro',
  },
  dark: {
    value: 'dark',
    label: 'Dark',
    tooltip: 'Modo oscuro',
  },
  system: {
    value: 'system',
    label: 'System',
    tooltip: 'Usar preferencia del sistema',
  },
};

/**
 * Storage key for theme preference
 */
export const THEME_STORAGE_KEY = 'nle-theme-preference';

/**
 * Default theme when no preference is stored
 */
export const DEFAULT_THEME: ThemeType = 'system';
