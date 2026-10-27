import { useRef, useState, startTransition } from 'react'
import { Link } from 'react-router'
import { CheckCircle2 } from 'lucide-react'
import { PhotoPicker } from '../components/PhotoPicker'
import { ErrorNotice, LoadingBlock, PageHeading } from '../components/ui/States'
import { ApiError, isApiError } from '../lib/api/client'
import { submitTribute, uploadMedia } from '../lib/api/public'
import { useConfig } from '../lib/queries'
import {
  CATEGORY_REQUIRING_CUSTOM_TEXT,
  CUSTOM_RELATIONSHIP_MAX,
  DEFAULT_LIMITS,
  FULL_NAME_MAX,
  validatePhoto,
  validateTribute,
  type TributeFormErrors,
} from '../lib/tributeForm'

export const SUCCESS_MESSAGE =
  'Thank you for sharing your memories. Your tribute has been received and will appear in the memorial after review.'

function newSubmissionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // RFC 4122 v4 fallback for very old browsers / insecure contexts.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16)
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

interface Values {
  fullName: string
  email: string
  relationshipCategory: string
  customRelationship: string
  tributeText: string
  photoDisplayPermission: boolean
  acknowledgment: boolean
}
const EMPTY: Values = {
  fullName: '',
  email: '',
  relationshipCategory: '',
  customRelationship: '',
  tributeText: '',
  photoDisplayPermission: false,
  acknowledgment: false,
}

type Slot = 'contributor' | 'grandmother'
interface Uploaded {
  file: File
  mediaId: string
}

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting'; step: string }
  | { kind: 'success' }
  | { kind: 'error'; message: string; recoverable: boolean }

const FIELD_IDS: Record<keyof Values, string> = {
  fullName: 'fullName',
  email: 'email',
  relationshipCategory: 'relationshipCategory',
  customRelationship: 'customRelationship',
  tributeText: 'tributeText',
  photoDisplayPermission: 'photoDisplayPermission',
  acknowledgment: 'acknowledgment',
}

