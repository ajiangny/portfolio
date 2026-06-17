/**
 * LazyStackIcon.jsx — Code-Split Tech Icon
 *
 * `tech-stack-icons` bundles every icon SVG (~8 MB of source), which
 * dominated the main chunk and delayed first paint. Both usage sites
 * (About skills, Projects cards) are below the fold, so the package is
 * loaded lazily in its own chunk; the null fallback just omits the
 * glyph for the instant before the chunk arrives.
 *
 * Use this everywhere instead of importing 'tech-stack-icons' directly.
 */
import { lazy, Suspense } from 'react'

const StackIcon = lazy(() => import('tech-stack-icons'))

export default function LazyStackIcon(props) {
  return (
    <Suspense fallback={null}>
      <StackIcon {...props} />
    </Suspense>
  )
}
