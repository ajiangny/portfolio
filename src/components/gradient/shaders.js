/**
 * shaders.js — GLSL for the fluid mesh gradient (WebGL1 / GLSL ES 1.00).
 *
 * Domain-warped fBm noise drives a 3-stop palette mix. uPalMix crossfades
 * between the current (A) and next (B) section palettes. uMouse warps the
 * field locally; uSeam / uFlood / uPulse layer the section transitions.
 */
export const VERT_SRC = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

export const FRAG_SRC = `
precision highp float;

uniform vec2  uResolution;
uniform float uTime;
uniform vec2  uMouse;          // pixels (origin top-left, y already flipped to GL)
uniform float uMouseStrength;  // 0..1
uniform vec3  uPalA0, uPalA1, uPalA2;
uniform vec3  uPalB0, uPalB1, uPalB2;
uniform float uPalMix;         // 0..1 A->B
uniform float uSeam;           // 0..1 sweep (0 or 1 = inactive)
uniform float uFlood;          // 0..~1.5 radial bloom
uniform float uPulse;          // 0..1 ring
uniform float uCursorR;        // cursor warp radius (normalized)

uniform sampler2D uVelocity;   // sim velocity field (.xy)
uniform float uSimEnabled;     // 1 = sim drives the field, 0 = fallback warp
uniform float uDispScale;      // velocity → warp displacement
uniform float uWakeBoost;      // wake highlight from |velocity|

uniform vec3  uCobalt;
uniform vec3  uCream;

// --- value noise + fbm ---------------------------------------------------
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    v += amp * noise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}

vec3 palette(vec3 s0, vec3 s1, vec3 s2, float n) {
  return mix(mix(s0, s1, smoothstep(0.0, 0.5, n)), s2, smoothstep(0.5, 1.0, n));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);

  float t = uTime;

  // domain warp
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + q + vec2(1.7, 9.2) + 0.15 * t),
                fbm(p + q + vec2(8.3, 2.8) - 0.12 * t));

  // liquid displacement from the sim (desktop/touch), else legacy cursor warp.
  // clamp so an over-energetic field can never fully scramble the gradient.
  vec2 vel = texture2D(uVelocity, uv).xy;
  r += uSimEnabled * clamp(vel * uDispScale, -0.35, 0.35);

  // fallback Gaussian cursor warp only when the sim is off
  vec2 m = uMouse / uResolution.xy;
  m.x *= aspect;
  float md = distance(p, m);
  float infl = uMouseStrength * exp(-(md * md) / (2.0 * uCursorR * uCursorR));
  r += (1.0 - uSimEnabled) * infl * 0.6;

  float f = fbm(p + r);
  float n = clamp(f * 0.6 + 0.4 * r.x + 0.3, 0.0, 1.0);

  vec3 colA = palette(uPalA0, uPalA1, uPalA2, n);
  vec3 colB = palette(uPalB0, uPalB1, uPalB2, n);
  vec3 col = mix(colA, colB, uPalMix);

  // wake highlight — advected velocity magnitude leaves a luminous trail
  float speed = length(vel) * uSimEnabled;
  col = mix(col, uCream, clamp(speed * uWakeBoost, 0.0, 0.5));

  // seam — bright band sweeping top->bottom while 0<uSeam<1
  float seamActive = step(0.001, uSeam) * step(uSeam, 0.999);
  float band = smoothstep(0.07, 0.0, abs(uv.y - (1.0 - uSeam)));
  col = mix(col, uCream, band * seamActive * 0.85);

  // flood — radial cobalt bloom from center
  float dc = distance(uv, vec2(0.5));
  float floodR = uFlood * 1.25;
  float flood = smoothstep(floodR, floodR - 0.15, dc) * clamp(uFlood, 0.0, 1.0);
  col = mix(col, uCobalt, flood);

  // pulse — expanding ring on scroll-in (gated off when uPulse==0, else the
  // (1.0 - uPulse) term would leave a full-strength ring at screen centre)
  float pulseActive = step(0.001, uPulse) * step(uPulse, 0.999);
  float pr = uPulse * 1.3;
  float ring = smoothstep(0.08, 0.0, abs(dc - pr)) * (1.0 - uPulse) * pulseActive;
  col += uCream * ring * 0.4;

  gl_FragColor = vec4(col, 1.0);
}
`
