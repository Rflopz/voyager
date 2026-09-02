import { BackgroundAnimationController } from '../application/background-animation-controller';
import { listAnimations, createAnimation, isAnimationName, type AnimationName } from '../infrastructure/animations/registry';
import { AnimationPreferenceStorage } from '../infrastructure/animations/storage/preferences';
import { AnimationSettingsStorage } from '../infrastructure/animations/storage/settings';
import { LocalStorageAdapter } from '../infrastructure/storage/local-storage';
import { ACTIVE_BACKGROUND_ANIMATION } from './site';

let controllerInstance: BackgroundAnimationController<AnimationName> | null = null;

/**
 * Client-side composition root for the background animation feature.
 * Constructs the controller exactly once (module-level singleton — safe
 * because ES modules are cached per URL, so the AnimatedBackground atom,
 * the AnimationSwitcher molecule, and the AnimationSettingsPanel molecule
 * importing this file all share one instance) and wires in the concrete
 * registry + storage adapters. This is the only file that knows all of
 * those concrete pieces — including that the storage mechanism today is
 * localStorage (LocalStorageAdapter); swapping it means changing the one
 * `new LocalStorageAdapter()` line here.
 */
export function getBackgroundAnimationController(container: HTMLElement) {
  if (!controllerInstance) {
    const storage = new LocalStorageAdapter();
    controllerInstance = new BackgroundAnimationController<AnimationName>(
      container,
      {
        list: listAnimations,
        create: createAnimation,
        isValidName: isAnimationName,
      },
      new AnimationPreferenceStorage(storage),
      new AnimationSettingsStorage(storage),
      ACTIVE_BACKGROUND_ANIMATION
    );
  }
  return controllerInstance;
}

export function getExistingBackgroundAnimationController() {
  return controllerInstance;
}
