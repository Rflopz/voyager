import type { LocalePreferenceStore } from '../domain/locale-preference-store';
import { DEFAULT_LOCALE, type Locale, type Translations } from '../domain/translations';

/**
 * Orchestrates the site's language toggle: tracks the current locale,
 * persists the choice via a LocalePreferenceStore port, and hands out the
 * translation dictionary for a requested locale. Mirrors
 * BackgroundAnimationController's shape (constructor reads the stored
 * preference, one port dependency) for consistency across the two
 * client-side "preference" features.
 *
 * English is NOT one of the dictionaries here — it's whatever text is
 * already rendered in the markup (single source of truth for copy). Only
 * non-default locales need a translation dictionary supplied.
 */
export class LocaleController {
  private current: Locale;

  constructor(
    private readonly preferenceStore: LocalePreferenceStore,
    private readonly dictionaries: Partial<Record<Locale, Translations>>,
    defaultLocale: Locale = DEFAULT_LOCALE
  ) {
    this.current = this.preferenceStore.get() ?? defaultLocale;
  }

  getCurrent(): Locale {
    return this.current;
  }

  /** Dictionary for the given locale, or null for the default (English) locale. */
  getDictionary(locale: Locale): Translations | null {
    return this.dictionaries[locale] ?? null;
  }

  setLocale(locale: Locale): void {
    this.current = locale;
    this.preferenceStore.set(locale);
  }
}
