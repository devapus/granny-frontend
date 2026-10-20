import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { ErrorNotice, LoadingBlock, errorMessage } from '../../components/ui/States'
import { patchCategories } from '../../lib/api/admin'
import type { AdminCategory } from '../../lib/api/schemas'
import { adminConfigQuery } from './queries'
import { AdminHeading, Field } from './shared'

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)

function Editor({ initial }: { initial: AdminCategory[] }) {
  const qc = useQueryClient()
  const [rows, setRows] = useState(() => [...initial].sort((a, b) => a.order - b.order))
  const [newName, setNewName] = useState('')
  const save = useMutation({
    mutationFn: () => patchCategories(rows.map((r, i) => ({ id: r.id, name: r.name.trim(), order: i, visible: r.visible }))),
    onSuccess: (res) => {
      setRows([...res.relationshipCategories].sort((a, b) => a.order - b.order))
      void qc.invalidateQueries({ queryKey: ['admin', 'config'] })
      void qc.invalidateQueries({ queryKey: ['public'] })
    },
  })

  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= rows.length) return
    const next = [...rows]
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    setRows(next)
  }
  const newId = slug(newName)
  const canAdd = newId.length > 0 && !rows.some((r) => r.id === newId)

  return (
    <div className="max-w-2xl">
      <p className="mb-4 text-ink-soft">
        Rename, reorder or hide categories. The order here is the order of the walls in the 3D house. Categories can be hidden but not deleted, so existing tributes keep their place.
      </p>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.id} className="card flex flex-wrap items-center gap-3 p-3">
            <div className="flex gap-1">
              <button type="button" className="btn btn-secondary btn-sm" aria-label={`Move ${r.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp size={14} aria-hidden="true" />
              </button>
              <button type="button" className="btn btn-secondary btn-sm" aria-label={`Move ${r.name} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown size={14} aria-hidden="true" />
              </button>
            </div>
            <input
              className="input min-w-0 flex-1"
              aria-label={`Name for category ${r.id}`}
              value={r.name}
              onChange={(e) => setRows(rows.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={r.visible} onChange={(e) => setRows(rows.map((x) => (x.id === r.id ? { ...x, visible: e.target.checked } : x)))} /> Visible
            </label>
          </li>
        ))}
      </ul>
      <form
        className="mt-5 flex items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!canAdd) return
          setRows([...rows, { id: newId, name: newName.trim(), order: rows.length, visible: true }])
          setNewName('')
        }}
      >
        <Field label="Add a category" htmlFor="new-category">
          <input id="new-category" className="input" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </Field>
        <button type="submit" className="btn btn-secondary" disabled={!canAdd}>
          Add
        </button>
      </form>
      {save.isError && (
        <p role="alert" className="notice notice-error mt-4">
          {errorMessage(save.error)}
        </p>
      )}
      {save.isSuccess && (
        <p role="status" className="notice notice-success mt-4">
          Categories saved.
        </p>
      )}
      <button type="button" className="btn btn-primary mt-5" disabled={save.isPending || rows.some((r) => !r.name.trim())} onClick={() => save.mutate()}>
        {save.isPending ? 'Saving…' : 'Save categories'}
      </button>
    </div>
  )
}

export default function AdminCategories() {
  const config = useQuery(adminConfigQuery())
  return (
    <div>
      <AdminHeading title="Categories" />
      {config.isPending ? (
        <LoadingBlock />
      ) : config.isError ? (
        <ErrorNotice error={config.error} onRetry={() => void config.refetch()} />
      ) : (
        <Editor initial={config.data.relationshipCategories} />
      )}
    </div>
  )
}
