/**
 * Projects.jsx — Projects Section
 *
 * A 400vh scroll-driven section with an infinite project carousel:
 *
 * Entry (progress 0→0.20):
 *   Section label, carousel, and progress pill stagger in from below
 *   while the About→Projects seam band sweeps the site-wide gradient.
 *
 * Browse (0.20→0.55):
 *   Carousel is interactive — horizontal click-to-navigate on desktop,
 *   vertical swipe with scroll-snap on mobile (see useInfiniteCarousel).
 *
 * Exit (0.55→0.92):
 *   The active card turns black, secondary cards fade, then a fixed
 *   overlay synced to the active card's rect expands to flood the
 *   screen — handing off seamlessly to the black Gallery section.
 *
 * Card markup lives in projects/ProjectCard.jsx; per-card scroll-exit
 * transforms are computed once here and shared via `cardTransforms`.
 */
import { useRef, useEffect } from 'react'
import { motion, useTransform, useSpring, useMotionValue, useMotionTemplate } from 'framer-motion'
import useScrollTimeline from '../hooks/useScrollTimeline'
import useMediaQuery from '../hooks/useMediaQuery'
import useInfiniteCarousel from '../hooks/useInfiniteCarousel'
import ProjectCard from './projects/ProjectCard'
import SectionNav from './SectionNav'
import { works } from '../data/projectsData'

