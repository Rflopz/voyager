import type { KeyValueStorage } from '../../domain/storage/key-value-storage';

/**
 * localStorage adapter for KeyValueStorage. Fails soft (returns null /
 * no-ops) on SSR (no `window`) and storage-disabled environments (private
 * browsing, quota exceeded) — a lost preference is never worth crashing
 * the page over.
 *
 * This is the ONLY file in the codebase that touches window.localStorage.
 * Every feature-specific store (animation preference, animation settings,
 * locale preference) depends on the KeyValueStorage port instead, so
 * moving to cookies/sessionStorage/sqlite later means writing one new
 * adapter here and rewiring the composition roots in src/config/ — no
 * changes to domain/ or infrastructure/animations|i18n/storage/.
 */
export class LocalStorageAdapter implements KeyValueStorage {
  get(key: string): string | null {
    if (typeof window === 'undefined') return null;

    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore — e.g. storage disabled or quota exceeded
    }
  }
}
