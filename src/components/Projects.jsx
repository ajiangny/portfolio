import { useRef, useEffect, useState } from 'react'
import { motion, useTransform, useSpring, useMotionValue, animate, useMotionTemplate, useScroll } from 'framer-motion'
import useScrollTimeline from '../hooks/useScrollTimeline'
import ProjectsHalftone from './projects/ProjectsHalftone'
import SectionNav from './SectionNav'
import { works } from '../data/projectsData'
import { GitHubIcon, ExternalIcon, WrenchIcon } from './icons'
import StackIcon from 'tech-stack-icons'

const TECH_ICON_MAP = {
  'React': { icon: 'react' },
  'Tailwind CSS': { icon: 'tailwindcss' },
  'Tailwind': { icon: 'tailwindcss' },
  'Framer Motion': { icon: 'framer' },
  'Vite': { icon: 'vitejs' },
  'Python': { icon: 'python' },
  'Photoshop': { icon: 'photoshop' },
  'Next.js': { icon: 'nextjs' },
  'JavaScript': { icon: 'js' },
  'TypeScript': { icon: 'typescript' },
  'Express': { icon: 'expressjs' },
  'Three.js': { icon: 'threejs' },
  'Gemini API': { icon: 'gemini' },
  'SQLite': { icon: 'sqlite' },
  'Flet': { custom: 'Fl', color: '#1B3A8C' },
  'Figma': { icon: 'figma' },
  'Illustrator': { icon: 'adobeillustrator' },
  'Design': { custom: 'UI', color: '#E84545' },
  'Automation scripts': { custom: 'Sh', color: '#4CAF50' }
};

