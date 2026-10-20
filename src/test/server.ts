import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { fixtures } from './fixtures'

export const API = 'http://localhost:4000/api/v1'

/** MSW is a test-only dependency; production code always uses real fetch against the real API. */
export const handlers = [
  http.get(`${API}/public/config`, () => HttpResponse.json({ data: fixtures.config })),
  http.get(`${API}/tributes`, () =>
    HttpResponse.json({
      data: fixtures.tributes,
      meta: { page: 1, limit: 50, total: fixtures.tributes.length, totalPages: 1 },
    }),
  ),
  http.get(`${API}/tributes/:id`, ({ params }) => {
    const t = fixtures.tributes.find((x) => x.id === params.id)
    return t
      ? HttpResponse.json({ data: t })
      : HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Tribute not found', correlationId: 'c1' } }, { status: 404 })
  }),
  http.get(`${API}/gallery`, () =>
    HttpResponse.json({ data: fixtures.gallery, meta: { page: 1, limit: 100, total: fixtures.gallery.length, totalPages: 1 } }),
  ),
  http.get(`${API}/csrf-token`, () => HttpResponse.json({ data: { csrfToken: 'csrf-test', headerName: 'x-csrf-token' } })),
  http.get(`${API}/admin/auth/me`, () =>
    HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required', correlationId: 'c2' } }, { status: 401 }),
  ),
]

export const server = setupServer(...handlers)

export function apiError(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message, correlationId: 'test-correlation' } }, { status })
}
