import { useId, useRef, type ReactNode } from 'react'
import { useModalBehavior } from '../useFocusTrap'

/** Confirmation for destructive/irreversible admin actions. Escape or Cancel dismisses. */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  danger,
  busy,
  error,
  onConfirm,
  onCancel,
  children,
}: {
  title: string
  description: ReactNode
  confirmLabel: string
  danger?: boolean
  busy?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
  children?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const id = useId()
  useModalBehavior(ref, { active: true, onClose: onCancel, initialFocus: cancelRef })

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgb(45_38_31/0.5)]" onClick={onCancel} aria-hidden="true" />
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
        tabIndex={-1}
        className="card relative w-full max-w-md p-6 shadow-lg"
      >
        <h2 id={`${id}-title`} className="text-2xl">
          {title}
        </h2>
        <div id={`${id}-desc`} className="mt-2 text-ink-soft">
          {description}
        </div>
        {children}
        {error && (
          <p role="alert" className="notice notice-error mt-4">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button ref={cancelRef} type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
