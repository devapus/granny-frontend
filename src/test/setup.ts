import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { resetCsrf } from '../lib/api/client'
import { server } from './server'

// Lazy routes are transformed on first use, which is slow on a cold cache.
configure({ asyncUtilTimeout: 15_000 })

// jsdom lacks these browser APIs.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
window.scrollTo = () => {}
if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = () => 'blob:test'
  window.URL.revokeObjectURL = () => {}
}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetCsrf()
  window.localStorage.clear()
})
afterAll(() => server.close())
