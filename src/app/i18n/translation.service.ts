import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import type { Language, Translations } from './translation.types';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private currentLang = new BehaviorSubject<Language>('en');
  private translations: Translations | null = null;

  readonly currentLang$: Observable<Language> = this.currentLang.asObservable();

  constructor() {
    // Load default language on init
    void this.loadLanguage('en');
  }

  async loadLanguage(lang: Language): Promise<void> {
    try {
      const module = await import(`./${lang}.json`);
      this.translations = module.default as Translations;
      this.currentLang.next(lang);
      
      // Notify content script of language change
      this.notifyContentScript(lang);
    } catch (error) {
      console.error(`Failed to load language: ${lang}`, error);
      // Fallback to English
      if (lang !== 'en') {
        await this.loadLanguage('en');
      }
    }
  }

  private notifyContentScript(lang: Language): void {
    try {
      window.parent.postMessage({
        type: 'NLE_CHANGE_LANGUAGE',
        payload: { lang }
      }, '*');
    } catch (error) {
      console.error('Failed to notify content script of language change:', error);
    }
  }

  translate(key: string, params?: Record<string, string>): string {
    if (!this.translations) return key;

    const value = key.split('.').reduce<unknown>((obj, k) => {
      if (obj && typeof obj === 'object' && k in obj) {
        return (obj as Record<string, unknown>)[k];
      }
      return undefined;
    }, this.translations as unknown);
    
    if (typeof value !== 'string') {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }

    return params
      ? value.replace(/\{(\w+)\}/g, (_, k) => params[k] || `{${k}}`)
      : value;
  }

  getCurrentLang(): Language {
    return this.currentLang.value;
  }

  toggleLanguage(): void {
    const newLang: Language = this.currentLang.value === 'en' ? 'es' : 'en';
    void this.loadLanguage(newLang);
  }
}
