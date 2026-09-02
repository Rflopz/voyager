import type { BackgroundAnimation, MountedAnimation } from '../domain/background-animation';
import type { AnimationPreferenceStore } from '../domain/animation-preference';
import type { AnimationSettingsStore } from '../domain/animation-settings-store';
import { isConfigurable, type AnimationSettingParam } from '../domain/animation-settings';

export interface AnimationCatalogEntry<TName extends string = string> {
  name: TName;
  label: string;
}

/**
 * Anything capable of producing/listing animations by name. Kept generic
 * (not importing the concrete registry) so this controller only depends on
 * a shape, matching the dependency-inversion rule used elsewhere.
 */
export interface AnimationCatalog<TName extends string = string> {
  list(): AnimationCatalogEntry<TName>[];
  create(name: TName): BackgroundAnimation;
  isValidName(value: string): value is TName;
}

/**
 * Orchestrates mounting a BackgroundAnimation onto a canvas, switching
 * between registered animations, pausing/resuming playback, and — for
 * animations implementing ConfigurableAnimation — reading/writing tunable
 * settings (e.g. speed), persisting both the animation choice and its
 * settings via the given store ports. Framework-agnostic (no Astro/DOM
 * event wiring beyond the canvas element itself) — components/scripts wire
 * this to click/input handlers, they don't reimplement any of this logic.
 */
export class BackgroundAnimationController<TName extends string = string> {
  private mounted: MountedAnimation | null = null;
  private mountedAnimation: BackgroundAnimation | null = null;
  private current: TName;
  private playing = true;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly catalog: AnimationCatalog<TName>,
    private readonly preferenceStore: AnimationPreferenceStore,
    private readonly settingsStore: AnimationSettingsStore,
    defaultName: TName
  ) {
    const stored = this.preferenceStore.get();
    this.current = stored && this.catalog.isValidName(stored) ? stored : defaultName;
  }

  list(): AnimationCatalogEntry<TName>[] {
    return this.catalog.list();
  }

  getCurrent(): TName {
    return this.current;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  /** Settings schema for the CURRENTLY MOUNTED animation, or [] if it isn't configurable. */
  getSettingsSchema(): AnimationSettingParam[] {
    if (this.mountedAnimation && isConfigurable(this.mountedAnimation)) {
      return this.mountedAnimation.getSettingsSchema();
    }
    return [];
  }

  getSetting(key: string): number {
    if (this.mountedAnimation && isConfigurable(this.mountedAnimation)) {
      return this.mountedAnimation.getSetting(key);
    }
    return 0;
  }

  setSetting(key: string, value: number): void {
    if (this.mountedAnimation && isConfigurable(this.mountedAnimation)) {
      this.mountedAnimation.setSetting(key, value);
      this.settingsStore.set(this.current, key, value);
    }
  }

  start(): void {
    this.mount(this.current);
  }

  switchTo(name: TName): void {
    if (name === this.current && this.mounted) return;
    this.mount(name);
  }

  pause(): void {
    this.mounted?.pause();
    this.playing = false;
  }

  resume(): void {
    this.mounted?.resume();
    this.playing = true;
  }

  togglePlayback(): boolean {
    if (this.playing) {
      this.pause();
    } else {
      this.resume();
    }
    return this.playing;
  }

  private mount(name: TName): void {
    this.mounted?.unmount();
    const animation = this.catalog.create(name);

    if (isConfigurable(animation)) {
      for (const param of animation.getSettingsSchema()) {
        const stored = this.settingsStore.get(name, param.key);
        if (stored !== null) {
          animation.setSetting(param.key, stored);
        }
      }
    }

    this.mounted = animation.mount(this.canvas);
    this.mountedAnimation = animation;
    this.current = name;
    this.preferenceStore.set(name);
    if (!this.playing) {
      this.mounted.pause();
    }
  }
}
