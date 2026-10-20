import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { fixtures } from './test/fixtures'
import { API, apiError, server } from './test/server'
import { renderApp } from './test/utils'

describe('gallery', () => {
  it('renders items and opens/closes a lightbox with keyboard support', async () => {
    const { user } = renderApp('/gallery')
    const open = await screen.findByRole('button', { name: /open photo: eleanor in the garden/i })
    await user.click(open)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('img', { name: 'Eleanor in the garden' })).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(within(dialog).getByRole('img', { name: 'The family at Christmas' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(open).toHaveFocus())
  })

  it('shows a gentle empty state', async () => {
    server.use(
      http.get(`${API}/gallery`, () =>
        HttpResponse.json({ data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 1 } }),
      ),
    )
    renderApp('/gallery')
    expect(await screen.findByText(/gallery is still being gathered/i)).toBeInTheDocument()
  })

  it('shows an empty state when the gallery is disabled in config', async () => {
    server.use(
      http.get(`${API}/public/config`, () =>
        HttpResponse.json({ data: { ...fixtures.config, gallery: { ...fixtures.config.gallery, enabled: false } } }),
      ),
    )
    renderApp('/gallery')
    expect(await screen.findByText(/gallery is still being gathered/i)).toBeInTheDocument()
  })

  it('shows an error with retry when loading fails, then recovers', async () => {
    let fail = true
    server.use(
      http.get(`${API}/gallery`, () =>
        fail
          ? apiError(500, 'INTERNAL_ERROR', 'Storage down')
          : HttpResponse.json({ data: fixtures.gallery, meta: { page: 1, limit: 100, total: 2, totalPages: 1 } }),
      ),
    )
    const { user } = renderApp('/gallery')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Storage down')
    fail = false
    await user.click(within(alert).getByRole('button', { name: /try again/i }))
    expect(await screen.findByRole('button', { name: /open photo: eleanor/i })).toBeInTheDocument()
  })
})
