/**
 * aboutData.js — About Section Static Content
 *
 * Exports all data consumed by the About section:
 *   • GRID_IMAGES / GRID_COLS / GRID_PROFILE_INDEX — gallery-montage grid shown
 *     on the white entry panel (profile photo dead-centre). On scroll the outer
 *     cells dissolve inward, leaving only the profile (see GridMontage.jsx).
 *   • MAIN_SKILLS / OTHER_SKILLS — tech stack icon definitions for SkillIcon
 */

// ── Gallery-montage grid — shown on the white entry panel ───────────────────
// Row-major. The centre cell is the profile photo; it survives the dissolve
// and expands into the About portrait. Desktop is a 5×3 wall, mobile a 3×3.
export const GRID_COLS = 5;
export const GRID_PROFILE_INDEX = 7; // row 1, col 2 — dead-centre of 5×3
export const GRID_IMAGES = [
  '/art/art1.webp', '/art/art2.webp', '/art/art3.webp', '/art/art4.webp', '/art/art5.webp',
  '/art/art6.webp', '/art/art7.webp', '/art/profile.webp', '/art/art8.webp', '/art/art9.webp',
  '/art/art10.webp', '/art/art11.webp', '/art/art12.webp', '/art/art13.webp', '/art/art14.webp',
];

export const GRID_COLS_MOBILE = 3;
export const GRID_PROFILE_INDEX_MOBILE = 4; // centre of 3×3
export const GRID_IMAGES_MOBILE = [
  '/art/art1.webp', '/art/art3.webp', '/art/art5.webp',
  '/art/art7.webp', '/art/profile.webp', '/art/art9.webp',
  '/art/art11.webp', '/art/art13.webp', '/art/art2.webp',
];

// ── Primary skills — rendered as large 64px icon tiles ──────────────────────
export const MAIN_SKILLS = [
  { name: 'React', icon: 'react' },
  { name: 'Next.js', icon: 'nextjs' },
  { name: 'JavaScript', icon: 'js' },
  { name: 'TypeScript', icon: 'typescript' },
  { name: 'CSS / Tailwind', icon: 'tailwindcss' },
  { name: 'Python', icon: 'python' },
];

// ── Secondary skills — rendered as smaller 36px icon tiles ──────────────────
export const OTHER_SKILLS = [
  { name: 'Node.js', icon: 'nodejs' },
  { name: 'Figma', icon: 'figma' },
  { name: 'Git', icon: 'git' },
  { name: 'REST APIs', custom: 'API', hoverColor: '#038BFC' },
  { name: 'SQL', icon: 'mysql' },
  { name: 'Firebase', icon: 'firebase' },
  { name: 'Vercel', icon: 'vercel' },
  { name: 'VS Code', icon: 'vscode' },
  { name: 'GitHub', icon: 'github' },
  { name: 'Framer Motion', icon: 'framer' },
];

// ═══════════════════════════════════════════════════════════════════════════
// Bento layout content — consumed by AboutBento.jsx (the 7-tile settled state)
// ═══════════════════════════════════════════════════════════════════════════

// ── Tagline tile ────────────────────────────────────────────────────────────
// Rendered word-by-word so weight/style varies per segment: "Engineering"
// reads bold, "Artistic" reads light + italic (matches the reference). The
// segments wrap naturally; `break` forces a line break after it.
export const TAGLINE_SEGMENTS = [
  { t: 'Engineering', weight: 800 },
  { t: 'with', weight: 400 },
  { t: 'an', weight: 400, break: true },
  { t: 'Artistic', weight: 300, italic: true },
  { t: 'eye.', weight: 400 },
];

// ── About description tile ───────────────────────────────────────────────────
export const BIO_PARAGRAPHS = [
  `I'm an aspiring software engineer based in New York, currently pursuing my BS in Computer Science at Queens College. Coming from an artistic background, I believe design can solve problems and improve how people interact with technology. My goal is to create digital experiences that are both functional and enjoyable.`,
  `When I'm not building, you'll find me on a scenic hike, sketching in my notebook, or experimenting in the kitchen.`,
];

// ── Resume button (tagline tile) ─────────────────────────────────────────────
export const RESUME_URL = '/docs/resume.pdf';

// ── Tech Stack & Hobbies tile ────────────────────────────────────────────────
// `kind: 'tech'` items render a tech-stack-icons glyph (by `icon`, grayscale →
// colour on hover). `kind: 'hobby'` items render an inline SVG keyed by `icon`
// (HOBBY_ICONS map in AboutBento.jsx). 3-col grid, ordered tech → hobbies.
export const TECH_HOBBIES = [
  { kind: 'tech', icon: 'react', label: 'React' },
  { kind: 'tech', icon: 'typescript', label: 'TypeScript' },
  { kind: 'tech', icon: 'tailwindcss', label: 'Tailwind' },
  { kind: 'tech', icon: 'js', label: 'JavaScript' },
  { kind: 'tech', icon: 'python', label: 'Python' },
  { kind: 'tech', icon: 'nodejs', label: 'Node.js' },
  { kind: 'hobby', icon: 'hiking', label: 'Hiking' },
  { kind: 'hobby', icon: 'gaming', label: 'Gaming' },
  { kind: 'hobby', icon: 'sketch', label: 'Sketching' },
  { kind: 'hobby', icon: 'cooking', label: 'Cooking' },
  { kind: 'hobby', icon: 'film', label: 'Film' },
  { kind: 'hobby', icon: 'reading', label: 'Reading' },
];

// ── Status tile ──────────────────────────────────────────────────────────────
// Auto-rotates through these lines (crossfade; pauses under reduced-motion).
export const STATUS_ITEMS = [
  { label: 'Current Status', value: 'Seeking Internships' },
  { label: 'Current Status', value: 'Playing Teamfight Tactics' },
  { label: 'Current Status', value: 'Studying for Leetcode & Data Structures' },
  { label: 'Current Status', value: 'Sketching in my Notebook' },
];

// ── Spotify tile ─────────────────────────────────────────────────────────────
// Custom faux-player UI; the whole card links out to the playlist.
export const SPOTIFY = {
  url: 'https://open.spotify.com/playlist/13dthduoXicGhZ7rRTUz4D?si=1e9fb7a9c380461a&pt=d7d5f2e01d2d3d37ca62a792c4633f22',   // placeholder — your playlist URL
  track: 'My Playlist',               // placeholder
  author: 'Andrew Jiang',                   // placeholder
  cover: '',                          // optional cover image path; '' → disc placeholder
};

// ── Socials tile ─────────────────────────────────────────────────────────────
// GitHub + LinkedIn mirror Contact.jsx; Instagram is a placeholder.
export const SOCIALS = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ajiangnyc/', icon: 'linkedin' },
  { label: 'GitHub', href: 'https://github.com/ajiangny', icon: 'github' },
  { label: 'Instagram', href: 'https://instagram.com/ajiang.art/', icon: 'instagram' }, // TODO: real handle
];
