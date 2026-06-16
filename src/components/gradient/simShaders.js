/**
 * simShaders.js — GLSL for the velocity + dye fluid sim (WebGL1 / GLSL ES 1.00).
 *
 * Stable-fluids velocity field with vorticity confinement, plus an advected
 * dye/ink field that is what you actually see. Written from scratch; the math
 * follows the standard GPU fluid approach (Stam + Dobryakov's WebGL-Fluid).
 * Velocity lives in .xy, dye in .rgb, pressure/divergence/curl in .x — all in
 * RGBA float/half-float textures.
 */
export const SIM_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`

export const ADVECT_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uDt;
uniform float uDissipation;
void main() {
  vec2 vel = texture2D(uVelocity, vUv).xy;
  vec2 coord = vUv - uDt * vel * uTexel;
  gl_FragColor = uDissipation * texture2D(uSource, coord);
}
`

// Additive gaussian splat — injects uValue (force.xy / dye.rgb) at uPoint.
export const SPLAT_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTarget;
uniform vec2 uPoint;
uniform vec3 uValue;
uniform float uRadius;
uniform float uAspect;
void main() {
  vec2 d = vUv - uPoint; d.x *= uAspect;
  float g = exp(-dot(d, d) / uRadius);
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + g * uValue, 1.0);
}
`

export const CURL_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
  float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
  float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
  float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
  gl_FragColor = vec4(0.5 * ((R - L) - (T - B)), 0.0, 0.0, 1.0);
}
`

export const VORTICITY_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2 uTexel;
uniform float uCurlStrength;
uniform float uDt;
void main() {
  float L = texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x;
  float T = texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= uCurlStrength * C;
  force.y *= -1.0;
  vec2 vel = texture2D(uVelocity, vUv).xy;
  gl_FragColor = vec4(vel + force * uDt, 0.0, 1.0);
}
`

export const DIVERGENCE_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
  float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
  gl_FragColor = vec4(0.5 * ((R - L) + (T - B)), 0.0, 0.0, 1.0);
}
`

export const JACOBI_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexel;
void main() {
  float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float div = texture2D(uDivergence, vUv).x;
  gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
}
`

export const GRADIENT_SUBTRACT_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  vec2 vel = texture2D(uVelocity, vUv).xy;
  vel -= 0.5 * vec2(R - L, T - B);
  gl_FragColor = vec4(vel, 0.0, 1.0);
}
`
