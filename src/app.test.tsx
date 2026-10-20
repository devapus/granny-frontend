import { screen, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { fixtures } from './test/fixtures'
import { API, apiError, server } from './test/server'
import { renderApp } from './test/utils'

describe('app init & config loading', () => {
  it('loads the memorial config and shows the title, intro message and the Enter the house CTA', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'House of Memories' })).toBeInTheDocument()
    expect(await screen.findByText(fixtures.config.introductoryMessage)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /enter the house/i })[0]).toHaveAttribute('href', '/experience')
    expect(screen.getByText(/in loving memory of Eleanor Whitfield/i)).toBeInTheDocument()
  })

  it('links to tributes, gallery and submit from the home page', async () => {
    renderApp('/')
    await screen.findByRole('heading', { level: 1 })
    const main = screen.getByRole('main')
    expect(within(main).getByRole('link', { name: /read the tributes/i })).toHaveAttribute('href', '/tributes')
    expect(within(main).getByRole('link', { name: /look through photographs/i })).toHaveAttribute('href', '/gallery')
    expect(within(main).getByRole('link', { name: /leave a tribute/i })).toHaveAttribute('href', '/submit')
  })

  it('never links to the admin login from the public pages', async () => {
    renderApp('/')
    await screen.findByRole('heading', { level: 1 })
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href') ?? '')
    expect(hrefs.some((h) => h.includes('admin'))).toBe(false)
  })

  it('shows a dignified Apus Industries Limited credit in the footer', async () => {
    renderApp('/')
    const footer = await screen.findByRole('contentinfo')
    expect(within(footer).getByText('Apus Industries Limited')).toBeInTheDocument()
  })

  it('surfaces a config failure with retry but keeps the Enter CTA available', async () => {
    server.use(http.get(`${API}/public/config`, () => apiError(500, 'INTERNAL_ERROR', 'Boom')))
    renderApp('/')
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be loaded/i)
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /enter the house/i }).length).toBeGreaterThan(0)
  })
})

describe('accessible navigation', () => {
  it('provides a skip link, labelled primary navigation and current-page state', async () => {
    renderApp('/gallery')
    expect(await screen.findByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main')
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(nav).getByRole('link', { name: 'Gallery' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Tributes' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it('renders a friendly 404 inside the layout', async () => {
    renderApp('/nope')
    expect(await screen.findByRole('heading', { name: /doesn’t exist/i })).toBeInTheDocument()
  })
})
