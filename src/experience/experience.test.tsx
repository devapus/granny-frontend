import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '../test/utils'

describe('/experience without WebGL', () => {
  afterEach(() => vi.restoreAllMocks())

  it('falls back to the accessible tributes page with an explanation', async () => {
    // jsdom has no WebGL: a canvas can never produce a context.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const { router } = renderApp('/experience')
    expect(await screen.findByText(/3D house isn’t available on this device/i)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/tributes')
    // …and the tributes themselves are still readable.
    expect(await screen.findByText('Susan Whitfield')).toBeInTheDocument()
  })
})
