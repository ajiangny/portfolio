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
  `Welcome to my portfolio! This is my digital playground where I experiment with new web techniques and interactive technologies.`,
  `I'm an aspiring software engineer based in New York, currently pursuing my BS in Computer Science at Queens College. 
  Coming from an artistic background, I believe thoughtful design solves real problems and elevates how people interact with software. 
  My goal is to build digital experiences that are as intuitive as they are enjoyable.`,
  `When I'm not writing code, you can usually find me grinding Teamfight Tactics, filling up my sketchbook, or experimenting in the kitchen.`,
];

// ── Resume button (tagline tile) ─────────────────────────────────────────────
export const RESUME_URL = '/docs/resume.pdf';

// ── Tech Stack tile — mini-bento mosaic ──────────────────────────────────────
// Rendered by AboutBento's <TechMosaic> as a tightly-packed grid of rounded
// cells at two sizes: four 2×2 anchors (`big: true`) + the rest 1×1. Each cell
// shows its icon from /public/icons (white/<id>.svg at rest → default/<id>.svg
// colour on hover). Clicking a small cell promotes it to a 2×2 anchor and
// demotes the longest-held — always exactly four large at a time. `id` doubles
// as the icon filename; `noWhite` flags an icon that has no white/ variant yet
// (rendered white via a CSS filter on the colour svg as a fallback).
//
// ORDER MATTERS: this sequence (anchors at positions 1, 4, 6, 9) tiles the
// 4-col × 6-row grid hole-free at rest (grid-auto-flow: dense). Reorder with
// care, then re-screenshot.
export const TECH_STACK = [
  { id: 'react', label: 'React', big: true },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'nodejs', label: 'Node.js' },
  { id: 'javascript', label: 'JavaScript', big: true },
  { id: 'expressjs', label: 'Express' },
  { id: 'python', label: 'Python', big: true },
  { id: 'vercel', label: 'Vercel' },
  { id: 'supabase', label: 'Supabase' },
  { id: 'tailwindcss', label: 'Tailwind', big: true },
  { id: 'postgresql', label: 'PostgreSQL' },
  { id: 'threejs', label: 'Three.js' },
  { id: 'claude-code', label: 'Claude Code' },
];

// ── Status tile ──────────────────────────────────────────────────────────────
// Auto-rotates through these lines (crossfade; pauses under reduced-motion).
export const STATUS_ITEMS = [
  { label: 'Current Status', value: 'Seeking Internships' },
  { label: 'Current Status', value: 'Playing Teamfight Tactics' },
  { label: 'Current Status', value: 'Studying Leetcode & Data Structures' },
  { label: 'Current Status', value: 'Sketching in my Notebook' },
];

// ── Spotify tile ─────────────────────────────────────────────────────────────
// Custom glass player bridged to the Spotify iframe API for playback. Live
// playlist name + cover come from /api/playlist (Spotify Web API, server-side
// Client Credentials). `track`/`author` are the static fallbacks shown before
// (or if) that fetch resolves — e.g. under plain `vite` dev with no /api route.
export const SPOTIFY = {
  playlistId: '13dthduoXicGhZ7rRTUz4D',
  url: 'https://open.spotify.com/playlist/13dthduoXicGhZ7rRTUz4D?si=1e9fb7a9c380461a&pt=d7d5f2e01d2d3d37ca62a792c4633f22',
  embedUri: 'spotify:playlist:13dthduoXicGhZ7rRTUz4D',
  track: 'My Playlist',
  author: 'Andrew Jiang',
};

// ── Socials tile ─────────────────────────────────────────────────────────────
// GitHub + LinkedIn mirror Contact.jsx; Instagram is a placeholder.
export const SOCIALS = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ajiangnyc/', icon: 'linkedin' },
  { label: 'GitHub', href: 'https://github.com/ajiangny', icon: 'github' },
  { label: 'Instagram', href: 'https://instagram.com/ajiang.art/', icon: 'instagram' }, // TODO: real handle
];
