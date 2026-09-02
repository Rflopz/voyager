import * as THREE from 'three';
import type { BackgroundAnimation, MountedAnimation } from '../../domain/animations/background-animation';
import type { AnimationSettingParam, ConfigurableAnimation } from '../../domain/animations/settings';
import { NumericSettings } from '../../domain/animations/numeric-settings';
import { prefersReducedMotion } from './motion-preference';
import { isMobileViewport, MOBILE_BREAKPOINT_PX } from './viewport';
import { createBlackholeUniforms, createBlackholeScene, type BlackholeUniforms } from './blackhole/shader';
import { MeteorField } from './blackhole/meteor-field';
import { FilmGrain } from './blackhole/film-grain';

const DEFAULT_METEOR_SPEED = 1;
const DEFAULT_METEOR_DENSITY = 1;
const DEFAULT_DUST_LEVEL = 1;
// Matches the original hardcoded grainCanvas CSS opacity.
const DEFAULT_GRAIN_LEVEL = 0.016;

/**
 * "Blackhole" adapter — ported from the Rafael-landing-page template.
 * A Three.js Gargantua-style lensed black hole, plus two plain 2D-canvas
 * overlays (lensed meteors, film grain) layered on top. Each concern lives
 * in its own module under ./blackhole/ — this file is just the DOM
 * lifecycle + per-frame orchestration wiring them together:
 *   - ./blackhole/shader.ts    the GLSL + Three.js scene/uniforms
 *   - ./blackhole/meteor-field.ts  the falling-meteor physics + drawing
 *   - ./blackhole/film-grain.ts    the noise overlay
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
 * Implements ConfigurableAnimation with four tunables surfaced in the
 * gear-icon settings panel: meteor speed, meteor density (spawn rate +
 * max concurrent count), dust level, and film-grain intensity. The
 * template's fixed visual-design constants (camera tilt, disk radius,
 * Doppler strength) are NOT exposed — those aren't sliders a user would
 * sensibly drag.
 */
export class BlackholeAnimation implements BackgroundAnimation, ConfigurableAnimation {
  private readonly settings = new NumericSettings([
    { key: 'meteorSpeed', label: 'Meteor Speed', min: 0.2, max: 2.5, step: 0.1, defaultValue: DEFAULT_METEOR_SPEED },
    {
      key: 'meteorDensity',
      label: 'Meteor Density',
      min: 0.2,
      max: 3,
      step: 0.1,
      defaultValue: DEFAULT_METEOR_DENSITY,
    },
    { key: 'dustLevel', label: 'Dust', min: 0, max: 2, step: 0.1, defaultValue: DEFAULT_DUST_LEVEL },
    { key: 'grainLevel', label: 'Grain', min: 0, max: 0.06, step: 0.002, defaultValue: DEFAULT_GRAIN_LEVEL },
  ]);

  private grain: FilmGrain | null = null;
  // Reference to the currently-mounted shader's live uniforms, so
  // setSetting('dustLevel', ...) can push the change to the GPU
  // immediately. Unlike meteorSpeed/meteorDensity (read fresh from
  // `this.settings` every frame inside meteors.update()) and grainLevel
  // (forwarded straight to the FilmGrain instance), the shader uniform
  // object is only ever constructed once per mount — without this
  // reference, dustLevel changes would silently do nothing after mount.
  private activeUniforms: BlackholeUniforms | null = null;

  getSettingsSchema(): AnimationSettingParam[] {
    return this.settings.getSettingsSchema();
  }

  getSetting(key: string): number {
    return this.settings.getSetting(key);
  }

  setSetting(key: string, value: number): void {
    this.settings.setSetting(key, value);

    if (key === 'grainLevel') this.grain?.setIntensity(value);
    if (key === 'dustLevel' && this.activeUniforms) this.activeUniforms.uDustLevel.value = value;
  }

  mount(canvas: HTMLCanvasElement): MountedAnimation {
    const parent = canvas.parentElement;

    if (!parent) {
      return { pause() {}, resume() {}, unmount() {} };
    }

    const reduced = prefersReducedMotion();
    let mobile = isMobileViewport();

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
    grainCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;image-rendering:pixelated;';

    parent.insertBefore(meteorCanvas, canvas.nextSibling);
    parent.insertBefore(grainCanvas, meteorCanvas.nextSibling);

    let dead = false;
    let raf: number | null = null;
    let paused = false;
    let renderer: THREE.WebGLRenderer | null = null;

    this.grain = new FilmGrain(grainCanvas, reduced);
    this.grain.setIntensity(this.settings.getSetting('grainLevel'));
    this.grain.start();

    const meteors = new MeteorField(meteorCanvas);

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
        unmount: () => {
          this.grain?.dispose();
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
    const bhU = createBlackholeUniforms(mobile, this.settings.getSetting('dustLevel'));
    const bhScene = createBlackholeScene(bhU);
    this.activeUniforms = bhU;

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
      mobile = w < MOBILE_BREAKPOINT_PX;
      renderer!.setSize(w, h, false);
      bhU.uRes.value.set(w * dpr, h * dpr);
      base = { x: mobile ? 0.5 : 0.78, y: mobile ? 0.72 : 0.55 };
      meteors.resize();
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

    const frame = (dt: number) => {
      const now = performance.now() * 0.001;
      bhU.uTime.value = now;
      const capBH = 0.013;
      px += (tx - px) * Math.min(1, dt * 2.4);
      py += (ty - py) * Math.min(1, dt * 2.4);
      bhU.uParallax.value.set(px * capBH, -py * capBH * 0.7);
      render();

      if (dt > 0) {
        meteors.update(dt, {
          centerX: bhU.uCenter.value.x,
          centerY: bhU.uCenter.value.y,
          scale: bhU.uScale.value,
          mobile,
          speedMultiplier: this.settings.getSetting('meteorSpeed'),
          densityMultiplier: this.settings.getSetting('meteorDensity'),
        });
      }
    };

    const loop = () => {
      raf = requestAnimationFrame(() => {
        if (dead || paused) return;

        const now = performance.now();
        const dt = Math.min(0.05, (now - last) * 0.001);
        last = now;
        frame(dt);
        loop();
      });
    };

    resize();

    if (!reduced) meteorCanvas.style.opacity = '1';

    if (reduced) {
      frame(0);
    } else {
      last = performance.now();
      loop();
    }

    return {
      pause: () => {
        paused = true;

        if (raf) cancelAnimationFrame(raf);

        raf = null;
      },
      resume: () => {
        if (paused) {
          paused = false;
          last = performance.now();
          loop();
        }
      },
      unmount: () => {
        dead = true;

        if (raf) cancelAnimationFrame(raf);

        this.grain?.dispose();
        this.activeUniforms = null;
        window.removeEventListener('resize', resize);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('pointermove', onPointer);
        document.removeEventListener('visibilitychange', onVis);
        renderer?.dispose();
        meteorCanvas.remove();
        grainCanvas.remove();
        meteors.dispose();
      },
    };
  }
}
