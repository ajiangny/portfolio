import { motion, useReducedMotion } from 'framer-motion'
import ProjectCard from './projects/ProjectCard'
import { works } from '../data/projectsData'

const listVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09 },
  },
}

// Section opener reveal — same language as the cards (fade + rise, sharp
// ease-out). The eyebrow and headline stagger in as the section scrolls up.
const headerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const headerItem = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.2, 0, 0, 1] },
  },
}

const headerItemReduced = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
}

export default function Projects() {
  const reduceMotion = useReducedMotion()

  return (
    <section
      id="projects"
      style={{ marginTop: '-2px' }}
      className="px-5 md:px-10 pt-24 pb-32 md:pt-32 md:pb-40"
    >
      {/* ── Section opener — eyebrow + display headline ─────────────────── */}
      <motion.header
        className="mb-12 md:mb-20 max-w-[2200px] mx-auto"
        variants={headerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: reduceMotion ? '0px' : '-80px' }}
      >
        <motion.div
          variants={reduceMotion ? headerItemReduced : headerItem}
          className="flex justify-between items-baseline mb-4 md:mb-6"
        >
          <span className="font-mono text-label tracking-[0.3em] uppercase text-ink/40">
            Projects
          </span>
          <span className="font-mono text-meta text-ink/25 tracking-widest">
            {String(works.filter(w => !w.isGithubCard).length).padStart(2, '0')} works
          </span>
        </motion.div>

        <motion.h2
          variants={reduceMotion ? headerItemReduced : headerItem}
          className="font-display text-ink leading-[0.95] tracking-tight"
          style={{ fontSize: 'var(--text-section)' }}
        >
          Selected Works
        </motion.h2>
      </motion.header>

      {/* Card list */}
      <motion.div
        className="flex flex-col gap-4 md:gap-5 max-w-[2200px] mx-auto"
        variants={listVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: reduceMotion ? '0px' : '-60px' }}
      >
        {works.map((work, i) => (
          <ProjectCard key={work.title ?? `card-${i}`} work={work} index={i} />
        ))}
      </motion.div>
    </section>
  )
}
