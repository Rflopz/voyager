/**
 * Port for persisting per-animation tunable setting values (e.g. speed)
 * across reloads, keyed by animation name + setting key so different
 * animations' settings never collide.
 */
export interface AnimationSettingsStore {
  get(animationName: string, key: string): number | null;
  set(animationName: string, key: string, value: number): void;
}
