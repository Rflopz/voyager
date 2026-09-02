import type { BackgroundAnimation, MountedAnimation } from '../../domain/background-animation';
import type { AnimationSettingParam, ConfigurableAnimation } from '../../domain/animation-settings';

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
 * the gear-icon settings panel (components/molecules/AnimationSettingsPanel).
 */
export class StarfieldAnimation implements BackgroundAnimation, ConfigurableAnimation {
  private static readonly STAR_COUNT = 220;
  private static readonly DEFAULT_SPEED = 0.4;
  private static readonly BG_COLOR = '#0b0e14';
  private static readonly STAR_COLOR = '228, 231, 238'; // rgb triplet

  private speed = StarfieldAnimation.DEFAULT_SPEED;

  getSettingsSchema(): AnimationSettingParam[] {
    return [
      { key: 'speed', label: 'Speed', min: 0.05, max: 2, step: 0.05, defaultValue: StarfieldAnimation.DEFAULT_SPEED },
    ];
  }

  getSetting(key: string): number {
    if (key === 'speed') return this.speed;
    return 0;
  }

  setSetting(key: string, value: number): void {
    if (key === 'speed') this.speed = value;
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

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = motionQuery.matches;
    const onMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
    };
    motionQuery.addEventListener('change', onMotionChange);

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);

    let rafId: number | null = null;
    let paused = false;

    const frame = () => {
      if (paused) return;
      ctx.fillStyle = StarfieldAnimation.BG_COLOR;
      ctx.fillRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2);

      for (const star of stars) {
        if (!prefersReducedMotion) {
          star.z -= this.speed;
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
        motionQuery.removeEventListener('change', onMotionChange);
      },
    };
  }
}
