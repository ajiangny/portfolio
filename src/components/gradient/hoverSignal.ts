// hoverSignal.ts — tiny shared channel for the Hero nav-blob hover preview.
//
// Hero writes the hovered destination's SECTIONS index (1=About … 4=Contact,
// or -1 when nothing is hovered); FluidGradient reads it each frame and, while
// Hero holds the viewport centre, crossfades the background toward that
// section's palette. A module singleton avoids re-introducing React context
// for a single value the canvas reads imperatively per frame.
export const hoverSignal = { section: -1 }

export function setHoverSection(i: number) {
  hoverSignal.section = i
}
