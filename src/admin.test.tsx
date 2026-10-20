import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { AdminTribute } from './lib/api/schemas'
import { API, apiError, server } from './test/server'
import { renderApp } from './test/utils'

const admin = { id: 'a1', email: 'admin@family.test', role: 'admin', lastLoginAt: null, createdAt: '2026-01-01T00:00:00.000Z' }

const pending: AdminTribute = {
  id: 'p1',
  submissionId: 's1',
  fullName: 'Pat Pending',
  email: 'pat@private.test',
  relationshipCategory: 'friends',
  customRelationship: null,
  tributeText: 'A long lasting friendship that began over the garden fence.',
  contributorPhoto: null,
  grandmotherPhoto: null,
  photoDisplayPermission: false,
  status: 'pending',
  displayOrder: 0,
  isFeatured: false,
  moderationNotes: '',
  createdAt: '2026-02-01T10:00:00.000Z',
}

const adminConfig = {
  memorialTitle: 'House of Memories',
  grandmotherDisplayName: 'Eleanor',
  portraitMediaId: null,
  introductoryMessage: 'Hello',
  closingMessage: 'Goodbye',
  tributeSubmissionsOpen: true,
  relationshipCategories: [{ id: 'friends', name: 'Friends', order: 0, visible: true }],
  gallery: { enabled: true, itemsPerPage: 24, allowVideos: true, layout: 'grid' },
  featuredMemories: [],
  publicAcknowledgments: [],
  privateSettings: { notificationEmail: '', moderationGuidelines: '', internalNotes: '' },
}

function loggedIn() {
  server.use(
    http.get(`${API}/admin/auth/me`, () => HttpResponse.json({ data: { admin } })),
    http.get(`${API}/admin/config`, () => HttpResponse.json({ data: adminConfig })),
    http.get(`${API}/admin/tributes`, ({ request }) => {
      const status = new URL(request.url).searchParams.get('status')
      const data = status === 'pending' ? [pending] : []
      return HttpResponse.json({ data, meta: { page: 1, limit: 20, total: data.length, totalPages: 1 } })
    }),
    http.get(`${API}/admin/audit-events`, () => HttpResponse.json({ data: [], meta: { page: 1, limit: 6, total: 0, totalPages: 1 } })),
  )
}

describe('admin route protection', () => {
  it('redirects /admin to the login page when there is no session', async () => {
    const { router } = renderApp('/admin')
    expect(await screen.findByRole('heading', { name: /admin sign in/i })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/login')
  })

  it('redirects nested admin routes (e.g. /admin/pending) to login without fetching admin data', async () => {
    let fetchedTributes = false
    server.use(
      http.get(`${API}/admin/tributes`, () => {
        fetchedTributes = true
        return HttpResponse.json({ data: [] })
      }),
    )
    const { router } = renderApp('/admin/pending')
    await screen.findByRole('heading', { name: /admin sign in/i })
    expect(router.state.location.pathname).toBe('/admin/login')
    expect(fetchedTributes).toBe(false)
  })

  it('signs in: fetches a CSRF token, sends it with the login request, and lands on the dashboard', async () => {
    let session = false
    let csrfHeader: string | null = null
    server.use(
      http.get(`${API}/admin/auth/me`, () =>
        session ? HttpResponse.json({ data: { admin } }) : apiError(401, 'UNAUTHORIZED', 'Authentication required'),
      ),
      http.post(`${API}/admin/auth/login`, async ({ request }) => {
        csrfHeader = request.headers.get('x-csrf-token')
        expect(await request.json()).toEqual({ email: 'admin@family.test', password: 'hunter2hunter2' })
        session = true
        return HttpResponse.json({ data: { admin } })
      }),
      http.get(`${API}/admin/tributes`, () => HttpResponse.json({ data: [], meta: { page: 1, limit: 1, total: 0, totalPages: 1 } })),
      http.get(`${API}/admin/audit-events`, () => HttpResponse.json({ data: [], meta: { page: 1, limit: 6, total: 0, totalPages: 1 } })),
    )
    const { user, router } = renderApp('/admin/login')
    await user.type(await screen.findByLabelText('Email'), 'admin@family.test')
    await user.type(screen.getByLabelText('Password'), 'hunter2hunter2')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(await screen.findByRole('navigation', { name: 'Admin' })).toBeInTheDocument()
    expect(csrfHeader).toBe('csrf-test')
    expect(router.state.location.pathname).toBe('/admin')
  })

  it('shows a login error for bad credentials', async () => {
    server.use(http.post(`${API}/admin/auth/login`, () => apiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')))
    const { user } = renderApp('/admin/login')
    await user.type(await screen.findByLabelText('Email'), 'a@b.co')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })
})

describe('admin dashboard', () => {
  it('shows the admin shell and nav sections when authenticated', async () => {
    loggedIn()
    renderApp('/admin')
    const nav = await screen.findByRole('navigation', { name: 'Admin' })
    for (const name of ['Overview', 'Pending', 'Approved', 'Rejected', 'Gallery', 'Media upload', 'Categories', 'Settings', 'Audit log']) {
      expect(within(nav).getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it('shows contributor emails ONLY in admin, and confirms before approving (with CSRF header)', async () => {
    loggedIn()
    let approved = false
    let csrf: string | null = null
    server.use(
      http.post(`${API}/admin/tributes/p1/approve`, ({ request }) => {
        approved = true
        csrf = request.headers.get('x-csrf-token')
        return HttpResponse.json({ data: { ...pending, status: 'approved' } })
      }),
    )
    const { user } = renderApp('/admin/pending')
    expect(await screen.findByText('pat@private.test')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /approve & publish/i }))
    const dialog = await screen.findByRole('alertdialog')
    expect(approved).toBe(false) // nothing happens until confirmed
    await user.click(within(dialog).getByRole('button', { name: /approve & publish/i }))
    await waitFor(() => expect(approved).toBe(true))
    expect(csrf).toBe('csrf-test')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('lets the admin cancel a destructive removal', async () => {
    loggedIn()
    let removed = false
    server.use(
      http.post(`${API}/admin/tributes/p1/remove`, () => {
        removed = true
        return HttpResponse.json({ data: { ...pending, status: 'removed' } })
      }),
    )
    const { user } = renderApp('/admin/pending')
    await screen.findByText('Pat Pending')
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(removed).toBe(false)
  })

  it('re-fetches the CSRF token once when the server rejects it', async () => {
    loggedIn()
    let csrfFetches = 0
    let attempts = 0
    server.use(
      http.get(`${API}/csrf-token`, () => {
        csrfFetches++
        return HttpResponse.json({ data: { csrfToken: `csrf-${csrfFetches}`, headerName: 'x-csrf-token' } })
      }),
      http.post(`${API}/admin/tributes/p1/approve`, ({ request }) => {
        attempts++
        if (request.headers.get('x-csrf-token') === 'csrf-1') return apiError(403, 'CSRF_TOKEN_INVALID', 'Missing or invalid CSRF token')
        return HttpResponse.json({ data: { ...pending, status: 'approved' } })
      }),
    )
    const { user } = renderApp('/admin/pending')
    await screen.findByText('Pat Pending')
    await user.click(screen.getByRole('button', { name: /approve & publish/i }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /approve & publish/i }))
    await waitFor(() => expect(attempts).toBe(2))
    expect(csrfFetches).toBe(2)
  })
})
