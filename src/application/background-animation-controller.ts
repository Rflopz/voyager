import type { BackgroundAnimation, MountedAnimation } from '../domain/animations/background-animation';
import type { AnimationPreferenceStore } from '../domain/animations/preference-store';
import type { AnimationSettingsStore } from '../domain/animations/settings-store';
import { isConfigurable, type AnimationSettingParam } from '../domain/animations/settings';

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
 * Orchestrates mounting a BackgroundAnimation into a container element,
 * switching between registered animations, pausing/resuming playback, and
 * — for animations implementing ConfigurableAnimation — reading/writing
 * tunable settings (e.g. speed), persisting both the animation choice and
 * its settings via the given store ports.
 *
 * IMPORTANT: each switchToAnimation gets its OWN fresh <canvas>, created
 * and destroyed by this controller — never reused across animations. A
 * <canvas> element's rendering context (2d vs webgl) is permanent for
 * that element's lifetime; reusing one canvas across adapters that need
 * different context types (e.g. the 2d StarfieldAnimation after the WebGL
 * BlackholeAnimation) makes `getContext()` return null for the second
 * adapter, which silently no-ops (see BackgroundAnimation.mount's guard
 * clauses) — that was the cause of "switching does nothing" bugs. Handing
 * out a brand-new canvas per mount sidesteps the whole class of bug.
 */
export class BackgroundAnimationController<TName extends string = string> {
  private mounted: MountedAnimation | null = null;
  private mountedAnimation: BackgroundAnimation | null = null;
  private currentCanvas: HTMLCanvasElement | null = null;
  private current: TName;
  private playing = true;

  constructor(
    private readonly container: HTMLElement,
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

    if (this.currentCanvas) {
      this.currentCanvas.remove();
      this.currentCanvas = null;
    }

    const canvas = document.createElement('canvas');
    canvas.className = 'fixed inset-0 h-full w-full';
    this.container.appendChild(canvas);
    this.currentCanvas = canvas;

    const animation = this.catalog.create(name);

    if (isConfigurable(animation)) {
      for (const param of animation.getSettingsSchema()) {
        const stored = this.settingsStore.get(name, param.key);

        if (stored !== null) {
          animation.setSetting(param.key, stored);
        }
      }
    }

    this.mounted = animation.mount(canvas);
    this.mountedAnimation = animation;
    this.current = name;
    this.preferenceStore.set(name);

    if (!this.playing) {
      this.mounted.pause();
    }
  }
}
