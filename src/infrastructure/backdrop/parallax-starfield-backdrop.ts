import * as THREE from 'three';
import type { BackgroundAnimation, MountedAnimation } from '../../domain/background-animation';

/**
 * Permanent parallax starfield — the original background layer from the
 * Rafael-landing-page blackhole template (three depth layers of soft
 * warm-white points, eased cursor parallax, gentle twinkle). This is the
 * ONE shared sky behind every switchable animation (see
 * components/atoms/StarsBackdrop.astro): starfield/nebula-drift/blackhole
 * only ever add something IN FRONT of this, never replace it.
 *
 * Implements BackgroundAnimation for interface consistency with the
 * switchable adapters (same mount/pause/resume/unmount contract), even
 * though StarsBackdrop mounts it once, directly, outside the
 * BackgroundAnimationController/registry — it is not user-choosable.
 */
export class ParallaxStarfieldBackdrop implements BackgroundAnimation {
  mount(canvas: HTMLCanvasElement): MountedAnimation {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let mobile = window.innerWidth < 760;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return { pause() {}, resume() {}, unmount() {} };
    }
    renderer.setClearColor(0x050506, 1);
    renderer.autoClear = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const STAR_VERT = `
precision highp float;
attribute float aSize;
attribute float aPhase;
attribute float aLayer;
attribute vec3  aTint;
uniform vec2  uParallax;
uniform float uTime;
uniform float uDpr;
uniform float uStatic;
varying float vAlpha;
varying vec3  vTint;
void main(){
  vec2 pos = position.xy;
  float depth = 0.35 + aLayer * 0.65;
  pos += uParallax * depth;
  pos.x += (uTime * 0.0009 * depth) * (1.0 - uStatic);
  pos.x = mod(pos.x + 1.0, 2.0) - 1.0;
  float tw = 0.68 + 0.32 * sin(uTime * 0.55 + aPhase * 6.2831);
  vAlpha = mix(0.30, 0.92, aLayer) * mix(tw, 0.85, uStatic);
  vTint = aTint;
  gl_PointSize = aSize * uDpr;
  gl_Position = vec4(pos, 0.0, 1.0);
}
`;

    const STAR_FRAG = `
precision highp float;
varying float vAlpha;
varying vec3 vTint;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.12, d) * vAlpha;
  gl_FragColor = vec4(vTint * a, a);
}
`;

    const count = mobile ? 700 : 1400;
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const layer = new Float32Array(count);
    const tint = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = Math.random() * 2 - 1;
      pos[i * 3 + 1] = Math.random() * 2 - 1;
      pos[i * 3 + 2] = 0;
      const l = Math.floor(Math.random() * 3) / 2;
      layer[i] = l;
      size[i] = 0.5 + Math.random() * 1.2 + l * 0.2;
      phase[i] = Math.random();
      const warm = Math.random() * Math.random();
      tint[i * 3] = 1.0;
      tint[i * 3 + 1] = 1.0 - warm * 0.09;
      tint[i * 3 + 2] = 1.0 - warm * 0.23;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    geometry.setAttribute('aLayer', new THREE.BufferAttribute(layer, 1));
    geometry.setAttribute('aTint', new THREE.BufferAttribute(tint, 3));

    const starU = {
      uParallax: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
      uDpr: { value: dpr },
      uStatic: { value: reduced ? 1 : 0 },
    };
    const scene = new THREE.Scene();
    scene.add(
      new THREE.Points(
        geometry,
        new THREE.ShaderMaterial({
          uniforms: starU,
          vertexShader: STAR_VERT,
          fragmentShader: STAR_FRAG,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.CustomBlending,
          blendSrc: THREE.OneFactor,
          blendDst: THREE.OneMinusSrcAlphaFactor,
        })
      )
    );

    let dead = false;
    let paused = false;
    let raf: number | null = null;
    let px = 0;
    let py = 0;
    let tx = 0;
    let ty = 0;
    let last = performance.now();

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      mobile = w < 760;
      renderer.setSize(w, h, false);
      if (reduced) frame(0);
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
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVis);

    function frame(dt: number) {
      const now = performance.now() * 0.001;
      starU.uTime.value = now;
      const capStar = 0.016;
      px += (tx - px) * Math.min(1, dt * 2.4);
      py += (ty - py) * Math.min(1, dt * 2.4);
      starU.uParallax.value.set(-px * capStar, py * capStar);
      renderer.render(scene, cam);
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
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', onPointer);
        document.removeEventListener('visibilitychange', onVis);
        renderer.dispose();
      },
    };
  }
}
