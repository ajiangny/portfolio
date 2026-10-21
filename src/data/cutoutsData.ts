/**
 * cutoutsData.ts — figure cutouts from Andrew's own paintings
 *
 * Each figure is baked by scripts/bake-cutout.py into one webp per treatment
 * (public/art/cutouts/<name>-<treatment>.webp): cut out, cream keyline, hard
 * ink shadow, transparent around. Cutout.tsx picks the file.
 *
 *   • CUTOUT_TREATMENT — the look used site-wide: 'halftone' (ink/cream dot
 *     screen, matches the About portrait) or 'colour' (the painting as is)
 *   • MENU_FIGURES — which figure stands in the StyleMenu while each item is
 *     highlighted; moving to an item with a different figure swaps the pose
 *   • size — height relative to a standing figure (default 1); the wide
 *     sketches stand smaller so they don't run under the menu list
 *   • right — desktop offset from the right edge in vw (default -5, a slight
 *     crop); wide pieces sit fully on screen so the sword / car aren't cut
 */

export type CutoutTreatment = 'halftone' | 'colour'

export const CUTOUT_TREATMENT: CutoutTreatment = 'halftone'

type CutoutEntry = { src: string; alt: string; size?: number; right?: number }

export const CUTOUTS = {
  cape: { src: '/art/cutouts/cape', alt: 'Painted figure in a cap and caped coat, leaning on a cane' },
  kimono: { src: '/art/cutouts/kimono', alt: 'Painted figure in a dark kimono holding a white flower' },
  samurai: { src: '/art/cutouts/samurai', alt: 'Painted robot samurai in a wide hat and cape, holding a long blade', right: 1.5 },
  hoops: { src: '/art/cutouts/hoops', alt: 'Painted girl in a number 23 jersey sitting on a basketball' },
  roadtrip: { src: '/art/cutouts/roadtrip', alt: 'Pen sketch of dogs speeding in a convertible, luggage flying out', size: 0.56, right: 1 },
  rabbit: { src: '/art/cutouts/rabbit', alt: 'Pencil sketch of a rabbit racing a shopping cart', size: 0.58, right: 1 },
} as const satisfies Record<string, CutoutEntry>

export type CutoutName = keyof typeof CUTOUTS

// Keyed by StyleMenu item id (the section ids, then 'settings').
export const MENU_FIGURES: Record<string, CutoutName> = {
  hero: 'cape',
  about: 'kimono',
  projects: 'samurai',
  gallery: 'hoops',
  contact: 'roadtrip',
  settings: 'rabbit',
}

export function cutoutSrc(name: CutoutName, treatment: CutoutTreatment = CUTOUT_TREATMENT) {
  return `${CUTOUTS[name].src}-${treatment}.webp`
}

export function cutoutFit(name: CutoutName): { size: number; right: number } {
  const e: CutoutEntry = CUTOUTS[name]
  return { size: e.size ?? 1, right: e.right ?? -5 }
}
