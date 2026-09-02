import type { AnimationSettingsStore } from '../../domain/animation-settings-store';

const STORAGE_PREFIX = 'voyager:animation-setting:';

function storageKey(animationName: string, key: string): string {
  return `${STORAGE_PREFIX}${animationName}:${key}`;
}

/**
 * localStorage adapter for AnimationSettingsStore. Fails soft (returns
 * null / no-ops) if storage is unavailable — a lost tunable value is not
 * worth crashing the page over.
 */
export class LocalStorageAnimationSettingsStore implements AnimationSettingsStore {
  get(animationName: string, key: string): number | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(storageKey(animationName, key));
      if (raw === null) return null;
      const value = Number(raw);
      return Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  }

  set(animationName: string, key: string, value: number): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey(animationName, key), String(value));
    } catch {
      // ignore — e.g. storage disabled or quota exceeded
    }
  }
}
