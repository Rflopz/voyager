interface Star {
  x: number;
  y: number;
  z: number;
}

export function initStarfield(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);
  const STAR_COUNT = 220;
  const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * width - width / 2,
    y: Math.random() * height - height / 2,
    z: Math.random() * width,
  }));

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let prefersReducedMotion = motionQuery.matches;
  motionQuery.addEventListener('change', (e) => {
    prefersReducedMotion = e.matches;
  });

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);

  let rafId: number;
  function frame() {
    if (!ctx) return;
    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);

    for (const star of stars) {
      if (!prefersReducedMotion) {
        star.z -= 0.4;
        if (star.z <= 0) star.z = width;
      }
      const k = 128 / star.z;
      const sx = star.x * k;
      const sy = star.y * k;
      const size = (1 - star.z / width) * 1.8;
      const opacity = 1 - star.z / width;

      ctx.beginPath();
      ctx.fillStyle = `rgba(228, 231, 238, ${(opacity * 0.6).toFixed(3)})`;
      ctx.arc(sx, sy, Math.max(size, 0.3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    rafId = requestAnimationFrame(frame);
  }
  frame();

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
  };
}
