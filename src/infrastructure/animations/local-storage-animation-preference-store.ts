import type { AnimationPreferenceStore } from '../../domain/animation-preference';

const STORAGE_KEY = 'voyager:background-animation';

/**
 * localStorage adapter for AnimationPreferenceStore. Guards against
 * SSR/no-window and storage-disabled environments (private browsing,
 * quota errors) by failing soft — a lost preference is not worth crashing
 * the page over.
 */
export class LocalStorageAnimationPreferenceStore implements AnimationPreferenceStore {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  set(name: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, name);
    } catch {
      // ignore — e.g. storage disabled or quota exceeded
    }
  }
}
