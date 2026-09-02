import { createAnimation } from './registry';
import { ACTIVE_BACKGROUND_ANIMATION } from '../../config/site';

/**
 * Client-side bootstrap: looks up the configured animation via the registry
 * and mounts it on the given canvas. This is the only file that knows about
 * both the config switch and the registry — components stay decoupled from
 * both.
 */
export function mountBackgroundAnimation(canvas: HTMLCanvasElement): () => void {
  const animation = createAnimation(ACTIVE_BACKGROUND_ANIMATION);
  return animation.mount(canvas);
}
