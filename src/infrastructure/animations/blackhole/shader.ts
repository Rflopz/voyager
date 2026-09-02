import * as THREE from 'three';

/**
 * The Gargantua-style lensed black-hole shader — the GPU half of
 * BlackholeAnimation. Pulled into its own module so the orchestrator
 * (blackhole-animation.ts) reads as scene/lifecycle wiring, not 100+
 * lines of GLSL interrupting it.
 *
 * uDustLevel is the one tunable exposed here: it scales the ambient dust
 * band's contribution to both color and alpha (see the two `* 0.045`
 * terms below), driven by BlackholeAnimation's "Dust" setting. Everything
 * else (camera tilt, disk radius, Doppler strength) stays a fixed
 * visual-design constant — those aren't sliders a user would sensibly
 * drag, per the adapter-level doc comment.
 */

const VERTEX_SHADER = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const FRAGMENT_SHADER = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uCenter;
uniform float uScale;
uniform vec2  uParallax;
uniform float uDustLevel;
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
  float dust = exp(-bandD * bandD / 0.018) * (0.5 + 0.5 * noise(duv * 3.2 + uTime * 0.004)) * uDustLevel;
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

export interface BlackholeUniforms {
  [uniform: string]: THREE.IUniform;
  uRes: { value: THREE.Vector2 };
  uTime: { value: number };
  uCenter: { value: THREE.Vector2 };
  uScale: { value: number };
  uParallax: { value: THREE.Vector2 };
  uDustLevel: { value: number };
}

export function createBlackholeUniforms(mobile: boolean, dustLevel: number): BlackholeUniforms {
  return {
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uCenter: { value: new THREE.Vector2(mobile ? 0.5 : 0.78, mobile ? 0.72 : 0.55) },
    uScale: { value: 1 },
    uParallax: { value: new THREE.Vector2(0, 0) },
    uDustLevel: { value: dustLevel },
  };
}

export function createBlackholeScene(uniforms: BlackholeUniforms): THREE.Scene {
  const scene = new THREE.Scene();

  scene.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
      })
    )
  );

  return scene;
}
