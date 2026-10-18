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

// Final picture — the riot "posterized ink" pass. The fluid sim is unchanged;
// only how it's drawn is. Instead of a soft gradient with glowing liquid, the
// field is two FLAT tones split on a diagonal (rule 2: tilted axis), the dye
// is thresholded into flat ink shapes with hard edges (rule 1: flat colour),
// the shapes get a crisp cream outline where the dye folds (comic-style
// keyline), and the thin band just below the ink threshold is drawn as a
// halftone dot screen (rule 6: depth from flat layers). Film grain is gone —
// halftone is the texture now. Dye density is carried in the red channel.
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
uniform float uInkT;
varying vec2 vUv;

void main() {
  vec2 vel = texture2D(uVelocity, vUv).xy;
  // Clamp so a strong swipe can't smear dye in from the edges (vel can be large).
  vec2 uv = clamp(vUv + vel * uRefraction, 0.0, 1.0);
  float density = clamp(texture2D(uDye, uv).x * uDyeIntensity, 0.0, uDyeMax);

  // Two flat tones split on a tilted line (top-left = base0, bottom-right = base1).
  float diag = uv.y - (uv.x - 0.5) * 0.36;
  vec3 color = diag > 0.42 ? uBase0 : uBase1;

  // Flat ink shapes: a hard threshold, no soft body. The threshold is higher
  // on phones, whose coarser sim pools dye more densely (GRADIENT.INK_T*).
  float INK_T = uInkT;
  float inkMask = step(INK_T, density);

  // Halftone band just under the threshold: dots on a 45-degree screen whose
  // radius grows with density, so ink "fades" in printed dots, not alpha.
  float HALF_T = INK_T - 0.18;
  float cell = 9.0;
  vec2 p = gl_FragCoord.xy;
  vec2 rp = vec2(p.x + p.y, p.x - p.y) * 0.7071;
  vec2 g = fract(rp / cell) - 0.5;
  float band = clamp((density - HALF_T) / (INK_T - HALF_T), 0.0, 1.0);
  float dotR = 0.5 * sqrt(band);
  float dots = step(length(g), dotR) * step(HALF_T, density);
  color = mix(color, uInk, max(inkMask, dots));

  // Cream keyline where the dye field folds steeply around the ink edge.
  float e = 0.0016;
  float gx = texture2D(uDye, uv + vec2(e, 0.0)).x - texture2D(uDye, uv - vec2(e, 0.0)).x;
  float gy = texture2D(uDye, uv + vec2(0.0, e)).x - texture2D(uDye, uv - vec2(0.0, e)).x;
  float fold = length(vec2(gx, gy)) * uDyeIntensity;
  float edge = step(0.05, fold) * step(INK_T * 0.6, density) * (1.0 - step(INK_T * 1.6, density));
  color = mix(color, vec3(0.96, 0.96, 0.94), edge);

  gl_FragColor = vec4(color, 1.0);
}
`
