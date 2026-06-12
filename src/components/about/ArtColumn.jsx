/**
 * ArtColumn.jsx — Filmstrip Art Column
 *
 * Renders a vertical column of artwork images for the About section's
 * filmstrip grid. Each image is displayed with a duotone filter and a
 * halftone dot overlay.
 *
 * The last card in the center column (`clearLast = true`) is the profile
 * photo — it gets a special full-colour crossfade animation and its ref
 * is passed up so About.jsx can read its position for the expanding
 * portrait transition.
 */
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { DOT_BG } from '../../data/aboutData';

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

export default function ArtColumn({
  images,
  clearLast = false,
  scale,
  profileColorOpacity,
  profileDotsOpacity,
  profileCardRef,
  profileHideOpacity,
  profileIndex,
  exitProgress,
  lite = false,
}) {
  // Split exit (centre column): when the overlay freezes the profile,
  // cards above it fly UP and cards below fly DOWN — mirroring how the
  // side columns part left and right.
  const exitFallback = useMotionValue(0)
  const exitMV = exitProgress ?? exitFallback
  const exitUp = useTransform(exitMV, (v) => -easeInOut(v) * window.innerHeight * 1.2)
  const exitDown = useTransform(exitMV, (v) => easeInOut(v) * window.innerHeight * 1.2)

  const pIndex = profileIndex ?? images.length - 1

  return (
    <div className="flex flex-col gap-4 w-full">
      {images.map((src, i) => {
        const isProfile  = clearLast && i === pIndex
        const dotsOpacity = isProfile && profileDotsOpacity ? profileDotsOpacity : 1
        const exitY = clearLast && exitProgress && !isProfile
          ? (i < pIndex ? exitUp : exitDown)
          : undefined

        return (
          <motion.div
            key={i}
            ref={isProfile ? profileCardRef : undefined}
            className="relative shrink-0"
            style={{
              aspectRatio: '2 / 3',
              width: '100%',
              scale,
              y: exitY,
              transformOrigin: 'center center',
              borderRadius: '12px',
              // Profile card hides when the expanding overlay takes over
              ...(isProfile && profileHideOpacity ? { opacity: profileHideOpacity } : {}),
            }}
          >
            <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: '12px' }}>
              {/* Duotone image. `lite` (mobile) approximates the SVG duotone
                  with grayscale + a cobalt colour-blend overlay — the SVG
                  filter re-rasterises every frame while the columns scroll
                  and was the main source of mobile jank. */}
              <img
                src={src}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: lite ? 'grayscale(1) brightness(1.1)' : 'url(#duotone-art)' }}
              />
              {lite && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ backgroundColor: 'var(--color-cobalt)', mixBlendMode: 'color', zIndex: 1 }}
                />
              )}

              {/* Profile: full-colour cross-fade on reveal */}
              {isProfile && (
                <motion.img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: profileColorOpacity }}
                />
              )}

              {/* Halftone overlay */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ opacity: dotsOpacity, ...DOT_BG, zIndex: 2 }}
              />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
