import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState, ErrorNotice, LoadingBlock, errorMessage } from '../../components/ui/States'
import {
  approveTribute,
  listAdminTributes,
  patchAdminTribute,
  rejectTribute,
  removeTribute,
  reorderTributes,
  type AdminTributePatch,
} from '../../lib/api/admin'
import type { AdminTribute, TributeStatus } from '../../lib/api/schemas'
import { formatDateTime } from '../../lib/format'
import { adminConfigQuery } from './queries'
import { AdminHeading, Field, Pager, StatusBadge } from './shared'

type Action = { kind: 'approve' | 'reject' | 'remove'; tribute: AdminTribute }

const TITLES: Record<TributeStatus, string> = {
  pending: 'Pending review',
  approved: 'Approved tributes',
  rejected: 'Rejected tributes',
  removed: 'Removed tributes',
}

function EditForm({
  tribute,
  categories,
  onCancel,
  onSaved,
}: {
  tribute: AdminTribute
  categories: { id: string; name: string }[]
  onCancel: () => void
  onSaved: () => void
}) {
  const [v, setV] = useState({
    fullName: tribute.fullName,
    relationshipCategory: tribute.relationshipCategory,
    customRelationship: tribute.customRelationship ?? '',
    tributeText: tribute.tributeText,
    isFeatured: tribute.isFeatured,
    photoDisplayPermission: tribute.photoDisplayPermission,
    moderationNotes: tribute.moderationNotes,
  })
  const save = useMutation({
    mutationFn: () => {
      const patch: AdminTributePatch = {
        fullName: v.fullName,
        relationshipCategory: v.relationshipCategory,
        customRelationship: v.customRelationship.trim() ? v.customRelationship : null,
        tributeText: v.tributeText,
        isFeatured: v.isFeatured,
        photoDisplayPermission: v.photoDisplayPermission,
        moderationNotes: v.moderationNotes,
      }
      return patchAdminTribute(tribute.id, patch)
    },
    onSuccess: onSaved,
  })
  const id = `edit-${tribute.id}`
  return (
    <form
      className="mt-4 space-y-4 rounded-lg border border-line bg-ivory-100 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
      aria-label={`Edit tribute from ${tribute.fullName}`}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${id}-name`}>
          <input id={`${id}-name`} className="input" value={v.fullName} onChange={(e) => setV({ ...v, fullName: e.target.value })} required />
        </Field>
        <Field label="Relationship" htmlFor={`${id}-cat`}>
          <select id={`${id}-cat`} className="input" value={v.relationshipCategory} onChange={(e) => setV({ ...v, relationshipCategory: e.target.value })}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Custom relationship (for “Other”)" htmlFor={`${id}-custom`}>
        <input id={`${id}-custom`} className="input" value={v.customRelationship} onChange={(e) => setV({ ...v, customRelationship: e.target.value })} />
      </Field>
      <Field label="Tribute text" htmlFor={`${id}-text`}>
        <textarea id={`${id}-text`} className="input" value={v.tributeText} onChange={(e) => setV({ ...v, tributeText: e.target.value })} />
      </Field>
      <Field label="Moderation notes (private)" htmlFor={`${id}-notes`}>
        <textarea id={`${id}-notes`} className="input !min-h-20" value={v.moderationNotes} onChange={(e) => setV({ ...v, moderationNotes: e.target.value })} />
      </Field>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={v.isFeatured} onChange={(e) => setV({ ...v, isFeatured: e.target.checked })} /> Featured
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={v.photoDisplayPermission} onChange={(e) => setV({ ...v, photoDisplayPermission: e.target.checked })} /> Photo display permitted
        </label>
      </div>
      {save.isError && (
        <p role="alert" className="notice notice-error">
          {errorMessage(save.error)}
        </p>
      )}
      <div className="flex gap-3">
        <button type="submit" className="btn btn-primary btn-sm" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function TributeRow({
  t,
  categories,
  onAction,
  onInvalidate,
  reorder,
}: {
  t: AdminTribute
  categories: { id: string; name: string }[]
  onAction: (a: Action) => void
  onInvalidate: () => void
  reorder?: { canUp: boolean; canDown: boolean; up: () => void; down: () => void; busy: boolean }
}) {
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const catName = categories.find((c) => c.id === t.relationshipCategory)?.name ?? t.relationshipCategory
  const long = t.tributeText.length > 320
  const photos = [t.grandmotherPhoto, t.contributorPhoto].filter((p): p is NonNullable<typeof p> => Boolean(p?.url))

  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl">
            {t.fullName} <StatusBadge status={t.status} />
            {t.isFeatured && <span className="ml-2 text-xs font-semibold text-bronze-700">★ Featured</span>}
          </h2>
          <p className="text-sm text-ink-soft">
            <a href={`mailto:${t.email}`}>{t.email}</a> · {catName}
            {t.customRelationship ? ` (${t.customRelationship})` : ''}
          </p>
          <p className="field-hint">Submitted {formatDateTime(t.createdAt)}</p>
        </div>
        {reorder && (
          <div className="flex gap-1" role="group" aria-label={`Reorder ${t.fullName}`}>
            <button type="button" className="btn btn-secondary btn-sm" aria-label={`Move ${t.fullName} up`} disabled={!reorder.canUp || reorder.busy} onClick={reorder.up}>
              <ArrowUp size={14} aria-hidden="true" />
            </button>
            <button type="button" className="btn btn-secondary btn-sm" aria-label={`Move ${t.fullName} down`} disabled={!reorder.canDown || reorder.busy} onClick={reorder.down}>
              <ArrowDown size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      <p className="mt-3 whitespace-pre-line text-ink-soft">{expanded || !long ? t.tributeText : `${t.tributeText.slice(0, 320)}…`}</p>
      {long && (
        <button type="button" className="btn btn-quiet btn-sm -ml-3" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Show less' : 'Show full text'}
        </button>
      )}
      {photos.length > 0 && (
        <ul className="mt-3 flex gap-3">
          {photos.map((p) => (
            <li key={p.id}>
              <img src={p.url ?? undefined} alt={p.altText || 'Submitted photo'} className="h-20 w-20 rounded-md border border-line object-cover" />
            </li>
          ))}
        </ul>
      )}
      {t.photoDisplayPermission === false && photos.length > 0 && (
        <p className="field-hint mt-1">Contributor did not grant permission to display photos publicly.</p>
      )}
      {t.moderationNotes && <p className="notice mt-3 text-sm">Notes: {t.moderationNotes}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {(t.status === 'pending' || t.status === 'rejected') && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onAction({ kind: 'approve', tribute: t })}>
            Approve &amp; publish
          </button>
        )}
        {(t.status === 'pending' || t.status === 'approved') && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onAction({ kind: 'reject', tribute: t })}>
            {t.status === 'approved' ? 'Unpublish' : 'Reject'}
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
          Edit
        </button>
        <button type="button" className="btn btn-quiet btn-sm text-danger" onClick={() => onAction({ kind: 'remove', tribute: t })}>
          Remove
        </button>
      </div>
      {editing && (
        <EditForm
          tribute={t}
          categories={categories}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            onInvalidate()
          }}
        />
      )}
    </li>
  )
}

export default function AdminTributes({ status }: { status: Exclude<TributeStatus, 'removed'> }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [action, setAction] = useState<Action | null>(null)
  const [reason, setReason] = useState('')

  const config = useQuery(adminConfigQuery())
  const categories = config.data?.relationshipCategories ?? []
  // Reordering needs the whole category on one page, sorted by displayOrder.
  const reorderMode = status === 'approved' && Boolean(category)

  const list = useQuery({
    queryKey: ['admin', 'tributes', status, { page: reorderMode ? 1 : page, q: search, category }],
    queryFn: ({ signal }) =>
      listAdminTributes(
        { status, page: reorderMode ? 1 : page, limit: reorderMode ? 100 : 20, q: search || undefined, category: category || undefined },
        signal,
      ),
  })

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['admin', 'tributes'] })

  const act = useMutation({
    mutationFn: (a: Action) =>
      a.kind === 'approve' ? approveTribute(a.tribute.id) : a.kind === 'reject' ? rejectTribute(a.tribute.id, reason.trim() || undefined) : removeTribute(a.tribute.id),
    onSuccess: () => {
      setAction(null)
      setReason('')
      invalidate()
    },
  })

  const order = useMutation({
    mutationFn: (ids: string[]) => reorderTributes(ids, category),
    onSuccess: invalidate,
  })

  const rows = list.data?.data ?? []
  const sorted = reorderMode ? [...rows].sort((a, b) => a.displayOrder - b.displayOrder) : rows

  const move = (index: number, delta: number) => {
    const ids = sorted.map((t) => t.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
    order.mutate(ids)
  }

  const confirmCopy = action && {
    approve: { title: 'Publish this tribute?', body: `${action.tribute.fullName}’s tribute will become visible in the public memorial.`, label: 'Approve & publish', danger: false },
    reject: {
      title: action.tribute.status === 'approved' ? 'Unpublish this tribute?' : 'Reject this tribute?',
      body: `${action.tribute.fullName}’s tribute will not be shown publicly.`,
      label: action.tribute.status === 'approved' ? 'Unpublish' : 'Reject',
      danger: true,
    },
    remove: { title: 'Remove this tribute?', body: `${action.tribute.fullName}’s tribute will be removed from the memorial and the review queues.`, label: 'Remove', danger: true },
  }[action.kind]

  return (
    <div>
      <AdminHeading title={TITLES[status]} />
      <form
        className="mb-6 flex flex-wrap items-end gap-3"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          setPage(1)
          setSearch(q.trim())
        }}
      >
        <Field label="Search name or text" htmlFor="admin-search">
          <input id="admin-search" className="input w-64" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <Field label="Category" htmlFor="admin-category">
          <select id="admin-category" className="input w-52" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" className="btn btn-secondary">
          Search
        </button>
      </form>
      {status === 'approved' && (
        <p className="field-hint mb-4">Choose a single category to reorder its tributes. The order is how they appear on the memorial walls.</p>
      )}
      {order.isError && <ErrorNotice title="The order could not be saved." error={order.error} />}

      {list.isPending ? (
        <LoadingBlock lines={4} />
      ) : list.isError ? (
        <ErrorNotice error={list.error} onRetry={() => void list.refetch()} />
      ) : sorted.length === 0 ? (
        <EmptyState title="Nothing here">
          <p>No {status} tributes{search ? ` matching “${search}”` : ''}.</p>
        </EmptyState>
      ) : (
        <>
          <ul className="space-y-4">
            {sorted.map((t, i) => (
              <TributeRow
                key={t.id}
                t={t}
                categories={categories}
                onAction={setAction}
                onInvalidate={invalidate}
                reorder={reorderMode ? { canUp: i > 0, canDown: i < sorted.length - 1, up: () => move(i, -1), down: () => move(i, 1), busy: order.isPending } : undefined}
              />
            ))}
          </ul>
          {!reorderMode && <Pager meta={list.data?.meta} onPage={setPage} />}
        </>
      )}

      {action && confirmCopy && (
        <ConfirmDialog
          title={confirmCopy.title}
          description={confirmCopy.body}
          confirmLabel={confirmCopy.label}
          danger={confirmCopy.danger}
          busy={act.isPending}
          error={act.isError ? errorMessage(act.error) : null}
          onConfirm={() => act.mutate(action)}
          onCancel={() => {
            setAction(null)
            setReason('')
            act.reset()
          }}
        >
          {action.kind === 'reject' && (
            <div className="mt-4">
              <label htmlFor="reject-reason" className="field-label">
                Reason (private, optional)
              </label>
              <textarea id="reject-reason" className="input !min-h-24" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}
        </ConfirmDialog>
      )}
    </div>
  )
}
