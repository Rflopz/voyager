import type { BackgroundAnimation } from '../../domain/animations/background-animation';
import { StarfieldAnimation } from './starfield-animation';
import { NebulaDriftAnimation } from './nebula-drift-animation';
import { BlackholeAnimation } from './blackhole-animation';

interface AnimationRegistryEntry {
  label: string;
  create: () => BackgroundAnimation;
}

/**
 * Registry mapping an animation name to its label + adapter factory. To add
 * a new animation: implement BackgroundAnimation in a new file in this
 * folder, then add one entry here. Nothing else in the codebase — not the
 * config switch, not the switcher UI, not any component — needs to change;
 * the UI list is generated from this registry.
 */
export const animationRegistry = {
  starfield: {
    label: 'Starfield',
    create: () => new StarfieldAnimation(),
  },
  'nebula-drift': {
    label: 'Nebula Drift',
    create: () => new NebulaDriftAnimation(),
  },
  blackhole: {
    label: 'Blackhole',
    create: () => new BlackholeAnimation(),
  },
} satisfies Record<string, AnimationRegistryEntry>;

export type AnimationName = keyof typeof animationRegistry;

export function createAnimation(name: AnimationName): BackgroundAnimation {
  return animationRegistry[name].create();
}

export function listAnimations(): { name: AnimationName; label: string }[] {
  return (Object.keys(animationRegistry) as AnimationName[]).map((name) => ({
    name,
    label: animationRegistry[name].label,
  }));
}

export function isAnimationName(value: string): value is AnimationName {
  return value in animationRegistry;
}
