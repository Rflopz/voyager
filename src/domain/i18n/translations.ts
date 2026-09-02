/**
 * Pure domain types for the site's EN/ES language toggle. No I/O.
 *
 * Design note: English is not stored as a dictionary anywhere — it is
 * whatever copy is already rendered in the Astro markup (single source of
 * truth, no duplicated content). Only the ES translations need supplying
 * as data, keyed by the same `data-i18n` keys used in markup, and swapped
 * in client-side. See infrastructure/i18n/es-translations.ts.
 */
export type Locale = 'en' | 'es';

export type Translations = Record<string, string>;

export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return value === 'en' || value === 'es';
}
