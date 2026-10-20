import { screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { fixtures } from './test/fixtures'
import { API, apiError, server } from './test/server'
import { renderApp } from './test/utils'

describe('tribute browsing (2D, no WebGL needed)', () => {
  it('groups tributes by the configured category order, not API order', async () => {
    renderApp('/tributes')
    await screen.findByText('Susan Whitfield')
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['Children', 'Grandchildren', 'Friends'])
    // Category nav only lists categories that have tributes.
    const nav = screen.getByRole('navigation', { name: /browse tributes by category/i })
    expect(within(nav).getAllByRole('button').map((b) => b.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'All',
      'Children (1)',
      'Grandchildren (1)',
      'Friends (1)',
    ])
  })

  it('filters to one category', async () => {
    const { user } = renderApp('/tributes')
    await screen.findByText('Susan Whitfield')
    await user.click(screen.getByRole('button', { name: /^Friends/ }))
    expect(screen.getByText('Margaret Ellis')).toBeInTheDocument()
    expect(screen.queryByText('Susan Whitfield')).not.toBeInTheDocument()
  })

  it('opens the reading window with the full tribute and closes it with the Close button', async () => {
    const { user, router } = renderApp('/tributes')
    await screen.findByText('Susan Whitfield')
    await user.click(screen.getByRole('button', { name: 'Read more: tribute from Susan Whitfield' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName('Susan Whitfield')
    expect(within(dialog).getByText(fixtures.tributes[2]!.tributeText)).toBeInTheDocument()
    expect(router.state.location.search).toBe('?read=t-child')

    await user.click(within(dialog).getByRole('button', { name: /close tribute/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(router.state.location.search).toBe('')
  })

  it('closes with Escape and returns focus to the Read more button', async () => {
    const { user } = renderApp('/tributes')
    await screen.findByText('Susan Whitfield')
    const opener = screen.getByRole('button', { name: 'Read more: tribute from Susan Whitfield' })
    await user.click(opener)
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(opener).toHaveFocus())
  })

  it('traps focus inside the dialog', async () => {
    const { user } = renderApp('/tributes')
    await screen.findByText('Susan Whitfield')
    await user.click(screen.getByRole('button', { name: 'Read more: tribute from Susan Whitfield' }))
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))
    for (let i = 0; i < 6; i++) {
      await user.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
  })

  it('closes the reading window with the browser Back button (history entry)', async () => {
    const { user, router } = renderApp('/tributes')
    await screen.findByText('Susan Whitfield')
    await user.click(screen.getByRole('button', { name: 'Read more: tribute from Margaret Ellis' }))
    await screen.findByRole('dialog')
    await router.navigate(-1)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(router.state.location.pathname).toBe('/tributes')
  })

  it('re-opens a tribute from a shared ?read= link', async () => {
    renderApp('/tributes?read=t-grand')
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Oliver Whitfield')
  })

  it('never renders email addresses on public pages', async () => {
    renderApp('/tributes')
    await screen.findByText('Susan Whitfield')
    expect(document.body.textContent).not.toMatch(/@/)
  })

  it('shows an empty state with a link to submit', async () => {
    server.use(
      http.get(`${API}/tributes`, () =>
        Response.json({ data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 1 } }),
      ),
    )
    renderApp('/tributes')
    expect(await screen.findByText('No tributes yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /be the first to leave a tribute/i })).toHaveAttribute('href', '/submit')
  })

  it('shows an error with retry when tributes fail to load', async () => {
    server.use(http.get(`${API}/tributes`, () => apiError(500, 'INTERNAL_ERROR', 'Database unavailable')))
    renderApp('/tributes')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Database unavailable')
    expect(within(alert).getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('renders a single tribute page and a not-found state', async () => {
    const first = renderApp('/tributes/t-child')
    expect(await screen.findByRole('heading', { name: 'Susan Whitfield' })).toBeInTheDocument()
    first.unmount()
    renderApp('/tributes/missing')
    expect(await screen.findByText(/couldn’t find that tribute/i)).toBeInTheDocument()
  })

  it('explains the redirect when WebGL was unavailable', async () => {
    const { router } = renderApp('/')
    await router.navigate('/tributes', { state: { webglUnavailable: true } })
    expect(await screen.findByText(/3D house isn’t available on this device/i)).toBeInTheDocument()
  })
})
