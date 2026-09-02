import type { LocalePreferenceStore } from '../../../domain/i18n/preference-store';
import { isLocale, type Locale } from '../../../domain/i18n/translations';
import type { KeyValueStorage } from '../../../domain/storage/key-value-storage';

const STORAGE_KEY = 'voyager:locale';

/**
 * LocalePreferenceStore adapter over a generic KeyValueStorage port — same
 * pattern as infrastructure/animations/storage/preferences.ts (formats the
 * key, validates the raw value against the Locale domain type, defers the
 * read/write mechanism to the injected KeyValueStorage).
 */
export class LocalePreferenceStorage implements LocalePreferenceStore {
  constructor(private readonly storage: KeyValueStorage) {}

  get(): Locale | null {
    const stored = this.storage.get(STORAGE_KEY);
    return stored && isLocale(stored) ? stored : null;
  }

  set(locale: Locale): void {
    this.storage.set(STORAGE_KEY, locale);
  }
}
