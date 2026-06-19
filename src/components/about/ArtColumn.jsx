/**
 * ArtColumn.jsx — Filmstrip Art Column
 *
 * Renders a vertical column of artwork images for the About section's
 * filmstrip grid. Each image is displayed with a duotone filter and a
 * glossy-glass sheen overlay.
 *
 * The last card in the center column (`clearLast = true`) is the profile
 * photo — it gets a special full-colour crossfade animation and its ref
 * is passed up so About.jsx can read its position for the expanding
 * portrait transition.
 */
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { GLASS_BG, CARD_GLASS } from '../../data/aboutData';

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

// Filmstrip cards are slightly translucent so the fluid gradient bleeds
// through — reads like real glass panels. The focal profile card stays
// opaque (it owns profileHideOpacity instead).
const CARD_OPACITY = 0.55

export default function ArtColumn({
  images,
  clearLast = false,
  scale,
  profileColorOpacity,
  profileGlassOpacity,
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
        const isProfile = clearLast && i === pIndex
        const glassOpacity = isProfile && profileGlassOpacity ? profileGlassOpacity : 1
        // Desktop cards become liquid glass (backdrop-filter frost) — incl. the
        // profile card, so it matches its neighbours while grayscale (it then
        // solidifies as the colour crossfade fades in on top). Skipped on
        // mobile `lite` — too heavy on the scrolling filmstrip.
        const liquid = !lite
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
              // Profile stays opaque (then hides via profileHideOpacity); the
              // other cards get their translucency from the art img below so the
              // frosted backdrop + rim stay full strength.
              opacity: isProfile && profileHideOpacity ? profileHideOpacity : 1,
              // Desktop non-profile cards → liquid glass: frost the gradient
              // behind, bright rim + lift shadow.
              ...(liquid ? CARD_GLASS : {}),
            }}
          >
            <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: '12px' }}>
              {/* Neutral grayscale art. `lite` (mobile) uses a plain CSS
                  grayscale filter instead of the SVG duotone map — the SVG
                  filter re-rasterises every frame while the columns scroll
                  and was the main source of mobile jank. Both paths are now
                  neutral (no colour cast). */}
              <img
                src={src}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  filter: lite ? 'grayscale(1) brightness(1.1)' : 'url(#duotone-art)',
                  // Translucency lives here (not the wrapper) so the frosted
                  // backdrop shows through. The profile's grayscale base is
                  // translucent too (matching neighbours); the colour crossfade
                  // img above it reveals to full opacity, solidifying the card.
                  opacity: CARD_OPACITY,
                }}
              />

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

              {/* Glossy-glass sheen overlay */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ opacity: glassOpacity, ...GLASS_BG, zIndex: 2 }}
              />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
