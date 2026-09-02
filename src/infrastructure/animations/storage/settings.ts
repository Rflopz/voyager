import type { AnimationSettingsStore } from '../../../domain/animations/settings-store';
import type { KeyValueStorage } from '../../../domain/storage/key-value-storage';

const STORAGE_PREFIX = 'voyager:animation-setting:';

function storageKey(animationName: string, key: string): string {
  return `${STORAGE_PREFIX}${animationName}:${key}`;
}

/**
 * AnimationSettingsStore adapter over a generic KeyValueStorage port — see
 * preferences.ts in this folder for the rationale (formats keys, defers
 * the read/write mechanism to the injected KeyValueStorage).
 */
export class AnimationSettingsStorage implements AnimationSettingsStore {
  constructor(private readonly storage: KeyValueStorage) {}

  get(animationName: string, key: string): number | null {
    const raw = this.storage.get(storageKey(animationName, key));

    if (raw === null) return null;

    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }

  set(animationName: string, key: string, value: number): void {
    this.storage.set(storageKey(animationName, key), String(value));
  }
}
