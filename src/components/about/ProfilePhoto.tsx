/**
 * ProfilePhoto — the About portrait in riot dress.
 *
 * Rests as a baked halftone cutout (public/art/profile-halftone.webp: ink/cream
 * dot screen, cream keyline, hard ink shadow on the cobalt field). Hovering the
 * card — or tapping it on touch screens — slashes the real photograph in along
 * the tilted axis. The wipe is pure clip-path (`.profile-reveal` in index.css).
 */
import { useState } from 'react'

export const PROFILE_HALFTONE = '/art/profile-halftone.webp'
export const PROFILE_PHOTO = '/art/profile.webp'

export default function ProfilePhoto() {
  // Touch has no hover, so a tap toggles the reveal instead.
  const [revealed, setRevealed] = useState(false)

  return (
    <div
      className="profile-reveal absolute inset-0"
      data-revealed={revealed || undefined}
      data-cursor-label="Reveal"
      onPointerUp={(e) => { if (e.pointerType !== 'mouse') setRevealed((r) => !r) }}
    >
      <img
        src={PROFILE_HALFTONE}
        alt="Andrew Jiang"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: 'top center' }}
        draggable={false}
      />
      <img
        src={PROFILE_PHOTO}
        alt=""
        aria-hidden
        className="profile-reveal-photo absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: 'top center' }}
        draggable={false}
        loading="lazy"
      />
    </div>
  )
}
