/**
 * Shared viewport breakpoint below which animation adapters switch to
 * their lighter "mobile" render path (fewer stars/particles, no pointer
 * parallax, different framing). Was duplicated as the magic number 760
 * in both BlackholeAnimation and ParallaxStarfieldBackdrop.
 */
export const MOBILE_BREAKPOINT_PX = 760;

export function isMobileViewport(): boolean {
  return window.innerWidth < MOBILE_BREAKPOINT_PX;
}
