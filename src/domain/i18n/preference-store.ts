import type { Locale } from './translations';

/**
 * Port for persisting the user's chosen language across reloads. Mirrors
 * animations/preference-store.ts — same shape, same rationale (swap
 * storage mechanism later without touching anything that reads/writes it).
 */
export interface LocalePreferenceStore {
  get(): Locale | null;
  set(locale: Locale): void;
}
