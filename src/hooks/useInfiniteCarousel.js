/**
 * useInfiniteCarousel.js — Infinite Project Carousel Logic
 *
 * Drives the Projects carousel: the item list is rendered three times in
 * a row ("runway") and this hook keeps the user inside the middle set by
 * silently jumping a full set-width whenever they scroll out of it, so
 * the carousel feels endless in both directions.
 *
 * Handles both axes — vertical on mobile (scroll-snap), horizontal on
 * desktop (spring-animated scrollLeft) — and re-centres the active card
 * on mount and whenever the mobile breakpoint flips (the axis swap makes
 * the previous scroll offset meaningless).
 *
 * @param {React.RefObject} scrollRef - the scrollable container holding 3×itemCount children
 * @param {number} itemCount - number of unique items (one set)
 * @param {boolean} isMobile - true below the 768px breakpoint
 * @returns {{
 *   activeIndex: number,      // index into the 3×runway of the centred card
 *   hasSwiped: boolean,       // true once the user moved the carousel (mobile hint)
 *   goToIndex: (i: number) => void,  // animate card i to the centre
 *   handleScroll: () => void, // attach to the container's onScroll
 * }}
 */
import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'

export default function useInfiniteCarousel(scrollRef, itemCount, isMobile) {
  // Start in the middle set so the user can scroll backwards immediately
  const [activeIndex, setActiveIndex] = useState(itemCount)
  // Swipe-affordance hint (mobile) — hides once the user moves the carousel
  const [hasSwiped, setHasSwiped] = useState(false)
  const hasSwipedRef = useRef(false)

  const scrollTimeoutRef = useRef(null)
  const isAnimatingRef = useRef(false)
  const animationRef = useRef(null) // tracks active FM scroll animation

  // Mirror of activeIndex for the centering effect below, so it can read
  // the current card without re-running on every card change.
  const activeIndexRef = useRef(activeIndex)
  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  useEffect(() => {
    // Centre the active card. Runs on mount (initial position lets the user
    // scroll backwards immediately) and again whenever the 768px breakpoint
    // flips — the carousel axis swaps (vertical ↔ horizontal), so the old
    // scroll offset is meaningless on the new axis.
    const t = setTimeout(() => {
      const el = scrollRef.current
      const target = el?.children[activeIndexRef.current]
      if (!el || !target) return
      if (isMobile) {
        el.scrollTop = target.offsetTop + target.offsetHeight / 2 - el.clientHeight / 2
      } else {
        el.scrollLeft = target.offsetLeft + target.offsetWidth / 2 - el.clientWidth / 2
      }
    }, 100)
    return () => clearTimeout(t)
  }, [isMobile, scrollRef])

  // Centre card `i` — shared by card clicks and the progress segments
  const goToIndex = (i) => {
    isAnimatingRef.current = true
    setActiveIndex(i)

    if (animationRef.current) { animationRef.current.stop(); animationRef.current = null }

    // Wait for React to repaint, then animate the scroll position
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = scrollRef.current
        const target = el?.children[i]
        if (!el || !target) return

        // With scroll-snap active (mobile), native smooth scrolling
        // cooperates with the snap points; the JS spring would fight them.
        // Mobile scrolls the vertical axis.
        if (isMobile) {
          const targetTop = target.offsetTop - (el.clientHeight / 2) + (target.offsetHeight / 2)
          el.scrollTo({ top: targetTop, behavior: 'smooth' })
          isAnimatingRef.current = false
          return
        }

        const targetLeft = target.offsetLeft - (el.clientWidth / 2) + (target.offsetWidth / 2)

        animationRef.current = animate(el.scrollLeft, targetLeft, {
          type: 'spring',
          stiffness: 350,
          damping: 38,
          restDelta: 0.5,
          onUpdate: (v) => { el.scrollLeft = v },
          onComplete: () => {
            animationRef.current = null
            isAnimatingRef.current = false
          },
        })
      })
    })
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || el.children.length === 0) return

    // Determine the center element using scroll offsets (avoids
    // getBoundingClientRect layout thrashing). Mobile scrolls vertically.
    const containerCenter = isMobile
      ? el.scrollTop + el.clientHeight / 2
      : el.scrollLeft + el.clientWidth / 2
    let closestIndex = 0
    let minDistance = Infinity

    Array.from(el.children).forEach((child, index) => {
      // offsetLeft/offsetTop are relative to the scroll container
      const childCenter = isMobile
        ? child.offsetTop + child.offsetHeight / 2
        : child.offsetLeft + child.offsetWidth / 2
      const distance = Math.abs(containerCenter - childCenter)
      if (distance < minDistance) {
        minDistance = distance
        closestIndex = index
      }
    })

    if (!isAnimatingRef.current) {
      setActiveIndex(prev => prev !== closestIndex ? closestIndex : prev)
    }

    if (!hasSwipedRef.current && closestIndex !== itemCount) {
      hasSwipedRef.current = true
      setHasSwiped(true)
    }

    // Silent seamless jump logic when idle
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)

    scrollTimeoutRef.current = setTimeout(() => {
      if (!scrollRef.current || isAnimatingRef.current) return

      const currentEl = scrollRef.current
      const firstChild = currentEl.children[0]
      const setFirstChild = currentEl.children[itemCount]
      if (!firstChild || !setFirstChild) return
      const setSpan = isMobile
        ? setFirstChild.offsetTop - firstChild.offsetTop
        : setFirstChild.offsetLeft - firstChild.offsetLeft

      // Center set is Set 2 (index 1 * itemCount to 2 * itemCount - 1)
      const centerSetStart = itemCount
      const centerSetEnd = itemCount * 2 - 1

      // If we've scrolled out of the center set, jump back to it silently
      if (closestIndex < centerSetStart || closestIndex > centerSetEnd) {
        const currentSet = Math.floor(closestIndex / itemCount)
        const setOffset = 1 - currentSet // '1' is the index of Set 2

        // Silent jump along the active scroll axis
        if (isMobile) currentEl.scrollTop += (setOffset * setSpan)
        else currentEl.scrollLeft += (setOffset * setSpan)
      }
    }, 150)
  }

  return { activeIndex, hasSwiped, goToIndex, handleScroll }
}
