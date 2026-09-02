import type { BackgroundAnimation } from '../../domain/background-animation';
import { StarfieldAnimation } from './starfield-animation';
import { NebulaDriftAnimation } from './nebula-drift-animation';

/**
 * Registry mapping an animation name to its adapter. To add a new
 * animation: implement BackgroundAnimation in a new file in this folder,
 * then add one line here. Nothing else in the codebase needs to change.
 */
export const animationRegistry = {
  starfield: () => new StarfieldAnimation(),
  'nebula-drift': () => new NebulaDriftAnimation(),
} as const;

export type AnimationName = keyof typeof animationRegistry;

export function createAnimation(name: AnimationName): BackgroundAnimation {
  return animationRegistry[name]();
}
