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
 */

export type CutoutTreatment = 'halftone' | 'colour'

export const CUTOUT_TREATMENT: CutoutTreatment = 'halftone'

export const CUTOUTS = {
  cape: { src: '/art/cutouts/cape', alt: 'Painted figure in a cap and caped coat, leaning on a cane' },
  kimono: { src: '/art/cutouts/kimono', alt: 'Painted figure in a dark kimono holding a white flower' },
} as const

export type CutoutName = keyof typeof CUTOUTS

// Keyed by StyleMenu item id (the section ids, then 'settings').
export const MENU_FIGURES: Record<string, CutoutName> = {
  hero: 'cape',
  about: 'kimono',
  projects: 'cape',
  gallery: 'kimono',
  contact: 'cape',
  settings: 'kimono',
}

export function cutoutSrc(name: CutoutName, treatment: CutoutTreatment = CUTOUT_TREATMENT) {
  return `${CUTOUTS[name].src}-${treatment}.webp`
}
