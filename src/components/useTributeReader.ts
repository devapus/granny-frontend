import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import type { PublicTribute } from '../lib/api/schemas'
import { useTribute } from '../lib/queries'
import type { OriginRect } from './TributeReader'

/**
 * Reading-window state backed by the URL (`?read=<id>`), so the browser Back button closes the
 * window and a shared link re-opens it. Opening pushes a history entry; closing pops it when we
 * created it, otherwise it replaces the URL. Page/scene state stays untouched, so the user returns
 * to exactly where they were (same scroll position, same camera waypoint).
 */
export function useTributeReader(known: PublicTribute[] | undefined) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [origin, setOrigin] = useState<OriginRect | null>(null)

  const readId = params.get('read')
  const fromList = readId ? known?.find((t) => t.id === readId) : undefined
  const fetched = useTribute(readId && !fromList ? readId : null)
  const tribute = fromList ?? fetched.data ?? null

  const open = (t: PublicTribute, from?: OriginRect | null) => {
    setOrigin(from ?? null)
    const next = new URLSearchParams(params)
    next.set('read', t.id)
    setParams(next, { state: { reader: true } })
  }

  const close = () => {
    if ((location.state as { reader?: boolean } | null)?.reader) {
      void navigate(-1)
      return
    }
    const next = new URLSearchParams(params)
    next.delete('read')
    setParams(next, { replace: true })
  }

  return { tribute, readId, open, close, origin, isLoading: Boolean(readId) && !tribute && fetched.isLoading }
}
