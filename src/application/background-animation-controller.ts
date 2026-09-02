import type { BackgroundAnimation } from '../domain/background-animation';
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
 * Orchestrates mounting a BackgroundAnimation onto a canvas and switching
 * between registered animations at runtime, persisting the choice via the
 * given AnimationPreferenceStore port. Framework-agnostic (no Astro/DOM
 * event wiring beyond the canvas element itself) — components/scripts wire
 * this to click handlers, they don't reimplement the switching logic.
 */
export class BackgroundAnimationController<TName extends string = string> {
  private cleanup: (() => void) | null = null;
  private current: TName;

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

  start(): void {
    this.mount(this.current);
  }

  switchTo(name: TName): void {
    if (name === this.current && this.cleanup) return;
    this.mount(name);
    this.preferenceStore.set(name);
  }

  private mount(name: TName): void {
    this.cleanup?.();
    const animation = this.catalog.create(name);
    this.cleanup = animation.mount(this.canvas);
    this.current = name;
  }
}