export default function Projects() {
  const containerRef = useRef(null)
  const isMobile = useMediaQuery('(max-width: 767px)')

  // A sticky top-0 h-screen inside a 400vh parent unpins when the section's bottom
  // exits the viewport: at scroll = offsetTop + (400vh - 100vh) = offsetTop + 300vh.
  // So the sticky is only visible over 300vh of scroll travel, and progress 0→1
  // must map to exactly that range.
  const rawProgress = useScrollTimeline(containerRef, 3)
  const progress = useSpring(rawProgress, { stiffness: 400, damping: 40 })

  // ── Card exit transforms (computed once, shared across all cards) ───────
  const cardBlueOpacity = useTransform(progress, [0.55, 0.63], [0, 1]);
  const cardBorderOpacity = useTransform(progress, [0.55, 0.63], [0.4, 0]);
  const cardBorderStyle = useMotionTemplate`1px solid rgba(255,255,255,${cardBorderOpacity})`;
  const cardIconOpacity = useTransform(progress, [0.50, 0.55], [1, 0]);
  const cardContentOpacity = useTransform(progress, [0.55, 0.63], [1, 0]);
  const cardGrayscale = useTransform(progress, [0.55, 0.60], [0, 1]);
  const cardBrightness = useTransform(progress, [0.60, 0.63], [1, 0]);
  const cardFlattenFactor = useTransform(progress, [0.55, 0.63], [1, 0]);
  const cardScrollFade = useTransform(progress, [0.63, 0.67], [1, 0]);

  const cardTransforms = {
    blueOpacity: cardBlueOpacity,
    borderStyle: cardBorderStyle,
    iconOpacity: cardIconOpacity,
    contentOpacity: cardContentOpacity,
    grayscale: cardGrayscale,
    brightness: cardBrightness,
    flattenFactor: cardFlattenFactor,
    scrollFade: cardScrollFade,
  };

  // ── Staggered Entry — each element fades + slides in with its own timing ──
  // Section label — enters first with a gentle rise
  const labelY = useTransform(progress, [0.00, 0.06], [60, 0]);
  const labelOpacity = useTransform(progress, [0.00, 0.06, 0.55, 0.63], [0, 1, 1, 0]);

  // Carousel — enters second
  const carouselY = useTransform(progress, [0.08, 0.16], [150, 0]);
  const carouselOpacity = useTransform(progress, [0.08, 0.16], [0, 1]);

  // Bottom elements (dots + link) — enter last
  const bottomY = useTransform(progress, [0.13, 0.20], [100, 0]);
  const bottomOpacity = useTransform(progress, [0.13, 0.20, 0.55, 0.63], [0, 1, 1, 0]);

  // Expanding Overlay logic
  // By mapping the scale non-linearly (slowly to 5, then rapidly to 150),
  // the visible part of the expansion is stretched over a much larger scroll distance!
  const expandScale = useTransform(progress, [0.65, 0.82, 0.92], [0.5, 5, 150]);
  const expandRadius = useTransform(progress, [0.65, 0.73], [16, 0]);
  const expandOpacity = useTransform(progress, [0.63, 0.65], [0, 1]);

  // Global mouse tracking for parallax tilt across all cards
  const globalMouseX = useMotionValue(0);
  const globalMouseY = useMotionValue(0);
  const globalSpringX = useSpring(globalMouseX, { stiffness: 120, damping: 22 });
  const globalSpringY = useSpring(globalMouseY, { stiffness: 120, damping: 22 });

  const handleContainerMouseMove = (e) => {
    const rect = scrollRef.current?.getBoundingClientRect();
    if (!rect) return;
    globalMouseX.set((e.clientX - rect.left - rect.width / 2) / (rect.width / 2));
    globalMouseY.set((e.clientY - rect.top - rect.height / 2) / (rect.height / 2));
  };

  const handleContainerMouseLeave = () => {
    globalMouseX.set(0);
    globalMouseY.set(0);
  };

  // ── Infinite carousel ────────────────────────────────────────────────────
  // The works array is rendered 3× as a runway; the hook keeps the user in
  // the middle set, tracks the centred card, and animates goToIndex jumps.
  const infiniteWorks = [...works, ...works, ...works]
  const scrollRef = useRef(null)
  const { activeIndex, hasSwiped, goToIndex, handleScroll } =
    useInfiniteCarousel(scrollRef, works.length, isMobile)

  // Lock scrolling when transition begins
  // Since overflowX is already hidden for native scroll, we just disable pointer events
  useEffect(() => {
    let wasLocked = false;
    return progress.on('change', (v) => {
      if (scrollRef.current) {
        const isLocked = v > 0.65;
        if (isLocked !== wasLocked) {
          scrollRef.current.style.pointerEvents = isLocked ? 'none' : 'auto';
          wasLocked = isLocked;
        }
      }
    });
  }, [progress]);

  // Sync the expanding overlay to the active card's exact position
  // Only run the RAF loop when the overlay is actually visible (progress 0.65–0.95)
  // to avoid continuous getBoundingClientRect() layout reflow at all other times.
  const overlayRef = useRef(null);
  const overlaySyncActive = useRef(false);
  const overlaySyncRaf = useRef(null);

  useEffect(() => {
    let lastTop, lastLeft, lastWidth, lastHeight;
    let cachedCard = null;

    const sync = () => {
      if (!overlaySyncActive.current) {
        overlaySyncRaf.current = null;
        return;
      }
      overlaySyncRaf.current = requestAnimationFrame(sync);

      if (!cachedCard) cachedCard = document.getElementById('primary-project-card');
      const overlay = overlayRef.current;
      if (cachedCard && overlay) {
        const rect = cachedCard.getBoundingClientRect();
        const t = Math.round(rect.top);
        const l = Math.round(rect.left);
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);

        if (t !== lastTop || l !== lastLeft || w !== lastWidth || h !== lastHeight) {
          overlay.style.top = `${t}px`;
          overlay.style.left = `${l}px`;
          overlay.style.width = `${w}px`;
          overlay.style.height = `${h}px`;
          lastTop = t; lastLeft = l; lastWidth = w; lastHeight = h;
        }
      }
    };

    // Gate: start/stop the RAF loop based on progress
    const unsub = progress.on('change', (v) => {
      const shouldRun = v > 0.57 && v < 0.85;
      if (shouldRun && !overlaySyncActive.current) {
        overlaySyncActive.current = true;
        cachedCard = null; // re-lookup in case activeIndex changed
        if (!overlaySyncRaf.current) overlaySyncRaf.current = requestAnimationFrame(sync);
      } else if (!shouldRun && overlaySyncActive.current) {
        overlaySyncActive.current = false;
      }
    });

    return () => {
      unsub();
      if (overlaySyncRaf.current) cancelAnimationFrame(overlaySyncRaf.current);
    };
  }, [progress]);

  return (
    <div
      id="projects"
      ref={containerRef}
      style={{ height: '400vh', marginTop: '-2px' }}
    >

      <div className="sticky top-0 h-screen flex flex-col justify-center" style={{ overflowX: 'clip', overflowY: 'visible' }}>

        {/* Screen-reader landmark — the visible label is a motion-driven
            nav blob, so the section needs a real heading in the outline. */}
        <h2 className="sr-only">Projects</h2>


        {/* Section Label — outside the z-1 content wrapper so its dropdown
            stacks above the project cards (z-30) on mobile */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-45">
          <SectionNav
            currentSection="Projects"
            style={{ y: labelY, opacity: labelOpacity }}
            defaultTextColor="#1B3A8C"
          />
        </div>

        {/* All content - relative + z-[1] ensures it stacks above the canvas */}
        <div className="relative flex flex-col justify-center h-full" style={{ zIndex: 1 }}>
          {/* Native Horizontal Scroll Container */}
          <motion.div
            className="w-full mt-32 relative flex justify-center items-center"
            style={{ y: carouselY, opacity: carouselOpacity }}
          >

            {/* Expanding Blue Screen Overlay (synced to active card via DOM rect) */}
            <div ref={overlayRef} className="fixed z-40 pointer-events-none flex items-center justify-center">
              <motion.div
                className="w-full h-full"
                style={{
                  scale: expandScale,
                  borderRadius: expandRadius,
                  opacity: expandOpacity,
                  backgroundColor: '#000000',
                  transformOrigin: 'center center',
                  willChange: 'transform, opacity',
                }}
              />
            </div>

            <div
              ref={scrollRef}
              onScroll={handleScroll}
              onMouseMove={handleContainerMouseMove}
              onMouseLeave={handleContainerMouseLeave}
              className={`flex custom-scrollbar-hide ${isMobile ? 'flex-col items-center' : 'items-center w-full'}`}
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
                // Mobile: VERTICAL carousel — cards stack and swipe up/down
                // with snap; desktop keeps the horizontal click-to-navigate
                // carousel (overflow hidden).
                ...(isMobile ? {
                  // Narrower than the viewport — the side gutters stay
                  // page-scrollable so users can swipe past the section.
                  width: '80vw',
                  height: '74vh',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  scrollSnapType: 'y mandatory',
                  // Keep swipes inside the carousel from flinging the page
                  overscrollBehavior: 'contain',
                  // Soft fade at the ends so cards dissolve instead of
                  // being hard-clipped by the container edge.
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
                } : {
                  overflowY: 'visible',
                  overflowX: 'hidden',
                  paddingBlock: '10rem',
                }),
              }}
            >
              {infiniteWorks.map((work, i) => {
                const isActive = activeIndex !== -1 && (activeIndex % works.length) === (i % works.length);

                // Calculate relative distance mathematically wrapped around the modulo space
                let clampedRel = 99;
                if (activeIndex !== -1) {
                  const aMod = activeIndex % works.length;
                  const bMod = i % works.length;
                  let diff = bMod - aMod;
                  const half = Math.floor(works.length / 2);
                  if (diff > half) diff -= works.length;
                  if (diff < -half) diff += works.length;
                  clampedRel = diff;
                }
                const distForStyle = Math.abs(clampedRel);

                // Uniform width — active card appears larger via article scale, not DOM width
                // (avoids layout reflow on every click which caused snappy jumping)
                const widthClass = 'w-[74vw] md:w-[50vw] lg:w-[38vw] xl:w-[28vw]';

                let translateX = 0;
                let scale = distForStyle === 0 ? 1.35 : 1;
                if (isMobile) {
                  // Modest active scale so neighbours peek in from the
                  // edges — the visual cue that the row swipes.
                  scale = distForStyle === 0 ? 1.04 : 0.88;
                } else if (clampedRel === -1) { translateX = 20; scale = 0.85; }
                else if (clampedRel === 1) { translateX = -20; scale = 0.85; }
                else if (clampedRel <= -2) { translateX = 45; scale = 0.7; }
                else if (clampedRel >= 2) { translateX = -45; scale = 0.7; }

                // Mobile keeps inactive cards near full colour (reference
                // look) — the away-tilt already signals inactivity.
                const washOpacity = isMobile
                  ? (distForStyle === 0 ? 0 : 0.15)
                  : distForStyle === 0 ? 0 : distForStyle === 1 ? 0.3 : 0.6;
                const cardShadow = distForStyle === 0 ? '0 20px 60px rgba(0,0,0,0.15)' : 'none';

                let zIndexClass = 'z-0';
                if (distForStyle === 0) zIndexClass = 'z-30';
                else if (distForStyle === 1) zIndexClass = 'z-20';
                else if (distForStyle === 2) zIndexClass = 'z-10';

                return (
                  <ProjectCard
                    key={`${work.title}-${i}`}
                    work={work}
                    isActive={isActive}
                    isActiveIndex={i === activeIndex}
                    widthClass={widthClass}
                    translateX={translateX}
                    scale={scale}
                    zIndexClass={zIndexClass}
                    washOpacity={washOpacity}
                    cardShadow={cardShadow}
                    distForStyle={distForStyle}
                    clampedRel={clampedRel}
                    globalSpringX={globalSpringX}
                    globalSpringY={globalSpringY}
                    cardTransforms={cardTransforms}
                    isMobile={isMobile}
                    onClick={() => {
                      if (!isActive) {
                        goToIndex(i);
                      } else if (work.isGithubCard) {
                        window.open(work.github, '_blank', 'noopener,noreferrer');
                      }
                    }}
                  />
                )
              })}
            </div>
          </motion.div>

          {/* Swipe hint — mobile only, fades away after the first swipe */}
          {isMobile && (
            <motion.div
              className="absolute bottom-30 left-0 right-0 flex justify-center items-center gap-2.5 pointer-events-none"
              animate={{ opacity: hasSwiped ? 0 : 1 }}
              transition={{ duration: 0.4 }}
              style={{ y: bottomY }}
            >
              <motion.svg
                width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor"
                className="text-ink/40" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <path d="M2.5 7.5L6 4l3.5 3.5" />
              </motion.svg>
              <span className="font-mono text-meta tracking-[0.3em] uppercase text-ink/40">swipe</span>
              <motion.svg
                width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor"
                className="text-ink/40" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                animate={{ y: [0, 3, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <path d="M2.5 4.5L6 8l3.5-3.5" />
              </motion.svg>
            </motion.div>
          )}

          {/* Progress Indicator — segmented track with a position counter,
              anchored near the section bottom, clear of the card titles */}
          <motion.div
            className="absolute bottom-16 md:bottom-12 left-0 right-0 flex justify-center pointer-events-none"
            style={{ y: bottomY, opacity: bottomOpacity }}
          >
            {/* Solid pill keeps the track legible over the gradient.
                Segments are buttons — tap/click jumps to that project. */}
            <div className="flex items-center gap-3 rounded-full bg-cream/85 border border-ink/5 px-4 py-1 pointer-events-auto">
              <span className="font-mono text-meta tracking-[0.2em] text-ink/40 tabular-nums">
                {String((activeIndex % works.length) + 1).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-1">
                {works.map((work, index) => {
                  const isActive = activeIndex % works.length === index;
                  return (
                    <button
                      key={`seg-${index}`}
                      type="button"
                      aria-label={`Go to project ${index + 1}: ${work.title}`}
                      className="py-2.5 px-0.5 cursor-pointer group/seg"
                      onClick={() => {
                        // Jump within the active card's repetition set so
                        // the carousel travels the short way
                        const base = Math.floor(activeIndex / works.length) * works.length;
                        goToIndex(base + index);
                      }}
                    >
                      <span
                        className={`block h-[3px] rounded-full transition-all duration-500 ${isActive ? 'w-7 md:w-9 bg-cobalt' : 'w-3 md:w-4 bg-ink/15 group-hover/seg:bg-ink/35'}`}
                      />
                    </button>
                  )
                })}
              </div>
              <span className="font-mono text-meta tracking-[0.2em] text-ink/40 tabular-nums">
                {String(works.length).padStart(2, '0')}
              </span>
            </div>
          </motion.div>

        </div>{/* end content wrapper */}

      </div>
    </div>
  )
}
