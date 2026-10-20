import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { ErrorNotice, LoadingBlock } from '../../components/ui/States'
import { listAdminTributes, listAuditEvents } from '../../lib/api/admin'
import type { TributeStatus } from '../../lib/api/schemas'
import { formatDateTime } from '../../lib/format'
import { AdminHeading } from './shared'

const STATUSES: { status: TributeStatus; label: string; to: string }[] = [
  { status: 'pending', label: 'Awaiting review', to: '/admin/pending' },
  { status: 'approved', label: 'Published', to: '/admin/approved' },
  { status: 'rejected', label: 'Rejected', to: '/admin/rejected' },
]

export default function AdminOverview() {
  const counts = useQueries({
    queries: STATUSES.map((s) => ({
      queryKey: ['admin', 'tributes', 'count', s.status],
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        (await listAdminTributes({ status: s.status, limit: 1 }, signal)).meta?.total ?? 0,
    })),
  })
  const audit = useQuery({
    queryKey: ['admin', 'audit', 'recent'],
    queryFn: async () => (await listAuditEvents({ limit: 6 })).data,
  })

  return (
    <div>
      <AdminHeading title="Overview" />
      <ul className="grid gap-4 sm:grid-cols-3">
        {STATUSES.map((s, i) => {
          const q = counts[i]!
          return (
            <li key={s.status}>
              <Link to={s.to} className="card block p-5 no-underline hover:shadow-md">
                <p className="eyebrow">{s.label}</p>
                <p className="mt-2 font-serif text-5xl text-wood-900" aria-live="polite">
                  {q.isPending ? '…' : q.isError ? '—' : q.data}
                </p>
              </Link>
            </li>
          )
        })}
      </ul>
      {counts.some((c) => c.isError) && (
        <div className="mt-4">
          <ErrorNotice title="Some counts could not be loaded." error={counts.find((c) => c.isError)?.error} />
        </div>
      )}

      <section className="mt-10" aria-labelledby="recent-title">
        <h2 id="recent-title" className="text-2xl">
          Recent activity
        </h2>
        <div className="mt-4">
          {audit.isPending ? (
            <LoadingBlock lines={3} />
          ) : audit.isError ? (
            <ErrorNotice error={audit.error} onRetry={() => void audit.refetch()} />
          ) : audit.data.length === 0 ? (
            <p className="text-ink-soft">No activity yet.</p>
          ) : (
            <ul className="card divide-y divide-line">
              {audit.data.map((e) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                  <span>
                    <span className="font-semibold text-wood-700">{e.action}</span> — {e.summary}
                  </span>
                  <time className="text-ink-mute" dateTime={e.createdAt}>
                    {formatDateTime(e.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-3">
          <Link to="/admin/audit">View full audit log</Link>
        </p>
      </section>
    </div>
  )
}
