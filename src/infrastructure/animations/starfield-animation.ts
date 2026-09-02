import type { BackgroundAnimation, MountedAnimation } from '../../domain/animations/background-animation';
import type { AnimationSettingParam, ConfigurableAnimation } from '../../domain/animations/settings';
import { SingleNumericSetting } from '../../domain/animations/single-numeric-setting';
import { watchReducedMotion } from './motion-preference';

interface Star {
  x: number;
  y: number;
  z: number;
}

/**
 * "Starfield" adapter — a slow-drifting field of soft points, camera
 * pushing forward through space. Muted opacity, no neon.
 *
 * Implements ConfigurableAnimation to expose a tunable "Speed" setting via
 * the gear-icon settings panel (components/molecules/AnimationSettingsPanel),
 * delegated to SingleNumericSetting since "one speed slider" is the whole
 * shape of this adapter's tunables.
 */
export class StarfieldAnimation implements BackgroundAnimation, ConfigurableAnimation {
  private static readonly STAR_COUNT = 220;
  private static readonly DEFAULT_SPEED = 0.4;
  private static readonly STAR_COLOR = '228, 231, 238'; // rgb triplet

  private readonly speedSetting = new SingleNumericSetting({
    key: 'speed',
    label: 'Speed',
    min: 0.05,
    max: 2,
    step: 0.05,
    defaultValue: StarfieldAnimation.DEFAULT_SPEED,
  });

  getSettingsSchema(): AnimationSettingParam[] {
    return this.speedSetting.getSettingsSchema();
  }

  getSetting(key: string): number {
    return this.speedSetting.getSetting(key);
  }

  setSetting(key: string, value: number): void {
    this.speedSetting.setSetting(key, value);
  }

  mount(canvas: HTMLCanvasElement): MountedAnimation {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { pause() {}, resume() {}, unmount() {} };
    }

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const stars: Star[] = Array.from({ length: StarfieldAnimation.STAR_COUNT }, () => ({
      x: Math.random() * width - width / 2,
      y: Math.random() * height - height / 2,
      z: Math.random() * width,
    }));

    const motion = watchReducedMotion();

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);

    let rafId: number | null = null;
    let paused = false;

    const frame = () => {
      if (paused) return;
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2);

      for (const star of stars) {
        if (!motion.reduced) {
          star.z -= this.speedSetting.value;
          if (star.z <= 0) star.z = width;
        }
        const k = 128 / star.z;
        const sx = star.x * k;
        const sy = star.y * k;
        const size = (1 - star.z / width) * 1.8;
        const opacity = 1 - star.z / width;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${StarfieldAnimation.STAR_COLOR}, ${(opacity * 0.6).toFixed(3)})`;
        ctx.arc(sx, sy, Math.max(size, 0.3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    return {
      pause() {
        paused = true;
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = null;
      },
      resume() {
        if (paused) {
          paused = false;
          rafId = requestAnimationFrame(frame);
        }
      },
      unmount() {
        paused = true;
        if (rafId !== null) cancelAnimationFrame(rafId);
        window.removeEventListener('resize', resize);
        motion.dispose();
      },
    };
  }
}
