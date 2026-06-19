/**
 * useActiveSection.js — Which section holds the viewport centre, and whether
 * we're "settled" inside it or crossing a seam between two sections.
 *
 * Mirrors the rect/centre math FluidGradient.paletteNow() uses, so the header
 * morph stays in sync with the background palette crossfade. Returns:
 *   • index   — SECTIONS index whose [top,bottom) contains the viewport centre
 *   • settled — true inside a section's comfortable middle; false in the seam
 *               band near a real boundary (page extremes count as settled).
 *
 * Hysteresis (BAND_ENTER < BAND_EXIT) stops the expand/collapse flicker when
 * scrolling slowly across a boundary.
 */
import { useEffect, useRef, useState } from 'react'
import { useLenisContext } from '../context/LenisContext'
import { SECTIONS } from '../config/sections'

const ORDER = SECTIONS.map((s) => s.id)
const BAND_ENTER = 0.10 // within this of a seam → start collapsing
const BAND_EXIT = 0.18  // past this from a seam → fully expanded

export default function useActiveSection() {
  const lenisRef = useLenisContext()
  const [state, setState] = useState({ index: 0, settled: true })
  const settledRef = useRef(true)

  useEffect(() => {
    let unlisten = () => {}

    const t = setTimeout(() => {
      const lenis = lenisRef?.current

      const compute = () => {
        const centerY = window.innerHeight / 2
        let index = 0
        let through = 0
        for (let i = 0; i < ORDER.length; i++) {
          const el = document.getElementById(ORDER[i])
          if (!el) continue
          const r = el.getBoundingClientRect()
          if (r.top <= centerY && centerY < r.bottom) {
            index = i
            through = r.height > 0 ? (centerY - r.top) / r.height : 0
            break
          }
          if (centerY >= r.bottom) index = i
        }

        // Distance (in progress units) to the nearest REAL seam. The first
        // section has no leading seam and the last has no trailing seam, so
        // page extremes read as "far from a seam" → settled.
        const last = ORDER.length - 1
        const toStart = index > 0 ? through : 1
        const toEnd = index < last ? 1 - through : 1
        const edge = Math.min(toStart, toEnd)

        let settled = settledRef.current
        if (edge < BAND_ENTER) settled = false
        else if (edge > BAND_EXIT) settled = true
        settledRef.current = settled

        setState((prev) =>
          prev.index === index && prev.settled === settled
            ? prev
            : { index, settled },
        )
      }

      compute()

      if (lenis) {
        const onScroll = () => compute()
        const onResize = () => compute()
        lenis.on('scroll', onScroll)
        window.addEventListener('resize', onResize)
        unlisten = () => {
          lenis.off('scroll', onScroll)
          window.removeEventListener('resize', onResize)
        }
      } else {
        // Reduced-motion / no-Lenis fallback: native scroll.
        const onScroll = () => compute()
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll)
        unlisten = () => {
          window.removeEventListener('scroll', onScroll)
          window.removeEventListener('resize', onScroll)
        }
      }
    }, 0)

    return () => {
      clearTimeout(t)
      unlisten()
    }
  }, [lenisRef])

  return state
}
