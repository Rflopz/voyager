/**
 * Lensed meteors ("falling stars") — a plain 2D-canvas overlay drawn on
 * top of the WebGL black hole, using a screen-space two-body toy physics
 * sim (not a real geodesic — good enough to read as gravity at a glance).
 *
 * Split out of blackhole-animation.ts so the meteor physics/rendering
 * (this file) is separate from DOM/lifecycle wiring (the orchestrator).
 * Exposes two tunables the orchestrator wires to the settings panel:
 *   - speedMultiplier: scales how fast a newly spawned meteor travels.
 *   - densityMultiplier: scales both how often meteors spawn (shorter
 *     cooldown at higher density) and how many can be in flight at once.
 * Both default to 1, reproducing the original fixed-density behavior.
 */

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  pts: number[];
  t: number;
  alpha: number;
  eaten: number;
  r?: number;
  ang?: number;
  spin?: number;
  L?: number;
  gone?: number;
  seen?: number;
}

export interface MeteorFieldUpdateParams {
  /** Black hole center, uCenter uniform space (0..1). */
  centerX: number;
  centerY: number;
  /** Current uScale uniform value — bigger meteors' capture radius scales with it. */
  scale: number;
  mobile: boolean;
  speedMultiplier: number;
  densityMultiplier: number;
}

// Baseline (densityMultiplier === 1) spawn cooldown range, matching the
// original fixed values: desktop 4.5-9.5s, mobile 7-12s between meteors.
const BASE_COOLDOWN_MIN = { desktop: 4.5, mobile: 7 };
const BASE_COOLDOWN_SPREAD = 5;
// Baseline (densityMultiplier === 1) max concurrent meteors in flight.
const BASE_MAX_CONCURRENT = 2;

