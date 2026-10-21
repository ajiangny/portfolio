/**
 * Cutout — one of Andrew's painted figures, baked in the riot treatment.
 *
 * The keyline, shadow and halftone are baked into the webp (see
 * scripts/bake-cutout.py), so this is just an <img> that never filters at
 * runtime: big figures stay cheap to animate. Sized by height; the width
 * follows the figure. Decorative by default, since the menu already names
 * every destination.
 */
import type { CSSProperties } from 'react'
import { CUTOUTS, cutoutSrc, type CutoutName, type CutoutTreatment } from '../../data/cutoutsData'

type CutoutProps = {
  name: CutoutName
  treatment?: CutoutTreatment
  decorative?: boolean
  style?: CSSProperties
}

export default function Cutout({ name, treatment, decorative = true, style }: CutoutProps) {
  return (
    <img
      src={cutoutSrc(name, treatment)}
      alt={decorative ? '' : CUTOUTS[name].alt}
      aria-hidden={decorative || undefined}
      draggable={false}
      decoding="async"
      style={{ display: 'block', height: '100%', width: 'auto', userSelect: 'none', ...style }}
    />
  )
}
