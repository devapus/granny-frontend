import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../router'

/** Render the real route table at `path`, with a fresh no-retry query client. */
export function renderApp(path = '/', { reduceMotion = true }: { reduceMotion?: boolean } = {}) {
  if (reduceMotion) window.localStorage.setItem('hom:reduce-motion', '1')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup({ applyAccept: false })
  const utils = render(
    <QueryClientProvider client={client}>
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
      </MotionConfig>
    </QueryClientProvider>,
  )
  return { ...utils, router, user, client }
}
