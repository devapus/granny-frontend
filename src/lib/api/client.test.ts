import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { API, apiError, server } from '../../test/server'
import { ApiError, request } from './client'
import { listAllTributes } from './public'

describe('api client', () => {
  it('unwraps { data, meta } and validates with zod', async () => {
    server.use(http.get(`${API}/thing`, () => HttpResponse.json({ data: { n: 1 }, meta: { page: 1, limit: 10, total: 3, totalPages: 1 } })))
    const res = await request('/thing', { schema: z.object({ n: z.number() }) })
    expect(res.data).toEqual({ n: 1 })
    expect(res.meta?.total).toBe(3)
  })

  it('throws ApiError with code, message, details and correlationId for { error } responses', async () => {
    server.use(
      http.get(`${API}/bad`, () =>
        HttpResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Nope', details: [{ path: 'email', message: 'invalid' }], correlationId: 'abc' } },
          { status: 400 },
        ),
      ),
    )
    const err = await request('/bad', { schema: z.unknown() }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', message: 'Nope', correlationId: 'abc', details: [{ path: 'email', message: 'invalid' }] })
  })

  it('maps network failures to a recoverable NETWORK_ERROR', async () => {
    server.use(http.get(`${API}/down`, () => HttpResponse.error()))
    const err = (await request('/down', { schema: z.unknown() }).catch((e: unknown) => e)) as ApiError
    expect(err.isNetwork).toBe(true)
    expect(err.isRecoverable).toBe(true)
  })

  it('rejects payloads that do not match the schema as INVALID_RESPONSE', async () => {
    server.use(http.get(`${API}/odd`, () => HttpResponse.json({ data: { n: 'x' } })))
    const err = (await request('/odd', { schema: z.object({ n: z.number() }) }).catch((e: unknown) => e)) as ApiError
    expect(err.code).toBe('INVALID_RESPONSE')
  })

  it('only adds the CSRF header to admin mutations, never to GETs or public POSTs', async () => {
    const seen: Record<string, string | null> = {}
    server.use(
      http.get(`${API}/admin/x`, ({ request: r }) => {
        seen.adminGet = r.headers.get('x-csrf-token')
        return HttpResponse.json({ data: {} })
      }),
      http.post(`${API}/admin/x`, ({ request: r }) => {
        seen.adminPost = r.headers.get('x-csrf-token')
        return HttpResponse.json({ data: {} })
      }),
      http.post(`${API}/tributes`, ({ request: r }) => {
        seen.publicPost = r.headers.get('x-csrf-token')
        return HttpResponse.json({ data: {} })
      }),
    )
    await request('/admin/x', { schema: z.unknown() })
    await request('/admin/x', { method: 'POST', body: {}, schema: z.unknown() })
    await request('/tributes', { method: 'POST', body: {}, schema: z.unknown() })
    expect(seen).toEqual({ adminGet: null, adminPost: 'csrf-test', publicPost: null })
  })

  it('treats 503 STORAGE_NOT_CONFIGURED as storage-unavailable', async () => {
    server.use(http.post(`${API}/media/upload-url`, () => apiError(503, 'STORAGE_NOT_CONFIGURED', 'No R2')))
    const err = (await request('/media/upload-url', { method: 'POST', body: {}, schema: z.unknown() }).catch((e: unknown) => e)) as ApiError
    expect(err.isStorageUnavailable).toBe(true)
  })

  it('pages through all tributes', async () => {
    server.use(
      http.get(`${API}/tributes`, ({ request: r }) => {
        const page = Number(new URL(r.url).searchParams.get('page') ?? '1')
        const t = (id: string) => ({
          id,
          fullName: id,
          relationshipCategory: 'friends',
          relationshipLabel: 'Friends',
          tributeText: 'x'.repeat(30),
          isFeatured: false,
        })
        return HttpResponse.json({
          data: page === 1 ? [t('a'), t('b')] : [t('c')],
          meta: { page, limit: 2, total: 3, totalPages: 2 },
        })
      }),
    )
    const all = await listAllTributes()
    expect(all.map((t) => t.id)).toEqual(['a', 'b', 'c'])
  })
})
