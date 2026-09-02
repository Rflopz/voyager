import * as THREE from 'three';
import type { BackgroundAnimation, MountedAnimation } from '../../domain/background-animation';

/**
 * "Blackhole" adapter — ported from the Rafael-landing-page template.
 * A Three.js Gargantua-style lensed black hole, plus two plain 2D-canvas
 * overlays (lensed meteors, film grain) layered on top.
 *
 * Fully transparent: the WebGL canvas clears to alpha 0 and paints only
 * the black hole + dust glow, with no starfield of its own. Stars are
 * StarsBackdrop's job (components/atoms/StarsBackdrop.astro) — a single
 * permanent layer behind EVERY switchable animation, so switching
 * animations changes what's layered in front, never the base sky.
 *
 * The BackgroundAnimation port only hands this adapter one <canvas> (a
 * fresh one per mount — see application/background-animation-controller.ts
 * for why reusing one canvas across context types breaks adapters); this
 * adapter treats it as its main WebGL layer and creates two extra sibling
 * <canvas> elements next to it for the meteor and grain layers, tearing
 * them down again in unmount(). That's an implementation detail private
 * to this adapter — nothing else in the codebase needs to know a
 * "blackhole" pulls in two more DOM nodes than the other animations do.
 *
 * ConfigurableAnimation is intentionally NOT implemented here — the
 * template's tuning knobs (camera tilt, disk radius, Doppler strength) are
 * visual-design constants, not a "speed" the user would sensibly drag a
 * slider for, so no gear icon appears for this animation (that capability
 * is optional per adapter, see domain/animation-settings.ts).
 */
