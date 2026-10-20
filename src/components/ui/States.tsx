import type { ReactNode } from 'react'
import { isApiError } from '../../lib/api/client'

export function LoadingBlock({ label = 'Loading…', lines = 3 }: { label?: string; lines?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton h-5" style={{ width: `${92 - i * 14}%` }} />
      ))}
    </div>
  )
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (isApiError(error)) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function ErrorNotice({
  title = 'We could not load this.',
  error,
  onRetry,
}: {
  title?: string
  error?: unknown
  onRetry?: () => void
}) {
  return (
    <div role="alert" className="notice notice-error">
      <p className="font-semibold">{title}</p>
      {error ? <p className="mt-1">{errorMessage(error)}</p> : null}
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong px-6 py-14 text-center">
      <p className="font-serif text-2xl text-wood-900">{title}</p>
      {children ? <div className="mx-auto mt-2 max-w-md text-ink-soft">{children}</div> : null}
    </div>
  )
}

export function PageHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mx-auto max-w-3xl text-center">
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h1 className="text-4xl sm:text-5xl">{title}</h1>
      {children ? <div className="mt-4 text-lg text-ink-soft">{children}</div> : null}
    </header>
  )
}
