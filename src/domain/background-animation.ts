/**
 * Domain port for any decorative background animation. An adapter mounts
 * itself onto a canvas and returns a cleanup function. The domain has no
 * opinion on *how* an adapter draws — only this contract.
 *
 * Swapping the active animation should never require touching this file,
 * the components that render a <canvas>, or any other adapter — only:
 *   1. a new file under infrastructure/animations/ implementing this port
 *   2. one registry entry in infrastructure/animations/registry.ts
 *   3. one config value in src/config/site.ts
 */
export interface BackgroundAnimation {
  /**
   * Start drawing onto the given canvas. Must attach any listeners
   * (resize, prefers-reduced-motion, etc.) itself. Returns a cleanup
   * function that undoes everything this adapter attached.
   */
  mount(canvas: HTMLCanvasElement): () => void;
}
