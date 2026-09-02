import type { BackgroundAnimation, MountedAnimation } from '../../domain/animations/background-animation';
import type { AnimationSettingParam, ConfigurableAnimation } from '../../domain/animations/settings';
import { NumericSettings } from '../../domain/animations/numeric-settings';
import { watchReducedMotion } from './motion-preference';

interface Blob {
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  vx: number;
  vy: number;
  color: string;
  pulsePhase: number;
}

/**
 * "Nebula drift" adapter — a few large, heavily-blurred soft color blobs
 * drifting slowly across the background with a gentle pulse, like faint
 * nebula gas. No stars, no motion-sickness camera push — just gentle color
 * movement. Alternative aesthetic to StarfieldAnimation for comparison.
 *
 * Implements ConfigurableAnimation to expose a tunable "Speed" setting via
 * the gear-icon settings panel (components/molecules/AnimationSettingsPanel),
 * delegated to NumericSettings — see StarfieldAnimation for the same
 * pattern.
 */
export class NebulaDriftAnimation implements BackgroundAnimation, ConfigurableAnimation {
  private static readonly BLOB_COLORS = [
    'rgba(108, 123, 209, 0.22)', // desaturated indigo
    'rgba(155, 127, 199, 0.18)', // muted violet
    'rgba(80, 100, 160, 0.16)', // dusty blue-gray
  ];
  // px/frame at 60fps — visibly drifting without being distracting
  private static readonly DEFAULT_SPEED = 0.6;
  private static readonly PULSE_SPEED = 0.008;
  private static readonly PULSE_AMOUNT = 0.15; // +/- 15% radius breathing

  private readonly settings = new NumericSettings([
    { key: 'speed', label: 'Speed', min: 0.1, max: 2, step: 0.05, defaultValue: NebulaDriftAnimation.DEFAULT_SPEED },
  ]);

  getSettingsSchema(): AnimationSettingParam[] {
    return this.settings.getSettingsSchema();
  }

  getSetting(key: string): number {
    return this.settings.getSetting(key);
  }

  setSetting(key: string, value: number): void {
    this.settings.setSetting(key, value);
  }

  mount(canvas: HTMLCanvasElement): MountedAnimation {
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return { pause() {}, resume() {}, unmount() {} };
    }

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const blobs: Blob[] = NebulaDriftAnimation.BLOB_COLORS.map((color, i) => {
      const baseRadius = Math.min(width, height) * (0.3 + Math.random() * 0.2);
      const angle = Math.random() * Math.PI * 2;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: baseRadius,
        baseRadius,
        vx: Math.cos(angle),
        vy: Math.sin(angle),
        color,
        pulsePhase: i * 2.1,
      };
    });

    const motion = watchReducedMotion();

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);

    let rafId: number | null = null;
    let paused = false;
    let tick = 0;

    const frame = () => {
      if (paused) return;

      tick += 1;
      ctx.clearRect(0, 0, width, height);

      for (const blob of blobs) {
        if (!motion.reduced) {
          blob.x += blob.vx * this.settings.getSetting('speed');
          blob.y += blob.vy * this.settings.getSetting('speed');
          const margin = blob.baseRadius * 0.3;

          if (blob.x < -margin) blob.vx = Math.abs(blob.vx);
          if (blob.x > width + margin) blob.vx = -Math.abs(blob.vx);
          if (blob.y < -margin) blob.vy = Math.abs(blob.vy);
          if (blob.y > height + margin) blob.vy = -Math.abs(blob.vy);

          const pulse = Math.sin(tick * NebulaDriftAnimation.PULSE_SPEED + blob.pulsePhase);
          blob.radius = blob.baseRadius * (1 + pulse * NebulaDriftAnimation.PULSE_AMOUNT);
        }

        const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

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
