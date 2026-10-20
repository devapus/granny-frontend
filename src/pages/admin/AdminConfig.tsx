import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ErrorNotice, LoadingBlock, errorMessage } from '../../components/ui/States'
import { listAdminTributes, patchAdminConfig } from '../../lib/api/admin'
import type { AdminAcknowledgment, AdminConfig } from '../../lib/api/schemas'
import { adminConfigQuery } from './queries'
import { AdminHeading, Field } from './shared'

function Form({ initial }: { initial: AdminConfig }) {
  const qc = useQueryClient()
  const [v, setV] = useState(initial)
  const approved = useQuery({
    queryKey: ['admin', 'tributes', 'approved-for-featured'],
    queryFn: async () => (await listAdminTributes({ status: 'approved', limit: 100 })).data,
  })

  const save = useMutation({
    mutationFn: () =>
      patchAdminConfig({
        memorialTitle: v.memorialTitle,
        grandmotherDisplayName: v.grandmotherDisplayName,
        introductoryMessage: v.introductoryMessage,
        closingMessage: v.closingMessage,
        tributeSubmissionsOpen: v.tributeSubmissionsOpen,
        gallery: { ...v.gallery, layout: v.gallery.layout === 'masonry' ? 'masonry' : 'grid' },
        featuredMemories: v.featuredMemories,
        publicAcknowledgments: v.publicAcknowledgments,
        privateSettings: v.privateSettings,
      }),
    onSuccess: (next) => {
      setV(next)
      void qc.invalidateQueries({ queryKey: ['admin', 'config'] })
      void qc.invalidateQueries({ queryKey: ['public'] })
    },
  })

  const setAck = (id: string, patch: Partial<AdminAcknowledgment>) =>
    setV({ ...v, publicAcknowledgments: v.publicAcknowledgments.map((a) => (a.id === id ? { ...a, ...patch } : a)) })

  const toggleFeatured = (id: string, on: boolean) =>
    setV({ ...v, featuredMemories: on ? [...v.featuredMemories, id].slice(0, 12) : v.featuredMemories.filter((x) => x !== id) })

  return (
    <form
      className="max-w-3xl space-y-8"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <section className="card space-y-4 p-6" aria-labelledby="cfg-public">
        <h2 id="cfg-public" className="text-2xl">
          Memorial
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Memorial title" htmlFor="cfg-title">
            <input id="cfg-title" className="input" value={v.memorialTitle} onChange={(e) => setV({ ...v, memorialTitle: e.target.value })} required />
          </Field>
          <Field label="Name shown in the memorial" htmlFor="cfg-name">
            <input id="cfg-name" className="input" value={v.grandmotherDisplayName} onChange={(e) => setV({ ...v, grandmotherDisplayName: e.target.value })} required />
          </Field>
        </div>
        <Field label="Introductory message (shown in the memorial room)" htmlFor="cfg-intro">
          <textarea id="cfg-intro" className="input" value={v.introductoryMessage} onChange={(e) => setV({ ...v, introductoryMessage: e.target.value })} required />
        </Field>
        <Field label="Closing message (final room)" htmlFor="cfg-closing">
          <textarea id="cfg-closing" className="input" value={v.closingMessage} onChange={(e) => setV({ ...v, closingMessage: e.target.value })} required />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={v.tributeSubmissionsOpen} onChange={(e) => setV({ ...v, tributeSubmissionsOpen: e.target.checked })} />
          Accept new tribute submissions
        </label>
        <p className="field-hint">
          Portrait: {v.portraitMediaId ? 'set' : 'not set (placeholder art is shown)'} — change it from “Media upload”.
        </p>
      </section>

      <section className="card space-y-4 p-6" aria-labelledby="cfg-gallery">
        <h2 id="cfg-gallery" className="text-2xl">
          Gallery
        </h2>
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={v.gallery.enabled} onChange={(e) => setV({ ...v, gallery: { ...v.gallery, enabled: e.target.checked } })} /> Gallery enabled
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={v.gallery.allowVideos} onChange={(e) => setV({ ...v, gallery: { ...v.gallery, allowVideos: e.target.checked } })} /> Allow videos
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Items per page" htmlFor="cfg-ipp">
            <input id="cfg-ipp" type="number" min={1} max={100} className="input" value={v.gallery.itemsPerPage} onChange={(e) => setV({ ...v, gallery: { ...v.gallery, itemsPerPage: Number(e.target.value) || 24 } })} />
          </Field>
          <Field label="Layout" htmlFor="cfg-layout">
            <select id="cfg-layout" className="input" value={v.gallery.layout} onChange={(e) => setV({ ...v, gallery: { ...v.gallery, layout: e.target.value } })}>
              <option value="grid">Grid</option>
              <option value="masonry">Masonry</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="card space-y-3 p-6" aria-labelledby="cfg-featured">
        <h2 id="cfg-featured" className="text-2xl">
          Featured memories
        </h2>
        <p className="field-hint">Up to 12 approved tributes shown on the home page. Selected: {v.featuredMemories.length}</p>
        {approved.isPending ? (
          <LoadingBlock lines={2} />
        ) : approved.isError ? (
          <ErrorNotice error={approved.error} />
        ) : approved.data.length === 0 ? (
          <p className="text-ink-soft">No approved tributes yet.</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {approved.data.map((t) => (
              <li key={t.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={v.featuredMemories.includes(t.id)} onChange={(e) => toggleFeatured(t.id, e.target.checked)} />
                  {t.fullName}
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-4 p-6" aria-labelledby="cfg-ack">
        <h2 id="cfg-ack" className="text-2xl">
          Acknowledgments
        </h2>
        {v.publicAcknowledgments.length === 0 && <p className="text-ink-soft">None yet.</p>}
        <ul className="space-y-4">
          {v.publicAcknowledgments.map((a) => (
            <li key={a.id} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[1fr_2fr_auto]">
              <input className="input" aria-label="Acknowledgment name" value={a.name} onChange={(e) => setAck(a.id, { name: e.target.value })} />
              <input className="input" aria-label={`Message for ${a.name || 'acknowledgment'}`} value={a.message} onChange={(e) => setAck(a.id, { message: e.target.value })} />
              <div className="flex items-center gap-3 text-sm">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={a.visible} onChange={(e) => setAck(a.id, { visible: e.target.checked })} /> Visible
                </label>
                <button
                  type="button"
                  className="btn btn-quiet btn-sm text-danger"
                  onClick={() => setV({ ...v, publicAcknowledgments: v.publicAcknowledgments.filter((x) => x.id !== a.id) })}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() =>
            setV({
              ...v,
              publicAcknowledgments: [
                ...v.publicAcknowledgments,
                { id: `ack_${Date.now().toString(36)}`, name: '', message: '', order: v.publicAcknowledgments.length, visible: true },
              ],
            })
          }
        >
          Add acknowledgment
        </button>
      </section>

      <section className="card space-y-4 p-6" aria-labelledby="cfg-private">
        <h2 id="cfg-private" className="text-2xl">
          Private settings
        </h2>
        <p className="field-hint">Never shown publicly.</p>
        <Field label="Notification email" htmlFor="cfg-notify">
          <input id="cfg-notify" type="email" className="input" value={v.privateSettings.notificationEmail} onChange={(e) => setV({ ...v, privateSettings: { ...v.privateSettings, notificationEmail: e.target.value } })} />
        </Field>
        <Field label="Moderation guidelines" htmlFor="cfg-guidelines">
          <textarea id="cfg-guidelines" className="input !min-h-24" value={v.privateSettings.moderationGuidelines} onChange={(e) => setV({ ...v, privateSettings: { ...v.privateSettings, moderationGuidelines: e.target.value } })} />
        </Field>
        <Field label="Internal notes" htmlFor="cfg-notes">
          <textarea id="cfg-notes" className="input !min-h-24" value={v.privateSettings.internalNotes} onChange={(e) => setV({ ...v, privateSettings: { ...v.privateSettings, internalNotes: e.target.value } })} />
        </Field>
      </section>

      {save.isError && (
        <p role="alert" className="notice notice-error">
          {errorMessage(save.error)}
        </p>
      )}
      {save.isSuccess && (
        <p role="status" className="notice notice-success">
          Settings saved.
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={save.isPending}>
        {save.isPending ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  )
}

export default function AdminConfigPage() {
  const config = useQuery(adminConfigQuery())
  return (
    <div>
      <AdminHeading title="Settings" />
      {config.isPending ? (
        <LoadingBlock />
      ) : config.isError ? (
        <ErrorNotice error={config.error} onRetry={() => void config.refetch()} />
      ) : (
        <Form initial={config.data} />
      )}
    </div>
  )
}
