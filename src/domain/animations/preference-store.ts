/**
 * Port for persisting the user's chosen background animation across
 * reloads. Purely a client-side concern (no SSR involvement) but still
 * expressed as a port so the storage mechanism can be swapped (see
 * infrastructure/animations/storage/preferences.ts +
 * domain/storage/key-value-storage.ts) without touching the controller
 * that uses it.
 */
export interface AnimationPreferenceStore {
  get(): string | null;
  set(name: string): void;
}
