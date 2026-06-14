/**
 * gradientConfig.js — Palettes + tuning for the site-wide fluid gradient.
 *
 * Palettes are ordered to match SECTIONS in src/config/sections.js. Each
 * section gets three stops (dark→mid→light or themed) that the shader mixes
 * across the noise field; the at-rest palette reproduces that section's
 * former solid background so text contrast is preserved when the section
 * goes background-transparent.
 */

// Normalize an 8-bit RGB triple to 0–1 for GLSL.
const rgb = (r, g, b) => [r / 255, g / 255, b / 255]

// stops: [stop0 (low noise), stop1 (mid), stop2 (high noise)]
export const SECTION_PALETTES = {
  hero:     { stops: [rgb(18, 42, 107), rgb(27, 58, 140), rgb(43, 82, 180)] }, // cobalt range (matches old hue-shift band)
  about:    { stops: [rgb(18, 42, 107), rgb(27, 58, 140), rgb(43, 82, 180)] }, // cobalt — About is a dark/cobalt section; its cream text+content needs a dark field
  projects: { stops: [rgb(234, 228, 217), rgb(245, 240, 232), rgb(250, 248, 244)] }, // cream (cobalt enters only via the exit flood; dark text needs a light field)
  gallery:  { stops: [rgb(0, 0, 0), rgb(10, 10, 14), rgb(20, 30, 64)] }, // black + faint cobalt
  contact:  { stops: [rgb(0, 0, 0), rgb(8, 8, 10), rgb(40, 40, 46)] }, // black + faint warm
}

// Accent colors reused by the choreography effects.
export const COBALT = rgb(27, 58, 140)
export const CREAM = rgb(245, 240, 232)

export const GRADIENT = {
  FRAME_MS: 30,        // ~30fps, matches the old halftone budget
  FLOW_SPEED: 0.04,    // base time multiplier for the warp field
  CURSOR_RADIUS: 0.28, // warp falloff radius in normalized (aspect-corrected) units
  CURSOR_BUILD: 0.15,  // mouse-strength build-up per active frame (port of halftone feel)
  CURSOR_DECAY: 0.03,  // mouse-strength decay per resting frame
  MOBILE_SCALE: 0.5,   // render-buffer downscale on mobile (upscaled by CSS)
  SEAM_FADE: 0.85,     // section progress at which palette starts crossfading to the next
}
