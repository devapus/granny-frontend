import { useState } from 'react'
import type { PublicTribute } from '../lib/api/schemas'
import { initials, tributePhoto } from '../lib/format'

/** Contributor photo when permitted and available, otherwise a quiet monogram. */
export function TributeAvatar({ tribute, size = 48 }: { tribute: PublicTribute; size?: number }) {
  const photo = tributePhoto(tribute)
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size, fontSize: size * 0.4 }
  if (photo?.url && !failed) {
    return (
      <img
        src={photo.url}
        alt={photo.altText || ''}
        loading="lazy"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full border border-champagne-300 object-cover"
        style={style}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-champagne-500 bg-ivory-200 font-serif font-semibold text-wood-700"
      style={style}
    >
      {initials(tribute.fullName)}
    </span>
  )
}
