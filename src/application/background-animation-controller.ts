import type { BackgroundAnimation, MountedAnimation } from '../domain/background-animation';
import type { AnimationPreferenceStore } from '../domain/animation-preference';

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
 * between registered animations, and pausing/resuming playback, persisting
 * the animation choice via the given AnimationPreferenceStore port.
 * Framework-agnostic (no Astro/DOM event wiring beyond the canvas element
 * itself) — components/scripts wire this to click handlers, they don't
 * reimplement the switching/pause logic.
 */
export class BackgroundAnimationController<TName extends string = string> {
  private mounted: MountedAnimation | null = null;
  private current: TName;
  private playing = true;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly catalog: AnimationCatalog<TName>,
    private readonly preferenceStore: AnimationPreferenceStore,
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
    this.mounted = animation.mount(this.canvas);
    this.current = name;
    this.preferenceStore.set(name);
    if (!this.playing) {
      this.mounted.pause();
    }
  }
}
