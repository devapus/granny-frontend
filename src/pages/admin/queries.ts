import { queryOptions } from '@tanstack/react-query'
import { getAdminConfig, getMe } from '../../lib/api/admin'

export const adminMeQuery = () =>
  queryOptions({
    queryKey: ['admin', 'me'],
    queryFn: ({ signal }) => getMe(signal),
    retry: false,
    staleTime: 5 * 60_000,
  })

export const adminConfigQuery = () =>
  queryOptions({
    queryKey: ['admin', 'config'],
    queryFn: ({ signal }) => getAdminConfig(signal),
  })
