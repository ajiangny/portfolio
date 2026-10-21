/**
 * ProjectCard.tsx — one work-list row (layout ref: kaiseisadatoki-v4 /work)
 *
 * Desktop: 12-col grid — info sticks in cols 1-5 while the image (cols 8-12,
 * 576/420) scrolls past with a slow parallax (120%-tall image drifts -10%).
 * Mobile: image first, info below.
 * Riot surfaces: the row is an ink slab (jagged silhouette, hard riot-cobalt
 * offset shadow via .slab-wrap) leaning a little off-axis, alternating
 * direction per row; the title is display type with a ransomed No. tag; the
 * image is a cream-bordered print knocked off-angle the other way; the CTA
 * is a cream slab button that flips to cobalt on hover.
 */
import { useRef, useState, useEffect, type ReactNode } from 'react'
import { motion, useScroll, useTransform, useMotionValue, animate, useReducedMotion } from 'framer-motion'
import useInkFilter from '../../hooks/useInkFilter'
import type { Work } from '../../data/projectsData'
import { jagged } from '../../style/riot'

function WrenchIcon() {
  return (
    <svg
      className="w-10 h-10 text-white/15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

// Riot CTA: a cream slab button; hover is a costume change (flips to cobalt,
// kicks off-angle with an overshoot).
export function CircleLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      data-sfx
      className="group/link inline-flex items-center gap-3 w-fit font-display uppercase text-slab bg-cream px-5 py-3 transition-[background-color,color,rotate,scale] duration-200 ease-[cubic-bezier(0.2,1.4,0.4,1)] hover:bg-riot hover:text-cream hover:-rotate-3 hover:scale-105"
      style={{ fontSize: 'clamp(0.95rem, 1.3vw, 1.2rem)', clipPath: jagged(31, 5), lineHeight: 1 }}
    >
      {children}
      <span aria-hidden className="transition-transform duration-200 group-hover/link:translate-x-1">→</span>
    </a>
  )
}

function MetaLabel({ children }: { children: ReactNode }) {
  return (
    <span
      className="block font-mono uppercase tracking-[0.25em] text-cream/55 mb-2"
      style={{ fontSize: 'var(--text-meta)' }}
    >
      {children}
    </span>
  )
}

const TECH_ICON_MAP: Record<string, string> = {
  'TypeScript': 'typescript.svg',
  'Tailwind': 'tailwindcss.svg',
  'Express': 'expressjs.svg',
  'Python': 'python.svg',
  'React': 'react.svg',
  'Three.js': 'threejs.svg',
  'Vercel': 'vercel.svg',
  'JavaScript': 'javascript.svg',
  'Framer Motion': 'framer-motion.svg',
  'Photoshop': 'photoshop.svg',
  'Gemini API': 'gemini.svg',
  'SQLite': 'sqlite.svg',
  'Figma': 'figma.svg',
  'HTML': 'html5.svg',
  'CSS': 'css.svg',
  'Illustrator': 'illustrator.svg',
  'Flet': 'flet.svg',
  'Node.js': 'nodejs.svg',
  'PostgreSQL': 'postgresql.svg',
  'Supabase': 'supabase.svg',
  'Java': 'java.svg',
  'C++': 'cplusplus.svg',
  'Docker': 'docker.svg',
  'Git': 'git.svg',
  'GitHub': 'github.svg',
};

function TechIconBadge({ name }: { name: string }) {
  const iconFile = TECH_ICON_MAP[name];

  if (iconFile) {
    return (
      <div
        className="tech-badge flex items-center justify-center w-9 h-9 bg-cream p-1.5 shrink-0"
        style={{ clipPath: jagged(name.length * 7, 10) }}
        data-sfx
        data-cursor-label={name}
      >
        <img src={`/icons/default/${iconFile}`} alt={name} className="w-full h-full object-contain" />
      </div>
    );
  }

  // Fallback placeholder: 2-letter abbreviation
  return (
    <div
      className="tech-badge flex items-center justify-center w-9 h-9 bg-cream shrink-0"
      style={{ clipPath: jagged(name.length * 7, 10) }}
      data-sfx
      data-cursor-label={name}
    >
      <span className="font-mono text-[11px] text-slab font-bold uppercase tracking-tighter">
        {name.substring(0, 2)}
      </span>
    </div>
  );
}

