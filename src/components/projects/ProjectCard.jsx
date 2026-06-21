/**
 * ProjectCard.jsx — Single Carousel Card (Projects Section)
 *
 * One card in the infinite project carousel. Behaviour by state:
 *   • Active card    — enlarged, full colour, hover tilt follows the
 *                      cursor, title/links slide out below
 *   • Inactive cards — smaller, washed out, resting lean away from the
 *                      centre (Y-axis on desktop, rolodex X-axis on
 *                      mobile) plus a global mouse-parallax wobble
 *
 * Scroll-exit styling (blue-out, grayscale, flatten) is shared across
 * all cards via the `cardTransforms` bundle computed once in Projects.
 */
import { motion, useTransform, useSpring, useMotionValue, useMotionTemplate } from 'framer-motion'

function WrenchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <img src="/icons/default/github.svg" className="h-5 w-5 opacity-40 transition-opacity duration-300 group-hover/gh:opacity-100" alt="" aria-hidden="true" draggable="false" />
  )
}

function ExternalIcon() {
  return (
    <svg className="h-5 w-5 text-ink/50 transition-colors duration-300 group-hover/ext:text-cobalt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export default function ProjectCard({ work, isActive, isActiveIndex, widthClass, translateX, scale, zIndexClass, washOpacity, cardShadow, onClick, distForStyle, clampedRel, globalSpringX, globalSpringY, cardTransforms, isMobile }) {
  const isPrimary = distForStyle === 0;

  // Destructure shared transforms passed from parent to avoid redefining them 20 times
  const { blueOpacity, borderStyle, contentOpacity: globalContentOpacity, grayscale, brightness, flattenFactor, scrollFade } = cardTransforms;

  // For the active card, keep thumbnail fully visible. For inactive cards, fade out.
  const contentOpacity = useTransform([globalContentOpacity], ([co]) => isActive ? 1 : co);
  const thumbnailFilter = useMotionTemplate`grayscale(${grayscale}) brightness(${brightness})`;

  // Fade out secondary cards after the primary card turns blue
  const secondaryFade = useTransform(scrollFade, (v) => isPrimary ? 1 : v);

  // --- Per-hover tilt (active card only) ---
  const hoverX = useMotionValue(0);
  const hoverY = useMotionValue(0);
  const hoverXSpring = useSpring(hoverX, { stiffness: 300, damping: 30 });
  const hoverYSpring = useSpring(hoverY, { stiffness: 300, damping: 30 });
  const hoverRotateX = useTransform(hoverYSpring, [-0.5, 0.5], [12, -12]);
  const hoverRotateY = useTransform(hoverXSpring, [-0.5, 0.5], [-12, 12]);

  // --- Default resting tilt for inactive cards ---
  // Desktop (horizontal): left cards lean left, right cards lean right.
  // Mobile (vertical): cards above/below tilt AWAY from the viewer around
  // the X axis — rolodex style — so the stack recedes top and bottom.
  const defaultRotateY = distForStyle === 0 ? 0
    : Math.sign(clampedRel) * (Math.abs(clampedRel) >= 2 ? 30 : 15);
  const mobileRotateX = distForStyle === 0 ? 0
    : -Math.sign(clampedRel) * (Math.abs(clampedRel) >= 2 ? 55 : 40);
  const parallaxMag = distForStyle <= 1 ? 10 : 18;

  // Mouse parallax is layered on top of the resting tilt
  const globalRotateX = useTransform(globalSpringY, [-1, 1], [parallaxMag, -parallaxMag]);
  const globalRotateY = useTransform(
    globalSpringX, [-1, 1],
    [-parallaxMag + defaultRotateY, parallaxMag + defaultRotateY]
  );

  // Active card uses hover tilt, others use global parallax + resting lean
  const rotateX = useTransform(() => {
    const r = distForStyle === 0 ? hoverRotateX.get() : globalRotateX.get();
    return r * flattenFactor.get();
  });
  const rotateY = useTransform(() => {
    const r = distForStyle === 0 ? hoverRotateY.get() : globalRotateY.get();
    return r * flattenFactor.get();
  });

  const handleMouseMove = (e) => {
    if (distForStyle !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    hoverX.set((e.clientX - rect.left) / rect.width - 0.5);
    hoverY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    hoverX.set(0);
    hoverY.set(0);
  };

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col ${widthClass} shrink-0 px-2 py-2 md:py-0 snap-center ${zIndexClass}`}
      style={{ cursor: isActive ? 'auto' : 'pointer' }}
    >
      <motion.div
        style={{
          transformOrigin: 'center center',
          zIndex: isPrimary ? 50 : 10,
          opacity: secondaryFade
        }}
      >
        <motion.article
          id={isActiveIndex ? "primary-project-card" : undefined}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`group relative w-full aspect-video rounded-2xl select-none overflow-hidden flex items-center justify-center z-10 transition-colors duration-500 ${work.isGithubCard ? 'bg-white/70 hover:bg-ink' : 'bg-white/70'}`}
          animate={{
            x: `${translateX}%`,
            scale: scale,
            // Mobile has no mouse parallax — tilt is a plain animated
            // target so it eases when the active card changes.
            ...(isMobile ? { rotateX: mobileRotateX } : {}),
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{
            ...(isMobile ? {} : { rotateX, rotateY }),
            border: borderStyle,
            boxShadow: cardShadow,
            // NOTE: no transformStyle:'preserve-3d' here — a non-flat 3D
            // context disables backdrop-filter (the glass blur would drop
            // out whenever the tilt updated, i.e. on any mouse move).
            transformPerspective: 1000,
            transformOrigin: isMobile ? 'center center' : 'center bottom',
          }}
        >
          {/* Black Overlay */}
          <motion.div
            className="absolute inset-0 bg-black pointer-events-none"
            style={{ opacity: blueOpacity, zIndex: 0 }}
          />

          {/* Thumbnail Image or Wrench Icon */}
          <motion.div
            className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none"
            style={{ opacity: contentOpacity, filter: thumbnailFilter }}
          >
            {work.isGithubCard ? (
              <div className="relative w-full h-full pointer-events-none">
                <img
                  src="/thumbnail/github.svg"
                  alt="GitHub"
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 group-hover:opacity-0"
                />
                <img
                  src="/thumbnail/github2.svg"
                  alt="GitHub Hover"
                  className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
              </div>
            ) : work.thumbnail ? (
              <img
                src={work.thumbnail}
                alt={work.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <WrenchIcon className="w-16 h-16 md:w-24 md:h-24 text-ink/20 group-hover:text-cobalt/40 transition-colors duration-500" />
            )}
          </motion.div>

          {/* Wash Overlay (simulates opacity without translucency) */}
          <motion.div
            className="absolute inset-0 bg-cream pointer-events-none"
            animate={{ opacity: washOpacity }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            style={{ zIndex: 5 }}
          />

          {/* Inner Shadow - kept from the previous article class */}
          <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(255,255,255,0.5)] pointer-events-none z-10" />

        </motion.article>
      </motion.div>

      {/* Text reveals by sliding down from under the card */}
      <motion.div className="relative z-20 overflow-hidden" style={{ marginTop: '0.8rem', opacity: globalContentOpacity }}>
        <motion.div
          className="pt-8 px-1 flex justify-between items-start"
          initial={{ y: '-100%', opacity: 0 }}
          animate={{
            y: isActive ? 0 : '-100%',
            opacity: isActive ? 1 : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 280,
            damping: 28,
            delay: isActive ? 0.45 : 0,
          }}
          style={{ pointerEvents: isActive ? 'auto' : 'none' }}
        >
          <div className="flex-1 pr-4">
            <h3 className="font-sans font-semibold text-title text-ink mb-1 tracking-tight">
              {work.title}
            </h3>
            <p className="font-mono text-ink/50 text-[11px] md:text-xs line-clamp-2">
              {work.subtitle}
            </p>
          </div>

          <div className="flex gap-3 shrink-0 mt-0.5">
            {work.github && !work.isGithubCard && (
              <a href={work.github} target="_blank" rel="noopener noreferrer" className="group/gh" aria-label={`${work.title} on GitHub`}>
                <GitHubIcon />
              </a>
            )}
            {work.live && (
              <a href={work.live} target="_blank" rel="noopener noreferrer" className="group/ext" aria-label={`${work.title} live demo`}>
                <ExternalIcon />
              </a>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
