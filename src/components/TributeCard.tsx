import type { PublicTribute } from '../lib/api/schemas'
import { preview } from '../lib/format'
import { TributeAvatar } from './TributeAvatar'
import type { OriginRect } from './TributeReader'

export function TributeCard({
  tribute,
  onRead,
}: {
  tribute: PublicTribute
  onRead: (tribute: PublicTribute, origin: OriginRect) => void
}) {
  return (
    <article className="card flex h-full flex-col p-6 transition-shadow duration-[var(--duration-base)] hover:shadow-md">
      <header className="flex items-center gap-3">
        <TributeAvatar tribute={tribute} />
        <div className="min-w-0">
          <h3 className="truncate text-xl">{tribute.fullName}</h3>
          <p className="eyebrow truncate">{tribute.relationshipLabel}</p>
        </div>
      </header>
      <p className="mt-4 flex-1 text-ink-soft">{preview(tribute.tributeText, 220)}</p>
      <div className="mt-5">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          aria-label={`Read more: tribute from ${tribute.fullName}`}
          onClick={(e) => {
            const r = e.currentTarget.closest('article')?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect()
            onRead(tribute, { x: r.x, y: r.y, width: r.width, height: r.height })
          }}
        >
          Read more
        </button>
      </div>
    </article>
  )
}
