import type { AnimationPreferenceStore } from '../../../domain/animations/preference-store';
import type { KeyValueStorage } from '../../../domain/storage/key-value-storage';

const STORAGE_KEY = 'voyager:background-animation';

/**
 * AnimationPreferenceStore adapter over a generic KeyValueStorage port —
 * formats/parses the storage key, defers the actual read/write mechanism
 * (localStorage today) to the injected KeyValueStorage. Swapping to
 * cookies/sessionStorage/sqlite later means only rewiring the
 * KeyValueStorage passed in at the composition root (src/config/), not
 * touching this file.
 */
export class AnimationPreferenceStorage implements AnimationPreferenceStore {
  constructor(private readonly storage: KeyValueStorage) {}

  get(): string | null {
    return this.storage.get(STORAGE_KEY);
  }

  set(name: string): void {
    this.storage.set(STORAGE_KEY, name);
  }
}
