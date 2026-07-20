// src/components/gradient/colors.ts
// Pure color helpers shared by the gradient config and palette selection.

/** An RGB triple normalized to 0..1 for GLSL/Three. */
export type Vec3 = [number, number, number]

/** Normalize an 8-bit RGB triple to 0..1 for GLSL/Three. */
export const rgb = (r: number, g: number, b: number): Vec3 => [r / 255, g / 255, b / 255]

/** Linear-interpolate two [r,g,b] triples by t (0..1). */
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]
