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
