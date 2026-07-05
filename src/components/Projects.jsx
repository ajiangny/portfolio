import { motion, useReducedMotion } from 'framer-motion'
import ProjectCard from './projects/ProjectCard'
import { works } from '../data/projectsData'

const listVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
}

// Section opener reveal — same language as the cards (fade + rise, sharp
// ease-out).
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
      className="pt-24 pb-32 md:pt-32 md:pb-40"
    >
      {/* ── Section opener — a transparent headline that scrolls with the
          section, letting the fluid gradient read through (same treatment
          as Contact's display type). ── */}
      <header className="bg-transparent max-w-[2200px] mx-auto px-5 md:px-10 mb-12 md:mb-20">
        <motion.h2
          variants={reduceMotion ? headerItemReduced : headerItem}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: reduceMotion ? '0px' : '-80px' }}
          className="font-display text-ink leading-[0.95] tracking-tight"
          style={{ fontSize: 'var(--text-section)' }}
        >
          Selected Projects
        </motion.h2>
      </header>

      {/* Card grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-[2200px] mx-auto px-5 md:px-10"
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
