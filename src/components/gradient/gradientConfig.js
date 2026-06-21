/**
 * gradientConfig.js — Palettes + tuning for the Three.js ink-fluid background.
 *
 * Each section provides a 2-stop `base` (the resting field gradient, top→bottom)
 * kept at a luminance that preserves that section's text contrast, and an `ink`
 * accent that the cursor + ambient drift inject as the visible liquid. The
 * active section is chosen by viewport centre and crossfades toward the next
 * (see paletteSelect.js); the composite mixes base→ink by dye density.
 *
 * `energy` (0..1) scales the ambient stir for that section (see Simulation):
 * Hero churns hard so the dye folds into a deep-water look with caustic veins;
 * the other sections stay calm so their content reads cleanly. It crossfades
 * across seams just like the colours.
 */
import { rgb } from './colors.js'

export const SECTION_PALETTES = {
  hero: { base: [rgb(22, 104, 222), rgb(14, 42, 140)], ink: rgb(64, 172, 250), energy: 1.0 },
  about: { base: [rgb(70, 112, 178), rgb(70, 83, 89)], ink: rgb(188, 203, 220), energy: 0.28 },
  projects: { base: [rgb(250, 248, 244), rgb(234, 228, 217)], ink: rgb(43, 82, 180), energy: 0.16 },
  gallery: { base: [rgb(20, 30, 64), rgb(0, 0, 0)], ink: rgb(90, 130, 235), energy: 0.34 },
  contact: { base: [rgb(40, 40, 46), rgb(0, 0, 0)], ink: rgb(240, 228, 205), energy: 0.34 },
}

// Stable-fluids sim tuning.
export const SIM = {
  RES: 256,
  RES_MOBILE: 128,
  JACOBI: 18,
  JACOBI_MOBILE: 12,
  DT: 0.2,                 // advection step — lower = slower, calmer overall flow
  VEL_DISSIPATION: 0.985,
  DYE_DISSIPATION: 0.987,  // dye lingers so the stirred trails fold into veins
  SPLAT_RADIUS: 0.0000175,
  AMBIENT_RADIUS: 0.0105,  // soft + broad so the many drift points blend, not blobs
  CURSOR_FORCE: 3400,
  AMBIENT_FORCE: 90,     // Hero-level stir (×section energy) — folds dye into filaments
  FORCE_CLAMP: 0.02,
  CURSOR_DENSITY: 1,
  AMBIENT_DENSITY: 0.05,  // low per-point — many points overlap into a liquid wash
  DYE_INTENSITY: 0.85,
  DYE_MAX: 1,            // ink never fully covers the base (readability)
  REFRACTION: 0.04,
}

export const GRADIENT = {
  SEAM_FADE: 0.85,
  MOBILE_SCALE: 0.5,
  FRAME_MS_MOBILE: 10,
  GRAIN: 0.06,   // film-grain intensity added in the composite (0 = off)
}
