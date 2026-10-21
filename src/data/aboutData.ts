/**
 * aboutData.ts — About Section Static Content
 *
 * Exports all data consumed by the About section:
 *   • GRID_IMAGES / GRID_COLS / GRID_PROFILE_INDEX — gallery-montage grid shown
 *     on the white entry panel (profile photo dead-centre). On scroll the outer
 *     cells dissolve inward, leaving only the profile (see GridMontage.tsx).
 *   • TAGLINE_SEGMENTS / BIO_PARAGRAPHS / RESUME_URL / TECH_STACK /
 *     STATUS_ITEMS / SPOTIFY / SOCIALS — bento tile content (AboutBento.tsx)
 */

// ── Gallery-montage grid — shown on the white entry panel ───────────────────
// Row-major. The centre cell is the halftone profile; it survives the dissolve
// and expands into the About portrait. Desktop is a 5×3 wall, mobile a 3×3.
export const GRID_COLS = 5;
export const GRID_PROFILE_INDEX = 7; // row 1, col 2 — dead-centre of 5×3
export const GRID_IMAGES = [
  '/art/art1.webp', '/art/art2.webp', '/art/art3.webp', '/art/art4.webp', '/art/art5.webp',
  '/art/art6.webp', '/art/art7.webp', '/art/profile-halftone.webp', '/art/art8.webp', '/art/art9.webp',
  '/art/art10.webp', '/art/art11.webp', '/art/art12.webp', '/art/art13.webp', '/art/art14.webp',
];

export const GRID_COLS_MOBILE = 3;
export const GRID_PROFILE_INDEX_MOBILE = 4; // centre of 3×3
export const GRID_IMAGES_MOBILE = [
  '/art/art1.webp', '/art/art3.webp', '/art/art5.webp',
  '/art/art7.webp', '/art/profile-halftone.webp', '/art/art9.webp',
  '/art/art11.webp', '/art/art13.webp', '/art/art2.webp',
];

// ═══════════════════════════════════════════════════════════════════════════
// Bento layout content — consumed by AboutBento.tsx (the 7-tile settled state)
// ═══════════════════════════════════════════════════════════════════════════

// ── Tagline tile ────────────────────────────────────────────────────────────
// Rendered word-by-word so weight/style varies per segment: "Engineering"
// reads bold, "Artistic" reads light + italic (matches the reference). The
// segments wrap naturally; `break` forces a line break after it.
export interface TaglineSegment {
  t: string
  weight: number
  italic?: boolean
  break?: boolean
}

export const TAGLINE_SEGMENTS: TaglineSegment[] = [
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
// Every cell is a two-sided card: `alt` is the logo on its back, and the
// mosaic flips one card at a time on a timer, so the tile cycles through
// all 24 skills on the resume while keeping 12 cells. Pairs are loosely
// related so a flip reads as a sibling (React ↔ Framer Motion, Supabase ↔
// SQLite…). Alt marks are one-colour Simple Icons paths, or a blocky lettered
// box where Simple Icons has no mark (photoshop.svg).
//
// ORDER MATTERS: this sequence (anchors at positions 1, 4, 6, 9) tiles the
// 4-col × 6-row grid hole-free at rest (grid-auto-flow: dense). Reorder with
// care, then re-screenshot.
export interface TechLogo {
  id: string
  label: string
  noWhite?: boolean
}

export interface TechItem extends TechLogo {
  big?: boolean
  alt?: TechLogo
}

export const TECH_STACK: TechItem[] = [
  { id: 'react', label: 'React', big: true, alt: { id: 'framer-motion', label: 'Framer Motion' } },
  { id: 'typescript', label: 'TypeScript', alt: { id: 'cplusplus', label: 'C++' } },
  { id: 'nodejs', label: 'Node.js', alt: { id: 'docker', label: 'Docker' } },
  { id: 'javascript', label: 'JavaScript', big: true, alt: { id: 'java', label: 'Java' } },
  { id: 'expressjs', label: 'Express', alt: { id: 'github', label: 'GitHub' } },
  { id: 'python', label: 'Python', big: true, alt: { id: 'gemini', label: 'Gemini API' } },
  { id: 'vercel', label: 'Vercel', alt: { id: 'git', label: 'Git' } },
  { id: 'supabase', label: 'Supabase', alt: { id: 'sqlite', label: 'SQLite' } },
  { id: 'tailwindcss', label: 'Tailwind', big: true, alt: { id: 'css', label: 'CSS' } },
  { id: 'postgresql', label: 'PostgreSQL', alt: { id: 'html5', label: 'HTML' } },
  { id: 'threejs', label: 'Three.js', alt: { id: 'figma', label: 'Figma' } },
  { id: 'claude-code', label: 'Claude Code', alt: { id: 'photoshop', label: 'Photoshop' } },
];

// ── Status tile ──────────────────────────────────────────────────────────────
// Auto-rotates through these lines (crossfade; pauses under reduced-motion).
export interface StatusItem {
  label: string
  value: string
}

export const STATUS_ITEMS: StatusItem[] = [
  { label: 'Current Status', value: 'Seeking Internships' },
  { label: 'Current Status', value: 'Playing Teamfight Tactics' },
  { label: 'Current Status', value: 'Studying Leetcode & Data Structures' },
  { label: 'Current Status', value: 'Sketching in my Notebook' },
];

// ── Spotify tile ─────────────────────────────────────────────────────────────
// Custom glass player bridged to the Spotify iframe API for playback. Live
// playlist name + cover + tracklist come from /api/playlist (public-embed
// harvest); per-song covers from /api/track (Client Credentials). `track`/
// `author` are the static fallbacks shown before (or if) those fetches resolve.
export const SPOTIFY = {
  playlistId: '13dthduoXicGhZ7rRTUz4D',
  url: 'https://open.spotify.com/playlist/13dthduoXicGhZ7rRTUz4D?si=1e9fb7a9c380461a&pt=d7d5f2e01d2d3d37ca62a792c4633f22',
  embedUri: 'spotify:playlist:13dthduoXicGhZ7rRTUz4D',
  track: 'My Playlist',
  author: 'Andrew Jiang',
};

// ── Socials tile ─────────────────────────────────────────────────────────────
// GitHub + LinkedIn mirror Contact.tsx; Instagram is a placeholder.
export interface Social {
  label: string
  href: string
  icon: string
}

export const SOCIALS: Social[] = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ajiangnyc/', icon: 'linkedin' },
  { label: 'GitHub', href: 'https://github.com/ajiangny', icon: 'github' },
  { label: 'Instagram', href: 'https://instagram.com/ajiang.art/', icon: 'instagram' }, // TODO: real handle
];