export default function SubmitPage() {
  const config = useConfig()
  const limits = config.data?.tributeLimits ?? DEFAULT_LIMITS
  const categories = [...(config.data?.relationshipCategories ?? [])].sort((a, b) => a.order - b.order)

  const [values, setValues] = useState<Values>(EMPTY)
  const [errors, setErrors] = useState<TributeFormErrors>({})
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [files, setFiles] = useState<Record<Slot, File | null>>({ contributor: null, grandmother: null })
  const [photoErrors, setPhotoErrors] = useState<Record<Slot, string | null>>({ contributor: null, grandmother: null })
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  // Generated once per form session; deliberately kept across retries so the server can de-duplicate.
  const [submissionId, setSubmissionId] = useState(newSubmissionId)
  const uploaded = useRef<Partial<Record<Slot, Uploaded>>>({})
  const statusRef = useRef<HTMLDivElement>(null)

  const submitting = status.kind === 'submitting'
  const length = values.tributeText.trim().length
  const progress = Math.min(100, Math.round((length / limits.minLength) * 100))
  const needsCustom = values.relationshipCategory === CATEGORY_REQUIRING_CUSTOM_TEXT

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
    if (status.kind === 'error') setStatus({ kind: 'idle' })
  }

  const setFile = (slot: Slot, file: File | null) => {
    setPhotoErrors((p) => ({ ...p, [slot]: file ? validatePhoto(file) : null }))
    setFiles((f) => ({ ...f, [slot]: file && !validatePhoto(file) ? file : null }))
    setStorageUnavailable(false)
  }

  const send = async (skipPhotos: boolean) => {
    const result = validateTribute(values, limits, categories.map((c) => c.id))
    if (!result.ok) {
      setErrors(result.errors)
      const first = (Object.keys(FIELD_IDS) as (keyof Values)[]).find((k) => result.errors[k])
      if (first) document.getElementById(FIELD_IDS[first])?.focus()
      return
    }
    setErrors({})
    setStatus({ kind: 'submitting', step: 'Sending your tribute…' })

    try {
      const mediaIds: Partial<Record<Slot, string>> = {}
      if (!skipPhotos) {
        for (const slot of ['contributor', 'grandmother'] as const) {
          const file = files[slot]
          if (!file) continue
          const prior = uploaded.current[slot]
          if (prior && prior.file === file) {
            mediaIds[slot] = prior.mediaId
            continue
          }
          setStatus({ kind: 'submitting', step: 'Uploading photos…' })
          const mediaId = await uploadMedia({
            file,
            category: slot === 'contributor' ? 'tribute_contributor' : 'tribute_grandmother',
            altText: slot === 'contributor' ? `Photo of ${result.data.fullName}` : `${result.data.fullName} with her`,
          })
          uploaded.current[slot] = { file, mediaId }
          mediaIds[slot] = mediaId
        }
      }

      setStatus({ kind: 'submitting', step: 'Sending your tribute…' })
      await submitTribute(
        {
          submissionId,
          fullName: result.data.fullName,
          email: result.data.email,
          relationshipCategory: result.data.relationshipCategory,
          customRelationship: needsCustom ? result.data.customRelationship : undefined,
          tributeText: result.data.tributeText,
          contributorPhotoMediaId: mediaIds.contributor ?? null,
          grandmotherPhotoMediaId: mediaIds.grandmother ?? null,
          photoDisplayPermission: Boolean(mediaIds.contributor || mediaIds.grandmother) && result.data.photoDisplayPermission,
          acknowledgment: true,
        },
        submissionId,
      )
      startTransition(() => {
        setValues(EMPTY)
        setFiles({ contributor: null, grandmother: null })
        uploaded.current = {}
        setStatus({ kind: 'success' })
      })
      requestAnimationFrame(() => statusRef.current?.focus())
    } catch (e) {
      if (isApiError(e) && e.isStorageUnavailable) {
        setStorageUnavailable(true)
        setStatus({ kind: 'idle' })
        return
      }
      const err = e instanceof ApiError ? e : new ApiError(0, 'NETWORK_ERROR', 'Something went wrong. Please try again.')
      if (err.status === 409) {
        // Same submission key but different content: start a fresh key; nothing the user typed is lost.
        setSubmissionId(newSubmissionId())
        setStatus({
          kind: 'error',
          recoverable: true,
          message:
            'An earlier attempt with different wording was already received. Your text is still here — press Submit again to send this version.',
        })
        return
      }
      if (err.details?.length) {
        const mapped: TributeFormErrors = {}
        for (const d of err.details) {
          const key = d.path as keyof Values
          if (key in FIELD_IDS && !mapped[key]) mapped[key] = d.message
        }
        if (Object.keys(mapped).length) setErrors(mapped)
      }
      setStatus({
        kind: 'error',
        recoverable: err.isRecoverable,
        message: err.isRecoverable
          ? `${err.message} Nothing you wrote has been lost — you can try again.`
          : err.message,
      })
    }
  }

  const onSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (submitting) return
    void send(false)
  }

  // ------------------------------------------------------------ render
  if (status.kind === 'success') {
    return (
      <div className="container-page max-w-2xl py-12 sm:py-20">
        <div
          ref={statusRef}
          tabIndex={-1}
          role="status"
          className="card p-6 text-center outline-none sm:p-12"
        >
          <CheckCircle2 className="mx-auto text-sage-500" size={40} aria-hidden="true" />
          <h1 className="mt-4 text-3xl sm:text-4xl">Thank you</h1>
          <p className="mt-4 text-base text-ink-soft sm:text-lg">{SUCCESS_MESSAGE}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link to="/tributes" className="btn btn-primary w-full sm:w-auto">
              Read other tributes
            </Link>
            <button
              type="button"
              className="btn btn-secondary w-full sm:w-auto"
              onClick={() => {
                setSubmissionId(newSubmissionId())
                setStatus({ kind: 'idle' })
              }}
            >
              Share another memory
            </button>
          </div>
        </div>
      </div>
    )
  }

  const closed = config.data && !config.data.tributeSubmissionsOpen

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14 md:py-20">
      <PageHeading eyebrow="Leave a tribute" title="Share a memory">
        <p>
          A story, a kindness, a moment you’ll always remember. The family reads every tribute before it appears
          in the memorial.
        </p>
      </PageHeading>

      <div className="mt-8 min-w-0 sm:mt-10">
        {config.isPending ? (
          <LoadingBlock label="Loading form" lines={4} />
        ) : config.isError ? (
          <ErrorNotice title="The form could not be loaded." error={config.error} onRetry={() => void config.refetch()} />
        ) : closed ? (
          <div className="notice" role="status">
            <p className="font-semibold">Tributes are not being accepted right now.</p>
            <p className="mt-1">Thank you for your kindness. Please check back later, or read the tributes already shared.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="card min-w-0 space-y-6 p-4 sm:space-y-7 sm:p-8 md:p-10" aria-label="Tribute form">
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
              <div className="min-w-0">
                <label htmlFor="fullName" className="field-label">
                  Your name
                </label>
                <input
                  id="fullName"
                  className="input"
                  autoComplete="name"
                  maxLength={FULL_NAME_MAX + 20}
                  value={values.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                  aria-invalid={errors.fullName ? true : undefined}
                  aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                  required
                />
                {errors.fullName && (
                  <p id="fullName-error" className="field-error" role="alert">
                    {errors.fullName}
                  </p>
                )}
              </div>
              <div className="min-w-0">
                <label htmlFor="email" className="field-label">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  autoComplete="email"
                  value={values.email}
                  onChange={(e) => set('email', e.target.value)}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? 'email-error email-hint' : 'email-hint'}
                  required
                />
                <p id="email-hint" className="field-hint mt-1">
                  Kept private. Only the family sees it, to follow up if needed.
                </p>
                {errors.email && (
                  <p id="email-error" className="field-error" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
              <div className="min-w-0">
                <label htmlFor="relationshipCategory" className="field-label">
                  How did you know her?
                </label>
                <select
                  id="relationshipCategory"
                  className="input"
                  value={values.relationshipCategory}
                  onChange={(e) => set('relationshipCategory', e.target.value)}
                  aria-invalid={errors.relationshipCategory ? true : undefined}
                  aria-describedby={errors.relationshipCategory ? 'relationshipCategory-error' : undefined}
                  required
                >
                  <option value="">Choose one…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.relationshipCategory && (
                  <p id="relationshipCategory-error" className="field-error" role="alert">
                    {errors.relationshipCategory}
                  </p>
                )}
              </div>
              {needsCustom && (
                <div className="min-w-0">
                  <label htmlFor="customRelationship" className="field-label">
                    Tell us how you knew her
                  </label>
                  <input
                    id="customRelationship"
                    className="input"
                    maxLength={CUSTOM_RELATIONSHIP_MAX + 20}
                    value={values.customRelationship}
                    onChange={(e) => set('customRelationship', e.target.value)}
                    aria-invalid={errors.customRelationship ? true : undefined}
                    aria-describedby={errors.customRelationship ? 'customRelationship-error' : undefined}
                    placeholder="e.g. Her piano student"
                  />
                  {errors.customRelationship && (
                    <p id="customRelationship-error" className="field-error" role="alert">
                      {errors.customRelationship}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <label htmlFor="tributeText" className="field-label">
                Your tribute
              </label>
              <textarea
                id="tributeText"
                className="input"
                value={values.tributeText}
                onChange={(e) => set('tributeText', e.target.value)}
                aria-invalid={errors.tributeText ? true : undefined}
                aria-describedby={`tributeText-count${errors.tributeText ? ' tributeText-error' : ''}`}
                required
              />
              <div
                className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                id="tributeText-count"
              >
                <div
                  className="h-1.5 w-full min-w-0 flex-1 overflow-hidden rounded-full bg-ivory-200"
                  role="progressbar"
                  aria-label="Progress toward the minimum tribute length"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div
                    className="h-full rounded-full bg-bronze-500 transition-[width] duration-[var(--duration-base)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="field-hint shrink-0 sm:text-right" aria-live="polite">
                  {length < limits.minLength
                    ? `${length} / ${limits.minLength} minimum`
                    : `${length.toLocaleString()} / ${limits.maxLength.toLocaleString()} characters`}
                </p>
              </div>
              {errors.tributeText && (
                <p id="tributeText-error" className="field-error" role="alert">
                  {errors.tributeText}
                </p>
              )}
            </div>

            <fieldset className="min-w-0 space-y-5 rounded-lg border border-line p-4 sm:space-y-6 sm:p-5">
              <legend className="px-1 font-serif text-lg text-wood-900 sm:px-2 sm:text-xl">Photographs</legend>
              <p className="field-hint">
                Optional. If you have a photo of yourself, or one with her, you’re welcome to share it.
              </p>
              <PhotoPicker
                id="photo-with-her"
                label="A photo with her"
                file={files.grandmother}
                onChange={(f) => setFile('grandmother', f)}
                error={photoErrors.grandmother}
                disabled={submitting}
              />
              <PhotoPicker
                id="photo-of-you"
                label="A photo of you"
                file={files.contributor}
                onChange={(f) => setFile('contributor', f)}
                error={photoErrors.contributor}
                disabled={submitting}
              />
              <label className="flex items-start gap-3 text-sm text-ink-soft">
                <input
                  id="photoDisplayPermission"
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-bronze-500)]"
                  checked={values.photoDisplayPermission}
                  onChange={(e) => set('photoDisplayPermission', e.target.checked)}
                />
                <span className="min-w-0">You may display my photograph(s) alongside my tribute in the memorial.</span>
              </label>
              {storageUnavailable && (
                <div role="alert" className="notice">
                  <p className="font-semibold">Photo uploads aren’t available right now.</p>
                  <p className="mt-1">
                    Your tribute is safe. You can send it without photographs, or try again a little later.
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm mt-3 w-full sm:w-auto"
                    disabled={submitting}
                    onClick={() => {
                      setFiles({ contributor: null, grandmother: null })
                      setStorageUnavailable(false)
                      void send(true)
                    }}
                  >
                    Submit without photos
                  </button>
                </div>
              )}
            </fieldset>

            <div className="min-w-0">
              <label className="flex items-start gap-3 text-sm text-ink-soft">
                <input
                  id="acknowledgment"
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-bronze-500)]"
                  checked={values.acknowledgment}
                  onChange={(e) => set('acknowledgment', e.target.checked)}
                  aria-invalid={errors.acknowledgment ? true : undefined}
                  aria-describedby={errors.acknowledgment ? 'acknowledgment-error' : undefined}
                />
                <span className="min-w-0">
                  I understand my tribute will be reviewed by the family before it is published, and that my name
                  and words may be shown publicly. My email address will stay private.
                </span>
              </label>
              {errors.acknowledgment && (
                <p id="acknowledgment-error" className="field-error" role="alert">
                  {errors.acknowledgment}
                </p>
              )}
            </div>

            {status.kind === 'error' && (
              <div role="alert" className="notice notice-error break-words">
                {status.message}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={submitting}>
                {submitting ? status.step : status.kind === 'error' && status.recoverable ? 'Try again' : 'Submit tribute'}
              </button>
              <p className="field-hint text-center sm:text-left">Your tribute won’t appear until it has been reviewed.</p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
