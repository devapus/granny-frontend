import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { login } from '../../lib/api/admin'
import { getCsrf } from '../../lib/api/client'
import { errorMessage } from '../../components/ui/States'
import { adminMeQuery } from './queries'

/** Not linked from the public site. Fetches a CSRF token, then logs in (cookie session). */
export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const me = useQuery(adminMeQuery())
  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  const signIn = useMutation({
    mutationFn: async () => {
      await getCsrf(true)
      return login(email.trim(), password)
    },
    onSuccess: (session) => {
      qc.setQueryData(['admin', 'me'], session)
      void navigate(from.startsWith('/admin') ? from : '/admin', { replace: true })
    },
  })

  if (me.isSuccess) return <Navigate to="/admin" replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory-100 p-4">
      <main id="main" className="w-full max-w-sm">
        <form
          className="card space-y-5 p-8"
          aria-labelledby="login-title"
          onSubmit={(e) => {
            e.preventDefault()
            if (!signIn.isPending) signIn.mutate()
          }}
        >
          <div>
            <h1 id="login-title" className="text-3xl">
              Admin sign in
            </h1>
            <p className="field-hint mt-1">For the family’s memorial administrators.</p>
          </div>
          <div>
            <label htmlFor="admin-email" className="field-label">
              Email
            </label>
            <input id="admin-email" type="email" autoComplete="username" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="admin-password" className="field-label">
              Password
            </label>
            <input id="admin-password" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {signIn.isError && (
            <p role="alert" className="notice notice-error">
              {errorMessage(signIn.error, 'Sign in failed.')}
            </p>
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={signIn.isPending}>
            {signIn.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </main>
    </div>
  )
}
