import { useId } from 'react'
import { initials } from '../lib/format'

/**
 * Generated placeholder portrait. Used until the family supplies a real photograph
 * (config portrait from the API, or `public/assets/` — see public/assets/README.md).
 * A quiet arched frame, soft light and a pressed-botanical sprig; deliberately not a face.
 */
export function PortraitArt({
  name,
  label,
  className,
}: {
  name: string
  label?: string
  className?: string
}) {
  const uid = useId().replace(/:/g, '')
  return (
    <svg
      viewBox="0 0 400 520"
      className={className}
      role="img"
      aria-label={label ?? `Placeholder portrait for ${name}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efe5d0" />
          <stop offset="0.6" stopColor="#e5d8bd" />
          <stop offset="1" stopColor="#d3c2a0" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.38" r="0.55">
          <stop offset="0" stopColor="#fbf6ea" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fbf6ea" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>
          <path d="M20 520V200C20 100 100 20 200 20s180 80 180 180v320z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-clip)`}>
        <rect width="400" height="520" fill={`url(#${uid}-bg)`} />
        <rect width="400" height="520" fill={`url(#${uid}-glow)`} />
        {/* soft hills */}
        <path d="M0 430c70-34 140-44 200-30s150 12 200-18v138H0z" fill="#b9a781" opacity="0.35" />
        <path d="M0 470c80-22 160-26 230-12s120 6 170-10v72H0z" fill="#8f7b57" opacity="0.28" />
        {/* sprig */}
        <g fill="none" stroke="#7c6a47" strokeWidth="2" strokeLinecap="round" opacity="0.7">
          <path d="M310 470C300 400 296 340 318 270" />
          <path d="M305 430c-20-8-30-24-30-42 20 4 32 20 30 42Z" fill="#a7a37f" fillOpacity="0.55" />
          <path d="M303 395c20-10 34-26 36-46-22 6-36 22-36 46Z" fill="#a7a37f" fillOpacity="0.55" />
          <path d="M308 355c-18-8-28-22-28-40 18 4 30 18 28 40Z" fill="#a7a37f" fillOpacity="0.55" />
          <path d="M314 315c16-10 26-24 28-42-18 6-30 20-28 42Z" fill="#a7a37f" fillOpacity="0.55" />
        </g>
        {/* monogram cameo */}
        <circle cx="200" cy="232" r="74" fill="#fbf6ea" opacity="0.7" />
        <circle cx="200" cy="232" r="74" fill="none" stroke="#c4aa78" strokeWidth="1.5" />
        <circle cx="200" cy="232" r="66" fill="none" stroke="#c4aa78" strokeWidth="0.75" opacity="0.7" />
        <text
          x="200"
          y="248"
          textAnchor="middle"
          fontFamily="'Cormorant Garamond', Georgia, serif"
          fontSize="52"
          fontWeight="600"
          fill="#5e4630"
        >
          {initials(name)}
        </text>
      </g>
      <path
        d="M20 520V200C20 100 100 20 200 20s180 80 180 180v320z"
        fill="none"
        stroke="#c4aa78"
        strokeWidth="2"
      />
    </svg>
  )
}
