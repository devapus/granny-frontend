import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { EmptyState, ErrorNotice, LoadingBlock } from '../../components/ui/States'
import { listAuditEvents } from '../../lib/api/admin'
import { formatDateTime } from '../../lib/format'
import { AdminHeading, Field, Pager } from './shared'

export default function AdminAudit() {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [applied, setApplied] = useState('')
  const list = useQuery({
    queryKey: ['admin', 'audit', page, applied],
    queryFn: () => listAuditEvents({ page, limit: 50, action: applied || undefined }),
  })

  return (
    <div>
      <AdminHeading title="Audit log" />
      <form
        className="mb-6 flex items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          setPage(1)
          setApplied(action.trim())
        }}
      >
        <Field label="Filter by action (e.g. tribute.approve)" htmlFor="audit-action">
          <input id="audit-action" className="input w-72" value={action} onChange={(e) => setAction(e.target.value)} />
        </Field>
        <button type="submit" className="btn btn-secondary">
          Filter
        </button>
      </form>
      {list.isPending ? (
        <LoadingBlock lines={5} />
      ) : list.isError ? (
        <ErrorNotice error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.data.length === 0 ? (
        <EmptyState title="No events" />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Administrator activity, newest first</caption>
              <thead className="border-b border-line bg-ivory-100 text-xs tracking-wide text-ink-mute uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">When</th>
                  <th scope="col" className="px-4 py-3">Action</th>
                  <th scope="col" className="px-4 py-3">Summary</th>
                  <th scope="col" className="px-4 py-3">Resource</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.data.data.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-mute">{formatDateTime(e.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-wood-700">{e.action}</td>
                    <td className="px-4 py-3">{e.summary}</td>
                    <td className="px-4 py-3 text-ink-mute">
                      {e.resourceType}
                      {e.resourceId ? ` · ${e.resourceId.slice(-6)}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager meta={list.data.meta} onPage={setPage} />
        </>
      )}
    </div>
  )
}
