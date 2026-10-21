/**
 * ProfilePhoto — the About portrait in riot dress.
 *
 * Rests as a baked halftone (public/art/profile-halftone.webp: ink/cream dot
 * screen over a cobalt halftone of the city). Clicking or tapping the card
 * toggles the real photograph, slashed in along the tilted axis, and it stays
 * until the next click; hovering peeks it in part way as the hint. The wipe is
 * pure clip-path (`.profile-reveal` in index.css).
 */
import { useState } from 'react'
import * as sfx from '../../style/sfx'

export const PROFILE_HALFTONE = '/art/profile-halftone.webp'
export const PROFILE_PHOTO = '/art/profile.webp'

export default function ProfilePhoto() {
  const [revealed, setRevealed] = useState(false)
  const toggle = () => {
    setRevealed((r) => !r)
    sfx.confirm()
  }

  return (
    <div
      className="profile-reveal absolute inset-0"
      data-revealed={revealed || undefined}
      role="button"
      tabIndex={0}
      aria-pressed={revealed}
      aria-label="Show the original photo"
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() }
      }}
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
