/**
 * aboutData.js — About Section Static Content
 *
 * Exports all data consumed by the About section:
 *   • LEFT_COL / CENTER_COL / RIGHT_COL — filmstrip image paths (3 vertical columns)
 *   • MAIN_SKILLS / OTHER_SKILLS — tech stack icon definitions for SkillIcon
 *   • GLASS_BG — CSS-in-JS glossy-glass sheen overlay applied to filmstrip cards
 */

// ── Filmstrip columns — displayed during the scroll-in animation ────────────
// CENTER_COL holds the profile photo (index CENTER_PROFILE_INDEX), which
// transitions into the expanded About portrait. The cards after it exist so
// the filmstrip doesn't look like it ran out of frames when the scroll stops
// with the profile dead-centre in the viewport.
export const LEFT_COL = ['/art/art10.webp', '/art/art11.webp', '/art/art12.webp', '/art/art9.webp', '/art/art3.webp', '/art/art6.webp', '/art/art1.webp'];
export const CENTER_COL = ['/art/art5.webp', '/art/art4.webp', '/art/art6.webp', '/art/profile.webp', '/art/art8.webp', '/art/art13.webp'];
export const CENTER_PROFILE_INDEX = 3;
export const RIGHT_COL = ['/art/art1.webp', '/art/art3.webp', '/art/art2.webp', '/art/art7.webp', '/art/art13.webp', '/art/art10.webp', '/art/art4.webp'];

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

// ── Glossy-glass sheen — additive light overlay on the filmstrip art cards ──
// Replaces the old halftone dots. Layered neutral light gradients under
// `screen` blend read as polished glass catching the light. Kept neutral
// (no colour cast) to match the neutral-grayscale card art.
// ── Liquid-glass card shell (desktop) — frosts + saturates the fluid gradient
// showing through the translucent card, with a bright top rim and a soft lift
// shadow. Paired with GLASS_BG (specular sheen on top). Skipped on mobile
// `lite`: backdrop-filter on the scrolling filmstrip is too heavy there.
export const CARD_GLASS = {
  backdropFilter: 'blur(10px) saturate(1.8) brightness(1.08)',
  WebkitBackdropFilter: 'blur(10px) saturate(1.8) brightness(1.08)',
  backgroundColor: 'rgba(244,246,250,0.05)', // faint tint so frost reads on sparse art
  boxShadow: [
    'inset 0 1px 1px rgba(255,255,255,0.55)',  // bright top rim — light catches the edge
    'inset 0 -2px 3px rgba(255,255,255,0.14)', // faint bottom edge light
    '0 12px 30px rgba(18,22,38,0.24)',         // soft drop shadow — lifts the glass
  ].join(', '),
};

export const GLASS_BG = {
  backgroundImage: [
    // thin bright specular glint — the crisp glass highlight
    'linear-gradient(125deg, rgba(255,255,255,0) 22%, rgba(255,255,255,0.34) 26%, rgba(255,255,255,0) 30%)',
    // broad diagonal sheen sweeping from the top-left
    'linear-gradient(125deg, rgba(236,236,236,0) 34%, rgba(236,236,236,0.16) 48%, rgba(236,236,236,0) 62%)',
    // soft top-light bloom
    'linear-gradient(to bottom, rgba(224,224,224,0.14) 0%, rgba(224,224,224,0) 40%)',
  ].join(', '),
  mixBlendMode: 'screen',
  border: '1px solid rgba(236,236,236,0.22)', // faint neutral glass rim
  borderRadius: '12px',
};
