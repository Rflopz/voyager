import type { LocalePreferenceStore } from '../../domain/locale-preference-store';
import { isLocale, type Locale } from '../../domain/translations';

const STORAGE_KEY = 'voyager:locale';

/**
 * localStorage adapter for LocalePreferenceStore. Fails soft on
 * SSR/no-window and storage-disabled environments, same as
 * LocalStorageAnimationPreferenceStore.
 */
export class LocalStorageLocalePreferenceStore implements LocalePreferenceStore {
  get(): Locale | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored && isLocale(stored) ? stored : null;
    } catch {
      return null;
    }
  }

  set(locale: Locale): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore — e.g. storage disabled or quota exceeded
    }
  }
}
