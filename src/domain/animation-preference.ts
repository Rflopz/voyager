/**
 * Port for persisting the user's chosen background animation across
 * reloads. Purely a client-side concern (no SSR involvement) but still
 * expressed as a port so the storage mechanism (localStorage today) can be
 * swapped without touching the controller that uses it.
 */
export interface AnimationPreferenceStore {
  get(): string | null;
  set(name: string): void;
}
