/**
 * Generic port for a simple string key/value store. Shared kernel used by
 * every client-side "preference" port (animation preference, animation
 * settings, locale preference) so the underlying mechanism — localStorage
 * today, cookies/sessionStorage/sqlite tomorrow — can be swapped by writing
 * ONE new adapter in infrastructure/storage/, instead of touching every
 * feature-specific store that currently duplicated the same
 * window.localStorage + try/catch + SSR-guard logic.
 */
export interface KeyValueStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}
