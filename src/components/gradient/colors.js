// src/components/gradient/colors.js
// Pure color helpers shared by the gradient config and palette selection.

/** Normalize an 8-bit RGB triple to 0..1 for GLSL/Three. */
export const rgb = (r, g, b) => [r / 255, g / 255, b / 255]

/** Linear-interpolate two [r,g,b] triples by t (0..1). */
export const lerp3 = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]
