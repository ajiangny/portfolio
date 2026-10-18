/**
 * SlashHeading.tsx — section title on the tilted axis
 *
 * The site's display headings in one recipe: the whole line leans on TILT,
 * sits on a jagged ink slab with a hard offset shadow (depth from flat layers,
 * no blur), and the first letter of every word is "ransomed" — boxed, inverted
 * and knocked off-angle — so the line keeps the ransom-note voice while
 * staying readable at display sizes. Slams in with an overshoot when it
 * scrolls into view.
 */
import { Fragment, useRef, type CSSProperties } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { ENTER_EASE, RIOT, TILT, jagged, jaggedPx, rng } from '../../style/riot'

export default function SlashHeading({
  text, seed = 1, as: Tag = 'h2', shadow = RIOT.cobalt, style,
}: {
  text: string
  seed?: number
  as?: 'h1' | 'h2' | 'h3'
  shadow?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduce = useReducedMotion()
  const r = rng(seed)
  const words = text.split(' ')

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { x: -120, skewX: -18, opacity: 0 }}
      animate={inView ? { x: 0, skewX: 0, opacity: 1 } : undefined}
      transition={{ duration: 0.5, ease: ENTER_EASE }}
      style={{ display: 'inline-block', rotate: `${TILT}deg`, position: 'relative', ...style }}
    >
      {/* Shadow slab, then face slab — two flat layers, offset */}
      <span aria-hidden style={{ position: 'absolute', inset: '-0.08em -0.35em', translate: '0.14em 0.14em', background: shadow, clipPath: jaggedPx(seed * 3 + 1, 14) }} />
      <span aria-hidden style={{ position: 'absolute', inset: '-0.08em -0.35em', background: RIOT.ink, clipPath: jaggedPx(seed * 3 + 2, 14) }} />
      <Tag
        className="font-display"
        style={{ position: 'relative', color: RIOT.face, lineHeight: 0.95, letterSpacing: '0.01em', textTransform: 'uppercase', margin: 0 }}
        aria-label={text}
      >
        {words.map((w, wi) => {
          const rot = (r() - 0.5) * 18
          const cobaltBox = r() < 0.5
          return (
            <Fragment key={wi}>
            <span aria-hidden style={{ whiteSpace: 'nowrap' }}>
              <span
                style={{
                  display: 'inline-block',
                  rotate: `${rot}deg`,
                  scale: '1.18',
                  margin: '0 0.06em 0 0.02em',
                  padding: '0 0.08em',
                  background: cobaltBox ? RIOT.cobalt : RIOT.face,
                  color: cobaltBox ? RIOT.face : RIOT.ink,
                  clipPath: jagged(seed * 17 + wi, 9),
                }}
              >
                {w[0]}
              </span>
              {w.slice(1)}
            </span>
            {wi < words.length - 1 ? ' ' : ''}
            </Fragment>
          )
        })}
      </Tag>
    </motion.div>
  )
}
