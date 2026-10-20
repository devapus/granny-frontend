import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '../../components/ui/States'
import { createGalleryItem, patchAdminConfig } from '../../lib/api/admin'
import { isApiError } from '../../lib/api/client'
import { uploadMedia, type UploadCategory } from '../../lib/api/public'
import { AdminHeading, Field } from './shared'

type Target = 'gallery' | 'portrait'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime'

export default function AdminMedia() {
  const qc = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [target, setTarget] = useState<Target>('gallery')
  const [category, setCategory] = useState<'gallery_family' | 'gallery_featured'>('gallery_family')
  const [alt, setAlt] = useState('')
  const [caption, setCaption] = useState('')
  const [done, setDone] = useState<string | null>(null)

  const isVideo = file?.type.startsWith('video/') ?? false

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose a file first.')
      const uploadCategory: UploadCategory = target === 'portrait' ? 'other' : isVideo ? 'gallery_video' : category
      const mediaId = await uploadMedia({ file, category: uploadCategory, altText: alt, caption, admin: true })
      if (target === 'portrait') {
        await patchAdminConfig({ portraitMediaId: mediaId })
      } else {
        await createGalleryItem({
          mediaId,
          altText: alt.trim(),
          caption: caption.trim() || undefined,
          category: isVideo ? 'gallery_video' : category,
          visibility: 'public',
        })
      }
      return mediaId
    },
    onSuccess: () => {
      setDone(target === 'portrait' ? 'The memorial portrait has been updated.' : 'Added to the gallery.')
      setFile(null)
      setAlt('')
      setCaption('')
      void qc.invalidateQueries({ queryKey: ['admin'] })
      void qc.invalidateQueries({ queryKey: ['public'] })
    },
  })

  const storageDown = isApiError(upload.error) && upload.error.isStorageUnavailable

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
        <Field label="File (JPEG, PNG, WebP, AVIF — or MP4/WebM/MOV for gallery)" htmlFor="media-file">
          <input
            id="media-file"
            type="file"
            required
            accept={target === 'portrait' ? 'image/jpeg,image/png,image/webp,image/avif' : ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        {target === 'gallery' && !isVideo && (
          <Field label="Gallery section" htmlFor="media-cat">
            <select id="media-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              <option value="gallery_family">Family</option>
              <option value="gallery_featured">Featured</option>
            </select>
          </Field>
        )}
        <Field label="Alt text (describe the image for screen readers)" htmlFor="media-alt" hint={target === 'gallery' ? 'Required for gallery items.' : undefined}>
          <input id="media-alt" className="input" value={alt} onChange={(e) => setAlt(e.target.value)} required={target === 'gallery'} />
        </Field>
        {target === 'gallery' && (
          <Field label="Caption (optional)" htmlFor="media-caption">
            <input id="media-caption" className="input" value={caption} onChange={(e) => setCaption(e.target.value)} />
          </Field>
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
        <button type="submit" className="btn btn-primary" disabled={upload.isPending || !file}>
          {upload.isPending ? 'Uploading…' : 'Upload'}
        </button>
      </form>
    </div>
  )
}
