/**
 * sections.js — Single Source of Truth for Section Navigation
 *
 * Every place that navigates between sections (global SiteHeader,
 * Contact footer) reads from this table, so a section's theme colour
 * or landing offset only ever needs to change here.
 *
 * Fields:
 *   id             — DOM id of the section element (also the #hash target)
 *   label          — text shown in nav UIs
 *   themeRgb       — the section's background colour; used to tint the
 *                    transition veil and nav hover states
 *   scrollOffsetVh — extra scroll offset (in viewport-heights) past the
 *                    section top, so navigation lands on the section's
 *                    "settled" state:
 *                      about    +4.5vh → progress 0.75, bento assembled
 *                                        (mobile: ~half-way through the pan)
 *                      projects +0     → normal-flow section; land on the
 *                                        heading with the first card below
 *                      contact  +0     → content fits one viewport exactly
 *                                        (an offset would clamp at max
 *                                        scroll and cut the heading)
 */
export const SECTIONS = [
  { id: 'hero',     label: 'Home',     themeRgb: [27, 58, 140],   scrollOffsetVh: 0 },
  { id: 'about',    label: 'About',    themeRgb: [37, 79, 193],   scrollOffsetVh: 4.5 },
  { id: 'projects', label: 'Projects', themeRgb: [255, 255, 255], scrollOffsetVh: 0 },
  { id: 'gallery',  label: 'Gallery',  themeRgb: [0, 0, 0],       scrollOffsetVh: 0 },
  { id: 'contact',  label: 'Contact',  themeRgb: [255, 255, 255], scrollOffsetVh: 0 },
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
 * Run the blur/ink-dissolve page transition to a section, applying its
 * themed veil colour and landing offset.
 *
 * @param {Function} navigate — `navigate` from useTransitionContext()
 * @param {string} id — section id from SECTIONS
 */
export function goToSection(navigate, id) {
  const s = getSection(id)
  const options = s?.scrollOffsetVh
    ? { offset: window.innerHeight * s.scrollOffsetVh }
    : {}
  navigate(`#${id}`, options, getSectionColor(id))
}
