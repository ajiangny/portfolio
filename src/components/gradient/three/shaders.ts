// src/components/gradient/three/shaders.ts
// GLSL ES 1.00 for RawShaderMaterial (no version directive; WebGL2 compiles it).
// RawShaderMaterial injects nothing, so each stage declares its own precision
// and the vertex stage declares the `position` attribute supplied by the plane.

export const VERT = /* glsl */ `
precision highp float;
attribute vec3 position;
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

// Additive Gaussian splat of uColor into uTarget at uPoint (aspect-corrected).
export const SPLAT = /* glsl */ `
precision highp float;
uniform sampler2D uTarget;
uniform vec3 uColor;
uniform vec2 uPoint;
uniform float uRadius;
uniform float uAspectRatio;
varying vec2 vUv;
void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspectRatio;
  vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}
`

// Semi-Lagrangian advection of uSource along uVelocity, with dissipation.
export const ADVECT = /* glsl */ `
precision highp float;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uDissipation;
varying vec2 vUv;
void main() {
  vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexelSize;
  gl_FragColor = uDissipation * texture2D(uSource, coord);
}
`

export const DIVERGENCE = /* glsl */ `
precision highp float;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
varying vec2 vUv;
void main() {
  float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
  float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
  float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
  float div = 0.5 * (R - L + T - B);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
`

export const JACOBI = /* glsl */ `
precision highp float;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexelSize;
varying vec2 vUv;
void main() {
  float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  float div = texture2D(uDivergence, vUv).x;
  float pressure = (L + R + B + T - div) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`

export const GRADIENT_SUBTRACT = /* glsl */ `
precision highp float;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
varying vec2 vUv;
void main() {
  float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  vec2 vel = texture2D(uVelocity, vUv).xy;
  vel -= 0.5 * vec2(R - L, T - B);
  gl_FragColor = vec4(vel, 0.0, 1.0);
}
`

// Final picture: a vertical base gradient (base0 top -> base1 bottom) mixed
// toward the ink accent by the (clamped) dye density. Velocity adds a subtle
// refraction wobble. Dye density is carried in the red channel. A monochrome
// film-grain is added last, on top of everything.
export const COMPOSITE = /* glsl */ `
precision highp float;
uniform sampler2D uDye;
uniform sampler2D uVelocity;
uniform vec3 uBase0;
uniform vec3 uBase1;
uniform vec3 uInk;
uniform float uDyeIntensity;
uniform float uDyeMax;
uniform float uRefraction;
uniform float uTime;
uniform float uGrain;
varying vec2 vUv;

// Cheap, well-distributed per-pixel hash (no sin-banding on weak GPUs).
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

void main() {
  vec2 vel = texture2D(uVelocity, vUv).xy;
  // Clamp so a strong swipe can't smear dye in from the edges (vel can be large).
  vec2 uv = clamp(vUv + vel * uRefraction, 0.0, 1.0);
  float density = clamp(texture2D(uDye, uv).x * uDyeIntensity, 0.0, uDyeMax);
  vec3 base = mix(uBase1, uBase0, uv.y);

  // Coloured body: blend the base toward the section's ink across density.
  // The pow(<1) lifts faint ambient so it reads as soft swells of coloured
  // liquid (cyan pools on Hero) rather than vanishing. Capped below 1 so pools
  // stay a saturated mid-cyan — the thin veins below carry the bright highlight,
  // keeping the look deep-water rather than washed-out pale.
  float body = pow(density, 0.85) * 0.82;
  vec3 color = mix(base, uInk, body);

  // The bright highlight colour is the section's OWN ink brightened toward
  // white — so each section keeps its hue (light sections don't flash pure
  // white) while the cyan Hero ink glows near-white at its crests.
  vec3 crestColor = min(uInk * 1.5 + 0.06, vec3(1.0));

  // Caustic veins: light refracting through water shows up as thin bright
  // ridges where the dye field *folds* (its gradient is steep), not as filled
  // blobs. Sample the dye gradient with a small fixed uv offset (a screen-space
  // edge; exactness doesn't matter) and light the folds.
  float e = 0.0016;
  float gx = texture2D(uDye, uv + vec2(e, 0.0)).x - texture2D(uDye, uv - vec2(e, 0.0)).x;
  float gy = texture2D(uDye, uv + vec2(0.0, e)).x - texture2D(uDye, uv - vec2(0.0, e)).x;
  float fold = length(vec2(gx, gy)) * uDyeIntensity;
  float veins = smoothstep(0.012, 0.10, fold);
  color = mix(color, crestColor, veins * 0.6);

  // Strong cursor cores still bloom to a bright crest on top of the veins.
  float crest = smoothstep(0.7, 1.0, density);
  color = mix(color, crestColor, crest * 0.8);

  // Film grain: monochrome luminance noise re-seeded each frame so it shimmers
  // like real grain. gl_FragCoord keeps it ~1px at the framebuffer's native res.
  if (uGrain > 0.0) {
    float g = hash21(gl_FragCoord.xy + fract(uTime) * 137.0) - 0.5;
    color += g * uGrain;
  }

  gl_FragColor = vec4(color, 1.0);
}
`
