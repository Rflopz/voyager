import type { BackgroundAnimation } from '../../domain/background-animation';

interface Blob {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
}

/**
 * "Nebula drift" adapter — a few large, heavily-blurred soft color blobs
 * drifting slowly across the background, like faint nebula gas. No stars,
 * no motion-sickness camera push — just gentle color movement. Alternative
 * aesthetic to StarfieldAnimation for comparison.
 */
export class NebulaDriftAnimation implements BackgroundAnimation {
  private static readonly BG_COLOR = '#0b0e14';
  private static readonly BLOB_COLORS = [
    'rgba(108, 123, 209, 0.10)', // desaturated indigo, low opacity
    'rgba(155, 127, 199, 0.08)', // muted violet, low opacity
    'rgba(80, 100, 160, 0.07)', // dusty blue-gray, low opacity
  ];
  private static readonly SPEED = 0.12;

  mount(canvas: HTMLCanvasElement): () => void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const blobs: Blob[] = NebulaDriftAnimation.BLOB_COLORS.map((color) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.min(width, height) * (0.35 + Math.random() * 0.25),
      vx: (Math.random() - 0.5) * NebulaDriftAnimation.SPEED,
      vy: (Math.random() - 0.5) * NebulaDriftAnimation.SPEED,
      color,
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
      ctx.fillStyle = NebulaDriftAnimation.BG_COLOR;
      ctx.fillRect(0, 0, width, height);

      for (const blob of blobs) {
        if (!prefersReducedMotion) {
          blob.x += blob.vx;
          blob.y += blob.vy;
          if (blob.x < -blob.radius || blob.x > width + blob.radius) blob.vx *= -1;
          if (blob.y < -blob.radius || blob.y > height + blob.radius) blob.vy *= -1;
        }

        const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

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
