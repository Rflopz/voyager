import type { BackgroundAnimation } from '../../domain/background-animation';

interface Star {
  x: number;
  y: number;
  z: number;
}

/**
 * "Starfield" adapter — a slow-drifting field of soft points, camera
 * pushing forward through space. Muted opacity, no neon.
 */
export class StarfieldAnimation implements BackgroundAnimation {
  private static readonly STAR_COUNT = 220;
  private static readonly SPEED = 0.4;
  private static readonly BG_COLOR = '#0b0e14';
  private static readonly STAR_COLOR = '228, 231, 238'; // rgb triplet

  mount(canvas: HTMLCanvasElement): () => void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};

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

    let rafId: number;
    const frame = () => {
      ctx.fillStyle = StarfieldAnimation.BG_COLOR;
      ctx.fillRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2);

      for (const star of stars) {
        if (!prefersReducedMotion) {
          star.z -= StarfieldAnimation.SPEED;
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
    frame();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      motionQuery.removeEventListener('change', onMotionChange);
    };
  }
}
