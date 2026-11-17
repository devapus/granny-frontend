import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '../../components/ui/States'
import { createGalleryItem, patchAdminConfig } from '../../lib/api/admin'
import { ApiError, isApiError } from '../../lib/api/client'
import { uploadMedia, type UploadCategory } from '../../lib/api/public'
import { AdminHeading, Field } from './shared'

type Target = 'gallery' | 'portrait'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime'
const PORTRAIT_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif'
const MAX_GALLERY_BATCH = 30

function altFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
  return base || 'Photograph'
}

export default function AdminMedia() {
  const qc = useQueryClient()
  const [files, setFiles] = useState<File[]>([])
  const [target, setTarget] = useState<Target>('gallery')
  const [category, setCategory] = useState<'gallery_family' | 'gallery_featured'>('gallery_family')
  const [alt, setAlt] = useState('')
  const [caption, setCaption] = useState('')
  const [done, setDone] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  const primary = files[0] ?? null
  const isVideo = primary?.type.startsWith('video/') ?? false
  const multiGallery = target === 'gallery' && files.length > 1

  const upload = useMutation({
    mutationFn: async () => {
      if (target === 'portrait') {
        if (!primary) throw new Error('Choose a file first.')
        const mediaId = await uploadMedia({ file: primary, category: 'other', altText: alt, caption, admin: true })
        await patchAdminConfig({ portraitMediaId: mediaId })
        return { uploaded: 1, failed: [] as { name: string; message: string }[] }
      }

      if (files.length === 0) throw new Error('Choose at least one file.')
      if (files.length > MAX_GALLERY_BATCH) {
        throw new Error(`You can upload at most ${MAX_GALLERY_BATCH} files at once.`)
      }
      if (files.length === 1 && target === 'gallery' && !alt.trim()) {
        throw new Error('Alt text is required for a single gallery upload.')
      }

      const failed: { name: string; message: string }[] = []
      let uploaded = 0
      const sharedCaption = caption.trim() || undefined
      setProgress({ current: 0, total: files.length })

      for (let i = 0; i < files.length; i++) {
        const file = files[i]!
        setProgress({ current: i + 1, total: files.length })
        const isVid = file.type.startsWith('video/')
        const uploadCategory: UploadCategory = isVid ? 'gallery_video' : category
        const altText =
          files.length === 1 && alt.trim()
            ? alt.trim()
            : alt.trim()
              ? `${alt.trim()} — ${altFromFilename(file.name)}`
              : altFromFilename(file.name)

        try {
          const mediaId = await uploadMedia({
            file,
            category: uploadCategory,
            altText,
            caption: sharedCaption,
            admin: true,
          })
          await createGalleryItem({
            mediaId,
            altText,
            caption: sharedCaption,
            category: isVid ? 'gallery_video' : category,
            visibility: 'public',
          })
          uploaded++
        } catch (e) {
          const message = e instanceof ApiError || e instanceof Error ? errorMessage(e) : 'Upload failed'
          failed.push({ name: file.name, message })
        }
      }

      setProgress(null)
      if (uploaded === 0 && failed.length > 0) {
        throw new Error(failed.map((f) => `${f.name}: ${f.message}`).join('; '))
      }
      return { uploaded, failed }
    },
    onSuccess: (result) => {
      if (target === 'portrait') {
        setDone('The memorial portrait has been updated.')
      } else if (result.failed.length === 0) {
        setDone(
          result.uploaded === 1 ? 'Added to the gallery.' : `${result.uploaded} items added to the gallery.`,
        )
      } else {
        setDone(
          `${result.uploaded} uploaded. ${result.failed.length} failed: ${result.failed.map((f) => f.name).join(', ')}.`,
        )
      }
      setFiles([])
      setAlt('')
      setCaption('')
      setProgress(null)
      void qc.invalidateQueries({ queryKey: ['admin'] })
      void qc.invalidateQueries({ queryKey: ['public'] })
    },
    onError: () => {
      setProgress(null)
    },
  })

  const storageDown = isApiError(upload.error) && upload.error.isStorageUnavailable

  const onPickFiles = (list: FileList | null) => {
    if (!list?.length) {
      setFiles([])
      return
    }
    if (target === 'portrait') {
      setFiles(list[0] ? [list[0]] : [])
      return
    }
    setFiles(Array.from(list).slice(0, MAX_GALLERY_BATCH))
  }

  return (
    <div>
      <AdminHeading title="Media upload" />
      <form
        className="card max-w-2xl space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault()
          setDone(null)
          upload.mutate()
        }}
      >
        <fieldset>
          <legend className="field-label">Use this file as</legend>
          <div className="flex gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="target" checked={target === 'gallery'} onChange={() => setTarget('gallery')} /> Gallery item
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="target" checked={target === 'portrait'} onChange={() => setTarget('portrait')} /> Memorial portrait
            </label>
          </div>
        </fieldset>
        <Field
          label={
            target === 'gallery'
              ? `Files (JPEG, PNG, WebP, AVIF — or MP4/WebM/MOV; up to ${MAX_GALLERY_BATCH} at once)`
              : 'File (JPEG, PNG, WebP, AVIF)'
          }
          htmlFor="media-file"
        >
          <input
            id="media-file"
            type="file"
            required
            multiple={target === 'gallery'}
            accept={target === 'portrait' ? PORTRAIT_ACCEPT : ACCEPT}
            onChange={(e) => onPickFiles(e.target.files)}
          />
          {target === 'gallery' && files.length > 0 && (
            <p className="field-hint mt-2" aria-live="polite">
              {files.length} file{files.length === 1 ? '' : 's'} selected
              {files.length >= MAX_GALLERY_BATCH ? ` (maximum ${MAX_GALLERY_BATCH})` : ''}
            </p>
          )}
        </Field>
        {target === 'gallery' && !isVideo && (
          <Field label="Gallery section" htmlFor="media-cat">
            <select id="media-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              <option value="gallery_family">Family</option>
              <option value="gallery_featured">Featured</option>
            </select>
          </Field>
        )}
        <Field
          label="Alt text (describe the image for screen readers)"
          htmlFor="media-alt"
          hint={
            multiGallery
              ? 'Optional prefix for all files; each file also gets a name from its filename. Edit alt text later in Gallery if needed.'
              : target === 'gallery'
                ? 'Required for a single gallery upload.'
                : undefined
          }
        >
          <input
            id="media-alt"
            className="input"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            required={target === 'gallery' && files.length <= 1}
          />
        </Field>
        {target === 'gallery' && (
          <Field label="Caption (optional, applied to each file in a batch)" htmlFor="media-caption">
            <input id="media-caption" className="input" value={caption} onChange={(e) => setCaption(e.target.value)} />
          </Field>
        )}

        {progress && (
          <p className="field-hint" role="status">
            Uploading {progress.current} of {progress.total}…
          </p>
        )}

        {upload.isError &&
          (storageDown ? (
            <p role="alert" className="notice">
              <strong>Storage isn’t configured on the server yet</strong> (Cloudflare R2). Uploads will work once the backend’s R2 settings are in place.
            </p>
          ) : (
            <p role="alert" className="notice notice-error">
              {errorMessage(upload.error)}
            </p>
          ))}
        {done && (
          <p role="status" className="notice notice-success">
            {done}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={upload.isPending || files.length === 0}>
          {upload.isPending
            ? progress
              ? `Uploading ${progress.current}/${progress.total}…`
              : 'Uploading…'
            : files.length > 1
              ? `Upload ${files.length} files`
              : 'Upload'}
        </button>
      </form>
    </div>
  )
}