const ProjectCard = ({ work, i, isActive, isActiveIndex, widthClass, translateX, scale, zIndexClass, washOpacity, cardShadow, onClick, worksLength, distForStyle, clampedRel, globalSpringX, globalSpringY, progress, cardTransforms }) => {
  const isPrimary = distForStyle === 0;

  // Destructure shared transforms passed from parent to avoid redefining them 20 times
  const { blueOpacity, borderStyle, iconOpacity, contentOpacity: globalContentOpacity, grayscale, brightness, flattenFactor, scrollFade } = cardTransforms;

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
  // Left cards lean left, right cards lean right; further = more extreme
  const defaultRotateY = distForStyle === 0 ? 0
    : Math.sign(clampedRel) * (Math.abs(clampedRel) >= 2 ? 30 : 15);
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
      className={`relative flex flex-col ${widthClass} shrink-0 px-2 snap-center ${zIndexClass}`}
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
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{
            rotateX,
            rotateY,
            border: borderStyle,
            boxShadow: cardShadow,
            transformStyle: "preserve-3d",
            transformPerspective: 1000,
            transformOrigin: 'center bottom',
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
            style={{ opacity: contentOpacity, translateZ: 10, filter: thumbnailFilter }}
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
          <motion.div
            style={{ translateZ: 30, opacity: iconOpacity }}
            className={`absolute top-3 right-3 flex gap-2 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          >
            {work.tech.map((t, index) => {
              const mapped = TECH_ICON_MAP[t] || { custom: t.substring(0, 2).toUpperCase(), color: '#1B3A8C' };
              return (
                <div
                  key={index}
                  className={`group/icon w-8 h-8 rounded-full border border-white/20 flex items-center justify-center transition-colors ${isActive ? 'bg-white/80' : 'bg-white/50 hover:bg-white/80'}`}
                  title={t}
                >
                  {mapped.icon ? (
                    <div className={`relative w-4 h-4 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-70 group-hover/icon:opacity-100'}`}>
                      <div className={`absolute inset-0 transition-opacity duration-300 flex items-center justify-center ${isActive ? 'opacity-0' : 'opacity-100 group-hover/icon:opacity-0'}`}>
                        <StackIcon name={mapped.icon} variant="grayscale" />
                      </div>
                      <div className={`absolute inset-0 transition-opacity duration-300 flex items-center justify-center ${isActive ? 'opacity-100' : 'opacity-0 group-hover/icon:opacity-100'}`}>
                        <StackIcon name={mapped.icon} />
                      </div>
                    </div>
                  ) : (
                    <span className={`font-bold text-[11px] transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-70 group-hover/icon:opacity-100'}`} style={{ color: mapped.color }}>
                      {mapped.custom}
                    </span>
                  )}
                </div>
              )
            })}
          </motion.div>
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
            <h3 className="font-sans font-semibold text-lg md:text-xl lg:text-2xl text-ink mb-1 tracking-tight">
              {work.title}
            </h3>
            <p className="font-mono text-ink/50 text-[11px] md:text-xs line-clamp-2">
              {work.subtitle}
            </p>
          </div>

          <div className="flex gap-3 shrink-0 mt-0.5">
            {work.github && !work.isGithubCard && (
              <a href={work.github} target="_blank" rel="noopener noreferrer" className="text-ink/50 hover:text-cobalt transition-colors" aria-label={`${work.title} on GitHub`}>
                <GitHubIcon />
              </a>
            )}
            {work.live && (
              <a href={work.live} target="_blank" rel="noopener noreferrer" className="text-ink/50 hover:text-cobalt transition-colors" aria-label={`${work.title} live demo`}>
                <ExternalIcon />
              </a>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default function Projects() {
  const containerRef = useRef(null)

  const [activeHeight, setActiveHeight] = useState(0)

  useEffect(() => {
    // A sticky top-0 h-screen inside a 400vh parent unpins when the section's bottom
    // exits the viewport: at scroll = offsetTop + (400vh - 100vh) = offsetTop + 300vh.
    // So the sticky is only visible over 300vh of scroll travel.
    // activeHeight must equal that travel so rawProgress 0→1 maps to the full visible range.
    setActiveHeight(window.innerHeight * 3)
  }, [])

  const rawProgress = useScrollTimeline(containerRef, activeHeight)
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

  // "Featured Projects" heading — enters second with scale + rise
  const headingY = useTransform(progress, [0.04, 0.12], [120, 0]);
  const headingOpacity = useTransform(progress, [0.04, 0.12, 0.55, 0.63], [0, 1, 1, 0]);
  const headingScale = useTransform(progress, [0.04, 0.12], [0.92, 1]);

  // Carousel — enters third
  const carouselY = useTransform(progress, [0.08, 0.16], [150, 0]);
  const carouselOpacity = useTransform(progress, [0.08, 0.16], [0, 1]);

  // Bottom elements (dots + link) — enter last
  const bottomY = useTransform(progress, [0.13, 0.20], [100, 0]);
  const bottomOpacity = useTransform(progress, [0.13, 0.20, 0.55, 0.63], [0, 1, 1, 0]);

  // Halftone wave: rises slightly at first, then floods the entire screen right as the card turns blue
  const projectsWaveFront = useTransform(progress, [0, 0.52, 0.56, 0.73], [0, 0.20, 0.20, 1.5])

  // Track the native scroll transition from About to Projects
  const { scrollYProgress: transitionProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'start start'] // Tracks the exact same 100vh native scroll as About unpins and Projects scrolls in
  })

  // Second half of the continuous wave sweeps from -1 to 1 on Projects' canvas
  const lineWaveFront = useTransform(transitionProgress, [0, 1], [-1, 1])

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

  // Multiply works array to create a wide runway for seamless infinite scrolling
  const infiniteWorks = [...works, ...works, ...works]
  const scrollRef = useRef(null)

  const [activeIndex, setActiveIndex] = useState(works.length)

  useEffect(() => {
    // Initial center position to allow scrolling left immediately
    if (scrollRef.current && scrollRef.current.children.length > 0) {
      setTimeout(() => {
        const el = scrollRef.current
        if (el && el.children[works.length]) {
          const target = el.children[works.length];
          el.scrollLeft = target.offsetLeft + (target.offsetWidth / 2) - (el.clientWidth / 2);
        }
      }, 100)
    }
  }, [])

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

  const scrollTimeoutRef = useRef(null)

  const isAnimatingRef = useRef(false);
  const animationRef = useRef(null); // tracks active FM scroll animation

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || el.children.length === 0) return

    // Determine the center element using scrollLeft (avoids getBoundingClientRect layout thrashing)
    const containerCenter = el.scrollLeft + el.clientWidth / 2;
    let closestIndex = 0;
    let minDistance = Infinity;

    Array.from(el.children).forEach((child, index) => {
      // offsetLeft is relative to the scroll container
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const distance = Math.abs(containerCenter - childCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (!isAnimatingRef.current) {
      setActiveIndex(prev => prev !== closestIndex ? closestIndex : prev);
    }

    // Silent seamless jump logic when idle
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)

    scrollTimeoutRef.current = setTimeout(() => {
      if (!scrollRef.current || isAnimatingRef.current) return

      const currentEl = scrollRef.current
      const firstChild = currentEl.children[0];
      const setFirstChild = currentEl.children[works.length];
      if (!firstChild || !setFirstChild) return;
      const setWidth = setFirstChild.offsetLeft - firstChild.offsetLeft;

      // Center set is Set 2 (index 1 * works.length to 2 * works.length - 1)
      const centerSetStart = works.length;
      const centerSetEnd = works.length * 2 - 1;

      // If we've scrolled out of the center set, jump back to it silently
      if (closestIndex < centerSetStart || closestIndex > centerSetEnd) {
        const currentSet = Math.floor(closestIndex / works.length);
        const setOffset = 1 - currentSet; // '1' is the index of Set 2

        currentEl.scrollLeft += (setOffset * setWidth); // Silent jump
      }
    }, 150)
  }

  return (
    <div
      id="projects"
      ref={containerRef}
      className="bg-cream"
      style={{ height: '400vh' }}
    >

      <div className="sticky top-0 h-screen flex flex-col justify-center" style={{ overflowX: 'clip', overflowY: 'visible' }}>

        {/* Halftone canvas - first in DOM = paints behind everything, no z-index needed */}
        <ProjectsHalftone containerId="projects" waveFront={projectsWaveFront} waveHeight={0.25} lineWaveFront={lineWaveFront} lineWaveHeight={0.15} fadeProgress={progress} />

        {/* All content - relative + z-[1] ensures it stacks above the canvas */}
        <div className="relative flex flex-col justify-center h-full" style={{ zIndex: 1 }}>

          {/* Section Label */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
            <SectionNav
              currentSection="Projects"
              style={{ y: labelY, opacity: labelOpacity }}
              defaultTextColor="#1B3A8C"
            />
          </div>
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
              className="flex items-center w-full overflow-x-hidden custom-scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', overflowY: 'visible', paddingBlock: '10rem' }}
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
                const widthClass = 'w-[80vw] md:w-[50vw] lg:w-[38vw] xl:w-[28vw]';

                let translateX = 0;
                let scale = distForStyle === 0 ? 1.35 : 1;
                if (clampedRel === -1) { translateX = 20; scale = 0.85; }
                else if (clampedRel === 1) { translateX = -20; scale = 0.85; }
                else if (clampedRel <= -2) { translateX = 45; scale = 0.7; }
                else if (clampedRel >= 2) { translateX = -45; scale = 0.7; }

                const washOpacity = distForStyle === 0 ? 0 : distForStyle === 1 ? 0.3 : 0.6;
                const cardShadow = distForStyle === 0 ? '0 20px 60px rgba(0,0,0,0.15)' : 'none';

                let zIndexClass = 'z-0';
                if (distForStyle === 0) zIndexClass = 'z-30';
                else if (distForStyle === 1) zIndexClass = 'z-20';
                else if (distForStyle === 2) zIndexClass = 'z-10';

                return (
                  <ProjectCard
                    key={`${work.title}-${i}`}
                    work={work}
                    i={i}
                    isActive={isActive}
                    isActiveIndex={i === activeIndex}
                    widthClass={widthClass}
                    translateX={translateX}
                    scale={scale}
                    zIndexClass={zIndexClass}
                    washOpacity={washOpacity}
                    cardShadow={cardShadow}
                    worksLength={works.length}
                    distForStyle={distForStyle}
                    clampedRel={clampedRel}
                    globalSpringX={globalSpringX}
                    globalSpringY={globalSpringY}
                    progress={progress}
                    cardTransforms={cardTransforms}
                    onClick={() => {
                      if (!isActive) {
                        isAnimatingRef.current = true;
                        setActiveIndex(i);

                        // Cancel any running animation
                        if (animationRef.current) { animationRef.current.stop(); animationRef.current = null; }

                        // Wait for React to repaint, then spring-animate scrollLeft
                        requestAnimationFrame(() => {
                          requestAnimationFrame(() => {
                            const el = scrollRef.current;
                            const target = el?.children[i];
                            if (!el || !target) return;

                            const targetLeft = target.offsetLeft - (el.clientWidth / 2) + (target.offsetWidth / 2);

                            animationRef.current = animate(el.scrollLeft, targetLeft, {
                              type: 'spring',
                              stiffness: 350,
                              damping: 38,
                              restDelta: 0.5,
                              onUpdate: (v) => { el.scrollLeft = v; },
                              onComplete: () => {
                                animationRef.current = null;
                                isAnimatingRef.current = false;
                              },
                            });
                          });
                        });
                      } else if (work.isGithubCard) {
                        window.open(work.github, '_blank', 'noopener,noreferrer');
                      }
                    }}
                  />
                )
              })}
            </div>
          </motion.div>

          {/* Progress Indicator */}
          <motion.div
            className="absolute bottom-60 left-0 right-0 flex justify-center items-center gap-2 md:gap-3 pointer-events-none"
            style={{ y: bottomY, opacity: bottomOpacity }}
          >
            {works.map((_, index) => {
              const isActive = activeIndex % works.length === index;
              return (
                <div
                  key={`dot-${index}`}
                  className={`rounded-full transition-all duration-500 ${isActive ? 'h-1.5 w-6 md:w-8 bg-cobalt' : 'h-1.5 w-1.5 bg-ink/20'}`}
                />
              )
            })}
          </motion.div>

        </div>{/* end content wrapper */}

      </div>
    </div>
  )
}
