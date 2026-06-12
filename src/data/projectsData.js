/**
 * projectsData.js — Projects Section Data
 *
 * Array of project objects displayed in the Projects carousel.
 * Each project has a title, subtitle description, tech stack array,
 * optional GitHub/live links, and an optional thumbnail path.
 *
 * The last entry is a special `isGithubCard` — a CTA card that
 * links to the full GitHub profile instead of a specific project.
 *
 * TECH_ICON_MAP translates each tech label to a tech-stack-icons name,
 * or a custom two-letter fallback chip; project cards look entries up
 * by the exact strings used in `tech` arrays below.
 */

export const TECH_ICON_MAP = {
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
  'Automation scripts': { custom: 'Sh', color: '#4CAF50' },
}
export const works = [
  {
    title: 'Interactive Portfolio',
    subtitle: 'Immersive personal portfolio featuring custom animations, dynamic halftone effects, and seamless page transitions.',
    tech: ['React', 'Tailwind CSS', 'Framer Motion', 'Vite'],
    github: null,
    live: null,
    thumbnail: '/thumbnail/portfolio.png'
  },
  {
    title: 'Pear Protocol',
    subtitle: 'Engineered and composited a 10,000+ image generative collection using Python pipelines and automated smart contract metadata formatting.',
    tech: ['Python', 'Photoshop', 'Automation scripts'],
    github: null,
    live: 'https://www.pear.garden/',
    thumbnail: '/thumbnail/pear.webp'
  },
  {
    title: 'HackKnight 2026',
    subtitle: 'Next.js event platform handling registration and scheduling for 200+ participants with an admin dashboard.',
    tech: ['Next.js', 'TypeScript', 'Tailwind', 'Framer Motion', 'Express'],
    github: null,
    live: 'https://hackknight.org/',
    thumbnail: '/thumbnail/hackknight.webp'
  },
  {
    title: 'Art Fundamentals Tutor',
    subtitle: 'AI-powered drawing evaluation workspace using Gemini Pro Vision and Three.js for three-point perspective geometry.',
    tech: ['React', 'TypeScript', 'Three.js', 'Gemini API'],
    github: null,
    live: 'https://taseenc718.github.io/Art_Fundamentals_Tutor/',
    thumbnail: '/thumbnail/artfundamental.png'
  },
  {
    title: 'Bank Statement Parser',
    subtitle: 'Python desktop app automating financial data extraction with a regex parsing engine and SQLite.',
    tech: ['Python', 'SQLite', 'Flet'],
    github: 'https://github.com/ajiangny/bank_parser',
    live: null,
    thumbnail: null
  },
  {
    title: 'Code For All Brand',
    subtitle: "Redesigned the club's full brand identity, establishing a cohesive visual language through a new logo and graphic assets.",
    tech: ['Figma', 'Illustrator', 'Design'],
    github: null,
    live: null,
    thumbnail: '/thumbnail/CFA.webp'
  },
  {
    // Special CTA card — links to GitHub profile instead of a project
    isGithubCard: true,
    title: 'View All Work.',
    subtitle: 'Check out all my projects and repositories.',
    github: 'https://github.com/ajiangny',
    tech: [],
  }
];
