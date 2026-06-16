// src/components/gradient/three/shaders.js
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
// refraction wobble. Dye density is carried in the red channel.
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
varying vec2 vUv;
void main() {
  vec2 vel = texture2D(uVelocity, vUv).xy;
  // Clamp so a strong swipe can't smear dye in from the edges (vel can be large).
  vec2 uv = clamp(vUv + vel * uRefraction, 0.0, 1.0);
  float density = clamp(texture2D(uDye, uv).x * uDyeIntensity, 0.0, uDyeMax);
  vec3 base = mix(uBase1, uBase0, uv.y);
  vec3 color = mix(base, uInk, density);
  gl_FragColor = vec4(color, 1.0);
}
`
