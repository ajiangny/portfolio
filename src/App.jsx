/**
 * App.jsx — Root Application Component
 *
 * Composes the full single-page portfolio by stacking five
 * scroll-driven sections: Hero → About → Projects → Gallery → Contact.
 *
 * Wraps everything in:
 *   • LenisContext  — smooth-scroll instance shared across sections
 *   • TransitionProvider — blur/ink-dissolve page-transition state
 *   • LoadingContext — signals the loading screen when the gradient is warm
 *
 * Below-fold sections are deferred until the loading screen dismisses so
 * their heavy mount cost (700vh About, Gallery pieces, API calls) doesn't
 * compete with the WebGL prewarm for main-thread time.
 */
import { useState, useEffect, useCallback } from 'react'
import { MotionConfig } from 'framer-motion'
import useLenis from './hooks/useLenis'
import { LenisContext } from './context/LenisContext'
import { LoadingContext } from './context/LoadingContext'
import { TransitionProvider } from './context/TransitionProvider'
import PageTransition from './components/PageTransition'
import LoadingScreen from './components/LoadingScreen'
import Hero from './components/Hero'
import About from './components/About'
import Projects from './components/Projects'
import Gallery from './components/Gallery'
import Contact from './components/Contact'
import FluidGradient from './components/gradient/FluidGradient'
import SiteHeader from './components/SiteHeader'
import Cursor from './components/Cursor'

function App() {
  const lenisRef = useLenis()

  // ---- Loading gate: fonts + WebGL prewarm must both complete ----
  const [fontsReady, setFontsReady] = useState(false)
  const [gradientReady, setGradientReady] = useState(false)

  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true))
  }, [])

  const onGradientReady = useCallback(() => setGradientReady(true), [])
  // Once true, never false again (both inputs only ever set true). Heavy
  // below-fold sections mount the moment this flips — the 800ms dissolve-out
  // gives them time to render before the veil clears, and their layout cost
  // no longer blocks the prewarm animation.
  const siteReady = fontsReady && gradientReady

  return (
    <LenisContext.Provider value={lenisRef}>
      {/* reducedMotion="user" lets Framer Motion honour OS-level
          prefers-reduced-motion for its spring/transform animations */}
      <MotionConfig reducedMotion="user">
      <TransitionProvider>
        <LoadingContext.Provider value={{ onReady: onGradientReady }}>
          <div className="text-ink min-h-screen overflow-x-clip">
            <FluidGradient />
            <Cursor />
            <SiteHeader />
            <PageTransition />
            <LoadingScreen ready={siteReady} />
            <main>
              <Hero />
              {siteReady && (
                <>
                  <About />
                  <Projects />
                  <Gallery />
                  <Contact />
                </>
              )}
            </main>
          </div>
        </LoadingContext.Provider>
      </TransitionProvider>
      </MotionConfig>
    </LenisContext.Provider>
  )
}

export default App

