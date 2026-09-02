/**
 * Domain port for any decorative background animation. An adapter mounts
 * itself onto a canvas and returns handles to pause, resume, and fully
 * unmount. The domain has no opinion on *how* an adapter draws — only this
 * contract.
 *
 * Swapping the active animation should never require touching this file,
 * the components that render a <canvas>, or any other adapter — only:
 *   1. a new file under infrastructure/animations/ implementing this port
 *   2. one registry entry in infrastructure/animations/registry.ts
 *   3. one config value in src/config/site.ts
 */
export interface MountedAnimation {
  /** Stop drawing without tearing down listeners (resumable). */
  pause(): void;
  /** Resume drawing after a pause(). */
  resume(): void;
  /** Fully tear down: stop drawing and remove any attached listeners. */
  unmount(): void;
}

export interface BackgroundAnimation {
  mount(canvas: HTMLCanvasElement): MountedAnimation;
}