export class BlackholeAnimation implements BackgroundAnimation {
  mount(canvas: HTMLCanvasElement): MountedAnimation {
    const parent = canvas.parentElement;
    if (!parent) {
      return { pause() {}, resume() {}, unmount() {} };
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let mobile = window.innerWidth < 760;

    // ---- layered DOM: meteor canvas, grain canvas ----
    // Note: explicit width/height:100% is required here (not just
    // position:fixed;inset:0) — a <canvas> is a replaced element whose
    // intrinsic size is its width/height ATTRIBUTES (the WebGL drawing
    // buffer, set by renderer.setSize below, scaled by devicePixelRatio).
    // Without width/height:100% in CSS, the box tracks that raw
    // dpr-scaled attribute size instead of the viewport, which is what
    // made the scene visibly stretch/deform while resizing the window.
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '1';
    canvas.style.pointerEvents = 'none';

    const meteorCanvas = document.createElement('canvas');
    meteorCanvas.setAttribute('aria-hidden', 'true');
    meteorCanvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;opacity:0;transition:opacity 1200ms cubic-bezier(.2,.7,.2,1);';

    const grainCanvas = document.createElement('canvas');
    grainCanvas.setAttribute('aria-hidden', 'true');
    grainCanvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;opacity:0.016;image-rendering:pixelated;';

    parent.insertBefore(meteorCanvas, canvas.nextSibling);
    parent.insertBefore(grainCanvas, meteorCanvas.nextSibling);

    let dead = false;
    let raf: number | null = null;
    let paused = false;
    let renderer: THREE.WebGLRenderer | null = null;

    // ---- grain (plain 2D, coarse buffer stretched by CSS) ----
    const grainCtx = grainCanvas.getContext('2d');
    let grainTimer: ReturnType<typeof setInterval> | null = null;
    if (grainCtx) {
      const gw = 420;
      const gh = 280;
      grainCanvas.width = gw;
      grainCanvas.height = gh;
      const img = grainCtx.createImageData(gw, gh);
      const drawGrain = () => {
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = (110 + Math.random() * 145) | 0;
          d[i] = d[i + 1] = d[i + 2] = v;
          d[i + 3] = 255;
        }
        grainCtx.putImageData(img, 0, 0);
      };
      drawGrain();
      if (!reduced) grainTimer = setInterval(drawGrain, 83);
    }

    // ---- shader ----
    const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uCenter;
uniform float uScale;
uniform vec2  uParallax;
varying vec2 vUv;

const float RS       = 1.0;
const float DISK_IN  = 2.55;
const float DISK_OUT = 8.6;
const float CAMD     = 14.0;
const float TILT     = 0.116;
const float FOVK     = 1.95;
const float BETA     = 0.46;

const vec3 C_HOT = vec3(1.000, 0.851, 0.627);
const vec3 C_MID = vec3(0.910, 0.639, 0.239);
const vec3 C_OUT = vec3(0.549, 0.290, 0.071);

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec3 ramp(float t){
  return t < 0.5 ? mix(C_HOT, C_MID, t / 0.5) : mix(C_MID, C_OUT, (t - 0.5) / 0.5);
}

void main(){
  float aspect = uRes.x / uRes.y;
  vec2 sc = vec2((vUv.x - uCenter.x) * aspect, vUv.y - uCenter.y) + uParallax;

  vec3 col = vec3(0.0);
  float alpha = 0.0;

  vec2 duv = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
  float bandD = duv.y - duv.x * 0.44 + 0.05;
  float dust = exp(-bandD * bandD / 0.018) * (0.5 + 0.5 * noise(duv * 3.2 + uTime * 0.004));
  col   += vec3(0.42, 0.40, 0.37) * dust * 0.045;
  alpha  = max(alpha, dust * 0.045);

  float sd = length(sc);
  if (sd < 0.95 * uScale) {
    float fov = FOVK / max(uScale, 0.05);
    vec3 rd = normalize(vec3(sc * fov, 1.0));
    float ct = cos(TILT), st = sin(TILT);
    rd = vec3(rd.x, rd.y * ct - rd.z * st, rd.y * st + rd.z * ct);
    vec3 p = vec3(0.0, CAMD * st, -CAMD * ct);

    vec3 h = cross(p, rd);
    float h2 = dot(h, h);
    bool captured = false;
    vec3 acc = vec3(0.0);

    for (int i = 0; i < 110; i++) {
      float r = length(p);
      if (r > 26.0 && dot(p, rd) > 0.0) break;
      float dt = clamp(0.075 * r, 0.085, 0.95);
      vec3 pn = p + rd * dt;
      rd = normalize(rd - 1.5 * h2 * p / pow(r, 5.0) * dt);

      if (pn.y * p.y < 0.0) {
        float k = p.y / (p.y - pn.y);
        vec3 hit = mix(p, pn, k);
        float rr = length(hit.xz);
        if (rr > DISK_IN && rr < DISK_OUT) {
          float t = (rr - DISK_IN) / (DISK_OUT - DISK_IN);
          float ang = atan(hit.z, hit.x);
          float spin = uTime * 0.02 * pow(DISK_IN / rr, 1.5) * 8.0;
          float n = noise(vec2(ang * 2.6 / (0.35 + t) + spin, rr * 1.5))
                  * 0.65 + noise(vec2(ang * 7.0 + spin * 2.0, rr * 4.0)) * 0.35;
          float grain = 0.78 + 0.42 * n;
          float bright = pow(1.0 - t, 2.3)
                       * smoothstep(0.0, 0.07, t)
                       * (1.0 - smoothstep(0.55, 1.0, t));
          vec3 vel = normalize(cross(vec3(0.0, 1.0, 0.0), hit));
          float beta = BETA * sqrt(DISK_IN / rr);
          float dop = 1.0 / (1.0 - beta * dot(vel, -rd));
          float boost = pow(clamp(dop, 0.3, 2.4), 2.8);
          vec3 c = mix(ramp(t), C_HOT, clamp((boost - 1.0) * 0.42, 0.0, 0.9));
          acc += c * bright * grain * boost * 0.34;
        }
      }
      p = pn;
      if (length(p) < RS * 1.03) { captured = true; break; }
    }

    col += acc;
    if (captured) alpha = 1.0;
  }

  float g = exp(-sd / (0.085 * uScale)) * 0.30 + exp(-sd / (0.30 * uScale)) * 0.055;
  col += mix(C_MID, C_HOT, 0.25) * g;

  alpha = max(alpha, clamp(max(max(col.r, col.g), col.b), 0.0, 1.0));
  gl_FragColor = vec4(col, alpha);
}
`;

    // ---- lensed meteors (plain 2D canvas, screen-space two-body toy) ----
    const mctx = meteorCanvas.getContext('2d');
    let mdpr = Math.min(window.devicePixelRatio || 1, 2);
    let mu = 0;
    let nextMeteor = 2.2;
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
    let meteors: Meteor[] = [];

    const sizeMeteors = () => {
      if (!mctx) return;
      meteorCanvas.width = Math.round(window.innerWidth * mdpr);
      meteorCanvas.height = Math.round(window.innerHeight * mdpr);
      mu = meteorCanvas.height;
    };

    // ---- three.js scene (black hole quad only — no star field) ----
    let webglRenderer: THREE.WebGLRenderer;
    try {
      webglRenderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
    } catch {
      // No WebGL — StarsBackdrop stays visible with no black hole layer.
      return {
        pause() {},
        resume() {},
        unmount() {
          meteorCanvas.remove();
          grainCanvas.remove();
        },
      };
    }
    renderer = webglRenderer;
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const bhU = {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector2(mobile ? 0.5 : 0.78, mobile ? 0.72 : 0.55) },
      uScale: { value: 1 },
      uParallax: { value: new THREE.Vector2(0, 0) },
    };
    const bhScene = new THREE.Scene();
    bhScene.add(
      new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({
          uniforms: bhU,
          vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
          fragmentShader: FRAG,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.CustomBlending,
          blendSrc: THREE.OneFactor,
          blendDst: THREE.OneMinusSrcAlphaFactor,
        })
      )
    );

    let base = { x: mobile ? 0.5 : 0.78, y: mobile ? 0.72 : 0.55 };
    let px = 0;
    let py = 0;
    let tx = 0;
    let ty = 0;
    let last = performance.now();

    const applyScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const t = Math.min(1, Math.max(0, window.scrollY / max));
      const ease = (a: number, b: number, x: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));
      const s = 1 - 0.28 * ease(0, 0.5, t) + 0.52 * ease(0.66, 1, t);
      bhU.uScale.value = s;
      bhU.uCenter.value.set(base.x + (mobile ? 0 : 0.07 * t), base.y - 0.17 * t);
    };

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      mobile = w < 760;
      renderer!.setSize(w, h, false);
      bhU.uRes.value.set(w * dpr, h * dpr);
      base = { x: mobile ? 0.5 : 0.78, y: mobile ? 0.72 : 0.55 };
      sizeMeteors();
      applyScroll();
      if (reduced || paused) frame(0);
    };

    const onScroll = () => {
      if (!reduced) applyScroll();
    };
    const onPointer = (e: PointerEvent) => {
      if (reduced || mobile) return;
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onVis = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
      } else if (reduced) {
        frame(0);
      } else if (!raf && !paused) {
        last = performance.now();
        loop();
      }
    };

    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVis);

    const render = () => {
      renderer!.clear();
      renderer!.render(bhScene, cam);
    };

    const spawnMeteor = () => {
      const asp = window.innerWidth / window.innerHeight;
      const cx = bhU.uCenter.value.x * asp;
      const cy = 1 - bhU.uCenter.value.y;
      const a = Math.random() * Math.PI * 2;
      const R = 1.05;
      const sx = cx + Math.cos(a) * R * asp * 0.75;
      const sy = cy + Math.sin(a) * R;
      const b = (0.015 + Math.pow(Math.random(), 1.4) * 1.0) * (Math.random() < 0.5 ? -1 : 1);
      let dx = cx - sx;
      let dy = cy - sy;
      const L = Math.hypot(dx, dy) || 1;
      dx /= L;
      dy /= L;
      const tx2 = cx - dy * b;
      const ty2 = cy + dx * b;
      const vx = tx2 - sx;
      const vy = ty2 - sy;
      const vl = Math.hypot(vx, vy) || 1;
      const sp = 0.34 + Math.random() * 0.16;
      meteors.push({ x: sx, y: sy, vx: (vx / vl) * sp, vy: (vy / vl) * sp, pts: [], t: 0, alpha: 1, eaten: 0 });
    };

    const updateMeteors = (dt: number) => {
      if (!mctx) return;
      const ctx = mctx;
      const u = mu;
      const asp = window.innerWidth / window.innerHeight;
      ctx.clearRect(0, 0, meteorCanvas.width, meteorCanvas.height);

      nextMeteor -= dt;
      if (nextMeteor <= 0 && meteors.length < 2) {
        spawnMeteor();
        nextMeteor = (mobile ? 7 : 4.5) + Math.random() * 5;
      }

      const s = bhU.uScale.value;
      const cx = bhU.uCenter.value.x * asp;
      const cy = 1 - bhU.uCenter.value.y;
      const G = 0.016 * s * s;
      const CAPTURE = 0.145 * s;
      const HORIZON = 0.042 * s;
      ctx.globalCompositeOperation = 'lighter';

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.t += dt;
        if (!m.eaten) {
          for (let k = 0; k < 2; k++) {
            const h = dt / 2;
            const dx = cx - m.x;
            const dy = cy - m.y;
            const r = Math.max(0.02, Math.hypot(dx, dy));
            const f = G / (r * r * r);
            m.vx += dx * f * h;
            m.vy += dy * f * h;
            m.x += m.vx * h;
            m.y += m.vy * h;
          }
          m.pts.push(m.x, m.y);
          if (m.pts.length > 140) m.pts.splice(0, 2);
          const dx = m.x - cx;
          const dy = m.y - cy;
          const r = Math.hypot(dx, dy);
          if (r < CAPTURE) {
            m.eaten = 1;
            m.r = r;
            m.ang = Math.atan2(dy, dx);
            const Lm = dx * m.vy - dy * m.vx;
            m.spin = Lm < 0 ? -1 : 1;
            m.L = Math.max(Math.abs(Lm), 0.014 * s);
          }
        } else {
          const w = Math.min((m.L ?? 0) / ((m.r ?? 1) * (m.r ?? 1)), 22);
          m.ang = (m.ang ?? 0) + (m.spin ?? 1) * w * dt;
          m.r = Math.max(HORIZON * 0.55, (m.r ?? 0) - 0.04 * s * Math.pow(CAPTURE / (m.r ?? 1), 1.3) * dt);
          m.x = cx + Math.cos(m.ang) * m.r;
          m.y = cy + Math.sin(m.ang) * m.r;
          m.pts.push(m.x, m.y);
          if (m.pts.length > 140) m.pts.splice(0, 2);
          if (m.r <= HORIZON) m.gone = (m.gone || 0) + dt * 3.2;
          if (m.gone) {
            m.alpha = Math.max(0, 1 - m.gone);
            if (m.pts.length > 2) m.pts.splice(0, 6);
          }
        }
        const off = m.x < -0.55 || m.x > asp + 0.55 || m.y < -0.55 || m.y > 1.55;
        if (!off) m.seen = 1;
        if ((off && m.seen && !m.eaten) || m.t > 22 || m.alpha <= 0 || (m.gone && m.pts.length <= 2)) {
          meteors.splice(i, 1);
          continue;
        }

        const n = m.pts.length / 2;
        for (let j = 1; j < n; j++) {
          const f = j / n;
          const a = f * f * 0.85 * m.alpha;
          if (a < 0.004) continue;
          ctx.beginPath();
          ctx.moveTo(m.pts[(j - 1) * 2] * u, m.pts[(j - 1) * 2 + 1] * u);
          ctx.lineTo(m.pts[j * 2] * u, m.pts[j * 2 + 1] * u);
          ctx.lineWidth = (0.45 + f * 1.15) * mdpr;
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
          const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 5 * mdpr);
          g.addColorStop(0, 'rgba(255,247,232,' + 0.5 * m.alpha + ')');
          g.addColorStop(1, 'rgba(255,232,196,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(hx, hy, 5 * mdpr, 0, 6.2832);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    function frame(dt: number) {
      const now = performance.now() * 0.001;
      bhU.uTime.value = now;
      const capBH = 0.013;
      px += (tx - px) * Math.min(1, dt * 2.4);
      py += (ty - py) * Math.min(1, dt * 2.4);
      bhU.uParallax.value.set(px * capBH, -py * capBH * 0.7);
      render();
      if (dt > 0) updateMeteors(dt);
    }

    function loop() {
      raf = requestAnimationFrame(() => {
        if (dead || paused) return;
        const now = performance.now();
        const dt = Math.min(0.05, (now - last) * 0.001);
        last = now;
        frame(dt);
        loop();
      });
    }

    resize();
    if (!reduced) meteorCanvas.style.opacity = '1';

    if (reduced) {
      frame(0);
    } else {
      last = performance.now();
      loop();
    }

    return {
      pause() {
        paused = true;
        if (raf) cancelAnimationFrame(raf);
        raf = null;
      },
      resume() {
        if (paused) {
          paused = false;
          last = performance.now();
          loop();
        }
      },
      unmount() {
        dead = true;
        if (raf) cancelAnimationFrame(raf);
        if (grainTimer) clearInterval(grainTimer);
        window.removeEventListener('resize', resize);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('pointermove', onPointer);
        document.removeEventListener('visibilitychange', onVis);
        renderer?.dispose();
        meteorCanvas.remove();
        grainCanvas.remove();
        meteors = [];
      },
    };
  }
}
