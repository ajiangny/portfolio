/**
 * sections.js — Single Source of Truth for Section Navigation
 *
 * Every place that navigates between sections (global SiteHeader,
 * Contact footer) reads from this table, so a section's theme colour,
 * nav blob shape, or landing offset only ever needs to change here.
 *
 * Fields:
 *   id             — DOM id of the section element (also the #hash target)
 *   label          — text shown in nav UIs
 *   themeRgb       — the section's background colour; used to tint the
 *                    blob-expand transition curtain and nav hover states
 *   blobShape      — organic border-radius for this section's nav blob
 *   scrollOffsetVh — extra scroll offset (in viewport-heights) past the
 *                    section top, so navigation lands on the section's
 *                    "settled" state:
 *                      about    +3.6vh → progress 0.6, text panel revealed
 *                      projects +1vh   → progress ~0.33, carousel on screen
 *                      contact  +0     → content fits one viewport exactly
 *                                        (an offset would clamp at max
 *                                        scroll and cut the heading)
 */
export const SECTIONS = [
  { id: 'hero',     label: 'Home',     themeRgb: [27, 58, 140],   blobShape: '68% 32% 55% 45% / 48% 56% 44% 52%', scrollOffsetVh: 0 },
  { id: 'about',    label: 'About',    themeRgb: [37, 79, 193],   blobShape: '44% 56% 65% 35% / 56% 44% 58% 42%', scrollOffsetVh: 3.6 },
  { id: 'projects', label: 'Projects', themeRgb: [245, 240, 232], blobShape: '58% 42% 38% 62% / 42% 62% 54% 46%', scrollOffsetVh: 1 },
  { id: 'gallery',  label: 'Gallery',  themeRgb: [0, 0, 0],       blobShape: '34% 66% 46% 54% / 62% 38% 52% 48%', scrollOffsetVh: 0 },
  { id: 'contact',  label: 'Contact',  themeRgb: [245, 240, 232], blobShape: '54% 46% 58% 42% / 50% 52% 48% 50%', scrollOffsetVh: 0 },
]

/** Sections shown in the global SiteHeader nav (everything except Home itself). */
export const NAV_SECTIONS = SECTIONS.filter((s) => s.id !== 'hero')

export const getSection = (id) => SECTIONS.find((s) => s.id === id)

/** CSS color string for a section's theme, with a cobalt fallback. */
export function getSectionColor(id) {
  const s = getSection(id)
  return s ? `rgb(${s.themeRgb.join(', ')})` : 'var(--color-cobalt, #1B3A8C)'
}

/**
 * Run the blob page-transition to a section, applying its themed curtain
 * colour and landing offset.
 *
 * @param {Function} navigate — `navigate` from useTransitionContext()
 * @param {string} id — section id from SECTIONS
 * @param {Event|null} e — originating click/tap event (expand origin)
 */
export function goToSection(navigate, id, e = null) {
  const s = getSection(id)
  const options = s?.scrollOffsetVh
    ? { offset: window.innerHeight * s.scrollOffsetVh }
    : {}
  navigate(`#${id}`, options, e, getSectionColor(id))
}
