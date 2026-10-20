import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { LogOut } from 'lucide-react'
import { ErrorNotice } from '../../components/ui/States'
import { logout } from '../../lib/api/admin'
import { isApiError, resetCsrf } from '../../lib/api/client'
import { adminMeQuery } from './queries'

const nav = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/pending', label: 'Pending' },
  { to: '/admin/approved', label: 'Approved' },
  { to: '/admin/rejected', label: 'Rejected' },
  { to: '/admin/gallery', label: 'Gallery' },
  { to: '/admin/media', label: 'Media upload' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/config', label: 'Settings' },
  { to: '/admin/audit', label: 'Audit log' },
]

/** Route guard + shell for everything under /admin. Unauthenticated visitors go to /admin/login. */
export default function AdminLayout() {
  const me = useQuery(adminMeQuery())
  const location = useLocation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const signOut = useMutation({
    mutationFn: logout,
    onSettled: () => {
      resetCsrf()
      qc.removeQueries({ queryKey: ['admin'] })
      void navigate('/admin/login', { replace: true })
    },
  })

  if (me.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status">
        <p className="text-ink-soft">Checking your session…</p>
      </div>
    )
  }
  if (me.isError) {
    if (isApiError(me.error) && me.error.isUnauthorized) {
      return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    }
    return (
      <div className="mx-auto max-w-lg p-8">
        <ErrorNotice title="The admin area could not be reached." error={me.error} onRetry={() => void me.refetch()} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ivory-100 md:grid md:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-ivory-50 md:min-h-screen md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-3 p-4 md:block">
          <div>
            <p className="font-serif text-xl font-semibold text-wood-900">Memorial admin</p>
            <p className="field-hint truncate" title={me.data.admin.email}>
              {me.data.admin.email}
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm md:mt-3" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
            <LogOut size={14} aria-hidden="true" /> Sign out
          </button>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap no-underline ${isActive ? 'bg-ivory-200 text-wood-900' : 'text-ink-soft hover:bg-ivory-100'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
          <Link to="/" className="rounded-md px-3 py-2 text-sm whitespace-nowrap text-ink-mute md:mt-4">
            View public site ↗
          </Link>
        </nav>
      </aside>
      <main id="main" tabIndex={-1} className="min-w-0 p-4 outline-none sm:p-8">
        <Outlet />
      </main>
    </div>
  )
}
