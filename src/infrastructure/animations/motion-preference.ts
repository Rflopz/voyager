/**
 * Shared `prefers-reduced-motion` helpers for canvas-based animation
 * adapters. StarfieldAnimation and NebulaDriftAnimation both hand-rolled
 * an identical matchMedia + change-listener + cleanup block; adapters
 * that only need the value once at mount time (BlackholeAnimation,
 * ParallaxStarfieldBackdrop) use the one-shot check instead.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface ReducedMotionWatcher {
  readonly reduced: boolean;
  dispose(): void;
}

/** Live-updating variant for adapters that react to the setting changing mid-session. */
export function watchReducedMotion(): ReducedMotionWatcher {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = query.matches;

  const onChange = (e: MediaQueryListEvent) => {
    reduced = e.matches;
  };

  query.addEventListener('change', onChange);
  return {
    get reduced() {
      return reduced;
    },
    dispose() {
      query.removeEventListener('change', onChange);
    },
  };
}
