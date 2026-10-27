import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { ALLOWED_PHOTO_TYPES } from '../lib/tributeForm'

/** Optional single-photo chooser with an accessible preview and remove action. */
export function PhotoPicker({
  id,
  label,
  hint,
  file,
  onChange,
  error,
  disabled,
}: {
  id: string
  label: string
  hint?: string
  file: File | null
  onChange: (file: File | null) => void
  error?: string | null
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="field-label">
        {label} <span className="font-normal text-ink-mute">(optional)</span>
      </label>
      {hint && (
        <p id={`${id}-hint`} className="field-hint mb-2">
          {hint}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={`Preview of ${label.toLowerCase()}`}
            className="h-20 w-20 shrink-0 rounded-lg border border-line object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-line-strong text-wood-300"
          >
            <ImagePlus />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col items-stretch gap-2 sm:items-start">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={ALLOWED_PHOTO_TYPES.join(',')}
            disabled={disabled}
            aria-describedby={hint ? `${id}-hint` : undefined}
            aria-invalid={error ? true : undefined}
            className="photo-file-input w-full max-w-full text-sm text-ink-soft"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
          {file && (
            <button
              type="button"
              className="btn btn-quiet btn-sm self-start"
              onClick={() => {
                if (inputRef.current) inputRef.current.value = ''
                onChange(null)
              }}
            >
              <X size={14} aria-hidden="true" /> Remove photo
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
