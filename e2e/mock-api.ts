import type { Page, Route } from '@playwright/test'

/**
 * Network-level API stand-in for browser tests (test-only; the app itself never ships a fake API).
 * Matches the documented contract: `{ data, meta }` / `{ error }` envelopes.
 */

const categories = [
  { id: 'children', name: 'Children', order: 0 },
  { id: 'grandchildren', name: 'Grandchildren', order: 1 },
  { id: 'friends', name: 'Friends', order: 2 },
]

const text =
  'She always had the kettle on and a story ready. I will remember the sound of her laugh in the kitchen, and the way every visit ended with something wrapped in foil for the road.'

export const tributes = [
  { id: 't-friend', fullName: 'Margaret Ellis', cat: 'friends', label: 'Friends' },
  { id: 't-grand', fullName: 'Oliver Whitfield', cat: 'grandchildren', label: 'Grandchildren' },
  { id: 't-child', fullName: 'Susan Whitfield', cat: 'children', label: 'Children' },
].map((t) => ({
  id: t.id,
  fullName: t.fullName,
  relationshipCategory: t.cat,
  relationshipLabel: t.label,
  customRelationship: null,
  tributeText: text,
  contributorPhoto: null,
  grandmotherPhoto: null,
  isFeatured: false,
  publishedAt: '2026-01-10T10:00:00.000Z',
}))

const config = {
  memorialTitle: 'House of Memories',
  grandmotherDisplayName: 'Eleanor Whitfield',
  portrait: null,
  introductoryMessage: 'Step inside and discover the beautiful things my family and friends remember about me.',
  closingMessage: 'Thank you for taking the time to remember her with us.',
  tributeSubmissionsOpen: true,
  relationshipCategories: categories,
  gallery: { enabled: true, itemsPerPage: 24, allowVideos: true, layout: 'grid' },
  featuredMemories: [],
  acknowledgments: [],
  tributeLimits: { minLength: 20, maxLength: 5000 },
}

export interface MockApi {
  /** Bodies and headers of every POST /tributes the page made. */
  submissions: { headers: Record<string, string>; body: unknown }[]
}

export async function mockApi(page: Page): Promise<MockApi> {
  const state: MockApi = { submissions: [] }

  const reply = (route: Route, status: number, json: unknown) => {
    const origin = route.request().headers()['origin'] ?? '*'
    return route.fulfill({
      status,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': origin,
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      },
      body: JSON.stringify(json),
    })
  }

  await page.route('**/api/v1/**', async (route) => {
    const req = route.request()
    if (req.method() === 'OPTIONS') return reply(route, 204, {})
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, '')

    if (path === '/public/config') return reply(route, 200, { data: config })
    if (path === '/tributes' && req.method() === 'GET') {
      return reply(route, 200, {
        data: tributes,
        meta: { page: 1, limit: 50, total: tributes.length, totalPages: 1 },
      })
    }
    if (path === '/tributes' && req.method() === 'POST') {
      state.submissions.push({ headers: req.headers(), body: req.postDataJSON() })
      return reply(route, 201, { data: { id: 'new-1', status: 'pending' } })
    }
    if (path.startsWith('/tributes/')) {
      const found = tributes.find((t) => t.id === path.slice('/tributes/'.length))
      return found
        ? reply(route, 200, { data: found })
        : reply(route, 404, { error: { code: 'NOT_FOUND', message: 'Not found', correlationId: 'e2e' } })
    }
    if (path === '/gallery') {
      return reply(route, 200, { data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 0 } })
    }
    if (path === '/csrf-token') {
      return reply(route, 200, { data: { csrfToken: 'csrf-e2e', headerName: 'x-csrf-token' } })
    }
    // Everything else (admin) behaves as if nobody is signed in.
    return reply(route, 401, { error: { code: 'UNAUTHORIZED', message: 'Authentication required', correlationId: 'e2e' } })
  })

  return state
}
