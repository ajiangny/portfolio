/**
 * projectsData.js — Projects Section Data
 *
 * `works` is rendered top-to-bottom by Projects.jsx as full-width glass
 * cards (ProjectCard.jsx). Each entry: title, subtitle, tech[] (stack
 * badges), year, role, optional github/live links, thumbnail, and an
 * optional hoverThumbnail (ink-dissolve crossfade on hover — see the
 * Pear Protocol entry).
 *
 * Stack badge icons come from TECH_ICON_MAP in ProjectCard.jsx — labels
 * without a mapping render as a two-letter fallback chip. The last entry
 * is a CTA card linking to the GitHub profile (github set, live null →
 * the card shows "View Code").
 *
 * HOW TO ADD A PROJECT: see ARCHITECTURE.md § Projects.
 */

export const works = [
  {
    title: 'HackKnight 2026',
    subtitle: 'Event platform handling registration and scheduling for 200+ participants with an admin dashboard.',
    tech: ['React', 'TypeScript', 'JavaScript', 'Tailwind', 'Framer Motion', 'Express'],
    year: '2026',
    role: 'Development',
    github: null,
    live: 'https://hackknight.org/',
    thumbnail: '/thumbnail/hackknight.webp'
  },
  {
    title: 'Pear Protocol',
    subtitle: 'Engineered and composited a 10,000+ image generative collection using Python pipelines and automated smart contract metadata formatting.',
    tech: ['Python', 'Photoshop'],
    year: null, // TODO: fill in
    role: 'Development',
    github: null,
    live: 'https://www.pear.garden/',
    thumbnail: '/thumbnail/pear.webp',
    hoverThumbnail: '/thumbnail/pear.gif'
  },
  {
    title: 'Art Fundamentals Tutor',
    subtitle: 'AI-powered drawing evaluation workspace using Gemini Pro Vision and Three.js for three-point perspective geometry.',
    tech: ['React', 'TypeScript', 'Three.js', 'Gemini API'],
    year: null, // TODO: fill in
    role: 'Development',
    github: null,
    live: 'https://taseenc718.github.io/Art_Fundamentals_Tutor/',
    thumbnail: '/thumbnail/artfundamental.webp'
  },
  {
    title: 'Bank Statement Parser',
    subtitle: 'Python desktop app automating financial data extraction with a regex parsing engine and SQLite.',
    tech: ['Python', 'SQLite', 'Flet'],
    year: null, // TODO: fill in
    role: 'Development',
    github: 'https://github.com/ajiangny/bank_parser',
    live: null,
    thumbnail: '/thumbnail/bankparser.webp'
  },
  {
    title: 'Code For All Brand',
    subtitle: "Redesigned the club's full brand identity, establishing a cohesive visual language through a new logo and graphic assets.",
    tech: ['Figma', 'Illustrator'],
    year: null, // TODO: fill in
    role: 'Design',
    github: null,
    live: null,
    thumbnail: '/thumbnail/CFA.webp'
  },
  {
    title: 'Blind Box Trading App',
    subtitle: 'A blind box collectible tracker with community trading, real-time chat negotiations, and collection management.',
    tech: ['React', 'Vercel'],
    year: null,
    role: 'Development',
    github: null,
    live: 'https://lucki-draw.vercel.app/',
    thumbnail: '/thumbnail/luckidraw.webp'
  },
  {
    title: 'Kanto Pokédex',
    subtitle: 'Retro pixel-art Pokédex featuring all 151 Kanto Pokémon with live stats from PokéAPI, type filtering, and animated sprites.',
    tech: ['HTML', 'CSS', 'JavaScript'],
    year: null,
    role: 'Development',
    github: null,
    live: 'https://ajiangny.github.io/kanto-pokedex/',
    thumbnail: '/thumbnail/pokedex.webp'
  },
  {
    // CTA card — links to the GitHub profile instead of a project
    title: 'View All Work.',
    subtitle: 'Check out all my projects and repositories.',
    github: 'https://github.com/ajiangny',
    tech: [],
    thumbnail: '/thumbnail/github2.svg'
  }
];
