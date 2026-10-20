import type { z } from 'zod'
import { API_BASE_URL } from '../env'
import { csrfSchema, pageMetaSchema, type PageMeta } from './schemas'

export interface ApiErrorDetail {
  path?: string
  message: string
}

/** Normalised error for every failed API call (HTTP error, network failure, or bad payload). */
export class ApiError extends Error {
  status: number
  code: string
  details?: ApiErrorDetail[]
  correlationId?: string

  constructor(
    status: number,
    code: string,
    message: string,
    options: { details?: ApiErrorDetail[]; correlationId?: string } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = options.details
    this.correlationId = options.correlationId
  }

  get isNetwork() {
    return this.code === 'NETWORK_ERROR'
  }
  get isUnauthorized() {
    return this.status === 401
  }
  get isStorageUnavailable() {
    return this.status === 503 && this.code === 'STORAGE_NOT_CONFIGURED'
  }
  /** Network failures, 5xx and rate limits can be retried without losing user input. */
  get isRecoverable() {
    return this.isNetwork || this.status >= 500 || this.status === 429
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

export interface RequestOptions<S extends z.ZodType> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  headers?: Record<string, string>
  schema: S
  signal?: AbortSignal
  /** Force CSRF header even for non-/admin routes. Admin routes always send it on mutations. */
  csrf?: boolean
}

export interface ApiResult<T> {
  data: T
  meta?: PageMeta
  status: number
  replayed: boolean
}

// ---------------------------------------------------------------- CSRF

interface CsrfState {
  token: string
  headerName: string
}
let csrfPromise: Promise<CsrfState> | null = null

/** Fetch (and cache) a CSRF token. The server also sets the `hom_csrf` cookie. */
export function getCsrf(force = false): Promise<CsrfState> {
  if (force) csrfPromise = null
  csrfPromise ??= (async () => {
    const res = await rawFetch('/csrf-token', { method: 'GET' })
    const json = await parseJson(res)
    if (!res.ok) throw toApiError(res, json)
    const parsed = csrfSchema.safeParse((json as { data?: unknown } | null)?.data)
    if (!parsed.success) throw new ApiError(res.status, 'INVALID_RESPONSE', 'Unexpected CSRF response')
    return { token: parsed.data.csrfToken, headerName: parsed.data.headerName }
  })().catch((e: unknown) => {
    csrfPromise = null
    throw e
  })
  return csrfPromise
}

export function resetCsrf() {
  csrfPromise = null
}

// ---------------------------------------------------------------- internals

function buildUrl(path: string, query?: RequestOptions<z.ZodType>['query']) {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue
    params.set(k, String(v))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

async function rawFetch(path: string, init: RequestInit & { query?: RequestOptions<z.ZodType>['query'] }) {
  const { query, ...rest } = init
  try {
    return await fetch(buildUrl(path, query), { credentials: 'include', ...rest })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError(0, 'NETWORK_ERROR', 'We could not reach the server. Please check your connection and try again.')
  }
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function toApiError(res: Response, json: unknown): ApiError {
  const err = (json as { error?: Record<string, unknown> } | null)?.error
  const correlationId =
    (typeof err?.correlationId === 'string' ? err.correlationId : undefined) ??
    res.headers.get('x-correlation-id') ??
    undefined
  if (err && typeof err.code === 'string') {
    return new ApiError(res.status, err.code, typeof err.message === 'string' ? err.message : 'Request failed', {
      details: Array.isArray(err.details) ? (err.details as ApiErrorDetail[]) : undefined,
      correlationId,
    })
  }
  return new ApiError(res.status, `HTTP_${res.status}`, res.statusText || 'Request failed', { correlationId })
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Typed request helper. Validates `{ data, meta? }` with Zod and throws `ApiError` on failure.
 * Admin mutations automatically attach the CSRF header (re-fetching the token once if rejected).
 */
export async function request<S extends z.ZodType>(
  path: string,
  options: RequestOptions<S>,
): Promise<ApiResult<z.infer<S>>> {
  const method = options.method ?? 'GET'
  const needsCsrf = MUTATING.has(method) && (options.csrf ?? path.startsWith('/admin'))

  const attempt = async (forceCsrf: boolean) => {
    const headers: Record<string, string> = { Accept: 'application/json', ...options.headers }
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'
    if (needsCsrf) {
      const csrf = await getCsrf(forceCsrf)
      headers[csrf.headerName] = csrf.token
    }
    const res = await rawFetch(path, {
      method,
      headers,
      query: options.query,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
    return { res, json: await parseJson(res) }
  }

  let { res, json } = await attempt(false)
  if (!res.ok && needsCsrf && res.status === 403 && toApiError(res, json).code.startsWith('CSRF_')) {
    ;({ res, json } = await attempt(true))
  }
  if (!res.ok) throw toApiError(res, json)

  const envelope = json as { data?: unknown; meta?: unknown } | null
  const parsed = options.schema.safeParse(envelope?.data)
  if (!parsed.success) {
    throw new ApiError(res.status, 'INVALID_RESPONSE', 'The server returned an unexpected response.', {
      details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    })
  }
  const meta = pageMetaSchema.safeParse(envelope?.meta)
  return {
    data: parsed.data as z.infer<S>,
    meta: meta.success ? meta.data : undefined,
    status: res.status,
    replayed: res.headers.get('idempotent-replay') === 'true',
  }
}

/** Convenience: return only `data`. */
export async function requestData<S extends z.ZodType>(path: string, options: RequestOptions<S>) {
  return (await request(path, options)).data
}
