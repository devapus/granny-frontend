import { useState } from 'react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { RouterProvider, type DataRouter } from 'react-router'
import { MotionConfig } from 'motion/react'
import { createQueryClient } from './lib/queries'
import { createAppRouter } from './router'

export default function App({ router, client }: { router?: DataRouter; client?: QueryClient } = {}) {
  const [queryClient] = useState(() => client ?? createQueryClient())
  const [appRouter] = useState(() => router ?? createAppRouter())
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <RouterProvider router={appRouter} />
      </MotionConfig>
    </QueryClientProvider>
  )
}
