import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react'
import { useModalBehavior } from '../components/useFocusTrap'
import { EmptyState, ErrorNotice, LoadingBlock, PageHeading } from '../components/ui/States'
import type { GalleryItem } from '../lib/api/schemas'
import { useConfig, useGallery } from '../lib/queries'

function Lightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: GalleryItem[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  useModalBehavior(ref, { active: true, onClose, initialFocus: closeRef })
  const item = items[index]!
  const go = (d: number) => onIndex((index + d + items.length) % items.length)
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(1)
    if (e.key === 'ArrowLeft') go(-1)
  })
  useEffect(() => {
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgb(35_29_23/0.9)] p-3 sm:p-8">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={`Gallery photo ${index + 1} of ${items.length}`}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-5xl flex-col items-center"
      >
        <div className="mb-3 flex w-full items-center justify-between text-ivory-100">
          <p className="text-sm">
            {index + 1} / {items.length}
          </p>
          <button ref={closeRef} type="button" className="btn btn-sm border-ivory-100/40 text-ivory-100 hover:bg-white/10" onClick={onClose}>
            <X size={16} aria-hidden="true" /> Close
          </button>
        </div>
        <div className="relative flex w-full items-center justify-center">
          {items.length > 1 && (
            <button
              type="button"
              aria-label="Previous photo"
              className="btn absolute left-0 z-10 h-11 w-11 rounded-full bg-ivory-50/90 p-0 text-wood-900 sm:-left-14"
              onClick={() => go(-1)}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
          )}
          {item.mediaType === 'video' ? (
            <video
              key={item.id}
              src={item.url ?? undefined}
              controls
              preload="metadata"
              className="max-h-[72vh] w-auto max-w-full rounded-lg"
              aria-label={item.altText || 'Family video'}
            />
          ) : (
            <img
              key={item.id}
              src={item.url ?? undefined}
              alt={item.altText}
              className="max-h-[72vh] w-auto max-w-full rounded-lg object-contain shadow-lg"
            />
          )}
          {items.length > 1 && (
            <button
              type="button"
              aria-label="Next photo"
              className="btn absolute right-0 z-10 h-11 w-11 rounded-full bg-ivory-50/90 p-0 text-wood-900 sm:-right-14"
              onClick={() => go(1)}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          )}
        </div>
        {(item.caption || item.altText) && (
          <p className="mt-4 max-w-2xl text-center text-ivory-100">{item.caption || item.altText}</p>
        )}
      </div>
    </div>
  )
}

export default function GalleryPage() {
  const config = useConfig()
  const gallery = useGallery()
  const [open, setOpen] = useState<number | null>(null)
  const items = (gallery.data ?? []).filter((i) => i.url)
  const disabled = config.data && !config.data.gallery.enabled

  return (
    <div className="container-page py-14 md:py-20">
      <PageHeading eyebrow="Gallery" title="Moments, kept">
        <p>Photographs and films the family has chosen to share.</p>
      </PageHeading>

      <div className="mt-12">
        {gallery.isPending ? (
          <LoadingBlock label="Loading gallery" lines={4} />
        ) : gallery.isError ? (
          <ErrorNotice title="The gallery could not be loaded." error={gallery.error} onRetry={() => void gallery.refetch()} />
        ) : disabled || items.length === 0 ? (
          <EmptyState title="The gallery is still being gathered">
            <p>Photographs will appear here as the family adds them. Please check back soon.</p>
          </EmptyState>
        ) : (
          <ul className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>li]:mb-5">
            {items.map((item, i) => (
              <li key={item.id} className="break-inside-avoid">
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  className="group relative block w-full overflow-hidden rounded-lg border border-line bg-ivory-200 p-0 shadow-sm transition-shadow hover:shadow-md"
                  aria-label={`Open ${item.mediaType === 'video' ? 'video' : 'photo'}: ${item.altText || item.caption || `item ${i + 1}`}`}
                >
                  {item.mediaType === 'video' ? (
                    <span
                      className="flex aspect-video w-full items-center justify-center bg-wood-700 text-ivory-50"
                      aria-hidden="true"
                    >
                      <Play size={36} />
                    </span>
                  ) : (
                    <img
                      src={item.url ?? undefined}
                      alt={item.altText}
                      loading="lazy"
                      width={item.width ?? undefined}
                      height={item.height ?? undefined}
                      className="h-auto w-full transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.02]"
                    />
                  )}
                </button>
                {item.caption && <p className="field-hint mt-2">{item.caption}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {open !== null && items[open] && (
        <Lightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      )}
    </div>
  )
}
