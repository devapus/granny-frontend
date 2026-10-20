import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState, ErrorNotice, LoadingBlock, errorMessage } from '../../components/ui/States'
import { deleteGalleryItem, listAdminGallery, patchGalleryItem, type GalleryPatchBody } from '../../lib/api/admin'
import type { AdminMedia } from '../../lib/api/schemas'
import { AdminHeading, Field, Pager } from './shared'

type GalleryCategory = NonNullable<GalleryPatchBody['category']>

function GalleryRow({ item, onDelete, onSaved }: { item: AdminMedia; onDelete: () => void; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [alt, setAlt] = useState(item.altText)
  const [caption, setCaption] = useState(item.caption)
  const [visibility, setVisibility] = useState<'public' | 'private'>(item.visibility === 'public' ? 'public' : 'private')
  const [featured, setFeatured] = useState(item.isFeatured)
  const [category, setCategory] = useState(item.category as GalleryCategory)
  const save = useMutation({
    mutationFn: () => patchGalleryItem(item.id, { altText: alt, caption, visibility, isFeatured: featured, category }),
    onSuccess: () => {
      setEditing(false)
      onSaved()
    },
  })
  const id = `g-${item.id}`
  const isVideo = item.mediaType === 'video'
  return (
    <li className="card flex gap-4 p-4">
      {isVideo ? (
        <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-md bg-wood-700 text-xs text-ivory-50">Video</span>
      ) : item.url ? (
        <img src={item.url} alt={item.altText} className="h-24 w-24 shrink-0 rounded-md border border-line object-cover" />
      ) : (
        <span className="h-24 w-24 shrink-0 rounded-md bg-ivory-200" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-wood-900">{item.altText || '(no alt text)'}</p>
        <p className="field-hint">
          {item.category.replace('gallery_', '')} · {item.visibility}
          {item.isFeatured ? ' · featured' : ''}
          {item.deletedAt ? ' · deleted' : ''}
        </p>
        {item.caption && <p className="text-sm text-ink-soft">{item.caption}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary btn-sm" aria-expanded={editing} onClick={() => setEditing((e) => !e)}>
            Edit
          </button>
          <button type="button" className="btn btn-quiet btn-sm text-danger" onClick={onDelete}>
            Delete
          </button>
        </div>
        {editing && (
          <form
            className="mt-4 space-y-3 rounded-lg border border-line bg-ivory-100 p-4"
            onSubmit={(e) => {
              e.preventDefault()
              save.mutate()
            }}
          >
            <Field label="Alt text (describes the image)" htmlFor={`${id}-alt`}>
              <input id={`${id}-alt`} className="input" value={alt} onChange={(e) => setAlt(e.target.value)} required />
            </Field>
            <Field label="Caption" htmlFor={`${id}-cap`}>
              <input id={`${id}-cap`} className="input" value={caption} onChange={(e) => setCaption(e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category" htmlFor={`${id}-cat`}>
                <select id={`${id}-cat`} className="input" value={category} onChange={(e) => setCategory(e.target.value as GalleryCategory)} disabled={isVideo}>
                  <option value="gallery_family">Family</option>
                  <option value="gallery_featured">Featured</option>
                  <option value="gallery_video">Video</option>
                </select>
              </Field>
              <Field label="Visibility" htmlFor={`${id}-vis`}>
                <select id={`${id}-vis`} className="input" value={visibility} onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}>
                  <option value="public">Public</option>
                  <option value="private">Private (hidden)</option>
                </select>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Featured
            </label>
            {save.isError && (
              <p role="alert" className="notice notice-error">
                {errorMessage(save.error)}
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-sm" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}
      </div>
    </li>
  )
}

export default function AdminGallery() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [toDelete, setToDelete] = useState<AdminMedia | null>(null)
  const list = useQuery({
    queryKey: ['admin', 'gallery', page],
    queryFn: () => listAdminGallery({ page, limit: 24 }),
  })
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['admin', 'gallery'] })
  const del = useMutation({
    mutationFn: (id: string) => deleteGalleryItem(id),
    onSuccess: () => {
      setToDelete(null)
      invalidate()
    },
  })

  return (
    <div>
      <AdminHeading title="Gallery">
        <Link to="/admin/media" className="btn btn-primary btn-sm">
          Upload new media
        </Link>
      </AdminHeading>
      {list.isPending ? (
        <LoadingBlock lines={4} />
      ) : list.isError ? (
        <ErrorNotice error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.data.length === 0 ? (
        <EmptyState title="No gallery items yet">
          <p>
            Upload photographs on the <Link to="/admin/media">Media upload</Link> page and they will appear here.
          </p>
        </EmptyState>
      ) : (
        <>
          <ul className="space-y-3">
            {list.data.data.map((item) => (
              <GalleryRow key={item.id} item={item} onDelete={() => setToDelete(item)} onSaved={invalidate} />
            ))}
          </ul>
          <Pager meta={list.data.meta} onPage={setPage} />
        </>
      )}
      {toDelete && (
        <ConfirmDialog
          title="Delete this gallery item?"
          description="It will be removed from the public gallery."
          confirmLabel="Delete"
          danger
          busy={del.isPending}
          error={del.isError ? errorMessage(del.error) : null}
          onConfirm={() => del.mutate(toDelete.id)}
          onCancel={() => {
            setToDelete(null)
            del.reset()
          }}
        />
      )}
    </div>
  )
}