export default function ProjectCard({ work, index = 0 }: { work: Work; index?: number }) {
  const reduceMotion = useReducedMotion()
  const itemRef = useRef<HTMLElement>(null)

  // Parallax: track this row across the viewport; the 120%-tall image
  // drifts up 10% of its height as the row passes (same ratio as the ref).
  const { scrollYProgress } = useScroll({
    target: itemRef,
    offset: ['start end', 'end start'],
  })
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '-10%'])

  const thumbnailSrc = work.thumbnail ?? null
  const hoverSrc = work.hoverThumbnail ?? null
  const [isHovered, setIsHovered] = useState(false)
  // Don't fetch the hover asset (can be a multi-MB gif) until the first
  // hover — it's invisible until then and shouldn't compete at page load.
  const [hasHovered, setHasHovered] = useState(false)

  // Hover crossfade uses the shared ink-dissolve filter (hooks/useInkFilter)
  // instead of a hard image swap, matching the site-wide transition language.
  const inkT = useMotionValue(0)
  const { defs: inkDefs, filter: inkFilter } = useInkFilter(inkT, { maxScale: 40, maxBlur: 8, octaves: 3 })

  useEffect(() => {
    if (!hoverSrc) return
    const controls = animate(inkT, isHovered ? 1 : 0, {
      duration: reduceMotion ? 0.15 : 0.6,
      ease: [0.76, 0, 0.24, 1],
    })
    return () => controls.stop()
  }, [isHovered, hoverSrc, reduceMotion, inkT])

  // Rows lean alternately off the axis; the print leans the other way.
  const lean = index % 2 ? 0.6 : -0.6
  const cut = ['cut-a', 'cut-b', 'cut-c'][index % 3]

  return (
    <div
      className={`slab-wrap slab-jump ${cut}`}
      style={{ rotate: `${lean}deg`, ['--slab-shadow' as string]: 'var(--color-riot)', ['--slab-dx' as string]: '12px', ['--slab-dy' as string]: '12px' }}
    >
    <article
      ref={itemRef}
      className="slab grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:gap-x-8 p-6 md:p-10"
    >
      {/* ── Image — first on mobile, right column on desktop ── */}
      <div className="lg:col-start-8 lg:col-end-13 lg:row-start-1">
        <div
          className="relative overflow-hidden aspect-576/420"
          style={{
            border: '4px solid var(--color-cream)',
            boxShadow: '10px 10px 0 var(--color-riot)',
            rotate: `${-lean * 2.5}deg`,
          }}
          data-sfx
          onMouseEnter={() => { if (hoverSrc) { setIsHovered(true); setHasHovered(true) } }}
          onMouseLeave={() => setIsHovered(false)}
        >
          {thumbnailSrc ? (
            <>
              <motion.img
                src={thumbnailSrc}
                alt={work.title}
                className="absolute inset-x-0 top-0 w-full h-[120%] object-cover"
                style={reduceMotion ? undefined : { y: imgY }}
                loading="lazy"
                decoding="async"
                draggable="false"
              />
              {hoverSrc && hasHovered && (
                <>
                  {inkDefs}
                  <motion.img
                    src={hoverSrc}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 w-full h-[120%] object-cover"
                    style={{
                      y: reduceMotion ? undefined : imgY,
                      opacity: inkT,
                      filter: reduceMotion ? 'none' : inkFilter,
                    }}
                    draggable="false"
                  />
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <WrenchIcon />
            </div>
          )}
        </div>
      </div>

      {/* ── Info — sticky left column on desktop ── */}
      <div className="lg:col-start-1 lg:col-end-6 lg:row-start-1 lg:sticky lg:top-24 lg:self-start max-w-[600px]">


        {/* No. tag — ransomed: ink-on-cream "No." against a cobalt number chip */}
        <div className="flex items-center font-display mb-3" style={{ fontSize: 'clamp(1rem, 1.4vw, 1.25rem)', rotate: '-5deg', width: 'fit-content', lineHeight: 1 }}>
          <span className="bg-cream text-slab px-2 py-1" style={{ clipPath: jagged(index * 5 + 1, 8) }}>No.</span>
          <span className="bg-riot text-cream px-2 py-1" style={{ clipPath: jagged(index * 5 + 2, 8), rotate: '7deg' }}>
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        <h3
          className="font-heading font-bold italic uppercase text-cream leading-[0.95] tracking-tight mt-3 mb-4"
          style={{ fontSize: 'clamp(1.9rem, 3.6vw, 3.4rem)' }}
        >
          {work.title}
        </h3>

        <p
          className="font-mono text-cream/70 leading-relaxed mb-8"
          style={{ fontSize: 'var(--text-body)' }}
        >
          {work.subtitle}
        </p>

        {/* Year / Role / Stack */}
        <div className="flex gap-12 mb-6">
          {work.year && (
            <div>
              <MetaLabel>Year</MetaLabel>
              <p className="font-mono text-cream/80" style={{ fontSize: 'var(--text-body)' }}>
                {work.year}
              </p>
            </div>
          )}
          {work.role && (
            <div>
              <MetaLabel>Role</MetaLabel>
              <p className="font-mono text-cream/80" style={{ fontSize: 'var(--text-body)' }}>
                {work.role}
              </p>
            </div>
          )}
        </div>

        {work.tech.length > 0 && (
          <div className="mb-10">
            <MetaLabel>Stack</MetaLabel>
            <div className="flex flex-wrap gap-2">
              {work.tech.map((t) => (
                <TechIconBadge key={t} name={t} />
              ))}
            </div>
          </div>
        )}

        {work.live && (
          <CircleLink href={work.live} label={`${work.title} live site`}>
            Launch Website
          </CircleLink>
        )}
        {!work.live && work.github && (
          <CircleLink href={work.github} label={`${work.title} on GitHub`}>
            View Code
          </CircleLink>
        )}
      </div>
    </article>
    </div>
  )
}
