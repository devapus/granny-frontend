import { useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { Link } from 'react-router'
import type { PublicTribute } from '../lib/api/schemas'
import { formatDate } from '../lib/format'
import { useReducedMotion } from '../lib/motion-preference'
import { TributeAvatar } from './TributeAvatar'
import { useModalBehavior } from './useFocusTrap'

export interface OriginRect {
  x: number
  y: number
  width: number
  height: number
}

/** The tribute body shared by the reading window and the standalone tribute page. */
export function TributeBody({ tribute, headingId }: { tribute: PublicTribute; headingId?: string }) {
  const photos = [tribute.contributorPhoto, tribute.grandmotherPhoto].filter(
    (p): p is NonNullable<typeof p> => Boolean(p?.url),
  )
  return (
    <div>
      <header className="flex items-center gap-4">
        <TributeAvatar tribute={tribute} size={64} />
        <div>
          <h2 id={headingId} className="text-3xl leading-tight">
            {tribute.fullName}
          </h2>
          <p className="eyebrow mt-1">{tribute.relationshipLabel}</p>
        </div>
      </header>
      <div className="divider-ornament my-6" aria-hidden="true">
        ✦
      </div>
      <div className="prose-memorial text-ink">{tribute.tributeText}</div>
      {photos.length > 0 && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {photos.map((p) => (
            <li key={p.id}>
              <figure>
                <img
                  src={p.url ?? undefined}
                  alt={p.altText || `Photograph shared by ${tribute.fullName}`}
                  loading="lazy"
                  className="w-full rounded-lg border border-line object-cover shadow-md"
                  style={{ aspectRatio: p.width && p.height ? `${p.width} / ${p.height}` : '4 / 3' }}
                />
                {p.caption && <figcaption className="field-hint mt-2">{p.caption}</figcaption>}
              </figure>
            </li>
          ))}
        </ul>
      )}
      {tribute.publishedAt && (
        <p className="field-hint mt-8">Shared {formatDate(tribute.publishedAt)}</p>
      )}
    </div>
  )
}

function ReaderDialog({
  tribute,
  origin,
  onClose,
}: {
  tribute: PublicTribute
  origin?: OriginRect | null
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const reduced = useReducedMotion()
  useModalBehavior(ref, { active: true, onClose, initialFocus: closeRef })

  const vw = typeof window === 'undefined' ? 1200 : window.innerWidth
  const vh = typeof window === 'undefined' ? 800 : window.innerHeight
  const dialogWidth = Math.min(760, vw - 24)
  const from =
    origin && !reduced
      ? {
          x: origin.x + origin.width / 2 - vw / 2,
          y: origin.y + origin.height / 2 - vh / 2,
          scale: Math.max(0.12, Math.min(0.9, origin.width / dialogWidth)),
          opacity: 0,
        }
      : { x: 0, y: reduced ? 0 : 24, scale: reduced ? 1 : 0.96, opacity: 0 }

  const transition = reduced
    ? { duration: 0 }
    : ({ type: 'spring', stiffness: 260, damping: 30, mass: 0.9 } as const)

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.25 }}
    >
      <div
        className="absolute inset-0 bg-[rgb(45_38_31/0.52)]"
        onClick={onClose}
        aria-hidden="true"
        data-testid="reader-backdrop"
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-title"
        tabIndex={-1}
        className="relative flex max-h-[min(90vh,60rem)] w-full max-w-[760px] flex-col overflow-hidden rounded-xl border border-line bg-ivory-50 shadow-lg"
        initial={from}
        animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
        exit={{ ...from, transition: { ...transition, duration: reduced ? 0 : 0.28 } }}
        transition={transition}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="eyebrow">A tribute</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="btn btn-quiet btn-sm"
            aria-label="Close tribute"
          >
            <X size={16} aria-hidden="true" /> Close
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-7 sm:px-10 sm:py-10">
          <TributeBody tribute={tribute} headingId="reader-title" />
          <p className="mt-8">
            <Link to={`/tributes/${tribute.id}`} className="field-hint underline">
              Open on its own page
            </Link>
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

/**
 * Expanding reading window (macOS-style zoom from the plaque/card, minimises back on close).
 * Renders nothing when `tribute` is null. Escape, focus trap, scroll lock and focus restore included.
 */
export function TributeReader({
  tribute,
  origin,
  onClose,
}: {
  tribute: PublicTribute | null
  origin?: OriginRect | null
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {tribute && <ReaderDialog key={tribute.id} tribute={tribute} origin={origin} onClose={onClose} />}
    </AnimatePresence>
  )
}
