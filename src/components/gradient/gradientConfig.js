/**
 * gradientConfig.js — Palettes + tuning for the Three.js ink-fluid background.
 *
 * Each section provides a 2-stop `base` (the resting field gradient, top→bottom)
 * kept at a luminance that preserves that section's text contrast, and an `ink`
 * accent that the cursor + ambient drift inject as the visible liquid. The
 * active section is chosen by viewport centre and crossfades toward the next
 * (see paletteSelect.js); the composite mixes base→ink by dye density.
 */
import { rgb } from './colors.js'

export const SECTION_PALETTES = {
  hero:     { base: [rgb(43, 82, 180), rgb(18, 42, 107)], ink: rgb(190, 224, 255) },
  about:    { base: [rgb(43, 82, 180), rgb(18, 42, 107)], ink: rgb(190, 224, 255) },
  projects: { base: [rgb(250, 248, 244), rgb(234, 228, 217)], ink: rgb(43, 82, 180) },
  gallery:  { base: [rgb(20, 30, 64), rgb(0, 0, 0)], ink: rgb(90, 130, 235) },
  contact:  { base: [rgb(40, 40, 46), rgb(0, 0, 0)], ink: rgb(240, 228, 205) },
}

// Stable-fluids sim tuning.
export const SIM = {
  RES: 256,
  RES_MOBILE: 128,
  JACOBI: 18,
  JACOBI_MOBILE: 12,
  DT: 0.6,                 // advection step — lower = slower, calmer overall flow
  VEL_DISSIPATION: 0.985,
  DYE_DISSIPATION: 0.975,
  SPLAT_RADIUS: 0.00045,
  AMBIENT_RADIUS: 0.005,   // soft + broad so the drift points blend, not 3 blobs
  CURSOR_FORCE: 3400,
  AMBIENT_FORCE: 260,      // gentle stir, not energetic churn
  FORCE_CLAMP: 0.02,
  CURSOR_DENSITY: 0.24,
  AMBIENT_DENSITY: 0.012,  // barely tints — ambient should stir, not emit visible ink
  DYE_INTENSITY: 0.85,
  DYE_MAX: 0.7,            // ink never fully covers the base (readability)
  REFRACTION: 0.04,
}

export const GRADIENT = {
  SEAM_FADE: 0.85,
  MOBILE_SCALE: 0.5,
  FRAME_MS_MOBILE: 33,
}
