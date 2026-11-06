/**
 * projectsData.ts — Projects Section Data
 *
 * `works` is rendered top-to-bottom by Projects.tsx as full-width glass
 * cards (ProjectCard.tsx). Each entry: title, subtitle, tech[] (stack
 * badges), year, role, optional github/live links, thumbnail, and an
 * optional hoverThumbnail (ink-dissolve crossfade on hover — see the
 * Pear Protocol entry).
 *
 * Stack badge icons come from TECH_ICON_MAP in ProjectCard.tsx — labels
 * without a mapping render as a two-letter fallback chip. The last entry
 * is a CTA card linking to the GitHub profile (github set, live null →
 * the card shows "View Code").
 *
 * HOW TO ADD A PROJECT: see ARCHITECTURE.md § Projects.
 */

export interface Work {
  title: string
  subtitle: string
  tech: string[]
  year?: string | null
  role?: string
  github?: string | null
  live?: string | null
  thumbnail: string
  hoverThumbnail?: string
  /** Riot accent while this card is in view (replaces cobalt site-wide; see
   *  style/accent.ts). Taken from the project's own art, darkened so cream
   *  text on it stays readable. Omit to keep cobalt. */
  accent?: string
}

export const works: Work[] = [
  {
    title: 'HackKnight 2026',
    accent: '#5B2D9F',
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
    accent: '#34841B',
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
    title: "Ronin's Revenge",
    accent: '#8E1F2F',
    subtitle: 'Solo-built Unity game with a reactive C# dialogue engine choosing from 600+ conversations, made with parallel AI agents wired into the live Editor and 1,300+ ElevenLabs-generated voice lines, sound effects and music tracks.',
    tech: ['Unity', 'C#', 'Claude Code', 'Node.js', 'ElevenLabs'],
    year: '2026',
    role: 'Development',
    github: 'https://github.com/ajiangny/ronins_revenge',
    live: null,
    thumbnail: '/thumbnail/ronins.webp'
  },
  {
    title: 'Color Palette Explorer',
    accent: '#1E6A8D',
    subtitle: "Matches any image to 7,600 public-domain paintings with pgvector search reranked by Earth Mover's Distance, then explains the artists' colour use with cited, RAG-grounded Gemini answers.",
    tech: ['Python', 'React', 'TypeScript', 'Supabase', 'Gemini API'],
    year: '2026',
    role: 'Development',
    github: 'https://github.com/ajiangny/RAG-Palette-Explorer',
    live: null,
    thumbnail: '/thumbnail/palette.webp'
  },
  {
    title: 'Code For All Brand',
    accent: '#A0359E',
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
    accent: '#86760F',
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
    accent: '#C41C1D',
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
