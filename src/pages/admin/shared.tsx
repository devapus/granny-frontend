import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PageMeta } from '../../lib/api/schemas'

export function AdminHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <h1 className="text-3xl">{title}</h1>
      {children}
    </div>
  )
}

export function Pager({ meta, onPage }: { meta?: PageMeta; onPage: (page: number) => void }) {
  if (!meta || meta.totalPages <= 1) return null
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-3">
      <button type="button" className="btn btn-secondary btn-sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
        <ChevronLeft size={14} aria-hidden="true" /> Previous
      </button>
      <p className="text-sm text-ink-soft" aria-live="polite">
        Page {meta.page} of {meta.totalPages} · {meta.total} total
      </p>
      <button type="button" className="btn btn-secondary btn-sm" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
        Next <ChevronRight size={14} aria-hidden="true" />
      </button>
    </nav>
  )
}

const BADGE: Record<string, string> = {
  pending: 'bg-champagne-300/60 text-bronze-700',
  approved: 'bg-sage-100 text-sage-700',
  rejected: 'bg-danger-soft text-danger',
  removed: 'bg-ivory-300 text-ink-soft',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${BADGE[status] ?? 'bg-ivory-200 text-ink-soft'}`}>
      {status}
    </span>
  )
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {children}
      {hint && <p className="field-hint mt-1">{hint}</p>}
    </div>
  )
}
