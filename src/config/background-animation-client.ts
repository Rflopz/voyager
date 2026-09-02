import { BackgroundAnimationController } from '../application/background-animation-controller';
import { listAnimations, createAnimation, isAnimationName, type AnimationName } from '../infrastructure/animations/registry';
import { LocalStorageAnimationPreferenceStore } from '../infrastructure/animations/local-storage-animation-preference-store';
import { LocalStorageAnimationSettingsStore } from '../infrastructure/animations/local-storage-animation-settings-store';
import { ACTIVE_BACKGROUND_ANIMATION } from './site';

let controllerInstance: BackgroundAnimationController<AnimationName> | null = null;

/**
 * Client-side composition root for the background animation feature.
 * Constructs the controller exactly once (module-level singleton — safe
 * because ES modules are cached per URL, so the AnimatedBackground atom,
 * the AnimationSwitcher molecule, and the AnimationSettingsPanel molecule
 * importing this file all share one instance) and wires in the concrete
 * registry + localStorage adapters. This is the only file that knows all
 * of those concrete pieces.
 */
export function getBackgroundAnimationController(container: HTMLElement) {
  if (!controllerInstance) {
    controllerInstance = new BackgroundAnimationController<AnimationName>(
      container,
      {
        list: listAnimations,
        create: createAnimation,
        isValidName: isAnimationName,
      },
      new LocalStorageAnimationPreferenceStore(),
      new LocalStorageAnimationSettingsStore(),
      ACTIVE_BACKGROUND_ANIMATION
    );
  }
  return controllerInstance;
}

export function getExistingBackgroundAnimationController() {
  return controllerInstance;
}
