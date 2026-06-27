import { motion, useReducedMotion } from 'framer-motion'

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

function ArrowUpRight({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 13L13 3M13 3H6M13 3v7" />
    </svg>
  )
}

const itemVariants = {
  hidden: { opacity: 0, y: 36 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.2, 0, 0, 1] },
  },
}

const itemVariantsReduced = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
}

export default function ProjectCard({ work, index }) {
  const reduceMotion = useReducedMotion()
  const isGithub = work.isGithubCard
  const thumbnailSrc = isGithub ? '/thumbnail/github.svg' : (work.thumbnail ?? null)
  const typeLabel = isGithub ? 'GitHub' : 'Project'

  return (
    <motion.div
      variants={reduceMotion ? itemVariantsReduced : itemVariants}
      className="group"
    >
      <motion.div
        whileHover={reduceMotion ? undefined : { y: -4 }}
        transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
        style={{
          borderRadius: '22px',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'rgba(255,255,255,0.18)',
          background: 'rgba(18,22,46,0.40)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 8px 30px rgba(8,12,40,0.18)',
        }}
        className="overflow-hidden transition-[border-color,background-color] duration-200 hover:border-white/30 hover:bg-[rgba(18,22,46,0.52)]"
      >
        {/* ── Header row ───────────────────────────────── */}
        <div className="flex justify-between items-center px-5 md:px-6 pt-5 pb-4">
          <span className="font-mono text-meta tracking-[0.25em] text-cobalt/80 tabular-nums">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="font-mono text-meta tracking-[0.25em] uppercase text-white/20">
            {typeLabel}
          </span>
        </div>

        {/* ── Divider ──────────────────────────────────── */}
        <div className="h-px bg-white/10 mx-5 md:mx-6" />

        {/* ── Body ─────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row gap-5 p-5 md:p-6">

          {/* Thumbnail */}
          <div className="w-full md:w-[38%] shrink-0 aspect-video rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06]">
            {thumbnailSrc ? (
              <img
                src={thumbnailSrc}
                alt={isGithub ? 'GitHub' : work.title}
                className="w-full h-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] group-hover:scale-[1.04]"
                draggable="false"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <WrenchIcon />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col justify-between flex-1 gap-4 md:py-1">
            <div>
              <h3
                className="font-display text-cream/90 mb-2 leading-tight tracking-tight"
                style={{ fontSize: 'var(--text-title)' }}
              >
                {work.title}
              </h3>
              <p
                className="font-mono text-cream/45 leading-relaxed"
                style={{ fontSize: 'var(--text-body)' }}
              >
                {work.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3">
              {/* Tech chips */}
              {work.tech?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {work.tech.map((t) => (
                    <span
                      key={t}
                      className="font-mono px-2.5 py-1 rounded-full border border-white/10 text-cream/30 tracking-wide"
                      style={{ fontSize: 'var(--text-meta)' }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Links */}
              <div className="flex gap-4 shrink-0 ml-auto">
                {work.github && !isGithub && (
                  <a
                    href={work.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link flex items-center gap-1.5 font-mono text-cream/40 hover:text-cream/80 transition-colors duration-150 tracking-wider"
                    style={{ fontSize: 'var(--text-label)' }}
                    aria-label={`${work.title} on GitHub`}
                  >
                    GitHub
                    <ArrowUpRight className="w-3 h-3 opacity-60 transition-transform duration-150 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                  </a>
                )}
                {work.live && (
                  <a
                    href={work.live}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link flex items-center gap-1.5 font-mono text-cobalt-light hover:text-cobalt transition-colors duration-150 tracking-wider"
                    style={{ fontSize: 'var(--text-label)' }}
                    aria-label={`${work.title} live site`}
                  >
                    Live
                    <ArrowUpRight className="w-3 h-3 opacity-70 transition-transform duration-150 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                  </a>
                )}
                {isGithub && (
                  <a
                    href={work.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link flex items-center gap-1.5 font-mono text-cobalt-light hover:text-cobalt transition-colors duration-150 tracking-wider"
                    style={{ fontSize: 'var(--text-label)' }}
                    aria-label="View GitHub profile"
                  >
                    Profile
                    <ArrowUpRight className="w-3 h-3 opacity-70 transition-transform duration-150 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                  </a>
                )}
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  )
}
