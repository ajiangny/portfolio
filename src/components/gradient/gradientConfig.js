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

// Stable-fluids sim tuning. Starting points — tune live in Task 12.
export const SIM = {
  RES: 256,
  RES_MOBILE: 128,
  JACOBI: 18,
  JACOBI_MOBILE: 12,
  DT: 1.0,
  VEL_DISSIPATION: 0.985,
  DYE_DISSIPATION: 0.975,
  SPLAT_RADIUS: 0.00045,
  AMBIENT_RADIUS: 0.0022,
  CURSOR_FORCE: 4200,
  AMBIENT_FORCE: 700,
  FORCE_CLAMP: 0.02,
  CURSOR_DENSITY: 0.32,
  AMBIENT_DENSITY: 0.05,
  DYE_INTENSITY: 1.0,
  DYE_MAX: 0.9,
  REFRACTION: 0.06,
}

export const GRADIENT = {
  SEAM_FADE: 0.85,
  MOBILE_SCALE: 0.5,
  FRAME_MS_MOBILE: 33,
}