export class MeteorField {
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly dpr = Math.min(window.devicePixelRatio || 1, 2);
  private canvasHeight = 0;
  private nextSpawnIn = 2.2;
  private meteors: Meteor[] = [];

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
  }

  resize(): void {
    this.canvas.width = Math.round(window.innerWidth * this.dpr);
    this.canvas.height = Math.round(window.innerHeight * this.dpr);
    this.canvasHeight = this.canvas.height;
  }

  update(dt: number, params: MeteorFieldUpdateParams): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const u = this.canvasHeight;
    const asp = window.innerWidth / window.innerHeight;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.maybeSpawn(dt, params, asp);

    const s = params.scale;
    const cx = params.centerX * asp;
    const cy = 1 - params.centerY;
    const gravity = 0.016 * s * s;
    const captureRadius = 0.145 * s;
    const horizonRadius = 0.042 * s;
    ctx.globalCompositeOperation = 'lighter';

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.t += dt;

      if (!m.eaten) {
        this.stepFreeFlight(m, dt, cx, cy, gravity);

        const dx = m.x - cx;
        const dy = m.y - cy;
        const r = Math.hypot(dx, dy);

        if (r < captureRadius) this.captureMeteor(m, dx, dy, r, s);
      } else {
        this.stepOrbitDecay(m, dt, cx, cy, captureRadius, horizonRadius, s);
      }

      const off = m.x < -0.55 || m.x > asp + 0.55 || m.y < -0.55 || m.y > 1.55;

      if (!off) m.seen = 1;
      if ((off && m.seen && !m.eaten) || m.t > 22 || m.alpha <= 0 || (m.gone && m.pts.length <= 2)) {
        this.meteors.splice(i, 1);
        continue;
      }

      this.drawTrail(ctx, m, u);
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  dispose(): void {
    this.meteors = [];
  }

  private maybeSpawn(dt: number, params: MeteorFieldUpdateParams, asp: number): void {
    const density = Math.max(0.01, params.densityMultiplier);
    const maxConcurrent = Math.max(1, Math.round(BASE_MAX_CONCURRENT * density));

    this.nextSpawnIn -= dt;

    if (this.nextSpawnIn <= 0 && this.meteors.length < maxConcurrent) {
      this.spawnMeteor(params, asp);
      const cooldownMin = params.mobile ? BASE_COOLDOWN_MIN.mobile : BASE_COOLDOWN_MIN.desktop;
      this.nextSpawnIn = (cooldownMin + Math.random() * BASE_COOLDOWN_SPREAD) / density;
    }
  }

  private spawnMeteor(params: MeteorFieldUpdateParams, asp: number): void {
    const cx = params.centerX * asp;
    const cy = 1 - params.centerY;
    const a = Math.random() * Math.PI * 2;
    const R = 1.05;
    const sx = cx + Math.cos(a) * R * asp * 0.75;
    const sy = cy + Math.sin(a) * R;
    const impactParam = (0.015 + Math.pow(Math.random(), 1.4) * 1.0) * (Math.random() < 0.5 ? -1 : 1);
    let dx = cx - sx;
    let dy = cy - sy;
    const toCenterLen = Math.hypot(dx, dy) || 1;
    dx /= toCenterLen;
    dy /= toCenterLen;
    const aimX = cx - dy * impactParam;
    const aimY = cy + dx * impactParam;
    const vx = aimX - sx;
    const vy = aimY - sy;
    const vl = Math.hypot(vx, vy) || 1;
    const speed = (0.34 + Math.random() * 0.16) * params.speedMultiplier;
    this.meteors.push({
      x: sx,
      y: sy,
      vx: (vx / vl) * speed,
      vy: (vy / vl) * speed,
      pts: [],
      t: 0,
      alpha: 1,
      eaten: 0,
    });
  }

  /** Two-body gravity toy: sub-stepped Euler integration toward (cx, cy). */
  private stepFreeFlight(m: Meteor, dt: number, cx: number, cy: number, gravity: number): void {
    for (let k = 0; k < 2; k++) {
      const h = dt / 2;
      const dx = cx - m.x;
      const dy = cy - m.y;
      const r = Math.max(0.02, Math.hypot(dx, dy));
      const f = gravity / (r * r * r);
      m.vx += dx * f * h;
      m.vy += dy * f * h;
      m.x += m.vx * h;
      m.y += m.vy * h;
    }

    m.pts.push(m.x, m.y);

    if (m.pts.length > 140) m.pts.splice(0, 2);
  }

  private captureMeteor(m: Meteor, dx: number, dy: number, r: number, scale: number): void {
    m.eaten = 1;
    m.r = r;
    m.ang = Math.atan2(dy, dx);
    const angularMomentum = dx * m.vy - dy * m.vx;
    m.spin = angularMomentum < 0 ? -1 : 1;
    m.L = Math.max(Math.abs(angularMomentum), 0.014 * scale);
  }

  /** Post-capture: spirals inward along its conserved angular momentum until it crosses the horizon, then fades. */
  private stepOrbitDecay(
    m: Meteor,
    dt: number,
    cx: number,
    cy: number,
    captureRadius: number,
    horizonRadius: number,
    scale: number
  ): void {
    const angularVelocity = Math.min((m.L ?? 0) / ((m.r ?? 1) * (m.r ?? 1)), 22);
    m.ang = (m.ang ?? 0) + (m.spin ?? 1) * angularVelocity * dt;
    m.r = Math.max(horizonRadius * 0.55, (m.r ?? 0) - 0.04 * scale * Math.pow(captureRadius / (m.r ?? 1), 1.3) * dt);
    m.x = cx + Math.cos(m.ang) * m.r;
    m.y = cy + Math.sin(m.ang) * m.r;
    m.pts.push(m.x, m.y);

    if (m.pts.length > 140) m.pts.splice(0, 2);
    if (m.r <= horizonRadius) m.gone = (m.gone || 0) + dt * 3.2;

    if (m.gone) {
      m.alpha = Math.max(0, 1 - m.gone);

      if (m.pts.length > 2) m.pts.splice(0, 6);
    }
  }

  private drawTrail(ctx: CanvasRenderingContext2D, m: Meteor, u: number): void {
    const n = m.pts.length / 2;

    for (let j = 1; j < n; j++) {
      const f = j / n;
      const a = f * f * 0.85 * m.alpha;

      if (a < 0.004) continue;

      ctx.beginPath();
      ctx.moveTo(m.pts[(j - 1) * 2] * u, m.pts[(j - 1) * 2 + 1] * u);
      ctx.lineTo(m.pts[j * 2] * u, m.pts[j * 2 + 1] * u);
      ctx.lineWidth = (0.45 + f * 1.15) * this.dpr;
      ctx.strokeStyle = m.gone
        ? 'rgba(232,163,61,' + a + ')'
        : m.eaten
          ? 'rgba(255,225,180,' + a * 1.15 + ')'
          : 'rgba(255,240,214,' + a + ')';
      ctx.stroke();
    }

    if (!m.gone && n > 1) {
      const hx = m.pts[(n - 1) * 2] * u;
      const hy = m.pts[(n - 1) * 2 + 1] * u;
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 5 * this.dpr);
      g.addColorStop(0, 'rgba(255,247,232,' + 0.5 * m.alpha + ')');
      g.addColorStop(1, 'rgba(255,232,196,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(hx, hy, 5 * this.dpr, 0, 6.2832);
      ctx.fill();
    }
  }
}
