/**
 * aboutData.js — About Section Static Content
 *
 * Exports all data consumed by the About section:
 *   • LEFT_COL / CENTER_COL / RIGHT_COL — filmstrip image paths (3 vertical columns)
 *   • MAIN_SKILLS / OTHER_SKILLS — tech stack icon definitions for SkillIcon
 *   • DOT_BG — CSS-in-JS halftone dot overlay pattern applied to filmstrip cards
 */

// ── Filmstrip columns — displayed during the scroll-in animation ────────────
// Each array is a column of artwork images; the last item in CENTER_COL is the
// profile photo which transitions into the expanded About portrait.
export const LEFT_COL = ['/art/art10.webp', '/art/art11.webp', '/art/art12.webp', '/art/art9.webp'];
export const CENTER_COL = ['/art/art5.webp', '/art/art4.webp', '/art/art6.webp', '/art/profile.webp'];
export const RIGHT_COL = ['/art/art1.webp', '/art/art3.webp', '/art/art2.webp', '/art/art7.webp'];

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

// ── Halftone dot overlay — applied as a CSS background pattern on art cards ─
export const DOT_BG = {
  backgroundImage: [
    'radial-gradient(circle, rgba(27,58,140,0.65) 38%, transparent 38%)',
    'radial-gradient(circle, rgba(27,58,140,0.65) 38%, transparent 38%)',
  ].join(', '),
  backgroundSize: '7px 7px',
  backgroundPosition: '0 0, 3.5px 3.5px',
  mixBlendMode: 'multiply',
  filter: 'blur(0.5px)',
};
